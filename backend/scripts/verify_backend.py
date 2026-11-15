"""Fresh-database core acceptance. Default: real Uvicorn HTTP; --transport asgi is local-only."""
import argparse
from contextlib import contextmanager
import csv
from decimal import Decimal, ROUND_HALF_UP
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
from uuid import uuid4

from verify_auth import ROOT, running_server, check


@contextmanager
def transport_client(env, transport):
    if transport == 'http':
        with running_server(env) as client:
            yield client
    else:
        sys.path.insert(0, str(ROOT))
        from fastapi.testclient import TestClient
        from app.config import Settings
        from app.main import create_app
        with TestClient(create_app(Settings(database_url=env['DATABASE_URL'], login_max_attempts=100)),
                        raise_server_exceptions=False) as client:
            yield client


def dollars(value):
    return f'{value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP):.2f}'


def verify(csv_path, manifest_path, transport='http', fixture_output=None, symbol=None):
    manifest = json.loads(manifest_path.read_text())
    dates = [s['session_date'] for s in manifest['sessions']]
    check(len(dates) >= 3, 'Core acceptance needs at least three sessions for buy and sell fills.')
    symbols = [item['symbol'] for item in manifest['instruments']]
    symbol = symbol or symbols[0]
    check(symbol in symbols, 'Requested symbol is absent from the dataset.')
    with csv_path.open(newline='') as file:
        prices = {r['session_date']: r for r in csv.DictReader(file) if r['symbol'] == symbol}
    synthetic = manifest['id'] == 'synthetic-accounting-v1'
    initial = Decimal('1000.00' if synthetic else '1000000000.00')
    with tempfile.TemporaryDirectory(prefix='ai4good-core-') as folder:
        env = dict(os.environ, DATABASE_URL=f'sqlite:///{folder}/core.db', LOGIN_MAX_ATTEMPTS='100',
                   LOGIN_WINDOW_SECONDS='60', AUTH_TOKEN_TTL_SECONDS='3600', ALLOWED_ORIGINS='')
        def run(*command):
            return subprocess.run([sys.executable, '-m', *command], cwd=ROOT, env=env,
                check=True, text=True, capture_output=True).stdout.strip()
        run('alembic', 'upgrade', 'head')
        run('alembic', 'upgrade', 'head')
        check('0005_learning' in run('alembic', 'current'), 'Wrong migration head.')
        check('No new upgrade operations' in run('alembic', 'check'), 'Schema drift.')
        run('app.datasets', '--csv', str(csv_path), '--manifest', str(manifest_path))
        # Explicit opt-in reference-data seeding; no real users/reset or fixed passwords.
        check('unchanged' in run('app.datasets', '--csv', str(csv_path), '--manifest', str(manifest_path)), 'Seed is not repeatable.')
        password = secrets.token_urlsafe(24)
        with transport_client(env, transport) as client:
            headers = []
            for email in ['acceptance-first@example.com', 'acceptance-second@example.com']:
                credentials = {'email': email, 'password': password}
                check(client.post('/api/v1/auth/register', json=credentials).status_code == 201, 'Registration failed.')
                login = client.post('/api/v1/auth/login', json=credentials)
                check(login.status_code == 200, 'Login failed.')
                headers.append({'Authorization': 'Bearer '+login.json()['access_token']})
            first, second = headers
            lessons = client.get('/api/v1/lessons', headers=first).json()['items']
            check(len(lessons) == 5, 'Actual curriculum missing.')
            lesson = client.get('/api/v1/lessons/cd-basics', headers=first).json()
            quiz = client.get('/api/v1/quizzes/'+lesson['quiz_id'], headers=first).json()
            check(set(quiz) == {'id','version','lesson_id','questions'}, 'Private quiz data leaked.')
            curriculum = json.loads((ROOT/'data/curriculum/kiran-v1.json').read_text())
            quiz_body = {'quiz_version':quiz['version'], 'answers':[
                {'question_id':q['id'], 'option_id':curriculum['scoring'][quiz['id']]['answerKey'][q['id']]}
                for q in quiz['questions']]}
            quiz_key = str(uuid4())
            quiz_path = '/api/v1/quizzes/'+quiz['id']+'/attempts'
            attempt = client.post(quiz_path,json=quiz_body,headers={**first,'Idempotency-Key':quiz_key})
            check(attempt.status_code == 200 and attempt.json()['passed'], 'Server scoring failed.')
            check(client.post(quiz_path,json=quiz_body,headers={**first,'Idempotency-Key':quiz_key}).content == attempt.content, 'Attempt retry mismatch.')
            saved_progress = client.get('/api/v1/progress',headers=first).json()
            check(next(p for p in saved_progress['items'] if p['lesson_id']=='cd-basics')['attempt_count']==1, 'Attempt duplicated.')
            check(all(p['attempt_count']==0 for p in client.get('/api/v1/progress',headers=second).json()['items']), 'Foreign progress leak.')
            create = {'dataset_id':manifest['id'],'start_session':dates[0],'end_session':dates[-1],'initial_cash':dollars(initial)}
            created = client.post('/api/v1/simulations',json=create,headers={**first,'Idempotency-Key':str(uuid4())})
            check(created.status_code == 201, 'Create simulation failed.')
            sim = created.json()
            path = '/api/v1/simulations/'+sim['id']
            market = path+'/market-data/'+symbol
            for route in ['', '/orders', '/transactions', '/portfolio', '/performance', '/market-data/'+symbol]:
                check(client.get(path+route,headers=second).status_code==404, 'Foreign resource access.')
            check(client.get(market,params={'to':dates[1]},headers=first).status_code==422, 'Future data accepted.')
            bad = {'symbol':symbol,'side':'sell','quantity':1,'expected_version':sim['version']}
            check(client.post(path+'/orders',json=bad,headers={**first,'Idempotency-Key':str(uuid4())}).status_code==422,'Oversell accepted.')
            cash, qty, basis, realized = initial, 0, Decimal('0.00'), Decimal('0.00')
            expected_curve = [{'session_date':dates[0],'total_equity':dollars(initial)}]
            order_replay = None
            for index, day in enumerate(dates[1:],1):
                trade = ('buy',2) if index==1 else ('sell',1) if index in (2,3) else None
                if trade:
                    side, quantity = trade
                    order_body = {'symbol':symbol,'side':side,'quantity':quantity,'expected_version':sim['version']}
                    order_key = str(uuid4())
                    submitted = client.post(path+'/orders',json=order_body,headers={**first,'Idempotency-Key':order_key})
                    check(submitted.status_code==201, 'Submit order failed.')
                    pending = submitted.json()['order']
                    check(pending['status']=='pending' and pending['execution_price'] is None and pending['executed_at'] is None,'Premature fill disclosed.')
                    if index==1: order_replay=(order_key,order_body,submitted.content)
                    check(client.post(path+'/orders',json=order_body,headers={**first,'Idempotency-Key':order_key}).content==submitted.content,'Order replay failed.')
                    sim = submitted.json()['simulation']
                advance_body, advance_key = {'expected_version':sim['version']}, str(uuid4())
                advanced = client.post(path+'/advance',json=advance_body,headers={**first,'Idempotency-Key':advance_key})
                check(advanced.status_code==200, 'Advance failed.')
                check(client.post(path+'/advance',json=advance_body,headers={**first,'Idempotency-Key':advance_key}).content==advanced.content,'Advance replay failed.')
                sim = advanced.json()['simulation']
                if trade:
                    fill = advanced.json()['order_results'][0]
                    check(fill['status']=='filled','Unexpected fill rejection.')
                    price = Decimal(prices[day]['open'])
                    check(Decimal(fill['execution_price'])==price,'Fill price differs from raw next open.')
                    check(fill['executed_at']==manifest['sessions'][index]['open_at'],'Incorrect simulated execution timestamp.')
                    gross = price*quantity
                    if side=='buy': cash-=gross; qty+=quantity; basis+=gross
                    else:
                        allocated = basis if quantity==qty else (basis*quantity/qty).quantize(Decimal('.01'),rounding=ROUND_HALF_UP)
                        cash+=gross; qty-=quantity; basis-=allocated; realized+=gross-allocated
                value = Decimal(prices[day]['close'])*qty
                expected_curve.append({'session_date':day,'total_equity':dollars(cash+value)})
                portfolio = client.get(path+'/portfolio',headers=first).json()
                check(portfolio['cash']==dollars(cash) and portfolio['total_equity']==dollars(cash+value),'Cash/equity reconciliation failed.')
                check(portfolio['realized_pnl']==dollars(realized) and portfolio['unrealized_pnl']==dollars(value-basis),'P&L reconciliation failed.')
                perf = client.get(path+'/performance',headers=first).json()
                check(perf['equity_curve']==expected_curve,'Equity curve mismatch/future leak.')
                check(perf['total_return_pct']==dollars((cash+value-initial)*100/initial),'Return mismatch.')
                bars = client.get(market,headers=first).json()['items']
                check(len(bars)==index+1 and all(b['available_at']<=sim['current_time'] for b in bars),'Future market data leak.')
            check(sim['status']=='completed','Simulation did not complete.')
            if synthetic: check(portfolio['total_equity']=='1015.00' and portfolio['realized_pnl']=='15.00','Reference outcome differs.')
            check(client.post(path+'/advance',json={'expected_version':sim['version']},headers={**first,'Idempotency-Key':str(uuid4())}).status_code==409,'End advance accepted.')
            saved_orders = client.get(path+'/orders',headers=first).json()
            saved_transactions = client.get(path+'/transactions',headers=first).json()
            check(all(o['status']!='pending' for o in saved_orders['items']),'Pending order remains on completion.')
            check(len(saved_transactions['items'])==min(3,len(dates)-1),'Duplicate/missing fills.')
            if fixture_output:
                fixture_output.mkdir(parents=True,exist_ok=True)
                for name,body in [('orders',saved_orders),('transactions',saved_transactions),('portfolio',portfolio),('performance',perf),('lessons',{'items':lessons}),('lesson',lesson),('quiz',quiz),('quiz-attempt',attempt.json()),('progress',saved_progress)]:
                    (fixture_output/(name+'.json')).write_text(json.dumps(body,indent=2)+'\n')
        # A fresh app/process against the same temporary database, using persisted tokens.
        with transport_client(env,transport) as client:
            for suffix, expected in [('',sim),('/portfolio',portfolio),('/performance',perf),('/orders',saved_orders),('/transactions',saved_transactions)]:
                check(client.get(path+suffix,headers=first).json()==expected,'Restart resource persistence failed.')
            check(client.get('/api/v1/progress',headers=first).json()==saved_progress,'Restart progress persistence failed.')
            key,body,encoded = order_replay
            check(client.post(path+'/orders',json=body,headers={**first,'Idempotency-Key':key}).content==encoded,'Restart order receipt lost.')
            check(client.post(quiz_path,json=quiz_body,headers={**first,'Idempotency-Key':quiz_key}).content==attempt.content,'Restart attempt receipt lost.')
            check(client.post('/api/v1/auth/logout',headers=first).status_code==204,'Logout failed.')
        with transport_client(env,transport) as client:
            check(client.get(path+'/portfolio',headers=first).status_code==401,'Logout not persisted.')
            check(client.get('/api/v1/auth/me',headers=second).status_code==200,'Other user session affected.')
    label = 'real Uvicorn HTTP' if transport=='http' else 'in-process ASGI (not socket HTTP)'
    print(f'PASS: {label}; fresh migrations/import, actual curriculum/scoring/progress, buy/sell, P&L, ownership/no-future data, receipts and restart persistence.')
    print('Dataset: synthetic accounting reference.' if manifest['synthetic'] else 'Dataset: local historical input; source manifest usage restrictions still apply.')
    print(f'Traded symbol: {symbol}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--csv',type=Path,default=ROOT/'data/fixtures/accounting.csv')
    parser.add_argument('--manifest',type=Path,default=ROOT/'data/fixtures/accounting.manifest.json')
    parser.add_argument('--transport',choices=['http','asgi'],default='http')
    parser.add_argument('--write-fixtures',type=Path,help='Explicitly export synthetic response examples to this directory.')
    parser.add_argument('--all-symbols', action='store_true', help='Repeat the full isolated acceptance flow for each dataset symbol.')
    args=parser.parse_args()
    if args.write_fixtures and not json.loads(args.manifest.read_text())['synthetic']:
        parser.error('Only synthetic response examples may be exported.')
    try:
        symbols = [item['symbol'] for item in json.loads(args.manifest.read_text())['instruments']] if args.all_symbols else [None]
        for symbol in symbols:
            verify(args.csv.resolve(),args.manifest.resolve(),args.transport,args.write_fixtures, symbol)
    except PermissionError as exc:
        if args.transport != 'http':
            raise
        print(f'BLOCKED: socket HTTP acceptance requires localhost permission ({exc}).', file=sys.stderr)
        print('Run this command in a normal terminal; --transport asgi provides separate local-only acceptance.', file=sys.stderr)
        raise SystemExit(2) from None


if __name__=='__main__':
    main()

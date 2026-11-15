"""HTTP trading acceptance: accounting, retries, concurrency, and rollback."""
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from sqlalchemy import event, select

from app.models import Order, Position, Transaction
from test_simulations import rig, state


def order(rig, sim, side='buy', quantity=2, key=None, headers=None, **changes):
    return rig.client.post(f'/api/v1/simulations/{sim["id"]}/orders',
        json={"symbol": "TEST", "side": side, "quantity": quantity, "expected_version": sim['version'], **changes},
        headers={**(rig.first if headers is None else headers), 'Idempotency-Key': key or str(uuid4())})


def get(rig, sim, path, headers=None):
    return rig.client.get(f'/api/v1/simulations/{sim["id"]}/{path}', headers=rig.first if headers is None else headers)


def test_buy_sell_liquidation_and_receipts(rig):
    sim = rig.create().json()
    submitted = order(rig, sim, key='buy')
    assert submitted.status_code == 201, submitted.text
    pending = submitted.json()['order']
    assert pending['status'] == 'pending' and pending['execution_price'] is None and pending['executed_at'] is None
    assert get(rig, sim, 'transactions').json() == {'items': []}
    assert order(rig, sim, key='buy').content == submitted.content
    assert order(rig, sim, key='buy', quantity=3).status_code == 409
    sim = submitted.json()['simulation']
    assert order(rig, sim).json()['error']['code'] == 'pending_order_exists'
    advanced = rig.advance(sim['id'], sim['version'], 'fill-buy')
    assert advanced.status_code == 200, advanced.text
    assert advanced.json()['order_results'][0]['execution_price'] == '100.000000'
    assert advanced.json()['order_results'][0]['executed_at'] == '2026-01-06T14:30:00Z'
    sim = advanced.json()['simulation']
    stored, snapshots = state(rig, sim['id'])
    assert stored.cash_cents == 80000 and snapshots[-1].total_equity_cents == 102000
    assert order(rig, sim, side='sell', quantity=3).status_code == 422
    for price, cash, equity in [('120.000000', 92000, 101000), ('95.000000', 101500, 101500)]:
        accepted = order(rig, sim, side='sell', quantity=1).json()
        sim = accepted['simulation']
        result = rig.advance(sim['id'], sim['version'])
        assert result.status_code == 200, result.text
        assert result.json()['order_results'][0]['execution_price'] == price
        sim = result.json()['simulation']
        stored, snapshots = state(rig, sim['id'])
        assert stored.cash_cents == cash and snapshots[-1].total_equity_cents == equity
    assert sim['status'] == 'completed'
    assert order(rig, sim).status_code == 409
    assert order(rig, {**sim, 'version': 1}, key='buy').content == submitted.content
    assert rig.advance(sim['id'], 2, 'fill-buy').content == advanced.content
    assert len(get(rig, sim, 'orders').json()['items']) == 3
    assert [t['gross_amount'] for t in get(rig, sim, 'transactions').json()['items']] == ['200.00', '120.00', '95.00']
    with rig.app.state.sessions() as session:
        position = session.get(Position, (sim['id'], 'TEST'))
        assert position.quantity == position.cost_basis_cents == 0
        assert sum(t.gross_cents-t.allocated_cost_cents for t in session.scalars(select(Transaction).where(Transaction.side=='sell'))) == 1500


def test_gap_rejection_keeps_holdings_and_cash(rig):
    sim = rig.create(start_session='2026-01-06', initial_cash='110.00').json()
    accepted = order(rig, sim, quantity=1)
    assert accepted.status_code == 201
    sim = accepted.json()['simulation']
    advanced = rig.advance(sim['id'], sim['version'])
    assert advanced.status_code == 200, advanced.text
    rejected = advanced.json()['order_results'][0]
    assert rejected['status'] == 'rejected' and rejected['rejection_code'] == 'insufficient_cash'
    assert rejected['execution_price'] is None and rejected['executed_at'] is None
    assert state(rig, sim['id'])[0].cash_cents == 11000
    assert get(rig, sim, 'transactions').json() == {'items': []}


@pytest.mark.parametrize('changes', [dict(quantity=0),dict(quantity=-1),dict(quantity=True),dict(quantity=1.5),dict(quantity=1000001),dict(side='short'),dict(symbol='MISSING'),dict(extra=True),dict(expected_version=0)])
def test_invalid_order(rig, changes):
    sim = rig.create().json()
    assert order(rig, sim, **changes).status_code == 422
    assert state(rig, sim['id'])[0].version == 1


def test_ownership_all_new_routes_and_unauthenticated(rig):
    sim = rig.create().json()
    for headers, code in [(rig.second,404), ({},401)]:
        assert order(rig, sim, headers=headers).status_code == code
        for path in ['orders','transactions']:
            assert get(rig,sim,path,headers).status_code == code


def test_competing_orders_and_duplicate_retry(rig):
    sim = rig.create().json()
    with ThreadPoolExecutor(2) as pool:
        results = list(pool.map(lambda _: order(rig,sim,key='same'), range(2)))
    assert [r.status_code for r in results] == [201,201]
    assert results[0].content == results[1].content
    sim = rig.advance(sim['id'],2).json()['simulation']
    with ThreadPoolExecutor(2) as pool:
        results = list(pool.map(lambda _: order(rig,sim), range(2)))
    assert sorted(r.status_code for r in results) == [201,409]


def test_fill_and_order_rollback_on_receipt_failure(rig):
    sim = rig.create().json()
    engine = rig.app.state.engine
    def fail_receipt(conn,cursor,statement,params,context,many):
        if statement.startswith('INSERT INTO idempotency_receipts'):
            raise RuntimeError('injected receipt failure')
    event.listen(engine,'before_cursor_execute', fail_receipt)
    try:
        assert order(rig,sim,key='retry').status_code == 500
    finally:
        event.remove(engine,'before_cursor_execute',fail_receipt)
    assert get(rig,sim,'orders').json() == {'items': []}
    assert state(rig,sim['id'])[0].version == 1
    sim = order(rig,sim,key='retry').json()['simulation']
    event.listen(engine,'before_cursor_execute',fail_receipt)
    try:
        assert rig.advance(sim['id'],sim['version'],'retry-fill').status_code == 500
    finally:
        event.remove(engine,'before_cursor_execute',fail_receipt)
    stored,snapshots = state(rig,sim['id'])
    assert stored.version == 2 and stored.cash_cents == 100000 and len(snapshots)==1
    assert get(rig,sim,'orders').json()['items'][0]['status']=='pending'
    assert get(rig,sim,'transactions').json()=={'items':[]}
    assert rig.advance(sim['id'],sim['version'],'retry-fill').status_code==200

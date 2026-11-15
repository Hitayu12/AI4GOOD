"""Independent portfolio reference values and weighted-average residual checks."""
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.models import Position, Transaction
from app.simulations import round_cents
from test_simulations import rig
from test_trading import get, order


def test_reference_portfolio_and_performance(rig):
    sim=rig.create().json()
    expected=[('buy',2,'800.00','0.00','20.00','1020.00','2.00'),
              ('sell',1,'920.00','20.00','-10.00','1010.00','1.00'),
              ('sell',1,'1015.00','15.00','0.00','1015.00','1.50')]
    for count,(side,qty,cash,realized,unrealized,equity,percent) in enumerate(expected,2):
        sim=order(rig,sim,side=side,quantity=qty).json()['simulation']
        # Pending order has no portfolio impact.
        before=get(rig,sim,'portfolio').json()
        sim=rig.advance(sim['id'],sim['version']).json()['simulation']
        p=get(rig,sim,'portfolio')
        assert p.status_code==200,p.text
        p=p.json()
        assert (p['cash'],p['realized_pnl'],p['unrealized_pnl'],p['total_equity'])==(cash,realized,unrealized,equity)
        perf=get(rig,sim,'performance').json()
        assert perf['total_return_pct']==percent
        assert len(perf['equity_curve'])==count
        assert perf['equity_curve'][-1]['total_equity']==equity
        assert all(x['session_date']<=sim['current_session'] for x in perf['equity_curve'])
    assert p['positions']==[]


def test_no_trade_and_ownership(rig):
    sim=rig.create().json()
    for path in ['portfolio','performance']:
        assert get(rig,sim,path,rig.second).status_code==404
        assert get(rig,sim,path,{}).status_code==401
        assert get(rig,sim,path).headers['cache-control']=='no-store'
    for _ in range(3):
        assert get(rig,sim,'performance').json()['total_return_pct']=='0.00'
        assert get(rig,sim,'portfolio').json()['total_equity']=='1000.00'
        sim=rig.advance(sim['id'],sim['version']).json()['simulation']


def test_multiple_lots_weighted_average_and_residual(rig):
    # Simulate an already held pooled lot whose 1-cent basis cannot split evenly.
    # Actual HTTP fills must allocate 1 cent on first sale, 1 on the second,
    # and the final remaining 0 cents on liquidation: no basis is lost/created.
    sim=rig.create().json()
    with rig.app.state.sessions() as session:
        session.add(Position(simulation_id=sim['id'],symbol='TEST',quantity=3,cost_basis_cents=2))
        session.commit()
    expected_basis=[1,0,0]
    for remaining in expected_basis:
        sim=order(rig,sim,side='sell',quantity=1).json()['simulation']
        sim=rig.advance(sim['id'],sim['version']).json()['simulation']
        with rig.app.state.sessions() as session:
            assert session.get(Position,(sim['id'],'TEST')).cost_basis_cents==remaining
    with rig.app.state.sessions() as session:
        assert sum(t.allocated_cost_cents for t in session.scalars(select(Transaction)))==2
    assert get(rig,sim,'portfolio').json()['realized_pnl']=='314.98'


def test_weighted_average_multiple_buys(rig):
    sim=rig.create().json()
    for quantity in [2,1]:
        sim=order(rig,sim,quantity=quantity).json()['simulation']
        sim=rig.advance(sim['id'],sim['version']).json()['simulation']
    p=get(rig,sim,'portfolio').json()
    assert p['positions'][0]['quantity']==3
    assert p['positions'][0]['cost_basis']=='320.00'
    sim=order(rig,sim,side='sell',quantity=1).json()['simulation']
    sim=rig.advance(sim['id'],sim['version']).json()['simulation']
    p=get(rig,sim,'portfolio').json()
    assert p['positions'][0]['cost_basis']=='213.33'
    assert p['realized_pnl']=='-11.67'
    assert p['unrealized_pnl']=='-23.33'
    assert p['total_equity']=='965.00'
    assert get(rig,sim,'performance').json()['total_return_pct']=='-3.50'


@pytest.mark.parametrize('value,expected',[('0.5',1),('1.5',2),('-0.5',-1),('-1.5',-2)])
def test_round_half_up(value,expected):
    assert round_cents(Decimal(value))==expected

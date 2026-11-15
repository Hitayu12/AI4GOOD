"""Offline provider-boundary tests; invented quotes are test fixtures only."""
from copy import deepcopy
from pathlib import Path
import sys

import pytest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from download_yfinance import SYMBOLS, build_artifacts, cent_price, whole_volume, write_artifacts
from app.datasets import ImportFailure, validate_files


@pytest.fixture
def source():
    sessions=[{'session_date':f'2025-01-{day}', 'open_at':f'2025-01-{day}T14:30:00Z',
               'close_at':f'2025-01-{day}T21:00:00Z'} for day in range(13,17)]
    histories={symbol:{s['session_date']:{'Open':'100.0','High':'101.0','Low':'99.0','Close':'100.0',
        'Volume':'1000.0','Dividends':'0.0','Stock Splits':'0.0','Capital Gains':'0.0'} for s in sessions} for symbol in SYMBOLS}
    return histories,sessions


def artifacts(source):
    return build_artifacts(*source,'2026-11-14',{'yfinance':'test-only'})


def test_five_symbol_grid_and_exact_import(tmp_path,source):
    data,manifest,evidence=artifacts(source)
    destination=tmp_path/'snapshot'
    write_artifacts(destination,data,manifest,evidence)
    loaded,canonical,rows=validate_files(destination/'prices.csv',destination/'manifest.json')
    assert len(rows)==20
    assert [i.symbol for i in loaded.instruments]==sorted(SYMBOLS)
    assert [s.session_date for s in loaded.sessions]==['2025-01-13','2025-01-14','2025-01-15','2025-01-16']
    assert [(r['session_date'],r['symbol']) for r in rows]==sorted((r['session_date'],r['symbol']) for r in rows)
    assert not evidence['request']['auto_adjust'] and evidence['request']['actions']
    assert 'shared-app' in manifest['usage_terms']
    assert evidence['original_provider_values']==source[0]


@pytest.mark.parametrize('value,expected',[('233.13999938964844','233.140000'),('100.12000274658203','100.120000'),('100.00','100.000000')])
def test_float_representation_noise_only(value,expected):
    assert cent_price(value)==expected


@pytest.mark.parametrize('value',['100.125','100.001','100.00001','NaN','Infinity','0','-1','1000001','999999.99'])
def test_reject_true_subcents_nonfinite_bounds_and_ambiguous_precision(value):
    with pytest.raises(ImportFailure): cent_price(value)


@pytest.mark.parametrize('value',['1.5','-1','NaN','9223372036854775808'])
def test_invalid_volume(value):
    with pytest.raises(ImportFailure): whole_volume(value)


@pytest.mark.parametrize('failure',['missing_bar','missing_symbol','dividend','split','unknown_action','missing_actions','different_calendar'])
def test_fail_closed_provider_data(source,failure):
    histories,sessions=source
    if failure=='missing_bar': del histories['AAPL']['2025-01-14']
    if failure=='missing_symbol': del histories['TSLA']
    if failure in ['dividend','split','unknown_action']:
        action={'dividend':'Dividends','split':'Stock Splits','unknown_action':'Capital Gains'}[failure]
        histories['AAPL']['2025-01-14'][action]='1.0'
    if failure=='missing_actions': del histories['AAPL']['2025-01-14']['Stock Splits']
    if failure=='different_calendar': sessions[1]['session_date']='2025-01-12'
    with pytest.raises(ImportFailure): artifacts(source)


def test_no_partial_files_or_overwrite(tmp_path,source):
    data,manifest,evidence=artifacts(source)
    bad=data.replace(b'101.000000',b'1.000000')
    from hashlib import sha256
    manifest['csv_sha256']=sha256(bad).hexdigest()
    destination=tmp_path/'snapshot'
    with pytest.raises(ImportFailure): write_artifacts(destination,bad,manifest,evidence)
    assert not destination.exists()
    data,manifest,evidence=artifacts(source)
    write_artifacts(destination,data,manifest,evidence)
    with pytest.raises(ImportFailure): write_artifacts(destination,data,manifest,evidence)
    assert (destination/'prices.csv').read_bytes()==data


def test_all_five_symbols_trade_through_isolated_api(tmp_path,source,capsys):
    # Fully synthetic prices: exercise every symbol without claiming a live fetch.
    from verify_backend import verify
    data,manifest,evidence=artifacts(source)
    manifest.update(synthetic=True,label='Test-only synthetic five-symbol grid',source='Unit-test generated prices',
        source_urls=[],usage_terms='Project-authored synthetic data for deterministic offline testing.',usage_terms_url=None)
    manifest['corporate_actions'].update(status='assumed_none',evidence_urls=[],notes='Synthetic test fixture assumes no corporate actions throughout the selected window.')
    destination=tmp_path/'synthetic'
    write_artifacts(destination,data,manifest,evidence)
    for symbol in sorted(SYMBOLS):
        verify(destination/'prices.csv',destination/'manifest.json','asgi',symbol=symbol)
    assert capsys.readouterr().out.count('PASS: in-process ASGI')==5

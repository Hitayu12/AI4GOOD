"""Explicit local Yahoo/yfinance download for the five user-selected equities.

No network calls on application startup. Generated source data stays ignored.
Install optional requirements-data.in in a separate data environment.
"""
import argparse
import csv
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from hashlib import sha256
from importlib.metadata import version
import io
import json
import math
from pathlib import Path
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.datasets import CSV_FIELDS, ImportFailure, price_scaled, validate_files

SYMBOLS = {'AAPL': 'Apple Inc.', 'AMZN': 'Amazon.com, Inc.', 'MSFT': 'Microsoft Corporation',
           'NVDA': 'NVIDIA Corporation', 'TSLA': 'Tesla, Inc.'}
START, END = '2025-01-13', '2025-01-17'  # end exclusive
DATASET_ID = 'yfinance-five-20250113-v1'


def decimal_number(value):
    try:
        number = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ImportFailure('Provider returned an invalid numeric value.') from None
    if not number.is_finite():
        raise ImportFailure('Provider returned a nonfinite numeric value.')
    return number


def cent_price(value):
    """Remove only bounded float32 representation noise, never true subcent quotes.

Yahoo commonly serializes cent quotes through float32. Require the value to be
within half a float32 ULP of an exact cent and reject coarse/ambiguous precision.
Original values and this conversion policy are preserved in source evidence.
The backend CSV importer remains exact and performs no rounding.
"""
    number = decimal_number(value)
    if not Decimal('.01') <= number <= Decimal('1000000'):
        raise ImportFailure('Provider price outside supported bounds.')
    tolerance = Decimal(2) ** (math.frexp(float(number))[1] - 25)
    if tolerance >= Decimal('.005'):
        raise ImportFailure('Provider precision cannot distinguish whole cents.')
    cents = number.quantize(Decimal('.01'), rounding=ROUND_HALF_UP)
    if abs(number - cents) > tolerance + Decimal('0.000000001'):
        raise ImportFailure('Provider price has unsupported fractional cents; no general rounding is allowed.')
    result = f'{cents:.6f}'
    price_scaled(result)
    return result


def whole_volume(value):
    number = decimal_number(value)
    if number != number.to_integral_value() or not 0 <= number <= 9223372036854775807:
        raise ImportFailure('Provider volume must be a nonnegative signed-64-bit integer.')
    return str(int(number))


def build_artifacts(histories, sessions, retrieved_on, versions):
    """Pure conversion/validation boundary; histories contain original string values."""
    dates = [s['session_date'] for s in sessions]
    if not 3 <= len(dates) <= 366 or dates != sorted(set(dates)):
        raise ImportFailure('Need at least three ordered unique calendar sessions.')
    if set(histories) != set(SYMBOLS):
        raise ImportFailure('Exactly the five selected symbols are required.')
    output = io.StringIO(newline='')
    writer = csv.DictWriter(output, fieldnames=CSV_FIELDS, lineterminator='\n')
    writer.writeheader()
    for symbol, rows in histories.items():
        if list(rows) != dates:
            raise ImportFailure(f'{symbol}: missing, duplicate, unordered or unexpected session.')
        for day, bar in rows.items():
            for action in ['Dividends', 'Stock Splits', 'Capital Gains']:
                if action not in bar or decimal_number(bar[action]) != 0:
                    raise ImportFailure(f'{symbol} {day}: missing action evidence or nonzero corporate action.')
    for day in dates:
        for symbol in sorted(SYMBOLS):
            bar = histories[symbol][day]
            writer.writerow({'symbol':symbol, 'session_date':day,
                **{field:cent_price(bar[field.title()]) for field in ['open','high','low','close']},
                'volume':whole_volume(bar['Volume'])})
    csv_bytes = output.getvalue().encode()
    sources = [f'https://finance.yahoo.com/quote/{s}/history/' for s in sorted(SYMBOLS)]
    evidence = {'retrieved_on':retrieved_on, 'versions':versions, 'symbols':sorted(SYMBOLS),
        'request':{'start':START,'end_exclusive':END,'interval':'1d','auto_adjust':False,
            'back_adjust':False,'actions':True,'repair':False,'rounding':False},
        'calendar':'XNYS regular-session schedule, shared US-equity session window',
        'sessions':sessions, 'original_provider_values':histories,
        'conversion':'Prices normalized to whole cents only within half a float32 ULP; true fractional cents/coarse precision rejected. No dividend/back adjustment or price repair requested.'}
    manifest = {'id':DATASET_ID, 'version':1,
        'label':'AAPL AMZN MSFT NVDA TSLA — Jan 13–16 2025 (Yahoo/yfinance)',
        'source':'Yahoo Finance via yfinance (user-selected five-stock universe)',
        'source_urls':sources, 'usage_terms_url':'https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html',
        'usage_terms':'Downloaded at user request for local educational research. yfinance documentation describes Yahoo Finance API data as intended for personal use. This download does not establish shared-app redistribution or deployment rights; obtain applicable permission before shared publication.',
        'retrieved_on':retrieved_on, 'synthetic':False, 'currency':'USD', 'price_policy':'raw_unadjusted',
        'csv_sha256':sha256(csv_bytes).hexdigest(),
        'instruments':[{'symbol':s,'name':SYMBOLS[s]} for s in sorted(SYMBOLS)], 'sessions':sessions,
        'calendar_notes':'XNYS exchange_calendars schedule checked for the selected full US-equity sessions. Each selected Nasdaq-listed ticker must return exactly the same dates, America/New_York timezone, USD currency and zero action fields; missing bars are never silently dropped.',
        'corporate_actions':{'status':'verified_none','checked_on':retrieved_on,'evidence_urls':sources,
            'notes':'Downloaded actions=True data reports zero Dividends, Stock Splits and Capital Gains for every selected symbol/session. Original provider strings, options and dependency/calendar versions are preserved in source_evidence.json. This is provider-reported evidence, not an independent corporate-action audit.'},
        'limitations':['User-selected five-stock universe; not a market-cap ranking or representative backtest.',
            'Small four-session window; no dividends, splits, fees, borrowing or corporate-action processing.',
            'Local educational research only; shared-app rights have not been established.',
            'auto_adjust=False disables dividend adjustment; Yahoo historical OHLC may already reflect earlier splits. The no-action window does not prove exchange-original prices.',
            'Bounded float32-to-cent normalization is recorded; unsupported fractional-cent prices are rejected.']}
    return csv_bytes, manifest, evidence


def download():
    try:
        import exchange_calendars as calendars
        import yfinance as yf
    except ImportError:
        raise ImportFailure('Install optional data dependencies: python -m pip install -r requirements-data.in') from None
    # Keep provider cookies/timezone caches inside ignored local data, not HOME.
    cache = ROOT/'data/local/yfinance-cache'
    cache.mkdir(parents=True, exist_ok=True)
    yf.set_tz_cache_location(str(cache))
    schedule = calendars.get_calendar('XNYS').schedule.loc[START:(date.fromisoformat(END)-timedelta(days=1)).isoformat()]
    sessions = []
    for day, row in schedule.iterrows():
        opened, closed = row['open'], row['close']
        if opened.tzinfo is None or closed.tzinfo is None:
            raise ImportFailure('Exchange calendar must return timezone-aware times.')
        sessions.append({'session_date':day.date().isoformat(),
            'open_at':opened.tz_convert('UTC').strftime('%Y-%m-%dT%H:%M:%SZ'),
            'close_at':closed.tz_convert('UTC').strftime('%Y-%m-%dT%H:%M:%SZ')})
    histories = {}
    for symbol in sorted(SYMBOLS):
        ticker = yf.Ticker(symbol)
        frame = ticker.history(start=START, end=END, interval='1d', auto_adjust=False,
            back_adjust=False, actions=True, repair=False, rounding=False, keepna=True,
            prepost=False, timeout=20, raise_errors=True)
        metadata = ticker.get_history_metadata()
        if metadata.get('currency') != 'USD' or metadata.get('exchangeTimezoneName') != 'America/New_York':
            raise ImportFailure(f'{symbol}: unsupported currency/exchange timezone.')
        required = ['Open','High','Low','Close','Volume','Dividends','Stock Splits']
        if frame.empty or any(name not in frame.columns for name in required):
            raise ImportFailure(f'{symbol}: incomplete history/action response.')
        bars = {}
        for timestamp, row in frame.iterrows():
            if timestamp.tzinfo is None:
                raise ImportFailure(f'{symbol}: missing timestamp timezone.')
            day = timestamp.tz_convert('America/New_York').date().isoformat()
            if day in bars:
                raise ImportFailure(f'{symbol}: duplicate date.')
            bars[day] = {name:str(row[name]) for name in required}
            # Equity responses can omit Capital Gains (fund-only action field).
            bars[day]['Capital Gains'] = str(row.get('Capital Gains',0))
        histories[symbol] = bars
    return build_artifacts(histories,sessions,datetime.now(timezone.utc).date().isoformat(),
        {name:version(name) for name in ['yfinance','exchange-calendars','pandas']})


def write_artifacts(destination, csv_bytes, manifest, evidence):
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        raise ImportFailure('Output already exists. Reuse its files, or choose a new --output directory; existing snapshots are never overwritten.')
    with tempfile.TemporaryDirectory(prefix='.yfinance-staging-',dir=destination.parent) as folder:
        stage = Path(folder)/'snapshot'
        stage.mkdir()
        (stage/'prices.csv').write_bytes(csv_bytes)
        for name, body in [('manifest.json',manifest),('source_evidence.json',evidence)]:
            (stage/name).write_text(json.dumps(body,indent=2)+'\n')
        validate_files(stage/'prices.csv',stage/'manifest.json')
        stage.rename(destination)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=ROOT/'data/local'/DATASET_ID)
    args = parser.parse_args()
    try:
        if args.output.exists():
            raise ImportFailure('Output exists; reuse its manifest/CSV instead of overwriting the snapshot.')
        csv_bytes, manifest, evidence = download()
        write_artifacts(args.output.resolve(),csv_bytes,manifest,evidence)
    except (ImportFailure, OSError, ValueError) as exc:
        print(f'Download failed: {exc}',file=sys.stderr)
        return 1
    except Exception as exc:
        print(f'Download failed ({type(exc).__name__}); no fallback or fabricated dataset was created.',file=sys.stderr)
        return 1
    print(f'Validated {len(SYMBOLS)} symbols × {len(manifest["sessions"])} sessions: {args.output.resolve()}')
    print('Local snapshot only; no application database was changed. Source usage limits are recorded in manifest.json.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

"""Offline, bounded, atomic CSV imports; public API exposes only metadata."""
import argparse
import csv
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from hashlib import sha256
import io
import json
from pathlib import Path
import re
import sys
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, ValidationError, field_validator, model_validator
from sqlalchemy import Engine, func, insert, select, update
from sqlalchemy.exc import SQLAlchemyError

from app.auth import DatabaseSession, get_current_user
from app.config import load_settings
from app.database import make_engine
from app.errors import APIError, ErrorResponse
from app.models import Dataset, DatasetInstrument, DatasetSession, MarketBar

MAX_CSV_BYTES = 5_000_000
MAX_MANIFEST_BYTES = 128_000
MAX_DATASETS = 100
CSV_FIELDS = ["symbol", "session_date", "open", "high", "low", "close", "volume"]
Symbol = Annotated[str, Field(pattern=r"^[A-Z][A-Z0-9.-]{0,11}$")]
DatasetID = Annotated[str, Field(min_length=1, max_length=64, pattern=r"^[a-z0-9][a-z0-9_-]*$")]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Instrument(StrictModel):
    symbol: Symbol
    name: str = Field(min_length=1, max_length=120)


class SessionDefinition(StrictModel):
    session_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    open_at: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
    close_at: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")

    @model_validator(mode="after")
    def times(self):
        date.fromisoformat(self.session_date)
        opened = datetime.fromisoformat(self.open_at.replace("Z", "+00:00"))
        closed = datetime.fromisoformat(self.close_at.replace("Z", "+00:00"))
        if not opened < closed or opened.date().isoformat() != self.session_date or closed.date() != opened.date():
            raise ValueError("Session open/close must be ordered on the declared UTC session date.")
        return self


class CorporateActions(StrictModel):
    status: Literal["assumed_none", "verified_none"]
    checked_on: date
    evidence_urls: list[HttpUrl] = Field(max_length=10)
    notes: str = Field(min_length=20, max_length=2000)

    @field_validator("checked_on", mode="before")
    @classmethod
    def date_text(cls, value):
        if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            raise ValueError("Date must use YYYY-MM-DD.")
        return value

    @field_validator("notes")
    @classmethod
    def no_blank(cls, value):
        if not value.strip():
            raise ValueError("Action review notes must not be blank.")
        return value


class DatasetManifest(StrictModel):
    id: DatasetID
    version: int = Field(strict=True, ge=1, le=1000000)
    label: str = Field(min_length=1, max_length=120)
    source: str = Field(min_length=1, max_length=120)
    source_urls: list[HttpUrl] = Field(max_length=10)
    usage_terms: str = Field(min_length=20, max_length=2000)
    usage_terms_url: HttpUrl | None
    retrieved_on: date
    synthetic: bool = Field(strict=True)
    currency: Literal["USD"]
    price_policy: Literal["raw_unadjusted"]
    csv_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    instruments: list[Instrument] = Field(min_length=1, max_length=25)
    sessions: list[SessionDefinition] = Field(min_length=1, max_length=366)
    calendar_notes: str = Field(min_length=20, max_length=2000)
    corporate_actions: CorporateActions
    limitations: list[Annotated[str, Field(min_length=1, max_length=500)]] = Field(min_length=1, max_length=20)

    @field_validator("retrieved_on", mode="before")
    @classmethod
    def date_text(cls, value):
        if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            raise ValueError("Date must use YYYY-MM-DD.")
        return value

    @field_validator("label", "source", "usage_terms", "calendar_notes")
    @classmethod
    def no_blank(cls, value):
        if not value.strip():
            raise ValueError("Metadata must not be blank.")
        return value

    @model_validator(mode="after")
    def consistency(self):
        symbols = [item.symbol for item in self.instruments]
        dates = [item.session_date for item in self.sessions]
        if symbols != sorted(set(symbols)) or dates != sorted(set(dates)):
            raise ValueError("Symbols and sessions must be unique and sorted ascending.")
        last = date.fromisoformat(dates[-1])
        if last > self.retrieved_on or not last <= self.corporate_actions.checked_on <= self.retrieved_on:
            raise ValueError("Retrieval/action-review dates must cover the entire historical window.")
        if self.synthetic:
            if self.corporate_actions.status != "assumed_none":
                raise ValueError("Synthetic data must declare an assumed no-action window.")
        elif (self.corporate_actions.status != "verified_none" or not self.source_urls
              or self.usage_terms_url is None or not self.corporate_actions.evidence_urls):
            raise ValueError("Real data requires source/terms URLs and verified no-action evidence.")
        return self


class ImportFailure(ValueError):
    pass


class ImportConflict(ImportFailure):
    pass


def read_bounded(path: Path, limit: int) -> bytes:
    with path.open("rb") as file:
        data = file.read(limit + 1)
    if len(data) > limit:
        raise ImportFailure(f"Input exceeds the {limit}-byte limit.")
    return data


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ImportFailure("Duplicate JSON keys are not allowed.")
        result[key] = value
    return result


def price_scaled(value: str) -> int:
    # Bound text before Decimal arithmetic, including exponents/huge coefficients.
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{1,7}(?:\.[0-9]{1,6})?", value):
        raise ImportFailure("Prices require plain finite decimal notation with at most six places.")
    try:
        number = Decimal(value)
    except InvalidOperation:
        raise ImportFailure("Invalid price.") from None
    if not Decimal("0.01") <= number <= Decimal("1000000"):
        raise ImportFailure("Prices must be 0.010000–1000000.000000 USD.")
    if number * 100 != (number * 100).to_integral_value():
        raise ImportFailure("Fractional-cent prices are not supported; no rounding is performed.")
    return int(number * 1000000)


def validate_files(csv_path: Path, manifest_path: Path):
    raw = read_bounded(csv_path, MAX_CSV_BYTES)
    try:
        content = json.loads(read_bounded(manifest_path, MAX_MANIFEST_BYTES).decode("utf-8"),
                             object_pairs_hook=unique_object)
        manifest = DatasetManifest.model_validate(content)
        text = raw.decode("utf-8")
    except (ValidationError, UnicodeError, json.JSONDecodeError) as error:
        raise ImportFailure("Invalid manifest/UTF-8 input; inspect the documented schema and provenance.") from error
    if sha256(raw).hexdigest() != manifest.csv_sha256:
        raise ImportFailure("CSV checksum does not match manifest.")
    reader = csv.DictReader(io.StringIO(text, newline=""), strict=True)
    expected = {(s.session_date, i.symbol) for s in manifest.sessions for i in manifest.instruments}
    rows, previous = [], None
    try:
        if reader.fieldnames != CSV_FIELDS:
            raise ImportFailure("CSV header must be: " + ",".join(CSV_FIELDS))
        for row in reader:
            if None in row or any(value is None for value in row.values()):
                raise ImportFailure("CSV row has an incorrect number of columns.")
            key = (row["session_date"], row["symbol"])
            if key not in expected or (previous is not None and key <= previous):
                raise ImportFailure("Rows must be unique, declared, and sorted by session_date then symbol.")
            expected.remove(key)
            previous = key
            prices = {field + "_scaled": price_scaled(row[field]) for field in ("open", "high", "low", "close")}
            if (prices["high_scaled"] < max(prices["open_scaled"], prices["close_scaled"])
                or prices["low_scaled"] > min(prices["open_scaled"], prices["close_scaled"])
                or prices["low_scaled"] > prices["high_scaled"]):
                raise ImportFailure("Invalid OHLC relationships.")
            volume = row["volume"]
            if not re.fullmatch(r"[0-9]{1,19}", volume) or int(volume) > 9223372036854775807:
                raise ImportFailure("Volume must be an integer from 0 to 9223372036854775807.")
            rows.append(dict(dataset_id=manifest.id, symbol=row["symbol"], session_date=row["session_date"],
                             **prices, volume=int(volume)))
    except csv.Error as error:
        raise ImportFailure("Malformed CSV.") from error
    if expected:
        raise ImportFailure("Missing bars: every declared symbol/session pair is required.")
    canonical = json.dumps(manifest.model_dump(mode="json"), sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return manifest, canonical, rows


def import_dataset(engine: Engine, csv_path: Path, manifest_path: Path) -> dict:
    manifest, canonical, rows = validate_files(csv_path, manifest_path)
    fingerprint = sha256(canonical.encode()).hexdigest()
    with engine.connect() as connection:
        # Serialize the duplicate check, bounded catalog check, rows, and seal.
        connection.exec_driver_sql("BEGIN IMMEDIATE")
        try:
            existing = connection.execute(select(Dataset.manifest_sha256, Dataset.sealed)
                                          .where(Dataset.id == manifest.id)).first()
            if existing is not None:
                if existing.manifest_sha256 != fingerprint or existing.sealed != 1:
                    raise ImportConflict("Dataset ID already exists with different content; use a new ID/version.")
                result = "unchanged"
            else:
                if connection.scalar(select(func.count()).select_from(Dataset)) >= MAX_DATASETS:
                    raise ImportFailure("Catalog limit reached (100 datasets).")
                connection.execute(insert(Dataset), dict(id=manifest.id, manifest_json=canonical,
                                                         manifest_sha256=fingerprint, sealed=0))
                connection.execute(insert(DatasetInstrument), [dict(dataset_id=manifest.id, **i.model_dump())
                                                                for i in manifest.instruments])
                connection.execute(insert(DatasetSession), [dict(dataset_id=manifest.id, **s.model_dump())
                                                             for s in manifest.sessions])
                connection.execute(insert(MarketBar), rows)
                connection.execute(update(Dataset).where(Dataset.id == manifest.id).values(sealed=1))
                result = "imported"
            connection.commit()
        except Exception:
            connection.rollback()
            raise
    return {"dataset_id": manifest.id, "result": result, "bar_count": len(rows), "manifest_sha256": fingerprint}


def inspect_manifest(engine: Engine, dataset_id: str) -> dict:
    with engine.connect() as connection:
        stored = connection.execute(select(Dataset.manifest_json, Dataset.manifest_sha256).where(
            Dataset.id == dataset_id, Dataset.sealed == 1)).first()
        if stored is None:
            raise ImportFailure("Dataset not found.")
        return {"manifest": json.loads(stored.manifest_json), "manifest_sha256": stored.manifest_sha256}


class DatasetMetadata(StrictModel):
    id: DatasetID
    label: str = Field(min_length=1, max_length=120)
    source: str = Field(min_length=1, max_length=120)
    synthetic: bool
    session_dates: list[Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}$")]] = Field(min_length=1, max_length=366)
    symbols: list[Symbol] = Field(min_length=1, max_length=25)


class DatasetList(StrictModel):
    items: list[DatasetMetadata] = Field(max_length=MAX_DATASETS)


class InstrumentList(StrictModel):
    items: list[Instrument] = Field(min_length=1, max_length=25)


class InstrumentQuery(StrictModel):
    dataset_id: DatasetID


router = APIRouter(prefix="/api/v1", tags=["datasets"], dependencies=[Depends(get_current_user)],
                   responses={401: {"model": ErrorResponse}, 422: {"model": ErrorResponse}})


@router.get("/datasets", response_model=DatasetList)
def datasets(session: DatabaseSession):
    items = []
    for stored in session.scalars(select(Dataset).where(Dataset.sealed == 1).order_by(Dataset.id)):
        data = json.loads(stored.manifest_json)
        items.append(DatasetMetadata(id=stored.id, label=data["label"], source=data["source"],
                     synthetic=data["synthetic"], session_dates=[s["session_date"] for s in data["sessions"]],
                     symbols=[i["symbol"] for i in data["instruments"]]))
    return DatasetList(items=items)


@router.get("/instruments", response_model=InstrumentList, responses={404: {"model": ErrorResponse}})
def instruments(query: Annotated[InstrumentQuery, Query()], session: DatabaseSession):
    stored = session.get(Dataset, query.dataset_id)
    if stored is None or stored.sealed != 1:
        raise APIError(404, "dataset_not_found", "Dataset not found.")
    return InstrumentList(items=[Instrument(symbol=item.symbol, name=item.name) for item in
        session.scalars(select(DatasetInstrument).where(DatasetInstrument.dataset_id == query.dataset_id)
                        .order_by(DatasetInstrument.symbol))])


def main():
    parser = argparse.ArgumentParser(description="Validate/import immutable OHLCV data; never downloads anything.")
    parser.add_argument("--csv", type=Path)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--inspect", metavar="DATASET_ID")
    args = parser.parse_args()
    if (args.inspect is not None and (args.csv is not None or args.manifest is not None)) or (
        args.inspect is None and (args.csv is None or args.manifest is None)):
        parser.error("Use either --csv PATH --manifest PATH, or --inspect DATASET_ID.")
    engine = None
    try:
        engine = make_engine(load_settings().database_url)
        result = (inspect_manifest(engine, args.inspect) if args.inspect is not None else
                  import_dataset(engine, args.csv, args.manifest))
        print(json.dumps(result, sort_keys=True))
    except (ImportFailure, OSError, SQLAlchemyError, ValueError) as error:
        if isinstance(error, ImportFailure):
            message = str(error)
        elif isinstance(error, OSError):
            message = "Cannot read input files. Check paths and permissions."
        else:
            message = "Database/configuration error. Check DATABASE_URL and run migrations first."
        print("Import failed: " + message, file=sys.stderr)
        return 1
    finally:
        if engine is not None:
            engine.dispose()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

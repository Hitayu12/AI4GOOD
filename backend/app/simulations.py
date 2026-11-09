"""Owned after-close cursors; every market read is bounded by a captured cursor."""
from contextlib import contextmanager
from datetime import date
from decimal import Decimal
from hashlib import sha256
import json
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Header, Path, Query, Request, Response
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import func, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.auth import DatabaseSession, get_current_user
from app.datasets import DatasetID, Symbol
from app.errors import APIError, ErrorResponse
from app.models import (Dataset, DatasetSession, EquitySnapshot, IdempotencyReceipt,
                        MarketBar, Simulation, User)

MAX_SIMULATIONS_PER_USER = 100


def valid_date(value: str) -> str:
    date.fromisoformat(value)
    return value


SessionDate = Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}$"), AfterValidator(valid_date)]
Timestamp = Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")]
Money = Annotated[str, Field(pattern=r"^-?(?:0|[1-9][0-9]*)\.[0-9]{2}$")]
Price = Annotated[str, Field(pattern=r"^(?:0|[1-9][0-9]{0,6})\.[0-9]{6}$")]
Version = Annotated[int, Field(strict=True, ge=1, le=1000000000)]
SimulationID = Annotated[str, Path(min_length=1, max_length=64)]
CurrentUser = Annotated[User, Depends(get_current_user)]
IdempotencyKey = Annotated[str, Header(alias="Idempotency-Key", min_length=1, max_length=128,
    pattern=r"^[A-Za-z0-9][A-Za-z0-9_.:-]*$",
    description="Client-generated key; reuse the same key and payload after a timeout. Never retry with a new key.")]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CreateSimulation(StrictModel):
    dataset_id: DatasetID
    start_session: SessionDate
    end_session: SessionDate
    initial_cash: str = Field(strict=True, pattern=r"^(?:0|[1-9][0-9]{0,9})\.[0-9]{2}$",
        description="USD decimal string with two places, greater than zero and at most 1000000000.00.")

    @model_validator(mode="after")
    def bounds(self):
        if self.start_session > self.end_session or not Decimal("0") < Decimal(self.initial_cash) <= Decimal("1000000000"):
            raise ValueError("Invalid session range or initial cash.")
        return self


class AdvanceSimulation(StrictModel):
    expected_version: Version


class SimulationResponse(StrictModel):
    id: str
    dataset_id: DatasetID
    symbols: list[Symbol] = Field(min_length=1, max_length=25)
    start_session: SessionDate
    end_session: SessionDate
    current_session: SessionDate
    current_time: Timestamp
    initial_cash: Money
    status: Literal["active", "completed"]
    version: Version


class SimulationList(StrictModel):
    items: list[SimulationResponse] = Field(max_length=MAX_SIMULATIONS_PER_USER)


class OrderResponse(StrictModel):
    """Contract shape only; order submission/execution is introduced in Phase 6."""
    id: str
    symbol: Symbol
    side: Literal["buy", "sell"]
    quantity: int = Field(strict=True, ge=1, le=1000000)
    status: Literal["pending", "filled", "rejected"]
    submitted_at: Timestamp
    executed_at: Timestamp | None
    execution_price: Price | None
    rejection_code: str | None


class AdvanceResponse(StrictModel):
    simulation: SimulationResponse
    order_results: list[OrderResponse]


class MarketRange(StrictModel):
    from_session: SessionDate | None = Field(default=None, alias="from")
    to_session: SessionDate | None = Field(default=None, alias="to")


class MarketBarResponse(StrictModel):
    session_date: SessionDate
    available_at: Timestamp
    open: Price
    high: Price
    low: Price
    close: Price
    volume: int = Field(ge=0, le=9223372036854775807)


class MarketDataResponse(StrictModel):
    items: list[MarketBarResponse] = Field(max_length=366)


def money_string(cents: int) -> str:
    amount = abs(cents)
    return ("-" if cents < 0 else "") + f"{amount // 100}.{amount % 100:02d}"


def price_string(scaled: int) -> str:
    return f"{scaled // 1000000}.{scaled % 1000000:06d}"


def unavailable() -> APIError:
    return APIError(503, "market_data_unavailable", "Required market data is unavailable.")


def owned_simulation(session: Session, user_id: str, simulation_id: str) -> Simulation:
    simulation = session.scalar(select(Simulation).where(Simulation.id == simulation_id, Simulation.user_id == user_id))
    if simulation is None:
        raise APIError(404, "simulation_not_found", "Simulation not found.")
    return simulation


def dataset_manifest(dataset: Dataset) -> dict:
    if dataset.sealed != 1 or sha256(dataset.manifest_json.encode()).hexdigest() != dataset.manifest_sha256:
        raise unavailable()
    return json.loads(dataset.manifest_json)


def pinned_manifest(session: Session, simulation: Simulation) -> dict:
    dataset = session.get(Dataset, simulation.dataset_id)
    if dataset is None or dataset.manifest_sha256 != simulation.dataset_manifest_sha256:
        raise unavailable()
    return dataset_manifest(dataset)


def serialize_simulation(simulation: Simulation, manifest: dict) -> SimulationResponse:
    return SimulationResponse(id=simulation.id, dataset_id=simulation.dataset_id,
        symbols=[i["symbol"] for i in manifest["instruments"]], start_session=simulation.start_session,
        end_session=simulation.end_session, current_session=simulation.current_session,
        current_time=simulation.current_time, initial_cash=money_string(simulation.initial_cash_cents),
        status=simulation.status, version=simulation.version)


def check_session_grid(session: Session, dataset_id: str, definition: dict, symbols: list[str]):
    stored = session.get(DatasetSession, (dataset_id, definition["session_date"]))
    actual = set(session.scalars(select(MarketBar.symbol).where(
        MarketBar.dataset_id == dataset_id, MarketBar.session_date == definition["session_date"])))
    if (stored is None or stored.open_at != definition["open_at"] or stored.close_at != definition["close_at"]
        or actual != set(symbols)):
        raise unavailable()


@contextmanager
def simulation_write(request: Request):
    """Separate connection from auth reads; lock before checking versions/receipts."""
    try:
        with request.app.state.engine.connect() as connection:
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            with Session(bind=connection, expire_on_commit=False) as session:
                try:
                    yield session
                    session.flush()
                    connection.commit()
                except Exception:
                    connection.rollback()
                    raise
    except OperationalError:
        raise APIError(503, "database_unavailable", "Database is temporarily unavailable. Retry with the same key.") from None


def request_fingerprint(body: BaseModel) -> str:
    return sha256(json.dumps(body.model_dump(mode="json"), sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def receipt_response(body: str, status: int) -> Response:
    return Response(content=body, status_code=status, media_type="application/json", headers={"Cache-Control": "no-store"})


def replay(session: Session, user_id: str, route: str, resource: str, key: str, fingerprint: str) -> Response | None:
    receipt = session.get(IdempotencyReceipt, (user_id, route, resource, key))
    if receipt is None:
        return None
    if receipt.request_sha256 != fingerprint:
        raise APIError(409, "idempotency_conflict", "Idempotency key was already used with a different request.")
    return receipt_response(receipt.response_json, receipt.http_status)


def save_receipt(session: Session, user_id: str, route: str, resource: str, key: str,
                 fingerprint: str, body: BaseModel, status: int) -> Response:
    encoded = json.dumps(body.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    session.add(IdempotencyReceipt(user_id=user_id, route=route, resource_id=resource, key=key,
                                  request_sha256=fingerprint, http_status=status, response_json=encoded))
    session.flush()
    return receipt_response(encoded, status)


router = APIRouter(prefix="/api/v1/simulations", tags=["simulations"], responses={
    401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}, 409: {"model": ErrorResponse},
    422: {"model": ErrorResponse}, 503: {"model": ErrorResponse}, 500: {"model": ErrorResponse}})


@router.post("", status_code=201, response_model=SimulationResponse)
def create_simulation(body: CreateSimulation, request: Request, user: CurrentUser, key: IdempotencyKey):
    fingerprint = request_fingerprint(body)
    with simulation_write(request) as session:
        cached = replay(session, user.id, "simulations.create", "", key, fingerprint)
        if cached is not None:
            return cached
        dataset = session.get(Dataset, body.dataset_id)
        if dataset is None or dataset.sealed != 1:
            raise APIError(404, "dataset_not_found", "Dataset not found.")
        manifest = dataset_manifest(dataset)
        definitions = {s["session_date"]: s for s in manifest["sessions"]}
        if body.start_session not in definitions or body.end_session not in definitions:
            raise APIError(422, "unsupported_session", "Choose sessions present in the selected dataset.")
        if session.scalar(select(func.count()).select_from(Simulation).where(Simulation.user_id == user.id)) >= MAX_SIMULATIONS_PER_USER:
            raise APIError(422, "simulation_limit_reached", "A user can have at most 100 simulations.")
        symbols = [i["symbol"] for i in manifest["instruments"]]
        check_session_grid(session, dataset.id, definitions[body.start_session], symbols)
        cents = int(Decimal(body.initial_cash) * 100)
        simulation = Simulation(user_id=user.id, dataset_id=dataset.id, dataset_manifest_sha256=dataset.manifest_sha256,
            start_session=body.start_session, end_session=body.end_session, current_session=body.start_session,
            current_time=definitions[body.start_session]["close_at"], initial_cash_cents=cents, cash_cents=cents,
            status="completed" if body.start_session == body.end_session else "active", version=1)
        session.add(simulation)
        session.flush()
        session.add(EquitySnapshot(simulation_id=simulation.id, session_date=simulation.current_session, total_equity_cents=cents))
        return save_receipt(session, user.id, "simulations.create", "", key, fingerprint,
                            serialize_simulation(simulation, manifest), 201)


@router.get("", response_model=SimulationList)
def list_simulations(user: CurrentUser, session: DatabaseSession, response: Response):
    response.headers["Cache-Control"] = "no-store"
    return SimulationList(items=[serialize_simulation(sim, pinned_manifest(session, sim)) for sim in
        session.scalars(select(Simulation).where(Simulation.user_id == user.id).order_by(Simulation.id))])


@router.get("/{simulation_id}", response_model=SimulationResponse)
def get_simulation(simulation_id: SimulationID, user: CurrentUser, session: DatabaseSession, response: Response):
    response.headers["Cache-Control"] = "no-store"
    sim = owned_simulation(session, user.id, simulation_id)
    return serialize_simulation(sim, pinned_manifest(session, sim))


@router.post("/{simulation_id}/advance", response_model=AdvanceResponse)
def advance_simulation(simulation_id: SimulationID, body: AdvanceSimulation, request: Request,
                       user: CurrentUser, key: IdempotencyKey):
    fingerprint = request_fingerprint(body)
    with simulation_write(request) as session:
        sim = owned_simulation(session, user.id, simulation_id)
        # Receipts precede stale-version and completion checks, including on the final day.
        cached = replay(session, user.id, "simulations.advance", simulation_id, key, fingerprint)
        if cached is not None:
            return cached
        if body.expected_version != sim.version:
            raise APIError(409, "stale_version", "Simulation version is stale. Reload its current state.", "expected_version")
        if sim.status == "completed":
            raise APIError(409, "simulation_completed", "Simulation is already completed.")
        manifest = pinned_manifest(session, sim)
        definitions = [s for s in manifest["sessions"] if sim.start_session <= s["session_date"] <= sim.end_session]
        index = next((i for i, s in enumerate(definitions) if s["session_date"] == sim.current_session), None)
        if index is None or index + 1 >= len(definitions):
            raise unavailable()
        destination = definitions[index + 1]
        check_session_grid(session, sim.dataset_id, destination, [i["symbol"] for i in manifest["instruments"]])
        sim.current_session = destination["session_date"]
        sim.current_time = destination["close_at"]
        sim.version += 1
        sim.status = "completed" if sim.current_session == sim.end_session else "active"
        session.add(EquitySnapshot(simulation_id=sim.id, session_date=sim.current_session, total_equity_cents=sim.cash_cents))
        body_out = AdvanceResponse(simulation=serialize_simulation(sim, manifest), order_results=[])
        return save_receipt(session, user.id, "simulations.advance", simulation_id, key, fingerprint, body_out, 200)


@router.get("/{simulation_id}/market-data/{symbol}", response_model=MarketDataResponse)
def market_data(simulation_id: SimulationID, symbol: Annotated[str, Path(pattern=r"^[A-Z][A-Z0-9.-]{0,11}$")],
                query: Annotated[MarketRange, Query()], user: CurrentUser, session: DatabaseSession, response: Response):
    response.headers["Cache-Control"] = "no-store"
    sim = owned_simulation(session, user.id, simulation_id)
    manifest = pinned_manifest(session, sim)
    if symbol not in [i["symbol"] for i in manifest["instruments"]]:
        raise APIError(404, "instrument_not_found", "Instrument not found.")
    lower, upper = query.from_session or sim.start_session, query.to_session or sim.current_session
    if lower > sim.current_session or upper > sim.current_session:
        raise APIError(422, "future_data_requested", "Requested range extends beyond the simulation cursor.")
    definitions = {s["session_date"]: s for s in manifest["sessions"]}
    if lower < sim.start_session or upper < sim.start_session or lower not in definitions or upper not in definitions or lower > upper:
        raise APIError(422, "unsupported_range", "Choose an ordered range of visible simulation sessions.")
    # Apply both date and available_at constraints in SQL, not only serialization.
    rows = session.execute(select(MarketBar, DatasetSession.close_at).join(DatasetSession,
        (DatasetSession.dataset_id == MarketBar.dataset_id) & (DatasetSession.session_date == MarketBar.session_date)).where(
        MarketBar.dataset_id == sim.dataset_id, MarketBar.symbol == symbol,
        MarketBar.session_date >= lower, MarketBar.session_date <= upper,
        DatasetSession.close_at <= sim.current_time).order_by(MarketBar.session_date)).all()
    expected = [s for s in manifest["sessions"] if lower <= s["session_date"] <= upper]
    if len(rows) != len(expected) or any(available != definitions[bar.session_date]["close_at"] for bar, available in rows):
        raise unavailable()
    return MarketDataResponse(items=[MarketBarResponse(session_date=bar.session_date, available_at=available,
        open=price_string(bar.open_scaled), high=price_string(bar.high_scaled), low=price_string(bar.low_scaled),
        close=price_string(bar.close_scaled), volume=bar.volume) for bar, available in rows])

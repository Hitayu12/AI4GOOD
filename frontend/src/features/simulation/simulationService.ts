/**
 * Rutgers AI4Good 2026 — Simulation Service (Local Controller)
 * Strictly adheres to docs/API_CONTRACT.md:
 * - Local simulation controller for fixture/dev testing that simulates exact server-side contract behavior.
 * - Enforces zero-look-ahead security: future market data is completely inaccessible.
 * - Atomic-style version validation (409 on stale version).
 * - End-of-range completion handling (409 on repeated advance past completion).
 */

import {
  AdvanceSimulationResponse,
  ApiError,
  CreateSimulationRequest,
  DatasetMetadata,
  Instrument,
  MarketDataBar,
  Simulation,
} from './simulationTypes';
import {
  FIXTURE_DATASET_ID,
  FIXTURE_DATASETS,
  FIXTURE_INSTRUMENTS,
  filterVisibleMarketData,
  INITIAL_SIMULATION_FIXTURE,
} from './simulationFixtures';

export type SimulationWithStatus = Simulation & { statusCode: 201 };
export type AdvanceResult = AdvanceSimulationResponse & Simulation;

export class SimulationService {
  private simulations: Map<string, Simulation> = new Map();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(clientOrSimulations?: any, _initialDatasets?: any) {
    if (Array.isArray(clientOrSimulations)) {
      this.reset(clientOrSimulations);
    } else {
      this.reset();
    }
  }

  /**
   * Resets internal store to initial fixture state.
   */
  public reset(initialSimulations?: Simulation[]): void {
    this.simulations.clear();
    const seeds = initialSimulations ?? [{ ...INITIAL_SIMULATION_FIXTURE }];
    for (const sim of seeds) {
      this.simulations.set(sim.id, { ...sim });
    }
  }

  /**
   * Directly sets or updates a simulation fixture (for testing specific states).
   */
  public setSimulation(simulation: Simulation): void {
    this.simulations.set(simulation.id, { ...simulation });
  }

  /**
   * GET /api/v1/datasets
   */
  public async getDatasets(): Promise<DatasetMetadata[]> {
    return FIXTURE_DATASETS.map((d) => ({ ...d }));
  }

  /**
   * GET /api/v1/instruments?dataset_id=...
   */
  public async getInstruments(datasetId: string = FIXTURE_DATASET_ID): Promise<Instrument[]> {
    const list = FIXTURE_INSTRUMENTS[datasetId];
    if (!list) {
      throw new ApiError(404, 'dataset_not_found', `Dataset '${datasetId}' not found.`);
    }
    return list.map((i) => ({ ...i }));
  }

  /**
   * POST /api/v1/simulations
   * {dataset_id, start_session, end_session, initial_cash} -> Simulation (201)
   */
  public async createSimulation(params: CreateSimulationRequest): Promise<SimulationWithStatus> {
    const dataset = FIXTURE_DATASETS.find((d) => d.id === params.dataset_id);
    if (!dataset) {
      throw new ApiError(422, 'invalid_dataset', `Dataset '${params.dataset_id}' is not recognized.`, 'dataset_id');
    }

    const startSession = params.start_session || dataset.session_dates[0];
    const endSession = params.end_session || dataset.session_dates[dataset.session_dates.length - 1];

    let initialCash = params.initial_cash;
    if (initialCash === undefined && params.initial_cash_dollars !== undefined) {
      initialCash = Math.round(params.initial_cash_dollars * 100);
    }
    if (initialCash === undefined) {
      initialCash = 10000000; // default $100,000.00 stored in cents
    }

    if (typeof initialCash !== 'number' || isNaN(initialCash) || initialCash <= 0) {
      throw new ApiError(422, 'invalid_initial_cash', 'Initial cash must be greater than zero.', 'initial_cash');
    }

    // Max limit check: 1,000,000,000.00 USD (in cents: 100,000,000,000)
    const maxCash = 100000000000;
    if (initialCash > maxCash) {
      throw new ApiError(422, 'initial_cash_overflow', 'Initial cash exceeds maximum allowed limit.', 'initial_cash');
    }

    if (!dataset.session_dates.includes(startSession)) {
      throw new ApiError(422, 'invalid_start_session', `Start session '${startSession}' is not in dataset calendar.`, 'start_session');
    }

    if (!dataset.session_dates.includes(endSession)) {
      throw new ApiError(422, 'invalid_end_session', `End session '${endSession}' is not in dataset calendar.`, 'end_session');
    }

    const startIndex = dataset.session_dates.indexOf(startSession);
    const endIndex = dataset.session_dates.indexOf(endSession);
    if (startIndex > endIndex) {
      throw new ApiError(422, 'invalid_session_range', 'start_session cannot be after end_session.', 'start_session');
    }

    const id = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newSim: SimulationWithStatus = {
      id,
      dataset_id: params.dataset_id,
      symbols: [...dataset.symbols],
      start_session: startSession,
      end_session: endSession,
      current_session: startSession,
      current_time: `${startSession}T21:00:00Z`,
      initial_cash: initialCash,
      status: 'active',
      version: 1,
      statusCode: 201,
    };

    this.simulations.set(id, { ...newSim });
    return { ...newSim };
  }

  /**
   * Helper that returns full HTTP-like envelope: { status: 201, simulation: Simulation }
   */
  public async createSimulationEnvelope(params: CreateSimulationRequest): Promise<{ status: 201; simulation: Simulation }> {
    const simulation = await this.createSimulation(params);
    return {
      status: 201,
      simulation,
    };
  }

  /**
   * GET /api/v1/simulations/{id}
   */
  public async getSimulation(id: string): Promise<Simulation> {
    const sim = this.simulations.get(id);
    if (!sim) {
      throw new ApiError(404, 'simulation_not_found', `Simulation '${id}' not found.`);
    }
    return { ...sim };
  }

  /**
   * GET /api/v1/simulations
   */
  public async listSimulations(): Promise<Simulation[]> {
    return Array.from(this.simulations.values()).map((s) => ({ ...s }));
  }

  /**
   * Synchronous visible market data lookup for UI / cursor views.
   * Strictly adheres to security invariant: NEVER returns bars beyond currentSession.
   */
  public getMarketDataForCursor(symbol: string, currentSession: string): MarketDataBar[] {
    return filterVisibleMarketData(symbol, currentSession);
  }

  /**
   * POST /api/v1/simulations/{id}/advance
   * { expected_version } -> { simulation: Simulation, order_results: Order[] }
   *
   * Transitions:
   * - Increments version.
   * - Moves current_session to next session in calendar.
   * - Updates current_time to UTC close (21:00:00Z).
   * - When reaching final session (end_session), status becomes "completed".
   * - Subsequent advance returns 409 error.
   * - Stale version mismatch returns 409 error.
   */
  public async advanceSimulation(
    idOrSim: string | Simulation,
    expectedVersion: number
  ): Promise<AdvanceResult> {
    const id = typeof idOrSim === 'string' ? idOrSim : idOrSim.id;
    const sim = this.simulations.get(id);
    if (!sim) {
      throw new ApiError(404, 'simulation_not_found', `Simulation '${id}' not found.`);
    }

    // 1. If already completed, subsequent advance returns 409
    if (sim.status === 'completed') {
      throw new ApiError(
        409,
        'simulation_completed',
        'Simulation has reached the end of its session range and is already completed.'
      );
    }

    // 2. Stale version check: expected_version must match exactly
    if (sim.version !== expectedVersion) {
      throw new ApiError(
        409,
        'stale_version',
        `Expected version ${expectedVersion} does not match current simulation version ${sim.version}.`,
        'expected_version'
      );
    }

    const dataset = FIXTURE_DATASETS.find((d) => d.id === sim.dataset_id);
    if (!dataset) {
      throw new ApiError(404, 'dataset_not_found', `Dataset '${sim.dataset_id}' not found.`);
    }

    const currentIndex = dataset.session_dates.indexOf(sim.current_session);
    if (currentIndex === -1) {
      throw new ApiError(500, 'invalid_state', `Current session '${sim.current_session}' not found in dataset dates.`);
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= dataset.session_dates.length) {
      sim.status = 'completed';
      throw new ApiError(
        409,
        'simulation_completed',
        'Simulation has reached the end of available historical data.'
      );
    }

    const nextSession = dataset.session_dates[nextIndex];
    const endIndex = dataset.session_dates.indexOf(sim.end_session);

    if (nextIndex > endIndex) {
      sim.status = 'completed';
      throw new ApiError(
        409,
        'simulation_completed',
        'Simulation has reached its configured end_session.'
      );
    }

    // Apply state advance
    sim.current_session = nextSession;
    sim.current_time = `${nextSession}T21:00:00Z`;
    sim.version += 1;

    // Check if we just landed on the final session
    if (nextSession === sim.end_session || nextIndex === dataset.session_dates.length - 1) {
      sim.status = 'completed';
    }

    this.simulations.set(id, { ...sim });

    return {
      simulation: { ...sim },
      order_results: [],
      ...sim,
    };
  }

  /**
   * GET /api/v1/simulations/{id}/market-data/{symbol}
   *
   * Crucial invariant:
   * Reject future range bounds with 422.
   * NEVER return bars where session_date > current_session.
   */
  public async getMarketData(
    simulationId: string,
    symbol: string,
    fromSession?: string,
    toSession?: string
  ): Promise<MarketDataBar[]> {
    const sim = this.simulations.get(simulationId);
    if (!sim) {
      throw new ApiError(404, 'simulation_not_found', `Simulation '${simulationId}' not found.`);
    }

    if (!sim.symbols.includes(symbol)) {
      throw new ApiError(422, 'unknown_symbol', `Symbol '${symbol}' is not part of this simulation universe.`, 'symbol');
    }

    // Reject future range bounds with 422
    if (toSession && toSession > sim.current_session) {
      throw new ApiError(
        422,
        'future_session_rejected',
        `Requested to_session '${toSession}' is beyond current simulated cursor '${sim.current_session}'.`,
        'to_session'
      );
    }

    if (fromSession && toSession && fromSession > toSession) {
      throw new ApiError(422, 'invalid_session_range', 'from_session cannot be after to_session.', 'from_session');
    }

    // Use zero-lookahead filter
    let visibleBars = filterVisibleMarketData(symbol, sim.current_session);

    if (fromSession) {
      visibleBars = visibleBars.filter((b) => b.session_date >= fromSession);
    }

    if (toSession) {
      visibleBars = visibleBars.filter((b) => b.session_date <= toSession);
    }

    // Guarantee: No bars past current_session can ever leak
    return visibleBars.filter((b) => b.session_date <= sim.current_session);
  }
}

export const defaultSimulationService = new SimulationService();
export const simulationService = defaultSimulationService;

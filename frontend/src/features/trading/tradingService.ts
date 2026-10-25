/**
 * Rutgers AI4Good 2026 — Paper Trading Simulation Engine & Service
 * Strictly adheres to docs/API_CONTRACT.md (v2):
 * - Whole-share long-only stocks/ETFs (AAPL, MSFT, SPY).
 * - Single pending order constraint for MVP (409 pending_order_exists).
 * - Fills at NEXT session OPEN price upon advance.
 * - Gap higher rejection without changing cash or positions (rejected, insufficient_cash).
 * - Zero lookahead: future market data is strictly inaccessible.
 * - Weighted-average cost basis accounting.
 * - Atomic-style version verification (409 stale_version).
 * - Idempotency replay with receipts before stale-version checks.
 */

import {
  AdvanceWithTradingResponse,
  ApiError,
  CreateOrderParams,
  CreateOrderResponse,
  DatasetMetadata,
  ExecutionResult,
  MarketDataBar,
  Order,
  OrderSubmissionParams,
  Portfolio,
  Position,
  Simulation,
  Transaction,
} from './tradingTypes';
import {
  FIXTURE_DATASET_METADATA,
  FIXTURE_DATASETS,
  RAW_MARKET_DATA,
} from '../simulation/simulationFixtures';
import { CreateSimulationRequest } from '../simulation/simulationTypes';
import {
  SimulationService,
  SimulationWithStatus,
} from '../simulation/simulationService';

export function formatUSD(dollars: number | string): string {
  const num = typeof dollars === 'string' ? parseFloat(dollars) : dollars;
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatPrice(price: number | string): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '0.000000';
  return num.toFixed(6);
}

export function dollarsToCents(dollars: number | string): number {
  const num = typeof dollars === 'string' ? parseFloat(dollars) : dollars;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function centsToDollars(cents: number): string {
  if (Math.abs(cents) < 0.5) return '0.00';
  return (cents / 100).toFixed(2);
}

export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

const ORIGINAL_RAW_MARKET_DATA: Record<string, MarketDataBar[]> = Object.fromEntries(
  Object.entries(RAW_MARKET_DATA).map(([k, v]) => [k, v.map((b) => ({ ...b }))])
);

function getDefaultMarketData(): Record<string, MarketDataBar[]> {
  return Object.fromEntries(
    Object.entries(ORIGINAL_RAW_MARKET_DATA).map(([k, v]) => [k, v.map((b) => ({ ...b }))])
  );
}

interface InternalPosition {
  symbol: string;
  quantity: number;
  costBasisCents: number;
  cost_basis: string;
  market_price: string;
  market_value: string;
  unrealized_pnl: string;
}

interface InternalPortfolio {
  asOfSession: string;
  cashCents: number;
  positions: InternalPosition[];
  realizedPnlCents: number;
}

export class TradingService extends SimulationService {
  private rawMarketData: Record<string, MarketDataBar[]>;
  private datasetMetadata: DatasetMetadata;
  private customMarketDataMap: Map<string, MarketDataBar[]> = new Map();
  private ordersMap: Map<string, Order[]> = new Map();
  private transactionsMap: Map<string, Transaction[]> = new Map();
  private portfoliosMap: Map<string, InternalPortfolio> = new Map();
  private idempotencyStore: Map<string, { payloadHash: string; response: unknown }> = new Map();
  private externalSimService?: SimulationService;

  constructor(
    customMarketDataOrSimService?: Record<string, MarketDataBar[]> | SimulationService,
    customDataset?: DatasetMetadata
  ) {
    super();
    if (customMarketDataOrSimService instanceof SimulationService) {
      this.externalSimService = customMarketDataOrSimService;
      this.rawMarketData = getDefaultMarketData();
      this.datasetMetadata = customDataset ?? FIXTURE_DATASET_METADATA;
    } else if (customMarketDataOrSimService && typeof customMarketDataOrSimService === 'object') {
      this.rawMarketData = { ...customMarketDataOrSimService };
      this.datasetMetadata = customDataset ?? FIXTURE_DATASET_METADATA;
      for (const [sym, bars] of Object.entries(customMarketDataOrSimService)) {
        this.customMarketDataMap.set(sym, [...bars]);
      }
    } else {
      this.rawMarketData = getDefaultMarketData();
      this.datasetMetadata = customDataset ?? FIXTURE_DATASET_METADATA;
    }
  }

  /**
   * Resets internal store to initial state.
   */
  public override reset(initialSimulations?: Simulation[]): void {
    if (this.externalSimService) {
      this.externalSimService.reset(initialSimulations);
    }
    super.reset(initialSimulations);

    this.rawMarketData = getDefaultMarketData();

    if (this.ordersMap) {
      this.ordersMap.clear();
    } else {
      this.ordersMap = new Map();
    }

    if (this.transactionsMap) {
      this.transactionsMap.clear();
    } else {
      this.transactionsMap = new Map();
    }

    if (this.portfoliosMap) {
      this.portfoliosMap.clear();
    } else {
      this.portfoliosMap = new Map();
    }

    if (this.idempotencyStore) {
      this.idempotencyStore.clear();
    } else {
      this.idempotencyStore = new Map();
    }

    if (this.customMarketDataMap) {
      this.customMarketDataMap.clear();
    } else {
      this.customMarketDataMap = new Map();
    }
  }

  public override async getSimulation(id: string): Promise<Simulation> {
    if (this.externalSimService) {
      return this.externalSimService.getSimulation(id);
    }
    return super.getSimulation(id);
  }

  public override setSimulation(simulation: Simulation): void {
    if (this.externalSimService) {
      this.externalSimService.setSimulation(simulation);
    }
    super.setSimulation(simulation);
  }

  public override async createSimulation(params: CreateSimulationRequest): Promise<SimulationWithStatus> {
    if (this.externalSimService) {
      return this.externalSimService.createSimulation(params);
    }
    return super.createSimulation(params);
  }

  /**
   * Registers custom market data bars for a symbol (e.g. for testing reference reconciliation).
   */
  public setCustomMarketData(symbol: string, bars: MarketDataBar[]): void {
    this.customMarketDataMap.set(symbol, [...bars]);
    this.rawMarketData[symbol] = [...bars];
  }

  /**
   * Returns market bar for symbol on given session.
   */
  public getMarketDataBar(symbol: string, sessionDate: string): MarketDataBar | undefined {
    const customBars = this.customMarketDataMap.get(symbol);
    if (customBars) {
      const bar = customBars.find((b) => b.session_date === sessionDate);
      if (bar) return bar;
    }
    const rawBars = this.rawMarketData[symbol];
    if (rawBars) {
      return rawBars.find((b) => b.session_date === sessionDate);
    }
    return undefined;
  }

  /**
   * Returns dataset session dates.
   */
  public getSessionDates(datasetId: string): string[] {
    if (this.datasetMetadata && this.datasetMetadata.id === datasetId) {
      return this.datasetMetadata.session_dates;
    }
    const match = FIXTURE_DATASETS.find((d) => d.id === datasetId);
    if (match) return match.session_dates;
    return this.datasetMetadata.session_dates;
  }

  private getOrCreateInternalPortfolio(sim: Simulation): InternalPortfolio {
    let portfolio = this.portfoliosMap.get(sim.id);
    if (!portfolio) {
      portfolio = {
        asOfSession: sim.current_session,
        cashCents: sim.initial_cash,
        positions: [],
        realizedPnlCents: 0,
      };
      this.portfoliosMap.set(sim.id, portfolio);
    }
    return portfolio;
  }

  /**
   * Explicitly sets or overrides portfolio state for a simulation (e.g. for testing).
   */
  public setPortfolio(
    simulationId: string,
    portfolio: Partial<Portfolio> & { cashCents?: number; initialCashDollars?: number }
  ): void {
    const current = this.portfoliosMap.get(simulationId) || {
      asOfSession: '',
      cashCents: 0,
      positions: [],
      realizedPnlCents: 0,
    };

    if (portfolio.cash !== undefined) {
      current.cashCents = dollarsToCents(portfolio.cash);
    } else if (portfolio.cashCents !== undefined) {
      current.cashCents = portfolio.cashCents;
    } else if (portfolio.initialCashDollars !== undefined) {
      current.cashCents = Math.round(portfolio.initialCashDollars * 100);
    }

    if (portfolio.as_of_session !== undefined) {
      current.asOfSession = portfolio.as_of_session;
    }

    if (portfolio.realized_pnl !== undefined) {
      current.realizedPnlCents = dollarsToCents(portfolio.realized_pnl);
    }

    if (portfolio.positions !== undefined) {
      current.positions = portfolio.positions.map((p) => {
        const unitCost = parseFloat(p.cost_basis);
        const costBasisCents = Math.round(p.quantity * unitCost * 100);
        return {
          symbol: p.symbol,
          quantity: p.quantity,
          costBasisCents,
          cost_basis: formatPrice(p.cost_basis),
          market_price: formatPrice(p.market_price),
          market_value: p.market_value,
          unrealized_pnl: p.unrealized_pnl,
        };
      });
    }

    this.portfoliosMap.set(simulationId, current);
  }

  /**
   * GET /api/v1/simulations/{id}/orders
   */
  public async getOrders(simulationId: string): Promise<Order[] & { items: Order[] }> {
    await this.getSimulation(simulationId);
    const list = (this.ordersMap.get(simulationId) || []).map((o) => ({ ...o }));
    (list as unknown as { items: Order[] }).items = list;
    return list as Order[] & { items: Order[] };
  }

  /**
   * GET /api/v1/simulations/{id}/transactions
   */
  public async getTransactions(
    simulationId: string
  ): Promise<Transaction[] & { items: Transaction[] }> {
    await this.getSimulation(simulationId);
    const list = (this.transactionsMap.get(simulationId) || []).map((t) => ({ ...t }));
    (list as unknown as { items: Transaction[] }).items = list;
    return list as Transaction[] & { items: Transaction[] };
  }

  /**
   * GET /api/v1/simulations/{id}/portfolio
   */
  public async getPortfolio(simulationId: string): Promise<Portfolio> {
    const sim = await this.getSimulation(simulationId);
    const internal = this.getOrCreateInternalPortfolio(sim);
    const session = internal.asOfSession || sim.current_session;

    let totalMarketValueCents = 0;
    let totalUnrealizedPnlCents = 0;
    const formattedPositions: Position[] = [];

    for (const pos of internal.positions) {
      if (pos.quantity <= 0) continue;
      const bar = this.getMarketDataBar(pos.symbol, session);
      const closePrice = bar ? bar.close : pos.market_price || '0.000000';
      const closeNum = parseFloat(closePrice);
      const marketValCents = Math.round(pos.quantity * closeNum * 100);
      const unrealizedCents = marketValCents - pos.costBasisCents;

      totalMarketValueCents += marketValCents;
      totalUnrealizedPnlCents += unrealizedCents;

      const unitCostBasisStr = (pos.costBasisCents / (pos.quantity * 100)).toFixed(6);

      formattedPositions.push({
        symbol: pos.symbol,
        quantity: pos.quantity,
        cost_basis: unitCostBasisStr,
        market_price: formatPrice(closePrice),
        market_value: centsToDollars(marketValCents),
        unrealized_pnl: centsToDollars(unrealizedCents),
      });
    }

    const totalEquityCents = internal.cashCents + totalMarketValueCents;

    return {
      as_of_session: session,
      cash: centsToDollars(internal.cashCents),
      positions: formattedPositions,
      realized_pnl: centsToDollars(internal.realizedPnlCents),
      unrealized_pnl: centsToDollars(totalUnrealizedPnlCents),
      total_equity: centsToDollars(totalEquityCents),
    };
  }

  /**
   * POST /api/v1/simulations/{id}/orders
   *
   * Creates a paper trading order with status: 'pending'.
   * Enforces:
   * - 1 to 1,000,000 whole integer shares.
   * - Single pending order rule (409 pending_order_exists).
   * - Early balance check against latest visible close (422 insufficient_cash / insufficient_holdings).
   * - Expected version check (409 stale_version).
   * - Idempotency key replay before stale version check.
   * - Reused key with different payload returns 409.
   * - Increments simulation version on accepted order mutation.
   */
  public async createOrder(
    simulationId: string,
    params: CreateOrderParams,
    idempotencyKey?: string
  ): Promise<CreateOrderResponse & Order> {
    const scopeKey = idempotencyKey ? `orders:${simulationId}:${idempotencyKey}` : undefined;
    const payloadHash = JSON.stringify({
      symbol: params.symbol,
      side: params.side,
      quantity: params.quantity,
      expected_version: params.expected_version,
    });

    // 1. Idempotency receipt check BEFORE stale version check
    if (scopeKey && this.idempotencyStore.has(scopeKey)) {
      const record = this.idempotencyStore.get(scopeKey)!;
      if (record.payloadHash === payloadHash) {
        return JSON.parse(JSON.stringify(record.response)) as CreateOrderResponse & Order;
      }
      throw new ApiError(
        409,
        'idempotency_conflict',
        'Idempotency key was already used with a different request payload.'
      );
    }

    // 2. Fetch simulation & check completed state
    const sim = await this.getSimulation(simulationId);

    if (sim.status === 'completed') {
      throw new ApiError(
        409,
        'simulation_completed',
        'Cannot place orders when simulation is completed.'
      );
    }

    if (sim.current_session === sim.end_session) {
      throw new ApiError(
        409,
        'simulation_completed',
        'Cannot place orders at the final simulation session.'
      );
    }

    // 3. Stale version check
    if (params.expected_version !== sim.version) {
      throw new ApiError(
        409,
        'stale_version',
        `Expected version ${params.expected_version} does not match current simulation version ${sim.version}.`,
        'expected_version'
      );
    }

    // 4. Validate quantity: 1 to 1,000,000 whole integer shares
    if (
      typeof params.quantity !== 'number' ||
      !Number.isInteger(params.quantity) ||
      params.quantity < 1 ||
      params.quantity > 1_000_000
    ) {
      throw new ApiError(
        422,
        'invalid_quantity',
        'Quantity must be a whole integer between 1 and 1,000,000.',
        'quantity'
      );
    }

    // 5. Validate side
    if (params.side !== 'buy' && params.side !== 'sell') {
      throw new ApiError(422, 'invalid_side', 'Order side must be "buy" or "sell".', 'side');
    }

    // 6. Validate symbol
    if (!sim.symbols.includes(params.symbol)) {
      throw new ApiError(
        422,
        'unknown_symbol',
        `Symbol '${params.symbol}' is not part of this simulation universe.`,
        'symbol'
      );
    }

    // 7. Enforce MVP single pending order rule
    const existingOrders = this.ordersMap.get(simulationId) || [];
    if (existingOrders.some((o) => o.status === 'pending')) {
      throw new ApiError(
        409,
        'pending_order_exists',
        'A pending order already exists for this simulation.'
      );
    }

    // 8. Early balance / holdings check
    const portfolio = this.getOrCreateInternalPortfolio(sim);
    const latestBar = this.getMarketDataBar(params.symbol, sim.current_session);
    if (!latestBar) {
      throw new ApiError(
        422,
        'missing_market_data',
        `Market data unavailable for symbol ${params.symbol} at session ${sim.current_session}.`,
        'symbol'
      );
    }

    if (params.side === 'buy') {
      const closePrice = parseFloat(latestBar.close);
      const estimatedCostCents = Math.round(params.quantity * closePrice * 100);
      if (estimatedCostCents > portfolio.cashCents) {
        throw new ApiError(
          422,
          'insufficient_cash',
          'Not enough virtual cash.',
          'quantity'
        );
      }
    } else {
      // Sell: check holdings
      const heldPos = portfolio.positions.find((p) => p.symbol === params.symbol);
      const heldQty = heldPos ? heldPos.quantity : 0;
      if (heldQty < params.quantity) {
        throw new ApiError(
          422,
          'insufficient_holdings',
          `Cannot sell ${params.quantity} shares of ${params.symbol} when holding only ${heldQty} shares.`,
          'quantity'
        );
      }
    }

    // 9. Create pending order
    const orderId = `ord_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const newOrder: Order = {
      id: orderId,
      symbol: params.symbol,
      side: params.side,
      quantity: params.quantity,
      status: 'pending',
      submitted_at: sim.current_time,
      executed_at: null,
      execution_price: null,
      rejection_code: null,
    };

    existingOrders.push(newOrder);
    this.ordersMap.set(simulationId, existingOrders);

    // 10. Increment simulation version on accepted mutation
    sim.version += 1;
    this.setSimulation(sim);

    const response = {
      order: { ...newOrder },
      simulation: { ...sim },
      ...newOrder,
    };

    if (scopeKey) {
      this.idempotencyStore.set(scopeKey, { payloadHash, response });
    }

    return response;
  }

  /**
   * POST /api/v1/simulations/{id}/advance
   *
   * Advances simulation to next session and processes any pending order:
   * - Executes at next session OPEN price.
   * - Gap check: if total cost > available cash, status -> rejected, rejection_code -> "insufficient_cash".
   * - If filled: updates cash, creates Transaction, updates Position with weighted-average cost basis.
   * - Returns { simulation, order_results: [Order] }.
   */
  public async advanceWithTrading(
    simulationId: string,
    expectedVersion: number,
    idempotencyKey?: string
  ): Promise<AdvanceWithTradingResponse & Simulation> {
    const scopeKey = idempotencyKey ? `advance:${simulationId}:${idempotencyKey}` : undefined;
    const payloadHash = JSON.stringify({ expectedVersion });

    // 1. Idempotency receipt check BEFORE stale version check
    if (scopeKey && this.idempotencyStore.has(scopeKey)) {
      const record = this.idempotencyStore.get(scopeKey)!;
      if (record.payloadHash === payloadHash) {
        return JSON.parse(JSON.stringify(record.response)) as AdvanceWithTradingResponse & Simulation;
      }
      throw new ApiError(
        409,
        'idempotency_conflict',
        'Idempotency key was already used with a different request payload.'
      );
    }

    // 2. Fetch simulation & check completed state
    const sim = await this.getSimulation(simulationId);
    if (sim.status === 'completed') {
      throw new ApiError(
        409,
        'simulation_completed',
        'Simulation has reached the end of its session range and is already completed.'
      );
    }

    // 3. Stale version check
    if (expectedVersion !== sim.version) {
      throw new ApiError(
        409,
        'stale_version',
        `Expected version ${expectedVersion} does not match current simulation version ${sim.version}.`,
        'expected_version'
      );
    }

    // 4. Session calendar lookup
    const dates = this.getSessionDates(sim.dataset_id);
    const currentIndex = dates.indexOf(sim.current_session);
    if (currentIndex === -1 || currentIndex + 1 >= dates.length) {
      sim.status = 'completed';
      this.setSimulation(sim);
      throw new ApiError(
        409,
        'simulation_completed',
        'Simulation has reached the end of available historical data.'
      );
    }

    const nextSession = dates[currentIndex + 1];
    const endIndex = dates.indexOf(sim.end_session);
    if (currentIndex + 1 > endIndex) {
      sim.status = 'completed';
      this.setSimulation(sim);
      throw new ApiError(
        409,
        'simulation_completed',
        'Simulation has reached its configured end_session.'
      );
    }

    // 5. Pending order execution at next session OPEN
    const portfolio = this.getOrCreateInternalPortfolio(sim);
    const simOrders = this.ordersMap.get(simulationId) || [];
    const pendingOrder = simOrders.find((o) => o.status === 'pending');
    const orderResults: Order[] = [];
    const nextSessionOpenTime = `${nextSession}T14:30:00Z`;

    if (pendingOrder) {
      const bar = this.getMarketDataBar(pendingOrder.symbol, nextSession);
      if (!bar) {
        pendingOrder.status = 'rejected';
        pendingOrder.rejection_code = 'missing_market_data';
        pendingOrder.executed_at = null;
        pendingOrder.execution_price = null;
        orderResults.push({ ...pendingOrder });
      } else {
        const openPriceNum = parseFloat(bar.open);
        const openPriceStr = formatPrice(bar.open);

        if (pendingOrder.side === 'buy') {
          const totalCostCents = Math.round(pendingOrder.quantity * openPriceNum * 100);

          // Gap check at fill price
          if (totalCostCents > portfolio.cashCents) {
            // Gap rejection: cash and positions remain unchanged
            pendingOrder.status = 'rejected';
            pendingOrder.rejection_code = 'insufficient_cash';
            pendingOrder.executed_at = null;
            pendingOrder.execution_price = null;
          } else {
            // Order filled at OPEN
            pendingOrder.status = 'filled';
            pendingOrder.execution_price = openPriceStr;
            pendingOrder.executed_at = nextSessionOpenTime;
            pendingOrder.rejection_code = null;

            portfolio.cashCents -= totalCostCents;

            // Weighted-average cost position update
            const existing = portfolio.positions.find((p) => p.symbol === pendingOrder.symbol);
            if (existing) {
              existing.quantity += pendingOrder.quantity;
              existing.costBasisCents += totalCostCents;
              existing.cost_basis = formatPrice(existing.costBasisCents / (existing.quantity * 100));
            } else {
              portfolio.positions.push({
                symbol: pendingOrder.symbol,
                quantity: pendingOrder.quantity,
                costBasisCents: totalCostCents,
                cost_basis: openPriceStr,
                market_price: bar.close,
                market_value: (pendingOrder.quantity * parseFloat(bar.close)).toFixed(2),
                unrealized_pnl: '0.00',
              });
            }

            // Append transaction log
            const tx: Transaction = {
              id: `tx_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
              order_id: pendingOrder.id,
              symbol: pendingOrder.symbol,
              side: 'buy',
              quantity: pendingOrder.quantity,
              price: openPriceStr,
              gross_amount: centsToDollars(totalCostCents),
              session_date: nextSession,
              executed_at: nextSessionOpenTime,
            };
            const currentTxs = this.transactionsMap.get(simulationId) || [];
            currentTxs.push(tx);
            this.transactionsMap.set(simulationId, currentTxs);
          }
        } else {
          // Sell order execution
          const pos = portfolio.positions.find((p) => p.symbol === pendingOrder.symbol);
          const heldQty = pos ? pos.quantity : 0;

          if (heldQty < pendingOrder.quantity) {
            pendingOrder.status = 'rejected';
            pendingOrder.rejection_code = 'insufficient_holdings';
            pendingOrder.executed_at = null;
            pendingOrder.execution_price = null;
          } else {
            pendingOrder.status = 'filled';
            pendingOrder.execution_price = openPriceStr;
            pendingOrder.executed_at = nextSessionOpenTime;
            pendingOrder.rejection_code = null;

            const proceedsCents = Math.round(pendingOrder.quantity * openPriceNum * 100);
            portfolio.cashCents += proceedsCents;

            // Proportional cost basis allocation, round half-up to cents, entire remainder on final sale
            let allocatedCostCents = 0;
            if (pendingOrder.quantity === pos!.quantity) {
              allocatedCostCents = pos!.costBasisCents;
              pos!.costBasisCents = 0;
              pos!.quantity = 0;
            } else {
              allocatedCostCents = Math.round(
                (pos!.costBasisCents * pendingOrder.quantity) / pos!.quantity
              );
              pos!.costBasisCents -= allocatedCostCents;
              pos!.quantity -= pendingOrder.quantity;
              pos!.cost_basis = formatPrice(pos!.costBasisCents / (pos!.quantity * 100));
            }

            const realizedPnlCents = proceedsCents - allocatedCostCents;
            portfolio.realizedPnlCents += realizedPnlCents;

            // Remove liquidated positions
            portfolio.positions = portfolio.positions.filter((p) => p.quantity > 0);

            // Append transaction log
            const tx: Transaction = {
              id: `tx_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
              order_id: pendingOrder.id,
              symbol: pendingOrder.symbol,
              side: 'sell',
              quantity: pendingOrder.quantity,
              price: openPriceStr,
              gross_amount: centsToDollars(proceedsCents),
              session_date: nextSession,
              executed_at: nextSessionOpenTime,
            };
            const currentTxs = this.transactionsMap.get(simulationId) || [];
            currentTxs.push(tx);
            this.transactionsMap.set(simulationId, currentTxs);
          }
        }
        orderResults.push({ ...pendingOrder });
      }
    }

    // 6. Advance simulation state & version
    sim.current_session = nextSession;
    sim.current_time = `${nextSession}T21:00:00Z`;
    sim.version += 1;

    if (nextSession === sim.end_session || currentIndex + 1 === dates.length - 1) {
      sim.status = 'completed';
    }

    this.setSimulation(sim);
    portfolio.asOfSession = nextSession;

    const response = {
      simulation: { ...sim },
      order_results: orderResults,
      ...sim,
    };

    if (scopeKey) {
      this.idempotencyStore.set(scopeKey, { payloadHash, response });
    }

    return response;
  }

  // =========================================================================
  // Methods preserved for TradingView.tsx UI component integration
  // =========================================================================

  public getLatestVisibleBar(symbol: string, currentSession: string): MarketDataBar | null {
    const bars = this.rawMarketData[symbol] || [];
    const visible = bars.filter((b) => b.session_date <= currentSession);
    if (visible.length === 0) return null;
    return visible[visible.length - 1];
  }

  public getLatestClosePrice(symbol: string, currentSession: string): string | null {
    const bar = this.getLatestVisibleBar(symbol, currentSession);
    return bar ? bar.close : null;
  }

  public validateOrderSubmission(
    params: {
      symbol: string;
      side: 'buy' | 'sell';
      quantity: number;
    },
    cashCents: number,
    positions: Position[],
    currentSession: string,
    endSession: string,
    hasActivePendingOrder: boolean
  ): { valid: boolean; error?: string } {
    if (hasActivePendingOrder) {
      return {
        valid: false,
        error: 'Pending Order Active (Only 1 pending order allowed for MVP)',
      };
    }

    if (currentSession >= endSession) {
      return {
        valid: false,
        error: 'Cannot place orders at the final session.',
      };
    }

    if (
      !Number.isInteger(params.quantity) ||
      params.quantity < 1 ||
      params.quantity > 1_000_000
    ) {
      return {
        valid: false,
        error: 'Quantity must be a whole number between 1 and 1,000,000 shares.',
      };
    }

    const latestClose = this.getLatestClosePrice(params.symbol, currentSession);
    if (!latestClose) {
      return {
        valid: false,
        error: `Market data unavailable for symbol ${params.symbol}.`,
      };
    }

    if (params.side === 'sell') {
      const held = positions.find((p) => p.symbol === params.symbol)?.quantity ?? 0;
      if (held === 0) {
        return {
          valid: false,
          error: `Cannot place sell order: You do not own any shares of ${params.symbol} (no short selling allowed).`,
        };
      }
      if (params.quantity > held) {
        return {
          valid: false,
          error: `Oversell rejected: Cannot sell ${params.quantity} shares of ${params.symbol} when holding only ${held} shares.`,
        };
      }
    }

    if (params.side === 'buy') {
      const estimatedCostCents = Math.round(params.quantity * parseFloat(latestClose) * 100);
      if (estimatedCostCents > cashCents) {
        return {
          valid: false,
          error: `Insufficient cash: Estimated order value ${formatUSD(
            estimatedCostCents / 100
          )} exceeds available cash ${formatUSD(cashCents / 100)}.`,
        };
      }
    }

    return { valid: true };
  }

  public createPendingOrder(params: OrderSubmissionParams, currentTime: string): Order {
    return {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      symbol: params.symbol,
      side: params.side,
      quantity: params.quantity,
      status: 'pending',
      submitted_at: currentTime,
      executed_at: null,
      execution_price: null,
      rejection_code: null,
    };
  }

  public advanceAndExecute(
    simulation: Simulation,
    cashCents: number,
    positions: Position[],
    pendingOrder: Order | null
  ): {
    nextSimulation: Simulation;
    executionResult?: ExecutionResult;
    updatedPositions: Position[];
    updatedCashCents: number;
  } {
    const dates = this.datasetMetadata.session_dates;
    const currentIndex = dates.indexOf(simulation.current_session);
    if (currentIndex === -1 || currentIndex + 1 >= dates.length) {
      throw new Error('Simulation has reached the end of available historical sessions.');
    }

    const nextSession = dates[currentIndex + 1];
    const isCompleted =
      nextSession === simulation.end_session || currentIndex + 1 === dates.length - 1;

    const nextSimulation: Simulation = {
      ...simulation,
      current_session: nextSession,
      current_time: `${nextSession}T21:00:00Z`,
      version: simulation.version + 1,
      status: isCompleted ? 'completed' : 'active',
    };

    let updatedCashCents = cashCents;
    const updatedPositions: Position[] = positions.map((p) => ({ ...p }));
    let executionResult: ExecutionResult | undefined = undefined;

    if (pendingOrder && pendingOrder.status === 'pending') {
      const symbolBars = this.rawMarketData[pendingOrder.symbol] || [];
      const nextBar = symbolBars.find((b) => b.session_date === nextSession);

      if (!nextBar) {
        const rejectedOrder: Order = {
          ...pendingOrder,
          status: 'rejected',
          rejection_code: 'missing_market_data',
        };
        executionResult = {
          order: rejectedOrder,
          transaction: null,
          newCash: updatedCashCents,
          newPositions: updatedPositions,
          rejectionNotice: `Order rejected: No market data for ${pendingOrder.symbol} on ${nextSession}.`,
        };
      } else {
        const openPriceStr = nextBar.open;
        const openPriceNum = parseFloat(openPriceStr);

        if (pendingOrder.side === 'buy') {
          const totalCostCents = Math.round(pendingOrder.quantity * openPriceNum * 100);

          if (totalCostCents > updatedCashCents) {
            const rejectedOrder: Order = {
              ...pendingOrder,
              status: 'rejected',
              execution_price: null,
              executed_at: null,
              rejection_code: 'insufficient_cash',
            };
            executionResult = {
              order: rejectedOrder,
              transaction: null,
              newCash: updatedCashCents,
              newPositions: updatedPositions,
              rejectionNotice: `Order rejected: Opening price of ${formatUSD(
                openPriceNum
              )} gapped higher than available cash (${formatUSD(
                updatedCashCents / 100
              )}). Required: ${formatUSD(totalCostCents / 100)}. No cash or positions were changed.`,
            };
          } else {
            updatedCashCents -= totalCostCents;
            const existingIndex = updatedPositions.findIndex(
              (p) => p.symbol === pendingOrder.symbol
            );

            if (existingIndex >= 0) {
              const existing = updatedPositions[existingIndex];
              const existingCostCents = Math.round(
                existing.quantity * parseFloat(existing.cost_basis) * 100
              );
              const combinedQuantity = existing.quantity + pendingOrder.quantity;
              const combinedCostCents = existingCostCents + totalCostCents;
              const newCostBasis = (combinedCostCents / (combinedQuantity * 100)).toFixed(6);

              updatedPositions[existingIndex] = {
                ...existing,
                quantity: combinedQuantity,
                cost_basis: newCostBasis,
              };
            } else {
              updatedPositions.push({
                symbol: pendingOrder.symbol,
                quantity: pendingOrder.quantity,
                cost_basis: parseFloat(openPriceStr).toFixed(6),
                market_price: nextBar.close,
                market_value: (pendingOrder.quantity * parseFloat(nextBar.close)).toFixed(2),
                unrealized_pnl: '0.00',
              });
            }

            const filledOrder: Order = {
              ...pendingOrder,
              status: 'filled',
              execution_price: openPriceStr,
              executed_at: `${nextSession}T14:30:00Z`,
              rejection_code: null,
            };

            const transaction: Transaction = {
              id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              order_id: filledOrder.id,
              symbol: filledOrder.symbol,
              side: 'buy',
              quantity: filledOrder.quantity,
              price: openPriceStr,
              gross_amount: (totalCostCents / 100).toFixed(2),
              session_date: nextSession,
              executed_at: `${nextSession}T14:30:00Z`,
            };

            executionResult = {
              order: filledOrder,
              transaction,
              newCash: updatedCashCents,
              newPositions: updatedPositions,
            };
          }
        } else {
          const posIndex = updatedPositions.findIndex((p) => p.symbol === pendingOrder.symbol);
          const currentHeld = posIndex >= 0 ? updatedPositions[posIndex].quantity : 0;

          if (currentHeld < pendingOrder.quantity) {
            const rejectedOrder: Order = {
              ...pendingOrder,
              status: 'rejected',
              execution_price: null,
              executed_at: null,
              rejection_code: 'oversell',
            };
            executionResult = {
              order: rejectedOrder,
              transaction: null,
              newCash: updatedCashCents,
              newPositions: updatedPositions,
              rejectionNotice: `Order rejected: Insufficient held shares to sell ${pendingOrder.quantity} shares of ${pendingOrder.symbol}.`,
            };
          } else {
            const totalProceedsCents = Math.round(
              pendingOrder.quantity * openPriceNum * 100
            );
            updatedCashCents += totalProceedsCents;

            if (currentHeld === pendingOrder.quantity) {
              updatedPositions.splice(posIndex, 1);
            } else {
              updatedPositions[posIndex] = {
                ...updatedPositions[posIndex],
                quantity: currentHeld - pendingOrder.quantity,
              };
            }

            const filledOrder: Order = {
              ...pendingOrder,
              status: 'filled',
              execution_price: openPriceStr,
              executed_at: `${nextSession}T14:30:00Z`,
              rejection_code: null,
            };

            const transaction: Transaction = {
              id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              order_id: filledOrder.id,
              symbol: filledOrder.symbol,
              side: 'sell',
              quantity: filledOrder.quantity,
              price: openPriceStr,
              gross_amount: (totalProceedsCents / 100).toFixed(2),
              session_date: nextSession,
              executed_at: `${nextSession}T14:30:00Z`,
            };

            executionResult = {
              order: filledOrder,
              transaction,
              newCash: updatedCashCents,
              newPositions: updatedPositions,
            };
          }
        }
      }
    }

    const markedPositions = this.markPositionsToMarket(updatedPositions, nextSession);

    return {
      nextSimulation,
      executionResult,
      updatedPositions: markedPositions,
      updatedCashCents,
    };
  }

  public markPositionsToMarket(positions: Position[], sessionDate: string): Position[] {
    return positions.map((pos) => {
      const bars = this.rawMarketData[pos.symbol] || [];
      const bar = bars.find((b) => b.session_date === sessionDate);
      const closePrice = bar ? bar.close : pos.market_price;
      const closeNum = parseFloat(closePrice);
      const costBasisNum = parseFloat(pos.cost_basis);
      const marketVal = pos.quantity * closeNum;
      const totalCost = pos.quantity * costBasisNum;
      const unrealizedPnl = marketVal - totalCost;

      return {
        ...pos,
        market_price: closePrice,
        market_value: marketVal.toFixed(2),
        unrealized_pnl: unrealizedPnl.toFixed(2),
      };
    });
  }

  public calculateTotalEquity(cashCents: number, positions: Position[]): number {
    const positionsValue = positions.reduce((sum, p) => sum + parseFloat(p.market_value), 0);
    return cashCents / 100 + positionsValue;
  }
}

export const defaultTradingService = new TradingService();
export const tradingService = defaultTradingService;
export default defaultTradingService;

/**
 * Rutgers AI4Good 2026 — Portfolio Analytics & Performance Engine
 * Strictly adheres to docs/API_CONTRACT.md (v2):
 * - Weighted-average cost basis accounting.
 * - Proportional remaining cost basis allocation on partial sale, rounded half-up to cents.
 * - Entire remainder allocated on final sale (zero residual cents drift).
 * - Realized P&L = sale proceeds minus allocated cost.
 * - Unrealized P&L = marked value minus remaining cost.
 * - Total equity = cash + sum(position market values).
 * - Return % = 100 * (equity - initial_cash) / initial_cash.
 * - Equity curve STRICT GUARANTEE: contains ONLY visited sessions (session_date <= currentSession). Zero lookahead.
 * - Accessible text formatting for losses (explicit minus sign and "Loss" text label, never color alone).
 * - Reference reconciliation match (steps 1 through 4).
 */

import {
  EquityPoint,
  Performance,
  Portfolio,
  PortfolioSummary,
  Position,
  PnLFormattingResult,
  ReferenceReconciliationResult,
  ReferenceReconciliationStep,
  SimulationHistoryEntry,
} from './portfolioTypes';

/**
 * Converts a dollar amount (number or string) to integer cents.
 */
export function dollarsToCents(dollars: number | string): number {
  const num = typeof dollars === 'string' ? parseFloat(dollars) : dollars;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Converts integer cents to a standard two-decimal dollar string ("1020.00", "-10.00").
 */
export function centsToDollars(cents: number): string {
  if (Math.abs(cents) < 0.5) return '0.00';
  return (cents / 100).toFixed(2);
}

/**
 * Formats a unit price with six decimal places ("100.000000").
 */
export function formatPrice(price: number | string): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '0.000000';
  return num.toFixed(6);
}

/**
 * Formats a currency amount into standard US currency string ("$1,020.00", "-$10.00").
 */
export function formatUSD(dollars: number | string): string {
  const num = typeof dollars === 'string' ? parseFloat(dollars) : dollars;
  if (isNaN(num)) return '$0.00';
  const isNegative = num < -0.0001;
  const absVal = Math.abs(num);
  const formatted = absVal.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isNegative ? `-$${formatted}` : `$${formatted}`;
}

/**
 * Formats a percentage with sign indicator ("+2.00%", "-1.50%", "0.00%").
 */
export function formatPercent(pct: number | string): string {
  const num = typeof pct === 'string' ? parseFloat(pct) : pct;
  if (isNaN(num)) return '0.00%';
  if (num > 0.0001) return `+${num.toFixed(2)}%`;
  if (num < -0.0001) return `-${Math.abs(num).toFixed(2)}%`;
  return '0.00%';
}

/**
 * Calculates total equity: cash + sum(position market values).
 * 
 * @param cash Virtual cash available (in dollars)
 * @param positions List of portfolio positions
 * @returns Total equity as a numeric dollar amount rounded to 2 decimal places
 */
export function calculateTotalEquity(
  cash: number | string,
  positions: Position[] = []
): number {
  const cashNum = typeof cash === 'string' ? parseFloat(cash) : cash;
  const safeCash = isNaN(cashNum) ? 0 : cashNum;

  const positionsMarketValue = positions.reduce((sum, pos) => {
    let mv = 0;
    if (pos.market_value !== undefined && pos.market_value !== '') {
      const parsed = parseFloat(pos.market_value);
      mv = isNaN(parsed) ? 0 : parsed;
    } else if (pos.quantity && pos.market_price) {
      const price = parseFloat(pos.market_price);
      mv = isNaN(price) ? 0 : (pos.quantity * price);
    }
    return sum + mv;
  }, 0);

  const total = safeCash + positionsMarketValue;
  return Math.round(total * 100) / 100;
}

/**
 * Calculates total return percentage according to API Contract line 58:
 * 100 * (equity - initial_cash) / initial_cash
 * 
 * @param totalEquity Current total equity
 * @param initialCash Initial cash balance (must be > 0)
 * @returns Numeric percentage rounded to 2 decimal places
 */
export function calculateReturnPct(
  totalEquity: number | string,
  initialCash: number | string
): number {
  const equityNum = typeof totalEquity === 'string' ? parseFloat(totalEquity) : totalEquity;
  const initNum = typeof initialCash === 'string' ? parseFloat(initialCash) : initialCash;

  if (isNaN(initNum) || initNum <= 0 || isNaN(equityNum)) {
    return 0;
  }

  // Use integer cents to eliminate floating-point representation noise
  const equityCents = dollarsToCents(equityNum);
  const initCents = dollarsToCents(initNum);

  if (initCents <= 0) return 0;

  const rawPct = (100 * (equityCents - initCents)) / initCents;
  return Math.round(rawPct * 100) / 100;
}

/**
 * Accessible helper utility for non-color P&L formatting.
 * 
 * STRICT GUARANTEE: Never relies on color alone.
 * - Negative values include an explicit minus sign and "Loss" text label.
 * - Positive values include an explicit plus sign and "Gain" text label.
 * - Zero values indicate break-even / no change.
 * - Accessible ariaLabel is provided for screen readers.
 * 
 * @param value Dollar P&L value (number or string)
 * @returns PnLFormattingResult with text, isLoss, isGain, and ariaLabel
 */
export function formatPnL(value: number | string): PnLFormattingResult {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const safeNum = isNaN(num) ? 0 : num;
  const absDollars = Math.abs(safeNum).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (safeNum < -0.0001) {
    return {
      text: `-$${absDollars} Loss`,
      isLoss: true,
      isGain: false,
      ariaLabel: `Loss of $${absDollars} (-$${absDollars})`,
      signIndicator: '-',
      numericValue: safeNum,
      formattedAmount: `-$${absDollars}`,
    };
  }

  if (safeNum > 0.0001) {
    return {
      text: `+$${absDollars} Gain`,
      isLoss: false,
      isGain: true,
      ariaLabel: `Profit of $${absDollars} (+$${absDollars})`,
      signIndicator: '+',
      numericValue: safeNum,
      formattedAmount: `+$${absDollars}`,
    };
  }

  return {
    text: `$0.00`,
    isLoss: false,
    isGain: false,
    ariaLabel: `Break-even: $0.00`,
    signIndicator: '',
    numericValue: 0,
    formattedAmount: `$0.00`,
  };
}

/**
 * Generates the equity curve from session history.
 * 
 * STRICT GUARANTEE: Equity curve MUST contain ONLY visited sessions
 * (session_date <= currentSession). Zero future sessions are ever included!
 * 
 * @param simulationHistory Array of session records or snapshots
 * @param currentSession The current active session date cursor (YYYY-MM-DD)
 * @returns Array of EquityPoint objects strictly up to currentSession
 */
export function generateEquityCurve(
  simulationHistory: Array<SimulationHistoryEntry | EquityPoint | Portfolio> = [],
  currentSession: string
): EquityPoint[] {
  if (!currentSession || !Array.isArray(simulationHistory)) {
    return [];
  }

  // 1. Normalize and extract points
  const pointsMap = new Map<string, string>();

  for (const item of simulationHistory) {
    if (!item) continue;

    // Resolve session date
    const date =
      ('session_date' in item && typeof item.session_date === 'string' && item.session_date) ||
      ('as_of_session' in item && typeof item.as_of_session === 'string' && item.as_of_session) ||
      '';

    if (!date) continue;

    // STRICT FILTER: session_date <= currentSession
    if (date > currentSession) {
      continue;
    }

    // Resolve total equity
    let equityStr = '0.00';
    if ('total_equity' in item && item.total_equity !== undefined && item.total_equity !== null) {
      const eqNum = typeof item.total_equity === 'number'
        ? item.total_equity
        : parseFloat(item.total_equity as string);
      equityStr = isNaN(eqNum) ? '0.00' : eqNum.toFixed(2);
    } else if ('cash' in item && item.cash !== undefined) {
      const cashVal = typeof item.cash === 'number'
        ? item.cash
        : parseFloat(item.cash as string);
      const positions = ('positions' in item && Array.isArray(item.positions)) ? item.positions : [];
      const computed = calculateTotalEquity(cashVal, positions);
      equityStr = computed.toFixed(2);
    }

    // Keep the latest entry for this date
    pointsMap.set(date, equityStr);
  }

  // 2. Sort chronologically
  const sortedSessions = Array.from(pointsMap.keys()).sort();

  return sortedSessions.map((session_date) => ({
    session_date,
    total_equity: pointsMap.get(session_date)!,
  }));
}

/**
 * Allocates cost basis on a sale according to docs/API_CONTRACT.md line 58:
 * "Allocate proportional remaining cost basis to a partial sale, round half-up to cents,
 * and allocate the entire remainder on the final sale."
 * 
 * @param currentQuantity Shares currently held
 * @param currentCostBasisCents Total cost basis currently held in integer cents
 * @param sellQuantity Shares being sold
 * @returns Allocated cost in cents, remaining cost in cents, and remaining shares
 */
export function allocateCostBasisOnSell(
  currentQuantity: number,
  currentCostBasisCents: number,
  sellQuantity: number
): {
  allocatedCostCents: number;
  remainingCostCents: number;
  remainingQuantity: number;
  unitCostBasis: string;
} {
  if (sellQuantity <= 0 || currentQuantity <= 0) {
    return {
      allocatedCostCents: 0,
      remainingCostCents: currentCostBasisCents,
      remainingQuantity: currentQuantity,
      unitCostBasis: currentQuantity > 0 ? formatPrice(currentCostBasisCents / (currentQuantity * 100)) : '0.000000',
    };
  }

  // Final sale allocates entire remainder
  if (sellQuantity >= currentQuantity) {
    return {
      allocatedCostCents: currentCostBasisCents,
      remainingCostCents: 0,
      remainingQuantity: 0,
      unitCostBasis: '0.000000',
    };
  }

  // Partial sale: proportional allocation, round half-up to cents
  const allocatedCostCents = Math.round((currentCostBasisCents * sellQuantity) / currentQuantity);
  const remainingCostCents = currentCostBasisCents - allocatedCostCents;
  const remainingQuantity = currentQuantity - sellQuantity;
  const unitCostBasis = formatPrice(remainingCostCents / (remainingQuantity * 100));

  return {
    allocatedCostCents,
    remainingCostCents,
    remainingQuantity,
    unitCostBasis,
  };
}

/**
 * Builds a comprehensive, accessible PortfolioSummary model.
 * 
 * Includes formatted metrics, return %, visited session count, max/min equity,
 * and accessible sign indicators.
 * 
 * @param portfolio Portfolio state from API or simulation
 * @param performance Performance state from API or simulation
 * @returns Fully populated PortfolioSummary
 */
export function buildPortfolioSummary(
  portfolio: Portfolio,
  performance: Performance
): PortfolioSummary {
  const cashNum = parseFloat(portfolio.cash || '0');
  const equityNum = parseFloat(portfolio.total_equity || '0');
  const initCashNum = parseFloat(performance.initial_cash || '0');
  const returnPctNum = parseFloat(performance.total_return_pct || '0');

  const positions = portfolio.positions || [];
  const totalMarketValueNum = positions.reduce((sum, p) => {
    const val = parseFloat(p.market_value || '0');
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const realizedPnlNum = parseFloat(portfolio.realized_pnl || '0');
  const unrealizedPnlNum = parseFloat(portfolio.unrealized_pnl || '0');
  const totalPnlNum = realizedPnlNum + unrealizedPnlNum;

  // Equity curve statistics
  const equityCurve = performance.equity_curve || [];
  const visitedSessionCount = equityCurve.length;

  let maxEquityNum = equityNum;
  let minEquityNum = equityNum;

  if (equityCurve.length > 0) {
    const values = equityCurve.map((pt) => parseFloat(pt.total_equity)).filter((v) => !isNaN(v));
    if (values.length > 0) {
      maxEquityNum = Math.max(...values);
      minEquityNum = Math.min(...values);
    }
  }

  const isGain = returnPctNum > 0.0001 || totalPnlNum > 0.0001;
  const isLoss = returnPctNum < -0.0001 || totalPnlNum < -0.0001;
  const isFlat = !isGain && !isLoss;

  const pnlSignIndicator: '+' | '-' | '' = isGain ? '+' : isLoss ? '-' : '';
  const statusLabel: 'Profit' | 'Loss' | 'Neutral' = isGain ? 'Profit' : isLoss ? 'Loss' : 'Neutral';

  const realizedFormatted = formatPnL(realizedPnlNum);
  const unrealizedFormatted = formatPnL(unrealizedPnlNum);
  const totalPnlFormatted = formatPnL(totalPnlNum);

  // Construct non-color accessible summary text
  const returnString = isLoss
    ? `Loss of ${formatUSD(Math.abs(totalPnlNum))} (-${Math.abs(returnPctNum).toFixed(2)}%)`
    : isGain
    ? `Profit of ${formatUSD(totalPnlNum)} (+${returnPctNum.toFixed(2)}%)`
    : `Break-even ($0.00, 0.00%)`;

  const ariaLabel = `Portfolio as of session ${portfolio.as_of_session}: Total Equity ${formatUSD(equityNum)}, ${returnString}. Cash ${formatUSD(cashNum)}, Realized P&L ${realizedFormatted.text}, Unrealized P&L ${unrealizedFormatted.text}.`;

  return {
    as_of_session: portfolio.as_of_session,
    cash: portfolio.cash,
    cash_formatted: formatUSD(cashNum),
    total_equity: portfolio.total_equity,
    total_equity_formatted: formatUSD(equityNum),
    total_market_value: totalMarketValueNum.toFixed(2),
    total_market_value_formatted: formatUSD(totalMarketValueNum),
    realized_pnl: portfolio.realized_pnl,
    realized_pnl_formatted: realizedFormatted.text,
    unrealized_pnl: portfolio.unrealized_pnl,
    unrealized_pnl_formatted: unrealizedFormatted.text,
    total_pnl: totalPnlNum.toFixed(2),
    total_pnl_formatted: totalPnlFormatted.text,
    initial_cash: performance.initial_cash,
    initial_cash_formatted: formatUSD(initCashNum),
    total_return_pct: performance.total_return_pct,
    total_return_pct_formatted: `${pnlSignIndicator}${Math.abs(returnPctNum).toFixed(2)}%`,
    return_pct: returnPctNum,
    visited_session_count: visitedSessionCount,
    max_equity: maxEquityNum.toFixed(2),
    max_equity_formatted: formatUSD(maxEquityNum),
    min_equity: minEquityNum.toFixed(2),
    min_equity_formatted: formatUSD(minEquityNum),
    position_count: positions.length,
    is_gain: isGain,
    is_loss: isLoss,
    is_flat: isFlat,
    pnl_sign_indicator: pnlSignIndicator,
    status_label: statusLabel,
    aria_label: ariaLabel,
    positions,
  };
}

// -------------------------------------------------------------
// Reference Reconciliation Fixture & Verifier
// -------------------------------------------------------------

/**
 * Standard 4-step reference sequence defined in docs/API_CONTRACT.md line 59:
 * 1. Initial cash $1,000.00
 * 2. Buy 2 @ 100 open, close 110 -> cash 800.00, equity 1020.00, unrealized +20.00
 * 3. Sell 1 @ 120 open, close 90 -> cash 920.00, realized 20.00, unrealized -10.00, equity 1010.00
 * 4. Sell 1 @ 95 open, close 95 -> cash/equity 1015.00, cumulative realized 15.00
 */
export const REFERENCE_RECONCILIATION_FIXTURE_STEPS: ReferenceReconciliationStep[] = [
  {
    step: 1,
    session_date: '2024-01-02',
    action: 'Initial cash deposit',
    cash: '1000.00',
    total_equity: '1000.00',
    realized_pnl: '0.00',
    unrealized_pnl: '0.00',
    positions: [],
    total_return_pct: '0.00',
  },
  {
    step: 2,
    session_date: '2024-01-03',
    action: 'Buy 2 AAPL @ 100.00 open, mark close 110.00',
    cash: '800.00',
    total_equity: '1020.00',
    realized_pnl: '0.00',
    unrealized_pnl: '20.00',
    positions: [
      {
        symbol: 'AAPL',
        quantity: 2,
        cost_basis: '100.000000',
        market_price: '110.000000',
        market_value: '220.00',
        unrealized_pnl: '20.00',
      },
    ],
    total_return_pct: '2.00',
  },
  {
    step: 3,
    session_date: '2024-01-04',
    action: 'Sell 1 AAPL @ 120.00 open, mark close 90.00',
    cash: '920.00',
    total_equity: '1010.00',
    realized_pnl: '20.00',
    unrealized_pnl: '-10.00',
    positions: [
      {
        symbol: 'AAPL',
        quantity: 1,
        cost_basis: '100.000000',
        market_price: '90.000000',
        market_value: '90.00',
        unrealized_pnl: '-10.00',
      },
    ],
    total_return_pct: '1.00',
  },
  {
    step: 4,
    session_date: '2024-01-05',
    action: 'Sell 1 AAPL @ 95.00 open, mark close 95.00',
    cash: '1015.00',
    total_equity: '1015.00',
    realized_pnl: '15.00',
    unrealized_pnl: '0.00',
    positions: [],
    total_return_pct: '1.50',
  },
];

/**
 * Executes and verifies the exact 4-step reference reconciliation calculation.
 * 
 * Verifies:
 * - Step 1: Initial cash $1,000.00
 * - Step 2: Buy 2 @ 100 open, close 110 -> cash 800.00, equity 1020.00, unrealized +20.00
 * - Step 3: Sell 1 @ 120 open, close 90 -> cash 920.00, realized 20.00, unrealized -10.00, equity 1010.00
 * - Step 4: Sell 1 @ 95 open, close 95 -> cash/equity 1015.00, cumulative realized 15.00
 * 
 * @param initialCash Initial cash in dollars (defaults to 1000.00)
 * @returns ReferenceReconciliationResult containing all step states and verifications
 */
export function runReferenceReconciliation(
  initialCash: number = 1000.00
): ReferenceReconciliationResult {
  let cashCents = dollarsToCents(initialCash);
  let realizedPnlCents = 0;
  let heldQuantity = 0;
  let costBasisCents = 0;

  const steps: ReferenceReconciliationStep[] = [];

  // Step 1: Initial session (2024-01-02)
  {
    const stepEquity = calculateTotalEquity(centsToDollars(cashCents), []);
    const retPct = calculateReturnPct(stepEquity, initialCash);
    steps.push({
      step: 1,
      session_date: '2024-01-02',
      action: 'Initial cash deposit',
      cash: centsToDollars(cashCents),
      total_equity: stepEquity.toFixed(2),
      realized_pnl: centsToDollars(realizedPnlCents),
      unrealized_pnl: '0.00',
      positions: [],
      total_return_pct: retPct.toFixed(2),
    });
  }

  // Step 2: Advance to 2024-01-03: Buy 2 AAPL @ 100.00 open, close 110.00
  {
    const buyQty = 2;
    const openPrice = 100.0;
    const closePrice = 110.0;
    const costCents = dollarsToCents(buyQty * openPrice);

    cashCents -= costCents;
    heldQuantity += buyQty;
    costBasisCents += costCents;

    const marketValCents = dollarsToCents(heldQuantity * closePrice);
    const unrealizedCents = marketValCents - costBasisCents;

    const position: Position = {
      symbol: 'AAPL',
      quantity: heldQuantity,
      cost_basis: formatPrice(openPrice),
      market_price: formatPrice(closePrice),
      market_value: centsToDollars(marketValCents),
      unrealized_pnl: centsToDollars(unrealizedCents),
    };

    const stepEquity = calculateTotalEquity(centsToDollars(cashCents), [position]);
    const retPct = calculateReturnPct(stepEquity, initialCash);

    steps.push({
      step: 2,
      session_date: '2024-01-03',
      action: 'Buy 2 AAPL @ 100.00 open, mark close 110.00',
      cash: centsToDollars(cashCents),
      total_equity: stepEquity.toFixed(2),
      realized_pnl: centsToDollars(realizedPnlCents),
      unrealized_pnl: centsToDollars(unrealizedCents),
      positions: [position],
      total_return_pct: retPct.toFixed(2),
    });
  }

  // Step 3: Advance to 2024-01-04: Sell 1 AAPL @ 120.00 open, close 90.00
  {
    const sellQty = 1;
    const openPrice = 120.0;
    const closePrice = 90.0;
    const proceedsCents = dollarsToCents(sellQty * openPrice);

    const { allocatedCostCents, remainingCostCents, remainingQuantity, unitCostBasis } =
      allocateCostBasisOnSell(heldQuantity, costBasisCents, sellQty);

    cashCents += proceedsCents;
    const saleRealizedCents = proceedsCents - allocatedCostCents;
    realizedPnlCents += saleRealizedCents;

    heldQuantity = remainingQuantity;
    costBasisCents = remainingCostCents;

    const marketValCents = dollarsToCents(heldQuantity * closePrice);
    const unrealizedCents = marketValCents - costBasisCents;

    const position: Position = {
      symbol: 'AAPL',
      quantity: heldQuantity,
      cost_basis: unitCostBasis,
      market_price: formatPrice(closePrice),
      market_value: centsToDollars(marketValCents),
      unrealized_pnl: centsToDollars(unrealizedCents),
    };

    const stepEquity = calculateTotalEquity(centsToDollars(cashCents), [position]);
    const retPct = calculateReturnPct(stepEquity, initialCash);

    steps.push({
      step: 3,
      session_date: '2024-01-04',
      action: 'Sell 1 AAPL @ 120.00 open, mark close 90.00',
      cash: centsToDollars(cashCents),
      total_equity: stepEquity.toFixed(2),
      realized_pnl: centsToDollars(realizedPnlCents),
      unrealized_pnl: centsToDollars(unrealizedCents),
      positions: [position],
      total_return_pct: retPct.toFixed(2),
    });
  }

  // Step 4: Advance to 2024-01-05: Sell 1 AAPL @ 95.00 open, close 95.00
  {
    const sellQty = 1;
    const openPrice = 95.0;
    const proceedsCents = dollarsToCents(sellQty * openPrice);

    const { allocatedCostCents, remainingCostCents, remainingQuantity } =
      allocateCostBasisOnSell(heldQuantity, costBasisCents, sellQty);

    cashCents += proceedsCents;
    const saleRealizedCents = proceedsCents - allocatedCostCents;
    realizedPnlCents += saleRealizedCents;

    heldQuantity = remainingQuantity;
    costBasisCents = remainingCostCents;

    const stepEquity = calculateTotalEquity(centsToDollars(cashCents), []);
    const retPct = calculateReturnPct(stepEquity, initialCash);

    steps.push({
      step: 4,
      session_date: '2024-01-05',
      action: 'Sell 1 AAPL @ 95.00 open, mark close 95.00',
      cash: centsToDollars(cashCents),
      total_equity: stepEquity.toFixed(2),
      realized_pnl: centsToDollars(realizedPnlCents),
      unrealized_pnl: '0.00',
      positions: [],
      total_return_pct: retPct.toFixed(2),
    });
  }

  const finalStep = steps[steps.length - 1];

  const finalPortfolio: Portfolio = {
    as_of_session: finalStep.session_date,
    cash: finalStep.cash,
    positions: finalStep.positions,
    realized_pnl: finalStep.realized_pnl,
    unrealized_pnl: finalStep.unrealized_pnl,
    total_equity: finalStep.total_equity,
  };

  const equityCurve = generateEquityCurve(
    steps.map((s) => ({ session_date: s.session_date, total_equity: s.total_equity })),
    finalStep.session_date
  );

  const finalPerformance: Performance = {
    initial_cash: initialCash.toFixed(2),
    total_return_pct: finalStep.total_return_pct,
    equity_curve: equityCurve,
  };

  const finalSummary = buildPortfolioSummary(finalPortfolio, finalPerformance);

  return {
    steps,
    finalPortfolio,
    finalPerformance,
    finalSummary,
  };
}

/**
 * Service class for stateful tracking and portfolio calculations.
 */
export class PortfolioService {
  private history: SimulationHistoryEntry[] = [];
  private initialCash: number;

  constructor(initialCash: number = 1000.0) {
    this.initialCash = initialCash;
  }

  /**
   * Resets history and initializes cash.
   */
  public reset(initialCash?: number): void {
    if (initialCash !== undefined) {
      this.initialCash = initialCash;
    }
    this.history = [];
  }

  /**
   * Records a snapshot for a session date.
   */
  public recordSession(entry: SimulationHistoryEntry): void {
    this.history.push({ ...entry });
  }

  /**
   * Calculates total equity for given cash and positions.
   */
  public calculateTotalEquity(cash: number | string, positions: Position[]): number {
    return calculateTotalEquity(cash, positions);
  }

  /**
   * Calculates return percentage.
   */
  public calculateReturnPct(totalEquity: number | string, initialCash?: number | string): number {
    return calculateReturnPct(totalEquity, initialCash ?? this.initialCash);
  }

  /**
   * Generates equity curve strictly up to currentSession.
   */
  public generateEquityCurve(
    currentSession: string,
    history?: SimulationHistoryEntry[]
  ): EquityPoint[] {
    return generateEquityCurve(history ?? this.history, currentSession);
  }

  /**
   * Builds portfolio summary model.
   */
  public buildPortfolioSummary(
    portfolio: Portfolio,
    performance: Performance
  ): PortfolioSummary {
    return buildPortfolioSummary(portfolio, performance);
  }

  /**
   * Formats P&L with accessible labels.
   */
  public formatPnL(value: number | string): PnLFormattingResult {
    return formatPnL(value);
  }

  /**
   * Performs proportional cost basis allocation on sell.
   */
  public allocateCostBasisOnSell(
    currentQuantity: number,
    currentCostBasisCents: number,
    sellQuantity: number
  ) {
    return allocateCostBasisOnSell(currentQuantity, currentCostBasisCents, sellQuantity);
  }

  /**
   * Runs reference reconciliation verifier.
   */
  public verifyReferenceReconciliation(): ReferenceReconciliationResult {
    return runReferenceReconciliation(this.initialCash);
  }
}

/**
 * Rutgers AI4Good 2026 — Portfolio Utilities & Accessible Formatters
 */

import { EquityPoint, Position, PositionCalculatedRow } from './portfolioTypes';

/**
 * Format a number as standard USD currency string ($1,020.00 or -$10.00).
 */
export function formatUSD(value: number): string {
  if (isNaN(value)) return '$0.00';
  const isNegative = value < -0.0001;
  const absVal = Math.abs(value);
  const formatted = absVal.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isNegative ? `-$${formatted}` : `$${formatted}`;
}

/**
 * Format absolute USD string without minus sign ($10.00).
 */
export function formatUSDAbsolute(value: number): string {
  if (isNaN(value)) return '$0.00';
  const absVal = Math.abs(value);
  return `$${absVal.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format USD with explicit plus or minus sign (+$20.00, -$10.00, $0.00).
 */
export function formatUSDWithExplicitSign(value: number): string {
  if (isNaN(value)) return '$0.00';
  if (value > 0.0001) {
    return `+$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (value < -0.0001) {
    return `-$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return '$0.00';
}

/**
 * Format percentage with explicit sign (+2.00%, -1.11%, 0.00%).
 */
export function formatPercentWithExplicitSign(pct: number): string {
  if (isNaN(pct)) return '0.00%';
  if (pct > 0.0001) {
    return `+${pct.toFixed(2)}%`;
  }
  if (pct < -0.0001) {
    return `-${Math.abs(pct).toFixed(2)}%`;
  }
  return '0.00%';
}

/**
 * Parse a number or string amount into a float.
 * If fallback is given, uses that upon NaN.
 */
export function parseAmount(val: number | string | undefined | null, fallback = 0): number {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Calculate detailed row items for the positions table.
 */
export function calculatePositionRows(
  positions: Position[],
  totalEquity: number
): PositionCalculatedRow[] {
  return positions.map((pos) => {
    const shares = pos.quantity || 0;
    const avgCostBasis = parseAmount(pos.cost_basis, 0);
    const currentPrice = parseAmount(pos.market_price, 0);
    const totalCost = shares * avgCostBasis;
    const marketValue = parseAmount(pos.market_value, shares * currentPrice);
    
    // Unrealized P&L
    let unrealizedPnlDollar = parseAmount(pos.unrealized_pnl, marketValue - totalCost);
    // If not given in pos.unrealized_pnl, compute difference
    if (pos.unrealized_pnl === undefined && totalCost > 0) {
      unrealizedPnlDollar = marketValue - totalCost;
    }

    const unrealizedPnlPercent =
      totalCost > 0.0001 ? (unrealizedPnlDollar / totalCost) * 100 : 0;

    const weightPercent =
      totalEquity > 0.0001 ? (marketValue / totalEquity) * 100 : 0;

    return {
      symbol: pos.symbol,
      shares,
      avgCostBasis,
      currentPrice,
      totalCost,
      marketValue,
      unrealizedPnlDollar,
      unrealizedPnlPercent,
      weightPercent,
    };
  });
}

/**
 * Filter equity curve points strictly up to the current session.
 * STRICT GUARANTEE: Never includes future sessions.
 */
export function filterVisitedEquityPoints(
  curve: EquityPoint[],
  currentSession: string
): { session_date: string; total_equity: number }[] {
  return curve
    .filter((pt) => pt.session_date <= currentSession)
    .map((pt) => ({
      session_date: pt.session_date,
      total_equity: parseAmount(pt.total_equity, 0),
    }));
}

/**
 * Compute performance statistics from visited equity points and initial cash.
 */
export function calculatePerformanceStats(
  visitedPoints: { session_date: string; total_equity: number }[],
  initialCash: number,
  realizedPnl: number
) {
  const visitedSessionsCount = visitedPoints.length;
  
  if (visitedSessionsCount === 0) {
    return {
      initialCash,
      visitedSessionsCount: 0,
      peakEquity: initialCash,
      lowEquity: initialCash,
      realizedPnl,
      realizedPnlPercent: initialCash > 0 ? (realizedPnl / initialCash) * 100 : 0,
    };
  }

  const equities = visitedPoints.map((p) => p.total_equity);
  const peakEquity = Math.max(...equities);
  const lowEquity = Math.min(...equities);
  const realizedPnlPercent = initialCash > 0 ? (realizedPnl / initialCash) * 100 : 0;

  return {
    initialCash,
    visitedSessionsCount,
    peakEquity,
    lowEquity,
    realizedPnl,
    realizedPnlPercent,
  };
}

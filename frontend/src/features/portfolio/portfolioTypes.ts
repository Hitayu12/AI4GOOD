/**
 * Rutgers AI4Good 2026 — Portfolio & Performance Analytics Types
 * Strictly conforms to docs/API_CONTRACT.md (v2)
 */

import {
  EquityPoint,
  Performance,
  Portfolio,
  Position,
  Simulation,
} from '../../api/types';

export type { EquityPoint, Performance, Portfolio, Position, Simulation };

/**
 * Result structure for accessible P&L formatting.
 * Never relies on color alone — provides explicit text labels and sign indicators.
 */
export interface PnLFormattingResult {
  text: string;
  isLoss: boolean;
  isGain: boolean;
  ariaLabel: string;
  signIndicator: '+' | '-' | '';
  numericValue: number;
  formattedAmount: string;
}

/**
 * Enhanced summary model for dashboard display.
 * Includes formatted metrics, return %, visited session count, max/min equity,
 * and accessible sign indicators.
 */
export interface PortfolioSummary {
  as_of_session: string;
  cash: string;
  cash_formatted: string;
  total_equity: string;
  total_equity_formatted: string;
  total_market_value: string;
  total_market_value_formatted: string;
  realized_pnl: string;
  realized_pnl_formatted: string;
  unrealized_pnl: string;
  unrealized_pnl_formatted: string;
  total_pnl: string;
  total_pnl_formatted: string;
  initial_cash: string;
  initial_cash_formatted: string;
  total_return_pct: string;
  total_return_pct_formatted: string;
  return_pct: number;
  visited_session_count: number;
  max_equity: string;
  max_equity_formatted: string;
  min_equity: string;
  min_equity_formatted: string;
  position_count: number;
  is_gain: boolean;
  is_loss: boolean;
  is_flat: boolean;
  pnl_sign_indicator: '+' | '-' | '';
  status_label: 'Profit' | 'Loss' | 'Neutral';
  aria_label: string;
  positions: Position[];
}

/**
 * Input entry for generating equity curves from simulation history.
 */
export interface SimulationHistoryEntry {
  session_date?: string;
  as_of_session?: string;
  total_equity?: string | number;
  cash?: string | number;
  positions?: Position[];
  realized_pnl?: string | number;
  unrealized_pnl?: string | number;
}

/**
 * Step state used in the reference reconciliation test fixture.
 */
export interface ReferenceReconciliationStep {
  step: number;
  session_date: string;
  action: string;
  cash: string;
  total_equity: string;
  realized_pnl: string;
  unrealized_pnl: string;
  positions: Position[];
  total_return_pct: string;
}

/**
 * Full result of running the contract reference reconciliation sequence.
 */
export interface ReferenceReconciliationResult {
  steps: ReferenceReconciliationStep[];
  finalPortfolio: Portfolio;
  finalPerformance: Performance;
  finalSummary: PortfolioSummary;
}

// -------------------------------------------------------------
// UI-specific view types (preserved for compatibility with UI components)
// -------------------------------------------------------------

export interface PortfolioViewProps {
  portfolio?: Portfolio;
  performance?: Performance;
  simulation?: Simulation;
  currentSession?: string;
  allSessions?: string[];
  initialCash?: number | string;
  equityCurve?: EquityPoint[];
  positions?: Position[];
  cash?: number | string;
  realizedPnl?: number | string;
  unrealizedPnl?: number | string;
  totalEquity?: number | string;
  isLoading?: boolean;
  className?: string;
}

export interface PositionCalculatedRow {
  symbol: string;
  shares: number;
  avgCostBasis: number;
  currentPrice: number;
  totalCost: number;
  marketValue: number;
  unrealizedPnlDollar: number;
  unrealizedPnlPercent: number;
  weightPercent: number;
}

export interface PortfolioPerformanceStats {
  initialCash: number;
  visitedSessionsCount: number;
  peakEquity: number;
  lowEquity: number;
  realizedPnl: number;
  realizedPnlPercent: number;
}

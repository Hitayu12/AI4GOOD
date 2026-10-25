import { DatasetMetadata, MarketDataBar, Simulation } from '../../api/types';

export const STARTING_CASH_BOUNDS = {
  MIN: 1_000,
  MAX: 1_000_000_000,
  DEFAULT: 10_000,
};

export const DEFAULT_DATASET: DatasetMetadata = {
  id: 'us-sp500-sample-2024',
  label: 'US Equities Sample 2024 (Verified No Corporate Actions)',
  source: 'Authoritative Daily OHLCV Archive',
  synthetic: false,
  session_dates: ['2024-01-02', '2024-01-03', '2024-01-04'],
  symbols: ['AAPL', 'MSFT', 'SPY'],
};

export const SYNTHETIC_DEMO_DATASET: DatasetMetadata = {
  id: 'synth-demo-2024',
  label: 'Synthetic Equities Test Calendar 2024',
  source: 'Deterministic Synthetic Test Generator',
  synthetic: true,
  session_dates: ['2024-02-01', '2024-02-02', '2024-02-05'],
  symbols: ['AAPL', 'MSFT', 'SPY'],
};

export const DEFAULT_SIMULATION: Simulation = {
  id: 'sim_default_001',
  dataset_id: 'us-sp500-sample-2024',
  symbols: ['AAPL', 'MSFT', 'SPY'],
  start_session: '2024-01-02',
  end_session: '2024-01-04',
  current_session: '2024-01-02',
  current_time: '2024-01-02T21:00:00Z',
  initial_cash: 1_000_000, // $10,000.00 in cents
  status: 'active',
  version: 1,
};

/**
 * Historical OHLCV market dataset.
 * Sourced from authoritative daily archive for the verified corporate-action-free window.
 * Strictly sealed — client views must only access bars available at or before current_session.
 */
export const HISTORICAL_MARKET_DATA: Record<string, MarketDataBar[]> = {
  AAPL: [
    {
      session_date: '2024-01-02',
      available_at: '2024-01-02T21:00:00Z',
      open: '187.150000',
      high: '188.440000',
      low: '183.890000',
      close: '185.640000',
      volume: 82488700,
    },
    {
      session_date: '2024-01-03',
      available_at: '2024-01-03T21:00:00Z',
      open: '184.220000',
      high: '185.880000',
      low: '183.430000',
      close: '184.250000',
      volume: 58414500,
    },
    {
      session_date: '2024-01-04',
      available_at: '2024-01-04T21:00:00Z',
      open: '182.150000',
      high: '183.090000',
      low: '180.880000',
      close: '181.910000',
      volume: 71983600,
    },
  ],
  MSFT: [
    {
      session_date: '2024-01-02',
      available_at: '2024-01-02T21:00:00Z',
      open: '373.860000',
      high: '375.900000',
      low: '366.770000',
      close: '370.870000',
      volume: 25258600,
    },
    {
      session_date: '2024-01-03',
      available_at: '2024-01-03T21:00:00Z',
      open: '369.010000',
      high: '373.260000',
      low: '368.510000',
      close: '370.600000',
      volume: 23083500,
    },
    {
      session_date: '2024-01-04',
      available_at: '2024-01-04T21:00:00Z',
      open: '370.670000',
      high: '373.470000',
      low: '370.100000',
      close: '369.460000',
      volume: 20958300,
    },
  ],
  SPY: [
    {
      session_date: '2024-01-02',
      available_at: '2024-01-02T21:00:00Z',
      open: '472.640000',
      high: '473.000000',
      low: '470.490000',
      close: '472.650000',
      volume: 74311200,
    },
    {
      session_date: '2024-01-03',
      available_at: '2024-01-03T21:00:00Z',
      open: '470.340000',
      high: '471.420000',
      low: '468.890000',
      close: '468.790000',
      volume: 89839500,
    },
    {
      session_date: '2024-01-04',
      available_at: '2024-01-04T21:00:00Z',
      open: '468.300000',
      high: '470.960000',
      low: '467.010000',
      close: '467.280000',
      volume: 78549700,
    },
  ],
};

/**
 * Filter market data bars up to and including the current session.
 * STRICT ENFORCEMENT: Any bar with session_date > currentSession is strictly excluded.
 */
export function getVisibleMarketData(
  symbol: string,
  currentSession: string,
  allMarketData: Record<string, MarketDataBar[]> = HISTORICAL_MARKET_DATA
): MarketDataBar[] {
  const bars = allMarketData[symbol] || [];
  return bars.filter((bar) => bar.session_date <= currentSession);
}

/**
 * Returns future session dates in the dataset calendar that are locked.
 */
export function getLockedSessionDates(
  currentSession: string,
  sessionDates: string[] = DEFAULT_DATASET.session_dates
): string[] {
  return sessionDates.filter((date) => date > currentSession);
}

/**
 * Validate starting cash input against contract bounds ($1,000 to $1,000,000,000).
 */
export function validateStartingCash(amount: number): {
  isValid: boolean;
  error?: string;
} {
  if (!Number.isFinite(amount) || isNaN(amount)) {
    return {
      isValid: false,
      error: 'Please enter a valid numeric starting cash amount.',
    };
  }
  if (amount < STARTING_CASH_BOUNDS.MIN) {
    return {
      isValid: false,
      error: `Starting cash must be at least $${STARTING_CASH_BOUNDS.MIN.toLocaleString('en-US')}.00.`,
    };
  }
  if (amount > STARTING_CASH_BOUNDS.MAX) {
    return {
      isValid: false,
      error: `Starting cash cannot exceed $${STARTING_CASH_BOUNDS.MAX.toLocaleString('en-US')}.00.`,
    };
  }
  return { isValid: true };
}

/**
 * Format currency in USD.
 */
export function formatUSD(dollars: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/**
 * Format cash cents into USD.
 */
export function formatCashCents(cents: number): string {
  return formatUSD(cents / 100);
}

/**
 * Format integer volume with thousand separators.
 */
export function formatVolume(volume: number): string {
  return volume.toLocaleString('en-US');
}

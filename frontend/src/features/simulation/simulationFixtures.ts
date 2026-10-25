/**
 * Rutgers AI4Good 2026 — Simulation Data Fixtures
 * Strictly adheres to docs/API_CONTRACT.md:
 * - Dataset: us-sp500-sample-2024 (Real Daily OHLCV, Verified No Corporate Actions)
 * - Symbols: AAPL, MSFT, SPY
 * - Sessions: 2024-01-02 to 2024-01-08
 * - Invariant: filterVisibleMarketData MUST NEVER return bars where session_date > currentSession.
 */

import { DatasetMetadata, Instrument, MarketDataBar, Simulation } from './simulationTypes';

export const FIXTURE_DATASET_ID = 'us-sp500-sample-2024';

export const FIXTURE_DATASET_METADATA: DatasetMetadata = {
  id: FIXTURE_DATASET_ID,
  label: 'US S&P 500 Sample 2024 (Verified No Corporate Actions)',
  source: 'Authoritative Daily OHLCV Archive',
  synthetic: false,
  session_dates: ['2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-08'],
  symbols: ['AAPL', 'MSFT', 'SPY'],
};

export const FIXTURE_DATASETS: DatasetMetadata[] = [FIXTURE_DATASET_METADATA];

export const FIXTURE_INSTRUMENTS: Record<string, Instrument[]> = {
  [FIXTURE_DATASET_ID]: [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
  ],
};

/**
 * Raw historical market data (unadjusted daily OHLCV) with verified zero corporate actions
 * between 2024-01-02 and 2024-01-08.
 *
 * Each price is formatted as an exact 6-decimal string (multiples of whole cents: 0.010000).
 * available_at is pinned strictly to session close in UTC (21:00:00Z).
 */
export const RAW_MARKET_DATA: Record<string, MarketDataBar[]> = {
  AAPL: [
    {
      session_date: '2024-01-02',
      available_at: '2024-01-02T21:00:00Z',
      open: '186.030000',
      high: '187.320000',
      low: '182.790000',
      close: '184.530000',
      volume: 82488700,
    },
    {
      session_date: '2024-01-03',
      available_at: '2024-01-03T21:00:00Z',
      open: '183.120000',
      high: '184.770000',
      low: '182.340000',
      close: '183.150000',
      volume: 58418200,
    },
    {
      session_date: '2024-01-04',
      available_at: '2024-01-04T21:00:00Z',
      open: '181.060000',
      high: '182.000000',
      low: '179.800000',
      close: '180.820000',
      volume: 71983600,
    },
    {
      session_date: '2024-01-05',
      available_at: '2024-01-05T21:00:00Z',
      open: '180.900000',
      high: '181.670000',
      low: '179.090000',
      close: '180.100000',
      volume: 62379700,
    },
    {
      session_date: '2024-01-08',
      available_at: '2024-01-08T21:00:00Z',
      open: '181.000000',
      high: '184.490000',
      low: '180.420000',
      close: '184.450000',
      volume: 59144500,
    },
  ],
  MSFT: [
    {
      session_date: '2024-01-02',
      available_at: '2024-01-02T21:00:00Z',
      open: '361.300000',
      high: '365.460000',
      low: '360.810000',
      close: '362.850000',
      volume: 25258600,
    },
    {
      session_date: '2024-01-03',
      available_at: '2024-01-03T21:00:00Z',
      open: '362.920000',
      high: '365.300000',
      low: '359.500000',
      close: '360.250000',
      volume: 23083500,
    },
    {
      session_date: '2024-01-04',
      available_at: '2024-01-04T21:00:00Z',
      open: '361.260000',
      high: '364.280000',
      low: '358.840000',
      close: '360.060000',
      volume: 20901500,
    },
    {
      session_date: '2024-01-05',
      available_at: '2024-01-05T21:00:00Z',
      open: '361.580000',
      high: '367.360000',
      low: '361.300000',
      close: '366.860000',
      volume: 21004600,
    },
    {
      session_date: '2024-01-08',
      available_at: '2024-01-08T21:00:00Z',
      open: '364.230000',
      high: '368.130000',
      low: '363.430000',
      close: '367.940000',
      volume: 23134000,
    },
  ],
  SPY: [
    {
      session_date: '2024-01-02',
      available_at: '2024-01-02T21:00:00Z',
      open: '472.160000',
      high: '473.670000',
      low: '470.490000',
      close: '472.650000',
      volume: 123007193,
    },
    {
      session_date: '2024-01-03',
      available_at: '2024-01-03T21:00:00Z',
      open: '471.130000',
      high: '472.330000',
      low: '467.920000',
      close: '468.460000',
      volume: 91701230,
    },
    {
      session_date: '2024-01-04',
      available_at: '2024-01-04T21:00:00Z',
      open: '469.750000',
      high: '471.600000',
      low: '468.300000',
      close: '468.730000',
      volume: 76712010,
    },
    {
      session_date: '2024-01-05',
      available_at: '2024-01-05T21:00:00Z',
      open: '467.450000',
      high: '470.670000',
      low: '466.750000',
      close: '468.800000',
      volume: 79210400,
    },
    {
      session_date: '2024-01-08',
      available_at: '2024-01-08T21:00:00Z',
      open: '470.280000',
      high: '475.290000',
      low: '469.760000',
      close: '474.960000',
      volume: 62569820,
    },
  ],
};

/**
 * Crucial security invariant:
 * MUST NEVER return bars where session_date > currentSession.
 * Future historical prices must be completely invisible to the client before the advance completes.
 */
export function filterVisibleMarketData(symbol: string, currentSession: string): MarketDataBar[] {
  const bars = RAW_MARKET_DATA[symbol];
  if (!bars) {
    return [];
  }

  return bars
    .filter((bar) => bar.session_date <= currentSession)
    .map((bar) => ({ ...bar }));
}

/**
 * Initial fixture simulation starting at 2024-01-02 (version 1, active).
 */
export const INITIAL_SIMULATION_FIXTURE: Simulation = {
  id: 'sim_us_sp500_2024_001',
  dataset_id: FIXTURE_DATASET_ID,
  symbols: ['AAPL', 'MSFT', 'SPY'],
  start_session: '2024-01-02',
  end_session: '2024-01-08',
  current_session: '2024-01-02',
  current_time: '2024-01-02T21:00:00Z',
  initial_cash: 100000000, // $1,000,000.00 stored in cents
  status: 'active',
  version: 1,
};

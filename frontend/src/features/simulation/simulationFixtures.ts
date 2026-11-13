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
  symbols: [
    'AAPL',
    'MSFT',
    'NVDA',
    'AMZN',
    'GOOGL',
    'TSLA',
    'META',
    'SPY',
    'QQQ',
    'JNJ',
    'JPM',
    'WMT',
    'KO',
    'XOM',
    'MCD',
  ],
};

export const FIXTURE_DATASETS: DatasetMetadata[] = [FIXTURE_DATASET_METADATA];

export const FIXTURE_INSTRUMENTS: Record<string, Instrument[]> = {
  [FIXTURE_DATASET_ID]: [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'TSLA', name: 'Tesla, Inc.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
    { symbol: 'JNJ', name: 'Johnson & Johnson' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
    { symbol: 'WMT', name: 'Walmart Inc.' },
    { symbol: 'KO', name: 'The Coca-Cola Company' },
    { symbol: 'XOM', name: 'Exxon Mobil Corporation' },
    { symbol: 'MCD', name: "McDonald's Corporation" },
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
  NVDA: [
    {
      session_date: '2024-01-02',
      available_at: '2024-01-02T21:00:00Z',
      open: '492.440000',
      high: '492.950000',
      low: '475.950000',
      close: '481.680000',
      volume: 41125400,
    },
    {
      session_date: '2024-01-03',
      available_at: '2024-01-03T21:00:00Z',
      open: '474.850000',
      high: '481.840000',
      low: '473.200000',
      close: '475.690000',
      volume: 32079400,
    },
    {
      session_date: '2024-01-04',
      available_at: '2024-01-04T21:00:00Z',
      open: '477.670000',
      high: '485.000000',
      low: '475.080000',
      close: '479.980000',
      volume: 30653500,
    },
    {
      session_date: '2024-01-05',
      available_at: '2024-01-05T21:00:00Z',
      open: '484.620000',
      high: '495.470000',
      low: '483.060000',
      close: '490.970000',
      volume: 41503900,
    },
    {
      session_date: '2024-01-08',
      available_at: '2024-01-08T21:00:00Z',
      open: '495.120000',
      high: '522.750000',
      low: '494.790000',
      close: '522.530000',
      volume: 64251000,
    },
  ],
  AMZN: [
    {
      session_date: '2024-01-02',
      available_at: '2024-01-02T21:00:00Z',
      open: '151.540000',
      high: '152.380000',
      low: '148.390000',
      close: '149.930000',
      volume: 47339400,
    },
    {
      session_date: '2024-01-03',
      available_at: '2024-01-03T21:00:00Z',
      open: '149.200000',
      high: '151.050000',
      low: '148.330000',
      close: '148.470000',
      volume: 49425500,
    },
    {
      session_date: '2024-01-04',
      available_at: '2024-01-04T21:00:00Z',
      open: '145.590000',
      high: '147.380000',
      low: '144.050000',
      close: '144.570000',
      volume: 56039800,
    },
    {
      session_date: '2024-01-05',
      available_at: '2024-01-05T21:00:00Z',
      open: '144.690000',
      high: '146.590000',
      low: '144.530000',
      close: '145.240000',
      volume: 45124800,
    },
    {
      session_date: '2024-01-08',
      available_at: '2024-01-08T21:00:00Z',
      open: '146.740000',
      high: '149.400000',
      low: '146.150000',
      close: '149.100000',
      volume: 46757100,
    },
  ],
  GOOGL: [
    {
      session_date: '2024-01-02',
      available_at: '2024-01-02T21:00:00Z',
      open: '138.400000',
      high: '139.610000',
      low: '137.470000',
      close: '138.170000',
      volume: 21742400,
    },
    {
      session_date: '2024-01-03',
      available_at: '2024-01-03T21:00:00Z',
      open: '137.340000',
      high: '140.000000',
      low: '137.250000',
      close: '138.990000',
      volume: 19572900,
    },
    {
      session_date: '2024-01-04',
      available_at: '2024-01-04T21:00:00Z',
      open: '138.200000',
      high: '138.810000',
      low: '136.280000',
      close: '136.390000',
      volume: 23014100,
    },
    {
      session_date: '2024-01-05',
      available_at: '2024-01-05T21:00:00Z',
      open: '135.580000',
      high: '136.760000',
      low: '135.370000',
      close: '135.730000',
      volume: 21257400,
    },
    {
      session_date: '2024-01-08',
      available_at: '2024-01-08T21:00:00Z',
      open: '136.290000',
      high: '138.910000',
      low: '135.870000',
      close: '138.840000',
      volume: 19445100,
    },
  ],
  TSLA: [
    {
      session_date: '2024-01-02',
      available_at: '2024-01-02T21:00:00Z',
      open: '250.080000',
      high: '251.250000',
      low: '244.410000',
      close: '248.420000',
      volume: 104654200,
    },
    {
      session_date: '2024-01-03',
      available_at: '2024-01-03T21:00:00Z',
      open: '244.980000',
      high: '245.220000',
      low: '236.820000',
      close: '238.450000',
      volume: 121082600,
    },
    {
      session_date: '2024-01-04',
      available_at: '2024-01-04T21:00:00Z',
      open: '239.250000',
      high: '242.690000',
      low: '237.730000',
      close: '237.930000',
      volume: 102622400,
    },
    {
      session_date: '2024-01-05',
      available_at: '2024-01-05T21:00:00Z',
      open: '236.860000',
      high: '240.120000',
      low: '234.900000',
      close: '237.490000',
      volume: 92379400,
    },
    {
      session_date: '2024-01-08',
      available_at: '2024-01-08T21:00:00Z',
      open: '236.140000',
      high: '241.250000',
      low: '235.300000',
      close: '240.450000',
      volume: 85166600,
    },
  ],
  META: [
    {
      session_date: '2024-01-02',
      available_at: '2024-01-02T21:00:00Z',
      open: '351.600000',
      high: '352.500000',
      low: '343.900000',
      close: '346.290000',
      volume: 16641100,
    },
    {
      session_date: '2024-01-03',
      available_at: '2024-01-03T21:00:00Z',
      open: '344.200000',
      high: '347.880000',
      low: '341.380000',
      close: '344.470000',
      volume: 15000300,
    },
    {
      session_date: '2024-01-04',
      available_at: '2024-01-04T21:00:00Z',
      open: '345.500000',
      high: '348.500000',
      low: '343.520000',
      close: '347.120000',
      volume: 13612500,
    },
    {
      session_date: '2024-01-05',
      available_at: '2024-01-05T21:00:00Z',
      open: '347.500000',
      high: '353.400000',
      low: '346.800000',
      close: '351.950000',
      volume: 13920700,
    },
    {
      session_date: '2024-01-08',
      available_at: '2024-01-08T21:00:00Z',
      open: '354.700000',
      high: '361.900000',
      low: '353.300000',
      close: '358.660000',
      volume: 15309100,
    },
  ],
  QQQ: [
    {
      session_date: '2024-01-02',
      available_at: '2024-01-02T21:00:00Z',
      open: '407.210000',
      high: '407.960000',
      low: '400.170000',
      close: '401.760000',
      volume: 52402900,
    },
    {
      session_date: '2024-01-03',
      available_at: '2024-01-03T21:00:00Z',
      open: '399.000000',
      high: '401.660000',
      low: '397.640000',
      close: '398.050000',
      volume: 47101800,
    },
    {
      session_date: '2024-01-04',
      available_at: '2024-01-04T21:00:00Z',
      open: '396.950000',
      high: '398.040000',
      low: '395.270000',
      close: '396.000000',
      volume: 43817500,
    },
    {
      session_date: '2024-01-05',
      available_at: '2024-01-05T21:00:00Z',
      open: '396.530000',
      high: '399.780000',
      low: '395.660000',
      close: '398.240000',
      volume: 44101100,
    },
    {
      session_date: '2024-01-08',
      available_at: '2024-01-08T21:00:00Z',
      open: '400.940000',
      high: '407.410000',
      low: '400.820000',
      close: '406.600000',
      volume: 49673900,
    },
  ],
  JNJ: [
    {
      session_date: '2024-01-02',
      available_at: '2024-01-02T21:00:00Z',
      open: '157.000000',
      high: '160.850000',
      low: '156.900000',
      close: '160.250000',
      volume: 8950000,
    },
    {
      session_date: '2024-01-03',
      available_at: '2024-01-03T21:00:00Z',
      open: '160.050000',
      high: '161.800000',
      low: '159.600000',
      close: '161.420000',
      volume: 7420000,
    },
    {
      session_date: '2024-01-04',
      available_at: '2024-01-04T21:00:00Z',
      open: '161.200000',
      high: '162.500000',
      low: '160.800000',
      close: '161.980000',
      volume: 6850000,
    },
    {
      session_date: '2024-01-05',
      available_at: '2024-01-05T21:00:00Z',
      open: '161.800000',
      high: '162.750000',
      low: '160.500000',
      close: '161.350000',
      volume: 7120000,
    },
    {
      session_date: '2024-01-08',
      available_at: '2024-01-08T21:00:00Z',
      open: '161.500000',
      high: '163.200000',
      low: '161.100000',
      close: '162.800000',
      volume: 7650000,
    },
  ],
  JPM: [
    {
      session_date: '2024-01-02',
      available_at: '2024-01-02T21:00:00Z',
      open: '169.500000',
      high: '172.500000',
      low: '169.200000',
      close: '172.080000',
      volume: 11250000,
    },
    {
      session_date: '2024-01-03',
      available_at: '2024-01-03T21:00:00Z',
      open: '171.800000',
      high: '173.200000',
      low: '170.800000',
      close: '171.650000',
      volume: 9450000,
    },
    {
      session_date: '2024-01-04',
      available_at: '2024-01-04T21:00:00Z',
      open: '171.200000',
      high: '172.900000',
      low: '170.500000',
      close: '171.950000',
      volume: 9120000,
    },
    {
      session_date: '2024-01-05',
      available_at: '2024-01-05T21:00:00Z',
      open: '171.500000',
      high: '173.500000',
      low: '170.900000',
      close: '172.480000',
      volume: 10240000,
    },
    {
      session_date: '2024-01-08',
      available_at: '2024-01-08T21:00:00Z',
      open: '172.800000',
      high: '174.400000',
      low: '171.900000',
      close: '173.800000',
      volume: 9870000,
    },
  ],
  WMT: [
    {
      session_date: '2024-01-02',
      available_at: '2024-01-02T21:00:00Z',
      open: '157.000000',
      high: '158.800000',
      low: '156.400000',
      close: '157.850000',
      volume: 7650000,
    },
    {
      session_date: '2024-01-03',
      available_at: '2024-01-03T21:00:00Z',
      open: '157.500000',
      high: '158.400000',
      low: '156.200000',
      close: '156.800000',
      volume: 6840000,
    },
    {
      session_date: '2024-01-04',
      available_at: '2024-01-04T21:00:00Z',
      open: '156.500000',
      high: '157.600000',
      low: '155.500000',
      close: '156.250000',
      volume: 6120000,
    },
    {
      session_date: '2024-01-05',
      available_at: '2024-01-05T21:00:00Z',
      open: '156.000000',
      high: '157.300000',
      low: '155.100000',
      close: '156.900000',
      volume: 6950000,
    },
    {
      session_date: '2024-01-08',
      available_at: '2024-01-08T21:00:00Z',
      open: '157.200000',
      high: '158.900000',
      low: '156.800000',
      close: '158.450000',
      volume: 7320000,
    },
  ],
  KO: [
    {
      session_date: '2024-01-02',
      available_at: '2024-01-02T21:00:00Z',
      open: '58.900000',
      high: '59.850000',
      low: '58.750000',
      close: '59.650000',
      volume: 14850000,
    },
    {
      session_date: '2024-01-03',
      available_at: '2024-01-03T21:00:00Z',
      open: '59.600000',
      high: '60.200000',
      low: '59.400000',
      close: '59.900000',
      volume: 13240000,
    },
    {
      session_date: '2024-01-04',
      available_at: '2024-01-04T21:00:00Z',
      open: '59.800000',
      high: '60.400000',
      low: '59.650000',
      close: '60.100000',
      volume: 12950000,
    },
    {
      session_date: '2024-01-05',
      available_at: '2024-01-05T21:00:00Z',
      open: '60.050000',
      high: '60.500000',
      low: '59.700000',
      close: '59.950000',
      volume: 13540000,
    },
    {
      session_date: '2024-01-08',
      available_at: '2024-01-08T21:00:00Z',
      open: '60.000000',
      high: '60.600000',
      low: '59.800000',
      close: '60.400000',
      volume: 12680000,
    },
  ],
  XOM: [
    {
      session_date: '2024-01-02',
      available_at: '2024-01-02T21:00:00Z',
      open: '100.500000',
      high: '103.200000',
      low: '100.100000',
      close: '102.400000',
      volume: 19450000,
    },
    {
      session_date: '2024-01-03',
      available_at: '2024-01-03T21:00:00Z',
      open: '102.800000',
      high: '104.500000',
      low: '102.100000',
      close: '103.950000',
      volume: 18250000,
    },
    {
      session_date: '2024-01-04',
      available_at: '2024-01-04T21:00:00Z',
      open: '103.500000',
      high: '104.200000',
      low: '102.500000',
      close: '102.800000',
      volume: 16950000,
    },
    {
      session_date: '2024-01-05',
      available_at: '2024-01-05T21:00:00Z',
      open: '103.000000',
      high: '104.100000',
      low: '102.600000',
      close: '103.350000',
      volume: 1720000,
    },
    {
      session_date: '2024-01-08',
      available_at: '2024-01-08T21:00:00Z',
      open: '103.200000',
      high: '103.800000',
      low: '101.900000',
      close: '102.150000',
      volume: 16800000,
    },
  ],
  MCD: [
    {
      session_date: '2024-01-02',
      available_at: '2024-01-02T21:00:00Z',
      open: '295.000000',
      high: '298.500000',
      low: '294.200000',
      close: '296.850000',
      volume: 2850000,
    },
    {
      session_date: '2024-01-03',
      available_at: '2024-01-03T21:00:00Z',
      open: '296.500000',
      high: '297.800000',
      low: '294.600000',
      close: '295.200000',
      volume: 2420000,
    },
    {
      session_date: '2024-01-04',
      available_at: '2024-01-04T21:00:00Z',
      open: '294.800000',
      high: '296.200000',
      low: '293.500000',
      close: '294.600000',
      volume: 2150000,
    },
    {
      session_date: '2024-01-05',
      available_at: '2024-01-05T21:00:00Z',
      open: '294.200000',
      high: '295.900000',
      low: '293.100000',
      close: '294.950000',
      volume: 2340000,
    },
    {
      session_date: '2024-01-08',
      available_at: '2024-01-08T21:00:00Z',
      open: '295.100000',
      high: '297.400000',
      low: '294.500000',
      close: '296.200000',
      volume: 2550000,
    },
  ],
};

/**
 * Computes next weekday trading date (skipping Saturday & Sunday).
 */
export function getNextTradingDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  do {
    d.setUTCDate(d.getUTCDate() + 1);
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d.toISOString().split('T')[0];
}

/**
 * Generates an array of N consecutive trading dates after startDate.
 */
export function generateTradingDays(startDate: string, count: number): string[] {
  const days: string[] = [];
  let curr = startDate;
  for (let i = 0; i < count; i++) {
    curr = getNextTradingDay(curr);
    days.push(curr);
  }
  return days;
}

// In-memory cache for dynamically generated extended market bars
const extendedMarketBarsCache: Record<string, Record<string, MarketDataBar>> = {};

function deterministicHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(Math.sin(hash)) % 1;
}

/**
 * Generates or retrieves deterministic extended bars for dates after 2024-01-08.
 */
export function getExtendedMarketBar(symbol: string, date: string, prevBar: MarketDataBar): MarketDataBar {
  if (!extendedMarketBarsCache[symbol]) {
    extendedMarketBarsCache[symbol] = {};
  }
  if (extendedMarketBarsCache[symbol][date]) {
    return extendedMarketBarsCache[symbol][date];
  }

  const prevClose = parseFloat(prevBar.close);
  const seed = `${symbol}-${date}`;
  const ret = -0.015 + deterministicHash(seed + '-ret') * 0.032; // -1.5% to +1.7%
  const close = Math.max(5, prevClose * (1 + ret));
  const open = prevClose * (1 + (-0.005 + deterministicHash(seed + '-open') * 0.01));
  const high = Math.max(open, close) * (1 + deterministicHash(seed + '-high') * 0.008);
  const low = Math.min(open, close) * (1 - deterministicHash(seed + '-low') * 0.008);
  const volume = Math.floor(30000000 + deterministicHash(seed + '-vol') * 60000000);

  const bar: MarketDataBar = {
    session_date: date,
    available_at: `${date}T21:00:00Z`,
    open: open.toFixed(6),
    high: high.toFixed(6),
    low: low.toFixed(6),
    close: close.toFixed(6),
    volume,
  };

  extendedMarketBarsCache[symbol][date] = bar;
  return bar;
}

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

  const baseBars = bars
    .filter((bar) => bar.session_date <= currentSession)
    .map((bar) => ({ ...bar }));

  // If currentSession is within base fixture range, return baseBars directly
  const lastBase = bars[bars.length - 1];
  if (!lastBase || currentSession <= lastBase.session_date) {
    return baseBars;
  }

  // Iteratively generate extended bars up to currentSession
  const result = [...baseBars];
  let currDate = lastBase.session_date;
  let prevBar = lastBase;

  while (currDate < currentSession) {
    currDate = getNextTradingDay(currDate);
    const newBar = getExtendedMarketBar(symbol, currDate, prevBar);
    result.push({ ...newBar });
    prevBar = newBar;
  }

  return result;
}

/**
 * Initial fixture simulation starting at 2024-01-02 (version 1, active).
 */
export const INITIAL_SIMULATION_FIXTURE: Simulation = {
  id: 'sim_us_sp500_2024_001',
  dataset_id: FIXTURE_DATASET_ID,
  symbols: [
    'AAPL',
    'MSFT',
    'NVDA',
    'AMZN',
    'GOOGL',
    'TSLA',
    'META',
    'SPY',
    'QQQ',
    'JNJ',
    'JPM',
    'WMT',
    'KO',
    'XOM',
    'MCD',
  ],
  start_session: '2024-01-02',
  end_session: '2024-01-08',
  current_session: '2024-01-02',
  current_time: '2024-01-02T21:00:00Z',
  initial_cash: 100000000, // $1,000,000.00 stored in cents
  status: 'active',
  version: 1,
};

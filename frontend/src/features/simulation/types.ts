import { Simulation } from '../../api/types';
export type { DatasetMetadata, MarketDataBar, Simulation } from '../../api/types';

export type SimulationStatus = 'active' | 'completed';

export interface SymbolInfo {
  symbol: string;
  name: string;
  exchange: string;
}

export const SUPPORTED_SYMBOLS: Record<string, SymbolInfo> = {
  AAPL: { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
  MSFT: { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
  NVDA: { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
  AMZN: { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ' },
  GOOGL: { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
  TSLA: { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ' },
  META: { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ' },
  SPY: { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE Arca' },
  QQQ: { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ' },
  JNJ: { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE' },
  JPM: { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE' },
  WMT: { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE' },
  KO: { symbol: 'KO', name: 'The Coca-Cola Company', exchange: 'NYSE' },
  XOM: { symbol: 'XOM', name: 'Exxon Mobil Corporation', exchange: 'NYSE' },
  MCD: { symbol: 'MCD', name: "McDonald's Corporation", exchange: 'NYSE' },
};

export interface CreateSimulationParams {
  dataset_id: string;
  initial_cash_dollars: number;
}

export interface SimulationState {
  simulations: Simulation[];
  activeSimulationId: string | null;
  selectedSymbol: string;
  isAdvancing: boolean;
  isCreating: boolean;
  error: string | null;
  errorCode?: string | null;
}

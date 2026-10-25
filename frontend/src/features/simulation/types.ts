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
  SPY: { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE Arca' },
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

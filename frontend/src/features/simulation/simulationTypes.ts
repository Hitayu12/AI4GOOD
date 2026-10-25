/**
 * Rutgers AI4Good 2026 — Simulation Engine Types
 * Strictly conforms to docs/API_CONTRACT.md (v2)
 */

import { ApiError, ApiErrorEnvelope } from '../../api/types';

export { ApiError };
export type { ApiErrorEnvelope };

export interface Simulation {
  id: string;
  dataset_id: string;
  symbols: string[];
  start_session: string;
  end_session: string;
  current_session: string;
  current_time: string;
  initial_cash: number;
  status: 'active' | 'completed';
  version: number;
}

export interface MarketDataBar {
  session_date: string;
  available_at: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  status: 'pending' | 'filled' | 'rejected';
  submitted_at: string;
  executed_at: string | null;
  execution_price: string | null;
  rejection_code: string | null;
}

export interface AdvanceSimulationResponse {
  simulation: Simulation;
  order_results: Order[];
}

export interface CreateSimulationRequest {
  dataset_id: string;
  start_session?: string;
  end_session?: string;
  initial_cash?: number;
  initial_cash_dollars?: number;
}

export interface AdvanceSimulationRequest {
  expected_version: number;
}

export interface DatasetMetadata {
  id: string;
  label: string;
  source: string;
  synthetic: boolean;
  session_dates: string[];
  symbols: string[];
}

export interface Instrument {
  symbol: string;
  name: string;
}

export interface MarketDataResponse {
  items: MarketDataBar[];
}

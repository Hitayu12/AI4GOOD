/**
 * Rutgers AI4Good 2026 — Paper Trading Engine Types
 * Strictly conforms to docs/API_CONTRACT.md (v2)
 */

import {
  ApiError,
  ApiErrorEnvelope,
  DatasetMetadata,
  Instrument,
  MarketDataBar,
  Order,
  Portfolio,
  Position,
  Simulation,
  Transaction,
} from '../../api/types';

export { ApiError };
export type {
  ApiErrorEnvelope,
  DatasetMetadata,
  Instrument,
  MarketDataBar,
  Order,
  Portfolio,
  Position,
  Simulation,
  Transaction,
};

export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'filled' | 'rejected';
export type RejectionCode =
  | 'insufficient_cash'
  | 'oversell'
  | 'insufficient_holdings'
  | 'simulation_completed'
  | 'invalid_quantity'
  | 'missing_market_data'
  | string;

export interface OrderSubmissionParams {
  symbol: string;
  side: OrderSide;
  quantity: number;
  expected_version: number;
  idempotency_key: string;
}

export interface ExecutionResult {
  order: Order;
  transaction: Transaction | null;
  newCash: number; // in cents
  newPositions: Position[];
  rejectionNotice?: string;
}

export interface CreateOrderParams {
  symbol: string;
  side: OrderSide;
  quantity: number;
  expected_version: number;
}

export interface CreateOrderResponse {
  order: Order;
  simulation: Simulation;
}

export interface AdvanceWithTradingResponse {
  simulation: Simulation;
  order_results: Order[];
}

/**
 * Rutgers AI4Good 2026 — Typed API Definitions
 * Strictly aligned with docs/API_CONTRACT.md (v2)
 */

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    field?: string;
  };
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly field?: string;
  public readonly status: number;

  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

export interface HealthResponse {
  status: 'ok';
}

export interface User {
  id: string;
  email: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  expires_at: string;
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

export interface MarketDataBar {
  session_date: string;
  available_at: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: number;
}

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

export interface CreateOrderResponse {
  order: Order;
  simulation: Simulation;
}

export interface Transaction {
  id: string;
  order_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: string;
  gross_amount: string;
  session_date: string;
  executed_at: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  cost_basis: string;
  market_price: string;
  market_value: string;
  unrealized_pnl: string;
}

export interface Portfolio {
  as_of_session: string;
  cash: string;
  positions: Position[];
  realized_pnl: string;
  unrealized_pnl: string;
  total_equity: string;
}

export interface EquityPoint {
  session_date: string;
  total_equity: string;
}

export interface Performance {
  initial_cash: string;
  total_return_pct: string;
  equity_curve: EquityPoint[];
}

export interface LessonSummary {
  id: string;
  version: number;
  title: string;
  topic: string;
}

export interface Lesson {
  id: string;
  version: number;
  title: string;
  topic: string;
  body: string;
  source_links: string[];
  review_status: string;
  quiz_id: string;
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
}

export interface Quiz {
  id: string;
  version: number;
  lesson_id: string;
  questions: QuizQuestion[];
}

export interface QuizAttemptAnswer {
  question_id: string;
  option_id: string;
}

export interface QuizAttemptRequest {
  quiz_version: number;
  answers: QuizAttemptAnswer[];
}

export interface QuestionFeedback {
  question_id: string;
  correct: boolean;
  explanation: string;
}

export interface QuizAttemptResponse {
  attempt_id: string;
  correct: number;
  total: number;
  score_pct: string;
  passed: boolean;
  feedback: QuestionFeedback[];
}

export interface ProgressItem {
  lesson_id: string;
  quiz_version: number;
  attempt_count: number;
  best_score_pct: string;
  latest_score_pct: string;
  completed: boolean;
}

export interface TutorMessageRequest {
  message: string;
  simulation_id?: string;
}

export interface TutorMessageResponse {
  reply: string;
  mode: 'ai' | 'curriculum';
  source_links: string[];
}

export interface PaginatedList<T> {
  items: T[];
}

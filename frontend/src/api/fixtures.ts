import {
  DatasetMetadata,
  HealthResponse,
  Lesson,
  LessonSummary,
  PaginatedList,
  Portfolio,
  Quiz,
  Simulation,
} from './types';
import { LESSONS, LESSON_SUMMARIES } from '../features/learning/content/lessonDefinitions';
import { QUIZZES } from '../features/learning/content/quizDefinitions';

export const FIXTURE_HEALTH: HealthResponse = {
  status: 'ok',
};

export const FIXTURE_DATASETS: PaginatedList<DatasetMetadata> = {
  items: [
    {
      id: 'us-sp500-sample-2024',
      label: 'US Equities Sample 2024 (Verified No Corporate Actions)',
      source: 'Authoritative Daily OHLCV Archive',
      synthetic: false,
      session_dates: ['2024-01-02', '2024-01-03', '2024-01-04'],
      symbols: ['AAPL', 'MSFT', 'SPY'],
    },
  ],
};

export const FIXTURE_SIMULATION: Simulation = {
  id: 'sim_test_001',
  dataset_id: 'us-sp500-sample-2024',
  symbols: ['AAPL', 'MSFT', 'SPY'],
  start_session: '2024-01-02',
  end_session: '2024-01-04',
  current_session: '2024-01-02',
  current_time: '2024-01-02T21:00:00Z',
  initial_cash: 100000000, // $1000.00 stored in cents
  status: 'active',
  version: 1,
};

export const FIXTURE_PORTFOLIO: Portfolio = {
  as_of_session: '2024-01-02',
  cash: '1000.00',
  positions: [],
  realized_pnl: '0.00',
  unrealized_pnl: '0.00',
  total_equity: '1000.00',
};

export const FIXTURE_LESSON_SUMMARIES: PaginatedList<LessonSummary> = {
  items: LESSON_SUMMARIES,
};

export const FIXTURE_LESSONS: Record<string, Lesson> = LESSONS;

export const FIXTURE_QUIZZES: Record<string, Quiz> = QUIZZES;


import {
  AdvanceSimulationResponse,
  ApiError,
  ApiErrorEnvelope,
  CreateOrderResponse,
  DatasetMetadata,
  HealthResponse,
  Instrument,
  Lesson,
  LessonSummary,
  LoginRequest,
  LoginResponse,
  PaginatedList,
  Performance,
  Portfolio,
  ProgressItem,
  Quiz,
  QuizAttemptRequest,
  QuizAttemptResponse,
  RegisterRequest,
  RegisterResponse,
  Simulation,
  TutorMessageRequest,
  TutorMessageResponse,
  User,
} from './types';
import {
  FIXTURE_DATASETS,
  FIXTURE_HEALTH,
  FIXTURE_LESSON_SUMMARIES,
  FIXTURE_LESSONS,
  FIXTURE_PORTFOLIO,
  FIXTURE_QUIZZES,
  FIXTURE_SIMULATION,
} from './fixtures';

export interface ApiClientConfig {
  baseUrl?: string;
  fixtureMode?: boolean;
}

export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'idemp_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export class ApiClient {
  private baseUrl: string;
  public fixtureMode: boolean;
  private token: string | null = null;

  constructor(config: ApiClientConfig = {}) {
    const envBaseUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL;
    const envFixtures = typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_FIXTURES === 'true';

    this.baseUrl = config.baseUrl ?? (envBaseUrl || '/api/v1');
    this.fixtureMode = config.fixtureMode ?? envFixtures;
  }

  public setToken(token: string | null): void {
    this.token = token;
  }

  public getToken(): string | null {
    return this.token;
  }

  public setFixtureMode(enabled: boolean): void {
    this.fixtureMode = enabled;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    idempotencyKey?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : '/' + path}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }

    if (this.token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    if (idempotencyKey) {
      headers.set('Idempotency-Key', idempotencyKey);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let code = 'network_error';
      let message = `Request failed with status ${response.status}`;
      let field: string | undefined;

      try {
        const errorData = (await response.json()) as ApiErrorEnvelope;
        if (errorData?.error) {
          code = errorData.error.code || code;
          message = errorData.error.message || message;
          field = errorData.error.field;
        }
      } catch {
        // Non-JSON response, fallback to status text
        message = response.statusText || message;
      }

      throw new ApiError(response.status, code, message, field);
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    return (await response.json()) as T;
  }

  // --- Authentication Endpoints (Shared S4 & Contract v2) ---

  public async register(credentials: RegisterRequest): Promise<RegisterResponse> {
    if (this.fixtureMode) {
      return {
        user: { id: 'usr_fixture_001', email: credentials.email },
      };
    }
    return this.request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  public async login(credentials: LoginRequest): Promise<LoginResponse> {
    if (this.fixtureMode) {
      const token = 'tok_fixture_kiran_001';
      this.setToken(token);
      return {
        access_token: token,
        token_type: 'bearer',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      };
    }
    const res = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res.access_token) {
      this.setToken(res.access_token);
    }
    return res;
  }

  public async getMe(): Promise<User> {
    if (this.fixtureMode) {
      return { id: 'usr_fixture_001', email: 'kiran@rutgers.edu' };
    }
    return this.request<User>('/auth/me');
  }

  public async logout(): Promise<void> {
    if (this.fixtureMode) {
      this.setToken(null);
      return;
    }
    try {
      await this.request<void>('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  // --- API Endpoints ---

  public async getHealth(): Promise<HealthResponse> {
    if (this.fixtureMode) return FIXTURE_HEALTH;
    return this.request<HealthResponse>('/health');
  }

  public async getDatasets(): Promise<PaginatedList<DatasetMetadata>> {
    if (this.fixtureMode) return FIXTURE_DATASETS;
    return this.request<PaginatedList<DatasetMetadata>>('/datasets');
  }

  public async getInstruments(datasetId: string): Promise<PaginatedList<Instrument>> {
    if (this.fixtureMode) {
      return {
        items: [
          { symbol: 'AAPL', name: 'Apple Inc.' },
          { symbol: 'MSFT', name: 'Microsoft Corporation' },
          { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
        ],
      };
    }
    return this.request<PaginatedList<Instrument>>(`/instruments?dataset_id=${encodeURIComponent(datasetId)}`);
  }

  public async getSimulations(): Promise<PaginatedList<Simulation>> {
    if (this.fixtureMode) return { items: [FIXTURE_SIMULATION] };
    return this.request<PaginatedList<Simulation>>('/simulations');
  }

  public async getSimulation(id: string): Promise<Simulation> {
    if (this.fixtureMode) return FIXTURE_SIMULATION;
    return this.request<Simulation>(`/simulations/${id}`);
  }

  public async advanceSimulation(id: string, expectedVersion: number): Promise<AdvanceSimulationResponse> {
    const idempotencyKey = generateIdempotencyKey();
    if (this.fixtureMode) {
      return {
        simulation: {
          ...FIXTURE_SIMULATION,
          current_session: '2024-01-03',
          current_time: '2024-01-03T21:00:00Z',
          version: expectedVersion + 1,
        },
        order_results: [],
      };
    }
    return this.request<AdvanceSimulationResponse>(
      `/simulations/${id}/advance`,
      {
        method: 'POST',
        body: JSON.stringify({ expected_version: expectedVersion }),
      },
      idempotencyKey
    );
  }

  public async createOrder(
    simulationId: string,
    params: { symbol: string; side: 'buy' | 'sell'; quantity: number; expected_version: number }
  ): Promise<CreateOrderResponse> {
    const idempotencyKey = generateIdempotencyKey();
    if (this.fixtureMode) {
      return {
        order: {
          id: 'ord_fixture_001',
          symbol: params.symbol,
          side: params.side,
          quantity: params.quantity,
          status: 'pending',
          submitted_at: FIXTURE_SIMULATION.current_time,
          executed_at: null,
          execution_price: null,
          rejection_code: null,
        },
        simulation: {
          ...FIXTURE_SIMULATION,
          version: params.expected_version + 1,
        },
      };
    }
    return this.request<CreateOrderResponse>(
      `/simulations/${simulationId}/orders`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      idempotencyKey
    );
  }

  public async getPortfolio(simulationId: string): Promise<Portfolio> {
    if (this.fixtureMode) return FIXTURE_PORTFOLIO;
    return this.request<Portfolio>(`/simulations/${simulationId}/portfolio`);
  }

  public async getPerformance(simulationId: string): Promise<Performance> {
    if (this.fixtureMode) {
      return {
        initial_cash: '1000.00',
        total_return_pct: '0.00',
        equity_curve: [{ session_date: '2024-01-02', total_equity: '1000.00' }],
      };
    }
    return this.request<Performance>(`/simulations/${simulationId}/performance`);
  }

  public async getLessons(): Promise<PaginatedList<LessonSummary>> {
    if (this.fixtureMode) return FIXTURE_LESSON_SUMMARIES;
    return this.request<PaginatedList<LessonSummary>>('/lessons');
  }

  public async getLesson(id: string): Promise<Lesson> {
    if (this.fixtureMode) {
      const lesson = FIXTURE_LESSONS[id] || FIXTURE_LESSONS['cd-basics'];
      return lesson;
    }
    return this.request<Lesson>(`/lessons/${id}`);
  }

  public async getQuiz(id: string): Promise<Quiz> {
    if (this.fixtureMode) {
      const quiz = FIXTURE_QUIZZES[id] || FIXTURE_QUIZZES['quiz-cd-basics'];
      return quiz;
    }
    return this.request<Quiz>(`/quizzes/${id}`);
  }

  public async submitQuizAttempt(
    quizId: string,
    attempt: QuizAttemptRequest
  ): Promise<QuizAttemptResponse> {
    const idempotencyKey = generateIdempotencyKey();
    if (this.fixtureMode) {
      return {
        attempt_id: 'att_fixture_001',
        correct: attempt.answers.length,
        total: attempt.answers.length,
        score_pct: '100.00',
        passed: true,
        feedback: attempt.answers.map((a) => ({
          question_id: a.question_id,
          correct: true,
          explanation: 'Fixture test response.',
        })),
      };
    }
    return this.request<QuizAttemptResponse>(
      `/quizzes/${quizId}/attempts`,
      {
        method: 'POST',
        body: JSON.stringify(attempt),
      },
      idempotencyKey
    );
  }

  public async getProgress(): Promise<PaginatedList<ProgressItem>> {
    if (this.fixtureMode) {
      return {
        items: [
          {
            lesson_id: 'cd-basics',
            quiz_version: 1,
            attempt_count: 1,
            best_score_pct: '100.00',
            latest_score_pct: '100.00',
            completed: true,
          },
        ],
      };
    }
    return this.request<PaginatedList<ProgressItem>>('/progress');
  }

  public async sendTutorMessage(data: TutorMessageRequest): Promise<TutorMessageResponse> {
    if (this.fixtureMode) {
      if (data.message.includes('SIMULATE_503')) {
        throw new ApiError(503, 'tutor_unavailable', 'AI tutor is currently unavailable. Educational curriculum is available.');
      }
      if (data.message.includes('SIMULATE_429')) {
        throw new ApiError(429, 'rate_limit_exceeded', 'Tutor request rate limit exceeded. Please wait a moment before sending another query.');
      }
      if (data.simulation_id) {
        // Contract requirement: When simulation_id is supplied, deterministic curriculum mode is enforced (0 LLM calls)
        const lower = data.message.toLowerCase();
        let reply = 'In curriculum mode, queries are resolved against verified financial definitions without external LLM inference to protect against simulation lookahead.';
        let sources = ['https://www.investor.gov', 'https://www.sec.gov'];

        if (lower.includes('compound') || lower.includes('interest')) {
          reply = 'Compound interest is interest calculated on both initial principal and accumulated interest. In our monthly calculator, monthly rate i = (1 + r)^(1/12) - 1 is compounded monthly.';
          sources = ['https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator'];
        } else if (lower.includes('etf')) {
          reply = 'An Exchange-Traded Fund (ETF) pools capital to invest in a basket of stocks or bonds and trades like a common stock on an exchange throughout the trading day.';
          sources = ['https://www.investor.gov/introduction-investing/investing-basics/investment-products/mutual-funds-and-exchange-traded-1'];
        } else if (lower.includes('order') || lower.includes('open') || lower.includes('execution')) {
          reply = 'Orders submitted in this simulation fill at the next session OPEN price to model realistic overnight price gaps and market availability.';
          sources = ['https://www.sec.gov/fast-answers/answersmktorderhtm.html'];
        } else if (lower.includes('cost') || lower.includes('basis') || lower.includes('pnl')) {
          reply = 'Weighted-average cost basis sums total acquisition cost divided by total shares. When partially sold, remaining cost basis is allocated proportionally; on final sale, all remaining cost is allocated to prevent rounding drift.';
          sources = ['https://www.irs.gov/publications/p550'];
        }

        return {
          reply,
          mode: 'curriculum',
          source_links: sources,
        };
      }

      // General Educational AI Mode
      return {
        reply:
          'Educational AI Tutor: Financial concepts, market mechanics, and savings strategies are explained here for learning. Notice: I cannot provide personalized buy/sell advice or forecast future stock prices.',
        mode: 'ai',
        source_links: ['https://www.investor.gov/introduction-investing/investing-basics'],
      };
    }
    return this.request<TutorMessageResponse>('/tutor/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const defaultApiClient = new ApiClient();

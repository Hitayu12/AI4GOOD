import { useState, useEffect } from 'react';
import { Card } from './components/common/Card';
import { Button } from './components/common/Button';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { defaultApiClient } from './api/client';
import { CalculatorView } from './features/calculators/CalculatorView';
import { LearningView } from './features/learning/LearningView';
import { SimulationView } from './features/simulation';
import { TradingView } from './features/trading';
import { PortfolioView } from './features/portfolio';
import { TutorView } from './features/tutor';
import { NotificationProvider, NotificationCenter, useNotifications } from './features/notifications';
import { AuthModal } from './components/auth/AuthModal';
import { User } from './api/types';

function AppContent() {
  const [healthStatus, setHealthStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [fixtureMode, setFixtureMode] = useState<boolean>(defaultApiClient.fixtureMode);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'trading' | 'simulation' | 'learning' | 'calculator' | 'tutor' | 'status'>('portfolio');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showAudienceGuide, setShowAudienceGuide] = useState(false);
  const { notify } = useNotifications();

  useEffect(() => {
    checkHealth();
  }, [fixtureMode]);

  const checkHealth = async () => {
    setHealthStatus('checking');
    setErrorMessage(null);
    try {
      const res = await defaultApiClient.getHealth();
      if (res.status === 'ok') {
        setHealthStatus('ok');
        notify({
          type: 'info',
          title: 'System Healthy',
          message: 'Connected to API boundary successfully.',
          autoDismiss: true,
          dismissDuration: 2500,
          dedupeKey: 'health_check_ok',
        });
      } else {
        setHealthStatus('error');
      }
    } catch (err: unknown) {
      setHealthStatus('error');
      const msg = err instanceof Error ? err.message : 'Unknown connection error';
      setErrorMessage(msg);
      notify({
        type: 'error',
        title: 'Connection Error',
        message: msg,
        persistent: true,
        dedupeKey: 'health_check_error',
      });
    }
  };

  const toggleFixtureMode = () => {
    const nextMode = !fixtureMode;
    setFixtureMode(nextMode);
    defaultApiClient.setFixtureMode(nextMode);
    notify({
      type: 'info',
      title: 'Mode Changed',
      message: nextMode ? 'Switched to Contract Fixture Mode' : 'Switched to Live API Mode',
      autoDismiss: true,
      dismissDuration: 3000,
      dedupeKey: `mode_toggle_${nextMode}`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/40 text-slate-900 flex flex-col relative selection:bg-blue-600 selection:text-white">
      {/* Decorative ambient background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      <NotificationCenter position="top-right" />

      {/* Top Notification / Fixture Banner */}
      {fixtureMode && (
        <aside
          role="status"
          aria-label="Development Fixture Mode Notice"
          className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-1.5 text-center text-xs font-semibold shadow-xs flex items-center justify-center gap-2 z-20 relative"
        >
          <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
          <span>DEVELOPMENT FIXTURE MODE ACTIVE — Emulating verified API contract responses</span>
        </aside>
      )}

      {/* Elevated Modern Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-md sticky top-0 z-20 shadow-md text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-4">
            {/* Brand Logo & Name */}
            <div className="flex items-center space-x-3 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-sm shadow-md ring-1 ring-white/20">
                AI
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black tracking-tight text-white leading-none">
                    Rutgers AI4Good 2026
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Features &amp; Integration — Kiran</p>
              </div>
            </div>

            {/* Main Navigation Tabs */}
            <nav aria-label="Main Navigation" className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 overflow-x-auto max-w-full scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('portfolio')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'portfolio'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>📊</span>
                <span>Portfolio (Phase 6)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('trading')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'trading'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>⚡</span>
                <span>Paper Trading (Phase 5)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('simulation')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'simulation'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>⏳</span>
                <span>Simulation (Phase 4)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('learning')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'learning'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>📚</span>
                <span>Lessons &amp; Quizzes (Phase 3)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('calculator')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'calculator'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>🧮</span>
                <span>Calculators (Phase 2)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tutor')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'tutor'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>🤖</span>
                <span>AI Tutor (Phase 8)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('status')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'status'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>🩺</span>
                <span>System Status</span>
              </button>
            </nav>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={toggleFixtureMode}
                aria-pressed={fixtureMode}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                  fixtureMode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${fixtureMode ? 'bg-amber-400' : 'bg-slate-500'}`} />
                <span>{fixtureMode ? 'Live API' : 'Fixtures'}</span>
              </button>

              {currentUser ? (
                <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-xl">
                  <span className="text-xs font-semibold text-slate-200">
                    👤 {currentUser.email}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await defaultApiClient.logout();
                      setCurrentUser(null);
                      notify({
                        type: 'info',
                        title: 'Signed Out',
                        message: 'Session token cleared from memory.',
                      });
                    }}
                    aria-label="Sign out"
                    className="text-xs py-0.5 px-2 bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600"
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAuthModalOpen(true)}
                  aria-label="Sign In (S4)"
                  className="shadow-sm font-semibold"
                >
                  Sign In (S4)
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modern Sub-Header Feature Highlights Bar */}
      <section className="bg-white/80 border-b border-slate-200/80 backdrop-blur-xs py-2 px-4 shadow-2xs z-10 relative">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600 font-medium">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-blue-900 font-semibold">
              <span className="text-blue-600 font-bold">🛡️</span> Zero-Lookahead Engine
            </span>
            <span className="hidden md:inline text-slate-300">|</span>
            <span className="flex items-center gap-1.5 text-emerald-900 font-semibold">
              <span className="text-emerald-600 font-bold">📈</span> 15 Multi-Sector S&amp;P 500 Symbols
            </span>
            <span className="hidden md:inline text-slate-300">|</span>
            <span className="flex items-center gap-1.5 text-indigo-900 font-semibold">
              <span className="text-indigo-600 font-bold">🎓</span> 80% Mastery Threshold Quizzes
            </span>
            <span className="hidden md:inline text-slate-300">|</span>
            <span className="flex items-center gap-1.5 text-purple-900 font-semibold">
              <span className="text-purple-600 font-bold">♿</span> WCAG 2.1 AA Accessible
            </span>
          </div>
          <div className="text-slate-400 text-[10px]">
            Accessible Educational Simulator
          </div>
        </div>
      </section>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Audience & Platform Guide Showcase Banner */}
        <section aria-label="Platform Mission & Audience Guide" className="mb-8">
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-500/30 relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-indigo-800/60">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 tracking-wide uppercase">
                      Financial Literacy &amp; Inclusion Sandbox
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      100% Zero Financial Risk
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
                    Zero-Risk Educational Paper Trading &amp; Market Simulator
                  </h2>
                  <p className="text-sm text-slate-300 max-w-3xl leading-relaxed mt-1">
                    Empowering students, first-generation investors, and everyday learners. Master compound interest, test trading strategies across historical market cycles without future data leakage, and build wealth-building confidence before ever risking real money.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAudienceGuide((prev) => !prev)}
                  className="self-start sm:self-center text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 whitespace-nowrap"
                  aria-expanded={showAudienceGuide}
                >
                  <span>{showAudienceGuide ? 'Hide Audience Guide' : 'Show Audience Guide'}</span>
                  <span>{showAudienceGuide ? '▲' : '▼'}</span>
                </button>
              </div>

              {showAudienceGuide && (
                <div className="pt-6 space-y-6">
                  {/* The Problem vs The Solution Bar */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-800/70 rounded-2xl p-4 border border-rose-500/20">
                      <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider mb-1">
                        <span>⚠️</span> The Problem We Solve
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Over 60% of young adults lack foundational financial literacy and avoid long-term investing out of intimidation, or risk hard-earned savings on speculative assets without understanding volatility, compound math, or drawdown risk.
                      </p>
                    </div>

                    <div className="bg-slate-800/70 rounded-2xl p-4 border border-emerald-500/20">
                      <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wider mb-1">
                        <span>💡</span> How This Platform Works
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        A fully integrated, gamified educational sandbox with 5 hands-on stages: bite-sized lessons, compound growth calculators, zero-lookahead historical session replay, paper trading across 15 stocks &amp; ETFs (Tech, Healthcare, Financials, Consumer Staples, Energy), and real-time portfolio analytics.
                      </p>
                    </div>
                  </div>

                  {/* 5-Step Audience Tour / Interactive Jump Buttons */}
                  <div>
                    <h3 className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-3">
                      Interactive Audience Tour — Select Any Step Below:
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setActiveTab('learning')}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          activeTab === 'learning'
                            ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                            : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="text-lg mb-1">📚</div>
                        <div className="text-xs font-bold">1. Learn</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Lessons &amp; Quizzes</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('calculator')}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          activeTab === 'calculator'
                            ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                            : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="text-lg mb-1">🧮</div>
                        <div className="text-xs font-bold">2. Calculate</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Compound APY &amp; CDs</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('simulation')}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          activeTab === 'simulation'
                            ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                            : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="text-lg mb-1">⏳</div>
                        <div className="text-xs font-bold">3. Simulate</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Historical Time-Travel</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('trading')}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          activeTab === 'trading'
                            ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                            : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="text-lg mb-1">⚡</div>
                        <div className="text-xs font-bold">4. Paper Trade</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">15 Multi-Sector Stocks</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('portfolio')}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          activeTab === 'portfolio'
                            ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                            : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="text-lg mb-1">📊</div>
                        <div className="text-xs font-bold">5. Portfolio</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Live Equity Curves</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('tutor')}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          activeTab === 'tutor'
                            ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                            : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="text-lg mb-1">🤖</div>
                        <div className="text-xs font-bold">6. AI Tutor</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Safe Guided Q&amp;A</div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {activeTab === 'portfolio' ? (
          <PortfolioView />
        ) : activeTab === 'trading' ? (
          <TradingView />
        ) : activeTab === 'simulation' ? (
          <SimulationView />
        ) : activeTab === 'learning' ? (
          <LearningView />
        ) : activeTab === 'calculator' ? (
          <CalculatorView />
        ) : activeTab === 'tutor' ? (
          <TutorView />
        ) : (
          <div className="max-w-xl mx-auto space-y-6">
            <Card title="System &amp; Transport Status" subtitle="API connection &amp; transport boundary">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Mode:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-xs ${
                      fixtureMode ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {fixtureMode ? 'Contract Fixture' : 'Live Endpoint'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">API Health:</span>
                  <span className="flex items-center gap-1.5 font-medium text-xs">
                    {healthStatus === 'checking' && (
                      <span className="text-slate-500">Checking...</span>
                    )}
                    {healthStatus === 'ok' && (
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Healthy (200 OK)
                      </span>
                    )}
                    {healthStatus === 'error' && (
                      <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                        Unavailable
                      </span>
                    )}
                  </span>
                </div>

                {errorMessage && (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    {errorMessage}
                  </p>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={checkHealth}
                  disabled={healthStatus === 'checking'}
                >
                  Refresh Health Check
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Modern Footer */}
      <footer className="border-t border-slate-200/80 bg-white/70 backdrop-blur-xs py-6 mt-12 relative z-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="font-semibold text-slate-700">Financial Literacy Platform</span>
            <span>— Accessible Education &amp; Paper Trading</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Features: Kiran</span>
            <span>•</span>
            <span>Backend: Siddh Jain</span>
            <span>•</span>
            <span>Educational Use Only</span>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          notify({
            type: 'success',
            title: 'Authenticated',
            message: `Welcome, ${user.email}! Session token active.`,
          });
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;

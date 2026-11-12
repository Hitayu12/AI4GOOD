import { useState, useEffect } from 'react';
import { Card } from './components/common/Card';
import { Button } from './components/common/Button';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { defaultApiClient } from './api/client';
import { HomeView } from './features/home/HomeView';
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
  const [activeTab, setActiveTab] = useState<'home' | 'portfolio' | 'trading' | 'simulation' | 'learning' | 'calculator' | 'tutor' | 'status'>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-md sticky top-0 z-20 shadow-md text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-4">
            {/* Brand Logo & Professional Title */}
            <div className="flex items-center space-x-3 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-teal-400 flex items-center justify-center text-white font-black text-sm shadow-md ring-1 ring-white/20">
                <span className="tracking-tighter">AI</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-black tracking-tight text-white leading-tight">
                    Rutgers AI4Good 2026
                  </h1>
                  <span className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <span className="text-blue-400 font-semibold">FINTECH LAB</span>
                  <span>•</span>
                  <span>Features &amp; Integration — Kiran</span>
                </div>
              </div>
            </div>

            {/* Main Navigation Tabs - Compact, Professional & No Scrollbar */}
            <nav aria-label="Main Navigation" className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                aria-label="Home Overview"
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 whitespace-nowrap ${
                  activeTab === 'home'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold ring-1 ring-blue-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>🏠</span>
                <span>Home</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('portfolio')}
                aria-label="Portfolio (Phase 6)"
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 whitespace-nowrap ${
                  activeTab === 'portfolio'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold ring-1 ring-blue-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>📊</span>
                <span>Portfolio</span>
                <span className="sr-only"> (Phase 6)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('trading')}
                aria-label="Paper Trading (Phase 5)"
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 whitespace-nowrap ${
                  activeTab === 'trading'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold ring-1 ring-blue-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>⚡</span>
                <span>Trading</span>
                <span className="sr-only"> (Phase 5)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('simulation')}
                aria-label="Simulation (Phase 4)"
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 whitespace-nowrap ${
                  activeTab === 'simulation'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold ring-1 ring-blue-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>⏳</span>
                <span>Simulation</span>
                <span className="sr-only"> (Phase 4)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('learning')}
                aria-label="Lessons & Quizzes (Phase 3)"
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 whitespace-nowrap ${
                  activeTab === 'learning'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold ring-1 ring-blue-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>📚</span>
                <span>Learn</span>
                <span className="sr-only"> (Phase 3)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('calculator')}
                aria-label="Calculators (Phase 2)"
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 whitespace-nowrap ${
                  activeTab === 'calculator'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold ring-1 ring-blue-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>🧮</span>
                <span>Calculators</span>
                <span className="sr-only"> (Phase 2)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tutor')}
                aria-label="AI Tutor (Phase 8)"
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 whitespace-nowrap ${
                  activeTab === 'tutor'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold ring-1 ring-blue-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>🤖</span>
                <span>AI Tutor</span>
                <span className="sr-only"> (Phase 8)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('status')}
                aria-label="System Status"
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 whitespace-nowrap ${
                  activeTab === 'status'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold ring-1 ring-blue-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>🩺</span>
                <span>Status</span>
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {activeTab === 'home' ? (
          <HomeView onNavigateTab={(tab) => setActiveTab(tab)} />
        ) : activeTab === 'portfolio' ? (
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

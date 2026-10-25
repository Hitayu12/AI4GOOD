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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <NotificationCenter position="top-right" />

      {/* Top Notification / Fixture Banner */}
      {fixtureMode && (
        <aside
          role="status"
          aria-label="Development Fixture Mode Notice"
          className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-center text-xs font-semibold text-amber-900 flex items-center justify-center gap-2"
        >
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>DEVELOPMENT FIXTURE MODE ACTIVE — Emulating API contract responses</span>
        </aside>
      )}

      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              AI
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-none">Rutgers AI4Good 2026</h1>
              <p className="text-xs text-slate-500 mt-0.5">Features &amp; Integration — Kiran</p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('portfolio')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'portfolio' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Portfolio (Phase 6)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trading')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'trading' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paper Trading (Phase 5)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('simulation')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'simulation' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Simulation (Phase 4)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('learning')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'learning' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lessons &amp; Quizzes (Phase 3)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('calculator')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'calculator' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Calculators (Phase 2)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tutor')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'tutor' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AI Tutor (Phase 8)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('status')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'status' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              System Status
            </button>
            <Button
              variant={fixtureMode ? 'secondary' : 'outline'}
              size="sm"
              onClick={toggleFixtureMode}
              aria-pressed={fixtureMode}
            >
              {fixtureMode ? 'Live API' : 'Fixtures'}
            </Button>
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
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
              >
                Sign In (S4)
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

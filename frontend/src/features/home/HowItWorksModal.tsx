import { useState, useEffect } from 'react';

export interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (
    tab: 'home' | 'portfolio' | 'trading' | 'simulation' | 'learning' | 'calculator' | 'tutor' | 'status'
  ) => void;
}

export function HowItWorksModal({ isOpen, onClose, onNavigateTab }: HowItWorksModalProps) {
  const [activeStep, setActiveStep] = useState<number>(0);

  // Close on ESC key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const STEPS = [
    {
      stepNum: 1,
      id: 'learning' as const,
      icon: '📚',
      title: 'Step 1: Learn the Financial Fundamentals',
      timeEst: '2 Mins',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      headline: 'Understand where cash belongs vs. where growth investments belong.',
      explanation:
        'Financial literacy starts with separating short-term safety from long-term wealth. Explore interactive lessons covering High-Yield Savings Accounts (HYSA), Certificates of Deposit (CD), Stocks, and Index ETFs. Complete 80% passing quizzes to lock in the knowledge.',
      keyRule: 'Golden Rule: Never invest money you need in the next 12 months into volatile stocks.',
      actionText: 'Start Step 1: Open Lessons & Quizzes',
      colorGradient: 'from-blue-600 to-indigo-600',
    },
    {
      stepNum: 2,
      id: 'calculator' as const,
      icon: '🧮',
      title: 'Step 2: Model Compound Interest & Yields',
      timeEst: '1 Min',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      headline: 'See how compounding multiplies your wealth without taking market risks.',
      explanation:
        'Use the High-Yield Savings & CD Calculator to model monthly deposits, compounding frequencies, and early withdrawal penalties. Discover how a 5.0% APY turns idle cash into real passive earnings.',
      keyRule: 'Pro Tip: Compound interest is interest earned on top of previous interest — time is your biggest asset.',
      actionText: 'Go to Step 2: Open Compound Calculator',
      colorGradient: 'from-purple-600 to-pink-600',
    },
    {
      stepNum: 3,
      id: 'simulation' as const,
      icon: '⏳',
      title: 'Step 3: Practice with Historical Simulations',
      timeEst: '3 Mins',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      headline: 'Experience market cycles session-by-session with zero capital risk.',
      explanation:
        'Step through real historical market sessions from 2024. Our zero-lookahead engine prevents future price leakage, allowing you to queue buy and sell orders, advance the clock, and see authentic execution fills.',
      keyRule: 'Simulation Rule: Orders queue in pending status and fill at the upcoming session OPEN price.',
      actionText: 'Go to Step 3: Try Historical Simulation',
      colorGradient: 'from-amber-600 to-orange-600',
    },
    {
      stepNum: 4,
      id: 'trading' as const,
      icon: '⚡',
      title: 'Step 4: Live Day Trading with Yahoo Finance',
      timeEst: 'Real-Time',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      headline: 'Trade real-time market prices with live streaming data and instant fills.',
      explanation:
        'Head to the Trading tab and flip the toggle to "Live Day Trading". You will see live prices, bid/ask spreads, and intraday volume streaming from Yahoo Finance across 15 multi-sector stocks and ETFs. Place whole-share orders with instant cash settlement.',
      keyRule: 'Day Trading Rule: Use Quick-Quantity presets (+1, +5, +10, Max) to test rapid execution without real money.',
      actionText: 'Go to Step 4: Launch Live Day Trading',
      colorGradient: 'from-emerald-600 to-teal-600',
    },
    {
      stepNum: 5,
      id: 'portfolio' as const,
      icon: '📊',
      title: 'Step 5: Monitor Total Equity & Portfolio Health',
      timeEst: 'Ongoing',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
      headline: 'Review your virtual net worth, asset allocation, and profit & loss.',
      explanation:
        'The Portfolio Analytics tab tracks your total account equity, cash reserves, open positions marked to current prices, and transaction history. Watch how diversification across technology, healthcare, financials, and staples dampens volatility.',
      keyRule: 'Portfolio Target: Strive for a diversified mix that matches your risk tolerance.',
      actionText: 'Go to Step 5: View Portfolio Analytics',
      colorGradient: 'from-sky-600 to-blue-700',
    },
  ];

  const current = STEPS[activeStep];

  const handleActionClick = () => {
    onNavigateTab(current.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        role="dialog"
        aria-modal="true"
        aria-label="How This Platform Works Guide"
      >
        {/* Modal Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 border-b border-slate-800">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
                  🚀 Quick Start Guide
                </span>
                <span className="text-xs text-slate-400">• Step {current.stepNum} of {STEPS.length}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Where to Start &amp; How This Works
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-normal">
                Follow this 5-stage progression to go from complete beginner to placing live market orders.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close guide"
              className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition-colors border border-slate-700 shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Step Pill Navigation Ribbon */}
          <div className="flex items-center gap-1.5 mt-5 overflow-x-auto pb-1 scrollbar-none">
            {STEPS.map((s, idx) => (
              <button
                key={s.stepNum}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeStep === idx
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-white/30'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                <span>{s.icon}</span>
                <span>Stage {s.stepNum}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body: Active Step Detail */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white text-2xl flex items-center justify-center shadow-md">
                {current.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  {current.title}
                </h3>
                <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded border ${current.badgeColor}`}>
                  Estimated Time: {current.timeEst}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-800 leading-snug">
              {current.headline}
            </p>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {current.explanation}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/70 to-slate-50 border border-blue-200/80 text-xs text-blue-950 flex items-start gap-2.5">
            <span className="text-base">💡</span>
            <div className="leading-relaxed font-medium">
              {current.keyRule}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={activeStep === 0}
              onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            <button
              type="button"
              disabled={activeStep === STEPS.length - 1}
              onClick={() => setActiveStep((prev) => Math.min(STEPS.length - 1, prev + 1))}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next Step →
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={handleActionClick}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r ${current.colorGradient} text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:opacity-95 flex items-center justify-center gap-2`}
            >
              <span>{current.actionText}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

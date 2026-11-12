import { useEffect, useId } from 'react';

export type AppTab =
  | 'home'
  | 'portfolio'
  | 'trading'
  | 'simulation'
  | 'learning'
  | 'calculator'
  | 'tutor'
  | 'status';

export interface TabOverviewData {
  title: string;
  tabName: string;
  subtitle: string;
  emoji: string;
  tag: string;
  headerGradient: string;
  badgeStyle: string;
  summary: string;
  whyItMatters: string;
  highlights: Array<{
    icon: string;
    title: string;
    desc: string;
  }>;
  proTip: string;
  primaryActionLabel: string;
}

export const TAB_OVERVIEWS: Record<AppTab, TabOverviewData> = {
  home: {
    title: 'Youth FinTech Command Center',
    tabName: 'Home',
    subtitle: 'Zero-risk launchpad, streak rewards, and relatable stock spotlights',
    emoji: '🏠',
    tag: 'MISSION CONTROL',
    headerGradient: 'from-blue-600 via-indigo-600 to-teal-500',
    badgeStyle: 'bg-blue-100 text-blue-900 border-blue-300',
    summary:
      'Home is your central mission control. Check your trading level and streaks, explore recognizable stocks (Apple, Tesla, Nvidia), calculate boba drink compounding, and launch into lessons or live trading.',
    whyItMatters:
      'Instead of dry banking jargon, Home gives you instant clarity on how money really works and what to do next with zero capital risk.',
    highlights: [
      {
        icon: '⭐',
        title: 'Level & Streak Tracker',
        desc: 'Earn XP, advance from Rookie Trader to Market Veteran, and build your daily financial study streak.',
      },
      {
        icon: '🧋',
        title: 'Boba Math & Money Hacks',
        desc: 'Relatable breakdowns showing how skipping one $6 drink a week snowballs into $15,000+ by age 30.',
      },
      {
        icon: '🛍️',
        title: 'Household Brand Spotlight',
        desc: 'Quick prices and stats for 15 relatable companies (iPhones, EVs, GPUs, Burgers, and S&P 500 ETFs).',
      },
      {
        icon: '🗺️',
        title: '5-Stage Learning Pathway',
        desc: 'A guided, step-by-step progression from basic savings to live market executions.',
      },
    ],
    proTip:
      'Check the Boba Math tip before placing your first trade—understanding why index ETFs beat meme stock gambling is the best cheat code in personal finance!',
    primaryActionLabel: 'Explore Home Command Center',
  },

  portfolio: {
    title: 'Live Equity & Performance Tracker',
    tabName: 'Portfolio',
    subtitle: 'Track your net worth, holdings, cash cushion, and total returns',
    emoji: '📊',
    tag: 'BALANCE SHEET',
    headerGradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    badgeStyle: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    summary:
      'The Portfolio tab is your personal financial balance sheet. See your total net worth, your liquid cash balance, what stocks you currently own, and whether your investments are in profit or loss in real time.',
    whyItMatters:
      'Knowing your total equity and asset allocation prevents you from putting all your eggs in one basket or running out of emergency cash.',
    highlights: [
      {
        icon: '💼',
        title: 'Total Net Equity',
        desc: 'Your true account liquidation value: combines liquid cash plus the live market value of all held stocks.',
      },
      {
        icon: '📈',
        title: 'Zero-Leakage Equity Curve',
        desc: 'Interactive historical balance chart showing your growth over time without peeking into future data.',
      },
      {
        icon: '🏷️',
        title: 'Itemized Holdings Table',
        desc: 'Inspect each stock you own: purchase price, current quote, shares count, and unrealized profit or loss.',
      },
      {
        icon: '♿',
        title: 'Accessible Gain/Loss Badges',
        desc: 'Explicit plus/minus signs and distinct shapes ensure gains and losses are never communicated by color alone.',
      },
    ],
    proTip:
      'Always watch your Cash Balance! Leaving a cash cushion allows you to buy great stocks at a discount during sudden market dips.',
    primaryActionLabel: 'View My Portfolio',
  },

  trading: {
    title: 'Live Market & Paper Trading',
    tabName: 'Trading',
    subtitle: 'Practice buying and selling stocks with $10,000 virtual cash',
    emoji: '⚡',
    tag: 'EXECUTION DESK',
    headerGradient: 'from-violet-600 via-purple-600 to-indigo-600',
    badgeStyle: 'bg-purple-100 text-purple-900 border-purple-300',
    summary:
      'The Trading tab gives you hands-on experience placing buy and sell orders. Trade with live Yahoo Finance prices or 2024 historical market sessions, complete with instant fill receipts and XP level-ups.',
    whyItMatters:
      'You get to feel the excitement of real stock trading and build market intuition without risking a single dollar of your real money.',
    highlights: [
      {
        icon: '⚡',
        title: 'Dual Trading Modes',
        desc: 'Switch anytime between Live Day Trading (Yahoo real-time stream) and Historical Simulation (2024 daily sessions).',
      },
      {
        icon: '🎉',
        title: 'Celebratory Fill Popups',
        desc: 'Instant trade confirmation receipts with fill price, total value, and +50 XP badges whenever you buy or sell.',
      },
      {
        icon: '🛡️',
        title: 'No Short-Selling Guardrails',
        desc: 'Built-in protection prevents buying without sufficient cash or selling shares you do not own.',
      },
      {
        icon: '📋',
        title: 'Audit-Ready History',
        desc: 'Full transaction log and order history with timestamps and execution prices.',
      },
    ],
    proTip:
      'Start by buying 1 share of SPY (S&P 500 ETF) first. Notice how broad index funds provide steady growth compared to volatile individual tech stocks!',
    primaryActionLabel: 'Start Trading Now',
  },

  simulation: {
    title: 'Historical Market Time Machine',
    tabName: 'Simulation',
    subtitle: 'Replay 2024 S&P 500 cycles day-by-day with zero data leakage',
    emoji: '⏳',
    tag: 'TIME ENGINE',
    headerGradient: 'from-indigo-600 via-blue-600 to-slate-800',
    badgeStyle: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    summary:
      'The Simulation tab is a market time machine. Step through real 2024 historical market sessions day-by-day to test how your portfolio survives economic cycles and market pullbacks.',
    whyItMatters:
      'Anyone can look at a finished chart, but navigating day-by-day without knowing tomorrow’s news teaches real risk management.',
    highlights: [
      {
        icon: '🛡️',
        title: 'Zero-Lookahead Isolation',
        desc: 'Strict price isolation ensures you cannot see future bars or cheat the backtest.',
      },
      {
        icon: '📅',
        title: 'Time Cursor Control',
        desc: 'Advance one day at a time, inspect opening/closing prices, and watch your portfolio react.',
      },
      {
        icon: '📊',
        title: 'Candlestick & Volume Charts',
        desc: 'Interactive OHLC charts and trading volume data across 15 major S&P 500 instruments.',
      },
      {
        icon: '🔄',
        title: 'Multiple Sandbox Runs',
        desc: 'Create new simulations with custom starting cash balances to test different budget sizes.',
      },
    ],
    proTip:
      'Practice holding through a 3-day market pullback without panic-selling—learning emotional discipline in simulation saves you thousands in real life!',
    primaryActionLabel: 'Launch Historical Simulation',
  },

  learning: {
    title: '2-Minute Lessons & 80% Mastery Quizzes',
    tabName: 'Learn',
    subtitle: 'Master HYSAs, CDs, ETFs, Stocks, and Global Market Strategies',
    emoji: '📚',
    tag: 'ACADEMY',
    headerGradient: 'from-amber-500 via-orange-500 to-rose-500',
    badgeStyle: 'bg-amber-100 text-amber-900 border-amber-300',
    summary:
      'The Learn tab breaks down personal finance and investing into bite-sized 2-minute visual lessons. Master foundational assets, explore US vs. EU strategies, and prove your skills with 80% passing quizzes.',
    whyItMatters:
      'Schools rarely teach how high-yield savings or the stock market work. This curriculum gives you an unfair advantage before you graduate.',
    highlights: [
      {
        icon: '📖',
        title: '5 Starter Topics',
        desc: 'Step-by-step guides on High-Yield Savings (HYSA), Certificates of Deposit (CD), Equities, ETFs, and Options.',
      },
      {
        icon: '🌐',
        title: 'US vs. EU Strategies Lab',
        desc: 'Compare American 401(k)/Roth IRAs against European UCITS and state pension systems.',
      },
      {
        icon: '👥',
        title: 'Real-World Case Studies',
        desc: 'Interactive student and early-career scenarios showing tactical financial decisions.',
      },
      {
        icon: '🎓',
        title: '80% Mastery Quizzes',
        desc: 'Interactive knowledge checks with instant explanations and completion badges for scoring 80% or higher.',
      },
    ],
    proTip:
      'Finish the HYSA lesson first! It shows you how opening a high-yield savings account pays you free guaranteed passive income every single month.',
    primaryActionLabel: 'Start First Lesson',
  },

  calculator: {
    title: 'Compound APY & Boba Math Lab',
    tabName: 'Calculators',
    subtitle: 'Model exponential interest, monthly savings, and CD early break penalties',
    emoji: '🧮',
    tag: 'FINANCIAL MATH',
    headerGradient: 'from-teal-600 via-cyan-600 to-blue-600',
    badgeStyle: 'bg-teal-100 text-teal-900 border-teal-300',
    summary:
      'The Calculators tab reveals the superpower of compound interest. Plug in your own numbers to see how monthly deposits snowball over time, or simulate CD early withdrawal penalties.',
    whyItMatters:
      'Albert Einstein called compound interest the eighth wonder of the world. Seeing the curve bend upward shows why starting in your teens makes you rich.',
    highlights: [
      {
        icon: '📈',
        title: 'Savings & Investment Modes',
        desc: 'Toggle between guaranteed fixed APY (HYSA/CDs) and compounding index growth (S&P 500 ETFs).',
      },
      {
        icon: '🧋',
        title: 'Boba to Wealth Preset',
        desc: 'One-click preset modeling how saving $150/month turns into massive compound growth over 10 years.',
      },
      {
        icon: '🚨',
        title: 'CD Penalty Simulator',
        desc: 'Calculates the real forfeiture penalty (90 to 180 days of interest) if you unlock a CD before maturity.',
      },
      {
        icon: '📊',
        title: 'Principal vs. Interest Breakdown',
        desc: 'Visual chart comparing your original cash deposits against pure compound interest generated.',
      },
    ],
    proTip:
      'Notice how the interest graph shoots up after year 5! In compound growth, time is your greatest asset—starting at 16 vs 26 makes an enormous difference.',
    primaryActionLabel: 'Explore Calculators',
  },

  tutor: {
    title: '24/7 Jargon-Free AI Financial Mentor',
    tabName: 'AI Tutor',
    subtitle: 'Ask any investing question and get instant beginner-friendly explanations',
    emoji: '🤖',
    tag: 'AI MENTOR',
    headerGradient: 'from-fuchsia-600 via-purple-600 to-indigo-600',
    badgeStyle: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300',
    summary:
      'The AI Tutor is your personal financial coach. Whenever you run into a confusing term (like expense ratio, dividend yield, or dollar-cost averaging), ask the tutor for a quick, relatable breakdown.',
    whyItMatters:
      'Never feel dumb asking questions. The AI Tutor explains concepts in plain English with relatable examples and zero judgment.',
    highlights: [
      {
        icon: '💬',
        title: 'Plain-English Explanations',
        desc: 'Translates confusing Wall Street jargon into clear concepts a high schooler or college student understands.',
      },
      {
        icon: '⚡',
        title: 'Quick Prompt Suggestions',
        desc: 'One-click starter buttons like "Explain HYSA vs CD", "What is an ETF?", or "Why do stock prices move?".',
      },
      {
        icon: '🔗',
        title: 'Verified Official Citations',
        desc: 'Direct reference links to trusted investor resources from the SEC and Investor.gov.',
      },
      {
        icon: '🛡️',
        title: 'Safe Educational Guardrails',
        desc: 'Focuses purely on financial literacy and learning—never pushes speculative stocks or risky bets.',
      },
    ],
    proTip:
      'If you get a quiz question wrong in the Learn tab, paste it to the AI Tutor to understand the reasoning before trying again!',
    primaryActionLabel: 'Chat with AI Tutor',
  },

  status: {
    title: 'System & Transport Diagnostics',
    tabName: 'Status',
    subtitle: 'Check API latency, server connectivity, and contract fixture modes',
    emoji: '🩺',
    tag: 'DIAGNOSTICS',
    headerGradient: 'from-slate-700 via-slate-800 to-zinc-900',
    badgeStyle: 'bg-slate-200 text-slate-900 border-slate-300',
    summary:
      'The Status tab displays the real-time technical health of the application. Check backend API connection latency, verify transport boundaries, or toggle between mock contract fixtures and live endpoints.',
    whyItMatters:
      'Shows full transparency on system uptime, data transport boundaries, and offline testing capabilities.',
    highlights: [
      {
        icon: '🟢',
        title: 'API Health Probe',
        desc: 'Instant 200 OK ping verifying that the frontend and backend are communicating without errors.',
      },
      {
        icon: '🔀',
        title: 'Contract Fixture Mode',
        desc: 'Toggle between offline mock data fixtures and live server endpoints for robust contract verification.',
      },
      {
        icon: '🛡️',
        title: 'Transport Fallback',
        desc: 'Automatic error boundary and graceful degradation when offline or experiencing network drops.',
      },
      {
        icon: '⏱️',
        title: 'Latency Monitoring',
        desc: 'Monitor health check response times and protocol status.',
      },
    ],
    proTip:
      'If you are testing without internet access, toggle on "Contract Fixture Mode" in the top bar to run the complete platform offline!',
    primaryActionLabel: 'Check System Status',
  },
};

export interface TabOverviewModalProps {
  tab: AppTab;
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: AppTab) => void;
}

export function TabOverviewModal({
  tab,
  isOpen,
  onClose,
  onNavigateTab,
}: TabOverviewModalProps) {
  const titleId = useId();
  const descId = useId();

  // Close on Escape key
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

  const data = TAB_OVERVIEWS[tab] || TAB_OVERVIEWS.home;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
      >
        {/* Dynamic Gradient Header */}
        <div className={`p-6 sm:p-7 bg-gradient-to-r ${data.headerGradient} text-white relative`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner border border-white/20">
                {data.emoji}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                    {data.tag}
                  </span>
                  <span className="text-xs text-white/80 font-medium">Tab Overview</span>
                </div>
                <h3 id={titleId} className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                  {data.tabName}: {data.title}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close tab overview popup"
              className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/15 transition-colors focus:outline-none focus:ring-2 focus:ring-white shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs sm:text-sm text-white/90 mt-2 font-medium max-w-xl">
            {data.subtitle}
          </p>
        </div>

        {/* Modal Body */}
        <div id={descId} className="p-6 sm:p-7 overflow-y-auto space-y-6 text-slate-700">
          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              💡 What is this tab?
            </h4>
            <p className="text-sm font-semibold text-slate-900 leading-relaxed">
              {data.summary}
            </p>
            <p className="text-xs text-slate-600 leading-relaxed pt-1 border-t border-slate-200/60">
              <strong>Why it matters for teens &amp; students:</strong> {data.whyItMatters}
            </p>
          </div>

          {/* Key Highlights Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              ✨ Key Things You Can Do Here:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.highlights.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <h5 className="text-xs font-bold text-slate-900">{item.title}</h5>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Teen Level-Up Secret / Pro Tip */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-orange-500/10 border border-amber-300/80 flex items-start gap-3">
            <span className="text-2xl mt-0.5">⚡</span>
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 block">
                TEEN PRO TIP &amp; LEVEL-UP SECRET
              </span>
              <p className="text-xs text-amber-950 font-medium leading-relaxed">
                {data.proTip}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-500 font-medium text-center sm:text-left">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px]">ESC</kbd> or click outside to close
          </span>

          <button
            type="button"
            onClick={() => {
              onClose();
              if (onNavigateTab) onNavigateTab(tab);
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{data.primaryActionLabel}</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

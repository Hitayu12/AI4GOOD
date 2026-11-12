import { useState } from 'react';

export interface HomeViewProps {
  onNavigateTab: (
    tab: 'home' | 'portfolio' | 'trading' | 'simulation' | 'learning' | 'calculator' | 'tutor' | 'status'
  ) => void;
  cashDollars?: number;
  totalEquityDollars?: number;
}

export function HomeView({
  onNavigateTab,
  cashDollars = 10000,
  totalEquityDollars = 10000,
}: HomeViewProps) {
  // Interactive Daily Challenge Poll State
  const [pollSelected, setPollSelected] = useState<string | null>(null);

  // Top Tradable Assets Spotlight
  const SPOTLIGHT_ASSETS = [
    { symbol: 'SPY', name: 'S&P 500 ETF Trust', sector: 'Broad Index ETF', price: '$472.40', change: '+0.42%', badge: 'bg-emerald-100 text-emerald-800' },
    { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Consumer Tech', price: '$185.64', change: '-0.38%', badge: 'bg-blue-100 text-blue-800' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare & Pharma', price: '$160.85', change: '+0.15%', badge: 'bg-rose-100 text-rose-800' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Banking & Financials', price: '$170.20', change: '+0.88%', badge: 'bg-emerald-100 text-emerald-800' },
    { symbol: 'KO', name: 'The Coca-Cola Company', sector: 'Consumer Staples', price: '$59.85', change: '+0.22%', badge: 'bg-amber-100 text-amber-800' },
    { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy & Oil/Gas', price: '$102.40', change: '+1.10%', badge: 'bg-orange-100 text-orange-800' },
  ];

  // Interactive 5-Stage Pathway Steps
  const STAGES = [
    {
      id: 'learning' as const,
      step: '01',
      icon: '📚',
      title: 'Learn & Master',
      subtitle: 'Modular Concepts & 80% Quizzes',
      desc: 'Bite-sized visual lessons on CDs, HYSAs, Stocks, and ETFs. Includes US vs. EU strategies and 80% passing quizzes.',
      action: 'Open Lessons',
      color: 'from-blue-600 to-indigo-600',
    },
    {
      id: 'calculator' as const,
      step: '02',
      icon: '🧮',
      title: 'Calculate & Model',
      subtitle: 'Compound Interest & Yield Modeling',
      desc: 'Model compound APY, monthly contributions, and CD early break penalties using effective annual rate math.',
      action: 'Open Calculators',
      color: 'from-indigo-600 to-purple-600',
    },
    {
      id: 'simulation' as const,
      step: '03',
      icon: '⏳',
      title: 'Zero-Lookahead Sim',
      subtitle: 'Historical Zero-Lookahead Replay',
      desc: 'Step through historical market sessions session-by-session without future price data leakage.',
      action: 'Launch Simulation',
      color: 'from-purple-600 to-pink-600',
    },
    {
      id: 'trading' as const,
      step: '04',
      icon: '⚡',
      title: 'Paper Trading',
      subtitle: 'Spot Orders & 15 Multi-Sector Stocks',
      desc: 'Execute real-time market and limit orders across 15 multi-sector stocks with simulated instant fills.',
      action: 'Start Trading',
      color: 'from-blue-600 to-cyan-600',
    },
    {
      id: 'portfolio' as const,
      step: '05',
      icon: '📊',
      title: 'Portfolio Analytics',
      subtitle: 'Real-Time Equity & Balance Analytics',
      desc: 'Track account net worth, unrealized PnL, cash allocations, and portfolio performance over time.',
      action: 'View Portfolio',
      color: 'from-emerald-600 to-teal-600',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Institutional Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 shadow-2xl p-6 sm:p-10 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Institutional Financial Education Sandbox
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              🛡️ 100% Zero Capital Risk
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              ⚡ Zero-Lookahead Engine
            </span>
          </div>

          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Master the Financial Markets. <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
                Completely Zero Financial Risk.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              An all-in-one educational platform engineered for students, first-generation investors, and wealth builders. Learn cash yield instruments, simulate historical market cycles with zero data leakage, and paper-trade 15 multi-sector stocks with institutional precision.
            </p>
          </div>

          {/* Quick Launchpad Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigateTab('learning')}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
            >
              <span>📚</span>
              <span>Start Learning</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('trading')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2"
            >
              <span>⚡</span>
              <span>Paper Trade</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('calculator')}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs sm:text-sm transition-all flex items-center gap-2"
            >
              <span>🧮</span>
              <span>Compound Calculator</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('tutor')}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs sm:text-sm transition-all flex items-center gap-2"
            >
              <span>🤖</span>
              <span>AI Tutor</span>
            </button>
          </div>
        </div>
      </section>

      {/* Contract-Compliant Live Portfolio & Performance Snapshot */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-lg font-bold">
              📊
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Portfolio &amp; Performance
              </h2>
              <p className="text-xs text-slate-500">
                Live simulation holdings, cash reserves, and performance equity balance.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('portfolio')}
            className="self-start sm:self-center px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-colors flex items-center gap-1.5"
          >
            <span>Open Detailed Portfolio</span>
            <span>→</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
            <span className="text-slate-500 block text-[11px] font-semibold">Total Equity</span>
            <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">
              ${totalEquityDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-emerald-700 font-bold block mt-1">100% Capital Preserved</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
            <span className="text-slate-500 block text-[11px] font-semibold">Cash Available</span>
            <span className="text-xl font-black text-blue-900 font-mono mt-0.5 block">
              ${cashDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">Ready for Spot Orders</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
            <span className="text-slate-500 block text-[11px] font-semibold">Unrealized P&amp;L</span>
            <span className="text-xl font-black text-slate-700 font-mono mt-0.5 block">
              +$0.00
            </span>
            <span className="text-[10px] text-slate-500 block mt-1">0.00% Net Return</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
            <span className="text-slate-500 block text-[11px] font-semibold">Risk Protection Status</span>
            <span className="text-xs font-bold text-emerald-800 block mt-1">
              🛡️ SIPC / Zero-Risk Emulated
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">No Real Capital Exposed</span>
          </div>
        </div>
      </section>

      {/* Multi-Sector Market Watch Carousel */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>📈</span>
              <span>15 Multi-Sector Tradable Universe Spotlight</span>
            </h3>
            <p className="text-xs text-slate-500">
              Spotlight instruments spanning Tech, Healthcare, Banking, Consumer Staples, and Energy.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('trading')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
          >
            View All 15 Symbols →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {SPOTLIGHT_ASSETS.map((asset) => (
            <div
              key={asset.symbol}
              className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-slate-900">{asset.symbol}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${asset.badge}`}>
                  {asset.sector.split(' ')[0]}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 truncate" title={asset.name}>
                {asset.name}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="font-mono font-bold text-xs text-slate-900">{asset.price}</span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('trading')}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800"
                >
                  Trade →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5-Stage Interactive Roadmap */}
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>🗺️</span>
            <span>Interactive 5-Stage Learning &amp; Trading Pathway</span>
          </h3>
          <p className="text-xs text-slate-500">
            A guided progression from financial fundamentals to live market order execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STAGES.map((stg) => (
            <div
              key={stg.id}
              onClick={() => onNavigateTab(stg.id)}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onNavigateTab(stg.id);
                }
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-blue-50 text-xl flex items-center justify-center transition-colors">
                    {stg.icon}
                  </div>
                  <span className="text-[10px] font-black font-mono text-slate-400 group-hover:text-blue-600 transition-colors">
                    STAGE {stg.step}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {stg.title}
                  </h4>
                  <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                    {stg.subtitle}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{stg.desc}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                <span>{stg.action}</span>
                <span className="transform group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Daily Instinct Challenge & US vs EU Banner */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Interactive Challenge Card */}
        <div className="lg:col-span-7 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <span>⚡</span> Daily Financial Instinct Challenge
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                Test Your Instincts
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 leading-snug">
              Scenario: You have $3,000 saved for college tuition due in exactly 10 months. Where should this capital be parked?
            </h4>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { id: 'optA', text: 'A) Buy out-of-the-money Call options for fast double-digit returns', correct: false, explanation: 'High leverage and theta decay mean 100% capital loss is common. Never risk essential tuition money on derivatives!' },
              { id: 'optB', text: 'B) Lock into a 1-Year CD at 5.0% APY or High-Yield Savings Account', correct: true, explanation: 'Correct! Guaranteed fixed APY plus FDIC $250k protection eliminates market loss right before tuition is due.' },
              { id: 'optC', text: 'C) Put 100% into a single high-volatility tech stock', correct: false, explanation: 'Single stocks have company-specific drawdown risk and no FDIC guarantee. A 20% correction could jeopardize your tuition.' },
            ].map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => setPollSelected(choice.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  pollSelected === choice.id
                    ? choice.correct
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold'
                      : 'bg-rose-50 border-rose-300 text-rose-950 font-semibold'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <span>{choice.text}</span>
              </button>
            ))}
          </div>

          {pollSelected && (
            <div
              className={`p-3 rounded-xl text-xs font-medium border ${
                pollSelected === 'optB'
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              {pollSelected === 'optB' ? (
                <div>
                  <strong>🎉 Brilliant Decision!</strong> Non-negotiable deadlines require zero market risk. A CD or HYSA guarantees your principal while earning compound yield.
                </div>
              ) : (
                <div>
                  <strong>⚠️ Caution:</strong> Short-term non-negotiable cash should never be placed in volatile or leveraged assets.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Global Strategy Callout */}
        <div className="lg:col-span-5 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 text-white p-5 shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 px-2 py-0.5 rounded bg-blue-800/60 border border-blue-600 inline-block">
              🌐 Traditional Strategy Arena
            </span>
            <h4 className="text-base font-bold text-white">
              US vs. European Traditional Trading Strategies
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Explore side-by-side head-to-head comparisons across CDs vs. Festgeld, FDIC \$250k vs. EU DGS €100k, S&amp;P 500 Dollar-Cost Averaging vs. European Dividend Champions, and UCITS Accumulating ETF tax advantages.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('learning')}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <span>Explore US vs. EU Lab</span>
            <span>→</span>
          </button>
        </div>
      </section>
    </div>
  );
}

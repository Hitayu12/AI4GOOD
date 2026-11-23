import { useState } from 'react';
import { MARKET_STRATEGIES, TopicStrategy } from './marketStrategies';

interface MarketStrategiesLabProps {
  currentTopicId?: string;
  onNavigateTopic?: (topicId: string) => void;
}

export function MarketStrategiesLab({
  currentTopicId = 'cd-basics',
  onNavigateTopic,
}: MarketStrategiesLabProps) {
  // Topic selection (defaults to current topic if valid traditional trading topic)
  const defaultTopicKey = MARKET_STRATEGIES[currentTopicId] ? currentTopicId : 'etf-basics';
  const [selectedTopicKey, setSelectedTopicKey] = useState<string>(defaultTopicKey);

  // Region View: 'US' | 'EU' | 'COMPARE'
  const [activeRegion, setActiveRegion] = useState<'US' | 'EU' | 'COMPARE'>('COMPARE');

  // Interactive Strategy Builder Simulator State
  const [investorProfile, setInvestorProfile] = useState<'conservative' | 'balanced' | 'growth'>('balanced');
  const [monthlyContribution, setMonthlyContribution] = useState<number>(500);
  const [horizonYears, setHorizonYears] = useState<number>(10);
  const [simRegion, setSimRegion] = useState<'US' | 'EU'>('US');

  // Interactive Dilemma / Challenge State
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  const strategy: TopicStrategy = MARKET_STRATEGIES[selectedTopicKey] || MARKET_STRATEGIES['etf-basics'];

  // Handle switching topics
  const handleTopicSwitch = (topicId: string) => {
    setSelectedTopicKey(topicId);
    setSelectedAnswerId(null);
    setShowExplanation(false);
    onNavigateTopic?.(topicId);
  };

  // Asset allocation weights based on investor profile
  const profileWeights = {
    conservative: {
      label: '🛡️ Capital Protector',
      desc: 'Zero equity volatility. 100% FDIC / EU DGS insured cash and rolling CD term deposits.',
      etfPct: 0,
      stockPct: 0,
      cashPct: 100,
      annualReturn: 0.045, // 4.5% guaranteed cash APY
    },
    balanced: {
      label: '⚖️ Balanced Core-and-Satellite',
      desc: 'Proven wealth builder. 70% low-cost broad index ETFs, 20% dividend champions, 10% liquid cash.',
      etfPct: 70,
      stockPct: 20,
      cashPct: 10,
      annualReturn: 0.075, // 7.5% blended historical
    },
    growth: {
      label: '🚀 Long-Term Compounder',
      desc: 'Maximum compounding engine. 85% broad index ETFs, 15% high-conviction growth stocks, 0% idle cash.',
      etfPct: 85,
      stockPct: 15,
      cashPct: 0,
      annualReturn: 0.09, // 9.0% equity compounding
    },
  }[investorProfile];

  // Compound growth projection math
  const totalMonths = horizonYears * 12;
  const monthlyRate = profileWeights.annualReturn / 12;
  const futureValue =
    monthlyContribution * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
  const totalDeposited = monthlyContribution * totalMonths;
  const totalInterestEarned = Math.max(0, futureValue - totalDeposited);

  return (
    <div className="space-y-6" data-testid="market-strategies-lab">
      {/* 1. Header Hub with Quick Topic Tabs */}
      <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 text-white p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 tracking-wide uppercase">
                Traditional Long-Only Playbook
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Zero Options • Real Market Data
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Global Strategy Lab: 🇺🇸 American vs. 🇪🇺 European Markets
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Discover how traditional investors optimize cash, equities, and index ETFs under US regulations (FDIC, SEC, SIPC) versus European directives (EU DGS, UCITS Accumulating funds, cross-border banking).
            </p>
          </div>

          {/* Region Switcher Pills */}
          <div className="flex bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 self-start md:self-center shrink-0">
            <button
              type="button"
              onClick={() => setActiveRegion('US')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeRegion === 'US'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>🇺🇸</span>
              <span>US Market</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveRegion('EU')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeRegion === 'EU'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>🇪🇺</span>
              <span>European Market</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveRegion('COMPARE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeRegion === 'COMPARE'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>⚖️</span>
              <span>Head-to-Head</span>
            </button>
          </div>
        </div>

        {/* Traditional Topic Selector Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Explore Strategy For:
          </span>
          {Object.values(MARKET_STRATEGIES).map((item) => (
            <button
              key={item.topicId}
              type="button"
              onClick={() => handleTopicSwitch(item.topicId)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedTopicKey === item.topicId
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
            >
              <span>
                {item.topicId === 'cd-basics'
                  ? '🔒'
                  : item.topicId === 'hysa-basics'
                  ? '💵'
                  : item.topicId === 'stock-basics'
                  ? '📈'
                  : '🌐'}
              </span>
              <span>{item.topicTitle}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Tactical Cards: US vs EU vs Side-by-Side */}
      {activeRegion === 'COMPARE' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* US Card */}
            <TacticalCard tactics={strategy.usTactics} />
            {/* EU Card */}
            <TacticalCard tactics={strategy.euTactics} />
          </div>

          {/* Side-by-Side Comparison Matrix Table */}
          <div className="rounded-2xl border border-slate-300/80 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">⚖️</span>
              <h4 className="text-base font-bold text-slate-900">
                Key Structural Differences: {strategy.topicTitle}
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3 font-bold">Comparison Feature</th>
                    <th className="py-2.5 px-3 font-bold text-blue-800">🇺🇸 American Market (US)</th>
                    <th className="py-2.5 px-3 font-bold text-indigo-800">🇪🇺 European Market (EU/UK)</th>
                    <th className="py-2.5 px-3 font-bold text-emerald-800">Strategic Takeaway</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {strategy.headToHeadDifferences.map((diff, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">{diff.feature}</td>
                      <td className="py-3 px-3 text-slate-700 bg-blue-50/20 font-medium">
                        {diff.usMarket}
                      </td>
                      <td className="py-3 px-3 text-slate-700 bg-indigo-50/20 font-medium">
                        {diff.euMarket}
                      </td>
                      <td className="py-3 px-3 text-emerald-900 font-semibold bg-emerald-50/20">
                        {diff.winnerOrTakeaway}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeRegion === 'US' ? (
        <div className="max-w-3xl mx-auto">
          <TacticalCard tactics={strategy.usTactics} isExpanded />
        </div>
      ) : (
        <div className="max-w-3xl mx-auto">
          <TacticalCard tactics={strategy.euTactics} isExpanded />
        </div>
      )}

      {/* 3. Interactive Strategy Playbook Simulator (Asset Allocator) */}
      <div className="rounded-2xl border border-slate-300/80 bg-white p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🧮</span>
              <h4 className="text-lg font-bold text-slate-900">
                Interactive Traditional Strategy Builder
              </h4>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate customized portfolio allocations and see the regional execution playbook in action.
            </p>
          </div>

          {/* Region toggle for the simulator */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <span className="text-[10px] text-slate-500 uppercase px-1">Region:</span>
            <button
              type="button"
              onClick={() => setSimRegion('US')}
              className={`px-2.5 py-1 rounded transition-all ${
                simRegion === 'US'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              🇺🇸 US Execution
            </button>
            <button
              type="button"
              onClick={() => setSimRegion('EU')}
              className={`px-2.5 py-1 rounded transition-all ${
                simRegion === 'EU'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              🇪🇺 EU Execution
            </button>
          </div>
        </div>

        {/* Profile Selector Buttons */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Step 1: Choose Your Traditional Trading Strategy Profile
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['conservative', 'balanced', 'growth'] as const).map((prof) => (
              <button
                key={prof}
                type="button"
                onClick={() => setInvestorProfile(prof)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  investorProfile === prof
                    ? 'border-blue-500 bg-blue-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-xs text-slate-900">
                  {prof === 'conservative'
                    ? '🛡️ Capital Protector'
                    : prof === 'balanced'
                    ? '⚖️ Balanced Core-Satellite'
                    : '🚀 Long-Term Compounder'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                  {prof === 'conservative'
                    ? '0% Equity Risk. 100% Guaranteed Cash & Rolling CD Ladders.'
                    : prof === 'balanced'
                    ? '70% Broad ETF Core, 20% Dividend Stocks, 10% Cash.'
                    : '85% Broad Index ETFs, 15% Satellite Equities.'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Contribution & Horizon Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Monthly Deposit:</span>
              <span className="text-blue-700 text-sm font-black font-mono">
                ${monthlyContribution.toLocaleString()} / mo
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="3000"
              step="50"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>$50</span>
              <span>$1,000</span>
              <span>$3,000</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Investment Horizon:</span>
              <span className="text-blue-700 text-sm font-black font-mono">
                {horizonYears} Years
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={horizonYears}
              onChange={(e) => setHorizonYears(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>1 Year</span>
              <span>15 Years</span>
              <span>30 Years</span>
            </div>
          </div>
        </div>

        {/* Visual Allocation Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
            <span>Simulated Asset Allocation Target</span>
            <span className="text-slate-400 font-mono text-[11px]">Total: 100%</span>
          </div>
          <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-200">
            {profileWeights.etfPct > 0 && (
              <div
                style={{ width: `${profileWeights.etfPct}%` }}
                className="bg-blue-600 h-full transition-all"
                title={`Core Index ETFs: ${profileWeights.etfPct}%`}
              />
            )}
            {profileWeights.stockPct > 0 && (
              <div
                style={{ width: `${profileWeights.stockPct}%` }}
                className="bg-indigo-500 h-full transition-all"
                title={`Individual Stocks: ${profileWeights.stockPct}%`}
              />
            )}
            {profileWeights.cashPct > 0 && (
              <div
                style={{ width: `${profileWeights.cashPct}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Cash & CD Ladder: ${profileWeights.cashPct}%`}
              />
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs">
            {profileWeights.etfPct > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span className="text-slate-700 font-medium">Core ETFs: {profileWeights.etfPct}%</span>
              </div>
            )}
            {profileWeights.stockPct > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span className="text-slate-700 font-medium">Stocks: {profileWeights.stockPct}%</span>
              </div>
            )}
            {profileWeights.cashPct > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-700 font-medium">Cash/CDs: {profileWeights.cashPct}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Projected Wealth Outcome Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Principal Saved</span>
            <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
              ${totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-slate-400">${monthlyContribution}/mo over {horizonYears} yrs</span>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-2xs">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Projected Growth &amp; Yield</span>
            <span className="text-lg font-black text-emerald-700 font-mono mt-0.5 block">
              +${totalInterestEarned.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-emerald-800/80">Compound interest &amp; dividends</span>
          </div>

          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 shadow-2xs">
            <span className="text-[10px] font-bold text-blue-800 uppercase block">Projected Ending Portfolio</span>
            <span className="text-lg font-black text-blue-900 font-mono mt-0.5 block">
              ${futureValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-blue-800/80">At {((profileWeights.annualReturn) * 100).toFixed(1)}% blended rate</span>
          </div>
        </div>

        {/* Step-by-Step Regional Execution Checklist */}
        <div className="pt-3 border-t border-slate-100">
          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Execution Checklist for {simRegion === 'US' ? '🇺🇸 US Market' : '🇪🇺 European Market'}:
          </h5>
          <div className="space-y-2 text-xs">
            {simRegion === 'US' ? (
              <>
                <div className="flex items-start gap-2 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
                  <span className="text-blue-600 font-bold">1.</span>
                  <span className="text-slate-700">
                    <strong>Brokerage Setup:</strong> Open a low-cost, zero-commission account (Charles Schwab, Fidelity, Vanguard).
                  </span>
                </div>
                <div className="flex items-start gap-2 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
                  <span className="text-blue-600 font-bold">2.</span>
                  <span className="text-slate-700">
                    <strong>Core Indexing:</strong> Automate monthly purchases into an S&amp;P 500 ETF (VOO / SPY) or Total Market (VTI) with DRIP (dividend reinvestment) enabled.
                  </span>
                </div>
                <div className="flex items-start gap-2 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
                  <span className="text-blue-600 font-bold">3.</span>
                  <span className="text-slate-700">
                    <strong>Cash Defense:</strong> Keep emergency funds in an FDIC-backed HYSA or state-tax-exempt Treasury Bills (SGOV / TreasuryDirect).
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2 bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100">
                  <span className="text-indigo-600 font-bold">1.</span>
                  <span className="text-slate-700">
                    <strong>Brokerage Setup:</strong> Open an account with an EU neo-broker or institutional platform (Interactive Brokers, Trade Republic, Scalable Capital).
                  </span>
                </div>
                <div className="flex items-start gap-2 bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100">
                  <span className="text-indigo-600 font-bold">2.</span>
                  <span className="text-slate-700">
                    <strong>Core Indexing:</strong> Choose an <strong>Accumulating (Acc) UCITS ETF</strong> (e.g. VUAA or VWCE). This compounds dividends internally with 0% tax drag and zero reinvestment fees.
                  </span>
                </div>
                <div className="flex items-start gap-2 bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100">
                  <span className="text-indigo-600 font-bold">3.</span>
                  <span className="text-slate-700">
                    <strong>Cash Defense:</strong> Hold liquid cash in an accumulating €STR Money Market ETF (XEON) or an insured EU DGS easy-access account.
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. Interactive "Test Your Market Instincts" Dilemma Challenge */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🎯</span>
          <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
            Interactive Instinct Check: {strategy.topicTitle}
          </span>
        </div>
        <p className="text-sm font-bold text-slate-900 mb-1">
          {strategy.interactiveChallenge.question}
        </p>
        <p className="text-xs text-slate-600 mb-4 italic">
          Scenario: {strategy.interactiveChallenge.context}
        </p>

        <div className="space-y-2.5">
          {strategy.interactiveChallenge.options.map((opt) => {
            const isSelected = selectedAnswerId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setSelectedAnswerId(opt.id);
                  setShowExplanation(true);
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs flex items-start gap-3 ${
                  isSelected
                    ? opt.isBest
                      ? 'border-emerald-500 bg-emerald-50/90 text-emerald-950 font-semibold'
                      : 'border-rose-400 bg-rose-50/90 text-rose-950 font-semibold'
                    : 'border-slate-200 bg-white hover:border-blue-300 text-slate-800'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold ${
                    isSelected
                      ? opt.isBest
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                      : 'bg-slate-100 text-slate-600 border border-slate-300'
                  }`}
                >
                  {isSelected ? (opt.isBest ? '✓' : '✕') : '•'}
                </span>
                <span className="flex-1 leading-relaxed">{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Challenge Explanation Feedback Box */}
        {showExplanation && selectedAnswerId && (
          <div className="mt-4 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs space-y-1 animate-fadeIn">
            <span className="font-bold text-slate-900 block">
              {strategy.interactiveChallenge.options.find((o) => o.id === selectedAnswerId)?.isBest
                ? '🎉 Excellent Analysis!'
                : '💡 Learning Opportunity:'}
            </span>
            <p className="text-slate-700 leading-relaxed">
              {strategy.interactiveChallenge.options.find((o) => o.id === selectedAnswerId)?.explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Reusable Tactical Card Component for American or European Market Tactics
 */
function TacticalCard({
  tactics,
  isExpanded = false,
}: {
  tactics: TopicStrategy['usTactics'];
  isExpanded?: boolean;
}) {
  const [showFullRules, setShowFullRules] = useState(isExpanded);

  const isUS = tactics.region === 'US';
  const borderClass = isUS ? 'border-blue-300/80' : 'border-indigo-300/80';
  const badgeClass = isUS
    ? 'bg-blue-100 text-blue-900 border-blue-300'
    : 'bg-indigo-100 text-indigo-900 border-indigo-300';
  const headerGradient = isUS
    ? 'from-blue-50/80 via-white to-slate-50'
    : 'from-indigo-50/80 via-white to-slate-50';

  return (
    <div
      className={`rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all duration-200 bg-gradient-to-br ${headerGradient} ${borderClass} space-y-4`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{tactics.flag}</span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {tactics.regionName}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
              {tactics.instrumentName}
            </span>
          </div>
          <h4 className="text-base font-black text-slate-900 mt-1">{tactics.strategyName}</h4>
        </div>
      </div>

      <p className="text-xs font-medium text-slate-600 italic">
        "{tactics.tagline}"
      </p>

      {/* How it Works Step List */}
      <div>
        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Step-by-Step Mechanics:
        </h5>
        <div className="space-y-2 text-xs">
          {tactics.howItWorks.map((step, sIdx) => (
            <div
              key={sIdx}
              className="flex items-start gap-2.5 bg-white/90 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs"
            >
              <span className="w-5 h-5 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                {sIdx + 1}
              </span>
              <span className="leading-relaxed text-slate-700 flex-1">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tactical Rules */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Pro Tactical Rules:
          </h5>
          <button
            type="button"
            onClick={() => setShowFullRules(!showFullRules)}
            className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold"
          >
            {showFullRules ? 'Collapse' : 'Expand All'}
          </button>
        </div>

        {showFullRules && (
          <div className="space-y-1.5 text-xs">
            {tactics.tacticalRules.map((rule, rIdx) => (
              <div
                key={rIdx}
                className="flex items-start gap-2 bg-white/90 p-2 rounded-lg border border-slate-200/70"
              >
                <span className="text-emerald-600 font-bold">✓</span>
                <span className="text-slate-700 leading-snug">{rule}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Regulatory & Tax Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60">
        <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
          <span className="font-bold text-emerald-900 block text-[10px] uppercase">
            🛡️ Regulatory Protection
          </span>
          <span className="text-emerald-950 font-medium text-[11px] leading-tight block mt-0.5">
            {tactics.regulatorySafety}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200">
          <span className="font-bold text-amber-900 block text-[10px] uppercase">
            💰 Tax &amp; Cost Alpha
          </span>
          <span className="text-amber-950 font-medium text-[11px] leading-tight block mt-0.5">
            {tactics.taxOrCostEdge}
          </span>
        </div>
      </div>

      {/* Recommended Platforms / Tickers */}
      <div className="text-xs pt-1 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase">Key Tickers &amp; Tools:</span>
        {tactics.recommendedTickersOrTools.map((t, idx) => (
          <span
            key={idx}
            className="px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200 font-mono text-[10px] font-semibold"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

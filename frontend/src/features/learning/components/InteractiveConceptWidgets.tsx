import { useState } from 'react';

export interface InteractiveWidgetsProps {
  topicId: string;
}

export function InstrumentLifecycleDiagram({ topicId }: { topicId: string }) {
  const [activeStep, setActiveStep] = useState<number>(0);

  const getSteps = () => {
    switch (topicId) {
      case 'cd-basics':
        return [
          {
            icon: '💵',
            title: '1. Initial Commitment',
            badge: 'Fixed Deposit',
            summary: 'You deposit a lump sum upfront ($1,000) for a guaranteed term (e.g. 12 months).',
            detail: 'Unlike standard savings, you cannot add additional deposits to this specific CD after inception.',
          },
          {
            icon: '🔒',
            title: '2. Locked Yield',
            badge: '5.00% APY',
            summary: 'Interest rate is locked on day one and guaranteed by the bank.',
            detail: 'Even if the Federal Reserve cuts interest rates next week, your 5.0% APY remains completely untouched.',
          },
          {
            icon: '🛡️',
            title: '3. FDIC Insurance',
            badge: '$250k Shield',
            summary: 'Federally insured up to $250,000 per depositor per bank.',
            detail: 'Virtual zero risk of nominal principal loss when held to maturity inside insured limits.',
          },
          {
            icon: '🏁',
            title: '4. Maturity Payout',
            badge: '$1,050 Return',
            summary: 'Full principal plus all accrued compound interest returned at term end.',
            detail: 'You can roll into a new CD, move into an emergency HYSA, or transfer to your checking account.',
          },
          {
            icon: '⚠️',
            title: '5. Penalty Guardrail',
            badge: 'EWP Rule',
            summary: 'Breaking early triggers an Early Withdrawal Penalty (often 90 to 180 days interest).',
            detail: 'If broken very early, the penalty can even eat into a small portion of your principal.',
          },
        ];
      case 'hysa-basics':
        return [
          {
            icon: '💵',
            title: '1. Flexible Funding',
            badge: 'Deposit Anytime',
            summary: 'Deposit any amount ($1 to $50,000+) whenever you get paid or save cash.',
            detail: 'No fixed lump-sum commitment; automated recurring transfers are supported.',
          },
          {
            icon: '💧',
            title: '2. Daily Liquidity',
            badge: 'Zero Penalties',
            summary: 'Transfer or withdraw money anytime via ACH, wire, or ATM without early break fees.',
            detail: 'Ideal for emergency cushions because emergencies never announce themselves in advance.',
          },
          {
            icon: '📈',
            title: '3. Compounding APY',
            badge: '4.50% APY',
            summary: 'Interest compounds daily and is deposited straight into your balance monthly.',
            detail: 'Earns hundreds of dollars more than traditional brick-and-mortar savings accounts.',
          },
          {
            icon: '🌊',
            title: '4. Floating Rate',
            badge: 'Macro Variable',
            summary: 'Yield floats dynamically with Federal Reserve benchmark interest rate adjustments.',
            detail: 'Rates go up when the Fed raises rates, and drift downward when the Fed cuts rates.',
          },
        ];
      case 'stocks-basics':
        return [
          {
            icon: '🏢',
            title: '1. Equity Ownership',
            badge: 'Co-Owner',
            summary: 'Purchasing common stock makes you a fractional co-owner of the corporation.',
            detail: 'You have a claim on company assets, long-term earnings, and voting rights.',
          },
          {
            icon: '📊',
            title: '2. Market Pricing',
            badge: 'Intraday Fluctuation',
            summary: 'Share prices move every second markets are open based on buyers, sellers, and earnings.',
            detail: 'Short-term price action is volatile; long-term value tracks real corporate profitability.',
          },
          {
            icon: '💵',
            title: '3. Cash Dividends',
            badge: 'Profit Share',
            summary: 'Profitable mature companies return surplus cash directly to shareholders.',
            detail: 'Dividends can be spent as passive cashflow or automatically reinvested (DRIP).',
          },
          {
            icon: '⏳',
            title: '4. Multi-Year Horizon',
            badge: '3-10+ Years',
            summary: 'Stocks compound wealth over long multi-year horizons, not for money needed next month.',
            detail: 'Unlike bank deposits, equities have market risk and zero FDIC insurance.',
          },
        ];
      case 'etf-basics':
        return [
          {
            icon: '🧺',
            title: '1. The Bundled Basket',
            badge: '500+ Stocks in 1',
            summary: 'An ETF pools hundreds or thousands of individual stocks into a single tradable share.',
            detail: 'Buying 1 share of an S&P 500 ETF (SPY/VOO) gives you immediate ownership across 500 top US companies.',
          },
          {
            icon: '🛡️',
            title: '2. Instant Diversification',
            badge: 'Risk Mitigation',
            summary: 'If a single company in the fund goes bankrupt, the other 499 companies cushion the index.',
            detail: 'Eliminates idiosyncratic single-stock catastrophe risk while capturing broader economic growth.',
          },
          {
            icon: '⚡',
            title: '3. Stock Exchange Tradability',
            badge: 'Live Trading',
            summary: 'Trades continuously throughout regular market hours with real-time price updates.',
            detail: 'Can be bought or sold with market orders, limit orders, or fractional shares on standard brokerages.',
          },
          {
            icon: '🏷️',
            title: '4. Ultra-Low Expense Ratio',
            badge: '0.03% Fee',
            summary: 'Passive index ETFs charge microscopic management fees compared to active mutual funds.',
            detail: 'A 0.03% expense ratio means you pay only 30 cents per year for every $1,000 invested.',
          },
        ];
      case 'options-basics':
      default:
        return [
          {
            icon: '📜',
            title: '1. Derivatives Contract',
            badge: '100 Shares Unit',
            summary: 'An options contract confers the right (not obligation) to buy (Call) or sell (Put) 100 shares.',
            detail: 'Options derive their value from an underlying stock; you do not own the actual stock.',
          },
          {
            icon: '⏳',
            title: '2. Time Decay (Theta)',
            badge: 'Expiring Asset',
            summary: 'Options have fixed expiration dates. Every day that passes erodes the contract value.',
            detail: 'Even if the stock price moves slightly in your direction, time decay can still wipe out profits.',
          },
          {
            icon: '⚠️',
            title: '3. Asymmetric Loss Risk',
            badge: '100% Capital Risk',
            summary: 'Options buyers frequently lose 100% of the cash premium paid upfront.',
            detail: 'Leverage magnifies both gains and total losses; never use essential cash or emergency reserves.',
          },
          {
            icon: '🛡️',
            title: '4. Educational Sandbox',
            badge: 'No Real Risk',
            summary: 'Use this platform strictly to learn mechanics and portfolio hedging without risking real money.',
            detail: 'Beginners should master CDs, HYSAs, and broad ETFs long before ever touching derivatives.',
          },
        ];
    }
  };

  const steps = getSteps();
  const current = steps[activeStep] || steps[0];

  return (
    <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🗺️</span>
          <div>
            <h4 className="text-sm font-bold text-indigo-950">
              Interactive Instrument Lifecycle
            </h4>
            <p className="text-[11px] text-slate-500">
              Step through the financial journey from initial deposit to return of capital.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
          Step {activeStep + 1} of {steps.length}
        </span>
      </div>

      {/* Interactive Step Navigator Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {steps.map((step, idx) => {
          const isSelected = idx === activeStep;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveStep(idx)}
              className={`p-2 rounded-xl text-left border transition-all text-xs flex items-center gap-2 ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold scale-[1.02]'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span className="text-base shrink-0">{step.icon}</span>
              <div className="truncate">
                <span className="block truncate font-semibold">{step.title}</span>
                <span
                  className={`text-[10px] block truncate ${
                    isSelected ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {step.badge}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Step Visual Showcase Card */}
      <div className="bg-white rounded-xl p-4 border border-indigo-100 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{current.icon}</span>
            <span className="text-sm font-bold text-slate-900">{current.title}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              {current.badge}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-800 leading-relaxed">
            {current.summary}
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            💡 <strong>Pro Insight:</strong> {current.detail}
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            disabled={activeStep === 0}
            onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700"
          >
            ← Prev
          </button>
          <button
            type="button"
            disabled={activeStep === steps.length - 1}
            onClick={() => setActiveStep((prev) => Math.min(steps.length - 1, prev + 1))}
            className="px-3 py-1 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-white shadow-2xs"
          >
            Next Step →
          </button>
        </div>
      </div>
    </div>
  );
}

export function InteractiveWhatIfTool({ topicId }: { topicId: string }) {
  // CD State
  const [cdDeposit, setCdDeposit] = useState<number>(2000);
  const [cdMonthsPassed, setCdMonthsPassed] = useState<number>(2); // broke early at month 2
  const cdApy = 5.0;
  const cdTermMonths = 12;
  const cdPenaltyDays = 90; // 3 months interest penalty

  // HYSA State
  const [hysaDeposit, setHysaDeposit] = useState<number>(5000);
  const [fedRate, setFedRate] = useState<number>(4.75);

  // Stock State
  const [stockShock, setStockShock] = useState<number>(-15); // -15% market dip
  const [dcaAmount, setDcaAmount] = useState<number>(200);

  // ETF State
  const [singleStockCrash, setSingleStockCrash] = useState<number>(-40);

  // Options State
  const [daysRemaining, setDaysRemaining] = useState<number>(14);

  return (
    <div className="rounded-2xl border border-slate-300/80 bg-white p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎛️</span>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Interactive Scenario &amp; &ldquo;What-If&rdquo; Simulator
            </h4>
            <p className="text-[11px] text-slate-500">
              Stress-test this instrument with live interactive inputs to see real financial outcomes.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
          Live Interactive
        </span>
      </div>

      {/* TOPIC 1: CD EARLY WITHDRAWAL BREAK SIMULATOR */}
      {topicId === 'cd-basics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Initial CD Deposit: ${cdDeposit.toLocaleString()}
              </label>
              <input
                type="range"
                min="500"
                max="10000"
                step="500"
                value={cdDeposit}
                onChange={(e) => setCdDeposit(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>$500</span>
                <span>$5,000</span>
                <span>$10,000</span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                When Do You Break Early? Month {cdMonthsPassed} of {cdTermMonths}
              </label>
              <input
                type="range"
                min="1"
                max="11"
                step="1"
                value={cdMonthsPassed}
                onChange={(e) => setCdMonthsPassed(Number(e.target.value))}
                className="w-full accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>Month 1 (Immediate)</span>
                <span>Month 6</span>
                <span>Month 11</span>
              </div>
            </div>
          </div>

          {/* Math breakdown */}
          {(() => {
            const earnedInterest = (cdDeposit * (cdApy / 100) * (cdMonthsPassed / 12));
            const penalty = (cdDeposit * (cdApy / 100) * (cdPenaltyDays / 365));
            const netCash = cdDeposit + earnedInterest - penalty;
            const netGainLoss = earnedInterest - penalty;
            const penaltyEatsPrincipal = netGainLoss < 0;

            return (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Earned Interest (Mo {cdMonthsPassed})</span>
                    <span className="text-base font-bold text-emerald-600 font-mono">
                      +${earnedInterest.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-amber-200">
                    <span className="text-amber-800 block text-[11px]">90-Day Early Penalty (EWP)</span>
                    <span className="text-base font-bold text-amber-700 font-mono">
                      -${penalty.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Net Payout Returned</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      ${netCash.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
                    penaltyEatsPrincipal
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{penaltyEatsPrincipal ? '⚠️' : '✅'}</span>
                    <span>
                      {penaltyEatsPrincipal
                        ? `Early Break Alert: Because you withdrew in Month ${cdMonthsPassed} before earning 90 days of interest, the penalty ate $${Math.abs(
                            netGainLoss
                          ).toFixed(2)} into your principal!`
                        : `Principal Safe: You held long enough (${cdMonthsPassed} months) that interest earned covered the penalty and left you with +$${netGainLoss.toFixed(
                            2
                          )} net profit.`}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/70">
                    {penaltyEatsPrincipal ? 'Principal Loss' : 'Net Gain'}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TOPIC 2: HYSA FLOATING RATE & BANK COMPARISON */}
      {topicId === 'hysa-basics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Emergency Savings: ${hysaDeposit.toLocaleString()}
              </label>
              <input
                type="range"
                min="1000"
                max="25000"
                step="1000"
                value={hysaDeposit}
                onChange={(e) => setHysaDeposit(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>$1k</span>
                <span>$10k</span>
                <span>$25k</span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Fed Benchmark Rate: {fedRate.toFixed(2)}% (HYSA yields ~{(fedRate - 0.25).toFixed(2)}%)
              </label>
              <input
                type="range"
                min="1.0"
                max="6.5"
                step="0.25"
                value={fedRate}
                onChange={(e) => setFedRate(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>1.0% (Low rate cycle)</span>
                <span>4.0%</span>
                <span>6.5% (High rate cycle)</span>
              </div>
            </div>
          </div>

          {(() => {
            const hysaApy = Math.max(0.5, fedRate - 0.25);
            const hysaAnnual = (hysaDeposit * (hysaApy / 100));
            const traditionalAnnual = (hysaDeposit * 0.0001); // 0.01%
            const difference = hysaAnnual - traditionalAnnual;

            return (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Old Brick-and-Mortar Bank (0.01% APY)</span>
                    <span className="text-base font-bold text-slate-600 font-mono">
                      ${traditionalAnnual.toFixed(2)} / year
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">Virtually zero return</span>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-300">
                    <span className="text-emerald-900 block text-[11px] font-semibold">
                      Digital High-Yield Account ({hysaApy.toFixed(2)}% APY)
                    </span>
                    <span className="text-base font-bold text-emerald-700 font-mono">
                      +${hysaAnnual.toFixed(2)} / year
                    </span>
                    <span className="text-[10px] text-emerald-800 block mt-1 font-bold">
                      Earns ${difference.toFixed(2)} more every single year!
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                  💡 <strong>Liquidity Advantage:</strong> Unlike a CD, this entire ${hysaDeposit.toLocaleString()} remains accessible 24/7 without a single cent in early withdrawal penalties.
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TOPIC 3: STOCKS DCA VS PANIC SELLING */}
      {topicId === 'stocks-basics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Market Fluctuation Scenario: {stockShock > 0 ? `+${stockShock}% Bull Run` : `${stockShock}% Correction`}
              </label>
              <input
                type="range"
                min="-35"
                max="25"
                step="5"
                value={stockShock}
                onChange={(e) => setStockShock(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>-35% Crash</span>
                <span>0% Flat</span>
                <span>+25% Surge</span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Monthly DCA Discipline: ${dcaAmount}/month
              </label>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={dcaAmount}
                onChange={(e) => setDcaAmount(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>$50</span>
                <span>$500</span>
                <span>$1,000</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200">
                <span className="text-rose-900 block font-bold text-[11px]">The Emotional Panic Seller</span>
                <p className="text-rose-800 text-xs mt-1">
                  Sees market drop {stockShock}%, panics, sells at bottom, and locks in permanent loss. Misses the eventual recovery.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-300">
                <span className="text-emerald-900 block font-bold text-[11px]">The Systematic DCA Investor</span>
                <p className="text-emerald-800 text-xs mt-1">
                  Keeps buying ${dcaAmount}/month. When prices drop {stockShock}%, each dollar buys more shares at discounted valuations!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOPIC 4: ETF BASKET VS SINGLE STOCK RISK */}
      {topicId === 'etf-basics' && (
        <div className="space-y-4">
          <div className="text-xs space-y-1">
            <label className="font-semibold text-slate-700 block">
              Single Company Catastrophe: Stock crashes {singleStockCrash}% (accounting fraud / failed drug / CEO scandal)
            </label>
            <input
              type="range"
              min="-80"
              max="-10"
              step="5"
              value={singleStockCrash}
              onChange={(e) => setSingleStockCrash(Number(e.target.value))}
              className="w-full accent-rose-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>-10% Bad Quarter</span>
              <span>-40% Earnings Miss</span>
              <span>-80% Catastrophe</span>
            </div>
          </div>

          {(() => {
            const singleStockLoss = singleStockCrash;
            // In an S&P 500 ETF, an individual company is typically ~0.5% to 3% weight.
            const indexWeight = 0.02; // 2% weight
            const etfImpact = singleStockCrash * indexWeight;

            return (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-950">
                    <span className="text-[11px] font-bold block text-rose-900">All-In on Single Stock</span>
                    <span className="text-lg font-black text-rose-700 font-mono">{singleStockLoss}%</span>
                    <p className="text-[11px] text-rose-800 mt-1">
                      $1,000 becomes ${(1000 * (1 + singleStockLoss / 100)).toFixed(0)}. Devastating personal wealth loss.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950">
                    <span className="text-[11px] font-bold block text-emerald-900">Diversified Index ETF</span>
                    <span className="text-lg font-black text-emerald-700 font-mono">{etfImpact.toFixed(2)}%</span>
                    <p className="text-[11px] text-emerald-800 mt-1">
                      $1,000 becomes ${(1000 * (1 + etfImpact / 100)).toFixed(2)}. The crash is absorbed seamlessly by 499 other companies.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TOPIC 5: OPTIONS TIME DECAY */}
      {topicId === 'options-basics' && (
        <div className="space-y-4">
          <div className="text-xs space-y-1">
            <label className="font-semibold text-slate-700 block">
              Days Until Expiration: {daysRemaining} Days Left
            </label>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={daysRemaining}
              onChange={(e) => setDaysRemaining(Number(e.target.value))}
              className="w-full accent-purple-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 Days (Expired - $0 Value)</span>
              <span>15 Days</span>
              <span>30 Days (Full Premium)</span>
            </div>
          </div>

          {(() => {
            // Non-linear theta decay curve
            const initialPremium = 300;
            const decayFactor = Math.pow(daysRemaining / 30, 1.8);
            const currentOptionValue = initialPremium * decayFactor;
            const lossPercent = ((initialPremium - currentOptionValue) / initialPremium) * 100;

            return (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-500 text-[11px] block">Initial Premium Paid</span>
                    <span className="text-base font-bold text-slate-900 font-mono">${initialPremium.toFixed(2)}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-purple-200">
                    <span className="text-purple-800 text-[11px] block">Current Contract Value</span>
                    <span className="text-base font-bold text-purple-700 font-mono">${currentOptionValue.toFixed(2)}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-rose-200">
                    <span className="text-rose-800 text-[11px] block">Theta Time Decay Loss</span>
                    <span className="text-base font-bold text-rose-700 font-mono">-{lossPercent.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  ⚠️ <strong>Key Risk Reality:</strong> Stocks don&apos;t expire. Options contracts do. If the stock doesn&apos;t move past your strike price before Day 0, you lose 100% of the money you spent.
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export function InteractiveGoalMatcher({
  onSelectTopic,
}: {
  onSelectTopic: (topicId: string) => void;
}) {
  const [selectedGoal, setSelectedGoal] = useState<string>('tuition');

  const GOALS = [
    {
      id: 'tuition',
      title: '🎓 Tuition / Down Payment in 12 Mo',
      description: 'Known future deadline. Cannot risk nominal capital loss.',
      matchTopicId: 'cd-basics',
      matchName: 'Certificate of Deposit (CD)',
      why: 'Guaranteed 5.0% APY locked with FDIC protection up to $250k. Eliminates stock market correction risk right before your payment is due.',
      tag: 'Principal Safe',
    },
    {
      id: 'emergency',
      title: '🚨 Emergency Cushion ($2,000)',
      description: 'Must withdraw anytime at 2 AM without fees or market delay.',
      matchTopicId: 'hysa-basics',
      matchName: 'High-Yield Savings Account (HYSA)',
      why: '100% liquid daily access via ACH/ATM with 4.5% compound APY. Zero early withdrawal penalties.',
      tag: '100% Liquid',
    },
    {
      id: 'wealth',
      title: '🚀 Long-Term Wealth (10+ Years)',
      description: 'Saving for retirement or financial freedom. Willing to tolerate volatility.',
      matchTopicId: 'etf-basics',
      matchName: 'Broad-Market Index ETF',
      why: 'Owns 500+ top companies with ultra-low 0.03% expense ratio. Historical compounding significantly beats inflation and bank yields.',
      tag: 'High Compounder',
    },
    {
      id: 'dividend',
      title: '🏢 Individual Company Equity',
      description: 'Belief in a specific blue-chip enterprise and its dividend cashflow.',
      matchTopicId: 'stocks-basics',
      matchName: 'Individual Common Stock',
      why: 'Direct corporate ownership with dividend payouts and voting rights, balanced with broader ETF holdings.',
      tag: 'Equity Co-Owner',
    },
  ];

  const active = GOALS.find((g) => g.id === selectedGoal) || GOALS[0];

  return (
    <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Interactive Goal &amp; Strategy Matcher
            </h4>
            <p className="text-[11px] text-slate-500">
              Click your financial situation to see which instrument is engineered for your goal.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
          Decision Engine
        </span>
      </div>

      {/* Goal Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {GOALS.map((goal) => {
          const isSelected = goal.id === selectedGoal;
          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => setSelectedGoal(goal.id)}
              className={`p-3 rounded-xl text-left border transition-all text-xs ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-semibold'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="font-bold truncate">{goal.title}</div>
              <div
                className={`text-[10px] mt-1 line-clamp-2 ${
                  isSelected ? 'text-blue-100' : 'text-slate-500'
                }`}
              >
                {goal.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Match Result Banner */}
      <div className="bg-white rounded-xl p-4 border border-indigo-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Recommended Match:</span>
            <span className="text-sm font-bold text-blue-900">{active.matchName}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              {active.tag}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{active.why}</p>
        </div>

        <button
          type="button"
          onClick={() => onSelectTopic(active.matchTopicId)}
          className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs whitespace-nowrap transition-colors"
        >
          Study {active.matchName} →
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';

export interface InteractiveWidgetsProps {
  topicId: string;
}

function normalizeTopicId(topicId: string): string {
  if (topicId === 'stocks-basics') return 'stock-basics';
  if (topicId === 'options-basics') return 'options-intro';
  return topicId;
}

export function InstrumentLifecycleDiagram({ topicId }: { topicId: string }) {
  const [activeStep, setActiveStep] = useState<number>(0);
  const normalizedTopic = normalizeTopicId(topicId);

  const getSteps = () => {
    switch (normalizedTopic) {
      case 'cd-basics':
        return [
          {
            icon: '💵',
            tone: 'fw-lavender',
            title: '1. Initial Commitment',
            badge: 'Fixed Deposit',
            summary: 'You deposit a lump sum upfront ($1,000) for a guaranteed term (e.g. 12 months).',
            detail: 'Unlike standard savings, you cannot add additional deposits to this specific CD after inception.',
          },
          {
            icon: '🔒',
            tone: 'fw-mint',
            title: '2. Locked Yield',
            badge: '5.00% APY',
            summary: 'Interest rate is locked on day one and guaranteed by the bank.',
            detail: 'Even if the Federal Reserve cuts interest rates next week, your 5.0% APY remains completely untouched.',
          },
          {
            icon: '🛡️',
            tone: 'fw-lavender',
            title: '3. FDIC Insurance',
            badge: '$250k Shield',
            summary: 'Federally insured up to $250,000 per depositor per bank.',
            detail: 'Virtual zero risk of nominal principal loss when held to maturity inside insured limits.',
          },
          {
            icon: '🏁',
            tone: 'fw-mint',
            title: '4. Maturity Payout',
            badge: '$1,050 Return',
            summary: 'Full principal plus all accrued compound interest returned at term end.',
            detail: 'You can roll into a new CD, move into an emergency HYSA, or transfer to your checking account.',
          },
          {
            icon: '⚠️',
            tone: 'fw-peach',
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
            tone: 'fw-lavender',
            title: '1. Flexible Funding',
            badge: 'Deposit Anytime',
            summary: 'Deposit any amount ($1 to $50,000+) whenever you get paid or save cash.',
            detail: 'No fixed lump-sum commitment; automated recurring transfers are supported.',
          },
          {
            icon: '💧',
            tone: 'fw-mint',
            title: '2. Daily Liquidity',
            badge: 'Zero Penalties',
            summary: 'Transfer or withdraw money anytime via ACH, wire, or ATM without early break fees.',
            detail: 'Ideal for emergency cushions because emergencies never announce themselves in advance.',
          },
          {
            icon: '📈',
            tone: 'fw-mint',
            title: '3. Compounding APY',
            badge: '4.50% APY',
            summary: 'Interest compounds daily and is deposited straight into your balance monthly.',
            detail: 'Earns hundreds of dollars more than traditional brick-and-mortar savings accounts.',
          },
          {
            icon: '🌊',
            tone: 'fw-peach',
            title: '4. Floating Rate',
            badge: 'Macro Variable',
            summary: 'Yield floats dynamically with Federal Reserve benchmark interest rate adjustments.',
            detail: 'Rates go up when the Fed raises rates, and drift downward when the Fed cuts rates.',
          },
        ];
      case 'stock-basics':
        return [
          {
            icon: '🏢',
            tone: 'fw-lavender',
            title: '1. Equity Ownership',
            badge: 'Co-Owner',
            summary: 'Purchasing common stock makes you a fractional co-owner of the corporation.',
            detail: 'You have a claim on company assets, long-term earnings, and voting rights.',
          },
          {
            icon: '📊',
            tone: 'fw-peach',
            title: '2. Market Pricing',
            badge: 'Intraday Fluctuation',
            summary: 'Share prices move every second markets are open based on buyers, sellers, and earnings.',
            detail: 'Short-term price action is volatile; long-term value tracks real corporate profitability.',
          },
          {
            icon: '💵',
            tone: 'fw-mint',
            title: '3. Cash Dividends',
            badge: 'Profit Share',
            summary: 'Profitable mature companies return surplus cash directly to shareholders.',
            detail: 'Dividends can be spent as passive cashflow or automatically reinvested (DRIP).',
          },
          {
            icon: '⏳',
            tone: 'fw-lavender',
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
            tone: 'fw-lavender',
            title: '1. The Bundled Basket',
            badge: '500+ Stocks in 1',
            summary: 'An ETF pools hundreds or thousands of individual stocks into a single tradable share.',
            detail: 'Buying 1 share of an S&P 500 ETF (SPY/VOO) gives you immediate ownership across 500 top US companies.',
          },
          {
            icon: '🛡️',
            tone: 'fw-mint',
            title: '2. Instant Diversification',
            badge: 'Risk Mitigation',
            summary: 'If a single company in the fund goes bankrupt, the other 499 companies cushion the index.',
            detail: 'Eliminates idiosyncratic single-stock catastrophe risk while capturing broader economic growth.',
          },
          {
            icon: '⚡',
            tone: 'fw-peach',
            title: '3. Stock Exchange Tradability',
            badge: 'Live Trading',
            summary: 'Trades continuously throughout regular market hours with real-time price updates.',
            detail: 'Can be bought or sold with market orders, limit orders, or fractional shares on standard brokerages.',
          },
          {
            icon: '🏷️',
            tone: 'fw-mint',
            title: '4. Ultra-Low Expense Ratio',
            badge: '0.03% Fee',
            summary: 'Passive index ETFs charge microscopic management fees compared to active mutual funds.',
            detail: 'A 0.03% expense ratio means you pay only 30 cents per year for every $1,000 invested.',
          },
        ];
      case 'options-intro':
      default:
        return [
          {
            icon: '📜',
            tone: 'fw-lavender',
            title: '1. Derivatives Contract',
            badge: '100 Shares Unit',
            summary: 'An options contract confers the right (not obligation) to buy (Call) or sell (Put) 100 shares.',
            detail: 'Options derive their value from an underlying stock; you do not own the actual stock.',
          },
          {
            icon: '⏳',
            tone: 'fw-peach',
            title: '2. Time Decay (Theta)',
            badge: 'Expiring Asset',
            summary: 'Options have fixed expiration dates. Every day that passes erodes the contract value.',
            detail: 'Even if the stock price moves slightly in your direction, time decay can still wipe out profits.',
          },
          {
            icon: '⚠️',
            tone: 'fw-peach',
            title: '3. Asymmetric Loss Risk',
            badge: '100% Capital Risk',
            summary: 'Options buyers frequently lose 100% of the cash premium paid upfront.',
            detail: 'Leverage magnifies both gains and total losses; never use essential cash or emergency reserves.',
          },
          {
            icon: '🛡️',
            tone: 'fw-mint',
            title: '4. Educational Sandbox',
            badge: 'No Real Risk',
            summary: 'Use this platform strictly to learn mechanics and portfolio hedging without risking real money.',
            detail: 'Beginners should master CDs, HYSAs, and broad ETFs long before ever touching derivatives.',
          },
        ];
    }
  };

  const steps = getSteps();
  const safeStep = activeStep < steps.length ? activeStep : 0;
  const current = steps[safeStep] || steps[0];

  return (
    <div className="fw-panel !rounded-[21px] border border-[#e8e4f1] bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8e4f1] pb-3">
        <div>
          <span className="fw-kicker block">Lifecycle Walkthrough</span>
          <h4 className="text-base font-black tracking-[-0.03em] text-[#222038] mt-0.5">
            Instrument Lifecycle Journey
          </h4>
          <p className="text-xs text-[#615d76]">
            Step through the financial journey from inception to maturity.
          </p>
        </div>
        <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-[#eee6ff] text-[#4f32a9] border border-[#dfd5f8]">
          Step {safeStep + 1} of {steps.length}
        </span>
      </div>

      {/* Interactive Step Navigator Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {steps.map((step, idx) => {
          const isSelected = idx === safeStep;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveStep(idx)}
              className={`p-2.5 rounded-[14px] text-left border transition-all text-xs flex items-center gap-2 ${
                isSelected
                  ? 'bg-[#272047] text-white border-[#272047] shadow-[0_8px_18px_rgba(39,32,71,0.16)] font-bold'
                  : 'bg-[#fbfaff] hover:bg-[#f4f0fd] border-[#e8e4f1] hover:border-[#cbb8f6] text-[#222038]'
              }`}
            >
              <span
                className={`w-8 h-8 rounded-[10px] grid place-items-center text-sm shrink-0 ${
                  isSelected ? 'bg-[#3c316e] text-[#dbfb84]' : step.tone
                }`}
                aria-hidden="true"
              >
                {step.icon}
              </span>
              <div className="truncate">
                <span className="block truncate font-bold">{step.title}</span>
                <span
                  className={`text-[10px] block truncate font-semibold ${
                    isSelected ? 'text-[#dbfb84]' : 'text-[#615d76]'
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
      <div className="rounded-[18px] p-4 sm:p-5 border border-[#dfd5f8] bg-[linear-gradient(120deg,#f5f0ff,#fbfaff)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 flex-1">
          <span className={`fw-tile ${current.tone} shrink-0`} aria-hidden="true">
            {current.icon}
          </span>
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm sm:text-base font-black tracking-[-0.02em] text-[#222038]">
                {current.title}
              </span>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${current.tone}`}
              >
                {current.badge}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-[#222038] leading-relaxed">
              {current.summary}
            </p>
            <p className="text-xs text-[#615d76] leading-relaxed">
              <strong className="text-[#4f32a9]">Key Insight:</strong> {current.detail}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            disabled={safeStep === 0}
            onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
            className="px-3 py-1.5 text-xs rounded-[11px] border border-[#e8e4f1] bg-white hover:bg-[#f4f0fd] hover:border-[#cfc1fa] disabled:opacity-40 disabled:cursor-not-allowed font-bold text-[#222038] transition-colors"
          >
            ← Prev
          </button>
          <button
            type="button"
            disabled={safeStep === steps.length - 1}
            onClick={() => setActiveStep((prev) => Math.min(steps.length - 1, prev + 1))}
            className="px-3.5 py-1.5 text-xs rounded-[11px] bg-[#5637ca] hover:bg-[#4626ad] disabled:bg-[#eeeaf5] disabled:text-[#726a83] disabled:cursor-not-allowed font-bold text-white shadow-2xs transition-colors"
          >
            Next Step →
          </button>
        </div>
      </div>
    </div>
  );
}

export function InteractiveWhatIfTool({ topicId }: { topicId: string }) {
  const normalizedTopic = normalizeTopicId(topicId);

  // CD State
  const [cdDeposit, setCdDeposit] = useState<number>(2000);
  const [cdMonthsPassed, setCdMonthsPassed] = useState<number>(2);
  const cdApy = 5.0;
  const cdTermMonths = 12;
  const cdPenaltyDays = 90;

  // HYSA State
  const [hysaDeposit, setHysaDeposit] = useState<number>(5000);
  const [fedRate, setFedRate] = useState<number>(4.75);

  // Stock State
  const [stockShock, setStockShock] = useState<number>(-15);
  const [dcaAmount, setDcaAmount] = useState<number>(200);

  // ETF State
  const [singleStockCrash, setSingleStockCrash] = useState<number>(-40);

  // Options State
  const [daysRemaining, setDaysRemaining] = useState<number>(14);

  return (
    <div className="fw-panel !rounded-[21px] border border-[#e8e4f1] bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8e4f1] pb-3">
        <div>
          <span className="fw-kicker block">Scenario Sandbox</span>
          <h4 className="text-base font-black tracking-[-0.03em] text-[#222038] mt-0.5">
            Scenario &amp; &ldquo;What-If&rdquo; Simulator
          </h4>
          <p className="text-xs text-[#615d76]">
            Stress-test this instrument with live interactive inputs to see real financial outcomes.
          </p>
        </div>
        <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-[#eee6ff] text-[#4f32a9] border border-[#dfd5f8]">
          Interactive Tool
        </span>
      </div>

      {/* TOPIC 1: CD EARLY WITHDRAWAL BREAK SIMULATOR */}
      {normalizedTopic === 'cd-basics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-[16px] bg-[#fbfaff] border border-[#e8e4f1]">
              <label className="font-bold text-[#222038] block mb-1.5">
                Initial CD Deposit: ${cdDeposit.toLocaleString()}
              </label>
              <input
                type="range"
                min="500"
                max="10000"
                step="500"
                value={cdDeposit}
                onChange={(e) => setCdDeposit(Number(e.target.value))}
                className="w-full accent-[#5637ca]"
              />
              <div className="flex justify-between text-[10px] font-semibold text-[#615d76] mt-1">
                <span>$500</span>
                <span>$5,000</span>
                <span>$10,000</span>
              </div>
            </div>

            <div className="p-3.5 rounded-[16px] bg-[#fbfaff] border border-[#e8e4f1]">
              <label className="font-bold text-[#222038] block mb-1.5">
                When Do You Break Early? Month {cdMonthsPassed} of {cdTermMonths}
              </label>
              <input
                type="range"
                min="1"
                max="11"
                step="1"
                value={cdMonthsPassed}
                onChange={(e) => setCdMonthsPassed(Number(e.target.value))}
                className="w-full accent-[#b8623d]"
              />
              <div className="flex justify-between text-[10px] font-semibold text-[#615d76] mt-1">
                <span>Month 1 (Immediate)</span>
                <span>Month 6</span>
                <span>Month 11</span>
              </div>
            </div>
          </div>

          {(() => {
            const earnedInterest = cdDeposit * (cdApy / 100) * (cdMonthsPassed / 12);
            const penalty = cdDeposit * (cdApy / 100) * (cdPenaltyDays / 365);
            const netCash = cdDeposit + earnedInterest - penalty;
            const netGainLoss = earnedInterest - penalty;
            const penaltyEatsPrincipal = netGainLoss < 0;

            return (
              <div className="p-4 rounded-[18px] border border-[#e8e4f1] bg-[#f8f7fc] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-[14px] bg-[#e3f3d9]/65 border border-[#c3e2b0]">
                    <span className="text-[#285137] font-bold block text-[11px]">
                      Earned Interest (Mo {cdMonthsPassed})
                    </span>
                    <span className="text-base font-black text-[#285137] font-mono tabular-nums">
                      +${earnedInterest.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-[14px] bg-[#ffe9da]/80 border border-[#f5cdb2]">
                    <span className="text-[#7b402a] font-bold block text-[11px]">
                      90-Day Early Penalty (EWP)
                    </span>
                    <span className="text-base font-black text-[#7b402a] font-mono tabular-nums">
                      -${penalty.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-[14px] bg-white border border-[#dfd5f8]">
                    <span className="text-[#615d76] font-bold block text-[11px]">
                      Net Payout Returned
                    </span>
                    <span className="text-base font-black text-[#222038] font-mono tabular-nums">
                      ${netCash.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-[14px] text-xs flex flex-wrap items-center justify-between gap-2 border ${
                    penaltyEatsPrincipal
                      ? 'bg-[#ffe9da] border-[#f0bca0] text-[#7b402a]'
                      : 'bg-[#e3f3d9] border-[#b7dc9f] text-[#285137]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium flex-1">
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
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/80">
                    {penaltyEatsPrincipal ? 'Principal Loss' : 'Net Gain'}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TOPIC 2: HYSA FLOATING RATE & BANK COMPARISON */}
      {normalizedTopic === 'hysa-basics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-[16px] bg-[#fbfaff] border border-[#e8e4f1]">
              <label className="font-bold text-[#222038] block mb-1.5">
                Emergency Savings: ${hysaDeposit.toLocaleString()}
              </label>
              <input
                type="range"
                min="1000"
                max="25000"
                step="1000"
                value={hysaDeposit}
                onChange={(e) => setHysaDeposit(Number(e.target.value))}
                className="w-full accent-[#5637ca]"
              />
              <div className="flex justify-between text-[10px] font-semibold text-[#615d76] mt-1">
                <span>$1k</span>
                <span>$10k</span>
                <span>$25k</span>
              </div>
            </div>

            <div className="p-3.5 rounded-[16px] bg-[#fbfaff] border border-[#e8e4f1]">
              <label className="font-bold text-[#222038] block mb-1.5">
                Fed Benchmark Rate: {fedRate.toFixed(2)}% (HYSA yields ~{(fedRate - 0.25).toFixed(2)}%)
              </label>
              <input
                type="range"
                min="1.0"
                max="6.5"
                step="0.25"
                value={fedRate}
                onChange={(e) => setFedRate(Number(e.target.value))}
                className="w-full accent-[#5637ca]"
              />
              <div className="flex justify-between text-[10px] font-semibold text-[#615d76] mt-1">
                <span>1.0% (Low rate cycle)</span>
                <span>4.0%</span>
                <span>6.5% (High rate cycle)</span>
              </div>
            </div>
          </div>

          {(() => {
            const hysaApy = Math.max(0.5, fedRate - 0.25);
            const hysaAnnual = hysaDeposit * (hysaApy / 100);
            const traditionalAnnual = hysaDeposit * 0.0001;
            const difference = hysaAnnual - traditionalAnnual;

            return (
              <div className="p-4 rounded-[18px] border border-[#e8e4f1] bg-[#f8f7fc] space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-[14px] bg-white border border-[#e8e4f1]">
                    <span className="text-[#615d76] font-semibold block text-[11px]">
                      Old Brick-and-Mortar Bank (0.01% APY)
                    </span>
                    <span className="text-base font-black text-[#615d76] font-mono tabular-nums">
                      ${traditionalAnnual.toFixed(2)} / year
                    </span>
                    <span className="text-[10px] text-[#78728d] block mt-1">
                      Virtually zero return
                    </span>
                  </div>
                  <div className="p-3.5 rounded-[14px] bg-[#e3f3d9]/80 border border-[#b7dc9f]">
                    <span className="text-[#285137] block text-[11px] font-bold">
                      Digital High-Yield Account ({hysaApy.toFixed(2)}% APY)
                    </span>
                    <span className="text-base font-black text-[#285137] font-mono tabular-nums">
                      +${hysaAnnual.toFixed(2)} / year
                    </span>
                    <span className="text-[10px] text-[#285137] block mt-1 font-extrabold">
                      Earns ${difference.toFixed(2)} more every single year!
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-[14px] bg-[#eee6ff] border border-[#dfd5f8] text-[#4f32a9] text-xs font-medium">
                  💡 <strong>Liquidity Advantage:</strong> Unlike a CD, this entire $
                  {hysaDeposit.toLocaleString()} remains accessible 24/7 without a single cent in
                  early withdrawal penalties.
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TOPIC 3: STOCKS DCA VS PANIC SELLING */}
      {normalizedTopic === 'stock-basics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-[16px] bg-[#fbfaff] border border-[#e8e4f1]">
              <label className="font-bold text-[#222038] block mb-1.5">
                Market Fluctuation Scenario:{' '}
                {stockShock > 0 ? `+${stockShock}% Bull Run` : `${stockShock}% Correction`}
              </label>
              <input
                type="range"
                min="-35"
                max="25"
                step="5"
                value={stockShock}
                onChange={(e) => setStockShock(Number(e.target.value))}
                className="w-full accent-[#5637ca]"
              />
              <div className="flex justify-between text-[10px] font-semibold text-[#615d76] mt-1">
                <span>-35% Crash</span>
                <span>0% Flat</span>
                <span>+25% Surge</span>
              </div>
            </div>

            <div className="p-3.5 rounded-[16px] bg-[#fbfaff] border border-[#e8e4f1]">
              <label className="font-bold text-[#222038] block mb-1.5">
                Monthly DCA Discipline: ${dcaAmount}/month
              </label>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={dcaAmount}
                onChange={(e) => setDcaAmount(Number(e.target.value))}
                className="w-full accent-[#285137]"
              />
              <div className="flex justify-between text-[10px] font-semibold text-[#615d76] mt-1">
                <span>$50</span>
                <span>$500</span>
                <span>$1,000</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-[18px] border border-[#e8e4f1] bg-[#f8f7fc] space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-[14px] bg-[#ffe9da]/80 border border-[#f5cdb2]">
                <span className="text-[#7b402a] block font-extrabold text-[11px]">
                  The Emotional Panic Seller
                </span>
                <p className="text-[#7b402a] text-xs mt-1 leading-relaxed">
                  Sees market drop {stockShock}%, panics, sells at bottom, and locks in permanent
                  loss. Misses the eventual recovery.
                </p>
              </div>
              <div className="p-3.5 rounded-[14px] bg-[#e3f3d9]/80 border border-[#b7dc9f]">
                <span className="text-[#285137] block font-extrabold text-[11px]">
                  The Systematic DCA Investor
                </span>
                <p className="text-[#285137] text-xs mt-1 leading-relaxed">
                  Keeps buying ${dcaAmount}/month. When prices drop {stockShock}%, each dollar buys
                  more shares at discounted valuations!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOPIC 4: ETF BASKET VS SINGLE STOCK RISK */}
      {normalizedTopic === 'etf-basics' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-[16px] bg-[#fbfaff] border border-[#e8e4f1] text-xs space-y-1.5">
            <label className="font-bold text-[#222038] block">
              Single Company Catastrophe: Stock crashes {singleStockCrash}% (accounting fraud /
              failed drug / CEO scandal)
            </label>
            <input
              type="range"
              min="-80"
              max="-10"
              step="5"
              value={singleStockCrash}
              onChange={(e) => setSingleStockCrash(Number(e.target.value))}
              className="w-full accent-[#b8623d]"
            />
            <div className="flex justify-between text-[10px] font-semibold text-[#615d76]">
              <span>-10% Bad Quarter</span>
              <span>-40% Earnings Miss</span>
              <span>-80% Catastrophe</span>
            </div>
          </div>

          {(() => {
            const singleStockLoss = singleStockCrash;
            const indexWeight = 0.02;
            const etfImpact = singleStockCrash * indexWeight;

            return (
              <div className="p-4 rounded-[18px] border border-[#e8e4f1] bg-[#f8f7fc] space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-[14px] bg-[#ffe9da]/80 border border-[#f5cdb2] text-[#7b402a]">
                    <span className="text-[11px] font-extrabold block">
                      All-In on Single Stock
                    </span>
                    <span className="text-lg font-black font-mono tabular-nums">
                      {singleStockLoss}%
                    </span>
                    <p className="text-[11px] mt-1 leading-relaxed">
                      $1,000 becomes ${(1000 * (1 + singleStockLoss / 100)).toFixed(0)}. Devastating
                      personal wealth loss.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-[14px] bg-[#e3f3d9]/80 border border-[#b7dc9f] text-[#285137]">
                    <span className="text-[11px] font-extrabold block">
                      Diversified Index ETF
                    </span>
                    <span className="text-lg font-black font-mono tabular-nums">
                      {etfImpact.toFixed(2)}%
                    </span>
                    <p className="text-[11px] mt-1 leading-relaxed">
                      $1,000 becomes ${(1000 * (1 + etfImpact / 100)).toFixed(2)}. The crash is
                      absorbed seamlessly by 499 other companies.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TOPIC 5: OPTIONS TIME DECAY */}
      {normalizedTopic === 'options-intro' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-[16px] bg-[#fbfaff] border border-[#e8e4f1] text-xs space-y-1.5">
            <label className="font-bold text-[#222038] block">
              Days Until Expiration: {daysRemaining} Days Left
            </label>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={daysRemaining}
              onChange={(e) => setDaysRemaining(Number(e.target.value))}
              className="w-full accent-[#5637ca]"
            />
            <div className="flex justify-between text-[10px] font-semibold text-[#615d76]">
              <span>0 Days (Expired - $0 Value)</span>
              <span>15 Days</span>
              <span>30 Days (Full Premium)</span>
            </div>
          </div>

          {(() => {
            const initialPremium = 300;
            const decayFactor = Math.pow(daysRemaining / 30, 1.8);
            const currentOptionValue = initialPremium * decayFactor;
            const lossPercent = ((initialPremium - currentOptionValue) / initialPremium) * 100;

            return (
              <div className="p-4 rounded-[18px] border border-[#e8e4f1] bg-[#f8f7fc] space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-[14px] bg-white border border-[#e8e4f1]">
                    <span className="text-[#615d76] text-[11px] font-semibold block">
                      Initial Premium Paid
                    </span>
                    <span className="text-base font-black text-[#222038] font-mono tabular-nums">
                      ${initialPremium.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-[14px] bg-[#eee6ff]/80 border border-[#dfd5f8]">
                    <span className="text-[#4f32a9] text-[11px] font-bold block">
                      Current Contract Value
                    </span>
                    <span className="text-base font-black text-[#4f32a9] font-mono tabular-nums">
                      ${currentOptionValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-[14px] bg-[#ffe9da]/80 border border-[#f5cdb2]">
                    <span className="text-[#7b402a] text-[11px] font-bold block">
                      Theta Time Decay Loss
                    </span>
                    <span className="text-base font-black text-[#7b402a] font-mono tabular-nums">
                      -{lossPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-[14px] bg-[#ffe9da] border border-[#f0bca0] text-[#7b402a] text-xs font-medium">
                  ⚠️ <strong>Key Risk Reality:</strong> Stocks don&apos;t expire. Options contracts
                  do. If the stock doesn&apos;t move past your strike price before Day 0, you lose
                  100% of the money you spent.
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
      icon: '🎓',
      tone: 'fw-lavender',
      title: '🎓 Tuition / Down Payment in 12 Mo',
      description: 'Known future deadline. Cannot risk nominal capital loss.',
      matchTopicId: 'cd-basics',
      matchName: 'Certificate of Deposit (CD)',
      why: 'Guaranteed 5.0% APY locked with FDIC protection up to $250k. Eliminates stock market correction risk right before your payment is due.',
      tag: 'Principal Safe',
    },
    {
      id: 'emergency',
      icon: '🚨',
      tone: 'fw-peach',
      title: '🚨 Emergency Cushion ($2,000)',
      description: 'Must withdraw anytime at 2 AM without fees or market delay.',
      matchTopicId: 'hysa-basics',
      matchName: 'High-Yield Savings Account (HYSA)',
      why: '100% liquid daily access via ACH/ATM with 4.5% compound APY. Zero early withdrawal penalties.',
      tag: '100% Liquid',
    },
    {
      id: 'wealth',
      icon: '🚀',
      tone: 'fw-mint',
      title: '🚀 Long-Term Wealth (10+ Years)',
      description: 'Saving for retirement or financial freedom. Willing to tolerate volatility.',
      matchTopicId: 'etf-basics',
      matchName: 'Broad-Market Index ETF',
      why: 'Owns 500+ top companies with ultra-low 0.03% expense ratio. Historical compounding significantly beats inflation and bank yields.',
      tag: 'High Compounder',
    },
    {
      id: 'dividend',
      icon: '🏢',
      tone: 'fw-lavender',
      title: '🏢 Individual Company Equity',
      description: 'Belief in a specific blue-chip enterprise and its dividend cashflow.',
      matchTopicId: 'stock-basics',
      matchName: 'Individual Common Stock',
      why: 'Direct corporate ownership with dividend payouts and voting rights, balanced with broader ETF holdings.',
      tag: 'Equity Co-Owner',
    },
  ];

  const active = GOALS.find((g) => g.id === selectedGoal) || GOALS[0];

  return (
    <div className="fw-panel !rounded-[21px] border border-[#e8e4f1] bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8e4f1] pb-3">
        <div>
          <span className="fw-kicker block">Strategy Matchmaker</span>
          <h4 className="text-base font-black tracking-[-0.03em] text-[#222038] mt-0.5">
            Goal &amp; Strategy Matcher
          </h4>
          <p className="text-xs text-[#615d76]">
            Select your financial situation to see which instrument aligns with your goal.
          </p>
        </div>
        <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-[#e3f3d9] text-[#285137] border border-[#c3e2b0]">
          Decision Engine
        </span>
      </div>

      {/* Goal Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {GOALS.map((goal) => {
          const isSelected = goal.id === selectedGoal;
          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => setSelectedGoal(goal.id)}
              className={`p-3.5 rounded-[16px] text-left border transition-all text-xs ${
                isSelected
                  ? 'bg-[#272047] text-white border-[#272047] shadow-[0_8px_20px_rgba(39,32,71,0.16)] font-semibold'
                  : 'bg-[#fbfaff] hover:bg-[#f4f0fd] border-[#e8e4f1] hover:border-[#cbb8f6] text-[#222038]'
              }`}
            >
              <div className="font-bold truncate">{goal.title}</div>
              <div
                className={`text-[11px] mt-1 line-clamp-2 ${
                  isSelected ? 'text-[#e8dcff]' : 'text-[#615d76]'
                }`}
              >
                {goal.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Match Result Banner */}
      <div className="rounded-[18px] p-4 border border-[#dfd5f8] bg-[linear-gradient(110deg,#ede4ff,#f7f2ff_65%,#f6fde8)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <span className={`fw-tile ${active.tone} shrink-0`} aria-hidden="true">
            {active.icon}
          </span>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="fw-kicker">Recommended:</span>
              <span className="text-sm font-black text-[#222038]">{active.matchName}</span>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#e3f3d9] text-[#285137] border border-[#c3e2b0]">
                {active.tag}
              </span>
            </div>
            <p className="text-xs text-[#4b4563] leading-relaxed">{active.why}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelectTopic(active.matchTopicId)}
          className="fw-button fw-button-lime self-start sm:self-center whitespace-nowrap shadow-xs"
        >
          Study {active.matchName} →
        </button>
      </div>
    </div>
  );
}

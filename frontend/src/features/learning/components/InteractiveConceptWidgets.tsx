import { useState } from 'react';
import { Tuck } from '../../home/Tuck';
import { soundFx } from '../../gamification/soundFxService';
import { triggerConfetti } from '../../../components/common/CelebrationConfetti';

export interface InteractiveWidgetsProps {
  topicId: string;
}

function normalizeTopicId(topicId: string): string {
  if (topicId === 'stocks-basics') return 'stock-basics';
  if (topicId === 'options-basics') return 'options-intro';
  return topicId;
}

const DUO_PILL_BASE =
  'border-2 border-b-4 rounded-2xl active:border-b-2 active:translate-y-0.5 transition-all font-bold cursor-pointer select-none';

const DUO_GREEN_BTN =
  'border-2 border-b-4 rounded-2xl border-[#46a302] bg-[#58cc02] hover:bg-[#4ec000] text-white active:border-b-2 active:translate-y-0.5 transition-all font-extrabold cursor-pointer select-none shadow-xs';

interface LifecycleStep {
  icon: string;
  tone: string;
  title: string;
  badge: string;
  summary: string;
  tuckTip: string;
}

export function InstrumentLifecycleDiagram({ topicId }: { topicId: string }) {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({ 0: true });
  const [journeyDone, setJourneyDone] = useState<boolean>(false);
  const normalizedTopic = normalizeTopicId(topicId);

  const getSteps = (): LifecycleStep[] => {
    switch (normalizedTopic) {
      case 'cd-basics':
        return [
          {
            icon: '💵',
            tone: 'bg-[#eee6ff] text-[#4f32a9] border-[#d3c2fb]',
            title: '1. Drop Cash In',
            badge: 'Fixed Deposit',
            summary: 'Put in one lump sum (like $1,000) and pick your lock-in timer (like 12 months).',
            tuckTip: 'Tuck says: Think of this like sealing your cash inside a time capsule! 🔒',
          },
          {
            icon: '🔒',
            tone: 'bg-[#e3f3d9] text-[#285137] border-[#b7dc9f]',
            title: '2. Lock That Rate',
            badge: '5.00% APY',
            summary: 'Your interest rate locks on day one — even if banks cut rates next week!',
            tuckTip: 'Tuck says: Fixed rate = zero stress about Fed rate cuts! 😌',
          },
          {
            icon: '🛡️',
            tone: 'bg-[#eee6ff] text-[#4f32a9] border-[#d3c2fb]',
            title: '3. FDIC Shield',
            badge: '$250k Safe',
            summary: 'Federal FDIC/NCUA insurance protects your deposit up to $250,000 per bank.',
            tuckTip: 'Tuck says: Backed by the US government — super sturdy! 🛡️',
          },
          {
            icon: '🏁',
            tone: 'bg-[#e8fcd6] text-[#1e4620] border-[#86efac]',
            title: '4. Collect Payout',
            badge: '$1,050 Back',
            summary: 'Timer ends! Grab your $1,000 back plus $50 of guaranteed profit.',
            tuckTip: 'Tuck says: Payday! Roll it into a new CD or spend it on your goal! 🎉',
          },
          {
            icon: '⚠️',
            tone: 'bg-[#ffe9da] text-[#7b402a] border-[#f5cdb2]',
            title: '5. Early Break Rule',
            badge: 'Penalty Alert',
            summary: 'Pull cash out early and you lose ~90 days of interest as a penalty.',
            tuckTip: 'Tuck says: Keep emergency money out of CDs so you never pay this fee! 🚨',
          },
        ];
      case 'hysa-basics':
        return [
          {
            icon: '💵',
            tone: 'bg-[#eee6ff] text-[#4f32a9] border-[#d3c2fb]',
            title: '1. Add Anytime',
            badge: 'Flexible',
            summary: 'Start with $1 or $1,000 and add more whenever payday hits.',
            tuckTip: 'Tuck says: Zero lump-sum rules — add a little each paycheck! 💸',
          },
          {
            icon: '💧',
            tone: 'bg-[#e3f3d9] text-[#285137] border-[#b7dc9f]',
            title: '2. Grab Cash 24/7',
            badge: 'Zero Fees',
            summary: 'Need money for a car repair? Transfer it out anytime with zero penalties.',
            tuckTip: 'Tuck says: Pure liquidity means zero panic when surprises happen! 💧',
          },
          {
            icon: '📈',
            tone: 'bg-[#e8fcd6] text-[#1e4620] border-[#86efac]',
            title: '3. Earn 10x–40x More',
            badge: '4.50% APY',
            summary: 'Online banks skip pricey storefronts and pass those savings to you in APY.',
            tuckTip: 'Tuck says: Don’t settle for 0.01% pennies at an old brick bank! ⚡',
          },
          {
            icon: '🌊',
            tone: 'bg-[#ffe9da] text-[#7b402a] border-[#f5cdb2]',
            title: '4. Variable Rate',
            badge: 'Floats',
            summary: 'Your APY moves up or down whenever the Federal Reserve adjusts rates.',
            tuckTip: 'Tuck says: Unlike a CD, your HYSA rate floats with the economy! 🌊',
          },
        ];
      case 'stock-basics':
        return [
          {
            icon: '🏢',
            tone: 'bg-[#eee6ff] text-[#4f32a9] border-[#d3c2fb]',
            title: '1. Own a Slice',
            badge: 'Co-Owner',
            summary: '1 share of stock = real fractional ownership in a public company.',
            tuckTip: 'Tuck says: Welcome to the owners’ club! 🏢✨',
          },
          {
            icon: '📊',
            tone: 'bg-[#ffe9da] text-[#7b402a] border-[#f5cdb2]',
            title: '2. Live Price Swings',
            badge: 'Supply & Demand',
            summary: 'Prices bounce every second based on earnings news and buyer demand.',
            tuckTip: 'Tuck says: Ignore daily noise — zoom out to 5+ years! 🔭',
          },
          {
            icon: '💵',
            tone: 'bg-[#e3f3d9] text-[#285137] border-[#b7dc9f]',
            title: '3. Cash Dividends',
            badge: 'Profit Share',
            summary: 'Many mature companies pay cash dividends directly to shareholders.',
            tuckTip: 'Tuck says: Reinvest those dividends to snowball faster! ❄️',
          },
          {
            icon: '⏳',
            tone: 'bg-[#eee6ff] text-[#4f32a9] border-[#d3c2fb]',
            title: '4. Long Horizon',
            badge: '5+ Years',
            summary: 'Stocks have zero FDIC insurance — only invest money you won’t need soon.',
            tuckTip: 'Tuck says: SIPC covers broker failure, never market dips! 🛡️',
          },
        ];
      case 'etf-basics':
        return [
          {
            icon: '🧺',
            tone: 'bg-[#eee6ff] text-[#4f32a9] border-[#d3c2fb]',
            title: '1. Instant Basket',
            badge: '500+ Stocks',
            summary: 'One ETF share gives you tiny slices of hundreds of companies at once.',
            tuckTip: 'Tuck says: Buy the whole haystack instead of hunting for one needle! 🧺',
          },
          {
            icon: '🛡️',
            tone: 'bg-[#e3f3d9] text-[#285137] border-[#b7dc9f]',
            title: '2. Crash Cushion',
            badge: 'Diversified',
            summary: 'If 1 company in the fund flops, 499 others soften the blow.',
            tuckTip: 'Tuck says: Instant safety against single-company disasters! 💪',
          },
          {
            icon: '⚡',
            tone: 'bg-[#ffe9da] text-[#7b402a] border-[#f5cdb2]',
            title: '3. Trade Live',
            badge: 'Intraday',
            summary: 'Unlike mutual funds, ETFs trade all day long while markets are open.',
            tuckTip: 'Tuck says: Buy 1 share at a time — no $3,000 minimum needed! ⚡',
          },
          {
            icon: '🏷️',
            tone: 'bg-[#e8fcd6] text-[#1e4620] border-[#86efac]',
            title: '4. Tiny Fee',
            badge: '0.03% Fee',
            summary: 'A 0.03% expense ratio costs just 30 cents a year per $1,000 invested.',
            tuckTip: 'Tuck says: Low fees mean more compounding stays yours! 🏷️💎',
          },
        ];
      case 'options-intro':
      default:
        return [
          {
            icon: '📜',
            tone: 'bg-[#eee6ff] text-[#4f32a9] border-[#d3c2fb]',
            title: '1. 100-Share Contract',
            badge: 'Calls & Puts',
            summary: 'Options give the right (not duty) to buy (Call) or sell (Put) 100 shares.',
            tuckTip: 'Tuck says: Educational only — not enabled in our cash trading lab! 🎓',
          },
          {
            icon: '⏳',
            tone: 'bg-[#ffe9da] text-[#7b402a] border-[#f5cdb2]',
            title: '2. Melting Clock',
            badge: 'Theta Decay',
            summary: 'Options expire! Every day that passes drains value out of the contract.',
            tuckTip: 'Tuck says: Time is the enemy of options buyers! ⏳',
          },
          {
            icon: '⚠️',
            tone: 'bg-[#ffe9da] text-[#7b402a] border-[#f5cdb2]',
            title: '3. High Loss Risk',
            badge: 'Max = Premium',
            summary: 'If the stock misses your target by expiration, you lose 100% of your premium.',
            tuckTip: 'Tuck says: Never risk rent or emergency money on leverage! 🚨',
          },
          {
            icon: '🛡️',
            tone: 'bg-[#e3f3d9] text-[#285137] border-[#b7dc9f]',
            title: '4. Smarter Path',
            badge: 'ETFs & Cash',
            summary: 'Build wealth steadily with HYSAs, CDs, and broad index ETFs first.',
            tuckTip: 'Tuck says: Steady compounding beats high-stress gambling every time! 🏆',
          },
        ];
    }
  };

  const steps = getSteps();
  const safeStep = activeStep < steps.length ? activeStep : 0;
  const current = steps[safeStep] || steps[0];
  const progressPct = Math.round(((safeStep + 1) / steps.length) * 100);

  const handleSelectStep = (idx: number) => {
    soundFx.playTactileClick();
    setActiveStep(idx);
    setCompletedSteps((prev) => ({ ...prev, [idx]: true }));
  };

  const handleNextStep = () => {
    if (safeStep < steps.length - 1) {
      const next = safeStep + 1;
      soundFx.playTactileClick();
      setActiveStep(next);
      setCompletedSteps((prev) => ({ ...prev, [next]: true }));
    } else {
      soundFx.playCoinPing();
      triggerConfetti({ particleCount: 55 });
      setJourneyDone(true);
    }
  };

  return (
    <div className="rounded-3xl border-2 border-[#e8e4f1] bg-white p-5 space-y-4 shadow-xs">
      {/* Top Progress Bar */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">🗺️</span>
            <h4 className="text-base font-black tracking-[-0.02em] text-[#222038]">
              Step-by-Step Journey
            </h4>
          </div>
          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#e8fcd6] text-[#1e4620] border border-[#86efac]">
            Step {safeStep + 1} of {steps.length}
          </span>
        </div>

        <div className="h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#58cc02] via-[#7ae600] to-[#a3e635] shadow-[0_0_12px_rgba(88,204,2,0.5)] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Tactile 3D Step Selector Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {steps.map((step, idx) => {
          const isSelected = idx === safeStep;
          const isVisited = !!completedSteps[idx];
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectStep(idx)}
              className={`p-2.5 text-left text-xs flex items-center gap-2 ${DUO_PILL_BASE} ${
                isSelected
                  ? 'bg-[#272047] text-white border-[#1b1533] border-b-[#120d24]'
                  : isVisited
                  ? 'bg-[#f4fde8] hover:bg-[#e8fcd6] border-[#86efac] border-b-[#58cc02] text-[#1e4620]'
                  : 'bg-[#fbfaff] hover:bg-[#f4f0fd] border-[#e8e4f1] border-b-[#d2cae6] text-[#222038]'
              }`}
            >
              <span
                className={`w-8 h-8 rounded-xl grid place-items-center text-base shrink-0 ${
                  isSelected ? 'bg-[#3c316e] text-[#dbfb84]' : 'bg-white border border-black/5'
                }`}
                aria-hidden="true"
              >
                {step.icon}
              </span>
              <div className="min-w-0">
                <span className="block truncate font-extrabold">{step.title}</span>
                <span
                  className={`text-[10px] block truncate font-bold ${
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

      {/* Active Micro-Card */}
      <div className="rounded-2xl p-4 sm:p-5 border-2 border-[#dfd5f8] bg-gradient-to-br from-[#faf8ff] to-[#f4f0fd] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl border-2 border-b-4 grid place-items-center text-3xl shrink-0 ${current.tone}`}
            aria-hidden="true"
          >
            {current.icon}
          </div>

          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-black text-[#222038]">{current.title}</span>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${current.tone}`}>
                {current.badge}
              </span>
            </div>
            <p className="text-sm font-semibold text-[#383354] leading-snug">{current.summary}</p>
          </div>
        </div>

        {/* Tuck Reaction Bubble */}
        <div className="flex items-center gap-3 pt-1">
          <div className="w-11 h-11 rounded-xl bg-white border-2 border-[#d3c2fb] grid place-items-center p-1 shrink-0">
            <Tuck className="w-full h-full object-contain" />
          </div>
          <div className="relative flex-1 rounded-2xl bg-white border-2 border-[#dfd5f8] px-3.5 py-2 text-xs font-bold text-[#222038]">
            <span
              aria-hidden="true"
              className="hidden sm:block absolute -left-2 top-3 w-3 h-3 rotate-45 bg-white border-l-2 border-b-2 border-[#dfd5f8]"
            />
            {current.tuckTip}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e8e4f1]">
          <button
            type="button"
            disabled={safeStep === 0}
            onClick={() => handleSelectStep(Math.max(0, safeStep - 1))}
            className={`px-4 py-2 text-xs bg-white hover:bg-[#f4f0fd] text-[#222038] border-[#e2ddf0] border-b-[#cfc7e6] disabled:opacity-40 disabled:cursor-not-allowed ${DUO_PILL_BASE}`}
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={handleNextStep}
            className={`px-5 py-2 text-xs ${DUO_GREEN_BTN}`}
          >
            {safeStep === steps.length - 1 ? 'Complete Walkthrough 🎉' : 'Next Step →'}
          </button>
        </div>
      </div>

      {journeyDone && (
        <div
          role="status"
          className="p-3.5 rounded-2xl bg-[#e8fcd6] border-2 border-[#58cc02] text-[#1e4620] text-xs font-extrabold flex flex-wrap items-center justify-between gap-2 animate-scaleUp"
        >
          <span>🎉 Walkthrough Complete! You mapped the whole journey.</span>
          <span className="px-3 py-1 rounded-full bg-[#58cc02] text-white font-black shadow-xs">
            +150 Aura!
          </span>
        </div>
      )}
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

  // Celebratory milestone badge when clicking a smart preset
  const [celebrationMsg, setCelebrationMsg] = useState<string | null>(null);

  const celebrateSmartMove = (msg: string) => {
    setCelebrationMsg(msg);
    soundFx.playCoinPing();
    triggerConfetti({ particleCount: 45 });
  };

  const triggerCaution = (msg: string) => {
    setCelebrationMsg(msg);
    soundFx.playTactileClick();
  };

  return (
    <div className="rounded-3xl border-2 border-[#e8e4f1] bg-white p-5 space-y-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8e4f1] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">🧪</span>
          <div>
            <h4 className="text-base font-black tracking-[-0.02em] text-[#222038]">
              Play &ldquo;What-If&rdquo; Lab
            </h4>
            <p className="text-xs text-[#615d76]">
              Tap a preset or drag sliders to see what happens to your money.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-[#eee6ff] text-[#4f32a9] border border-[#dfd5f8]">
          Interactive Game
        </span>
      </div>

      {/* TOPIC 1: CD EARLY WITHDRAWAL BREAK SIMULATOR */}
      {normalizedTopic === 'cd-basics' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setCdMonthsPassed(2);
                triggerCaution('Oops! Breaking at Month 2 triggers the early penalty!');
              }}
              className={`px-3.5 py-2 text-xs bg-[#fff1e6] hover:bg-[#ffe4cf] border-[#f97316] border-b-[#c2410c] text-[#7b402a] ${DUO_PILL_BASE}`}
            >
              😱 Break Early (Mo 2)
            </button>
            <button
              type="button"
              onClick={() => {
                setCdMonthsPassed(11);
                celebrateSmartMove('Smart move! Holding near maturity keeps your principal safe!');
              }}
              className={`px-3.5 py-2 text-xs bg-[#e8fcd6] hover:bg-[#d8f8bd] border-[#58cc02] border-b-[#46a302] text-[#1e4620] ${DUO_PILL_BASE}`}
            >
              🏆 Hold Long (Mo 11)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#fbfaff] border-2 border-[#e8e4f1]">
              <label className="font-extrabold text-[#222038] block mb-1.5">
                Deposit: ${cdDeposit.toLocaleString()}
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
            </div>

            <div className="p-3.5 rounded-2xl bg-[#fbfaff] border-2 border-[#e8e4f1]">
              <label className="font-extrabold text-[#222038] block mb-1.5">
                Break Month: Month {cdMonthsPassed} of {cdTermMonths}
              </label>
              <input
                type="range"
                min="1"
                max="11"
                step="1"
                value={cdMonthsPassed}
                onChange={(e) => setCdMonthsPassed(Number(e.target.value))}
                className="w-full accent-[#f97316]"
              />
            </div>
          </div>

          {(() => {
            const earnedInterest = cdDeposit * (cdApy / 100) * (cdMonthsPassed / 12);
            const penalty = cdDeposit * (cdApy / 100) * (cdPenaltyDays / 365);
            const netCash = cdDeposit + earnedInterest - penalty;
            const netGainLoss = earnedInterest - penalty;
            const penaltyEatsPrincipal = netGainLoss < 0;

            return (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-[#e8fcd6]/80 border-2 border-[#86efac]">
                    <span className="text-[#1e4620] font-bold block text-[11px]">Earned Interest</span>
                    <span className="text-lg font-black text-[#1e4620] font-mono tabular-nums">
                      +${earnedInterest.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#ffe9da] border-2 border-[#f5cdb2]">
                    <span className="text-[#7b402a] font-bold block text-[11px]">90-Day Penalty</span>
                    <span className="text-lg font-black text-[#7b402a] font-mono tabular-nums">
                      -${penalty.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#f8f5ff] border-2 border-[#d3c2fb]">
                    <span className="text-[#4f32a9] font-bold block text-[11px]">Cash Returned</span>
                    <span className="text-lg font-black text-[#222038] font-mono tabular-nums">
                      ${netCash.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-2xl text-xs flex items-center gap-3 border-2 ${
                    penaltyEatsPrincipal
                      ? 'bg-[#ffe9da] border-[#f97316] text-[#7b402a]'
                      : 'bg-[#e8fcd6] border-[#58cc02] text-[#1e4620]'
                  }`}
                >
                  <span className="text-xl">{penaltyEatsPrincipal ? '⚠️' : '✅'}</span>
                  <span className="font-bold flex-1">
                    {penaltyEatsPrincipal
                      ? `Ouch! Breaking at Month ${cdMonthsPassed} ate $${Math.abs(netGainLoss).toFixed(2)} of your original deposit!`
                      : `Safe! Waiting ${cdMonthsPassed} months left you +$${netGainLoss.toFixed(2)} ahead even after the penalty.`}
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setHysaDeposit(5000);
                setFedRate(4.75);
                celebrateSmartMove('HYSA mode ON! Watch how much more an online bank pays!');
              }}
              className={`px-3.5 py-2 text-xs bg-[#e8fcd6] hover:bg-[#d8f8bd] border-[#58cc02] border-b-[#46a302] text-[#1e4620] ${DUO_PILL_BASE}`}
            >
              ⚡ Compare $5,000 Savings
            </button>
            <button
              type="button"
              onClick={() => {
                setFedRate(2.0);
                triggerCaution('Fed cut rates! Notice how variable HYSA yields drop with it.');
              }}
              className={`px-3.5 py-2 text-xs bg-[#fff1e6] hover:bg-[#ffe4cf] border-[#f97316] border-b-[#c2410c] text-[#7b402a] ${DUO_PILL_BASE}`}
            >
              📉 Test Fed Rate Cut (2%)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#fbfaff] border-2 border-[#e8e4f1]">
              <label className="font-extrabold text-[#222038] block mb-1.5">
                Emergency Fund: ${hysaDeposit.toLocaleString()}
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
            </div>

            <div className="p-3.5 rounded-2xl bg-[#fbfaff] border-2 border-[#e8e4f1]">
              <label className="font-extrabold text-[#222038] block mb-1.5">
                Fed Rate: {fedRate.toFixed(2)}% (HYSA ~{(fedRate - 0.25).toFixed(2)}%)
              </label>
              <input
                type="range"
                min="1.0"
                max="6.5"
                step="0.25"
                value={fedRate}
                onChange={(e) => setFedRate(Number(e.target.value))}
                className="w-full accent-[#58cc02]"
              />
            </div>
          </div>

          {(() => {
            const hysaApy = Math.max(0.5, fedRate - 0.25);
            const hysaAnnual = hysaDeposit * (hysaApy / 100);
            const traditionalAnnual = hysaDeposit * 0.0001;
            const difference = hysaAnnual - traditionalAnnual;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200">
                  <span className="text-[#615d76] font-bold block text-[11px]">
                    🐢 Old Brick Bank (0.01% APY)
                  </span>
                  <span className="text-lg font-black text-[#615d76] font-mono tabular-nums">
                    ${traditionalAnnual.toFixed(2)} / yr
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#e8fcd6] border-2 border-[#58cc02] text-[#1e4620]">
                  <span className="block text-[11px] font-extrabold">
                    ⚡ High-Yield Savings ({hysaApy.toFixed(2)}% APY)
                  </span>
                  <span className="text-lg font-black font-mono tabular-nums">
                    +${hysaAnnual.toFixed(2)} / yr
                  </span>
                  <span className="text-[11px] block font-extrabold mt-0.5">
                    +${difference.toFixed(2)} extra every year — 100% liquid!
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TOPIC 3: STOCKS DCA VS PANIC SELLING */}
      {normalizedTopic === 'stock-basics' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setStockShock(-25);
                setDcaAmount(200);
                celebrateSmartMove('Dip spotted! Monthly DCA buys MORE shares while prices are on sale!');
              }}
              className={`px-3.5 py-2 text-xs bg-[#e8fcd6] hover:bg-[#d8f8bd] border-[#58cc02] border-b-[#46a302] text-[#1e4620] ${DUO_PILL_BASE}`}
            >
              💎 Stay Calm &amp; Buy the Dip (-25%)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#fbfaff] border-2 border-[#e8e4f1]">
              <label className="font-extrabold text-[#222038] block mb-1.5">
                Market Swing: {stockShock > 0 ? `+${stockShock}% Rally` : `${stockShock}% Dip`}
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
            </div>

            <div className="p-3.5 rounded-2xl bg-[#fbfaff] border-2 border-[#e8e4f1]">
              <label className="font-extrabold text-[#222038] block mb-1.5">
                Steady Monthly Plan: ${dcaAmount}/mo
              </label>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={dcaAmount}
                onChange={(e) => setDcaAmount(Number(e.target.value))}
                className="w-full accent-[#58cc02]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#ffe9da] border-2 border-[#f97316] text-[#7b402a]">
              <span className="font-black block">😰 Panic Seller</span>
              <p className="mt-1 font-medium leading-snug">
                Sells during a {stockShock}% dip, locks in losses, and misses the rebound.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#e8fcd6] border-2 border-[#58cc02] text-[#1e4620]">
              <span className="font-black block">💎 Steady Investor</span>
              <p className="mt-1 font-bold leading-snug">
                Keeps adding ${dcaAmount}/mo — buying shares at a discount!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TOPIC 4: ETF BASKET VS SINGLE STOCK RISK */}
      {normalizedTopic === 'etf-basics' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSingleStockCrash(-60);
                celebrateSmartMove('Diversification rescue! 499 other companies absorbed the -60% shock!');
              }}
              className={`px-3.5 py-2 text-xs bg-[#e8fcd6] hover:bg-[#d8f8bd] border-[#58cc02] border-b-[#46a302] text-[#1e4620] ${DUO_PILL_BASE}`}
            >
              🛡️ Stress-Test a -60% Crash!
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#fbfaff] border-2 border-[#e8e4f1] text-xs space-y-1.5">
            <label className="font-extrabold text-[#222038] block">
              One Company Crashes: {singleStockCrash}%
            </label>
            <input
              type="range"
              min="-80"
              max="-10"
              step="5"
              value={singleStockCrash}
              onChange={(e) => setSingleStockCrash(Number(e.target.value))}
              className="w-full accent-[#f97316]"
            />
          </div>

          {(() => {
            const singleStockLoss = singleStockCrash;
            const etfImpact = singleStockCrash * 0.02;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#ffe9da] border-2 border-[#f97316] text-[#7b402a]">
                  <span className="font-black block">🎲 100% in 1 Stock</span>
                  <span className="text-xl font-black font-mono tabular-nums">{singleStockLoss}%</span>
                  <p className="mt-1 font-bold">
                    $1,000 drops to ${(1000 * (1 + singleStockLoss / 100)).toFixed(0)}!
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#e8fcd6] border-2 border-[#58cc02] text-[#1e4620]">
                  <span className="font-black block">🧺 500-Stock Index ETF</span>
                  <span className="text-xl font-black font-mono tabular-nums">
                    {etfImpact.toFixed(2)}%
                  </span>
                  <p className="mt-1 font-bold">
                    $1,000 stays at ${(1000 * (1 + etfImpact / 100)).toFixed(2)}!
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TOPIC 5: OPTIONS TIME DECAY */}
      {normalizedTopic === 'options-intro' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setDaysRemaining(2);
                triggerCaution('Whoa! With 2 days left, time decay wiped almost the whole contract!');
              }}
              className={`px-3.5 py-2 text-xs bg-[#fff1e6] hover:bg-[#ffe4cf] border-[#f97316] border-b-[#c2410c] text-[#7b402a] ${DUO_PILL_BASE}`}
            >
              ⏳ Fast-Forward to Day 2!
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#fbfaff] border-2 border-[#e8e4f1] text-xs space-y-1.5">
            <label className="font-extrabold text-[#222038] block">
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
          </div>

          {(() => {
            const initialPremium = 300;
            const decayFactor = Math.pow(daysRemaining / 30, 1.8);
            const currentOptionValue = initialPremium * decayFactor;
            const lossPercent = ((initialPremium - currentOptionValue) / initialPremium) * 100;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200">
                  <span className="text-[#615d76] font-bold block">Paid Upfront</span>
                  <span className="text-lg font-black font-mono tabular-nums">${initialPremium}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#eee6ff] border-2 border-[#d3c2fb]">
                  <span className="text-[#4f32a9] font-bold block">Value Left</span>
                  <span className="text-lg font-black font-mono tabular-nums text-[#4f32a9]">
                    ${currentOptionValue.toFixed(2)}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#ffe9da] border-2 border-[#f97316] text-[#7b402a]">
                  <span className="font-bold block">Time Decay Loss</span>
                  <span className="text-lg font-black font-mono tabular-nums">
                    -{lossPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {celebrationMsg && (
        <div
          role="status"
          className="p-3.5 rounded-2xl bg-[#e8fcd6] border-2 border-[#58cc02] text-[#1e4620] text-xs font-extrabold flex flex-wrap items-center justify-between gap-2 animate-scaleUp"
        >
          <span>✨ {celebrationMsg}</span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#58cc02] text-white font-black">
            +150 Aura Goal!
          </span>
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
  const [matchedFeedback, setMatchedFeedback] = useState<boolean>(false);

  const GOALS = [
    {
      id: 'tuition',
      icon: '🎓',
      title: 'Tuition in 12 Months',
      description: 'Fixed deadline — zero risk allowed.',
      matchTopicId: 'cd-basics',
      matchName: 'Certificate of Deposit (CD)',
      why: 'Locks a guaranteed 5.0% APY with $250k FDIC protection right up to your deadline!',
      tag: 'Principal Safe',
    },
    {
      id: 'emergency',
      icon: '🚨',
      title: '2 AM Emergency Fund',
      description: 'Need instant access anytime.',
      matchTopicId: 'hysa-basics',
      matchName: 'High-Yield Savings (HYSA)',
      why: '100% liquid anytime with zero break fees, FDIC safety, and ~4.5% APY!',
      tag: '100% Liquid',
    },
    {
      id: 'wealth',
      icon: '🚀',
      title: 'Long-Term Wealth (10+ Yrs)',
      description: 'Building freedom over a decade.',
      matchTopicId: 'etf-basics',
      matchName: 'Broad-Market Index ETF',
      why: 'Owns 500+ top companies in 1 share for tiny 0.03% fees — built to beat inflation!',
      tag: 'High Compounder',
    },
    {
      id: 'dividend',
      icon: '🏢',
      title: 'Back a Favorite Company',
      description: 'Co-own a specific business.',
      matchTopicId: 'stock-basics',
      matchName: 'Individual Common Stock',
      why: 'Direct fractional ownership, voting rights, and potential cash dividends!',
      tag: 'Equity Co-Owner',
    },
  ];

  const active = GOALS.find((g) => g.id === selectedGoal) || GOALS[0];

  const handlePickGoal = (goalId: string) => {
    setSelectedGoal(goalId);
    setMatchedFeedback(true);
    soundFx.playCoinPing();
    triggerConfetti({ particleCount: 40 });
  };

  return (
    <div className="rounded-3xl border-2 border-[#e8e4f1] bg-white p-5 space-y-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8e4f1] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">🎯</span>
          <div>
            <h4 className="text-base font-black tracking-[-0.02em] text-[#222038]">
              Pick Your Goal → Find Your Tool
            </h4>
            <p className="text-xs text-[#615d76]">
              Tap any real-life money goal to see Tuck&apos;s best match!
            </p>
          </div>
        </div>
        <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-[#e8fcd6] text-[#1e4620] border border-[#86efac]">
          Matchmaker
        </span>
      </div>

      {/* Tactile 3D Goal Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {GOALS.map((goal) => {
          const isSelected = goal.id === selectedGoal;
          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => handlePickGoal(goal.id)}
              className={`p-3.5 text-left text-xs ${DUO_PILL_BASE} ${
                isSelected
                  ? 'bg-[#e8fcd6] text-[#1e4620] border-[#58cc02] border-b-[#46a302]'
                  : 'bg-[#fbfaff] hover:bg-[#f4f0fd] border-[#e8e4f1] border-b-[#d2cae6] text-[#222038]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">{goal.icon}</span>
                <span className="font-black truncate">{goal.title}</span>
              </div>
              <p className="text-[11px] mt-1.5 font-semibold opacity-85">{goal.description}</p>
            </button>
          );
        })}
      </div>

      {/* Celebratory Match Result */}
      <div
        className={`rounded-2xl p-4 border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
          matchedFeedback
            ? 'border-[#58cc02] bg-[#e8fcd6]/85'
            : 'border-[#dfd5f8] bg-gradient-to-r from-[#f5f0ff] to-[#f4fde8]'
        }`}
      >
        <div className="flex items-start gap-3 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#d3c2fb] grid place-items-center p-1 shrink-0">
            <Tuck className="w-full h-full object-contain" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#4f32a9]">
                Best Match:
              </span>
              <span className="text-sm font-black text-[#222038]">{active.matchName}</span>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-white text-[#1e4620] border border-[#86efac]">
                {active.tag}
              </span>
              {matchedFeedback && (
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#58cc02] text-white">
                  +150 Aura Ready!
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-[#383354] leading-snug">{active.why}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            soundFx.playTactileClick();
            onSelectTopic(active.matchTopicId);
          }}
          className={`px-4 py-2.5 text-xs whitespace-nowrap ${DUO_GREEN_BTN}`}
        >
          Learn {active.matchName} →
        </button>
      </div>
    </div>
  );
}

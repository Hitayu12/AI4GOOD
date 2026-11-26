import { useId, useState } from 'react';
import { TabOverviewModal } from '../../components/common/TabOverviewModal';
import { questTracker } from '../gamification/questTrackerService';
import { Tuck } from '../home/Tuck';
import paydayCover from '../home/payday-cover.jpg';
import '../home/campaign.css';
import {
  BOUNDS,
  CalculatorMode,
  CalculatorResult,
  calculateGrowth,
  formatCurrency,
  validateCalculatorInputs,
} from './calculatorMath';

export type CalculatorPreset = {
  startingAmount: number;
  monthlyContribution: number;
  annualRatePercent: number;
  horizonMonths: number;
};

type GoalScenario = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  badge: string;
  mode: CalculatorMode;
  start: number;
  monthly: number;
  rate: number;
  months: number;
  targetGoal: number;
  idleTheme: string;
  activeTheme: string;
  badgeTheme: string;
};

type LabScenario = {
  id: string;
  mode: CalculatorMode;
  start: number;
  monthly: number;
  rate: number;
  months: number;
  label: string;
};

const GOAL_CARDS: GoalScenario[] = [
  {
    id: 'boba',
    emoji: '🧋',
    title: 'Boba Stash',
    subtitle: 'Boba to Wealth · $150/mo · 10y',
    badge: 'POPULAR',
    mode: 'investment',
    start: 100,
    monthly: 150,
    rate: 8.5,
    months: 120,
    targetGoal: 25000,
    idleTheme: 'bg-[#f8fee7] border-[#cde785] border-b-[#a8d145] hover:bg-[#f2fcd6]',
    activeTheme: 'bg-[#ecfccb] border-[#58cc02] border-b-[#46a302] ring-2 ring-[#58cc02]/25',
    badgeTheme: 'bg-[#dbfb84] text-[#272047]',
  },
  {
    id: 'car',
    emoji: '🚗',
    title: 'First Car',
    subtitle: '$200/mo · 3 yrs · 4.5% APY',
    badge: 'RIDE',
    mode: 'savings',
    start: 1500,
    monthly: 200,
    rate: 4.5,
    months: 36,
    targetGoal: 9000,
    idleTheme: 'bg-[#fff9eb] border-[#f4d58d] border-b-[#e5b856] hover:bg-[#fff3d6]',
    activeTheme: 'bg-[#fef3c7] border-[#f59e0b] border-b-[#d97706] ring-2 ring-[#f59e0b]/25',
    badgeTheme: 'bg-[#fde68a] text-[#78350f]',
  },
  {
    id: 'hysa',
    emoji: '🛡️',
    title: 'Emergency Fund',
    subtitle: '$100/mo · 1 yr · 4.5% APY',
    badge: 'SAFE',
    mode: 'savings',
    start: 1000,
    monthly: 100,
    rate: 4.5,
    months: 12,
    targetGoal: 2000,
    idleTheme: 'bg-[#f0fdf4] border-[#b7e4c7] border-b-[#74c69d] hover:bg-[#e3f9ec]',
    activeTheme: 'bg-[#dcfce7] border-[#22c55e] border-b-[#16a34a] ring-2 ring-[#22c55e]/25',
    badgeTheme: 'bg-[#bbf7d0] text-[#14532d]',
  },
  {
    id: 'etf',
    emoji: '🌴',
    title: 'Wealth Bag',
    subtitle: '$200/mo · 5 yrs · 8% ETF',
    badge: 'GROWTH',
    mode: 'investment',
    start: 1000,
    monthly: 200,
    rate: 8.0,
    months: 60,
    targetGoal: 15000,
    idleTheme: 'bg-[#f7f4ff] border-[#d8cbf8] border-b-[#b79ef4] hover:bg-[#efeaff]',
    activeTheme: 'bg-[#ede9fe] border-[#7c3aed] border-b-[#5b21b6] ring-2 ring-[#7c3aed]/25',
    badgeTheme: 'bg-[#ddd6fe] text-[#3b0764]',
  },
];

const LAB_SCENARIOS: LabScenario[] = [
  {
    id: 'contract-ref',
    mode: 'investment',
    start: 1000,
    monthly: 0,
    rate: 12.0,
    months: 12,
    label: 'Contract Reference Check (12%)',
  },
  {
    id: 'downturn',
    mode: 'investment',
    start: 1000,
    monthly: 50,
    rate: -10.0,
    months: 12,
    label: 'Market Downturn (-10%)',
  },
];

const DUO_BUTTON_BASE =
  'border-2 border-b-4 rounded-2xl active:border-b-2 active:translate-y-0.5 transition-all duration-100 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7257e0]';

const DUO_CHIP_BASE =
  'border-2 border-b-4 rounded-xl active:border-b-2 active:translate-y-0.5 transition-all duration-100 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7257e0]';

function fieldNumber(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value);
}

function getTuckSpeech(
  result: CalculatorResult | null,
  extraMonthly: number,
  difference: number | null
): string {
  if (!result) {
    return 'Tuck says: Whoa! Fix that highlighted number so I can calculate your bag! 🐾';
  }
  if (result.totalGrowth < 0) {
    return `Tuck says: Market dips shrink the bag (${formatCurrency(result.totalGrowth)}). Time + diversification help you bounce back! 🛡️`;
  }
  if (result.totalGrowth === 0) {
    return result.horizonMonths === 0
      ? 'Tuck says: 0 months means money is just sitting there! Add some time to let interest work. ⏳'
      : 'Tuck says: At 0% interest, you only get back what you deposit. Add a yield to let compound growth fly! 🚀';
  }
  if (extraMonthly > 0 && difference && difference > 0) {
    return `Tuck says: Supercharge! Adding just $${extraMonthly}/mo compounds an extra ${formatCurrency(difference)} into your bag! 🐕💰`;
  }
  return `Tuck says: That's ${result.formattedTotalGrowth} of pure free compound growth on top of your deposits! Good dog energy 🐾`;
}

type QuickChip = {
  label: string;
  value: number;
};

function NumberControlTile({
  id,
  emoji,
  label,
  valueStr,
  numericValue,
  onChange,
  onQuickSelect,
  min,
  max,
  step = 'any',
  sliderMin,
  sliderMax,
  sliderStep,
  sliderAriaLabel,
  chips,
  error,
  rightBadge,
  prefix,
  suffix,
}: {
  id: string;
  emoji: string;
  label: string;
  valueStr: string;
  numericValue: number;
  onChange: (next: string) => void;
  onQuickSelect: (val: number) => void;
  min: number;
  max: number;
  step?: string;
  sliderMin: number;
  sliderMax: number;
  sliderStep: number;
  sliderAriaLabel: string;
  chips: QuickChip[];
  error?: string;
  rightBadge?: string;
  prefix?: string;
  suffix?: string;
}) {
  const clampedSlider = Number.isFinite(numericValue)
    ? Math.min(sliderMax, Math.max(sliderMin, numericValue))
    : sliderMin;

  return (
    <div
      className={`rounded-2xl border-2 p-3 sm:p-3.5 transition-colors ${
        error
          ? 'bg-[#fff5f5] border-[#f43f5e]'
          : 'bg-white border-[#e5def6] hover:border-[#cbbcf2]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <label
          htmlFor={id}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-[#222038] cursor-pointer"
        >
          <span
            aria-hidden="true"
            className="w-6 h-6 rounded-lg bg-[#f3effe] border border-[#dfd5f8] grid place-items-center text-xs shrink-0"
          >
            {emoji}
          </span>
          <span>{label}</span>
        </label>
        {rightBadge && (
          <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full bg-[#eee6ff] text-[#4f32a9] shrink-0">
            {rightBadge}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          {prefix && (
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-2.5 flex items-center text-xs font-black text-[#615d76]"
            >
              {prefix}
            </span>
          )}
          <input
            id={id}
            type="number"
            step={step}
            min={min}
            max={max}
            value={valueStr}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`w-full rounded-xl border-2 py-1.5 font-mono font-black text-sm tabular-nums text-[#222038] focus:outline-none transition-colors ${
              prefix ? 'pl-6' : 'pl-2.5'
            } ${suffix ? 'pr-7' : 'pr-2.5'} ${
              error
                ? 'border-[#e11d48] bg-white focus:ring-2 focus:ring-[#fb7185]/40'
                : 'border-[#ddd5f3] bg-[#faf8ff] focus:border-[#5637ca] focus:bg-white'
            }`}
          />
          {suffix && (
            <span
              aria-hidden="true"
              className="absolute inset-y-0 right-2.5 flex items-center text-xs font-black text-[#615d76]"
            >
              {suffix}
            </span>
          )}
        </div>
      </div>

      {/* Tactile Quick-Tap Chips */}
      <div className="mt-2 flex flex-wrap gap-1">
        {chips.map((chip) => {
          const isActive = numericValue === chip.value;
          return (
            <button
              key={chip.label}
              type="button"
              onClick={() => onQuickSelect(chip.value)}
              className={`${DUO_CHIP_BASE} px-2 py-0.5 text-[11px] font-extrabold ${
                isActive
                  ? 'bg-[#5637ca] border-[#3f23a3] border-b-[#2c157d] text-white'
                  : 'bg-[#f6f3ff] border-[#dfd5f8] border-b-[#c7b7f2] text-[#4f32a9] hover:bg-[#eee6ff]'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Smooth Tactile Slider */}
      <div className="mt-2">
        <input
          type="range"
          aria-label={sliderAriaLabel}
          min={sliderMin}
          max={sliderMax}
          step={sliderStep}
          value={clampedSlider}
          onChange={(e) => onQuickSelect(Number(e.target.value))}
          className="w-full h-2 bg-[#ece6fa] rounded-full appearance-none cursor-pointer accent-[#58cc02]"
        />
      </div>

      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 flex items-center gap-1 rounded-xl bg-[#ffe4e6] border border-[#fda4af] px-2.5 py-1 text-xs font-extrabold text-[#be123c]"
        >
          <span aria-hidden="true">⚠️</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export function CalculatorView({
  preset,
  storageScope,
}: {
  preset?: CalculatorPreset;
  storageScope?: string;
}) {
  const baseId = useId().replace(/:/g, '');
  const liveAnnounceId = `${baseId}-live-output`;

  const [mode, setMode] = useState<CalculatorMode>(() => {
    if (preset) return 'investment';
    return 'savings';
  });

  const [startingAmountStr, setStartingAmountStr] = useState<string>(
    preset ? String(preset.startingAmount) : '1000'
  );
  const [monthlyContributionStr, setMonthlyContributionStr] = useState<string>(
    preset ? String(preset.monthlyContribution) : '100'
  );
  const [annualRateStr, setAnnualRateStr] = useState<string>(() => {
    if (preset) return String(preset.annualRatePercent);
    return '4.5';
  });
  const [horizonStr, setHorizonStr] = useState<string>(
    preset ? String(preset.horizonMonths) : '12'
  );

  const [extraMonthly, setExtraMonthly] = useState<number>(0);
  const [targetGoalBalanceStr, setTargetGoalBalanceStr] = useState<string>('10000');
  const [showTable, setShowTable] = useState<boolean>(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState<boolean>(false);

  const startingAmount = fieldNumber(startingAmountStr);
  const monthlyContribution = fieldNumber(monthlyContributionStr);
  const annualRatePercent = fieldNumber(annualRateStr);
  const horizonMonths = fieldNumber(horizonStr);

  const validation = validateCalculatorInputs({
    startingAmount,
    monthlyContribution,
    annualRatePercent,
    horizonMonths,
    mode,
  });

  const result: CalculatorResult | null = validation.isValid
    ? calculateGrowth({
        startingAmount,
        monthlyContribution,
        annualRatePercent,
        horizonMonths,
        mode,
      })
    : null;

  const boostValidation = validateCalculatorInputs({
    startingAmount,
    monthlyContribution: monthlyContribution + extraMonthly,
    annualRatePercent,
    horizonMonths,
    mode,
  });

  const boostResult: CalculatorResult | null =
    boostValidation.isValid && extraMonthly > 0
      ? calculateGrowth({
          startingAmount,
          monthlyContribution: monthlyContribution + extraMonthly,
          annualRatePercent,
          horizonMonths,
          mode,
        })
      : null;

  const difference =
    result && boostResult ? boostResult.finalBalance - result.finalBalance : null;

  const tuckSpeech = getTuckSpeech(result, extraMonthly, difference);

  const applyScenario = (
    nextMode: CalculatorMode,
    start: number,
    monthly: number,
    rate: number,
    months: number,
    targetGoal?: number
  ) => {
    setMode(nextMode);
    setStartingAmountStr(String(start));
    setMonthlyContributionStr(String(monthly));
    setAnnualRateStr(String(rate));
    setHorizonStr(String(months));
    if (targetGoal) setTargetGoalBalanceStr(String(targetGoal));
    questTracker.recordCalculatorUsed(storageScope);
  };

  const isScenarioActive = (
    checkMode: CalculatorMode,
    start: number,
    monthly: number,
    rate: number,
    months: number
  ) =>
    mode === checkMode &&
    startingAmount === start &&
    monthlyContribution === monthly &&
    annualRatePercent === rate &&
    horizonMonths === months;

  const totalDeposits = result ? result.startingAmount + result.totalContributions : 0;
  const multiplier = result && totalDeposits > 0 ? result.finalBalance / totalDeposits : null;

  const targetGoalNum = parseFloat(targetGoalBalanceStr) || 10000;
  const progressToGoalPct =
    result && targetGoalNum > 0
      ? Math.min(100, Math.max(0, Math.round((result.finalBalance / targetGoalNum) * 100)))
      : 0;

  return (
    <div className="space-y-4 max-w-6xl mx-auto text-[#222038]">
      <TabOverviewModal
        tab="calculator"
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
      />

      {/* 1. Welcoming Intro Section Defining What Compound Interest Is */}
      <section
        aria-label="About the Compound Interest Calculator"
        className="rounded-3xl border-2 border-[#e5def6] bg-gradient-to-r from-[#fbfaff] via-[#f7f2ff] to-[#f4fde8] p-4 sm:p-5 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white border-2 border-[#d3c2fb] grid place-items-center p-2 shrink-0 shadow-xs">
            <Tuck className="w-full h-full object-contain" />
          </div>

          <div className="flex-1 space-y-1.5 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#5637ca] bg-[#eee6ff] px-2.5 py-0.5 rounded-full border border-[#d3c2fb]">
                ✦ Free Wealth Simulator
              </span>
              <h1 className="text-base sm:text-lg font-black text-[#222038]">
                What is the Compound Interest Calculator?
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-[#4b4563] leading-relaxed">
              <strong>Compound interest</strong> is money making money for you! When you save or invest, your interest earns interest on itself—snowballing small monthly habits (like saving $50 or a boba drink) into massive wealth over time.
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs">
              <span className="inline-flex items-center gap-1 font-bold text-[#14532d] bg-[#dcfce7] px-2.5 py-1 rounded-xl border border-[#86efac]">
                <span>🏦</span> <strong>Safe Savings (CD/HYSA):</strong> Fixed, guaranteed APY locked safe by FDIC insurance up to $250,000.
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-[#3b0764] bg-[#ede9fe] px-2.5 py-1 rounded-xl border border-[#c4b5fd]">
                <span>📈</span> <strong>Market Investing (ETF):</strong> Index returns that fluctuate but historically compound much higher over 5–10+ years.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Compact Mode Switcher Bar */}
      <section
        aria-label="Calculator mode and quick guide"
        className="rounded-3xl border-2 border-[#e5def6] bg-white p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[0_4px_16px_rgba(39,32,71,0.03)]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            aria-hidden="true"
            className={`w-10 h-10 rounded-xl border-2 border-b-4 grid place-items-center text-xl shrink-0 ${
              mode === 'savings'
                ? 'bg-[#dcfce7] border-[#4ade80] border-b-[#16a34a]'
                : 'bg-[#ede9fe] border-[#a78bfa] border-b-[#7c3aed]'
            }`}
          >
            {mode === 'savings' ? '🏦' : '📈'}
          </div>
          <div className="min-w-0">
            <span className="inline-block text-[10px] font-black uppercase tracking-[0.14em] text-[#5637ca] bg-[#f3effe] px-2 py-0.5 rounded-full">
              {mode === 'savings' ? 'Safe & Steady APY' : 'Market Compounding'}
            </span>
            <h2 className="text-base sm:text-lg font-black tracking-[-0.03em] text-[#222038] mt-0.5">
              {mode === 'savings'
                ? 'High-Yield Savings & CD Calculator'
                : 'Investment Growth Calculator'}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            className="inline-flex items-center gap-1 p-1 rounded-2xl bg-[#f3effe] border-2 border-[#e2d9f8]"
            role="tablist"
            aria-label="Calculator Mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'savings'}
              onClick={() => {
                setMode('savings');
                if (parseFloat(annualRateStr) < 0) setAnnualRateStr('5.0');
              }}
              className={`${DUO_BUTTON_BASE} px-3 py-1.5 text-xs font-black ${
                mode === 'savings'
                  ? 'bg-[#58cc02] border-[#46a302] border-b-[#367e02] text-white'
                  : 'bg-white border-transparent border-b-transparent text-[#615d76] hover:text-[#222038]'
              }`}
            >
              🏦 Savings / CD
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'investment'}
              onClick={() => setMode('investment')}
              className={`${DUO_BUTTON_BASE} px-3 py-1.5 text-xs font-black ${
                mode === 'investment'
                  ? 'bg-[#5637ca] border-[#3f23a3] border-b-[#2c157d] text-white'
                  : 'bg-white border-transparent border-b-transparent text-[#615d76] hover:text-[#222038]'
              }`}
            >
              📈 Investment Growth
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsOverviewOpen(true)}
            aria-label="What is Calculators Tab?"
            className={`${DUO_BUTTON_BASE} px-3 py-2 text-xs font-black bg-[#dbfb84] border-[#95d62d] border-b-[#6ca312] text-[#272047] hover:bg-[#e6ff9e]`}
          >
            💡 Guide
          </button>
        </div>
      </section>

      {/* 3. Goal Cards & Presets */}
      <section aria-label="Pick a money goal" className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#5b43a7]">
            Pick a Goal Card (Tap to Load!)
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {LAB_SCENARIOS.map((lab) => {
              const active = isScenarioActive(lab.mode, lab.start, lab.monthly, lab.rate, lab.months);
              return (
                <button
                  key={lab.id}
                  type="button"
                  onClick={() => applyScenario(lab.mode, lab.start, lab.monthly, lab.rate, lab.months)}
                  className={`${DUO_CHIP_BASE} px-2.5 py-1 text-[11px] font-extrabold ${
                    active
                      ? 'bg-[#272047] border-[#1b1536] border-b-[#0f0b20] text-[#dbfb84]'
                      : 'bg-white border-[#e2d9f8] border-b-[#cbbcf2] text-[#615d76] hover:text-[#222038]'
                  }`}
                >
                  {lab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {GOAL_CARDS.map((card) => {
            const active = isScenarioActive(
              card.mode,
              card.start,
              card.monthly,
              card.rate,
              card.months
            );
            return (
              <button
                key={card.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  applyScenario(
                    card.mode,
                    card.start,
                    card.monthly,
                    card.rate,
                    card.months,
                    card.targetGoal
                  )
                }
                className={`${DUO_BUTTON_BASE} p-3 text-left flex flex-col justify-between gap-1.5 ${
                  active ? card.activeTheme : card.idleTheme
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {card.emoji}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${card.badgeTheme}`}
                  >
                    {card.badge}
                  </span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-black tracking-[-0.02em] text-[#222038]">
                    {card.title}
                  </p>
                  <p className="text-[10px] font-bold text-[#524b6b] mt-0.5">{card.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Main Clean Board: Inputs (5 cols) + Output & Tuck Feedback (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Input Controls */}
        <section aria-label="Adjust your numbers" className="lg:col-span-5 space-y-2.5">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-2.5">
            <NumberControlTile
              id={`${baseId}-start`}
              emoji="💵"
              label="Starting Principal ($)"
              valueStr={startingAmountStr}
              numericValue={startingAmount}
              onChange={setStartingAmountStr}
              onQuickSelect={(val) => {
                setStartingAmountStr(String(val));
                questTracker.recordCalculatorUsed(storageScope);
              }}
              min={BOUNDS.MIN_STARTING_AMOUNT}
              max={BOUNDS.MAX_STARTING_AMOUNT}
              sliderMin={0}
              sliderMax={10000}
              sliderStep={100}
              sliderAriaLabel="Initial cash slider"
              prefix="$"
              chips={[
                { label: '$0', value: 0 },
                { label: '$500', value: 500 },
                { label: '$1k', value: 1000 },
                { label: '$5k', value: 5000 },
              ]}
              error={validation.errors.startingAmount}
            />

            <NumberControlTile
              id={`${baseId}-monthly`}
              emoji="🪙"
              label="Monthly Contribution ($)"
              valueStr={monthlyContributionStr}
              numericValue={monthlyContribution}
              onChange={setMonthlyContributionStr}
              onQuickSelect={(val) => {
                setMonthlyContributionStr(String(val));
                questTracker.recordCalculatorUsed(storageScope);
              }}
              min={BOUNDS.MIN_MONTHLY_CONTRIBUTION}
              max={BOUNDS.MAX_MONTHLY_CONTRIBUTION}
              sliderMin={0}
              sliderMax={1000}
              sliderStep={25}
              sliderAriaLabel="Monthly deposit slider"
              prefix="$"
              chips={[
                { label: '$0', value: 0 },
                { label: '$50', value: 50 },
                { label: '$150', value: 150 },
                { label: '$300', value: 300 },
              ]}
              error={validation.errors.monthlyContribution}
            />

            <NumberControlTile
              id={`${baseId}-rate`}
              emoji="⚡"
              label={
                mode === 'savings' ? 'Annual Interest Rate / APY (%)' : 'Projected Annual Return (%)'
              }
              valueStr={annualRateStr}
              numericValue={annualRatePercent}
              onChange={setAnnualRateStr}
              onQuickSelect={(val) => {
                setAnnualRateStr(String(val));
                questTracker.recordCalculatorUsed(storageScope);
              }}
              min={mode === 'savings' ? BOUNDS.MIN_SAVINGS_RATE : BOUNDS.MIN_INVESTMENT_RATE}
              max={BOUNDS.MAX_SAVINGS_RATE}
              step="0.01"
              sliderMin={mode === 'savings' ? 0 : -20}
              sliderMax={15}
              sliderStep={0.5}
              sliderAriaLabel="Rate slider"
              suffix="%"
              chips={
                mode === 'savings'
                  ? [
                      { label: '0%', value: 0 },
                      { label: '4.5%', value: 4.5 },
                      { label: '5.5%', value: 5.5 },
                      { label: '8%', value: 8 },
                    ]
                  : [
                      { label: '4.5%', value: 4.5 },
                      { label: '8% ETF', value: 8 },
                      { label: '10%', value: 10 },
                      { label: '12%', value: 12 },
                    ]
              }
              error={validation.errors.annualRatePercent}
            />

            <NumberControlTile
              id={`${baseId}-horizon`}
              emoji="⏳"
              label="Investment Horizon (Months)"
              valueStr={horizonStr}
              numericValue={horizonMonths}
              onChange={setHorizonStr}
              onQuickSelect={(val) => {
                setHorizonStr(String(val));
                questTracker.recordCalculatorUsed(storageScope);
              }}
              min={BOUNDS.MIN_HORIZON_MONTHS}
              max={BOUNDS.MAX_HORIZON_MONTHS}
              step="1"
              sliderMin={0}
              sliderMax={360}
              sliderStep={6}
              sliderAriaLabel="Timeline slider"
              rightBadge={
                Number.isFinite(horizonMonths) ? `${(horizonMonths / 12).toFixed(1)} yrs` : '0.0 yrs'
              }
              chips={[
                { label: '1 yr', value: 12 },
                { label: '3 yr', value: 36 },
                { label: '5 yr', value: 60 },
                { label: '10 yr', value: 120 },
                { label: '30 yr', value: 360 },
              ]}
              error={validation.errors.horizonMonths}
            />
          </form>
        </section>

        {/* Right: Outcome Hero Card + Tuck Co-Pilot */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Celebratory Outcome Hero Card */}
          {result ? (
            <div className="space-y-3" aria-live="polite" id={liveAnnounceId}>
              <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#241d42] via-[#342466] to-[#4f32a9] text-white p-5 sm:p-6 border-2 border-b-[5px] border-[#181230] shadow-[0_14px_32px_rgba(39,32,71,0.3)]">
                <div className="relative z-10 text-center">
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/20 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#dbfb84]">
                      {result.totalGrowth >= 0 ? '🎉 Projected Growth' : '📉 Stress Test'}
                    </span>
                    {multiplier !== null && multiplier >= 1.15 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#dbfb84] px-3 py-0.5 text-[11px] font-black text-[#272047]">
                        🚀 {multiplier.toFixed(1)}× Your Deposits
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-extrabold uppercase tracking-widest text-[#d8cbf8]">
                    Projected Final Balance
                  </p>
                  <p className="mt-1 text-3xl sm:text-4xl font-black font-mono tracking-tight text-[#dbfb84] drop-shadow-sm">
                    {result.formattedFinalBalance}
                  </p>

                  {/* 3 Summary Stats */}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-left">
                    <div className="rounded-2xl bg-white/10 p-2.5 border border-white/10 backdrop-blur-xs">
                      <span className="text-[10px] uppercase font-bold text-[#e0d6f8] block">
                        Start Cash
                      </span>
                      <span className="text-xs sm:text-sm font-black font-mono text-white mt-0.5 block">
                        {formatCurrency(result.startingAmount)}
                      </span>
                    </div>

                    <div className="rounded-2xl bg-white/10 p-2.5 border border-white/10 backdrop-blur-xs">
                      <span className="text-[10px] uppercase font-bold text-[#e0d6f8] block">
                        Deposits
                      </span>
                      <span className="text-xs sm:text-sm font-black font-mono text-white mt-0.5 block">
                        {result.formattedTotalContributions}
                      </span>
                    </div>

                    <div className="rounded-2xl bg-white/15 p-2.5 border border-[#dbfb84]/40 backdrop-blur-xs">
                      <span className="text-[10px] uppercase font-bold text-[#dbfb84] block">
                        Free Growth
                      </span>
                      <span className="text-xs sm:text-sm font-black font-mono text-[#dbfb84] mt-0.5 block">
                        {result.formattedTotalGrowth}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Tuck Companion Dialogue */}
              <section
                aria-label="Tuck compound growth commentary"
                className="rounded-3xl border-2 border-[#dfd5f8] bg-[linear-gradient(110deg,#ede4ff,#f7f2ff_60%,#f6fde8)] p-3.5 sm:p-4 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-white/80 border-2 border-[#dfd5f8] grid place-items-center p-1.5 shrink-0 shadow-xs">
                    <Tuck className="w-14 h-14 object-contain" />
                  </div>

                  <div className="relative flex-1 min-w-0 rounded-2xl bg-white border-2 border-b-4 border-[#d6c6fa] px-3.5 py-2.5 shadow-2xs">
                    <span className="inline-block text-[10px] font-black uppercase tracking-[0.12em] text-[#5637ca] mb-0.5">
                      🐾 Tuck · Compound Mascot
                    </span>
                    <p className="text-xs sm:text-sm font-black text-[#222038] leading-snug">
                      {tuckSpeech}
                    </p>
                  </div>
                </div>

                {/* Extra Monthly Boost Mini-Game */}
                <div className="mt-3 rounded-2xl bg-white/90 border-2 border-[#e5def6] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="extra-monthly" className="text-xs font-extrabold text-[#222038]">
                      What if you add {formatCurrency(extraMonthly)} more each month?
                    </label>
                    <div className="flex items-center gap-1">
                      {[0, 25, 50, 100].map((boost) => (
                        <button
                          key={boost}
                          type="button"
                          onClick={() => setExtraMonthly(boost)}
                          className={`${DUO_CHIP_BASE} px-2 py-0.5 text-[10px] font-black ${
                            extraMonthly === boost
                              ? 'bg-[#dbfb84] border-[#84cc16] border-b-[#65a30d] text-[#272047]'
                              : 'bg-[#f6f3ff] border-[#dfd5f8] border-b-[#c7b7f2] text-[#4f32a9]'
                          }`}
                        >
                          +${boost}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <input
                      id="extra-monthly"
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={extraMonthly}
                      onChange={(event) => setExtraMonthly(Number(event.target.value))}
                      className="flex-1 h-2 bg-[#ece6fa] rounded-full appearance-none cursor-pointer accent-[#5637ca]"
                    />
                    <p className="text-xs font-bold text-[#524b6b] shrink-0">
                      {difference === null ? (
                        <span className="text-[#be123c]">Exceeds limit</span>
                      ) : (
                        <>
                          Boost:{' '}
                          <output
                            htmlFor="extra-monthly"
                            className="font-black text-[#15803d] font-mono tabular-nums"
                          >
                            {formatCurrency(difference)}
                          </output>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </section>

              {/* Maya Milestone Co-Pilot */}
              <section
                aria-label="Maya savings goal copilot"
                className="rounded-3xl border-2 border-[#dfd5f8] bg-white p-3.5 sm:p-4 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-[#f4c6a8] shrink-0 bg-[#fff5ea]">
                    <img
                      src={paydayCover}
                      alt="Maya milestone co-pilot"
                      className="w-full h-full object-cover object-[76%_22%] scale-125"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-black text-[#222038]">
                        Goal Progress: {progressToGoalPct}%
                      </span>
                      <span className="font-mono font-bold text-[#615d76]">
                        {result.formattedFinalBalance} / {formatCurrency(targetGoalNum)}
                      </span>
                    </div>

                    <div className="h-2.5 rounded-full bg-[#eee6ff] overflow-hidden border border-[#d6c6fa]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#58cc02] to-[#a3e635] transition-all duration-300"
                        style={{ width: `${progressToGoalPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div
              role="alert"
              className="rounded-3xl border-2 border-[#fda4af] bg-[#fff1f2] p-6 text-center text-[#9f1239] space-y-2"
            >
              <span className="text-3xl block" aria-hidden="true">
                ⚠️
              </span>
              <p className="text-base font-black">Please correct the input errors above.</p>
              <p className="text-xs text-[#be123c]">
                Ensure your rates, principal, and time horizon are valid numbers within supported bounds.
              </p>
            </div>
          )}

          {/* Collapsible Monthly Amortization Table */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowTable((prev) => !prev)}
              className={`${DUO_BUTTON_BASE} w-full py-2.5 px-4 text-xs font-black bg-white hover:bg-[#f6f3ff] border-[#dfd5f8] border-b-[#c7b7f2] text-[#4f32a9] flex items-center justify-center gap-2`}
            >
              <span>{showTable ? '▲' : '▼'}</span>
              <span>
                {showTable
                  ? 'Hide Monthly Amortization Table'
                  : `Inspect the Math · View Monthly Table (${result?.breakdown.length ?? 0} Months)`}
              </span>
            </button>

            {showTable && result && (
              <div className="mt-3 rounded-2xl border-2 border-[#e8e4f1] bg-white p-3 sm:p-4 shadow-sm overflow-x-auto animate-fadeIn">
                <h4 className="text-xs font-black text-[#222038] uppercase tracking-wider mb-2">
                  Monthly Amortization Schedule
                </h4>
                <table className="min-w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#e8e4f1] text-[#615d76]">
                      <th className="py-2 text-left">Mo</th>
                      <th className="py-2 text-right">Start</th>
                      <th className="py-2 text-right">Interest</th>
                      <th className="py-2 text-right">Deposit</th>
                      <th className="py-2 text-right">Balance</th>
                      <th className="py-2 text-right">Total Int</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ecf9]">
                    {result.breakdown.map((row) => (
                      <tr key={row.month} className="hover:bg-[#fbf9ff]">
                        <td className="py-1.5 text-left text-[#615d76]">{row.month}</td>
                        <td className="py-1.5 text-right text-[#615d76]">{formatCurrency(row.startBalance)}</td>
                        <td className="py-1.5 text-right text-[#15803d] font-bold">{formatCurrency(row.interestEarned)}</td>
                        <td className="py-1.5 text-right text-[#615d76]">{formatCurrency(row.contribution)}</td>
                        <td className="py-1.5 text-right text-[#222038] font-black">{formatCurrency(row.endBalance)}</td>
                        <td className="py-1.5 text-right text-[#5b43a7]">{formatCurrency(row.cumulativeInterest)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mandatory Disclosures Footer */}
      <footer className="rounded-2xl border border-[#e8e4f1] bg-[#fbf9ff] p-3.5 sm:p-4 text-[11px] text-[#615d76] space-y-1.5">
        <h4 className="font-extrabold text-[#222038] text-xs">
          ⚖️ Mandatory Financial Disclosures & Contract Assumptions
        </h4>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong className="text-[#222038]">Effective Annual Rate:</strong> Compounded monthly using{' '}
            <span className="font-mono font-bold">i = (1 + r)^(1/12) - 1</span>. End-of-month contributions accrue interest beginning the following month.
          </li>
          <li>
            <strong className="text-[#222038]">Exclusions:</strong> Excludes taxes, inflation, advisory fees, transaction fees, and expense ratios.
          </li>
          <li>
            <strong className="text-[#222038]">No Guarantee:</strong> Projections are educational only. Investment markets fluctuate, past performance is no guarantee of future returns, and principal losses can occur.
          </li>
        </ul>
      </footer>
    </div>
  );
}

export default CalculatorView;

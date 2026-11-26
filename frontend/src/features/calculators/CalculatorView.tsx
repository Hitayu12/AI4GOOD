import { useState, useId } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { TabOverviewModal } from '../../components/common/TabOverviewModal';
import { questTracker } from '../gamification/questTrackerService';
import { Tuck } from '../home/Tuck';
import '../home/campaign.css';
import {
  calculateGrowth,
  validateCalculatorInputs,
  formatCurrency,
  CalculatorMode,
  CalculatorResult,
  BOUNDS,
} from './calculatorMath';

export type CalculatorPreset = {
  startingAmount: number;
  monthlyContribution: number;
  annualRatePercent: number;
  horizonMonths: number;
};

type PresetScenario = {
  id: string;
  mode: CalculatorMode;
  start: number;
  monthly: number;
  rate: number;
  months: number;
  label: string;
  badge: string;
  tone: 'mint' | 'lavender' | 'lime' | 'peach';
  icon?: string;
};

const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'hysa',
    mode: 'savings',
    start: 1000,
    monthly: 100,
    rate: 4.5,
    months: 12,
    label: '1-Year HYSA (4.5%, $100/mo)',
    badge: 'HYSA',
    tone: 'mint',
  },
  {
    id: 'etf',
    mode: 'investment',
    start: 1000,
    monthly: 200,
    rate: 8.0,
    months: 60,
    label: '5-Year ETF Index (8%, $200/mo)',
    badge: 'ETF',
    tone: 'lavender',
  },
  {
    id: 'boba',
    mode: 'investment',
    start: 100,
    monthly: 150,
    rate: 8.5,
    months: 120,
    label: 'Boba to Wealth ($150/mo, 10 yrs)',
    badge: 'POPULAR',
    tone: 'lime',
    icon: '🧋',
  },
  {
    id: 'contract-ref',
    mode: 'investment',
    start: 1000,
    monthly: 0,
    rate: 12.0,
    months: 12,
    label: 'Contract Reference Check (12%)',
    badge: 'REF',
    tone: 'lavender',
  },
  {
    id: 'downturn',
    mode: 'investment',
    start: 1000,
    monthly: 50,
    rate: -10.0,
    months: 12,
    label: 'Market Downturn (-10%)',
    badge: 'STRESS',
    tone: 'peach',
  },
];

const PRESET_BADGE_CLASSES: Record<PresetScenario['tone'], string> = {
  mint: 'fw-mint',
  lavender: 'fw-lavender',
  lime: 'bg-[#dbfb84] text-[#272047]',
  peach: 'fw-peach',
};

function fieldNumber(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value);
}

function getTuckSpeech(extraMonthly: number, difference: number | null): string {
  if (extraMonthly === 0) {
    return 'Tuck says: Add a little extra each month to supercharge your compound growth!';
  }
  if (extraMonthly > 0 && extraMonthly <= 25) {
    return (
      'Tuck says: Just $' +
      extraMonthly +
      ' more per month adds $' +
      (difference ? Math.round(difference).toLocaleString() : '3,400') +
      ' to your final bag! Good dog energy 🐾'
    );
  }
  return (
    'Tuck says: Big moves! That extra $' +
    extraMonthly +
    '/mo compounds into serious financial freedom!'
  );
}

export function CalculatorView({
  preset,
  storageScope,
}: {
  preset?: CalculatorPreset;
  storageScope?: string;
} = {}) {
  const [mode, setMode] = useState<CalculatorMode>('savings');
  const [startingAmountStr, setStartingAmountStr] = useState(String(preset?.startingAmount ?? 1000));
  const [monthlyContributionStr, setMonthlyContributionStr] = useState(String(preset?.monthlyContribution ?? 100));
  const [annualRateStr, setAnnualRateStr] = useState(preset ? String(preset.annualRatePercent) : '5.0');
  const [horizonStr, setHorizonStr] = useState(String(preset?.horizonMonths ?? 12));
  const [showTable, setShowTable] = useState<boolean>(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState<boolean>(false);
  const [extraMonthly, setExtraMonthly] = useState(25);
  const [target, setTarget] = useState(preset?.startingAmount === undefined ? '2000' : '600');

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

  let result: CalculatorResult | null = null;
  if (validation.isValid) {
    try {
      result = calculateGrowth({
        startingAmount,
        monthlyContribution,
        annualRatePercent,
        horizonMonths,
        mode,
      });
    } catch {
      result = null;
    }
  }

  const liveAnnounceId = useId();
  const comparisonInputs = {
    startingAmount,
    monthlyContribution: monthlyContribution + extraMonthly,
    annualRatePercent,
    horizonMonths,
    mode,
  };
  const difference =
    result && validateCalculatorInputs(comparisonInputs).isValid
      ? calculateGrowth(comparisonInputs).finalBalance - result.finalBalance
      : null;
  const targetAmount = Number(target);
  const hasTarget = Number.isFinite(targetAmount) && targetAmount > 0;
  const goalMonth =
    result && hasTarget
      ? result.startingAmount >= targetAmount
        ? 0
        : result.breakdown.find(({ endBalance }) => endBalance >= targetAmount)?.month
      : undefined;

  // Preset scenarios
  const applyPreset = (
    presetMode: CalculatorMode,
    start: number,
    monthly: number,
    rate: number,
    months: number
  ) => {
    setMode(presetMode);
    setStartingAmountStr(start.toString());
    setMonthlyContributionStr(monthly.toString());
    setAnnualRateStr(rate.toString());
    setHorizonStr(months.toString());
    questTracker.recordCalculatorUsed(storageScope);
  };

  const isPresetActive = (item: PresetScenario) =>
    mode === item.mode &&
    startingAmount === item.start &&
    monthlyContribution === item.monthly &&
    annualRatePercent === item.rate &&
    horizonMonths === item.months;

  const inputThemeClass = (hasError?: string) =>
    `!rounded-[11px] !bg-[#fbfaff] px-3.5 py-2.5 font-mono tabular-nums text-[#222038] font-semibold transition-colors ${
      hasError
        ? ''
        : '!border-[#d9d0e9] focus:!border-[#5637ca] focus:!ring-[#7257e0]'
    }`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-[#222038]">
      {/* Calculators Tab Overview Modal */}
      <TabOverviewModal
        tab="calculator"
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
      />

      {/* Tuck's Wealth Machine Hero Banner */}
      <section
        aria-label="Tuck's Wealth Machine"
        className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#272047] via-[#31255b] to-[#463083] text-white p-6 sm:p-8 border border-[#4f3a8f]/50 shadow-[0_18px_40px_-14px_rgba(39,32,71,0.45)]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-12 h-56 w-56 rounded-full bg-[#dbfb84]/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-[#7c5bea]/30 blur-3xl"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <p className="fw-hero-tag !border-[#dbfb84]/35 !bg-[#392a67]/80 !text-[#dbfb84] tracking-[0.12em] uppercase !text-[11px] !font-black">
              ✦ COMPOUND LAB
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-[-0.045em] leading-[1.04] text-white">
              Tuck&apos;s Wealth Machine
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-[#e8dcff] leading-relaxed font-medium max-w-[44ch]">
              Simulate your financial future. Watch compound interest work while you sleep.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsOverviewOpen(true)}
                aria-label="What is Calculators Tab?"
                className="fw-button fw-button-lime shadow-[0_8px_22px_rgba(219,251,132,0.28)] cursor-pointer"
              >
                <span aria-hidden="true">💡</span>
                <span>What is Calculators?</span>
              </button>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-bold text-[#eadfff] backdrop-blur-xs">
                <span className="h-2 w-2 rounded-full bg-[#dbfb84]" aria-hidden="true" />
                {mode === 'savings' ? 'Fixed APY Engine' : 'Market Growth Engine'}
              </span>
            </div>
          </div>

          <div className="relative self-center md:self-auto shrink-0">
            <div className="rounded-[22px] bg-gradient-to-br from-[#eee6ff] via-[#f7f2ff] to-[#dbfb84]/90 p-3 sm:p-4 border-2 border-[#dbfb84]/75 shadow-[0_14px_30px_rgba(20,14,44,0.38)] flex items-center justify-center">
              <Tuck className="w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-[0_8px_16px_rgba(39,32,71,0.24)] transition-transform duration-300 hover:scale-105" />
            </div>
            <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#272047] border border-[#dbfb84]/55 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#dbfb84] shadow-md">
              🐾 Compound Buddy
            </span>
          </div>
        </div>
      </section>

      {/* Mode Selector Bar */}
      <div className="fw-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-[0_6px_24px_rgba(39,32,71,0.04)]">
        <div className="flex items-start sm:items-center gap-3.5">
          <span
            className={`fw-tile ${mode === 'savings' ? 'fw-mint' : 'fw-lavender'}`}
            aria-hidden="true"
          >
            {mode === 'savings' ? '🏦' : '📈'}
          </span>
          <div>
            <p className="fw-kicker">
              {mode === 'savings' ? 'Savings & CD Mode' : 'Investment Mode'}
            </p>
            <h3 className="text-lg sm:text-xl font-black tracking-[-0.03em] text-[#222038]">
              {mode === 'savings' ? 'High-Yield Savings & CD Calculator' : 'Investment Growth Calculator'}
            </h3>
            <p className="text-xs sm:text-sm text-[#615d76] mt-0.5">
              Compare how your timeline, rate, and monthly deposits affect the ending balance.
            </p>
          </div>
        </div>

        <div
          className="inline-flex items-center p-1 rounded-2xl bg-[#f3effb] border border-[#e8e4f1] self-start sm:self-auto shrink-0"
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
            className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7257e0] ${
              mode === 'savings'
                ? 'bg-[#5637ca] text-white shadow-[0_4px_12px_rgba(86,55,202,0.28)]'
                : 'text-[#615d76] hover:text-[#4f32a9] hover:bg-white/70'
            }`}
          >
            Savings / CD
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'investment'}
            onClick={() => setMode('investment')}
            className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7257e0] ${
              mode === 'investment'
                ? 'bg-[#5637ca] text-white shadow-[0_4px_12px_rgba(86,55,202,0.28)]'
                : 'text-[#615d76] hover:text-[#4f32a9] hover:bg-white/70'
            }`}
          >
            Investment Growth
          </button>
        </div>
      </div>

      {/* Quick Scenario Pills */}
      <div className="fw-panel px-4 py-3.5 flex flex-wrap items-center gap-2 text-xs shadow-[0_4px_16px_rgba(39,32,71,0.03)]">
        <span className="fw-kicker !text-[11px] mr-1">
          Quick Scenarios:
        </span>
        {PRESET_SCENARIOS.map((item) => {
          const active = isPresetActive(item);
          const isBoba = item.id === 'boba';
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => applyPreset(item.mode, item.start, item.monthly, item.rate, item.months)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border font-extrabold text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7257e0] focus-visible:ring-offset-2 cursor-pointer ${
                active
                  ? isBoba
                    ? 'bg-[#272047] border-[#272047] text-white shadow-[0_6px_16px_rgba(39,32,71,0.24)]'
                    : 'bg-[#eee6ff] border-[#7257e0] text-[#4f32a9] shadow-[0_4px_12px_rgba(86,55,202,0.14)]'
                  : isBoba
                  ? 'border-[#b9e14c] bg-[#f6fde8] text-[#272047] hover:bg-[#dbfb84]/55 hover:border-[#9dc72f]'
                  : 'border-[#e8e4f1] bg-[#fbfaff] text-[#222038] hover:border-[#bba8f5] hover:bg-[#f4f0fd]'
              }`}
            >
              {item.icon && <span aria-hidden="true">{item.icon}</span>}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  active && isBoba
                    ? 'bg-[#dbfb84] text-[#272047]'
                    : PRESET_BADGE_CLASSES[item.tone]
                }`}
              >
                {item.badge}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Inputs + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Inputs (5 cols) */}
        <Card
          title="Input Parameters"
          subtitle="Configure your principal, contributions, and rate"
          className="fw-panel lg:col-span-5 shadow-[0_12px_36px_rgba(39,32,71,0.05)]"
        >
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <Input
              label="Starting Principal ($)"
              type="number"
              step="any"
              min={BOUNDS.MIN_STARTING_AMOUNT}
              max={BOUNDS.MAX_STARTING_AMOUNT}
              value={startingAmountStr}
              onChange={(e) => setStartingAmountStr(e.target.value)}
              error={validation.errors.startingAmount}
              helperText={`Initial lump sum (Max ${formatCurrency(BOUNDS.MAX_STARTING_AMOUNT)})`}
              className={inputThemeClass(validation.errors.startingAmount)}
            />

            <Input
              label="Monthly Contribution ($)"
              type="number"
              step="any"
              min={BOUNDS.MIN_MONTHLY_CONTRIBUTION}
              max={BOUNDS.MAX_MONTHLY_CONTRIBUTION}
              value={monthlyContributionStr}
              onChange={(e) => setMonthlyContributionStr(e.target.value)}
              error={validation.errors.monthlyContribution}
              helperText={`Deposited at the end of each month (Max ${formatCurrency(BOUNDS.MAX_MONTHLY_CONTRIBUTION)})`}
              className={inputThemeClass(validation.errors.monthlyContribution)}
            />

            <Input
              label={mode === 'savings' ? 'Annual Interest Rate / APY (%)' : 'Projected Annual Return (%)'}
              type="number"
              step="0.01"
              min={mode === 'savings' ? BOUNDS.MIN_SAVINGS_RATE : BOUNDS.MIN_INVESTMENT_RATE}
              max={BOUNDS.MAX_SAVINGS_RATE}
              value={annualRateStr}
              onChange={(e) => setAnnualRateStr(e.target.value)}
              error={validation.errors.annualRatePercent}
              helperText={
                mode === 'savings'
                  ? 'Nonnegative savings interest rate (0% to 100%)'
                  : 'Expected annual return (-99.99% to 100%)'
              }
              className={inputThemeClass(validation.errors.annualRatePercent)}
            />

            <Input
              label="Investment Horizon (Months)"
              type="number"
              step="1"
              min={BOUNDS.MIN_HORIZON_MONTHS}
              max={BOUNDS.MAX_HORIZON_MONTHS}
              value={horizonStr}
              onChange={(e) => setHorizonStr(e.target.value)}
              error={validation.errors.horizonMonths}
              helperText={`Whole months from 0 to ${BOUNDS.MAX_HORIZON_MONTHS} (${Number.isFinite(horizonMonths) ? (horizonMonths / 12).toFixed(1) : '0.0'} years)`}
              className={inputThemeClass(validation.errors.horizonMonths)}
            />
          </form>
        </Card>

        {/* Results & Visuals (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card
            title="Projection Summary"
            subtitle="Calculated compound growth at the end of the horizon"
            className="fw-panel shadow-[0_12px_36px_rgba(39,32,71,0.05)]"
          >
            {result ? (
              <div className="space-y-6" aria-live="polite" id={liveAnnounceId}>
                {/* Total Balance Hero */}
                <div className="rounded-[22px] bg-gradient-to-br from-[#272047] via-[#302459] to-[#392a67] text-white p-6 sm:p-8 relative overflow-hidden border border-[#4f3a8f]/60 shadow-[0_16px_38px_-12px_rgba(39,32,71,0.45)] text-center">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-[#dbfb84]/15 blur-2xl"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-[#7c5bea]/25 blur-2xl"
                  />
                  <div className="relative z-10">
                    <p className="text-[11px] uppercase tracking-[0.14em] font-black text-[#e8dcff]">
                      Projected Final Balance
                    </p>
                    <p className="text-4xl sm:text-5xl font-black text-[#dbfb84] mt-2 font-mono tabular-nums tracking-tight drop-shadow-[0_0_24px_rgba(219,251,132,0.38)]">
                      {result.formattedFinalBalance}
                    </p>
                    <p className="text-xs sm:text-sm text-[#ddd1fa] mt-2.5 font-medium">
                      Over <span className="text-white font-extrabold">{result.horizonMonths} months</span> with effective annual rate of{' '}
                      <span className="text-[#dbfb84] font-extrabold">{result.annualRatePercent}%</span>
                    </p>
                  </div>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-[#f6f3ff] border border-[#e3dbf9] p-4 transition-all">
                    <p className="text-[11px] font-extrabold text-[#5b43a7] uppercase tracking-[0.08em]">
                      Starting Principal
                    </p>
                    <p className="text-base sm:text-lg font-black text-[#222038] mt-1 font-mono tabular-nums">
                      {formatCurrency(result.startingAmount)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#eee6ff]/65 border border-[#dfd5f8] p-4 transition-all">
                    <p className="text-[11px] font-extrabold text-[#4f32a9] uppercase tracking-[0.08em]">
                      New Contributions
                    </p>
                    <p className="text-base sm:text-lg font-black text-[#222038] mt-1 font-mono tabular-nums">
                      {result.formattedTotalContributions}
                    </p>
                  </div>
                  <div
                    className={`rounded-2xl border p-4 transition-all ${
                      result.totalGrowth >= 0
                        ? 'bg-[#e3f3d9]/80 border-[#c7e4b6]'
                        : 'bg-[#ffe9da]/85 border-[#f4cab0]'
                    }`}
                  >
                    <p
                      className={`text-[11px] font-extrabold uppercase tracking-[0.08em] ${
                        result.totalGrowth >= 0 ? 'text-[#285137]' : 'text-[#7b402a]'
                      }`}
                    >
                      {result.totalGrowth >= 0 ? 'Total Growth / Interest' : 'Net Loss'}
                    </p>
                    <p
                      className={`text-base sm:text-lg font-black mt-1 font-mono tabular-nums ${
                        result.totalGrowth >= 0 ? 'text-[#1e462d]' : 'text-[#963a34]'
                      }`}
                    >
                      {result.formattedTotalGrowth}
                    </p>
                  </div>
                </div>

                {/* Scenario Tuning, Milestones & Dynamic Tuck Speech Bubble */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch pt-1">
                  <div className="md:col-span-7 flex flex-col gap-3.5">
                    {/* Extra Monthly Slider */}
                    <div className="fw-panel !bg-[#fbfaff] p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <label htmlFor="extra-monthly" className="text-xs font-extrabold text-[#222038]">
                            What if you add {formatCurrency(extraMonthly)} more each month?
                          </label>
                          <span className="text-[11px] font-mono font-extrabold bg-[#eee6ff] text-[#4f32a9] px-2.5 py-0.5 rounded-full border border-[#dfd5f8] shrink-0">
                            +{formatCurrency(extraMonthly)}/mo
                          </span>
                        </div>
                        <div className="mt-3">
                          <input
                            id="extra-monthly"
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={extraMonthly}
                            onChange={(event) => setExtraMonthly(Number(event.target.value))}
                            className="w-full h-2 bg-[#ece6fa] rounded-lg appearance-none cursor-pointer accent-[#5637ca]"
                          />
                          <div className="flex justify-between text-[10px] text-[#615d76] mt-1 font-mono font-semibold">
                            <span>$0</span>
                            <span>$50</span>
                            <span>$100</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-[#615d76] mt-3 pt-2.5 border-t border-[#e8e4f1]">
                        {difference === null ? (
                          <span className="text-[#963a34] font-semibold">
                            This would exceed the calculator’s contribution limit.
                          </span>
                        ) : (
                          <>
                            Projected difference:{' '}
                            <output htmlFor="extra-monthly" className="font-black text-[#222038] font-mono tabular-nums">
                              {formatCurrency(difference)}
                            </output>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Savings Milestone Goal */}
                    <div className="fw-panel !bg-[#fbfaff] p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold text-[#222038]">Set a savings goal</h4>
                          <span className="fw-mint px-2 py-0.5 rounded-full text-[10px] uppercase font-black tracking-wider">
                            Milestone
                          </span>
                        </div>
                        <div className="mt-2.5">
                          <label htmlFor="target-balance" className="block text-xs font-semibold text-[#615d76] mb-1">
                            Target balance ($)
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#615d76] text-xs font-bold">
                              $
                            </span>
                            <input
                              id="target-balance"
                              value={target}
                              min="1"
                              type="number"
                              inputMode="decimal"
                              onChange={(event) => setTarget(event.target.value)}
                              className="w-full pl-7 pr-3 py-2 text-xs rounded-[10px] border border-[#d9d0e9] bg-white text-[#222038] focus:border-[#5637ca] focus:ring-1 focus:ring-[#7257e0] focus:outline-none transition-colors font-mono font-semibold"
                              placeholder="e.g. 2000"
                            />
                          </div>
                        </div>
                      </div>
                      <output className="mt-3 pt-2.5 border-t border-[#e8e4f1] block text-xs text-[#615d76] leading-relaxed font-medium">
                        {!hasTarget
                          ? 'Enter a target above $0.'
                          : goalMonth === 0
                          ? 'You already reach this target with the starting balance.'
                          : goalMonth !== undefined
                          ? `This scenario first reaches your target in month ${goalMonth}.`
                          : 'This scenario stays below your target. Try a longer timeline or a larger monthly deposit.'}
                      </output>
                    </div>
                  </div>

                  {/* Dynamic Tuck Speech Bubble Companion Card */}
                  <aside
                    aria-label="Tuck compound growth commentary"
                    className="fw-daily-card md:col-span-5 !flex !flex-col !justify-between !mb-0 !p-4 !gap-3 shadow-[0_8px_24px_rgba(79,50,169,0.08)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="fw-daily-art p-1.5 rounded-2xl shrink-0">
                        <Tuck className="w-16 h-16 object-contain" />
                      </div>
                      <div className="min-w-0">
                        <p className="fw-kicker !text-[10px]">✦ Tuck&apos;s Take</p>
                        <p className="text-sm font-black tracking-[-0.02em] text-[#222038]">
                          Compound Coach
                        </p>
                      </div>
                    </div>

                    <div className="relative rounded-2xl bg-white border border-[#dfd5f8] p-3.5 shadow-[0_4px_14px_rgba(79,50,169,0.07)] flex-1 flex items-center">
                      <p className="text-xs sm:text-[13px] font-bold text-[#222038] leading-relaxed">
                        {getTuckSpeech(extraMonthly, difference)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] font-extrabold">
                      <span className="text-[#5b43a7]">Monthly boost</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-mono ${
                          extraMonthly === 0
                            ? 'bg-[#eee6ff] text-[#4f32a9]'
                            : 'bg-[#dbfb84] text-[#272047] border border-[#b9e14c]'
                        }`}
                      >
                        +${extraMonthly}/mo
                      </span>
                    </div>
                  </aside>
                </div>

                {/* Composition Bar */}
                {result.finalBalance > 0 && (
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-xs font-medium text-[#615d76] mb-2">
                      <span className="font-extrabold text-[#222038]">Portfolio Composition</span>
                      <span className="text-[#4f32a9] font-mono font-bold text-[11px]">
                        Principal:{' '}
                        {Math.max(
                          0,
                          Math.round(((result.startingAmount + result.totalContributions) / result.finalBalance) * 100)
                        )}
                        % | Growth:{' '}
                        {Math.max(
                          0,
                          Math.round((Math.max(0, result.totalGrowth) / result.finalBalance) * 100)
                        )}
                        %
                      </span>
                    </div>
                    <div
                      className="h-3 w-full bg-[#ece6fa] rounded-full overflow-hidden flex border border-[#e8e4f1]"
                      role="progressbar"
                      aria-label="Portfolio Growth Distribution"
                    >
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(0, (result.startingAmount / result.finalBalance) * 100))}%`,
                        }}
                        className="bg-[#272047] h-full transition-all duration-300"
                        title="Starting Principal"
                      />
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(0, (result.totalContributions / result.finalBalance) * 100))}%`,
                        }}
                        className="bg-[#7257e0] h-full transition-all duration-300"
                        title="Total Contributions"
                      />
                      {result.totalGrowth > 0 && (
                        <div
                          style={{
                            width: `${Math.min(100, Math.max(0, (result.totalGrowth / result.finalBalance) * 100))}%`,
                          }}
                          className="bg-[#95d62d] h-full transition-all duration-300"
                          title="Interest / Growth"
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2.5 text-xs text-[#615d76] font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#272047] inline-block" /> Starting Principal
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#7257e0] inline-block" /> Added Contributions
                      </span>
                      {result.totalGrowth > 0 && (
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#95d62d] inline-block" /> Compounded Growth
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Table Toggle */}
                {result.breakdown.length > 0 && (
                  <div className="pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowTable(!showTable)}
                      className="w-full text-xs font-extrabold py-2.5 rounded-xl shadow-2xs cursor-pointer"
                      aria-expanded={showTable}
                    >
                      {showTable
                        ? 'Hide Monthly Amortization Table'
                        : `View Monthly Table (${result.breakdown.length} Months)`}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-[#f4cab0] bg-[#ffe9da]/70 p-6 text-center text-[#7b402a] text-sm">
                <p className="font-extrabold text-[#7b402a]">
                  Please correct the input errors on the left to see the calculation.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      {showTable && result && result.breakdown.length > 0 && (
        <Card
          title="Monthly Amortization Schedule"
          subtitle="Step-by-step end-of-month recurrence breakdown"
          className="fw-panel shadow-[0_12px_36px_rgba(39,32,71,0.05)]"
        >
          <div className="overflow-x-auto max-h-96 overflow-y-auto border border-[#e8e4f1] rounded-2xl">
            <table className="min-w-full divide-y divide-[#e8e4f1] text-xs">
              <thead className="bg-[#f6f3ff]/95 backdrop-blur-xs sticky top-0 border-b border-[#e8e4f1]">
                <tr>
                  <th scope="col" className="px-3.5 py-2.5 text-left font-extrabold text-[#4f32a9]">Month</th>
                  <th scope="col" className="px-3.5 py-2.5 text-right font-extrabold text-[#4f32a9]">Starting Balance</th>
                  <th scope="col" className="px-3.5 py-2.5 text-right font-extrabold text-[#4f32a9]">Interest Earned</th>
                  <th scope="col" className="px-3.5 py-2.5 text-right font-extrabold text-[#4f32a9]">Contribution</th>
                  <th scope="col" className="px-3.5 py-2.5 text-right font-extrabold text-[#4f32a9]">Ending Balance</th>
                  <th scope="col" className="px-3.5 py-2.5 text-right font-extrabold text-[#4f32a9]">Cumulative Interest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efeafd] bg-white font-mono text-[11px]">
                {result.breakdown.map((row) => (
                  <tr key={row.month} className="hover:bg-[#f8f5ff] transition-colors">
                    <td className="px-3.5 py-2 text-[#222038] font-bold">{row.month}</td>
                    <td className="px-3.5 py-2 text-right text-[#615d76]">{formatCurrency(row.startBalance)}</td>
                    <td className={`px-3.5 py-2 text-right font-bold ${row.interestEarned >= 0 ? 'text-[#285137]' : 'text-[#963a34]'}`}>
                      {formatCurrency(row.interestEarned)}
                    </td>
                    <td className="px-3.5 py-2 text-right text-[#615d76]">{formatCurrency(row.contribution)}</td>
                    <td className="px-3.5 py-2 text-right text-[#222038] font-extrabold">{formatCurrency(row.endBalance)}</td>
                    <td className="px-3.5 py-2 text-right text-[#5b43a7]">{formatCurrency(row.cumulativeInterest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Contract Disclosures & Assumptions */}
      <footer className="fw-panel !bg-[#f8f5ff] p-4 sm:p-5 text-xs text-[#615d76] space-y-2.5">
        <div className="flex items-center gap-2 text-[#222038] font-extrabold text-xs">
          <span className="text-[#5637ca]" aria-hidden="true">⚖️</span>
          <h4>Mandatory Financial Disclosures &amp; Contract Assumptions</h4>
        </div>
        <ul className="space-y-1.5 text-[11px] leading-relaxed text-[#615d76] pl-5 list-disc">
          <li>
            <strong className="text-[#222038] font-bold">Effective Annual Rate:</strong> Compounded monthly using \(i = (1+r)^{'{'}1/12{'}'} - 1\). End-of-month contributions accrue interest beginning in the subsequent month.
          </li>
          <li>
            <strong className="text-[#222038] font-bold">Exclusions:</strong> Calculations exclude taxes, inflation, investment advisory fees, management fees, transaction costs, and expense ratios.
          </li>
          <li>
            <strong className="text-[#222038] font-bold">No Guarantee:</strong> Projected annual rates of return are strictly illustrative for educational modeling. Market investments fluctuate, past performance is no guarantee of future returns, and principal losses can occur.
          </li>
        </ul>
      </footer>
    </div>
  );
}

export default CalculatorView;

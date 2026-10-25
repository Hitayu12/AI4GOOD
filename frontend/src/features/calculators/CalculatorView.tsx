import { useState, useId } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  calculateGrowth,
  validateCalculatorInputs,
  formatCurrency,
  CalculatorMode,
  CalculatorResult,
  BOUNDS,
} from './calculatorMath';

export function CalculatorView() {
  const [mode, setMode] = useState<CalculatorMode>('savings');
  const [startingAmountStr, setStartingAmountStr] = useState<string>('1000');
  const [monthlyContributionStr, setMonthlyContributionStr] = useState<string>('100');
  const [annualRateStr, setAnnualRateStr] = useState<string>('5.0');
  const [horizonStr, setHorizonStr] = useState<string>('12');
  const [showTable, setShowTable] = useState<boolean>(false);

  const startingAmount = parseFloat(startingAmountStr) || 0;
  const monthlyContribution = parseFloat(monthlyContributionStr) || 0;
  const annualRatePercent = parseFloat(annualRateStr) || 0;
  const horizonMonths = parseInt(horizonStr, 10) || 0;

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

  // Preset scenarios
  const applyPreset = (presetMode: CalculatorMode, start: number, monthly: number, rate: number, months: number) => {
    setMode(presetMode);
    setStartingAmountStr(start.toString());
    setMonthlyContributionStr(monthly.toString());
    setAnnualRateStr(rate.toString());
    setHorizonStr(months.toString());
  };

  return (
    <div className="space-y-8">
      {/* Header and Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {mode === 'savings' ? 'High-Yield Savings & CD Calculator' : 'Investment Growth Calculator'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Compound growth using the contract effective annual rate convention \(i = (1+r)^{'{'}1/12{'}'} - 1\)
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1" role="tablist" aria-label="Calculator Mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'savings'}
            onClick={() => {
              setMode('savings');
              if (parseFloat(annualRateStr) < 0) setAnnualRateStr('5.0');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === 'savings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Savings / CD
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'investment'}
            onClick={() => setMode('investment')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === 'investment' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Investment Growth
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-slate-500">Quick Scenarios:</span>
        <button
          type="button"
          onClick={() => applyPreset('savings', 1000, 100, 4.5, 12)}
          className="rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
        >
          1-Year HYSA (4.5%, $100/mo)
        </button>
        <button
          type="button"
          onClick={() => applyPreset('investment', 1000, 200, 8.0, 60)}
          className="rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
        >
          5-Year ETF Index (8%, $200/mo)
        </button>
        <button
          type="button"
          onClick={() => applyPreset('investment', 1000, 0, 12.0, 12)}
          className="rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
        >
          Contract Reference Check (12%)
        </button>
        <button
          type="button"
          onClick={() => applyPreset('investment', 1000, 50, -10.0, 12)}
          className="rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
        >
          Market Downturn (-10%)
        </button>
      </div>

      {/* Main Grid: Inputs + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Inputs (5 cols) */}
        <Card title="Input Parameters" subtitle="Configure your principal, contributions, and rate" className="lg:col-span-5">
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
              helperText={`Whole months from 0 to ${BOUNDS.MAX_HORIZON_MONTHS} (${(horizonMonths / 12).toFixed(1)} years)`}
            />
          </form>
        </Card>

        {/* Results & Visuals (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card title="Projection Summary" subtitle="Calculated compound growth at the end of the horizon">
            {result ? (
              <div className="space-y-6" aria-live="polite" id={liveAnnounceId}>
                {/* Total Balance Hero */}
                <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-6 text-center">
                  <p className="text-xs uppercase tracking-wider font-semibold text-blue-700">Projected Final Balance</p>
                  <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 font-mono">
                    {result.formattedFinalBalance}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Over {result.horizonMonths} months with effective annual rate of {result.annualRatePercent}%
                  </p>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs font-medium text-slate-500">Starting Principal</p>
                    <p className="text-lg font-bold text-slate-800 mt-1 font-mono">{formatCurrency(result.startingAmount)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs font-medium text-slate-500">New Contributions</p>
                    <p className="text-lg font-bold text-slate-800 mt-1 font-mono">{result.formattedTotalContributions}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs font-medium text-slate-500">
                      {result.totalGrowth >= 0 ? 'Total Growth / Interest' : 'Net Loss'}
                    </p>
                    <p
                      className={`text-lg font-bold mt-1 font-mono ${
                        result.totalGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {result.formattedTotalGrowth}
                    </p>
                  </div>
                </div>

                {/* Composition Bar */}
                {result.finalBalance > 0 && (
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
                      <span>Portfolio Composition</span>
                      <span>
                        Principal: {Math.max(0, Math.round(((result.startingAmount + result.totalContributions) / result.finalBalance) * 100))}% | Growth:{' '}
                        {Math.max(0, Math.round((Math.max(0, result.totalGrowth) / result.finalBalance) * 100))}%
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex" role="progressbar" aria-label="Portfolio Growth Distribution">
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(0, (result.startingAmount / result.finalBalance) * 100))}%`,
                        }}
                        className="bg-blue-600 h-full"
                        title="Starting Principal"
                      />
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(0, (result.totalContributions / result.finalBalance) * 100))}%`,
                        }}
                        className="bg-indigo-400 h-full"
                        title="Total Contributions"
                      />
                      {result.totalGrowth > 0 && (
                        <div
                          style={{
                            width: `${Math.min(100, Math.max(0, (result.totalGrowth / result.finalBalance) * 100))}%`,
                          }}
                          className="bg-emerald-500 h-full"
                          title="Interest / Growth"
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" /> Starting Principal
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-indigo-400 inline-block" /> Added Contributions
                      </span>
                      {result.totalGrowth > 0 && (
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Compounded Growth
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Table Toggle */}
                {result.breakdown.length > 0 && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTable(!showTable)}
                      className="w-full"
                      aria-expanded={showTable}
                    >
                      {showTable ? 'Hide Monthly Amortization Table' : `View Monthly Table (${result.breakdown.length} Months)`}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700 text-sm">
                Please correct the input errors on the left to see the calculation.
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      {showTable && result && result.breakdown.length > 0 && (
        <Card title="Monthly Amortization Schedule" subtitle="Step-by-step end-of-month recurrence breakdown">
          <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th scope="col" className="px-3 py-2.5 text-left font-semibold text-slate-700">Month</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold text-slate-700">Starting Balance</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold text-slate-700">Interest Earned</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold text-slate-700">Contribution</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold text-slate-700">Ending Balance</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold text-slate-700">Cumulative Interest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-mono">
                {result.breakdown.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-900 font-semibold">{row.month}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(row.startBalance)}</td>
                    <td className={`px-3 py-2 text-right ${row.interestEarned >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatCurrency(row.interestEarned)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(row.contribution)}</td>
                    <td className="px-3 py-2 text-right text-slate-900 font-bold">{formatCurrency(row.endBalance)}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(row.cumulativeInterest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Contract Disclosures & Assumptions */}
      <footer className="rounded-lg border border-slate-200 bg-slate-100/70 p-4 text-xs text-slate-600 space-y-2">
        <h4 className="font-semibold text-slate-800">Mandatory Financial Disclosures &amp; Contract Assumptions</h4>
        <ul className="list-disc list-inside space-y-1 text-slate-600">
          <li>
            <strong>Effective Annual Rate:</strong> Compounded monthly using \(i = (1+r)^{'{'}1/12{'}'} - 1\). End-of-month contributions accrue interest beginning in the subsequent month.
          </li>
          <li>
            <strong>Exclusions:</strong> Calculations exclude taxes, inflation, investment advisory fees, management fees, transaction costs, and expense ratios.
          </li>
          <li>
            <strong>No Guarantee:</strong> Projected annual rates of return are strictly illustrative for educational modeling. Market investments fluctuate, past performance is no guarantee of future returns, and principal losses can occur.
          </li>
        </ul>
      </footer>
    </div>
  );
}
export default CalculatorView;

/**
 * Rutgers AI4Good 2026 — Savings & Investment Calculators Math Engine
 * Strictly follows docs/API_CONTRACT.md conventions:
 * - Effective Annual Rate: monthly i = (1 + r)^(1/12) - 1
 * - Balance recurrence: balance_next = balance * (1 + i) + monthly_contribution
 * - End-of-month contributions
 * - Documented bounds & half-up rounding to cents
 */

export type CalculatorMode = 'savings' | 'investment';

export interface CalculatorInputs {
  startingAmount: number;
  monthlyContribution: number;
  annualRatePercent: number; // e.g. 5.0 for 5%
  horizonMonths: number;     // whole integer 0-600
  mode: CalculatorMode;
}

export interface MonthBreakdown {
  month: number;
  startBalance: number;
  interestEarned: number;
  contribution: number;
  endBalance: number;
  cumulativeContributions: number;
  cumulativeInterest: number;
}

export interface CalculatorResult {
  startingAmount: number;
  monthlyContribution: number;
  annualRatePercent: number;
  horizonMonths: number;
  finalBalance: number;
  totalContributions: number;
  totalGrowth: number;
  breakdown: MonthBreakdown[];
  formattedFinalBalance: string;
  formattedTotalContributions: string;
  formattedTotalGrowth: string;
}

export interface ValidationErrors {
  startingAmount?: string;
  monthlyContribution?: string;
  annualRatePercent?: string;
  horizonMonths?: string;
}

export const BOUNDS = {
  MIN_STARTING_AMOUNT: 0,
  MAX_STARTING_AMOUNT: 1_000_000_000,
  MIN_MONTHLY_CONTRIBUTION: 0,
  MAX_MONTHLY_CONTRIBUTION: 1_000_000,
  MIN_HORIZON_MONTHS: 0,
  MAX_HORIZON_MONTHS: 600,
  MIN_SAVINGS_RATE: 0,
  MAX_SAVINGS_RATE: 100,
  MIN_INVESTMENT_RATE: -99.99,
  MAX_INVESTMENT_RATE: 100,
};

/**
 * Rounds a number half-up to two decimal places (cents).
 */
export function roundToCents(amount: number): number {
  const sign = amount < 0 ? -1 : 1;
  const abs = Math.abs(amount);
  return sign * (Math.round((abs + Number.EPSILON) * 100) / 100);
}

/**
 * Formats a numeric dollar amount to a two-decimal currency string ($1,234.56).
 */
export function formatCurrency(amount: number): string {
  const rounded = roundToCents(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}

/**
 * Validates user inputs against the shared contract bounds.
 */
export function validateCalculatorInputs(inputs: CalculatorInputs): {
  isValid: boolean;
  errors: ValidationErrors;
} {
  const errors: ValidationErrors = {};

  // Starting amount
  if (!Number.isFinite(inputs.startingAmount) || isNaN(inputs.startingAmount)) {
    errors.startingAmount = 'Starting amount must be a valid finite number.';
  } else if (inputs.startingAmount < BOUNDS.MIN_STARTING_AMOUNT) {
    errors.startingAmount = 'Starting amount cannot be negative.';
  } else if (inputs.startingAmount > BOUNDS.MAX_STARTING_AMOUNT) {
    errors.startingAmount = `Starting amount cannot exceed ${formatCurrency(BOUNDS.MAX_STARTING_AMOUNT)}.`;
  }

  // Monthly contribution
  if (!Number.isFinite(inputs.monthlyContribution) || isNaN(inputs.monthlyContribution)) {
    errors.monthlyContribution = 'Monthly contribution must be a valid finite number.';
  } else if (inputs.monthlyContribution < BOUNDS.MIN_MONTHLY_CONTRIBUTION) {
    errors.monthlyContribution = 'Monthly contribution cannot be negative.';
  } else if (inputs.monthlyContribution > BOUNDS.MAX_MONTHLY_CONTRIBUTION) {
    errors.monthlyContribution = `Monthly contribution cannot exceed ${formatCurrency(BOUNDS.MAX_MONTHLY_CONTRIBUTION)}.`;
  }

  // Horizon
  if (!Number.isFinite(inputs.horizonMonths) || isNaN(inputs.horizonMonths)) {
    errors.horizonMonths = 'Horizon must be a valid finite number.';
  } else if (!Number.isInteger(inputs.horizonMonths)) {
    errors.horizonMonths = 'Horizon must be whole months.';
  } else if (inputs.horizonMonths < BOUNDS.MIN_HORIZON_MONTHS) {
    errors.horizonMonths = 'Horizon cannot be negative.';
  } else if (inputs.horizonMonths > BOUNDS.MAX_HORIZON_MONTHS) {
    errors.horizonMonths = `Horizon cannot exceed ${BOUNDS.MAX_HORIZON_MONTHS} months (50 years).`;
  }

  // Annual rate percent
  if (!Number.isFinite(inputs.annualRatePercent) || isNaN(inputs.annualRatePercent)) {
    errors.annualRatePercent = 'Annual rate must be a valid finite number.';
  } else if (inputs.mode === 'savings') {
    if (inputs.annualRatePercent < BOUNDS.MIN_SAVINGS_RATE) {
      errors.annualRatePercent = 'Savings interest rate assumptions must be nonnegative.';
    } else if (inputs.annualRatePercent > BOUNDS.MAX_SAVINGS_RATE) {
      errors.annualRatePercent = `Savings interest rate cannot exceed ${BOUNDS.MAX_SAVINGS_RATE}%.`;
    }
  } else {
    // Investment mode: allowed negative down to -99.99% (> -100%)
    if (inputs.annualRatePercent < BOUNDS.MIN_INVESTMENT_RATE) {
      errors.annualRatePercent = `Investment return rate must exceed -100% (minimum is ${BOUNDS.MIN_INVESTMENT_RATE}%).`;
    } else if (inputs.annualRatePercent > BOUNDS.MAX_INVESTMENT_RATE) {
      errors.annualRatePercent = `Investment return rate cannot exceed ${BOUNDS.MAX_INVESTMENT_RATE}%.`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Calculates compound growth with effective annual rate and end-of-month contributions.
 */
export function calculateGrowth(inputs: CalculatorInputs): CalculatorResult {
  const validation = validateCalculatorInputs(inputs);
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(`Invalid calculator inputs: ${firstError}`);
  }

  const { startingAmount, monthlyContribution, annualRatePercent, horizonMonths } = inputs;

  // Zero horizon edge case
  if (horizonMonths === 0) {
    const finalBal = roundToCents(startingAmount);
    return {
      startingAmount,
      monthlyContribution,
      annualRatePercent,
      horizonMonths,
      finalBalance: finalBal,
      totalContributions: 0,
      totalGrowth: 0,
      breakdown: [],
      formattedFinalBalance: formatCurrency(finalBal),
      formattedTotalContributions: formatCurrency(0),
      formattedTotalGrowth: formatCurrency(0),
    };
  }

  // Effective annual rate conversion:
  // r = annualRatePercent / 100
  // monthly i = (1 + r)^(1/12) - 1
  const r = annualRatePercent / 100;
  const monthlyRate = r === 0 ? 0 : Math.pow(1 + r, 1 / 12) - 1;

  let currentBalance = startingAmount;
  let cumulativeContributions = 0;
  let cumulativeInterest = 0;
  const breakdown: MonthBreakdown[] = [];

  for (let m = 1; m <= horizonMonths; m++) {
    const startBal = currentBalance;
    // Interest earned on previous balance during month m
    const interest = startBal * monthlyRate;
    // End-of-month contribution
    const contribution = monthlyContribution;
    const endBal = startBal + interest + contribution;

    cumulativeContributions += contribution;
    cumulativeInterest += interest;
    currentBalance = endBal;

    breakdown.push({
      month: m,
      startBalance: roundToCents(startBal),
      interestEarned: roundToCents(interest),
      contribution: roundToCents(contribution),
      endBalance: roundToCents(endBal),
      cumulativeContributions: roundToCents(cumulativeContributions),
      cumulativeInterest: roundToCents(cumulativeInterest),
    });
  }

  const roundedFinalBalance = roundToCents(currentBalance);
  const roundedTotalContributions = roundToCents(cumulativeContributions);
  // Growth is final balance minus starting amount minus new contributions
  const roundedGrowth = roundToCents(roundedFinalBalance - startingAmount - roundedTotalContributions);

  return {
    startingAmount,
    monthlyContribution,
    annualRatePercent,
    horizonMonths,
    finalBalance: roundedFinalBalance,
    totalContributions: roundedTotalContributions,
    totalGrowth: roundedGrowth,
    breakdown,
    formattedFinalBalance: formatCurrency(roundedFinalBalance),
    formattedTotalContributions: formatCurrency(roundedTotalContributions),
    formattedTotalGrowth: formatCurrency(roundedGrowth),
  };
}

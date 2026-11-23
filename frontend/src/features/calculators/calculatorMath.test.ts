import { describe, it, expect } from 'vitest';
import {
  calculateGrowth,
  validateCalculatorInputs,
  roundToCents,
  BOUNDS,
  CalculatorInputs,
} from './calculatorMath';

describe('calculatorMath Engine', () => {
  describe('Reference Checks from Contract', () => {
    it('matches Reference Check 1: $1000 starting, $100/mo, 0% rate, 12 months', () => {
      const inputs: CalculatorInputs = {
        startingAmount: 1000,
        monthlyContribution: 100,
        annualRatePercent: 0,
        horizonMonths: 12,
        mode: 'savings',
      };

      const result = calculateGrowth(inputs);

      expect(result.finalBalance).toBe(2200.0);
      expect(result.totalContributions).toBe(1200.0);
      expect(result.totalGrowth).toBe(0.0);
      expect(result.formattedFinalBalance).toBe('$2,200.00');
      expect(result.formattedTotalContributions).toBe('$1,200.00');
      expect(result.formattedTotalGrowth).toBe('$0.00');
      expect(result.breakdown.length).toBe(12);
    });

    it('matches Reference Check 2: $1000 starting, no contributions, 12% effective annual, 12 months', () => {
      const inputs: CalculatorInputs = {
        startingAmount: 1000,
        monthlyContribution: 0,
        annualRatePercent: 12,
        horizonMonths: 12,
        mode: 'investment',
      };

      const result = calculateGrowth(inputs);

      // (1 + 0.12)^(1/12) compounded 12 times = exactly 1.12
      expect(result.finalBalance).toBe(1120.0);
      expect(result.totalContributions).toBe(0.0);
      expect(result.totalGrowth).toBe(120.0);
      expect(result.formattedFinalBalance).toBe('$1,120.00');
      expect(result.formattedTotalContributions).toBe('$0.00');
      expect(result.formattedTotalGrowth).toBe('$120.00');
    });
  });

  describe('Edge Cases', () => {
    it('handles zero horizon months correctly', () => {
      const result = calculateGrowth({
        startingAmount: 500,
        monthlyContribution: 50,
        annualRatePercent: 7,
        horizonMonths: 0,
        mode: 'savings',
      });

      expect(result.finalBalance).toBe(500.0);
      expect(result.totalContributions).toBe(0);
      expect(result.totalGrowth).toBe(0);
      expect(result.breakdown).toEqual([]);
    });

    it('handles zero starting amount with monthly contributions', () => {
      const result = calculateGrowth({
        startingAmount: 0,
        monthlyContribution: 200,
        annualRatePercent: 0,
        horizonMonths: 6,
        mode: 'savings',
      });

      expect(result.finalBalance).toBe(1200.0);
      expect(result.totalContributions).toBe(1200.0);
      expect(result.totalGrowth).toBe(0.0);
    });

    it('supports maximum allowed horizon of 600 months (50 years)', () => {
      const result = calculateGrowth({
        startingAmount: 1000,
        monthlyContribution: 100,
        annualRatePercent: 5,
        horizonMonths: 600,
        mode: 'savings',
      });

      expect(result.finalBalance).toBeGreaterThan(1000 + 600 * 100);
      expect(result.breakdown.length).toBe(600);
      expect(result.breakdown[599].month).toBe(600);
    });

    it('handles negative allowed investment return rates', () => {
      const result = calculateGrowth({
        startingAmount: 1000,
        monthlyContribution: 0,
        annualRatePercent: -10, // -10% annual loss
        horizonMonths: 12,
        mode: 'investment',
      });

      // After 12 months at -10% effective annual, balance should be exactly $900.00
      expect(result.finalBalance).toBe(900.0);
      expect(result.totalGrowth).toBe(-100.0);
      expect(result.totalContributions).toBe(0.0);
    });

    it('handles extreme negative investment rate bound (-99.99%)', () => {
      const result = calculateGrowth({
        startingAmount: 1000,
        monthlyContribution: 0,
        annualRatePercent: BOUNDS.MIN_INVESTMENT_RATE,
        horizonMonths: 12,
        mode: 'investment',
      });

      expect(result.finalBalance).toBe(0.1); // $1000 * (1 - 0.9999) = $0.10
      expect(result.totalGrowth).toBe(-999.9);
    });
  });

  describe('Input Validation & Boundary Rejection', () => {
    it('rejects negative savings-rate assumptions', () => {
      const validation = validateCalculatorInputs({
        startingAmount: 1000,
        monthlyContribution: 100,
        annualRatePercent: -1,
        horizonMonths: 12,
        mode: 'savings',
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.annualRatePercent).toContain('nonnegative');
    });

    it('rejects investment rates that do not strictly exceed -100%', () => {
      const validationAt100 = validateCalculatorInputs({
        startingAmount: 1000,
        monthlyContribution: 100,
        annualRatePercent: -100,
        horizonMonths: 12,
        mode: 'investment',
      });
      expect(validationAt100.isValid).toBe(false);
      expect(validationAt100.errors.annualRatePercent).toContain('exceed -100%');

      const validationBeyond = validateCalculatorInputs({
        startingAmount: 1000,
        monthlyContribution: 100,
        annualRatePercent: -105,
        horizonMonths: 12,
        mode: 'investment',
      });
      expect(validationBeyond.isValid).toBe(false);
    });

    it('rejects nonfinite inputs (NaN and Infinity)', () => {
      const validation = validateCalculatorInputs({
        startingAmount: NaN,
        monthlyContribution: Infinity,
        annualRatePercent: 5,
        horizonMonths: 12,
        mode: 'savings',
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.startingAmount).toContain('finite');
      expect(validation.errors.monthlyContribution).toContain('finite');
    });

    it('rejects fractional months for horizon', () => {
      const validation = validateCalculatorInputs({
        startingAmount: 1000,
        monthlyContribution: 100,
        annualRatePercent: 5,
        horizonMonths: 12.5,
        mode: 'savings',
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.horizonMonths).toContain('whole months');
    });

    it('rejects values beyond maximum documented bounds', () => {
      const validation = validateCalculatorInputs({
        startingAmount: 2_000_000_000, // > 1B
        monthlyContribution: 2_000_000, // > 1M
        annualRatePercent: 150, // > 100%
        horizonMonths: 601, // > 600
        mode: 'savings',
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.startingAmount).toBeDefined();
      expect(validation.errors.monthlyContribution).toBeDefined();
      expect(validation.errors.annualRatePercent).toBeDefined();
      expect(validation.errors.horizonMonths).toBeDefined();
    });
  });

  describe('Rounding Precision', () => {
    it('rounds half-up to exact cents', () => {
      expect(roundToCents(10.005)).toBe(10.01);
      expect(roundToCents(10.004)).toBe(10.0);
      expect(roundToCents(-10.005)).toBe(-10.01);
    });
  });
});

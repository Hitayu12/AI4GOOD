/**
 * Rutgers AI4Good 2026 — Portfolio Analytics & Performance Engine Tests
 * Strictly verifies docs/API_CONTRACT.md (v2) and Phase 6 requirements:
 * 1. Exact match with contract reference reconciliation (all 4 steps).
 * 2. Equity curve contains only visited sessions up to current cursor (zero future sessions).
 * 3. Total return percentage calculation: positive, zero, negative (losses).
 * 4. Accessible text formatting for losses (includes minus sign and "Loss" text label, never color alone).
 * 5. Empty positions handling (cash = equity, unrealized = 0.00).
 * 6. Proportional remaining cost basis allocation on partial sell and remainder allocation on final sell.
 */

import { describe, expect, it } from 'vitest';
import {
  allocateCostBasisOnSell,
  buildPortfolioSummary,
  calculateReturnPct,
  calculateTotalEquity,
  centsToDollars,
  dollarsToCents,
  formatPercent,
  formatPnL,
  formatPrice,
  formatUSD,
  generateEquityCurve,
  PortfolioService,
  REFERENCE_RECONCILIATION_FIXTURE_STEPS,
  runReferenceReconciliation,
} from './portfolioService';
import type {
  Performance,
  Portfolio,
  SimulationHistoryEntry,
} from './portfolioTypes';

describe('Portfolio & Performance Analytics Engine', () => {
  // =========================================================================
  // 1. Exact Match with Contract Reference Reconciliation (all 4 steps)
  // =========================================================================
  describe('1. Contract Reference Reconciliation (docs/API_CONTRACT.md line 59)', () => {
    it('Step 1: satisfies initial cash $1,000.00 state with 0 realized/unrealized P&L and empty positions', () => {
      const step1 = REFERENCE_RECONCILIATION_FIXTURE_STEPS[0];
      expect(step1.step).toBe(1);
      expect(step1.session_date).toBe('2024-01-02');
      expect(step1.cash).toBe('1000.00');
      expect(step1.total_equity).toBe('1000.00');
      expect(step1.realized_pnl).toBe('0.00');
      expect(step1.unrealized_pnl).toBe('0.00');
      expect(step1.positions).toHaveLength(0);
      expect(step1.total_return_pct).toBe('0.00');
    });

    it('Step 2: Buy 2 @ 100 open, mark close 110 -> cash 800.00, equity 1020.00, unrealized +20.00', () => {
      const step2 = REFERENCE_RECONCILIATION_FIXTURE_STEPS[1];
      expect(step2.step).toBe(2);
      expect(step2.session_date).toBe('2024-01-03');
      expect(step2.cash).toBe('800.00');
      expect(step2.total_equity).toBe('1020.00');
      expect(step2.realized_pnl).toBe('0.00');
      expect(step2.unrealized_pnl).toBe('20.00');
      expect(step2.positions).toHaveLength(1);
      expect(step2.positions[0].symbol).toBe('AAPL');
      expect(step2.positions[0].quantity).toBe(2);
      expect(step2.positions[0].cost_basis).toBe('100.000000');
      expect(step2.positions[0].market_price).toBe('110.000000');
      expect(step2.positions[0].market_value).toBe('220.00');
      expect(step2.positions[0].unrealized_pnl).toBe('20.00');
      expect(step2.total_return_pct).toBe('2.00');
    });

    it('Step 3: Sell 1 @ 120 open, mark close 90 -> cash 920.00, realized 20.00, unrealized -10.00, equity 1010.00', () => {
      const step3 = REFERENCE_RECONCILIATION_FIXTURE_STEPS[2];
      expect(step3.step).toBe(3);
      expect(step3.session_date).toBe('2024-01-04');
      expect(step3.cash).toBe('920.00');
      expect(step3.realized_pnl).toBe('20.00');
      expect(step3.unrealized_pnl).toBe('-10.00');
      expect(step3.total_equity).toBe('1010.00');
      expect(step3.positions).toHaveLength(1);
      expect(step3.positions[0].quantity).toBe(1);
      expect(step3.positions[0].cost_basis).toBe('100.000000');
      expect(step3.positions[0].market_price).toBe('90.000000');
      expect(step3.positions[0].market_value).toBe('90.00');
      expect(step3.positions[0].unrealized_pnl).toBe('-10.00');
      expect(step3.total_return_pct).toBe('1.00');
    });

    it('Step 4: Sell 1 @ 95 open, mark close 95 -> cash/equity 1015.00, cumulative realized 15.00, unrealized 0.00', () => {
      const step4 = REFERENCE_RECONCILIATION_FIXTURE_STEPS[3];
      expect(step4.step).toBe(4);
      expect(step4.session_date).toBe('2024-01-05');
      expect(step4.cash).toBe('1015.00');
      expect(step4.total_equity).toBe('1015.00');
      expect(step4.realized_pnl).toBe('15.00');
      expect(step4.unrealized_pnl).toBe('0.00');
      expect(step4.positions).toHaveLength(0);
      expect(step4.total_return_pct).toBe('1.50');
    });

    it('executes full automated sequence through runReferenceReconciliation() verifier', () => {
      const result = runReferenceReconciliation(1000.0);
      expect(result.steps).toHaveLength(4);

      // Verify all 4 steps dynamically produced match contract invariants
      const [s1, s2, s3, s4] = result.steps;
      expect(s1.cash).toBe('1000.00');
      expect(s1.total_equity).toBe('1000.00');

      expect(s2.cash).toBe('800.00');
      expect(s2.total_equity).toBe('1020.00');
      expect(s2.unrealized_pnl).toBe('20.00');

      expect(s3.cash).toBe('920.00');
      expect(s3.realized_pnl).toBe('20.00');
      expect(s3.unrealized_pnl).toBe('-10.00');
      expect(s3.total_equity).toBe('1010.00');

      expect(s4.cash).toBe('1015.00');
      expect(s4.total_equity).toBe('1015.00');
      expect(s4.realized_pnl).toBe('15.00');
      expect(s4.unrealized_pnl).toBe('0.00');

      // Final portfolio match
      expect(result.finalPortfolio.cash).toBe('1015.00');
      expect(result.finalPortfolio.total_equity).toBe('1015.00');
      expect(result.finalPortfolio.realized_pnl).toBe('15.00');
      expect(result.finalPortfolio.unrealized_pnl).toBe('0.00');
      expect(result.finalPortfolio.positions).toHaveLength(0);

      // Performance match
      expect(result.finalPerformance.initial_cash).toBe('1000.00');
      expect(result.finalPerformance.total_return_pct).toBe('1.50');
      expect(result.finalPerformance.equity_curve).toHaveLength(4);
    });
  });

  // =========================================================================
  // 2. Strict Visited-Only Equity Curve (Zero Lookahead)
  // =========================================================================
  describe('2. Visited-Only Equity Curve Generation (Zero Lookahead Guarantee)', () => {
    const fullSimulationHistory: SimulationHistoryEntry[] = [
      { session_date: '2024-01-02', total_equity: '1000.00' },
      { session_date: '2024-01-03', total_equity: '1020.00' },
      { session_date: '2024-01-04', total_equity: '1010.00' },
      { session_date: '2024-01-05', total_equity: '1015.00' },
      { session_date: '2024-01-08', total_equity: '1080.00' }, // Future session
      { session_date: '2024-01-09', total_equity: '1100.00' }, // Future session
    ];

    it('STRICT GUARANTEE: curve contains ONLY sessions <= currentSession cursor', () => {
      const currentCursor = '2024-01-04';
      const curve = generateEquityCurve(fullSimulationHistory, currentCursor);

      expect(curve).toHaveLength(3);
      expect(curve.map((p) => p.session_date)).toEqual(['2024-01-02', '2024-01-03', '2024-01-04']);
      expect(curve.every((p) => p.session_date <= currentCursor)).toBe(true);

      // Verify no future session leaks
      expect(curve.some((p) => p.session_date === '2024-01-05')).toBe(false);
      expect(curve.some((p) => p.session_date === '2024-01-08')).toBe(false);
      expect(curve.some((p) => p.session_date === '2024-01-09')).toBe(false);
    });

    it('returns single point at initial session start', () => {
      const curve = generateEquityCurve(fullSimulationHistory, '2024-01-02');
      expect(curve).toHaveLength(1);
      expect(curve[0]).toEqual({ session_date: '2024-01-02', total_equity: '1000.00' });
    });

    it('returns empty array when history is empty or cursor precedes all sessions', () => {
      expect(generateEquityCurve([], '2024-01-04')).toEqual([]);
      expect(generateEquityCurve(fullSimulationHistory, '2023-12-31')).toEqual([]);
    });

    it('sorts out-of-order session snapshots into strictly chronological order', () => {
      const unorderedHistory: SimulationHistoryEntry[] = [
        { session_date: '2024-01-04', total_equity: '1010.00' },
        { session_date: '2024-01-02', total_equity: '1000.00' },
        { session_date: '2024-01-05', total_equity: '1015.00' },
        { session_date: '2024-01-03', total_equity: '1020.00' },
      ];

      const curve = generateEquityCurve(unorderedHistory, '2024-01-04');
      expect(curve).toHaveLength(3);
      expect(curve.map((p) => p.session_date)).toEqual(['2024-01-02', '2024-01-03', '2024-01-04']);
      expect(curve.map((p) => p.total_equity)).toEqual(['1000.00', '1020.00', '1010.00']);
    });

    it('supports Portfolio objects with as_of_session and total_equity', () => {
      const portfolioHistory: Portfolio[] = [
        {
          as_of_session: '2024-01-02',
          cash: '1000.00',
          positions: [],
          realized_pnl: '0.00',
          unrealized_pnl: '0.00',
          total_equity: '1000.00',
        },
        {
          as_of_session: '2024-01-03',
          cash: '800.00',
          positions: [],
          realized_pnl: '0.00',
          unrealized_pnl: '20.00',
          total_equity: '1020.00',
        },
        {
          as_of_session: '2024-01-04',
          cash: '920.00',
          positions: [],
          realized_pnl: '20.00',
          unrealized_pnl: '-10.00',
          total_equity: '1010.00',
        },
      ];

      const curve = generateEquityCurve(portfolioHistory, '2024-01-03');
      expect(curve).toHaveLength(2);
      expect(curve[0].session_date).toBe('2024-01-02');
      expect(curve[1].session_date).toBe('2024-01-03');
    });
  });

  // =========================================================================
  // 3. Total Return Percentage Calculations
  // =========================================================================
  describe('3. Total Return Percentage Calculation: 100 * (equity - initial_cash) / initial_cash', () => {
    it('calculates positive returns accurately (gains)', () => {
      expect(calculateReturnPct(1020.0, 1000.0)).toBe(2.0);
      expect(calculateReturnPct(1015.0, 1000.0)).toBe(1.5);
      expect(calculateReturnPct('1250.00', '1000.00')).toBe(25.0);
      expect(calculateReturnPct(1055.55, 1000.0)).toBe(5.56);
    });

    it('calculates break-even return accurately (0.00%)', () => {
      expect(calculateReturnPct(1000.0, 1000.0)).toBe(0.0);
      expect(calculateReturnPct('1000.00', '1000.00')).toBe(0.0);
    });

    it('calculates negative returns accurately (losses)', () => {
      expect(calculateReturnPct(920.0, 1000.0)).toBe(-8.0);
      expect(calculateReturnPct(950.0, 1000.0)).toBe(-5.0);
      expect(calculateReturnPct('750.00', '1000.00')).toBe(-25.0);
      expect(calculateReturnPct(990.0, 1000.0)).toBe(-1.0);
    });

    it('safely handles non-positive initial cash by returning 0 without crashing', () => {
      expect(calculateReturnPct(1000, 0)).toBe(0);
      expect(calculateReturnPct(1000, -500)).toBe(0);
      expect(calculateReturnPct(NaN, 1000)).toBe(0);
    });
  });

  // =========================================================================
  // 4. Accessible Non-Color Loss Formatting
  // =========================================================================
  describe('4. Accessible Non-Color P&L Formatting (formatPnL)', () => {
    it('formats losses with explicit minus sign AND text label "Loss" (never color alone)', () => {
      const result = formatPnL(-10.0);
      expect(result.isLoss).toBe(true);
      expect(result.isGain).toBe(false);

      // Must satisfy: includes minus sign and "Loss" text label
      expect(result.text).toContain('-');
      expect(result.text).toContain('Loss');
      expect(result.text).toBe('-$10.00 Loss');

      // Accessible aria-label must clearly convey the loss for screen readers
      expect(result.ariaLabel).toContain('Loss');
      expect(result.ariaLabel).toContain('$10.00');
      expect(result.signIndicator).toBe('-');
    });

    it('formats string losses correctly (-50.25)', () => {
      const result = formatPnL('-50.25');
      expect(result.isLoss).toBe(true);
      expect(result.isGain).toBe(false);
      expect(result.text).toBe('-$50.25 Loss');
      expect(result.ariaLabel).toContain('Loss of $50.25');
    });

    it('formats gains with explicit plus sign AND text label "Gain"', () => {
      const result = formatPnL(20.0);
      expect(result.isLoss).toBe(false);
      expect(result.isGain).toBe(true);
      expect(result.text).toContain('+');
      expect(result.text).toContain('Gain');
      expect(result.text).toBe('+$20.00 Gain');
      expect(result.ariaLabel).toContain('Profit of $20.00');
      expect(result.signIndicator).toBe('+');
    });

    it('formats break-even / zero neutral state properly', () => {
      const result = formatPnL(0);
      expect(result.isLoss).toBe(false);
      expect(result.isGain).toBe(false);
      expect(result.text).toBe('$0.00');
      expect(result.ariaLabel).toBe('Break-even: $0.00');
      expect(result.signIndicator).toBe('');
    });
  });

  // =========================================================================
  // 5. Empty Positions Handling
  // =========================================================================
  describe('5. Empty Positions Handling (cash = equity, unrealized = 0.00)', () => {
    it('sets total_equity equal to cash when positions list is empty', () => {
      const equity = calculateTotalEquity(1000.0, []);
      expect(equity).toBe(1000.0);

      const equityFromStr = calculateTotalEquity('1500.50', []);
      expect(equityFromStr).toBe(1500.5);
    });

    it('builds valid summary with empty positions: market value $0.00, unrealized $0.00', () => {
      const emptyPortfolio: Portfolio = {
        as_of_session: '2024-01-02',
        cash: '1000.00',
        positions: [],
        realized_pnl: '0.00',
        unrealized_pnl: '0.00',
        total_equity: '1000.00',
      };

      const perf: Performance = {
        initial_cash: '1000.00',
        total_return_pct: '0.00',
        equity_curve: [{ session_date: '2024-01-02', total_equity: '1000.00' }],
      };

      const summary = buildPortfolioSummary(emptyPortfolio, perf);
      expect(summary.total_market_value).toBe('0.00');
      expect(summary.total_market_value_formatted).toBe('$0.00');
      expect(summary.unrealized_pnl).toBe('0.00');
      expect(summary.unrealized_pnl_formatted).toBe('$0.00');
      expect(summary.position_count).toBe(0);
      expect(summary.cash).toBe('1000.00');
      expect(summary.total_equity).toBe('1000.00');
      expect(summary.is_flat).toBe(true);
    });
  });

  // =========================================================================
  // 6. Proportional Cost Basis Allocation (Partial vs Final Sell)
  // =========================================================================
  describe('6. Proportional Cost Basis Allocation (docs/API_CONTRACT.md line 58)', () => {
    it('allocates proportional remaining cost basis rounded half-up to cents on partial sell', () => {
      // Bought 3 shares for total $100.00 (10,000 cents). Selling 1 share.
      // Proportional cost = 10000 * 1 / 3 = 3333.333... -> rounded to 3333 cents ($33.33)
      const res = allocateCostBasisOnSell(3, 10000, 1);
      expect(res.allocatedCostCents).toBe(3333);
      expect(res.remainingCostCents).toBe(6667);
      expect(res.remainingQuantity).toBe(2);
      expect(res.unitCostBasis).toBe('33.335000');
    });

    it('allocates exact proportional cost on clean splits (selling 1 of 2 shares @ $100)', () => {
      // Bought 2 shares for $200.00 (20,000 cents). Selling 1 share.
      const res = allocateCostBasisOnSell(2, 20000, 1);
      expect(res.allocatedCostCents).toBe(10000);
      expect(res.remainingCostCents).toBe(10000);
      expect(res.remainingQuantity).toBe(1);
      expect(res.unitCostBasis).toBe('100.000000');
    });

    it('allocates entire remaining cost basis on final sell with zero penny drift', () => {
      // Remaining 1 share with 3334 cents left. Selling 1 share.
      const res = allocateCostBasisOnSell(1, 3334, 1);
      expect(res.allocatedCostCents).toBe(3334);
      expect(res.remainingCostCents).toBe(0);
      expect(res.remainingQuantity).toBe(0);
      expect(res.unitCostBasis).toBe('0.000000');
    });

    it('handles two sequential partial sales and a final sale without penny leakage', () => {
      // Initial: 3 shares costing $100.00 (10,000 cents)
      const sale1 = allocateCostBasisOnSell(3, 10000, 1);
      expect(sale1.allocatedCostCents).toBe(3333);
      expect(sale1.remainingCostCents).toBe(6667);

      // Sale 2: selling 1 of remaining 2 shares
      // 6667 * 1 / 2 = 3333.5 -> rounded half-up to 3334 cents
      const sale2 = allocateCostBasisOnSell(sale1.remainingQuantity, sale1.remainingCostCents, 1);
      expect(sale2.allocatedCostCents).toBe(3334);
      expect(sale2.remainingCostCents).toBe(3333);

      // Sale 3: selling final 1 share -> entire remainder 3333 allocated
      const sale3 = allocateCostBasisOnSell(sale2.remainingQuantity, sale2.remainingCostCents, 1);
      expect(sale3.allocatedCostCents).toBe(3333);
      expect(sale3.remainingCostCents).toBe(0);
      expect(sale3.remainingQuantity).toBe(0);

      // Sum of all 3 allocated costs MUST equal exactly the original 10,000 cents!
      const totalAllocated = sale1.allocatedCostCents + sale2.allocatedCostCents + sale3.allocatedCostCents;
      expect(totalAllocated).toBe(10000);
    });
  });

  // =========================================================================
  // 7. PortfolioSummary Construction & High-Level Invariants
  // =========================================================================
  describe('7. PortfolioSummary Construction & Accessible Display', () => {
    it('builds full summary with peak and low equity metrics', () => {
      const portfolio: Portfolio = {
        as_of_session: '2024-01-04',
        cash: '920.00',
        positions: [
          {
            symbol: 'AAPL',
            quantity: 1,
            cost_basis: '100.000000',
            market_price: '90.000000',
            market_value: '90.00',
            unrealized_pnl: '-10.00',
          },
        ],
        realized_pnl: '20.00',
        unrealized_pnl: '-10.00',
        total_equity: '1010.00',
      };

      const performance: Performance = {
        initial_cash: '1000.00',
        total_return_pct: '1.00',
        equity_curve: [
          { session_date: '2024-01-02', total_equity: '1000.00' },
          { session_date: '2024-01-03', total_equity: '1020.00' },
          { session_date: '2024-01-04', total_equity: '1010.00' },
        ],
      };

      const summary = buildPortfolioSummary(portfolio, performance);

      expect(summary.as_of_session).toBe('2024-01-04');
      expect(summary.cash_formatted).toBe('$920.00');
      expect(summary.total_equity_formatted).toBe('$1,010.00');
      expect(summary.total_market_value).toBe('90.00');
      expect(summary.visited_session_count).toBe(3);
      expect(summary.max_equity).toBe('1020.00');
      expect(summary.max_equity_formatted).toBe('$1,020.00');
      expect(summary.min_equity).toBe('1000.00');
      expect(summary.min_equity_formatted).toBe('$1,000.00');
      expect(summary.pnl_sign_indicator).toBe('+');
      expect(summary.status_label).toBe('Profit');
      expect(summary.aria_label).toContain('Total Equity $1,010.00');
      expect(summary.aria_label).toContain('Profit');
    });

    it('builds summary for net loss scenario with accessible text and sign', () => {
      const lossPortfolio: Portfolio = {
        as_of_session: '2024-01-04',
        cash: '850.00',
        positions: [],
        realized_pnl: '-150.00',
        unrealized_pnl: '0.00',
        total_equity: '850.00',
      };

      const lossPerformance: Performance = {
        initial_cash: '1000.00',
        total_return_pct: '-15.00',
        equity_curve: [
          { session_date: '2024-01-02', total_equity: '1000.00' },
          { session_date: '2024-01-04', total_equity: '850.00' },
        ],
      };

      const summary = buildPortfolioSummary(lossPortfolio, lossPerformance);

      expect(summary.is_loss).toBe(true);
      expect(summary.is_gain).toBe(false);
      expect(summary.status_label).toBe('Loss');
      expect(summary.pnl_sign_indicator).toBe('-');
      expect(summary.total_return_pct_formatted).toBe('-15.00%');
      expect(summary.aria_label).toContain('Loss');
      expect(summary.realized_pnl_formatted).toContain('Loss');
    });
  });

  // =========================================================================
  // 8. Service Class Integration
  // =========================================================================
  describe('8. PortfolioService Class Instance Methods', () => {
    it('manages sessions and generates verified equity curve', () => {
      const service = new PortfolioService(1000.0);

      service.recordSession({ session_date: '2024-01-02', total_equity: '1000.00' });
      service.recordSession({ session_date: '2024-01-03', total_equity: '1020.00' });
      service.recordSession({ session_date: '2024-01-04', total_equity: '1010.00' });
      service.recordSession({ session_date: '2024-01-05', total_equity: '1015.00' });

      // Query curve at 2024-01-03
      const earlyCurve = service.generateEquityCurve('2024-01-03');
      expect(earlyCurve).toHaveLength(2);
      expect(earlyCurve.every((p) => p.session_date <= '2024-01-03')).toBe(true);

      // Query full curve at 2024-01-05
      const fullCurve = service.generateEquityCurve('2024-01-05');
      expect(fullCurve).toHaveLength(4);

      // Verify return calculation using instance initialCash
      expect(service.calculateReturnPct(1020.0)).toBe(2.0);
      expect(service.calculateReturnPct(900.0)).toBe(-10.0);

      // Reset works
      service.reset(2000.0);
      expect(service.generateEquityCurve('2024-01-05')).toEqual([]);
      expect(service.calculateReturnPct(2100.0)).toBe(5.0);
    });
  });

  // =========================================================================
  // 9. Numeric and Currency Formatting Helpers
  // =========================================================================
  describe('9. Financial Precision & Formatting Utilities', () => {
    it('converts dollars to cents and cents to dollars accurately', () => {
      expect(dollarsToCents(100.55)).toBe(10055);
      expect(dollarsToCents('100.55')).toBe(10055);
      expect(centsToDollars(10055)).toBe('100.55');
      expect(centsToDollars(0)).toBe('0.00');
      expect(centsToDollars(-1050)).toBe('-10.50');
    });

    it('formats price with 6 decimal places according to API Contract v2', () => {
      expect(formatPrice(100)).toBe('100.000000');
      expect(formatPrice('95.5')).toBe('95.500000');
      expect(formatPrice('invalid')).toBe('0.000000');
    });

    it('formats USD strings with standard commas and decimals', () => {
      expect(formatUSD(1234567.89)).toBe('$1,234,567.89');
      expect(formatUSD(-25.5)).toBe('-$25.50');
      expect(formatUSD(0)).toBe('$0.00');
    });

    it('formats percentages with explicit signs', () => {
      expect(formatPercent(5.25)).toBe('+5.25%');
      expect(formatPercent(-3.5)).toBe('-3.50%');
      expect(formatPercent(0)).toBe('0.00%');
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  formatUSD,
  formatUSDAbsolute,
  formatUSDWithExplicitSign,
  formatPercentWithExplicitSign,
  parseAmount,
  calculatePositionRows,
  filterVisitedEquityPoints,
  calculatePerformanceStats,
} from './portfolioUtils';
import { Position } from './portfolioTypes';

describe('portfolioUtils module', () => {
  it('formats USD values accurately with negative and positive cases', () => {
    expect(formatUSD(1020)).toBe('$1,020.00');
    expect(formatUSD(0)).toBe('$0.00');
    expect(formatUSD(-10)).toBe('-$10.00');
    expect(formatUSD(NaN)).toBe('$0.00');

    expect(formatUSDAbsolute(-10.5)).toBe('$10.50');
    expect(formatUSDAbsolute(10.5)).toBe('$10.50');

    expect(formatUSDWithExplicitSign(20)).toBe('+$20.00');
    expect(formatUSDWithExplicitSign(-10)).toBe('-$10.00');
    expect(formatUSDWithExplicitSign(0)).toBe('$0.00');
  });

  it('formats percentages accurately with signs', () => {
    expect(formatPercentWithExplicitSign(2)).toBe('+2.00%');
    expect(formatPercentWithExplicitSign(-1.11)).toBe('-1.11%');
    expect(formatPercentWithExplicitSign(0)).toBe('0.00%');
    expect(formatPercentWithExplicitSign(NaN)).toBe('0.00%');
  });

  it('parses amounts robustly', () => {
    expect(parseAmount('123.45')).toBe(123.45);
    expect(parseAmount(100)).toBe(100);
    expect(parseAmount(undefined, 50)).toBe(50);
    expect(parseAmount('invalid', 10)).toBe(10);
  });

  it('calculates position rows correctly with weights and unrealized P&L', () => {
    const mockPositions: Position[] = [
      {
        symbol: 'AAPL',
        quantity: 10,
        cost_basis: '180.00',
        market_price: '185.00',
        market_value: '1850.00',
        unrealized_pnl: '50.00',
      },
      {
        symbol: 'MSFT',
        quantity: 5,
        cost_basis: '400.00',
        market_price: '380.00',
        market_value: '1900.00',
        unrealized_pnl: '-100.00',
      },
    ];

    const rows = calculatePositionRows(mockPositions, 5000);
    expect(rows).toHaveLength(2);

    expect(rows[0].symbol).toBe('AAPL');
    expect(rows[0].shares).toBe(10);
    expect(rows[0].totalCost).toBe(1800);
    expect(rows[0].marketValue).toBe(1850);
    expect(rows[0].unrealizedPnlDollar).toBe(50);
    expect(rows[0].unrealizedPnlPercent).toBeCloseTo(2.777, 2);
    expect(rows[0].weightPercent).toBe(37.0);

    expect(rows[1].symbol).toBe('MSFT');
    expect(rows[1].unrealizedPnlDollar).toBe(-100);
    expect(rows[1].unrealizedPnlPercent).toBe(-5.0);
    expect(rows[1].weightPercent).toBe(38.0);
  });

  it('filterVisitedEquityPoints strictly drops any session beyond current session', () => {
    const curve = [
      { session_date: '2024-01-02', total_equity: '1000' },
      { session_date: '2024-01-03', total_equity: '1020' },
      { session_date: '2024-01-04', total_equity: '1050' },
      { session_date: '2024-01-05', total_equity: '1100' },
    ];

    const visited = filterVisitedEquityPoints(curve, '2024-01-03');
    expect(visited).toHaveLength(2);
    expect(visited.map((v) => v.session_date)).toEqual(['2024-01-02', '2024-01-03']);
    expect(visited.map((v) => v.total_equity)).toEqual([1000, 1020]);
  });

  it('calculatePerformanceStats computes peak, low, and counts', () => {
    const points = [
      { session_date: '2024-01-02', total_equity: 1000 },
      { session_date: '2024-01-03', total_equity: 1100 },
      { session_date: '2024-01-04', total_equity: 950 },
    ];

    const stats = calculatePerformanceStats(points, 1000, 50);
    expect(stats.visitedSessionsCount).toBe(3);
    expect(stats.peakEquity).toBe(1100);
    expect(stats.lowEquity).toBe(950);
    expect(stats.initialCash).toBe(1000);
    expect(stats.realizedPnl).toBe(50);
    expect(stats.realizedPnlPercent).toBe(5);
  });
});

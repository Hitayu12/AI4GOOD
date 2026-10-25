import { useState, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import {
  EquityPoint,
  PortfolioViewProps,
  Position,
} from './portfolioTypes';
import {
  calculatePerformanceStats,
  calculatePositionRows,
  filterVisitedEquityPoints,
  formatUSD,
  formatUSDAbsolute,
  parseAmount,
} from './portfolioUtils';

/**
 * Non-Color-Only Loss & Gain Indicator (Accessibility & WCAG Compliant)
 * 
 * Invariant: Losses MUST NOT rely on red color alone.
 * Every loss MUST have:
 * 1. An explicit minus sign ("-") and explicit text label ("Loss" or "▼")
 * 2. An accessible ARIA label (e.g. aria-label="Loss of $10.00 (-1.11%)")
 * 3. A distinct shape/badge icon (downward triangle ▼ and badge outline)
 */
export interface LossGainBadgeProps {
  dollarValue?: number;
  percentValue?: number;
  showDollar?: boolean;
  showPercent?: boolean;
  size?: 'sm' | 'md' | 'lg';
  testId?: string;
  className?: string;
}

export function LossGainBadge({
  dollarValue,
  percentValue,
  showDollar = true,
  showPercent = true,
  size = 'md',
  testId,
  className = '',
}: LossGainBadgeProps) {
  const isDollarProvided = dollarValue !== undefined && !isNaN(dollarValue);
  const isPercentProvided = percentValue !== undefined && !isNaN(percentValue);

  const dVal = isDollarProvided ? dollarValue : 0;
  const pVal = isPercentProvided ? percentValue : 0;

  const isLoss = isDollarProvided ? dVal < -0.0001 : pVal < -0.0001;
  const isGain = isDollarProvided ? dVal > 0.0001 : pVal > 0.0001;

  const absDollarStr = formatUSDAbsolute(dVal);
  const absPctStr = Math.abs(pVal).toFixed(2);

  // Construct accessible ARIA label
  let ariaLabel = 'Zero change ($0.00)';
  if (isLoss) {
    if (showDollar && showPercent && isDollarProvided && isPercentProvided) {
      ariaLabel = `Loss of ${absDollarStr} (-${absPctStr}%)`;
    } else if (showPercent && !showDollar) {
      ariaLabel = `Loss of ${absPctStr}%`;
    } else {
      ariaLabel = `Loss of ${absDollarStr}`;
    }
  } else if (isGain) {
    if (showDollar && showPercent && isDollarProvided && isPercentProvided) {
      ariaLabel = `Gain of ${absDollarStr} (+${absPctStr}%)`;
    } else if (showPercent && !showDollar) {
      ariaLabel = `Gain of ${absPctStr}%`;
    } else {
      ariaLabel = `Gain of ${absDollarStr}`;
    }
  }

  // Size styling
  const sizeClasses =
    size === 'sm'
      ? 'px-1.5 py-0.5 text-xs'
      : size === 'lg'
      ? 'px-3 py-1.5 text-sm font-semibold'
      : 'px-2 py-0.5 text-xs font-semibold';

  if (isLoss) {
    return (
      <span
        data-testid={testId || 'loss-indicator'}
        role="status"
        aria-label={ariaLabel}
        className={`inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 text-rose-800 ${sizeClasses} ${className}`}
      >
        <span aria-hidden="true" className="font-bold text-rose-700">▼</span>
        <span className="font-bold uppercase tracking-wider text-[10px] text-rose-900 bg-rose-200/60 px-1 rounded">Loss</span>
        <span className="font-mono">
          {showDollar && `-${absDollarStr}`}
          {showDollar && showPercent && isPercentProvided && ` `}
          {showPercent && isPercentProvided && `(-${absPctStr}%)`}
          {!showDollar && showPercent && isPercentProvided && `-${absPctStr}%`}
        </span>
      </span>
    );
  }

  if (isGain) {
    return (
      <span
        data-testid={testId || 'gain-indicator'}
        role="status"
        aria-label={ariaLabel}
        className={`inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800 ${sizeClasses} ${className}`}
      >
        <span aria-hidden="true" className="font-bold text-emerald-700">▲</span>
        <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-900 bg-emerald-200/60 px-1 rounded">Gain</span>
        <span className="font-mono">
          {showDollar && `+${absDollarStr}`}
          {showDollar && showPercent && isPercentProvided && ` `}
          {showPercent && isPercentProvided && `(+${absPctStr}%)`}
          {!showDollar && showPercent && isPercentProvided && `+${absPctStr}%`}
        </span>
      </span>
    );
  }

  // Neutral / Zero
  return (
    <span
      data-testid={testId || 'neutral-indicator'}
      role="status"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 text-slate-700 ${sizeClasses} ${className}`}
    >
      <span aria-hidden="true" className="text-slate-400">■</span>
      <span className="font-mono">
        {showDollar && '$0.00'}
        {showDollar && showPercent && isPercentProvided && ` `}
        {showPercent && isPercentProvided && '(0.00%)'}
        {!showDollar && showPercent && '0.00%'}
      </span>
    </span>
  );
}

export function PortfolioView({
  portfolio,
  performance,
  simulation,
  currentSession,
  allSessions,
  initialCash: initialCashProp,
  equityCurve: equityCurveProp,
  positions: positionsProp,
  cash: cashProp,
  realizedPnl: realizedPnlProp,
  unrealizedPnl: unrealizedPnlProp,
  totalEquity: totalEquityProp,
  isLoading = false,
  className = '',
}: PortfolioViewProps) {
  // State for interactive tooltip & table toggle
  const [activePoint, setActivePoint] = useState<{ session_date: string; total_equity: number } | null>(null);
  const [showTable, setShowTable] = useState<boolean>(false);

  // 1. Resolve effective current session cursor
  const effectiveCurrentSession = useMemo(() => {
    if (currentSession) return currentSession;
    if (portfolio?.as_of_session) return portfolio.as_of_session;
    if (simulation?.current_session) return simulation.current_session;
    return '2024-01-02';
  }, [currentSession, portfolio?.as_of_session, simulation?.current_session]);

  // Hidden future sessions count if full universe is passed
  const futureSessionsCount = useMemo(() => {
    if (!allSessions) return 0;
    return allSessions.filter((s) => s > effectiveCurrentSession).length;
  }, [allSessions, effectiveCurrentSession]);

  // 2. Resolve initial cash
  const effectiveInitialCash = useMemo(() => {
    if (initialCashProp !== undefined) return parseAmount(initialCashProp, 1000);
    if (performance?.initial_cash !== undefined) return parseAmount(performance.initial_cash, 1000);
    if (simulation?.initial_cash !== undefined) {
      const val = simulation.initial_cash;
      return val > 100_000 ? val / 100 : val;
    }
    return 1000;
  }, [initialCashProp, performance?.initial_cash, simulation?.initial_cash]);

  // 3. Resolve positions
  const effectivePositions: Position[] = useMemo(() => {
    if (positionsProp) return positionsProp;
    if (portfolio?.positions) return portfolio.positions;
    return [];
  }, [positionsProp, portfolio?.positions]);

  // 4. Resolve cash balance
  const effectiveCash = useMemo(() => {
    if (cashProp !== undefined) return parseAmount(cashProp, 0);
    if (portfolio?.cash !== undefined) return parseAmount(portfolio.cash, 0);
    return effectiveInitialCash;
  }, [cashProp, portfolio?.cash, effectiveInitialCash]);

  // 5. Total positions market value
  const totalPositionsMarketValue = useMemo(() => {
    return effectivePositions.reduce((acc, pos) => {
      const shares = pos.quantity || 0;
      const mktPrice = parseAmount(pos.market_price, 0);
      const mktVal = parseAmount(pos.market_value, shares * mktPrice);
      return acc + mktVal;
    }, 0);
  }, [effectivePositions]);

  // 6. Total Equity
  const effectiveTotalEquity = useMemo(() => {
    if (totalEquityProp !== undefined) return parseAmount(totalEquityProp, 0);
    if (portfolio?.total_equity !== undefined) return parseAmount(portfolio.total_equity, 0);
    return effectiveCash + totalPositionsMarketValue;
  }, [totalEquityProp, portfolio?.total_equity, effectiveCash, totalPositionsMarketValue]);

  // 7. Realized & Unrealized P&L
  const effectiveRealizedPnl = useMemo(() => {
    if (realizedPnlProp !== undefined) return parseAmount(realizedPnlProp, 0);
    if (portfolio?.realized_pnl !== undefined) return parseAmount(portfolio.realized_pnl, 0);
    return 0;
  }, [realizedPnlProp, portfolio?.realized_pnl]);

  const effectiveUnrealizedPnl = useMemo(() => {
    if (unrealizedPnlProp !== undefined) return parseAmount(unrealizedPnlProp, 0);
    if (portfolio?.unrealized_pnl !== undefined) return parseAmount(portfolio.unrealized_pnl, 0);
    return effectivePositions.reduce((acc, pos) => {
      const costBasis = parseAmount(pos.cost_basis, 0);
      const mktPrice = parseAmount(pos.market_price, 0);
      const shares = pos.quantity || 0;
      const totalCost = shares * costBasis;
      const mktVal = parseAmount(pos.market_value, shares * mktPrice);
      const pnl = parseAmount(pos.unrealized_pnl, mktVal - totalCost);
      return acc + pnl;
    }, 0);
  }, [unrealizedPnlProp, portfolio?.unrealized_pnl, effectivePositions]);

  // 8. Total Return %
  const totalReturnPercent = useMemo(() => {
    if (performance?.total_return_pct !== undefined) {
      return parseAmount(performance.total_return_pct, 0);
    }
    if (effectiveInitialCash > 0) {
      return ((effectiveTotalEquity - effectiveInitialCash) / effectiveInitialCash) * 100;
    }
    return 0;
  }, [performance?.total_return_pct, effectiveTotalEquity, effectiveInitialCash]);

  // 9. Equity Curve — STRICT GUARANTEE: Does not render any future sessions.
  const rawEquityCurve: EquityPoint[] = useMemo(() => {
    if (equityCurveProp) return equityCurveProp;
    if (performance?.equity_curve && performance.equity_curve.length > 0) {
      return performance.equity_curve;
    }
    return [{ session_date: effectiveCurrentSession, total_equity: effectiveTotalEquity.toString() }];
  }, [equityCurveProp, performance?.equity_curve, effectiveCurrentSession, effectiveTotalEquity]);

  const visitedEquityPoints = useMemo(() => {
    return filterVisitedEquityPoints(rawEquityCurve, effectiveCurrentSession);
  }, [rawEquityCurve, effectiveCurrentSession]);

  // 10. Performance Statistics
  const perfStats = useMemo(() => {
    return calculatePerformanceStats(
      visitedEquityPoints,
      effectiveInitialCash,
      effectiveRealizedPnl
    );
  }, [visitedEquityPoints, effectiveInitialCash, effectiveRealizedPnl]);

  // 11. Calculated Positions Table Rows
  const positionRows = useMemo(() => {
    return calculatePositionRows(effectivePositions, effectiveTotalEquity);
  }, [effectivePositions, effectiveTotalEquity]);

  // SVG Chart Geometry Calculations
  const SVG_WIDTH = 640;
  const SVG_HEIGHT = 240;
  const MARGIN = { top: 25, right: 35, bottom: 40, left: 65 };
  const chartWidth = SVG_WIDTH - MARGIN.left - MARGIN.right;
  const chartHeight = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

  const chartPointsData = useMemo(() => {
    if (visitedEquityPoints.length === 0) {
      return {
        pointsWithCoords: [],
        minY: effectiveInitialCash,
        maxY: effectiveInitialCash,
        baselineY: MARGIN.top + chartHeight / 2,
        svgPath: '',
        areaPath: '',
      };
    }

    const allValues = [effectiveInitialCash, ...visitedEquityPoints.map((p) => p.total_equity)];
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const delta = rawMax - rawMin;
    const padding = delta === 0 ? Math.max(rawMax * 0.05, 10) : delta * 0.15;
    const domainMin = Math.max(0, rawMin - padding);
    const domainMax = rawMax + padding;
    const domainRange = domainMax - domainMin || 1;

    const getY = (val: number) => {
      const ratio = (val - domainMin) / domainRange;
      return MARGIN.top + (1 - ratio) * chartHeight;
    };

    const getX = (idx: number) => {
      if (visitedEquityPoints.length <= 1) {
        return MARGIN.left + chartWidth / 2;
      }
      return MARGIN.left + (idx / (visitedEquityPoints.length - 1)) * chartWidth;
    };

    const pointsWithCoords = visitedEquityPoints.map((pt, idx) => ({
      ...pt,
      x: getX(idx),
      y: getY(pt.total_equity),
    }));

    // Build SVG Path
    let svgPath = '';
    let areaPath = '';
    if (pointsWithCoords.length === 1) {
      const p = pointsWithCoords[0];
      svgPath = `M ${MARGIN.left} ${p.y} L ${MARGIN.left + chartWidth} ${p.y}`;
      areaPath = `M ${MARGIN.left} ${p.y} L ${MARGIN.left + chartWidth} ${p.y} L ${MARGIN.left + chartWidth} ${MARGIN.top + chartHeight} L ${MARGIN.left} ${MARGIN.top + chartHeight} Z`;
    } else if (pointsWithCoords.length > 1) {
      svgPath = pointsWithCoords.reduce((acc, curr, idx) => {
        return `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`;
      }, '');
      const first = pointsWithCoords[0];
      const last = pointsWithCoords[pointsWithCoords.length - 1];
      const bottomY = MARGIN.top + chartHeight;
      areaPath = `${svgPath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
    }

    const baselineY = getY(effectiveInitialCash);

    return {
      pointsWithCoords,
      minY: domainMin,
      maxY: domainMax,
      baselineY,
      svgPath,
      areaPath,
    };
  }, [visitedEquityPoints, effectiveInitialCash, chartWidth, chartHeight]);

  // Handle Loading Skeleton State
  if (isLoading) {
    return (
      <div className={`p-12 text-center bg-white border border-slate-200 rounded-xl ${className}`} data-testid="portfolio-loading">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        <p className="text-sm font-medium text-slate-600 mt-3">Loading portfolio metrics &amp; equity history...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`} data-testid="portfolio-view">
      {/* Portfolio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Portfolio &amp; Performance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time equity tracking, historical curve, and transparent loss-accessible analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          {futureSessionsCount > 0 && (
            <span
              data-testid="future-sessions-hidden-badge"
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
            >
              {futureSessionsCount} future session{futureSessionsCount === 1 ? '' : 's'} hidden
            </span>
          )}
          <span
            data-testid="session-cursor-badge"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200"
          >
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Session: {effectiveCurrentSession}</span>
          </span>
        </div>
      </div>

      {/* 1. Portfolio Hero Metrics Grid */}
      <section aria-labelledby="hero-metrics-title" data-testid="hero-metrics-grid">
        <h3 id="hero-metrics-title" className="sr-only">Portfolio Hero Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Total Equity */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block">Total Equity</span>
            <span data-testid="metric-total-equity" className="text-lg font-bold text-slate-900 block mt-1">
              {formatUSD(effectiveTotalEquity)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Net portfolio liquidation</span>
          </div>

          {/* 2. Total Return % */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block">Total Return %</span>
            <div className="mt-1" data-testid="metric-total-return">
              <LossGainBadge
                percentValue={totalReturnPercent}
                dollarValue={effectiveTotalEquity - effectiveInitialCash}
                showDollar={false}
                size="md"
                testId="hero-return-badge"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Since session start</span>
          </div>

          {/* 3. Cash Balance */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block">Cash Balance</span>
            <span data-testid="metric-cash-balance" className="text-lg font-bold text-slate-900 block mt-1">
              {formatUSD(effectiveCash)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Liquid purchasing power</span>
          </div>

          {/* 4. Total Positions Market Value */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block">Positions Market Value</span>
            <span data-testid="metric-positions-value" className="text-lg font-bold text-slate-900 block mt-1">
              {formatUSD(totalPositionsMarketValue)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {effectivePositions.length} active position{effectivePositions.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* 5. Realized P&L */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block">Realized P&L</span>
            <div className="mt-1" data-testid="metric-realized-pnl">
              <LossGainBadge
                dollarValue={effectiveRealizedPnl}
                percentValue={effectiveInitialCash > 0 ? (effectiveRealizedPnl / effectiveInitialCash) * 100 : 0}
                size="md"
                testId="hero-realized-pnl-badge"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">From closed orders</span>
          </div>

          {/* 6. Unrealized P&L */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block">Unrealized P&L</span>
            <div className="mt-1" data-testid="metric-unrealized-pnl">
              <LossGainBadge
                dollarValue={effectiveUnrealizedPnl}
                percentValue={
                  totalPositionsMarketValue - effectiveUnrealizedPnl > 0
                    ? (effectiveUnrealizedPnl / (totalPositionsMarketValue - effectiveUnrealizedPnl)) * 100
                    : effectiveInitialCash > 0
                    ? (effectiveUnrealizedPnl / effectiveInitialCash) * 100
                    : 0
                }
                size="md"
                testId="hero-unrealized-pnl-badge"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Open positions float</span>
          </div>
        </div>
      </section>

      {/* 2. Interactive SVG Equity Curve Chart */}
      <Card
        title="Equity Curve Over Time"
        subtitle="Tracking net portfolio liquidation value against starting capital baseline"
        data-testid="equity-curve-card"
      >
        <div className="relative">
          {/* Active Hover Tooltip */}
          {activePoint && (
            <div
              data-testid="equity-tooltip"
              role="tooltip"
              className="absolute top-2 right-4 bg-slate-900 text-white text-xs rounded-lg shadow-xl p-3 z-20 pointer-events-none border border-slate-700 min-w-[200px]"
            >
              <div className="flex items-center justify-between text-slate-300 border-b border-slate-700 pb-1 mb-1.5">
                <span className="font-medium">Session Date</span>
                <span className="font-bold text-white" data-testid="tooltip-session-date">
                  {activePoint.session_date}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Total Equity:</span>
                <span className="font-bold text-white" data-testid="tooltip-total-equity">
                  {formatUSD(activePoint.total_equity)}
                </span>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">vs Baseline:</span>
                <LossGainBadge
                  dollarValue={activePoint.total_equity - effectiveInitialCash}
                  percentValue={
                    effectiveInitialCash > 0
                      ? ((activePoint.total_equity - effectiveInitialCash) / effectiveInitialCash) * 100
                      : 0
                  }
                  size="sm"
                  testId="tooltip-loss-gain-badge"
                />
              </div>
            </div>
          )}

          {/* SVG Chart Container */}
          <div className="w-full overflow-hidden bg-slate-50/60 rounded-lg p-2 border border-slate-100">
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="w-full h-auto max-h-[300px] select-none"
              data-testid="equity-curve-chart"
              role="img"
              aria-label={`Interactive Equity Curve Chart showing ${visitedEquityPoints.length} visited sessions up to ${effectiveCurrentSession}`}
            >
              <defs>
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line
                x1={MARGIN.left}
                y1={MARGIN.top}
                x2={MARGIN.left + chartWidth}
                y2={MARGIN.top}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <line
                x1={MARGIN.left}
                y1={MARGIN.top + chartHeight}
                x2={MARGIN.left + chartWidth}
                y2={MARGIN.top + chartHeight}
                stroke="#cbd5e1"
                strokeWidth="1"
              />

              {/* Baseline Dashed Line (Starting Cash) */}
              <line
                x1={MARGIN.left}
                y1={chartPointsData.baselineY}
                x2={MARGIN.left + chartWidth}
                y2={chartPointsData.baselineY}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                strokeWidth="1.5"
                data-testid="equity-curve-baseline"
              />
              <text
                x={MARGIN.left + 8}
                y={Math.max(chartPointsData.baselineY - 6, MARGIN.top + 10)}
                fill="#64748b"
                fontSize="10"
                fontWeight="600"
              >
                Initial Cash Baseline: {formatUSD(effectiveInitialCash)}
              </text>

              {/* Area Under Curve */}
              {chartPointsData.areaPath && (
                <path d={chartPointsData.areaPath} fill="url(#equityGradient)" />
              )}

              {/* Equity Polyline / Curve */}
              {chartPointsData.svgPath && (
                <path
                  d={chartPointsData.svgPath}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Points (Visited Sessions Only) */}
              {chartPointsData.pointsWithCoords.map((pt) => {
                const isSelected = activePoint?.session_date === pt.session_date;
                return (
                  <g key={pt.session_date}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 6 : 4.5}
                      fill={isSelected ? '#1d4ed8' : '#2563eb'}
                      stroke="#ffffff"
                      strokeWidth={2}
                      tabIndex={0}
                      role="button"
                      aria-label={`Session ${pt.session_date}: ${formatUSD(pt.total_equity)}`}
                      data-testid={`equity-point-${pt.session_date}`}
                      className="cursor-pointer transition-all hover:scale-125 focus:scale-125 focus:outline-none"
                      onMouseEnter={() => setActivePoint(pt)}
                      onMouseLeave={() => setActivePoint(null)}
                      onFocus={() => setActivePoint(pt)}
                      onBlur={() => setActivePoint(null)}
                      onClick={() => setActivePoint(pt)}
                    />
                    {/* Session date label below point */}
                    <text
                      x={pt.x}
                      y={MARGIN.top + chartHeight + 16}
                      fill="#64748b"
                      fontSize="9"
                      textAnchor="middle"
                      className="font-mono"
                    >
                      {pt.session_date.slice(5)}
                    </text>
                  </g>
                );
              })}

              {/* Axis Boundaries */}
              <text
                x={MARGIN.left - 8}
                y={MARGIN.top + 4}
                fill="#94a3b8"
                fontSize="9"
                textAnchor="end"
                className="font-mono"
              >
                {formatUSD(chartPointsData.maxY)}
              </text>
              <text
                x={MARGIN.left - 8}
                y={MARGIN.top + chartHeight + 3}
                fill="#94a3b8"
                fontSize="9"
                textAnchor="end"
                className="font-mono"
              >
                {formatUSD(chartPointsData.minY)}
              </text>
            </svg>
          </div>

          {/* Accessible Table Alternative Toggle */}
          <div className="flex items-center justify-between mt-3 px-1">
            <span className="text-xs text-slate-500">
              Plotting {visitedEquityPoints.length} visited session{visitedEquityPoints.length === 1 ? '' : 's'} (Strict historical guarantee).
            </span>
            <button
              type="button"
              onClick={() => setShowTable((prev) => !prev)}
              aria-expanded={showTable}
              aria-controls="equity-curve-table-section"
              data-testid="toggle-equity-table-btn"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1.5 py-0.5"
            >
              {showTable ? 'Hide Equity Curve Table' : 'View Equity Curve Table'}
            </button>
          </div>

          {/* Accessible Table Alternative for Screen Readers & Tabular View */}
          {showTable && (
            <div
              id="equity-curve-table-section"
              data-testid="equity-curve-table-container"
              className="mt-3 pt-3 border-t border-slate-200 overflow-x-auto"
            >
              <table
                className="min-w-full text-xs text-left border border-slate-200 divide-y divide-slate-200 rounded-lg overflow-hidden"
                data-testid="equity-curve-table"
                aria-label="Equity Curve Data Table"
              >
                <caption className="sr-only">Detailed Historical Equity Curve by Session</caption>
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                  <tr>
                    <th scope="col" className="px-3 py-2">Session Date</th>
                    <th scope="col" className="px-3 py-2">Total Equity</th>
                    <th scope="col" className="px-3 py-2">Baseline Cash</th>
                    <th scope="col" className="px-3 py-2">Change vs Baseline</th>
                    <th scope="col" className="px-3 py-2">Return %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {visitedEquityPoints.map((pt) => {
                    const diff = pt.total_equity - effectiveInitialCash;
                    const pct =
                      effectiveInitialCash > 0
                        ? (diff / effectiveInitialCash) * 100
                        : 0;
                    return (
                      <tr
                        key={pt.session_date}
                        data-testid={`equity-table-row-${pt.session_date}`}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-3 py-2 font-mono font-medium text-slate-900">
                          {pt.session_date}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-900">
                          {formatUSD(pt.total_equity)}
                        </td>
                        <td className="px-3 py-2 text-slate-500 font-mono">
                          {formatUSD(effectiveInitialCash)}
                        </td>
                        <td className="px-3 py-2">
                          <LossGainBadge
                            dollarValue={diff}
                            percentValue={pct}
                            showPercent={false}
                            size="sm"
                            testId={`table-diff-${pt.session_date}`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <LossGainBadge
                            percentValue={pct}
                            showDollar={false}
                            size="sm"
                            testId={`table-return-${pt.session_date}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* 3. Current Positions Table */}
      <Card
        title="Current Positions"
        subtitle="Active equity holdings evaluated at current session closing prices"
        data-testid="positions-card"
      >
        {positionRows.length === 0 ? (
          /* Educational Empty State */
          <div
            data-testid="empty-positions-notice"
            className="text-center py-10 px-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/70"
          >
            <div className="w-12 h-12 mx-auto mb-3 text-slate-400 flex items-center justify-center rounded-full bg-slate-100 border border-slate-200">
              <span className="text-xl" aria-hidden="true">💼</span>
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              No Active Positions. Virtual cash is 100% liquid.
            </h4>
            <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
              Your portfolio is currently 100% in virtual cash. You have no market risk and no active stock holdings.
              Visit the Paper Trading view to submit buy orders for AAPL, MSFT, or SPY.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              data-testid="positions-table"
              className="min-w-full text-xs text-left border border-slate-200 divide-y divide-slate-200 rounded-lg overflow-hidden"
              aria-label="Current Positions Portfolio Table"
            >
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="px-3.5 py-2.5">Symbol</th>
                  <th scope="col" className="px-3.5 py-2.5">Shares Held</th>
                  <th scope="col" className="px-3.5 py-2.5">Avg Cost Basis</th>
                  <th scope="col" className="px-3.5 py-2.5">Market Price</th>
                  <th scope="col" className="px-3.5 py-2.5">Total Cost</th>
                  <th scope="col" className="px-3.5 py-2.5">Market Value</th>
                  <th scope="col" className="px-3.5 py-2.5">Unrealized P&amp;L ($ and %)</th>
                  <th scope="col" className="px-3.5 py-2.5">Weight %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {positionRows.map((row) => (
                  <tr
                    key={row.symbol}
                    data-testid={`position-row-${row.symbol}`}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-3.5 py-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span data-testid={`pos-symbol-${row.symbol}`}>{row.symbol}</span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-slate-700" data-testid={`pos-shares-${row.symbol}`}>
                      {row.shares.toLocaleString()}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-slate-600" data-testid={`pos-cost-basis-${row.symbol}`}>
                      {formatUSD(row.avgCostBasis)}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono font-medium text-slate-900" data-testid={`pos-market-price-${row.symbol}`}>
                      {formatUSD(row.currentPrice)}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-slate-600" data-testid={`pos-total-cost-${row.symbol}`}>
                      {formatUSD(row.totalCost)}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-900" data-testid={`pos-market-value-${row.symbol}`}>
                      {formatUSD(row.marketValue)}
                    </td>
                    <td className="px-3.5 py-2.5" data-testid={`pos-unrealized-pnl-${row.symbol}`}>
                      <LossGainBadge
                        dollarValue={row.unrealizedPnlDollar}
                        percentValue={row.unrealizedPnlPercent}
                        size="sm"
                        testId={`pos-pnl-badge-${row.symbol}`}
                      />
                    </td>
                    <td className="px-3.5 py-2.5 font-mono font-medium text-slate-700" data-testid={`pos-weight-${row.symbol}`}>
                      {row.weightPercent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 4. Realized Gain/Loss Summary and Performance Statistics */}
      <Card
        title="Performance Statistics &amp; Realized P&amp;L Summary"
        subtitle="Long-term historical metrics across all visited simulation sessions"
        data-testid="perf-stats-card"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Initial Cash */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-xs font-medium text-slate-500 block">Initial Cash</span>
            <span data-testid="perf-initial-cash" className="text-base font-bold text-slate-900 block mt-1">
              {formatUSD(perfStats.initialCash)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Starting simulation balance</span>
          </div>

          {/* Visited Sessions Count */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-xs font-medium text-slate-500 block">Visited Sessions</span>
            <span data-testid="perf-visited-sessions" className="text-base font-bold text-slate-900 block mt-1">
              {perfStats.visitedSessionsCount}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Up to {effectiveCurrentSession}</span>
          </div>

          {/* Peak Equity */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-xs font-medium text-slate-500 block">Peak Equity</span>
            <span data-testid="perf-peak-equity" className="text-base font-bold text-emerald-700 block mt-1">
              {formatUSD(perfStats.peakEquity)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Highest historical watermark</span>
          </div>

          {/* Low Equity */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-xs font-medium text-slate-500 block">Low Equity</span>
            <span data-testid="perf-low-equity" className="text-base font-bold text-slate-700 block mt-1">
              {formatUSD(perfStats.lowEquity)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Trough equity level</span>
          </div>
        </div>

        {/* Realized P&L Detail Banner */}
        <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Realized Gain/Loss Summary</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Net gains or losses permanently realized from executed sell transactions.
            </p>
          </div>
          <div className="flex items-center gap-2" data-testid="perf-realized-pnl">
            <LossGainBadge
              dollarValue={perfStats.realizedPnl}
              percentValue={perfStats.realizedPnlPercent}
              size="md"
              testId="perf-realized-badge"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

export default PortfolioView;

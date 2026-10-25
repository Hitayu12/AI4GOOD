import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PortfolioView } from './PortfolioView';
import { Position } from './portfolioTypes';

describe('PortfolioView Component — Portfolio & Performance View', () => {
  // Test 1: Portfolio metrics (Equity, Cash, P&L, Return %) render accurately
  it('1. verifies portfolio metrics (Equity, Cash, P&L, Return %) render accurately', () => {
    const mockPositions: Position[] = [
      {
        symbol: 'AAPL',
        quantity: 1,
        cost_basis: '200.00',
        market_price: '220.00',
        market_value: '220.00',
        unrealized_pnl: '20.00',
      },
    ];

    render(
      <PortfolioView
        initialCash={1000}
        cash="800.00"
        totalEquity="1020.00"
        realizedPnl="0.00"
        unrealizedPnl="20.00"
        positions={mockPositions}
        currentSession="2024-01-03"
      />
    );

    // Total Equity
    const totalEquityElem = screen.getByTestId('metric-total-equity');
    expect(totalEquityElem).toHaveTextContent('$1,020.00');

    // Total Return % (+2.00% on $1,000 initial cash)
    const returnMetric = screen.getByTestId('metric-total-return');
    expect(returnMetric).toHaveTextContent('+2.00%');

    // Cash Balance
    const cashElem = screen.getByTestId('metric-cash-balance');
    expect(cashElem).toHaveTextContent('$800.00');

    // Positions Market Value
    const posValueElem = screen.getByTestId('metric-positions-value');
    expect(posValueElem).toHaveTextContent('$220.00');

    // Realized P&L
    const realizedElem = screen.getByTestId('metric-realized-pnl');
    expect(realizedElem).toHaveTextContent('$0.00');

    // Unrealized P&L
    const unrealizedElem = screen.getByTestId('metric-unrealized-pnl');
    expect(unrealizedElem).toHaveTextContent('+$20.00');
  });

  // Test 2: Non-color loss indicator: Negative P&L renders explicit minus sign, "Loss" text label, and aria-label
  it('2. non-color loss indicator: negative P&L renders explicit minus sign, "Loss" text label, and aria-label', () => {
    const losingPositions: Position[] = [
      {
        symbol: 'MSFT',
        quantity: 2,
        cost_basis: '100.00',
        market_price: '95.00',
        market_value: '190.00',
        unrealized_pnl: '-10.00',
      },
    ];

    render(
      <PortfolioView
        initialCash={1000}
        cash="790.00"
        totalEquity="980.00"
        realizedPnl="-10.00"
        unrealizedPnl="-10.00"
        positions={losingPositions}
        currentSession="2024-01-03"
      />
    );

    // 1. Verify Hero Total Return loss badge
    const returnMetric = screen.getByTestId('metric-total-return');
    expect(returnMetric).toHaveTextContent('Loss');
    expect(returnMetric).toHaveTextContent('▼');
    expect(returnMetric).toHaveTextContent('-2.00%');

    // 2. Verify Hero Realized P&L loss badge with ARIA label
    const realizedMetric = screen.getByTestId('metric-realized-pnl');
    const realizedBadge = realizedMetric.querySelector('[role="status"]');
    expect(realizedBadge).toBeInTheDocument();
    expect(realizedBadge).toHaveAttribute('aria-label', expect.stringContaining('Loss of $10.00'));
    expect(realizedBadge).toHaveTextContent('▼');
    expect(realizedBadge).toHaveTextContent('Loss');
    expect(realizedBadge).toHaveTextContent('-$10.00');

    // 3. Verify Positions Table losing row has explicit minus, Loss label, and aria-label
    const posRow = screen.getByTestId('position-row-MSFT');
    expect(posRow).toBeInTheDocument();
    const posPnlCell = screen.getByTestId('pos-unrealized-pnl-MSFT');
    const posPnlBadge = posPnlCell.querySelector('[role="status"]');
    expect(posPnlBadge).toBeInTheDocument();
    expect(posPnlBadge).toHaveAttribute(
      'aria-label',
      expect.stringMatching(/Loss of \$10\.00 \(-5\.00%\)/)
    );
    expect(posPnlBadge).toHaveTextContent('▼');
    expect(posPnlBadge).toHaveTextContent('Loss');
    expect(posPnlBadge).toHaveTextContent('-$10.00');
    expect(posPnlBadge).toHaveTextContent('-5.00%');
  });

  // Test 3: Equity curve renders only visited sessions up to the current session cursor
  it('3. equity curve renders strictly only visited sessions up to current session cursor', () => {
    const rawCurve = [
      { session_date: '2024-01-02', total_equity: '1000.00' },
      { session_date: '2024-01-03', total_equity: '1020.00' },
      { session_date: '2024-01-04', total_equity: '1050.00' }, // Future session
      { session_date: '2024-01-05', total_equity: '1100.00' }, // Future session
    ];

    render(
      <PortfolioView
        initialCash={1000}
        currentSession="2024-01-03"
        equityCurve={rawCurve}
      />
    );

    // Visited points MUST be present
    expect(screen.getByTestId('equity-point-2024-01-02')).toBeInTheDocument();
    expect(screen.getByTestId('equity-point-2024-01-03')).toBeInTheDocument();

    // Future points MUST NOT be present
    expect(screen.queryByTestId('equity-point-2024-01-04')).toBeNull();
    expect(screen.queryByTestId('equity-point-2024-01-05')).toBeNull();

    // Baseline line representing starting cash MUST be rendered
    expect(screen.getByTestId('equity-curve-baseline')).toBeInTheDocument();

    // Session badge
    expect(screen.getByTestId('session-cursor-badge')).toHaveTextContent('Session: 2024-01-03');
  });

  // Test 4: Tabular view alternative renders equity data for screen readers
  it('4. tabular view alternative renders equity data for screen readers', () => {
    const rawCurve = [
      { session_date: '2024-01-02', total_equity: '1000.00' },
      { session_date: '2024-01-03', total_equity: '1020.00' },
      { session_date: '2024-01-04', total_equity: '1050.00' }, // Future
    ];

    render(
      <PortfolioView
        initialCash={1000}
        currentSession="2024-01-03"
        equityCurve={rawCurve}
      />
    );

    // Toggle button exists
    const toggleBtn = screen.getByTestId('toggle-equity-table-btn');
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent('View Equity Curve Table');

    // Click to expand table
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent('Hide Equity Curve Table');

    // Accessible table is now rendered
    const table = screen.getByTestId('equity-curve-table');
    expect(table).toBeInTheDocument();
    expect(table).toHaveAttribute('aria-label', 'Equity Curve Data Table');

    // Renders visited session rows with proper data
    const row1 = screen.getByTestId('equity-table-row-2024-01-02');
    expect(row1).toHaveTextContent('2024-01-02');
    expect(row1).toHaveTextContent('$1,000.00');

    const row2 = screen.getByTestId('equity-table-row-2024-01-03');
    expect(row2).toHaveTextContent('2024-01-03');
    expect(row2).toHaveTextContent('$1,020.00');

    // Future session MUST NOT be in the table
    expect(screen.queryByTestId('equity-table-row-2024-01-04')).toBeNull();
  });

  // Test 5: Positions table displays held assets with correct weights and P&L
  it('5. positions table displays held assets with correct weights, cost basis, and P&L', () => {
    const positions: Position[] = [
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
        market_price: '390.00',
        market_value: '1950.00',
        unrealized_pnl: '-50.00',
      },
    ];

    // Total positions market value: 1850 + 1950 = 3800
    // Cash: 1200 => Total Equity: 5000.00
    // AAPL weight: 1850 / 5000 = 37.00%
    // MSFT weight: 1950 / 5000 = 39.00%
    render(
      <PortfolioView
        initialCash={5000}
        cash="1200.00"
        totalEquity="5000.00"
        positions={positions}
      />
    );

    expect(screen.getByTestId('positions-table')).toBeInTheDocument();

    // AAPL Row checks
    expect(screen.getByTestId('pos-symbol-AAPL')).toHaveTextContent('AAPL');
    expect(screen.getByTestId('pos-shares-AAPL')).toHaveTextContent('10');
    expect(screen.getByTestId('pos-cost-basis-AAPL')).toHaveTextContent('$180.00');
    expect(screen.getByTestId('pos-market-price-AAPL')).toHaveTextContent('$185.00');
    expect(screen.getByTestId('pos-total-cost-AAPL')).toHaveTextContent('$1,800.00');
    expect(screen.getByTestId('pos-market-value-AAPL')).toHaveTextContent('$1,850.00');
    expect(screen.getByTestId('pos-weight-AAPL')).toHaveTextContent('37.00%');
    expect(screen.getByTestId('pos-unrealized-pnl-AAPL')).toHaveTextContent('+$50.00');

    // MSFT Row checks (loss row with non-color indicator)
    expect(screen.getByTestId('pos-symbol-MSFT')).toHaveTextContent('MSFT');
    expect(screen.getByTestId('pos-shares-MSFT')).toHaveTextContent('5');
    expect(screen.getByTestId('pos-cost-basis-MSFT')).toHaveTextContent('$400.00');
    expect(screen.getByTestId('pos-market-price-MSFT')).toHaveTextContent('$390.00');
    expect(screen.getByTestId('pos-total-cost-MSFT')).toHaveTextContent('$2,000.00');
    expect(screen.getByTestId('pos-market-value-MSFT')).toHaveTextContent('$1,950.00');
    expect(screen.getByTestId('pos-weight-MSFT')).toHaveTextContent('39.00%');
    
    // MSFT loss badge
    const msftPnlCell = screen.getByTestId('pos-unrealized-pnl-MSFT');
    expect(msftPnlCell).toHaveTextContent('Loss');
    expect(msftPnlCell).toHaveTextContent('▼');
    expect(msftPnlCell).toHaveTextContent('-$50.00');
    expect(msftPnlCell).toHaveTextContent('-2.50%');
  });

  // Test 6: Empty positions state renders appropriately when 0 positions are held
  it('6. empty positions state renders appropriately when 0 positions are held', () => {
    render(
      <PortfolioView
        initialCash={1000}
        cash="1000.00"
        positions={[]}
      />
    );

    const emptyNotice = screen.getByTestId('empty-positions-notice');
    expect(emptyNotice).toBeInTheDocument();
    expect(emptyNotice).toHaveTextContent('No Active Positions. Virtual cash is 100% liquid.');

    // Positions table should not be in document
    expect(screen.queryByTestId('positions-table')).toBeNull();
  });

  // Test 7: Performance statistics & Realized P&L Summary render accurately
  it('7. performance statistics (Initial Cash, Visited Sessions count, Peak Equity, Low Equity) render accurately', () => {
    const curve = [
      { session_date: '2024-01-02', total_equity: '1000.00' },
      { session_date: '2024-01-03', total_equity: '1050.00' },
      { session_date: '2024-01-04', total_equity: '980.00' },
    ];

    render(
      <PortfolioView
        initialCash={1000}
        currentSession="2024-01-04"
        equityCurve={curve}
        realizedPnl="25.00"
      />
    );

    // Initial Cash
    expect(screen.getByTestId('perf-initial-cash')).toHaveTextContent('$1,000.00');

    // Visited Sessions count
    expect(screen.getByTestId('perf-visited-sessions')).toHaveTextContent('3');

    // Peak Equity ($1,050.00)
    expect(screen.getByTestId('perf-peak-equity')).toHaveTextContent('$1,050.00');

    // Low Equity ($980.00)
    expect(screen.getByTestId('perf-low-equity')).toHaveTextContent('$980.00');

    // Realized Gain/Loss Summary
    const perfRealized = screen.getByTestId('perf-realized-pnl');
    expect(perfRealized).toHaveTextContent('+$25.00');
  });

  // Test 8: Interactive tooltip displays session date and equity upon hover/focus
  it('8. interactive SVG equity curve point hover activates tooltip with session date and equity', () => {
    const curve = [
      { session_date: '2024-01-02', total_equity: '1000.00' },
      { session_date: '2024-01-03', total_equity: '1040.00' },
    ];

    render(
      <PortfolioView
        initialCash={1000}
        currentSession="2024-01-03"
        equityCurve={curve}
      />
    );

    // Initially tooltip is not visible
    expect(screen.queryByTestId('equity-tooltip')).toBeNull();

    // Hover over point for 2024-01-03
    const point = screen.getByTestId('equity-point-2024-01-03');
    fireEvent.mouseEnter(point);

    // Tooltip should now be visible with date and equity
    const tooltip = screen.getByTestId('equity-tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(screen.getByTestId('tooltip-session-date')).toHaveTextContent('2024-01-03');
    expect(screen.getByTestId('tooltip-total-equity')).toHaveTextContent('$1,040.00');

    // Mouse leave dismisses tooltip
    fireEvent.mouseLeave(point);
    expect(screen.queryByTestId('equity-tooltip')).toBeNull();
  });
});

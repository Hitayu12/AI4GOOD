import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TradingView } from './TradingView';
import { MarketDataBar, Position } from './tradingTypes';

describe('TradingView Component — Paper Trading Interface', () => {
  // Test 1: Renders order entry form, cash balance, and positions
  it('1. renders order entry form, cash balance, and positions', () => {
    const initialPositions: Position[] = [
      {
        symbol: 'AAPL',
        quantity: 10,
        cost_basis: '180.000000',
        market_price: '184.530000',
        market_value: '1845.30',
        unrealized_pnl: '45.30',
      },
    ];

    render(
      <TradingView
        initialCash={10_000}
        initialPositions={initialPositions}
      />
    );

    // Form controls
    expect(screen.getByTestId('order-entry-form')).toBeInTheDocument();
    expect(screen.getByTestId('symbol-select')).toBeInTheDocument();
    expect(screen.getByTestId('side-toggle-buy')).toBeInTheDocument();
    expect(screen.getByTestId('side-toggle-sell')).toBeInTheDocument();
    expect(screen.getByTestId('quantity-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-order-btn')).toBeInTheDocument();

    // Cash and Portfolio Metrics
    expect(screen.getByTestId('cash-balance')).toHaveTextContent('$10,000.00');
    expect(screen.getByTestId('total-equity')).toHaveTextContent('$11,845.30');
    expect(screen.getByTestId('portfolio-unrealized-pnl')).toHaveTextContent('+$45.30');

    // Holdings Table
    expect(screen.getByTestId('holdings-table')).toBeInTheDocument();
    expect(screen.getByTestId('holding-row-AAPL')).toBeInTheDocument();
    expect(screen.getByTestId('holding-row-AAPL')).toHaveTextContent('10');
    expect(screen.getByTestId('holding-row-AAPL')).toHaveTextContent('$180.00');

    // Prominent Educational Notice
    const notice = screen.getByTestId('educational-notice');
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveTextContent(
      "Submitted orders are queued in 'pending' status and execute at the NEXT session's OPEN price after advancing. If opening price gaps higher than available cash, the order is rejected without changing cash or positions. The UI never displays future execution prices."
    );
  });

  // Test 2: Placing an order transitions state to "pending" with null execution price
  it('2. placing an order transitions state to "pending" with null execution price', async () => {
    const onOrderPlaced = vi.fn();
    render(
      <TradingView
        initialCash={10_000}
        onOrderPlaced={onOrderPlaced}
      />
    );

    // Initial AAPL close is $184.53
    // Set quantity to 5 shares
    const qtyInput = screen.getByTestId('quantity-input');
    fireEvent.change(qtyInput, { target: { value: '5' } });

    // Dynamic estimated order value should reflect 5 * 184.53 = $922.65
    expect(screen.getByTestId('estimated-order-value')).toHaveTextContent('$922.65');

    // Submit the buy order
    const submitBtn = screen.getByTestId('submit-order-btn');
    fireEvent.click(submitBtn);

    // Pending Order Card must now be visible
    const pendingCard = await screen.findByTestId('pending-order-card');
    expect(pendingCard).toBeInTheDocument();
    expect(screen.getByTestId('pending-order-symbol')).toHaveTextContent('AAPL');
    expect(screen.getByTestId('pending-order-side')).toHaveTextContent('buy');
    expect(screen.getByTestId('pending-order-quantity')).toHaveTextContent('5 shares');

    // Verify Orders History table has pending order with null execution price and time
    expect(screen.getByTestId('order-status-pending')).toHaveTextContent('pending');
    expect(onOrderPlaced).toHaveBeenCalledTimes(1);
    const placedOrder = onOrderPlaced.mock.calls[0][0];
    expect(placedOrder.status).toBe('pending');
    expect(placedOrder.symbol).toBe('AAPL');
    expect(placedOrder.side).toBe('buy');
    expect(placedOrder.quantity).toBe(5);
    expect(placedOrder.execution_price).toBeNull();
    expect(placedOrder.executed_at).toBeNull();
  });

  // Test 3: Disables order entry while an order is pending
  it('3. disables order entry while an order is pending', async () => {
    render(<TradingView initialCash={10_000} />);

    // Place an order first
    const submitBtn = screen.getByTestId('submit-order-btn');
    fireEvent.click(submitBtn);

    // Verify Pending notice is shown
    expect(screen.getByTestId('pending-order-notice')).toHaveTextContent(
      'Pending Order Active (Only 1 pending order allowed for MVP)'
    );

    // Form inputs must be disabled
    expect(screen.getByTestId('symbol-select')).toBeDisabled();
    expect(screen.getByTestId('side-toggle-buy')).toBeDisabled();
    expect(screen.getByTestId('side-toggle-sell')).toBeDisabled();
    expect(screen.getByTestId('quantity-input')).toBeDisabled();
    expect(screen.getByTestId('submit-order-btn')).toBeDisabled();
    expect(screen.getByTestId('submit-order-btn')).toHaveTextContent(
      'Pending Order Active (Only 1 pending order allowed for MVP)'
    );
  });

  // Test 4: Advancing session fills the order at next session open and updates cash/positions
  it('4. advancing session fills the order at next session open and updates cash/positions', async () => {
    const onAdvance = vi.fn();
    render(
      <TradingView
        initialCash={10_000}
        onAdvance={onAdvance}
      />
    );

    // Submit Buy 10 AAPL
    const qtyInput = screen.getByTestId('quantity-input');
    fireEvent.change(qtyInput, { target: { value: '10' } });
    fireEvent.click(screen.getByTestId('submit-order-btn'));

    expect(screen.getByTestId('pending-order-card')).toBeInTheDocument();

    // Advance session & execute order
    const advanceBtn = screen.getByTestId('advance-session-btn');
    fireEvent.click(advanceBtn);

    // After advance:
    // Session advances from 2024-01-02 to 2024-01-03
    expect(screen.getByTestId('cursor-current-session')).toHaveTextContent('2024-01-03');

    // AAPL next session (2024-01-03) OPEN is 183.120000
    // Total cost = 10 * 183.12 = $1,831.20
    // Remaining Cash = 10,000.00 - 1,831.20 = $8,168.80
    expect(screen.getByTestId('cash-balance')).toHaveTextContent('$8,168.80');

    // Pending card should now be gone
    expect(screen.queryByTestId('pending-order-card')).not.toBeInTheDocument();

    // Position table should display 10 shares of AAPL
    const row = screen.getByTestId('holding-row-AAPL');
    expect(row).toBeInTheDocument();
    expect(row).toHaveTextContent('10');
    expect(row).toHaveTextContent('$183.12'); // cost basis

    // Order status in Orders Table should now be filled
    expect(screen.getByTestId('order-status-filled')).toHaveTextContent('filled');

    // Verify onAdvance payload
    expect(onAdvance).toHaveBeenCalledTimes(1);
    const advanceArg = onAdvance.mock.calls[0][0];
    expect(advanceArg.order.status).toBe('filled');
    expect(advanceArg.order.execution_price).toBe('183.120000');
    expect(advanceArg.transaction).toBeDefined();
    expect(advanceArg.transaction.price).toBe('183.120000');
    expect(advanceArg.transaction.gross_amount).toBe('1831.20');
  });

  // Test 5: Price gap rejection: Buy order rejected when next session open exceeds cash, showing error notice
  it('5. price gap rejection: buy order rejected when next session open exceeds cash, showing error notice', async () => {
    // Custom market data where:
    // Session 2024-01-02 close is $100.00 -> user with $105.00 cash can submit buy order for 1 share
    // Session 2024-01-03 OPEN gaps to $120.00 -> exceeds $105.00 cash!
    const customMarketData: Record<string, MarketDataBar[]> = {
      AAPL: [
        {
          session_date: '2024-01-02',
          available_at: '2024-01-02T21:00:00Z',
          open: '98.000000',
          high: '102.000000',
          low: '97.000000',
          close: '100.000000',
          volume: 1000000,
        },
        {
          session_date: '2024-01-03',
          available_at: '2024-01-03T21:00:00Z',
          open: '120.000000', // Gapped up to $120.00!
          high: '125.000000',
          low: '118.000000',
          close: '122.000000',
          volume: 1200000,
        },
      ],
    };

    render(
      <TradingView
        initialCash={105} // $105.00 cash
        customMarketData={customMarketData}
      />
    );

    // Initial cash is $105.00
    expect(screen.getByTestId('cash-balance')).toHaveTextContent('$105.00');

    // At submission: 1 share * $100.00 = $100.00 <= $105.00 -> allowed
    const submitBtn = screen.getByTestId('submit-order-btn');
    fireEvent.click(submitBtn);

    // Verify order is pending
    expect(screen.getByTestId('pending-order-card')).toBeInTheDocument();

    // Advance session & execute order
    const advanceBtn = screen.getByTestId('advance-session-btn');
    fireEvent.click(advanceBtn);

    // Price gap rejection banner must appear!
    const alertBanner = await screen.findByTestId('rejection-notice-banner');
    expect(alertBanner).toBeInTheDocument();
    expect(alertBanner).toHaveTextContent(/gapped higher than available cash/i);
    expect(alertBanner).toHaveTextContent(/No cash or positions were changed/i);

    // Cash MUST remain unchanged at $105.00
    expect(screen.getByTestId('cash-balance')).toHaveTextContent('$105.00');

    // Positions MUST remain empty
    expect(screen.queryByTestId('holding-row-AAPL')).not.toBeInTheDocument();

    // Order status should be rejected
    expect(screen.getByTestId('order-status-rejected')).toHaveTextContent('rejected');
  });

  // Test 6: Oversell attempt displays validation error
  it('6. oversell attempt displays validation error', () => {
    const initialPositions: Position[] = [
      {
        symbol: 'AAPL',
        quantity: 5,
        cost_basis: '180.000000',
        market_price: '184.530000',
        market_value: '922.65',
        unrealized_pnl: '22.65',
      },
    ];

    render(
      <TradingView
        initialCash={10_000}
        initialPositions={initialPositions}
      />
    );

    // Case A: Toggle to Sell, enter 10 shares (only hold 5)
    fireEvent.click(screen.getByTestId('side-toggle-sell'));
    const qtyInput = screen.getByTestId('quantity-input');
    fireEvent.change(qtyInput, { target: { value: '10' } });

    // Validation error should show oversell warning
    const errorEl = screen.getByTestId('order-validation-error');
    expect(errorEl).toBeInTheDocument();
    expect(errorEl).toHaveTextContent(/Oversell error/i);
    expect(errorEl).toHaveTextContent(/Cannot sell 10 shares; you only hold 5 shares of AAPL/i);
    expect(screen.getByTestId('submit-order-btn')).toBeDisabled();

    // Case B: Select MSFT (hold 0 shares)
    fireEvent.change(screen.getByTestId('symbol-select'), { target: { value: 'MSFT' } });
    expect(screen.getByTestId('order-validation-error')).toHaveTextContent(
      /Cannot place sell order: You do not own any shares of MSFT/i
    );
    expect(screen.getByTestId('submit-order-btn')).toBeDisabled();
  });

  // Test 7: Transactions table displays filled trades
  it('7. transactions table displays filled trades', async () => {
    render(<TradingView initialCash={10_000} />);

    // Buy 2 MSFT shares
    fireEvent.change(screen.getByTestId('symbol-select'), { target: { value: 'MSFT' } });
    fireEvent.change(screen.getByTestId('quantity-input'), { target: { value: '2' } });
    fireEvent.click(screen.getByTestId('submit-order-btn'));

    // Advance session to execute
    fireEvent.click(screen.getByTestId('advance-session-btn'));

    // Switch to Transactions Log tab
    const txTab = screen.getByTestId('tab-transactions');
    fireEvent.click(txTab);

    // Transactions table should be visible and contain the executed trade
    const txTable = screen.getByTestId('transactions-table');
    expect(txTable).toBeInTheDocument();
    expect(txTable).toHaveTextContent('MSFT');
    expect(txTable).toHaveTextContent('buy');
    expect(txTable).toHaveTextContent('2');
    expect(txTable).toHaveTextContent('$362.92'); // MSFT open on 2024-01-03
    expect(txTable).toHaveTextContent('$725.84'); // Gross amount
    expect(txTable).toHaveTextContent('2024-01-03');
  });
});

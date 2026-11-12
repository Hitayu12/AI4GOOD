import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TradeConfirmationModal, ExecutedTradeReceipt } from './TradeConfirmationModal';

describe('TradeConfirmationModal Component', () => {
  const buyReceipt: ExecutedTradeReceipt = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Consumer Tech',
    side: 'buy',
    quantity: 10,
    price: 185.5,
    grossAmount: 1855.0,
    remainingCashDollars: 8145.0,
    mode: 'live_yahoo',
    timestamp: '3:20:00 PM',
  };

  const sellReceipt: ExecutedTradeReceipt = {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Enterprise Software',
    side: 'sell',
    quantity: 5,
    price: 430.0,
    grossAmount: 2150.0,
    remainingCashDollars: 12150.0,
    mode: 'simulation',
    sessionDate: '2024-01-05',
    timestamp: '3:21:00 PM',
  };

  it('1. renders nothing when receipt is null', () => {
    const { container } = render(<TradeConfirmationModal receipt={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('2. renders buy confirmation modal with correct company, quantity, and price', () => {
    render(<TradeConfirmationModal receipt={buyReceipt} onClose={vi.fn()} />);

    expect(screen.getByTestId('trade-confirmation-modal')).toBeInTheDocument();
    expect(screen.getByText(/You Bought/i)).toBeInTheDocument();
    expect(screen.getByText(/10 AAPL/i)).toBeInTheDocument();
    expect(screen.getByText(/Apple Inc./i)).toBeInTheDocument();
    expect(screen.getByText(/\$185.50/i)).toBeInTheDocument();
    expect(screen.getByText(/\$1,855.00/i)).toBeInTheDocument();
    expect(screen.getByText(/\$8,145.00/i)).toBeInTheDocument();
    expect(screen.getByText(/● Real-Time Feed/i)).toBeInTheDocument();
  });

  it('3. renders sell confirmation modal with cash proceeds and settled notice', () => {
    render(<TradeConfirmationModal receipt={sellReceipt} onClose={vi.fn()} />);

    expect(screen.getByTestId('trade-confirmation-modal')).toBeInTheDocument();
    expect(screen.getByText(/You Sold/i)).toBeInTheDocument();
    expect(screen.getByText(/5 MSFT/i)).toBeInTheDocument();
    expect(screen.getByText(/Microsoft Corporation/i)).toBeInTheDocument();
    expect(screen.getByText(/Cash Settled/i)).toBeInTheDocument();
    expect(screen.getByText(/\$2,150.00/i)).toBeInTheDocument();
  });

  it('4. calls onClose when clicking the primary action button', () => {
    const onClose = vi.fn();
    render(<TradeConfirmationModal receipt={buyReceipt} onClose={onClose} />);

    const btn = screen.getByRole('button', { name: /Got it, Keep Trading/i });
    fireEvent.click(btn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('5. calls onClose when pressing Escape key', () => {
    const onClose = vi.fn();
    render(<TradeConfirmationModal receipt={buyReceipt} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

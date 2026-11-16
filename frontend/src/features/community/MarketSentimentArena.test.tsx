import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarketSentimentArena } from './MarketSentimentArena';

describe('MarketSentimentArena Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders sentiment arena with NVDA by default and voting buttons', () => {
    render(<MarketSentimentArena />);
    expect(screen.getByTestId('market-sentiment-arena')).toBeInTheDocument();
    expect(screen.getByTestId('vote-bullish-btn')).toBeInTheDocument();
    expect(screen.getByTestId('vote-bearish-btn')).toBeInTheDocument();
    expect(screen.getByTestId('sentiment-bar')).toBeInTheDocument();
  });

  it('allows voting bullish, updates UI, and invokes onVoteAura callback', () => {
    const handleVoteAura = vi.fn();
    render(<MarketSentimentArena onVoteAura={handleVoteAura} />);

    const bullBtn = screen.getByTestId('vote-bullish-btn');
    fireEvent.click(bullBtn);

    expect(handleVoteAura).toHaveBeenCalledWith(100);
    expect(screen.getByText(/Voted Bullish!/i)).toBeInTheDocument();
    expect(bullBtn).toBeDisabled();
    expect(screen.getByTestId('vote-bearish-btn')).toBeDisabled();
  });

  it('switches tickers when clicking ticker tabs', () => {
    render(<MarketSentimentArena />);
    const tslaTab = screen.getByTestId('sentiment-tab-TSLA');
    fireEvent.click(tslaTab);

    expect(screen.getByText(/Tesla \(EVs & Clean Tech\)/i)).toBeInTheDocument();
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MarketStrategiesLab } from './MarketStrategiesLab';

describe('MarketStrategiesLab Component', () => {
  it('renders Global Strategy Lab header, region pills, and head-to-head comparison by default', () => {
    render(<MarketStrategiesLab currentTopicId="cd-basics" />);

    // Header & Subtitle
    expect(
      screen.getByRole('heading', { level: 3, name: /Global Strategy Lab: 🇺🇸 American vs. 🇪🇺 European Markets/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Traditional Long-Only Playbook/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero Options • Real Market Data/i)).toBeInTheDocument();

    // Region Switchers
    expect(screen.getByRole('button', { name: /US Market/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /European Market/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Head-to-Head/i })).toBeInTheDocument();

    // Default comparison table exists
    expect(screen.getByText(/Key Structural Differences: Certificates of Deposit/i)).toBeInTheDocument();
    expect(screen.getByText(/Deposit Protection Limit/i)).toBeInTheDocument();
  });

  it('switches between US, European, and Comparison views smoothly', () => {
    render(<MarketStrategiesLab currentTopicId="etf-basics" />);

    // Click US Market button
    const usBtn = screen.getByRole('button', { name: /US Market/i });
    fireEvent.click(usBtn);

    expect(screen.getByText(/The 80\/20 Core-and-Satellite Index Strategy/i)).toBeInTheDocument();
    expect(screen.getByText(/SEC regulated; protected under SIPC/i)).toBeInTheDocument();

    // Click European Market button
    const euBtn = screen.getByRole('button', { name: /European Market/i });
    fireEvent.click(euBtn);

    expect(screen.getByText(/The Accumulating \(Acc\) UCITS Global Index Playbook/i)).toBeInTheDocument();
    expect(screen.getByText(/Regulated under UCITS EU directives/i)).toBeInTheDocument();
  });

  it('allows interacting with the traditional strategy builder simulator and changes projections', () => {
    render(<MarketStrategiesLab currentTopicId="stock-basics" />);

    expect(screen.getByText(/Interactive Traditional Strategy Builder/i)).toBeInTheDocument();

    // Select "Long-Term Compounder" profile
    const compounderBtn = screen.getByRole('button', { name: /Long-Term Compounder/i });
    fireEvent.click(compounderBtn);

    // Verify allocation updates
    expect(screen.getByText(/85% Broad Index ETFs, 15% Satellite Equities/i)).toBeInTheDocument();
    expect(screen.getByText(/Core ETFs: 85%/i)).toBeInTheDocument();
    expect(screen.getByText(/Stocks: 15%/i)).toBeInTheDocument();

    // Toggle execution checklist region
    const euExecBtn = screen.getByRole('button', { name: /EU Execution/i });
    fireEvent.click(euExecBtn);
    expect(screen.getByText(/Accumulating \(Acc\) UCITS ETF/i)).toBeInTheDocument();
  });

  it('interactively answers the market dilemma challenge and reveals plain-English feedback', () => {
    render(<MarketStrategiesLab currentTopicId="cd-basics" />);

    // Click the optimal strategy option
    const bestOption = screen.getByRole('button', {
      name: /Create a ladder: Keep \$1,000 in a liquid HYSA\/easy-access account/i,
    });
    fireEvent.click(bestOption);

    // Feedback appears
    expect(screen.getByText(/🎉 Excellent Analysis!/i)).toBeInTheDocument();
    expect(
      screen.getByText(/You preserve emergency liquidity while locking in guaranteed yields/i)
    ).toBeInTheDocument();
  });
});

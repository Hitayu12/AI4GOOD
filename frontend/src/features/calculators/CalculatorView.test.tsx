import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CalculatorView from './CalculatorView';

describe('CalculatorView Component', () => {
  it('renders default inputs and displays initial calculation', () => {
    render(<CalculatorView />);

    expect(screen.getByText(/High-Yield Savings & CD Calculator/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Starting Principal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Monthly Contribution/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Investment Horizon/i)).toBeInTheDocument();
    expect(screen.getByText(/Projected Final Balance/i)).toBeInTheDocument();
  });

  it('updates calculation when inputs change', () => {
    render(<CalculatorView />);

    const startInput = screen.getByLabelText(/Starting Principal/i);
    const monthlyInput = screen.getByLabelText(/Monthly Contribution/i);
    const rateInput = screen.getByLabelText(/Annual Interest Rate/i);
    const horizonInput = screen.getByLabelText(/Investment Horizon/i);

    // Apply Reference Check 1: 1000 start, 100/mo, 0% rate, 12 months
    fireEvent.change(startInput, { target: { value: '1000' } });
    fireEvent.change(monthlyInput, { target: { value: '100' } });
    fireEvent.change(rateInput, { target: { value: '0' } });
    fireEvent.change(horizonInput, { target: { value: '12' } });

    expect(screen.getByText('$2,200.00')).toBeInTheDocument();
    expect(screen.getByText('$1,200.00')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('applies quick preset scenarios correctly', () => {
    render(<CalculatorView />);

    const refCheckBtn = screen.getByText(/Contract Reference Check \(12%\)/i);
    fireEvent.click(refCheckBtn);

    // Should switch to investment mode and display $1,120.00
    expect(screen.getByText('$1,120.00')).toBeInTheDocument();
    expect(screen.getByText('$120.00')).toBeInTheDocument();
  });

  it('displays validation error and clears results when negative rate entered in savings mode', () => {
    render(<CalculatorView />);

    const rateInput = screen.getByLabelText(/Annual Interest Rate/i);
    fireEvent.change(rateInput, { target: { value: '-5' } });

    expect(screen.getByText(/Savings interest rate assumptions must be nonnegative/i)).toBeInTheDocument();
    expect(screen.getByText(/Please correct the input errors/i)).toBeInTheDocument();
  });

  it('allows negative rates in investment mode', () => {
    render(<CalculatorView />);

    const investmentTab = screen.getByRole('tab', { name: /Investment Growth/i });
    fireEvent.click(investmentTab);

    const rateInput = screen.getByLabelText(/Projected Annual Return/i);
    fireEvent.change(rateInput, { target: { value: '-10' } });

    const startInput = screen.getByLabelText(/Starting Principal/i);
    fireEvent.change(startInput, { target: { value: '1000' } });

    const monthlyInput = screen.getByLabelText(/Monthly Contribution/i);
    fireEvent.change(monthlyInput, { target: { value: '0' } });

    const horizonInput = screen.getByLabelText(/Investment Horizon/i);
    fireEvent.change(horizonInput, { target: { value: '12' } });

    expect(screen.getByText('$900.00')).toBeInTheDocument();
    expect(screen.getByText('-$100.00')).toBeInTheDocument();
  });

  it('toggles the monthly amortization schedule table', () => {
    render(<CalculatorView />);

    const toggleBtn = screen.getByRole('button', { name: /View Monthly Table/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/Monthly Amortization Schedule/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hide Monthly Amortization Table/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Hide Monthly Amortization Table/i }));
    expect(screen.queryByText(/Monthly Amortization Schedule/i)).not.toBeInTheDocument();
  });

  it('includes mandatory financial disclosures and non-guarantee notices', () => {
    render(<CalculatorView />);

    expect(screen.getByText(/Mandatory Financial Disclosures & Contract Assumptions/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Effective Annual Rate/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Exclusions/i)).toBeInTheDocument();
    expect(screen.getAllByText(/No Guarantee/i).length).toBeGreaterThanOrEqual(1);
  });
});

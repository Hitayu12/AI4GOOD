import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

describe('App Root Component', () => {
  it('renders header, navigation tabs, and portfolio view by default', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
    );

    render(<App />);

    expect(screen.getByText(/Rutgers AI4Good 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Features & Integration — Kiran/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Portfolio \(Phase 6\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Paper Trading \(Phase 5\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Simulation \(Phase 4\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lessons & Quizzes \(Phase 3\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Calculators \(Phase 2\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI Tutor \(Phase 8\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /System Status/i })).toBeInTheDocument();

    // Default tab is portfolio view
    expect(screen.getByText(/Portfolio & Performance/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Equity/i)).toBeInTheDocument();

    // Switch to trading tab
    fireEvent.click(screen.getByRole('button', { name: /Paper Trading \(Phase 5\)/i }));
    expect(screen.getByTestId('trading-view')).toBeInTheDocument();

    // Switch to simulation tab
    fireEvent.click(screen.getByRole('button', { name: /Simulation \(Phase 4\)/i }));
    expect(screen.getByText(/Curriculum Time Cursor/i)).toBeInTheDocument();

    // Switch to lessons tab
    fireEvent.click(screen.getByRole('button', { name: /Lessons & Quizzes \(Phase 3\)/i }));
    expect(screen.getByText(/Financial Education & Learning/i)).toBeInTheDocument();

    // Switch to calculator tab
    fireEvent.click(screen.getByRole('button', { name: /Calculators \(Phase 2\)/i }));
    expect(screen.getByText(/High-Yield Savings & CD Calculator/i)).toBeInTheDocument();

    // Switch to tutor tab
    fireEvent.click(screen.getByRole('button', { name: /AI Tutor \(Phase 8\)/i }));
    expect(screen.getByRole('heading', { name: /AI Financial Tutor/i, level: 3 })).toBeInTheDocument();

    // Switch to system status tab
    fireEvent.click(screen.getByRole('button', { name: /System Status/i }));
    expect(screen.getByText(/System & Transport Status/i)).toBeInTheDocument();

    // Verify Sign In (S4) modal opens
    expect(screen.getByRole('button', { name: /Sign In \(S4\)/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Sign In \(S4\)/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Sign in to your account/i })).toBeInTheDocument();

    // Close modal via Escape
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

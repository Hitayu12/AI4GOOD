import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DailyDropModal } from './DailyDropModal';
import { loadAuraState } from './auraService';

describe('DailyDropModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders modal when isOpen is true with 3 lucky cards', () => {
    const state = loadAuraState();
    render(<DailyDropModal isOpen={true} onClose={vi.fn()} auraState={state} />);

    expect(screen.getByTestId('daily-drop-modal')).toBeInTheDocument();
    expect(screen.getByTestId('lucky-card-0')).toBeInTheDocument();
    expect(screen.getByTestId('lucky-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('lucky-card-2')).toBeInTheDocument();
  });

  it('reveals chosen card, updates aura points, and invokes onAuraStateChange callback', () => {
    const state = loadAuraState();
    const handleChange = vi.fn();
    render(
      <DailyDropModal
        isOpen={true}
        onClose={vi.fn()}
        auraState={state}
        onAuraStateChange={handleChange}
      />
    );

    const card0 = screen.getByTestId('lucky-card-0');
    fireEvent.click(card0);

    expect(handleChange).toHaveBeenCalled();
    const updated = handleChange.mock.calls[0][0];
    expect(updated.points).toBeGreaterThan(state.points);
    expect(updated.lastLuckyDropDate).toBe(new Date().toISOString().split('T')[0]);
  });

  it('disables cards and shows notice if already claimed today', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const claimedState = {
      ...loadAuraState(),
      lastLuckyDropDate: todayStr,
    };

    render(<DailyDropModal isOpen={true} onClose={vi.fn()} auraState={claimedState} />);
    expect(screen.getByTestId('lucky-card-0')).toBeDisabled();
    expect(screen.getByText(/Already claimed today!/i)).toBeInTheDocument();
  });
});

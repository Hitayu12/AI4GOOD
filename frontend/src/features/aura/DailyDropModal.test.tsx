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

  it('correctly handles all roll probability tiers (Legendary, Epic, Rare, Common)', () => {
    // 1. Legendary roll: 0.01 -> 1% (< 3%)
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const state = loadAuraState();
    let updatedState: ReturnType<typeof loadAuraState> | undefined;

    const { unmount } = render(
      <DailyDropModal
        isOpen={true}
        onClose={vi.fn()}
        auraState={state}
        onAuraStateChange={(s) => {
          updatedState = s;
        }}
      />
    );

    fireEvent.click(screen.getByTestId('lucky-card-0'));
    expect(updatedState?.points).toBe(state.points + 2500);
    expect(updatedState?.multiplier).toBe(2.0);
    unmount();

    // 2. Epic roll: 0.08 -> 8% (< 15%)
    vi.spyOn(Math, 'random').mockReturnValue(0.08);
    const { unmount: unmountEpic } = render(
      <DailyDropModal
        isOpen={true}
        onClose={vi.fn()}
        auraState={state}
        onAuraStateChange={(s) => {
          updatedState = s;
        }}
      />
    );
    fireEvent.click(screen.getByTestId('lucky-card-1'));
    expect(updatedState?.points).toBe(state.points + 1000);
    unmountEpic();

    // 3. Rare roll: 0.25 -> 25% (< 40%)
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const { unmount: unmountRare } = render(
      <DailyDropModal
        isOpen={true}
        onClose={vi.fn()}
        auraState={state}
        onAuraStateChange={(s) => {
          updatedState = s;
        }}
      />
    );
    fireEvent.click(screen.getByTestId('lucky-card-2'));
    expect(updatedState?.points).toBe(state.points + 500);
    expect(updatedState?.multiplier).toBe(1.75);
    unmountRare();

    // 4. Common roll: 0.75 -> 75% (>= 40%)
    vi.spyOn(Math, 'random').mockReturnValue(0.75);
    const { unmount: unmountCommon } = render(
      <DailyDropModal
        isOpen={true}
        onClose={vi.fn()}
        auraState={state}
        onAuraStateChange={(s) => {
          updatedState = s;
        }}
      />
    );
    fireEvent.click(screen.getByTestId('lucky-card-0'));
    expect(updatedState?.points).toBe(state.points + 250);
    unmountCommon();
  });

  it('prevents multiple picks on rapid clicks', () => {
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
    const card1 = screen.getByTestId('lucky-card-1');

    fireEvent.click(card0);
    fireEvent.click(card1);
    fireEvent.click(card0);

    // Only one pick should have been registered
    expect(handleChange).toHaveBeenCalledTimes(1);
  });
});

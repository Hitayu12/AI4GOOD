import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RivalLeaderboardModal } from './RivalLeaderboardModal';
import { loadAuraState } from '../aura/auraService';

describe('RivalLeaderboardModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders modal with Diamond Trader League title and user rank row', () => {
    const state = loadAuraState();
    render(<RivalLeaderboardModal isOpen={true} onClose={vi.fn()} auraState={state} />);

    expect(screen.getByTestId('rival-leaderboard-modal')).toBeInTheDocument();
    expect(screen.getByText(/Diamond Trader League/i)).toBeInTheDocument();
    expect(screen.getByTestId('user-rank-row')).toBeInTheDocument();
  });

  it('handles duel challenge button and shows notification', () => {
    const state = loadAuraState();
    render(<RivalLeaderboardModal isOpen={true} onClose={vi.fn()} auraState={state} />);

    const duelButtons = screen.getAllByText(/⚔️ Duel/i);
    expect(duelButtons.length).toBeGreaterThan(0);
    fireEvent.click(duelButtons[0]);

    expect(screen.getByText(/Duel Challenge Sent/i)).toBeInTheDocument();
  });

  it('closes when close button is clicked', () => {
    const handleClose = vi.fn();
    const state = loadAuraState();
    render(<RivalLeaderboardModal isOpen={true} onClose={handleClose} auraState={state} />);

    const closeBtn = screen.getByTestId('close-leaderboard-btn');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });
});

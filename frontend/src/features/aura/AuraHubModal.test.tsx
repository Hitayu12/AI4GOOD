import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuraHubModal } from './AuraHubModal';
import { AuraState } from './auraTypes';
import { INITIAL_BADGES, INITIAL_QUESTS } from './auraService';

describe('AuraHubModal Component', () => {
  const mockAuraState: AuraState = {
    points: 3450,
    streakDays: 3,
    lastClaimDate: null,
    multiplier: 1.5,
    tier: 'Market Rizzler ✨',
    level: 3,
    nextTierPoints: 5000,
    quests: INITIAL_QUESTS,
    badges: INITIAL_BADGES,
  };

  it('renders aura points, current prestige rank, and streak counter', () => {
    const onNavigateTab = vi.fn();
    const onUpdateAura = vi.fn();
    const onClose = vi.fn();

    render(
      <AuraHubModal
        isOpen={true}
        onClose={onClose}
        auraState={mockAuraState}
        onUpdateAura={onUpdateAura}
        onNavigateTab={onNavigateTab}
      />
    );

    expect(screen.getByText(/The Financial Aura Hub/i)).toBeInTheDocument();
    expect(screen.getByText(/3,450/i)).toBeInTheDocument();
    expect(screen.getByText(/Market Rizzler ✨/i)).toBeInTheDocument();
    expect(screen.getByText(/3-Day Streak/i)).toBeInTheDocument();
    expect(screen.getByText(/Daily Aura Quests/i)).toBeInTheDocument();
    expect(screen.getByText(/Aura Prestige Badges/i)).toBeInTheDocument();
  });

  it('allows claiming daily aura reward when not yet claimed today', () => {
    const onNavigateTab = vi.fn();
    const onUpdateAura = vi.fn();
    const onClose = vi.fn();

    render(
      <AuraHubModal
        isOpen={true}
        onClose={onClose}
        auraState={mockAuraState}
        onUpdateAura={onUpdateAura}
        onNavigateTab={onNavigateTab}
      />
    );

    const claimBtn = screen.getByRole('button', { name: /Claim Daily/i });
    expect(claimBtn).toBeInTheDocument();
    expect(claimBtn).not.toBeDisabled();

    fireEvent.click(claimBtn);

    expect(onUpdateAura).toHaveBeenCalledWith(
      expect.objectContaining({
        points: 3450 + Math.round(250 * 1.5),
        streakDays: 4,
      })
    );
    expect(screen.getByText(/AURA FARMED!/i)).toBeInTheDocument();
  });

  it('disables daily claim button if already claimed today', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const claimedState: AuraState = {
      ...mockAuraState,
      lastClaimDate: todayStr,
    };

    render(
      <AuraHubModal
        isOpen={true}
        onClose={vi.fn()}
        auraState={claimedState}
        onUpdateAura={vi.fn()}
        onNavigateTab={vi.fn()}
      />
    );

    const claimBtn = screen.getByRole('button', { name: /Daily Aura Claimed/i });
    expect(claimBtn).toBeDisabled();
  });

  it('navigates to quest target tab when Go button is clicked', () => {
    const onNavigateTab = vi.fn();
    const onClose = vi.fn();

    render(
      <AuraHubModal
        isOpen={true}
        onClose={onClose}
        auraState={mockAuraState}
        onUpdateAura={vi.fn()}
        onNavigateTab={onNavigateTab}
      />
    );

    // Click Go on the first quest (Paper Trade Spot Order -> 'trading')
    const goButtons = screen.getAllByRole('button', { name: /Go/i });
    expect(goButtons.length).toBeGreaterThan(0);
    fireEvent.click(goButtons[0]);

    expect(onClose).toHaveBeenCalled();
    expect(onNavigateTab).toHaveBeenCalledWith('trading');
  });

  it('closes on Escape key press or close button click', () => {
    const onClose = vi.fn();

    render(
      <AuraHubModal
        isOpen={true}
        onClose={onClose}
        auraState={mockAuraState}
        onUpdateAura={vi.fn()}
        onNavigateTab={vi.fn()}
      />
    );

    const closeButtons = screen.getAllByRole('button', { name: /Close Aura Hub/i });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

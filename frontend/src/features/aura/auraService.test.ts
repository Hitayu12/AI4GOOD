import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadAuraState,
  saveAuraState,
  addAuraPoints,
  computeTier,
  syncLearningAwards,
  completeQuest,
  unlockBadge,
  MISSION_POINTS,
  REVIEW_POINTS,
  INITIAL_QUESTS,
  INITIAL_BADGES,
} from './auraService';
import { AuraState } from './auraTypes';

describe('auraService - Learning & Gamification Aura Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('computeTier', () => {
    it('returns Level 1 NPC Saver for < 1000 points', () => {
      const tier0 = computeTier(0);
      expect(tier0.level).toBe(1);
      expect(tier0.tier).toBe('NPC Saver 💤');
      expect(tier0.nextTierPoints).toBe(1000);

      const tier999 = computeTier(999);
      expect(tier999.level).toBe(1);
      expect(tier999.tier).toBe('NPC Saver 💤');
    });

    it('returns Level 2 Cash Flow Apprentice for 1000..2499 points', () => {
      const tier1000 = computeTier(1000);
      expect(tier1000.level).toBe(2);
      expect(tier1000.tier).toBe('Cash Flow Apprentice 🌱');
      expect(tier1000.nextTierPoints).toBe(2500);

      const tier2499 = computeTier(2499);
      expect(tier2499.level).toBe(2);
    });

    it('returns Level 3 Market Rizzler for 2500..4999 points', () => {
      const tier2500 = computeTier(2500);
      expect(tier2500.level).toBe(3);
      expect(tier2500.tier).toBe('Market Rizzler ✨');
      expect(tier2500.nextTierPoints).toBe(5000);
    });

    it('returns Level 4 Sigma Investor for 5000..9999 points', () => {
      const tier5000 = computeTier(5000);
      expect(tier5000.level).toBe(4);
      expect(tier5000.tier).toBe('Sigma Investor 🗿');
      expect(tier5000.nextTierPoints).toBe(10000);
    });

    it('returns Level 5 Infinite Aura Gigachad for >= 10000 points', () => {
      const tier10000 = computeTier(10000);
      expect(tier10000.level).toBe(5);
      expect(tier10000.tier).toBe('Infinite Aura Gigachad 👑');
      expect(tier10000.nextTierPoints).toBe(25000);
    });
  });

  describe('syncLearningAwards - Mission Completion & Double-Counting Guard', () => {
    it('grants points properly on initial mission completion', () => {
      const initial = loadAuraState('test-learner');
      expect(initial.points).toBe(0);

      const updated = syncLearningAwards(
        initial,
        { 'mission:cd-basics': MISSION_POINTS },
        'test-learner'
      );

      expect(updated.points).toBe(MISSION_POINTS);
      expect(updated.learningAwards).toEqual({ 'mission:cd-basics': MISSION_POINTS });
    });

    it('prevents double-counting when user clicks complete multiple times', () => {
      const initial = loadAuraState('test-learner');

      // Click 1
      const afterFirstClick = syncLearningAwards(
        initial,
        { 'mission:cd-basics': MISSION_POINTS },
        'test-learner'
      );
      expect(afterFirstClick.points).toBe(MISSION_POINTS);

      // Click 2 (identical award submitted again)
      const afterSecondClick = syncLearningAwards(
        afterFirstClick,
        { 'mission:cd-basics': MISSION_POINTS },
        'test-learner'
      );
      expect(afterSecondClick.points).toBe(MISSION_POINTS);
      expect(afterSecondClick).toBe(afterFirstClick); // Returns unmodified state instance

      // Click 3 (re-submitting multiple times)
      const afterThirdClick = syncLearningAwards(
        afterSecondClick,
        { 'mission:cd-basics': MISSION_POINTS },
        'test-learner'
      );
      expect(afterThirdClick.points).toBe(MISSION_POINTS);
    });

    it('awards new missions incrementally while skipping previously awarded missions', () => {
      const initial = loadAuraState('test-learner');

      // Mission 1 completed
      const state1 = syncLearningAwards(
        initial,
        { 'mission:cd-basics': MISSION_POINTS },
        'test-learner'
      );
      expect(state1.points).toBe(150);

      // Review for mission 1 + Mission 2 completed
      const state2 = syncLearningAwards(
        state1,
        {
          'mission:cd-basics': MISSION_POINTS, // already awarded -> ignored
          'review:cd-basics': REVIEW_POINTS,   // new -> +50
          'mission:hysa-basics': MISSION_POINTS, // new -> +150
        },
        'test-learner'
      );

      expect(state2.points).toBe(150 + 50 + 150); // 350
      expect(Object.keys(state2.learningAwards ?? {})).toHaveLength(3);
    });
  });

  describe('addAuraPoints', () => {
    it('safely increments points and recalibrates tier and level', () => {
      const state = loadAuraState();
      const next = addAuraPoints(state, 1200);

      expect(next.points).toBe(1200);
      expect(next.level).toBe(2);
      expect(next.tier).toBe('Cash Flow Apprentice 🌱');
    });

    it('clamps negative amounts to zero', () => {
      const state = loadAuraState();
      const next = addAuraPoints(state, -500);

      expect(next.points).toBe(0);
    });

    it('rounds fractional point amounts', () => {
      const state = loadAuraState();
      const next = addAuraPoints(state, 150.7);

      expect(next.points).toBe(151);
    });
  });

  describe('completeQuest', () => {
    it('completes quest and applies multiplier bonus', () => {
      const state: AuraState = {
        ...loadAuraState(),
        multiplier: 2.0,
      };

      const result = completeQuest(state, 'quest-trade');
      expect(result.earnedAura).toBe(Math.round(200 * 2.0)); // 400
      expect(result.updatedState.points).toBe(400);

      const quest = result.updatedState.quests.find((q) => q.id === 'quest-trade');
      expect(quest?.completed).toBe(true);
    });

    it('does not double count on multiple calls for the same quest', () => {
      const state = loadAuraState();
      const first = completeQuest(state, 'quest-trade');
      expect(first.earnedAura).toBe(200);

      const second = completeQuest(first.updatedState, 'quest-trade');
      expect(second.earnedAura).toBe(0);
      expect(second.updatedState.points).toBe(first.updatedState.points);
    });

    it('returns zero for non-existent quest', () => {
      const state = loadAuraState();
      const res = completeQuest(state, 'non-existent-quest');
      expect(res.earnedAura).toBe(0);
      expect(res.updatedState).toBe(state);
    });
  });

  describe('unlockBadge', () => {
    it('unlocks badge and awards bonus', () => {
      const state = loadAuraState();
      const res = unlockBadge(state, 'badge-sigma-scalper');
      expect(res.earnedBonus).toBe(500);
      expect(res.updatedState.points).toBe(500);

      const badge = res.updatedState.badges.find((b) => b.id === 'badge-sigma-scalper');
      expect(badge?.unlocked).toBe(true);
    });

    it('does not award bonus twice if badge is already unlocked', () => {
      const state = loadAuraState();
      const first = unlockBadge(state, 'badge-sigma-scalper');
      expect(first.earnedBonus).toBe(500);

      const second = unlockBadge(first.updatedState, 'badge-sigma-scalper');
      expect(second.earnedBonus).toBe(0);
      expect(second.updatedState.points).toBe(500);
    });
  });

  describe('loadAuraState & saveAuraState', () => {
    it('falls back to default state if localStorage is empty or corrupted', () => {
      localStorage.setItem('ai4good_aura_state_v1', 'invalid json string');
      const state = loadAuraState();
      expect(state.points).toBe(0);
      expect(state.tier).toBe('NPC Saver 💤');
      expect(state.quests).toHaveLength(INITIAL_QUESTS.length);
      expect(state.badges).toHaveLength(INITIAL_BADGES.length);
    });

    it('persists and reloads state correctly per learner accountId', () => {
      const state: AuraState = {
        ...loadAuraState('learner-123'),
        points: 4200,
        streakDays: 5,
      };

      saveAuraState(state, 'learner-123');
      const loaded = loadAuraState('learner-123');

      expect(loaded.points).toBe(4200);
      expect(loaded.streakDays).toBe(5);
      expect(loaded.tier).toBe('Market Rizzler ✨');

      // Different account is isolated
      const otherAccount = loadAuraState('learner-other');
      expect(otherAccount.points).toBe(0);
    });
  });
});

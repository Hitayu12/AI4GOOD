import { describe, it, expect, vi, beforeEach } from 'vitest';
import { questTracker, QUEST_COMPLETED_EVENT, BADGE_UNLOCKED_EVENT } from './questTrackerService';
import { loadAuraState } from '../aura/auraService';

describe('QuestTrackerService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('records trade, completes trading quest, and unlocks Sigma Scalper badge', () => {
    const questListener = vi.fn();
    window.addEventListener(QUEST_COMPLETED_EVENT, questListener);

    questTracker.recordTrade();

    expect(questListener).toHaveBeenCalled();
    const eventDetail = questListener.mock.calls[0][0].detail;
    expect(eventDetail.questId).toBe('quest-trade');
    expect(eventDetail.earnedAura).toBeGreaterThan(0);

    const updated = loadAuraState();
    expect(updated.quests.find((q) => q.id === 'quest-trade')?.completed).toBe(true);

    window.removeEventListener(QUEST_COMPLETED_EVENT, questListener);
  });

  it('records quiz pass at 80%+, completes quiz quest, and unlocks badge on 100%', () => {
    const questListener = vi.fn();
    const badgeListener = vi.fn();
    window.addEventListener(QUEST_COMPLETED_EVENT, questListener);
    window.addEventListener(BADGE_UNLOCKED_EVENT, badgeListener);

    questTracker.recordQuiz(100);

    expect(questListener).toHaveBeenCalled();
    expect(badgeListener).toHaveBeenCalled();

    const updated = loadAuraState();
    expect(updated.quests.find((q) => q.id === 'quest-quiz')?.completed).toBe(true);
    expect(updated.badges.find((b) => b.id === 'badge-zero-leak')?.unlocked).toBe(true);

    window.removeEventListener(QUEST_COMPLETED_EVENT, questListener);
    window.removeEventListener(BADGE_UNLOCKED_EVENT, badgeListener);
  });

  it('ignores quiz scores below 80%', () => {
    const questListener = vi.fn();
    window.addEventListener(QUEST_COMPLETED_EVENT, questListener);

    questTracker.recordQuiz(75);
    expect(questListener).not.toHaveBeenCalled();

    window.removeEventListener(QUEST_COMPLETED_EVENT, questListener);
  });
});

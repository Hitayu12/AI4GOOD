import { loadAuraState, completeQuest, unlockBadge, saveAuraState } from '../aura/auraService';
import { AuraState } from '../aura/auraTypes';
import { soundFx } from './soundFxService';
import { triggerConfetti } from '../../components/common/CelebrationConfetti';

export const QUEST_COMPLETED_EVENT = 'ai4good:quest-completed';
export const BADGE_UNLOCKED_EVENT = 'ai4good:badge-unlocked';
export const LEVEL_UP_EVENT = 'ai4good:level-up';

export interface QuestEventDetail {
  questId: string;
  questTitle: string;
  earnedAura: number;
}

export interface BadgeEventDetail {
  badgeId: string;
  badgeTitle: string;
  earnedBonus: number;
}

export interface LevelUpEventDetail {
  newTier: string;
  newLevel: number;
}

class QuestTrackerService {
  private dispatchEvent<T>(name: string, detail: T): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    }
  }

  private checkLevelUp(oldState: AuraState, newState: AuraState): void {
    if (newState.level > oldState.level) {
      this.dispatchEvent<LevelUpEventDetail>(LEVEL_UP_EVENT, {
        newTier: newState.tier,
        newLevel: newState.level,
      });
      soundFx.playLevelUpChime();
      triggerConfetti({ particleCount: 100 });
    }
  }

  /**
   * Called when a paper trade is placed or executed
   */
  public recordTrade(accountId?: string): void {
    const currentState = loadAuraState(accountId);
    let state = currentState;

    // Complete trading quest if not already complete
    const { updatedState: afterQuest, earnedAura } = completeQuest(state, 'quest-trade', accountId);
    if (earnedAura > 0) {
      state = afterQuest;
      this.dispatchEvent<QuestEventDetail>(QUEST_COMPLETED_EVENT, {
        questId: 'quest-trade',
        questTitle: 'Paper Trade Spot Order',
        earnedAura,
      });
      soundFx.playCoinPing();
      triggerConfetti({ particleCount: 60 });
    }

    // Unlock Sigma Scalper badge
    const { updatedState: afterBadge, earnedBonus } = unlockBadge(state, 'badge-sigma-scalper', accountId);
    if (earnedBonus > 0) {
      state = afterBadge;
      this.dispatchEvent<BadgeEventDetail>(BADGE_UNLOCKED_EVENT, {
        badgeId: 'badge-sigma-scalper',
        badgeTitle: 'Sigma Scalper 🗿',
        earnedBonus,
      });
    }

    saveAuraState(state, accountId);
    this.checkLevelUp(currentState, state);
  }

  /**
   * Called when a financial quiz is completed
   */
  public recordQuiz(scorePct: number, accountId?: string): void {
    if (scorePct < 80) return;

    const currentState = loadAuraState(accountId);
    let state = currentState;

    const { updatedState: afterQuest, earnedAura } = completeQuest(state, 'quest-quiz', accountId);
    if (earnedAura > 0) {
      state = afterQuest;
      this.dispatchEvent<QuestEventDetail>(QUEST_COMPLETED_EVENT, {
        questId: 'quest-quiz',
        questTitle: 'Ace a Financial Quiz',
        earnedAura,
      });
      soundFx.playSuccessChord();
      triggerConfetti({ particleCount: 80 });
    }

    if (scorePct >= 100) {
      const { updatedState: afterBadge, earnedBonus } = unlockBadge(state, 'badge-zero-leak', accountId);
      if (earnedBonus > 0) {
        state = afterBadge;
        this.dispatchEvent<BadgeEventDetail>(BADGE_UNLOCKED_EVENT, {
          badgeId: 'badge-zero-leak',
          badgeTitle: 'Zero Lookahead Oracle 🔮',
          earnedBonus,
        });
      }
    }

    saveAuraState(state, accountId);
    this.checkLevelUp(currentState, state);
  }

  /**
   * Called when historical simulation advances
   */
  public recordSimulationAdvance(accountId?: string): void {
    const currentState = loadAuraState(accountId);
    const { updatedState, earnedAura } = completeQuest(currentState, 'quest-sim', accountId);
    if (earnedAura > 0) {
      saveAuraState(updatedState, accountId);
      this.dispatchEvent<QuestEventDetail>(QUEST_COMPLETED_EVENT, {
        questId: 'quest-sim',
        questTitle: 'Advance Historical Session',
        earnedAura,
      });
      soundFx.playCoinPing();
      this.checkLevelUp(currentState, updatedState);
    }
  }

  /**
   * Called when compound calculator is used
   */
  public recordCalculatorUsed(accountId?: string): void {
    const currentState = loadAuraState(accountId);
    let state = currentState;

    const { updatedState: afterQuest, earnedAura } = completeQuest(state, 'quest-calc', accountId);
    if (earnedAura > 0) {
      state = afterQuest;
      this.dispatchEvent<QuestEventDetail>(QUEST_COMPLETED_EVENT, {
        questId: 'quest-calc',
        questTitle: 'Model Compound APY Math',
        earnedAura,
      });
    }

    const { updatedState: afterBadge, earnedBonus } = unlockBadge(state, 'badge-compound-king', accountId);
    if (earnedBonus > 0) {
      state = afterBadge;
      this.dispatchEvent<BadgeEventDetail>(BADGE_UNLOCKED_EVENT, {
        badgeId: 'badge-compound-king',
        badgeTitle: 'Compound King 🧋',
        earnedBonus,
      });
    }

    if (state.points !== currentState.points) {
      saveAuraState(state, accountId);
      soundFx.playCoinPing();
      triggerConfetti({ particleCount: 50 });
      this.checkLevelUp(currentState, state);
    }
  }
}

export const questTracker = new QuestTrackerService();

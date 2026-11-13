import { AuraBadge, AuraQuest, AuraState, AuraTier } from './auraTypes';

const STORAGE_KEY = 'ai4good_aura_state_v1';

export const INITIAL_QUESTS: AuraQuest[] = [
  {
    id: 'quest-trade',
    title: 'Paper Trade Spot Order',
    category: 'trading',
    rewardAura: 200,
    completed: false,
    targetTab: 'trading',
    description: 'Execute a whole-share trade with live Yahoo or 2024 pricing.',
    icon: '⚡',
  },
  {
    id: 'quest-quiz',
    title: 'Ace a Financial Quiz',
    category: 'learning',
    rewardAura: 350,
    completed: false,
    targetTab: 'learning',
    description: 'Score 80%+ on CDs, HYSAs, Stocks or Global Strategy Labs.',
    icon: '📚',
  },
  {
    id: 'quest-sim',
    title: 'Advance Historical Session',
    category: 'simulation',
    rewardAura: 150,
    completed: false,
    targetTab: 'simulation',
    description: 'Step forward one session without future price leakage.',
    icon: '⏳',
  },
  {
    id: 'quest-calc',
    title: 'Model Compound APY Math',
    category: 'calculator',
    rewardAura: 100,
    completed: false,
    targetTab: 'calculator',
    description: 'Compare high-yield APY vs. standard 0.01% checking accounts.',
    icon: '🧮',
  },
  {
    id: 'quest-tutor',
    title: 'Consult AI Financial Tutor',
    category: 'tutor',
    rewardAura: 100,
    completed: false,
    targetTab: 'tutor',
    description: 'Ask AI Tutor about ETF diversification or Boba spending habits.',
    icon: '🤖',
  },
];

export const INITIAL_BADGES: AuraBadge[] = [
  {
    id: 'badge-sigma-scalper',
    title: 'Sigma Scalper',
    tagline: 'W Trades Only',
    auraBonus: 500,
    unlocked: true,
    icon: '🗿',
    criteria: 'Executed first paper trade without losing real capital.',
  },
  {
    id: 'badge-diamond-hands',
    title: 'Diamond Hands',
    tagline: 'Held Through Volatility',
    auraBonus: 750,
    unlocked: true,
    icon: '💎',
    criteria: 'Simulated multi-day holding across market cycles.',
  },
  {
    id: 'badge-compound-king',
    title: 'Compound King',
    tagline: 'Boba Math Unlocked',
    auraBonus: 600,
    unlocked: false,
    icon: '🧋',
    criteria: 'Turned $25/mo coffee habit into a $15k compounding projection.',
  },
  {
    id: 'badge-zero-leak',
    title: 'Zero Lookahead Oracle',
    tagline: 'No Future Bias',
    auraBonus: 1000,
    unlocked: false,
    icon: '🔮',
    criteria: 'Tested an investing strategy using historical close limits only.',
  },
  {
    id: 'badge-infinite-rizz',
    title: 'Infinite Aura Mogul',
    tagline: 'Top 0.1% Financial IQ',
    auraBonus: 2500,
    unlocked: false,
    icon: '👑',
    criteria: 'Reached 10,000+ Lifetime Aura points.',
  },
];

export function computeTier(points: number): { tier: AuraTier; level: number; nextTierPoints: number } {
  if (points < 1000) {
    return { tier: 'NPC Saver 💤', level: 1, nextTierPoints: 1000 };
  } else if (points < 2500) {
    return { tier: 'Cash Flow Apprentice 🌱', level: 2, nextTierPoints: 2500 };
  } else if (points < 5000) {
    return { tier: 'Market Rizzler ✨', level: 3, nextTierPoints: 5000 };
  } else if (points < 10000) {
    return { tier: 'Sigma Investor 🗿', level: 4, nextTierPoints: 10000 };
  } else {
    return { tier: 'Infinite Aura Gigachad 👑', level: 5, nextTierPoints: 25000 };
  }
}

export function loadAuraState(): AuraState {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      const tierInfo = computeTier(parsed.points ?? 3450);
      return {
        points: parsed.points ?? 3450,
        streakDays: parsed.streakDays ?? 3,
        lastClaimDate: parsed.lastClaimDate ?? null,
        multiplier: parsed.multiplier ?? 1.5,
        tier: tierInfo.tier,
        level: tierInfo.level,
        nextTierPoints: tierInfo.nextTierPoints,
        quests: parsed.quests?.length ? parsed.quests : INITIAL_QUESTS,
        badges: parsed.badges?.length ? parsed.badges : INITIAL_BADGES,
      };
    }
  } catch {
    // fallback if parse or localStorage fails
  }

  const defaultPoints = 3450;
  const tierInfo = computeTier(defaultPoints);
  return {
    points: defaultPoints,
    streakDays: 3,
    lastClaimDate: null,
    multiplier: 1.5,
    tier: tierInfo.tier,
    level: tierInfo.level,
    nextTierPoints: tierInfo.nextTierPoints,
    quests: INITIAL_QUESTS,
    badges: INITIAL_BADGES,
  };
}

export function saveAuraState(state: AuraState): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // ignore
  }
}

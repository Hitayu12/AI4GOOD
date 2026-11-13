export type AuraTier =
  | 'NPC Saver 💤'
  | 'Cash Flow Apprentice 🌱'
  | 'Market Rizzler ✨'
  | 'Sigma Investor 🗿'
  | 'Infinite Aura Gigachad 👑';

export interface AuraQuest {
  id: string;
  title: string;
  category: 'trading' | 'learning' | 'simulation' | 'calculator' | 'tutor';
  rewardAura: number;
  completed: boolean;
  targetTab: 'home' | 'portfolio' | 'trading' | 'simulation' | 'learning' | 'calculator' | 'tutor' | 'status';
  description: string;
  icon: string;
}

export interface AuraBadge {
  id: string;
  title: string;
  tagline: string;
  auraBonus: number;
  unlocked: boolean;
  icon: string;
  criteria: string;
}

export interface AuraState {
  points: number;
  streakDays: number;
  lastClaimDate: string | null;
  multiplier: number;
  tier: AuraTier;
  level: number;
  nextTierPoints: number;
  quests: AuraQuest[];
  badges: AuraBadge[];
}

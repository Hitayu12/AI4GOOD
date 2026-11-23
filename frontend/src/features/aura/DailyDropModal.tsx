import { useState, useId, useEffect } from 'react';
import { AuraState } from './auraTypes';
import { computeTier, saveAuraState } from './auraService';
import { soundFx } from '../gamification/soundFxService';
import { triggerConfetti } from '../../components/common/CelebrationConfetti';
import { useModalFocus } from '../../components/common/useModalFocus';

export interface DailyDropModalProps {
  isOpen: boolean;
  onClose: () => void;
  auraState: AuraState;
  onAuraStateChange?: (updated: AuraState) => void;
  onUpdateAura?: (updated: AuraState) => void;
}

interface DropOutcome {
  tier: 'Legendary' | 'Epic' | 'Rare' | 'Common';
  points: number;
  multiplierBoost?: number;
  badgeTitle?: string;
  badgeIcon?: string;
  title: string;
  flavor: string;
  gradient: string;
  borderGlow: string;
}

const POSSIBLE_OUTCOMES: DropOutcome[] = [
  {
    tier: 'Legendary',
    points: 2500,
    multiplierBoost: 2.0,
    title: '👑 Infinite Rizz Jackpot!',
    flavor: 'Mythic tier drop! 2,500 Aura & 2.0x permanent multiplier boost awarded!',
    gradient: 'from-amber-400 via-pink-500 to-purple-600',
    borderGlow: 'border-amber-400/80 shadow-[0_0_25px_rgba(251,191,36,0.4)]',
  },
  {
    tier: 'Epic',
    points: 1000,
    badgeTitle: 'Lucky Bull',
    badgeIcon: '🍀',
    title: '🍀 Lucky Bull Master Crate!',
    flavor: 'Epic drop! +1,000 Aura points and the exclusive Lucky Bull trophy unlocked!',
    gradient: 'from-purple-500 via-indigo-600 to-cyan-400',
    borderGlow: 'border-purple-400/80 shadow-[0_0_25px_rgba(168,85,247,0.4)]',
  },
  {
    tier: 'Rare',
    points: 500,
    multiplierBoost: 1.75,
    title: '⚡ 2x Streak Multiplier Surge!',
    flavor: 'Rare drop! +500 Aura points plus an elevated streak multiplier!',
    gradient: 'from-cyan-400 to-blue-600',
    borderGlow: 'border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.4)]',
  },
  {
    tier: 'Common',
    points: 250,
    title: '🌱 Cash Flow Starter Pack!',
    flavor: 'Solid foundation! +250 Aura points to level up your investing bankroll.',
    gradient: 'from-emerald-400 to-teal-600',
    borderGlow: 'border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.3)]',
  },
];

export function DailyDropModal({
  isOpen,
  onClose,
  auraState,
  onAuraStateChange,
  onUpdateAura,
}: DailyDropModalProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useModalFocus(isOpen, onClose);

  const todayStr = new Date().toISOString().split('T')[0];
  const isAlreadyClaimed = auraState.lastLuckyDropDate === todayStr;

  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [revealedOutcomes, setRevealedOutcomes] = useState<DropOutcome[] | null>(null);

  useEffect(() => {
    if (isOpen && !isAlreadyClaimed) {
      setSelectedCardIdx(null);
      setRevealedOutcomes(null);
    }
  }, [isOpen, isAlreadyClaimed]);

  if (!isOpen) return null;

  const handlePickCard = (cardIdx: number) => {
    if (selectedCardIdx !== null || isAlreadyClaimed) return;

    soundFx.playMysteryCardFlip();

    // Weighted random selection: 60% Common, 25% Rare, 12% Epic, 3% Legendary
    const roll = Math.random() * 100;
    let chosenOutcome: DropOutcome;
    if (roll < 3) {
      chosenOutcome = POSSIBLE_OUTCOMES[0]; // Legendary
    } else if (roll < 15) {
      chosenOutcome = POSSIBLE_OUTCOMES[1]; // Epic
    } else if (roll < 40) {
      chosenOutcome = POSSIBLE_OUTCOMES[2]; // Rare
    } else {
      chosenOutcome = POSSIBLE_OUTCOMES[3]; // Common
    }

    // Fill other two cards with random outcomes for tease
    const otherOutcomes = POSSIBLE_OUTCOMES.filter((o) => o.tier !== chosenOutcome.tier);
    const outcomes: DropOutcome[] = [];
    let otherIdx = 0;
    for (let i = 0; i < 3; i++) {
      if (i === cardIdx) {
        outcomes.push(chosenOutcome);
      } else {
        outcomes.push(otherOutcomes[otherIdx % otherOutcomes.length]);
        otherIdx++;
      }
    }

    setSelectedCardIdx(cardIdx);
    setRevealedOutcomes(outcomes);

    // Apply reward to Aura state
    const newPoints = auraState.points + chosenOutcome.points;
    const tierInfo = computeTier(newPoints);
    const newMultiplier = chosenOutcome.multiplierBoost
      ? Math.max(auraState.multiplier, chosenOutcome.multiplierBoost)
      : auraState.multiplier;

    const updatedState: AuraState = {
      ...auraState,
      points: newPoints,
      multiplier: newMultiplier,
      lastLuckyDropDate: todayStr,
      tier: tierInfo.tier,
      level: tierInfo.level,
      nextTierPoints: tierInfo.nextTierPoints,
    };

    if (!onAuraStateChange && !onUpdateAura) saveAuraState(updatedState);
    onAuraStateChange?.(updatedState);
    onUpdateAura?.(updatedState);

    setTimeout(() => {
      soundFx.playCoinPing();
      triggerConfetti({ particleCount: chosenOutcome.tier === 'Legendary' ? 120 : 80 });
    }, 200);
  };

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      data-testid="daily-drop-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-3xl border border-purple-500/50 bg-[#090d16] p-6 sm:p-8 text-white shadow-2xl shadow-purple-500/20 space-y-6">
        {/* Glow Spheres */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 text-slate-950 font-black flex items-center justify-center text-2xl shadow-md shadow-pink-500/25">
              🎁
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id={titleId} className="text-xl font-black text-white tracking-tight">
                  Daily Mystery Crate Drop
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  DEMO REWARD
                </span>
              </div>
              <p id={descId} className="text-xs text-slate-400 mt-0.5">
                Pick one card for a virtual Aura reward. A new reward opens at midnight UTC.
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-daily-drop-btn"
            onClick={onClose}
            aria-label="Close Mystery Drop Modal"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 3 Holographic Mystery Cards */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {[0, 1, 2].map((cardIdx) => {
            const isRevealed = revealedOutcomes !== null;
            const isPicked = selectedCardIdx === cardIdx;
            const outcome = revealedOutcomes ? revealedOutcomes[cardIdx] : null;

            return (
              <button
                key={cardIdx}
                type="button"
                data-testid={`lucky-card-${cardIdx}`}
                disabled={isRevealed || isAlreadyClaimed}
                onClick={() => handlePickCard(cardIdx)}
                className={`group relative rounded-2xl p-5 min-h-[220px] flex flex-col items-center justify-between transition-all duration-300 text-center cursor-pointer select-none ${
                  isRevealed
                    ? isPicked
                      ? `bg-slate-900 border-2 ${outcome?.borderGlow} scale-105 ring-2 ring-white/30`
                      : 'bg-slate-950/60 border border-slate-800 opacity-60'
                    : isAlreadyClaimed
                    ? 'bg-slate-900/60 border border-slate-800 opacity-50 cursor-not-allowed'
                    : 'bg-gradient-to-b from-slate-900 via-[#0d1322] to-slate-900 border border-purple-500/30 hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:-translate-y-1.5'
                }`}
              >
                {!isRevealed ? (
                  <>
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-400/80 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                      Card 0{cardIdx + 1}
                    </span>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600/30 via-pink-600/20 to-cyan-500/30 border border-white/10 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-inner">
                      ❓
                    </div>
                    <div>
                      <span className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors block">
                        Tap to Reveal
                      </span>
                      <span className="text-[10px] text-slate-400">Up to 2,500 Aura</span>
                    </div>
                  </>
                ) : outcome ? (
                  <>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isPicked
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 animate-pulse'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {outcome.tier}
                    </span>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500 to-amber-400 text-slate-950 font-black flex items-center justify-center text-3xl shadow-lg">
                      {outcome.badgeIcon || '⚡'}
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-black text-white block">
                        +{outcome.points} AURA
                      </span>
                      <span className="text-[10px] text-slate-300 line-clamp-2">
                        {outcome.title}
                      </span>
                    </div>
                  </>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Status / Claim Notice */}
        <div className="relative z-10 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{isAlreadyClaimed ? '⏳' : '🎲'}</span>
            <span className="text-slate-300">
              {isAlreadyClaimed ? (
                <>
                  <strong className="text-white">Already claimed today!</strong> Refreshes tomorrow at midnight UTC.
                </>
              ) : selectedCardIdx !== null ? (
                <>
                  <strong className="text-emerald-400">Drop Claimed!</strong> Points added to your bankroll &amp; prestige bar!
                </>
              ) : (
                <>
                  Each card reveals a practice reward of up to 2,500 Aura.
                </>
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

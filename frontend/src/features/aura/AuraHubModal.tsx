import { useEffect, useState } from 'react';
import { AuraBadge, AuraQuest, AuraState } from './auraTypes';
import { computeTier, saveAuraState } from './auraService';

export interface AuraHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  auraState: AuraState;
  onUpdateAura: (newState: AuraState) => void;
  onNavigateTab: (
    tab: 'home' | 'portfolio' | 'trading' | 'simulation' | 'learning' | 'calculator' | 'tutor' | 'status'
  ) => void;
}

export function AuraHubModal({
  isOpen,
  onClose,
  auraState,
  onUpdateAura,
  onNavigateTab,
}: AuraHubModalProps) {
  const [claimCelebration, setClaimCelebration] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const hasClaimedToday = auraState.lastClaimDate === todayStr;

  const handleClaimDaily = () => {
    if (hasClaimedToday) return;
    const bonus = Math.round(250 * auraState.multiplier);
    const newPoints = auraState.points + bonus;
    const newStreak = auraState.streakDays + 1;
    const tierInfo = computeTier(newPoints);

    const updated: AuraState = {
      ...auraState,
      points: newPoints,
      streakDays: newStreak,
      lastClaimDate: todayStr,
      tier: tierInfo.tier,
      level: tierInfo.level,
      nextTierPoints: tierInfo.nextTierPoints,
    };
    onUpdateAura(updated);
    saveAuraState(updated);
    setClaimCelebration(`+${bonus} AURA FARMED! 🔥 Streak increased to ${newStreak} days!`);
    setTimeout(() => setClaimCelebration(null), 3500);
  };

  const currentLevelFloor =
    auraState.level === 1
      ? 0
      : auraState.level === 2
      ? 1000
      : auraState.level === 3
      ? 2500
      : auraState.level === 4
      ? 5000
      : 10000;
  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        ((auraState.points - currentLevelFloor) /
          (auraState.nextTierPoints - currentLevelFloor)) *
          100
      )
    )
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aura Farming Hub"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-purple-500/30 shadow-2xl overflow-hidden animate-scaleUp max-h-[90vh] flex flex-col text-slate-100 ring-1 ring-purple-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Cyber Holographic Aura Header */}
        <div className="relative overflow-hidden p-6 bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-950 border-b border-purple-800/40 shrink-0">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  ⚡ AURA FARMING HQ
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  <span>🔥</span>
                  <span>{auraState.streakDays}-Day Streak</span>
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2 mt-1">
                <span>The Financial Aura Hub</span>
                <span className="text-xl">🗿</span>
              </h2>
              <p className="text-xs text-slate-300">
                Farm aura points through smart trading, crushing quizzes, and mastering financial habits.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Aura Hub"
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition-colors border border-slate-700 shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Aura Score & Rank Card Banner */}
          <div className="mt-5 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">
                Total Trading Aura
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight bg-gradient-to-r from-purple-200 via-pink-200 to-amber-200 bg-clip-text text-transparent">
                  +{auraState.points.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-amber-300">AURA</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-black text-emerald-400">
                  {auraState.tier}
                </span>
                <span className="text-[10px] text-slate-400">
                  (Level {auraState.level} of 5)
                </span>
              </div>
            </div>

            {/* Daily Claim Button */}
            <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleClaimDaily}
                disabled={hasClaimedToday}
                className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-lg ${
                  hasClaimedToday
                    ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-80'
                    : 'bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 hover:from-amber-300 hover:to-pink-400 text-slate-950 shadow-amber-500/25 ring-2 ring-amber-300/40 transform hover:-translate-y-0.5 cursor-pointer'
                }`}
              >
                <span>{hasClaimedToday ? '✅' : '🎁'}</span>
                <span>
                  {hasClaimedToday
                    ? 'Daily Aura Claimed'
                    : `Claim Daily +${Math.round(250 * auraState.multiplier)} Aura`}
                </span>
              </button>
              <span className="text-[10px] text-slate-400 font-medium">
                {hasClaimedToday
                  ? 'Come back tomorrow for your streak bonus'
                  : `Includes ${auraState.multiplier}x Streak Boost`}
              </span>
            </div>
          </div>

          {claimCelebration && (
            <div className="mt-3 p-2.5 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-200 text-xs font-bold text-center animate-fadeIn">
              🎉 {claimCelebration}
            </div>
          )}

          {/* Level Progress Bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
              <span>Tier Progress to Next Prestige Rank</span>
              <span className="font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden ring-1 ring-white/10">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-amber-400 rounded-full transition-all duration-500 shadow-sm shadow-purple-500/50"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Daily Aura Quests */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>🎯</span>
                <span>Daily Aura Quests</span>
              </h3>
              <span className="text-[10px] text-purple-300 uppercase font-bold tracking-wider">
                Reset Daily at Midnight UTC
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {auraState.quests.map((quest: AuraQuest) => (
                <div
                  key={quest.id}
                  className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-slate-900 border border-slate-700 shrink-0">
                      {quest.icon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {quest.title}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          +{quest.rewardAura} AURA
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {quest.description}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateTab(quest.targetTab);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shrink-0 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span>Go</span>
                    <span>→</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Aura Prestige Badges Showcase */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>🏆</span>
              <span>Aura Prestige Badges</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {auraState.badges.map((badge: AuraBadge) => (
                <div
                  key={badge.id}
                  className={`p-3.5 rounded-2xl border transition-all space-y-1.5 ${
                    badge.unlocked
                      ? 'bg-gradient-to-br from-slate-800/90 to-purple-950/40 border-purple-500/40 shadow-xs'
                      : 'bg-slate-800/30 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{badge.icon}</span>
                      <span className="text-xs font-black text-white">
                        {badge.title}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        badge.unlocked
                          ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {badge.unlocked ? 'UNLOCKED' : 'LOCKED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-300 font-semibold">
                    "{badge.tagline}" • +{badge.auraBonus} Aura
                  </p>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    {badge.criteria}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Aura Philosophy / Teen Financial Rulebook */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-800/40 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-blue-300 font-bold">
              <span>💡</span>
              <span>The Financial Aura Law</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              In real wealth building, aura is earned through patience and compound APY math. Skipping high-fee debt, buying broad index funds (SPY), and testing strategies before risking real cash gives you infinite aura. Chasing meme hype loses aura every single time!
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close Aura Hub
          </button>
        </div>
      </div>
    </div>
  );
}

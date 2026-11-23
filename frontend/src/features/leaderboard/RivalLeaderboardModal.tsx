import { useState, useId } from 'react';
import { AuraState } from '../aura/auraTypes';
import { soundFx } from '../gamification/soundFxService';

export interface RivalLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  auraState: AuraState;
}

interface RivalCompetitor {
  id: string;
  rank: number;
  username: string;
  avatar: string;
  points: number;
  streakDays: number;
  strategy: string;
  isUser?: boolean;
}

const STATIC_RIVALS: Omit<RivalCompetitor, 'rank'>[] = [
  {
    id: 'rival-1',
    username: 'AlphaWolf_NYC',
    avatar: '🐺',
    points: 14820,
    streakDays: 12,
    strategy: 'NVDA & Tech Momentum',
  },
  {
    id: 'rival-2',
    username: 'QuantumHedge_Bot',
    avatar: '🤖',
    points: 11450,
    streakDays: 9,
    strategy: 'Zero-Lookahead Sim',
  },
  {
    id: 'rival-3',
    username: 'BobaCompoundingQueen',
    avatar: '🧋',
    points: 8900,
    streakDays: 15,
    strategy: 'HYSA & S&P 500 DCA',
  },
  {
    id: 'rival-5',
    username: 'WSB_YoloSurvivor',
    avatar: '🦍',
    points: 4200,
    streakDays: 4,
    strategy: 'High Volatility Spot Trades',
  },
  {
    id: 'rival-6',
    username: 'YieldFarmer_Kai',
    avatar: '🌱',
    points: 2350,
    streakDays: 3,
    strategy: 'CD Ladders & Cash Reserve',
  },
  {
    id: 'rival-7',
    username: 'PaperHands_Pete',
    avatar: '💤',
    points: 890,
    streakDays: 1,
    strategy: 'Idle Cash Saver',
  },
];

export function RivalLeaderboardModal({
  isOpen,
  onClose,
  auraState,
}: RivalLeaderboardModalProps) {
  const titleId = useId();
  const descId = useId();
  const [activeTab, setActiveTab] = useState<'weekly' | 'alltime' | 'collegiate'>('weekly');
  const [challengedRival, setChallengedRival] = useState<string | null>(null);

  if (!isOpen) return null;

  // Insert user into roster dynamically based on actual points
  const userEntry: Omit<RivalCompetitor, 'rank'> = {
    id: 'user-current',
    username: 'YOU (Current Player)',
    avatar: '✨',
    points: auraState.points,
    streakDays: auraState.streakDays,
    strategy: `${auraState.tier.split(' ')[0]} Active`,
    isUser: true,
  };

  const allCompetitors = [...STATIC_RIVALS, userEntry].sort((a, b) => b.points - a.points);
  const rankedRoster: RivalCompetitor[] = allCompetitors.map((comp, idx) => ({
    ...comp,
    rank: idx + 1,
  }));

  const userRank = rankedRoster.find((r) => r.isUser)?.rank ?? 4;

  const handleChallenge = (username: string) => {
    soundFx.playTactileClick();
    soundFx.playCoinPing();
    setChallengedRival(username);
    setTimeout(() => setChallengedRival(null), 3000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      data-testid="rival-leaderboard-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-3xl rounded-3xl border border-purple-500/50 bg-[#090d16] p-6 sm:p-8 text-white shadow-2xl shadow-purple-500/20 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Glow Spheres */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 text-slate-950 font-black flex items-center justify-center text-2xl shadow-md shadow-purple-500/30">
              💎
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id={titleId} className="text-xl font-black text-white tracking-tight">
                  Diamond Trader League
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  TIER 1 • GLOBAL
                </span>
              </div>
              <p id={descId} className="text-xs text-slate-400 mt-0.5">
                Compete against rival student traders worldwide. Top 3 promote to Infinite Mogul Tier!
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-leaderboard-btn"
            onClick={onClose}
            aria-label="Close Rival Leaderboard Modal"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Season Countdown & User Placement Card */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/40 shadow-sm flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider block">
                Season Closes In
              </span>
              <span className="font-mono font-black text-white text-sm">
                2d 14h 32m
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-sm flex items-center gap-3">
            <span className="text-2xl">🏅</span>
            <div>
              <span className="text-[10px] uppercase font-bold text-cyan-300 tracking-wider block">
                Your Global Rank
              </span>
              <span className="font-mono font-black text-white text-sm">
                #{userRank} of {rankedRoster.length}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 shadow-sm flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider block">
                Your Lifetime Aura
              </span>
              <span className="font-mono font-black text-white text-sm">
                {auraState.points.toLocaleString()} Points
              </span>
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="relative z-10 flex items-center gap-2 border-b border-slate-800 pb-3">
          {[
            { id: 'weekly' as const, label: 'Weekly League', icon: '⚡' },
            { id: 'alltime' as const, label: 'All-Time Hall of Fame', icon: '👑' },
            { id: 'collegiate' as const, label: 'Collegiate Rivals', icon: '🎓' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                soundFx.playTactileClick();
                setActiveTab(tab.id);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-slate-900/70 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Leaderboard Table */}
        <div className="relative z-10 space-y-2">
          {rankedRoster.map((competitor) => {
            const isTop3 = competitor.rank <= 3;
            const isUser = competitor.isUser;

            return (
              <div
                key={competitor.id}
                data-testid={isUser ? 'user-rank-row' : undefined}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isUser
                    ? 'bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.25)] ring-2 ring-purple-400/40'
                    : isTop3
                    ? 'bg-slate-900/90 border-amber-500/40 hover:border-amber-400 shadow-sm'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <span
                    className={`w-8 h-8 rounded-xl font-mono font-black text-xs flex items-center justify-center shrink-0 ${
                      competitor.rank === 1
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                        : competitor.rank === 2
                        ? 'bg-slate-200 text-slate-950 shadow-md'
                        : competitor.rank === 3
                        ? 'bg-amber-700 text-white shadow-md'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    #{competitor.rank}
                  </span>

                  {/* Competitor Avatar & Name */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{competitor.avatar}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs sm:text-sm font-black ${isUser ? 'text-amber-300' : 'text-white'}`}>
                          {competitor.username}
                        </span>
                        {isUser && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-300 border border-purple-400/40">
                            YOU
                          </span>
                        )}
                        {isTop3 && (
                          <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            PROMOTION
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {competitor.strategy} • 🔥 {competitor.streakDays}d streak
                      </span>
                    </div>
                  </div>
                </div>

                {/* Points & Challenge Button */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-mono font-black text-xs sm:text-sm text-cyan-300 block">
                      {competitor.points.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      Aura Points
                    </span>
                  </div>

                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => handleChallenge(competitor.username)}
                      className="hidden sm:flex px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-purple-600 text-white font-bold text-[11px] transition-colors border border-slate-700 cursor-pointer"
                    >
                      <span>⚔️ Duel</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {challengedRival && (
          <div className="relative z-10 p-3 rounded-2xl bg-purple-950/80 border border-purple-500/60 text-purple-200 text-xs flex items-center justify-between animate-fadeIn">
            <span>⚔️ <strong>Duel Challenge Sent</strong> to {challengedRival}! Paper trade this session to out-gain them!</span>
            <span>+25 Aura</span>
          </div>
        )}

        {/* Bottom Modal Actions */}
        <div className="relative z-10 pt-2 flex items-center justify-between border-t border-slate-800 text-xs text-slate-400">
          <span>Top 3 traders receive the <strong>Golden Bull 🐂</strong> badge at midnight Sunday UTC.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
          >
            Close Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}

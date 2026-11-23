import { useState } from 'react';
import { soundFx } from '../gamification/soundFxService';
import { learnerStorageKey } from '../practiceStorage';

export interface MarketSentimentArenaProps {
  onVoteAura?: (earnedAura: number) => void;
  className?: string;
  storageScope?: string;
}

interface SymbolSentiment {
  symbol: string;
  name: string;
  bullishVotes: number;
  bearishVotes: number;
  hotTake: string;
  reactionComments: { author: string; avatar: string; text: string; side: 'bull' | 'bear' }[];
}

const SENTIMENT_DATA: Record<string, SymbolSentiment> = {
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA (AI Chips & GPUs)',
    bullishVotes: 1360,
    bearishVotes: 480,
    hotTake: 'Blackwell ultra-clusters & sovereign AI driving unprecedented datacenter CapEx.',
    reactionComments: [
      { author: 'SigmaScalper', avatar: '🗿', text: 'Blackwell chip ramp is guaranteed cash flow 🚀', side: 'bull' },
      { author: 'MacroBear_01', avatar: '🐻', text: 'Bro really thinks NVDA can double from here 💀', side: 'bear' },
    ],
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla (EVs & Clean Tech)',
    bullishVotes: 1240,
    bearishVotes: 890,
    hotTake: 'Robotaxi autonomy roadmap & energy storage margins dividing market consensus.',
    reactionComments: [
      { author: 'CyberInvestor', avatar: '⚡', text: 'Energy Megapacks are growing faster than cars 🔥', side: 'bull' },
      { author: 'ValueSeeker', avatar: '📉', text: 'Auto gross margins are under heavy pressure.', side: 'bear' },
    ],
  },
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple (Consumer Tech & AI)',
    bullishVotes: 1180,
    bearishVotes: 270,
    hotTake: 'Apple Intelligence upgrade cycle provides strong recurring services moat.',
    reactionComments: [
      { author: 'BobaQueen', avatar: '🧋', text: '2+ Billion active devices = unstoppable moat 💎', side: 'bull' },
      { author: 'ShortTrader', avatar: '💤', text: 'Hardware upgrade cycles are slowing down.', side: 'bear' },
    ],
  },
};

const STORAGE_VOTES_KEY = 'ai4good_market_sentiment_votes_v1';

export function MarketSentimentArena({ onVoteAura, className = '', storageScope }: MarketSentimentArenaProps) {
  const votesKey = learnerStorageKey(STORAGE_VOTES_KEY, storageScope);
  const [selectedSymbol, setSelectedSymbol] = useState<'NVDA' | 'TSLA' | 'AAPL'>('NVDA');
  const [userVotes, setUserVotes] = useState<Record<string, 'bull' | 'bear'>>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(votesKey);
        return saved ? JSON.parse(saved) ?? {} : {};
      }
    } catch {
      // ignore
    }
    return {};
  });

  const activeData = SENTIMENT_DATA[selectedSymbol];
  const userVote = userVotes[selectedSymbol];

  const totalVotes = activeData.bullishVotes + activeData.bearishVotes + (userVote ? 1 : 0);
  const bullVotesCount = activeData.bullishVotes + (userVote === 'bull' ? 1 : 0);
  const bullPct = Math.round((bullVotesCount / totalVotes) * 100);
  const bearPct = 100 - bullPct;

  const handleVote = (side: 'bull' | 'bear') => {
    if (userVote) return;

    soundFx.playTactileClick();
    soundFx.playCoinPing();

    const nextVotes = { ...userVotes, [selectedSymbol]: side };
    setUserVotes(nextVotes);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(votesKey, JSON.stringify(nextVotes));
      }
    } catch {
      // ignore
    }

    onVoteAura?.(100);
  };

  return (
    <div
      data-testid="market-sentiment-arena"
      className={`rounded-3xl border border-indigo-500/40 bg-gradient-to-br from-slate-900/95 via-indigo-950/40 to-slate-900/95 backdrop-blur-xl p-5 sm:p-6 text-white shadow-xl space-y-5 ${className}`}
    >
      {/* Header & Ticker Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-rose-500 text-slate-950 font-black flex items-center justify-center text-xl shadow-md">
            ⚖️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white tracking-tight">
                Market sentiment practice poll
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Demo
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Compare sample opinions and earn 100 Aura for adding your practice vote.
            </p>
          </div>
        </div>

        {/* Ticker Selector Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          {(['NVDA', 'TSLA', 'AAPL'] as const).map((sym) => (
            <button
              key={sym}
              type="button"
              data-testid={`sentiment-tab-${sym}`}
              onClick={() => {
                soundFx.playTactileClick();
                setSelectedSymbol(sym);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                selectedSymbol === sym
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Active Symbol Headline & Hot Take */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-cyan-300">
            {activeData.symbol} • {activeData.name}
          </span>
          <p className="text-xs text-slate-300 mt-0.5 italic">
            "{activeData.hotTake}"
          </p>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          {totalVotes.toLocaleString()} sample votes, including your vote if cast
        </span>
      </div>

      {/* Dual Progress Sentiment Bar */}
      <div className="space-y-1.5" data-testid="sentiment-bar">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-emerald-400 flex items-center gap-1">
            <span>🐂 Bullish</span>
            <span className="font-mono">{bullPct}%</span>
          </span>
          <span className="text-rose-400 flex items-center gap-1">
            <span className="font-mono">{bearPct}%</span>
            <span>Bearish 🐻</span>
          </span>
        </div>

        <div className="w-full h-3.5 rounded-full bg-slate-950 overflow-hidden flex p-0.5 border border-slate-800">
          <div
            className="h-full rounded-l-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
            style={{ width: `${bullPct}%` }}
          />
          <div
            className="h-full rounded-r-full bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-500"
            style={{ width: `${bearPct}%` }}
          />
        </div>
      </div>

      {/* Voting Stance Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          data-testid="vote-bullish-btn"
          disabled={Boolean(userVote)}
          onClick={() => handleVote('bull')}
          className={`py-3 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
            userVote === 'bull'
              ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300 shadow-emerald-500/30'
              : userVote
              ? 'bg-slate-900 border border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 border border-emerald-400/40 hover:-translate-y-0.5'
          }`}
        >
          <span>🐂</span>
          <span>{userVote === 'bull' ? 'Voted Bullish! ✓' : 'Vote Bullish (🚀 +100 Aura)'}</span>
        </button>

        <button
          type="button"
          data-testid="vote-bearish-btn"
          disabled={Boolean(userVote)}
          onClick={() => handleVote('bear')}
          className={`py-3 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
            userVote === 'bear'
              ? 'bg-rose-500 text-slate-950 ring-2 ring-rose-300 shadow-rose-500/30'
              : userVote
              ? 'bg-slate-900 border border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25 border border-rose-400/40 hover:-translate-y-0.5'
          }`}
        >
          <span>🐻</span>
          <span>{userVote === 'bear' ? 'Voted Bearish! ✓' : 'Vote Bearish (📉 +100 Aura)'}</span>
        </button>
      </div>

      {/* Community Banter Comments */}
      <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
          Live Community Banter
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {activeData.reactionComments.map((comment, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                comment.side === 'bull'
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
              }`}
            >
              <span className="text-base shrink-0">{comment.avatar}</span>
              <div>
                <strong className="text-[11px] block text-white">{comment.author}</strong>
                <p className="text-[11px] text-slate-300 mt-0.5">{comment.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

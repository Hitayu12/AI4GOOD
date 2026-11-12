import { useEffect } from 'react';
import { formatUSD } from './tradingService';

export interface ExecutedTradeReceipt {
  symbol: string;
  name: string;
  sector?: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  grossAmount: number;
  remainingCashDollars: number;
  mode: 'live_yahoo' | 'simulation';
  timestamp: string;
  sessionDate?: string;
}

export interface TradeConfirmationModalProps {
  receipt: ExecutedTradeReceipt | null;
  onClose: () => void;
}

export function TradeConfirmationModal({ receipt, onClose }: TradeConfirmationModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!receipt) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [receipt, onClose]);

  if (!receipt) return null;

  const isBuy = receipt.side === 'buy';

  return (
    <div
      data-testid="trade-confirmation-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        data-testid="trade-confirmation-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Trade Execution Confirmation"
        className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200/90 shadow-2xl overflow-hidden animate-scaleUp"
      >
        {/* Modal Header */}
        <div
          className={`relative overflow-hidden p-6 text-white ${
            isBuy
              ? 'bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900'
              : 'bg-gradient-to-br from-purple-600 via-indigo-700 to-slate-900'
          }`}
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-12 -mt-12" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                <span>{isBuy ? '🎉' : '💰'}</span>
                <span>Order Executed Successfully</span>
              </span>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
                {isBuy ? 'You Bought ' : 'You Sold '}
                <span className="underline decoration-white/40 underline-offset-4">
                  {receipt.quantity.toLocaleString()} {receipt.symbol}
                </span>
                !
              </h2>

              <p className="text-xs text-white/80 font-medium">
                {receipt.name} {receipt.sector ? `• ${receipt.sector}` : ''}
              </p>

              {/* Gamified XP Reward Toast */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 shadow-sm mt-1">
                <span>⚡ +50 XP</span>
                <span>• Trading Skill Unlocked!</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close trade confirmation"
              className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/35 text-white flex items-center justify-center font-bold text-sm transition-colors border border-white/20 shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body / Trade Receipt Breakdown */}
        <div className="p-6 space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200/70">
              <span>Execution Summary</span>
              <span className="font-mono text-[11px] text-slate-400">
                {receipt.mode === 'live_yahoo' ? '● Real-Time Feed' : `Session ${receipt.sessionDate || 'Backtest'}`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-white border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 block">Order Side</span>
                <span
                  className={`inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider ${
                    isBuy ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {receipt.side.toUpperCase()}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 block">Shares Filled</span>
                <span className="font-mono font-black text-slate-900 text-base mt-0.5 block">
                  {receipt.quantity.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 block">Fill Price</span>
                <span className="font-mono font-black text-slate-900 text-base mt-0.5 block">
                  {formatUSD(receipt.price)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  {isBuy ? 'Total Cost' : 'Total Proceeds'}
                </span>
                <span
                  className={`font-mono font-black text-base mt-0.5 block ${
                    isBuy ? 'text-blue-900' : 'text-emerald-700'
                  }`}
                >
                  {formatUSD(receipt.grossAmount)}
                </span>
              </div>
            </div>

            {/* Remaining Cash Notice */}
            <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-200/70 text-slate-600">
              <span className="font-medium">Remaining Available Cash:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {formatUSD(receipt.remainingCashDollars)}
              </span>
            </div>
          </div>

          {/* Educational Pro-Tip */}
          <div
            className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start gap-2.5 ${
              isBuy
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-purple-50/80 border-purple-200 text-purple-950'
            }`}
          >
            <span className="text-base">{isBuy ? '📈' : '💵'}</span>
            <div>
              {isBuy ? (
                <>
                  <strong>Position Added:</strong> You now own{' '}
                  <span className="font-bold">{receipt.quantity} shares</span> of {receipt.symbol}. You can track your daily unrealized profit/loss marked to market in the <strong>Portfolio</strong> tab!
                </>
              ) : (
                <>
                  <strong>Cash Settled:</strong> You successfully liquidated{' '}
                  <span className="font-bold">{receipt.quantity} shares</span> of {receipt.symbol}. The cash proceeds are now settled and available for immediate reinvestment.
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
              isBuy
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20'
            }`}
          >
            <span>Got it, Keep Trading</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

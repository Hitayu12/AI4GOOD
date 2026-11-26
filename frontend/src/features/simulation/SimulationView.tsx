import React, { useEffect, useState, useId, useRef, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { triggerConfetti } from '../../components/common/CelebrationConfetti';
import {
  AdvanceSimulationResponse,
  ApiError,
  DatasetMetadata,
  MarketDataBar,
  Simulation,
} from './simulationTypes';
import {
  FIXTURE_DATASET_METADATA,
  FIXTURE_DATASETS,
  filterVisibleMarketData,
  INITIAL_SIMULATION_FIXTURE,
  getReplaySessionDates,
} from './simulationFixtures';
import { SimulationService } from './simulationService';
import { TabOverviewModal } from '../../components/common/TabOverviewModal';
import { TradeConfirmationModal, ExecutedTradeReceipt } from '../trading/TradeConfirmationModal';
import { Position, Transaction } from '../trading/tradingTypes';
import { LossGainBadge } from '../portfolio/PortfolioView';
import { SYMBOL_NAMES, SYMBOL_SECTORS } from '../trading/TradingView';
import { questTracker } from '../gamification/questTrackerService';
import { soundFx } from '../gamification/soundFxService';
import { isRecord, readPractice, writePractice } from '../practiceStorage';
import { Tuck } from '../home/Tuck';
import paydayCover from '../home/payday-cover.jpg';
import '../home/campaign.css';

export interface SimulationViewProps {
  service?: SimulationService;
  initialSimulations?: Simulation[];
  defaultDataset?: DatasetMetadata;
  defaultSymbol?: string;
  storageScope?: string;
  onSimulationChange?: (sim: Simulation) => void;
  onAdvance?: (updatedSim: Simulation) => void;
}

export const MIN_STARTING_CASH_USD = 1_000;
export const MAX_STARTING_CASH_USD = 1_000_000_000;
export const DEFAULT_STARTING_CASH_USD = 10_000;

const FW_THEME_VARS = {
  '--fw-bg': '#f8f7fc',
  '--fw-ink': '#222038',
  '--fw-muted': '#615d76',
  '--fw-line': '#e8e4f1',
  '--fw-purple': '#5637ca',
  '--fw-deep': '#242042',
  '--fw-lime': '#dbfb84',
  '--fw-cover': `url(${paydayCover})`,
} as React.CSSProperties;

const TACTILE_BTN_BASE =
  'border-2 border-b-4 rounded-2xl font-black transition-all cursor-pointer active:border-b-2 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:border-b-4';

const PREDICTION_OPTIONS = [
  {
    value: 1 as const,
    emoji: '🟢',
    label: 'Higher ▲',
    subLabel: 'Goes up',
    idleClass: 'bg-[#eefbe5] text-[#225129] border-[#9fd884] hover:bg-[#e1f7d2]',
    activeClass: 'bg-[#58cc02] text-white border-[#46a302] ring-2 ring-[#58cc02]/30 shadow-sm',
  },
  {
    value: 0 as const,
    emoji: '━',
    label: 'Flat',
    subLabel: 'Stays same',
    idleClass: 'bg-[#f4f0ff] text-[#4f32a9] border-[#d3c2fa] hover:bg-[#eae2ff]',
    activeClass: 'bg-[#5637ca] text-white border-[#3c20a3] ring-2 ring-[#5637ca]/30 shadow-sm',
  },
  {
    value: -1 as const,
    emoji: '🔴',
    label: 'Lower ▼',
    subLabel: 'Goes down',
    idleClass: 'bg-[#fff0eb] text-[#8d2c1b] border-[#f4b6a2] hover:bg-[#ffe2d8]',
    activeClass: 'bg-[#ff4b4b] text-white border-[#cf2d2d] ring-2 ring-[#ff4b4b]/30 shadow-sm',
  },
];

type ReplayWallet = { cashCents: number; positions: Position[]; transactions: Transaction[] };
type SavedReplay = { simulations: Simulation[]; activeSimulationId: string; selectedSymbol: string; wallets: Record<string, ReplayWallet> };
type PredictionOutcome = 'match' | 'miss' | 'neutral' | null;

function isSavedReplay(value: unknown): value is SavedReplay {
  return isRecord(value) && typeof value.selectedSymbol === 'string'
    && Array.isArray(value.simulations) && value.simulations.length > 0
    && value.simulations.every((sim) => isRecord(sim) && typeof sim.id === 'string' && typeof sim.initial_cash === 'number'
      && typeof sim.current_session === 'string' && typeof sim.start_session === 'string' && typeof sim.end_session === 'string')
    && value.simulations.some((sim) => sim.id === value.activeSimulationId)
    && isRecord(value.wallets) && Object.values(value.wallets).every((wallet) => isRecord(wallet)
      && typeof wallet.cashCents === 'number' && Array.isArray(wallet.positions) && Array.isArray(wallet.transactions));
}

export function formatUSD(dollars: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

export function formatCashCents(cents: number): string {
  return formatUSD(cents / 100);
}

export function formatVolume(volume: number): string {
  return volume.toLocaleString('en-US');
}

function getTuckPickReaction(prediction: -1 | 0 | 1, symbol: string): string {
  if (prediction === 1) {
    return `Bullish call on ${symbol}! Now tap Advance Day → to see tomorrow's price! 🐾`;
  }
  if (prediction === 0) {
    return `Steady call on ${symbol}! Tap Advance Day → to see if buyers and sellers tie! 🐾`;
  }
  return `Spotting a dip on ${symbol}? Tap Advance Day → to test your hunch! 🐾`;
}

function getTuckIdlePrompt(
  bars: MarketDataBar[],
  dayNum: number,
  totalDays: number,
  symbol: string,
  latestClose: string,
  isCompleted: boolean
): string {
  if (isCompleted) {
    return `Whoo-hoo! You finished all ${totalDays} days! Tap +30 Days or Reset Run to play again! 🏆`;
  }
  if (bars.length >= 2) {
    const prev = parseFloat(bars[bars.length - 2].close);
    const curr = parseFloat(bars[bars.length - 1].close);
    if (curr > prev) {
      return `Day ${dayNum} of ${totalDays}: ${symbol} is trending up! What's your move, trader? 🐾`;
    }
    if (curr < prev) {
      return `Day ${dayNum} of ${totalDays}: ${symbol} dipped today! Bounce back or fall lower? 🐾`;
    }
  }
  return `Day ${dayNum} of ${totalDays}: ${symbol} is $${latestClose}. What will happen tomorrow? 🐾`;
}

function getGirlCoachTip(params: {
  isCompleted: boolean;
  predictionOutcome: PredictionOutcome;
  prediction: -1 | 0 | 1 | undefined;
  symbol: string;
  heldShares: number;
  tradeSuccessNotice: string | null;
}): string {
  const { isCompleted, predictionOutcome, prediction, symbol, heldShares, tradeSuccessNotice } = params;
  if (isCompleted) {
    return 'Round complete! Tap +30 Days above to keep trading or Reset Run to beat your score!';
  }
  if (tradeSuccessNotice) {
    return `${tradeSuccessNotice} Tap Advance Day → to see how your shares do tomorrow!`;
  }
  if (predictionOutcome === 'match') {
    return `Nice read on ${symbol}! Want to put virtual cash behind your next call?`;
  }
  if (predictionOutcome === 'miss') {
    return 'Single days can surprise anyone — watch the chart trend before you trade!';
  }
  if (prediction === 1 && heldShares === 0) {
    return `Think ${symbol} is climbing? Tap Buy below before advancing the day!`;
  }
  if (prediction === -1 && heldShares > 0) {
    return `Expecting a dip? You can sell some ${symbol} shares below to lock in cash!`;
  }
  if (heldShares > 0) {
    return `You own ${heldShares} ${symbol}! Advance the day to watch your profit move.`;
  }
  return `Tip: Guess tomorrow's move with Tuck, or buy shares of ${symbol} below to practice!`;
}

/**
 * Friendly illustrated portrait of Maya (from payday-cover.jpg) for quick trading tips.
 */
function GirlCharacterPortrait({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-2xl border-2 border-[#ffc800] bg-[#392a67] shadow-sm overflow-hidden shrink-0 ${className}`}
      style={{
        backgroundImage: `url(${paydayCover})`,
        backgroundSize: '235%',
        backgroundPosition: '88% 12%',
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}

/**
 * Clean, approachable FutureWorth SVG price chart with Line (default) and Candlestick modes.
 */
function MarketReplayChart({
  bars,
  selectedSymbol,
  activeSession,
  mode,
  onModeChange,
}: {
  bars: MarketDataBar[];
  selectedSymbol: string;
  activeSession: string;
  mode: 'candles' | 'line';
  onModeChange: (mode: 'candles' | 'line') => void;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const chartId = useId().replace(/:/g, '');
  const areaGradId = `fw-area-${chartId}`;

  if (bars.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center rounded-3xl bg-[#242042] border-2 border-[#4f32a9]/60 text-[#d8cbf8] text-xs font-mono">
        Awaiting market data feed...
      </div>
    );
  }

  const svgWidth = 720;
  const svgHeight = 248;
  const padLeft = 24;
  const padRight = 72;
  const padTop = 24;
  const padBottom = 34;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const lows = bars.map((b) => parseFloat(b.low));
  const highs = bars.map((b) => parseFloat(b.high));
  const minLow = Math.min(...lows);
  const maxHigh = Math.max(...highs);
  const spread = maxHigh - minLow || 1;
  const yMin = Math.max(0, minLow - spread * 0.1);
  const yMax = maxHigh + spread * 0.1;
  const yRange = yMax - yMin || 1;

  const getY = (val: number) => padTop + (1 - (val - yMin) / yRange) * chartH;
  const getX = (idx: number) =>
    bars.length === 1 ? padLeft + chartW / 2 : padLeft + (idx / (bars.length - 1)) * chartW;

  const candleW =
    bars.length === 1
      ? 36
      : Math.min(32, Math.max(6, chartW / (bars.length * 1.9)));

  const hitBandW =
    bars.length === 1 ? chartW : Math.max(12, chartW / Math.max(1, bars.length - 1));

  const maxVol = Math.max(...bars.map((b) => b.volume), 1);
  const getVolH = (vol: number) => Math.min(28, (vol / maxVol) * 28);

  const linePoints = bars
    .map((b, i) => `${getX(i).toFixed(1)},${getY(parseFloat(b.close)).toFixed(1)}`)
    .join(' ');
  const areaPoints = `${getX(0).toFixed(1)},${(padTop + chartH).toFixed(1)} ${linePoints} ${getX(
    bars.length - 1
  ).toFixed(1)},${(padTop + chartH).toFixed(1)}`;

  const gridSteps = 3;
  const gridValues = Array.from({ length: gridSteps + 1 }, (_, i) => yMin + (i / gridSteps) * yRange);
  const labelStep = bars.length > 10 ? Math.ceil(bars.length / 7) : 1;

  const latestBar = bars[bars.length - 1];
  const activeBar = hoveredIdx !== null && bars[hoveredIdx] ? bars[hoveredIdx] : latestBar;
  const prevClose = bars.length >= 2 ? parseFloat(bars[bars.length - 2].close) : parseFloat(latestBar.open);
  const activeClose = parseFloat(activeBar.close);
  const deltaDollars = activeClose - prevClose;
  const deltaPct = prevClose > 0 ? (deltaDollars / prevClose) * 100 : 0;
  const isUpDay = deltaDollars >= 0;
  const stockName = SYMBOL_NAMES[selectedSymbol] || selectedSymbol;

  return (
    <div className="relative rounded-3xl bg-[#242042] border-2 border-b-4 border-[#17142e] p-4 sm:p-5 shadow-xl overflow-hidden text-white">
      {/* Clean, Kid-Friendly Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-lg bg-[#dbfb84] text-[#242042]">
              {selectedSymbol}
            </span>
            <span className="text-sm font-bold text-[#eee6ff]">{stockName}</span>
            <span className="text-[11px] font-mono text-[#c7b9f0]">
              · {activeBar.session_date}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-2.5">
            <span
              className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white"
              data-testid="latest-close-price"
            >
              ${parseFloat(latestBar.close).toFixed(2)}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                isUpDay ? 'bg-[#58cc02]/25 text-[#a7f37a]' : 'bg-[#ff4b4b]/25 text-[#ffb499]'
              }`}
            >
              {isUpDay ? '▲' : '▼'} {isUpDay ? '+' : ''}
              {deltaDollars.toFixed(2)} ({isUpDay ? '+' : ''}
              {deltaPct.toFixed(2)}%)
            </span>
            {hoveredIdx !== null && bars[hoveredIdx] && (
              <span className="text-xs font-mono text-[#dbfb84]">
                Point: ${parseFloat(bars[hoveredIdx].close).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Simple Line / Candles Toggle */}
        <div className="inline-flex rounded-xl border border-white/15 bg-white/10 p-1 text-[11px] font-extrabold">
          <button
            type="button"
            onClick={() => onModeChange('line')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              mode === 'line' ? 'bg-[#dbfb84] text-[#242042] shadow-sm' : 'text-[#e8dcff] hover:text-white'
            }`}
          >
            Line
          </button>
          <button
            type="button"
            onClick={() => onModeChange('candles')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              mode === 'candles' ? 'bg-[#dbfb84] text-[#242042] shadow-sm' : 'text-[#e8dcff] hover:text-white'
            }`}
          >
            Candles
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full pt-3">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dbfb84" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#5637ca" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridValues.map((val, idx) => {
            const y = getY(val);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="#5637ca"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  strokeOpacity="0.45"
                />
                <text
                  x={svgWidth - padRight + 10}
                  y={y + 4}
                  fill="#c7b9f0"
                  fontSize="11"
                  fontFamily="monospace"
                  textAnchor="start"
                >
                  ${val.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Subtle Volume histogram */}
          {bars.map((bar, i) => {
            const x = getX(i);
            const isUp = parseFloat(bar.close) >= parseFloat(bar.open);
            const volH = getVolH(bar.volume);
            return (
              <rect
                key={`vol-${bar.session_date}`}
                x={x - candleW / 2}
                y={padTop + chartH - volH}
                width={candleW}
                height={volH}
                fill={isUp ? '#7be495' : '#ff9b85'}
                fillOpacity="0.16"
                rx="2"
              />
            );
          })}

          {/* Day 1 friendly reference baseline */}
          {bars.length === 1 && (
            <line
              x1={padLeft}
              y1={getY(parseFloat(bars[0].close))}
              x2={svgWidth - padRight}
              y2={getY(parseFloat(bars[0].close))}
              stroke="#dbfb84"
              strokeWidth="2"
              strokeDasharray="6 6"
              strokeOpacity="0.55"
            />
          )}

          {/* Line or Candle Visuals */}
          {mode === 'line' ? (
            <>
              {bars.length > 1 && <polygon points={areaPoints} fill={`url(#${areaGradId})`} />}
              {bars.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#dbfb84"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={linePoints}
                />
              )}
              {bars.map((bar, i) => {
                const x = getX(i);
                const y = getY(parseFloat(bar.close));
                const isCur = bar.session_date === activeSession;
                return (
                  <g
                    key={`dot-${bar.session_date}`}
                    onMouseEnter={() => setHoveredIdx(i)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={x - hitBandW / 2}
                      y={padTop}
                      width={hitBandW}
                      height={chartH}
                      fill="transparent"
                    />
                    {isCur && (
                      <circle cx={x} cy={y} r={11} fill="#dbfb84" fillOpacity="0.22" />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={isCur ? 6.5 : hoveredIdx === i ? 5.5 : 4}
                      fill={isCur ? '#dbfb84' : '#a7f37a'}
                      stroke="#242042"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
            </>
          ) : (
            bars.map((bar, i) => {
              const o = parseFloat(bar.open);
              const c = parseFloat(bar.close);
              const h = parseFloat(bar.high);
              const l = parseFloat(bar.low);
              const isUp = c >= o;
              const x = getX(i);
              const yHigh = getY(h);
              const yLow = getY(l);
              const yOpen = getY(o);
              const yClose = getY(c);
              const top = Math.min(yOpen, yClose);
              const height = Math.max(3, Math.abs(yClose - yOpen));
              const color = isUp ? '#7be495' : '#ff9b85';
              const isCur = bar.session_date === activeSession;

              return (
                <g
                  key={`candle-${bar.session_date}`}
                  onMouseEnter={() => setHoveredIdx(i)}
                  className="cursor-pointer"
                >
                  <rect
                    x={x - hitBandW / 2}
                    y={padTop}
                    width={hitBandW}
                    height={chartH}
                    fill="transparent"
                  />
                  <line
                    x1={x}
                    y1={yHigh}
                    x2={x}
                    y2={yLow}
                    stroke={color}
                    strokeWidth={isCur ? '2.5' : '1.75'}
                  />
                  <rect
                    x={x - candleW / 2}
                    y={top}
                    width={candleW}
                    height={height}
                    fill={color}
                    rx="2.5"
                  />
                  {isCur && (
                    <circle cx={x} cy={Math.max(8, top - 7)} r="3.5" fill="#dbfb84" />
                  )}
                </g>
              );
            })
          )}

          {/* Date Axis */}
          {bars.map((bar, i) => {
            const isCur = bar.session_date === activeSession;
            const shouldShow =
              i === 0 || i === bars.length - 1 || isCur || i % labelStep === 0;
            if (!shouldShow) return null;
            const x = getX(i);
            return (
              <g key={`axis-${bar.session_date}`}>
                <text
                  x={x}
                  y={svgHeight - 10}
                  fill={isCur ? '#dbfb84' : '#b7a9e6'}
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight={isCur ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {bar.session_date.slice(5)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {bars.length === 1 && (
        <p className="mt-1 text-center text-[11px] font-bold text-[#d8cbf8]">
          Day 1 starting price — pick Higher, Flat, or Lower and tap Advance Day →!
        </p>
      )}
    </div>
  );
}

export function SimulationView({
  service,
  initialSimulations,
  defaultDataset = FIXTURE_DATASET_METADATA,
  defaultSymbol = 'AAPL',
  storageScope,
  onSimulationChange,
  onAdvance,
}: SimulationViewProps) {
  const storageKey = storageScope && `market-replay:${storageScope}`;
  const [saved] = useState(() => (storageKey ? readPractice(storageKey, isSavedReplay) : undefined));
  const wallets = useRef(saved?.wallets ?? {});
  const seeds = saved?.simulations ?? initialSimulations;

  const [simService] = useState<SimulationService>(
    () => service ?? new SimulationService(seeds)
  );

  const [datasets] = useState<DatasetMetadata[]>(FIXTURE_DATASETS);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(defaultDataset.id);

  const [simulations, setSimulations] = useState<Simulation[]>(() => {
    if (seeds && seeds.length > 0) {
      return seeds.map((s) => ({ ...s }));
    }
    return [{ ...INITIAL_SIMULATION_FIXTURE }];
  });

  const [activeSimulationId, setActiveSimulationId] = useState(
    () => saved?.activeSimulationId ?? simulations[0].id
  );

  const [selectedSymbol, setSelectedSymbol] = useState(() => saved?.selectedSymbol ?? defaultSymbol);
  const [chartMode, setChartMode] = useState<'candles' | 'line'>('line');

  const activeSimulation: Simulation =
    simulations.find((s) => s.id === activeSimulationId) || simulations[0] || INITIAL_SIMULATION_FIXTURE;

  const activeDataset: DatasetMetadata =
    datasets.find((d) => d.id === activeSimulation.dataset_id) || defaultDataset;

  const sessionDates = useMemo(
    () => getReplaySessionDates(activeDataset.session_dates, activeSimulation.start_session, activeSimulation.end_session),
    [activeDataset, activeSimulation.start_session, activeSimulation.end_session]
  );
  const historicalEnd = activeDataset.session_dates[activeDataset.session_dates.length - 1];

  const visibleMarketData: MarketDataBar[] = filterVisibleMarketData(
    selectedSymbol,
    activeSimulation.current_session
  );

  // Advance & Arcade Streak state
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);
  const [advanceError, setAdvanceError] = useState<{ code?: string; message: string } | null>(null);
  const [prediction, setPrediction] = useState<-1 | 0 | 1>();
  const [predictionResult, setPredictionResult] = useState('');
  const [predictionOutcome, setPredictionOutcome] = useState<PredictionOutcome>(null);
  const [predictions, setPredictions] = useState(0);
  const [correctPredictions, setCorrectPredictions] = useState(0);
  const [streak, setStreak] = useState(0);
  const [dayHoldingDelta, setDayHoldingDelta] = useState<number | null>(null);

  useEffect(() => {
    setPrediction(undefined);
    setPredictionResult('');
    setPredictionOutcome(null);
    setDayHoldingDelta(null);
  }, [activeSimulationId, selectedSymbol]);

  // Create Simulation Form State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [startingCashInput, setStartingCashInput] = useState<string>(DEFAULT_STARTING_CASH_USD.toString());
  const [cashValidationError, setCashValidationError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState<boolean>(false);

  // Simulation Paper Trading & Portfolio State
  const [cashCents, setCashCents] = useState(
    () => saved?.wallets[activeSimulationId]?.cashCents ?? activeSimulation.initial_cash
  );
  const [positions, setPositions] = useState<Position[]>(
    () => saved?.wallets[activeSimulationId]?.positions ?? []
  );
  const [transactions, setTransactions] = useState<Transaction[]>(
    () => saved?.wallets[activeSimulationId]?.transactions ?? []
  );

  useEffect(() => {
    wallets.current[activeSimulationId] = { cashCents, positions, transactions };
    if (storageKey) {
      writePractice(storageKey, {
        simulations,
        activeSimulationId,
        selectedSymbol,
        wallets: wallets.current,
      });
    }
  }, [activeSimulationId, cashCents, positions, selectedSymbol, simulations, storageKey, transactions]);

  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [tradeQtyInput, setTradeQtyInput] = useState<string>('10');
  const [tradeValidationError, setTradeValidationError] = useState<string | null>(null);
  const [tradeSuccessNotice, setTradeSuccessNotice] = useState<string | null>(null);
  const [tradeReceipt, setTradeReceipt] = useState<ExecutedTradeReceipt | null>(null);

  const liveAnnounceId = useId();
  const [announcement, setAnnouncement] = useState<string>('');

  const lockedSessionDates: string[] = sessionDates.filter(
    (d) => d > activeSimulation.current_session
  );

  const currentSessionIndex = sessionDates.indexOf(activeSimulation.current_session);
  const activeSessionIndex = Math.max(0, currentSessionIndex);
  const totalCalendarSessions = sessionDates.length;
  const calendarProgressPct =
    totalCalendarSessions > 0
      ? Math.round(((currentSessionIndex + 1) / totalCalendarSessions) * 100)
      : 0;

  const resetArcadeFeedback = () => {
    setPrediction(undefined);
    setPredictionResult('');
    setPredictionOutcome(null);
    setPredictions(0);
    setCorrectPredictions(0);
    setStreak(0);
    setDayHoldingDelta(null);
  };

  const handleSwitchSimulation = (simId: string) => {
    setActiveSimulationId(simId);
    setAdvanceError(null);
    const chosen = simulations.find((s) => s.id === simId);
    if (chosen) {
      const wallet = wallets.current[simId];
      setCashCents(wallet?.cashCents ?? chosen.initial_cash);
      setPositions(wallet?.positions ?? []);
      setTransactions(wallet?.transactions ?? []);
      resetArcadeFeedback();
      setTradeValidationError(null);
      setTradeSuccessNotice(null);
      if (onSimulationChange) {
        onSimulationChange(chosen);
      }
      setAnnouncement(`Switched to simulation ${chosen.id} (Session ${chosen.current_session}).`);
    }
  };

  const handleAdvanceSession = async () => {
    setAdvanceError(null);
    setPredictionResult('');
    setPredictionOutcome(null);
    setDayHoldingDelta(null);
    setTradeSuccessNotice(null);

    if (activeSimulation.status === 'completed') {
      const err = {
        code: 'simulation_completed',
        message: 'Simulation is completed. Cannot advance past the final session.',
      };
      setAdvanceError(err);
      setAnnouncement(err.message);
      return;
    }

    setIsAdvancing(true);

    try {
      const result: AdvanceSimulationResponse = await simService.advanceSimulation(
        activeSimulation.id,
        activeSimulation.version
      );

      const updated = result.simulation;
      let matchedToday = false;

      if (prediction !== undefined) {
        const before = visibleMarketData[visibleMarketData.length - 1];
        const revealedBars = filterVisibleMarketData(selectedSymbol, updated.current_session);
        const after = revealedBars[revealedBars.length - 1];
        if (before && after && before.session_date !== after.session_date) {
          const change = Number(after.close) - Number(before.close);
          const direction = change > 0 ? 'rose' : change < 0 ? 'fell' : 'stayed flat';
          const isMatch = Math.sign(change) === prediction;
          matchedToday = isMatch;
          const comparison = isMatch
            ? 'That matched your prediction!'
            : 'That differed from your prediction.';
          setPredictionOutcome(isMatch ? 'match' : 'miss');
          setPredictionResult(
            `${selectedSymbol} ${direction} from ${formatUSD(Number(before.close))} to ${formatUSD(
              Number(after.close)
            )}. ${comparison}`
          );
          setPredictions((count) => count + 1);
          if (isMatch) {
            setCorrectPredictions((c) => c + 1);
            setStreak((s) => s + 1);
            soundFx.playSuccessChord();
            triggerConfetti({ particleCount: 65 });
          } else {
            setStreak(0);
            soundFx.playTactileClick();
          }
        } else {
          setPredictionOutcome('neutral');
          setPredictionResult('There is no new closing price for this symbol in this session.');
        }
        setPrediction(undefined);
      } else {
        soundFx.playTactileClick();
      }

      setSimulations((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...updated } : s))
      );

      const prevHoldingsValue = positions.reduce(
        (sum, pos) => sum + parseFloat(pos.market_value),
        0
      );
      const updatedPositions = positions.map((pos) => {
        const bars = filterVisibleMarketData(pos.symbol, updated.current_session);
        const bar = bars[bars.length - 1];
        const newPrice = bar ? parseFloat(bar.close) : parseFloat(pos.market_price);
        const costBasis = parseFloat(pos.cost_basis);
        const marketVal = (pos.quantity * newPrice).toFixed(2);
        const pnl = (pos.quantity * (newPrice - costBasis)).toFixed(2);
        return {
          ...pos,
          market_price: newPrice.toFixed(2),
          market_value: marketVal,
          unrealized_pnl: pnl,
        };
      });
      setPositions(updatedPositions);

      if (updatedPositions.length > 0) {
        const nextHoldingsValue = updatedPositions.reduce(
          (sum, pos) => sum + parseFloat(pos.market_value),
          0
        );
        const delta = nextHoldingsValue - prevHoldingsValue;
        setDayHoldingDelta(delta);
        if (delta > 0 && !matchedToday) {
          soundFx.playCoinPing();
          triggerConfetti({ particleCount: 45 });
        }
      }

      if (updated.status === 'completed') {
        triggerConfetti({ particleCount: 90 });
      }

      if (onAdvance) {
        onAdvance(updated);
      }
      if (onSimulationChange) {
        onSimulationChange(updated);
      }

      questTracker.recordSimulationAdvance(storageScope);

      setAnnouncement(
        `Simulation advanced to ${updated.current_session} (Version ${updated.version}, Status: ${updated.status}).`
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setAdvanceError({ code: err.code, message: err.message });
        setAnnouncement(`Advance failed: ${err.message}`);
      } else if (err instanceof Error) {
        setAdvanceError({ message: err.message });
        setAnnouncement(`Advance failed: ${err.message}`);
      } else {
        setAdvanceError({ message: 'Unexpected failure while advancing simulation session.' });
        setAnnouncement('Advance failed.');
      }
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleExtendSessions = async (additionalDays: number = 30) => {
    setIsAdvancing(true);
    setAdvanceError(null);
    try {
      const updated = await simService.extendSimulation(activeSimulation.id, additionalDays);
      setSimulations((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...updated } : s))
      );
      if (onSimulationChange) {
        onSimulationChange(updated);
      }
      setAnnouncement(`Added ${additionalDays} practice sessions. Prices beyond the historical sample are generated.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to extend calendar.';
      setAdvanceError({ message: msg });
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleResetSimulation = async () => {
    setIsAdvancing(true);
    setAdvanceError(null);
    try {
      const updated = await simService.resetSimulation(activeSimulation.id);
      setSimulations((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...updated } : s))
      );
      setCashCents(updated.initial_cash);
      setPositions([]);
      setTransactions([]);
      resetArcadeFeedback();
      setTradeValidationError(null);
      setTradeSuccessNotice('Reset simulation to Day 1 with fresh virtual cash!');
      if (onSimulationChange) {
        onSimulationChange(updated);
      }
      setAnnouncement(`Reset simulation to session ${updated.start_session}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset simulation.';
      setAdvanceError({ message: msg });
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleCreateSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCashValidationError(null);
    setAdvanceError(null);

    const cashNum = parseFloat(startingCashInput.replace(/[^0-9.-]+/g, ''));
    if (!Number.isFinite(cashNum) || isNaN(cashNum)) {
      setCashValidationError('Starting cash must be a valid number.');
      return;
    }
    if (cashNum < MIN_STARTING_CASH_USD) {
      setCashValidationError(`Starting cash must be at least $${MIN_STARTING_CASH_USD.toLocaleString('en-US')}.00.`);
      return;
    }
    if (cashNum > MAX_STARTING_CASH_USD) {
      setCashValidationError(`Starting cash cannot exceed $${MAX_STARTING_CASH_USD.toLocaleString('en-US')}.00.`);
      return;
    }

    const dataset = datasets.find((d) => d.id === selectedDatasetId) || defaultDataset;
    const initialCashCents = Math.round(cashNum * 100);

    setIsCreating(true);
    try {
      const created = await simService.createSimulation({
        dataset_id: dataset.id,
        start_session: dataset.session_dates[0],
        end_session: dataset.session_dates[dataset.session_dates.length - 1],
        initial_cash: initialCashCents,
      });

      setSimulations((prev) => [created, ...prev]);
      setActiveSimulationId(created.id);
      setCashCents(initialCashCents);
      setPositions([]);
      setTransactions([]);
      resetArcadeFeedback();
      setTradeValidationError(null);
      setTradeSuccessNotice(null);
      setShowCreateModal(false);
      setStartingCashInput(DEFAULT_STARTING_CASH_USD.toString());

      if (onSimulationChange) {
        onSimulationChange(created);
      }
      setAnnouncement(`Created new simulation ${created.id} with ${formatUSD(cashNum)} starting cash.`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setCashValidationError(err.message);
      } else if (err instanceof Error) {
        setCashValidationError(err.message);
      } else {
        setCashValidationError('Failed to create simulation.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const latestVisibleBar: MarketDataBar | undefined = visibleMarketData[visibleMarketData.length - 1];
  const activeSessionPrice = latestVisibleBar ? parseFloat(latestVisibleBar.close) : 150.0;
  const latestClose = latestVisibleBar ? parseFloat(latestVisibleBar.close).toFixed(2) : activeSessionPrice.toFixed(2);
  const currentHeldShares = positions.find((p) => p.symbol === selectedSymbol)?.quantity ?? 0;

  const totalMarketValueDollars = positions.reduce(
    (sum, pos) => sum + parseFloat(pos.market_value),
    0
  );
  const totalEquityDollars = cashCents / 100 + totalMarketValueDollars;
  const initialCashDollars = activeSimulation.initial_cash / 100;
  const totalReturnDollars = totalEquityDollars - initialCashDollars;
  const totalReturnPct =
    initialCashDollars > 0 ? (totalReturnDollars / initialCashDollars) * 100 : 0;

  const handleExecuteTrade = () => {
    setTradeValidationError(null);
    setTradeSuccessNotice(null);

    const qty = Number(tradeQtyInput);
    if (!Number.isInteger(qty) || qty < 1) {
      setTradeValidationError('Quantity must be at least 1 whole share.');
      return;
    }
    if (qty > 1_000_000) {
      setTradeValidationError('Quantity cannot exceed 1,000,000 shares.');
      return;
    }

    if (!latestVisibleBar) {
      setTradeValidationError('No market bar available for this symbol on the current session.');
      return;
    }

    const price = parseFloat(latestVisibleBar.close);
    const orderCostCents = Math.round(qty * price * 100);

    if (orderSide === 'buy') {
      if (orderCostCents > cashCents) {
        setTradeValidationError(
          `Not enough cash! Cost ${formatUSD(orderCostCents / 100)} > available ${formatUSD(cashCents / 100)}.`
        );
        return;
      }

      setCashCents((prev) => prev - orderCostCents);
      setPositions((prev) => {
        const existing = prev.find((p) => p.symbol === selectedSymbol);
        if (existing) {
          const newQty = existing.quantity + qty;
          const totalCostBasis =
            parseFloat(existing.cost_basis) * existing.quantity + price * qty;
          const avgBasis = (totalCostBasis / newQty).toFixed(2);
          const marketVal = (newQty * price).toFixed(2);
          const pnl = (newQty * (price - parseFloat(avgBasis))).toFixed(2);

          return prev.map((p) =>
            p.symbol === selectedSymbol
              ? {
                  ...p,
                  quantity: newQty,
                  cost_basis: avgBasis,
                  market_price: price.toFixed(2),
                  market_value: marketVal,
                  unrealized_pnl: pnl,
                }
              : p
          );
        }

        const marketVal = (qty * price).toFixed(2);
        return [
          ...prev,
          {
            symbol: selectedSymbol,
            quantity: qty,
            cost_basis: price.toFixed(2),
            market_price: price.toFixed(2),
            market_value: marketVal,
            unrealized_pnl: '0.00',
          },
        ];
      });

      const nowIso = new Date().toISOString();
      const newTxn: Transaction = {
        id: `sim-txn-${Date.now().toString().slice(-6)}`,
        order_id: `sim-ord-${Date.now().toString().slice(-6)}`,
        symbol: selectedSymbol,
        side: 'buy',
        quantity: qty,
        price: price.toFixed(2),
        gross_amount: (qty * price).toFixed(2),
        session_date: activeSimulation.current_session,
        executed_at: nowIso,
      };
      setTransactions((prev) => [newTxn, ...prev]);

      setTradeReceipt({
        symbol: selectedSymbol,
        name: SYMBOL_NAMES[selectedSymbol] || selectedSymbol,
        sector: SYMBOL_SECTORS[selectedSymbol]?.sector,
        side: 'buy',
        quantity: qty,
        price,
        grossAmount: qty * price,
        remainingCashDollars: (cashCents - orderCostCents) / 100,
        mode: 'simulation',
        sessionDate: activeSimulation.current_session,
        timestamp: new Date().toLocaleTimeString(),
      });

      questTracker.recordTrade(storageScope);

      setTradeSuccessNotice(
        `Bought ${qty} ${selectedSymbol} @ $${price.toFixed(2)}!`
      );
    } else {
      const existing = positions.find((p) => p.symbol === selectedSymbol);
      const held = existing?.quantity ?? 0;

      if (held === 0) {
        setTradeValidationError(`You don't own any ${selectedSymbol} yet.`);
        return;
      }
      if (qty > held) {
        setTradeValidationError(`You only hold ${held} shares of ${selectedSymbol}.`);
        return;
      }

      setCashCents((prev) => prev + orderCostCents);
      setPositions((prev) => {
        const remainingQty = held - qty;
        if (remainingQty <= 0) {
          return prev.filter((p) => p.symbol !== selectedSymbol);
        }
        const costBasis = parseFloat(existing?.cost_basis || price.toFixed(2));
        const marketVal = (remainingQty * price).toFixed(2);
        const pnl = (remainingQty * (price - costBasis)).toFixed(2);

        return prev.map((p) =>
          p.symbol === selectedSymbol
            ? {
                ...p,
                quantity: remainingQty,
                market_price: price.toFixed(2),
                market_value: marketVal,
                unrealized_pnl: pnl,
              }
            : p
        );
      });

      const nowIso = new Date().toISOString();
      const newTxn: Transaction = {
        id: `sim-txn-${Date.now().toString().slice(-6)}`,
        order_id: `sim-ord-${Date.now().toString().slice(-6)}`,
        symbol: selectedSymbol,
        side: 'sell',
        quantity: qty,
        price: price.toFixed(2),
        gross_amount: (qty * price).toFixed(2),
        session_date: activeSimulation.current_session,
        executed_at: nowIso,
      };
      setTransactions((prev) => [newTxn, ...prev]);

      setTradeReceipt({
        symbol: selectedSymbol,
        name: SYMBOL_NAMES[selectedSymbol] || selectedSymbol,
        sector: SYMBOL_SECTORS[selectedSymbol]?.sector,
        side: 'sell',
        quantity: qty,
        price,
        grossAmount: qty * price,
        remainingCashDollars: (cashCents + orderCostCents) / 100,
        mode: 'simulation',
        sessionDate: activeSimulation.current_session,
        timestamp: new Date().toLocaleTimeString(),
      });

      questTracker.recordTrade(storageScope);

      setTradeSuccessNotice(
        `Sold ${qty} ${selectedSymbol} @ $${price.toFixed(2)}!`
      );
    }
  };

  const handleQuickSell = (sym: string, qty: number) => {
    setSelectedSymbol(sym);
    setOrderSide('sell');
    setTradeQtyInput(qty.toString());
    setTradeValidationError(null);
    setTradeSuccessNotice(null);
  };

  const parsedQty = Math.max(1, parseInt(tradeQtyInput, 10) || 1);
  const tuckMessage = getTuckIdlePrompt(
    visibleMarketData,
    activeSessionIndex + 1,
    totalCalendarSessions,
    selectedSymbol,
    latestClose,
    activeSimulation.status === 'completed'
  );
  const girlTip = getGirlCoachTip({
    isCompleted: activeSimulation.status === 'completed',
    predictionOutcome,
    prediction,
    symbol: selectedSymbol,
    heldShares: currentHeldShares,
    tradeSuccessNotice,
  });

  return (
    <div className="space-y-5 max-w-6xl mx-auto text-[#222038]" style={FW_THEME_VARS}>
      <TradeConfirmationModal
        receipt={tradeReceipt}
        onClose={() => setTradeReceipt(null)}
      />

      <TabOverviewModal
        tab="simulation"
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
      />

      <div id={liveAnnounceId} role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* 1. CLEAN DUOLINGO-STYLE TOP PROGRESS & WALLET HUD */}
      <section
        role="region"
        aria-label="Curriculum Time Cursor Banner"
        data-testid="time-cursor-banner"
        className="rounded-3xl bg-white border-2 border-[#e5ddf8] p-4 sm:p-5 shadow-sm space-y-3.5"
      >
        {/* Top Row: Badges + Run Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-black text-[#222038]">
              <span aria-hidden="true">🎮</span>
              <span>Market Replay</span>
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#5637ca] bg-[#f3effa] px-2.5 py-0.5 rounded-full">
              Curriculum Time Cursor
            </span>
            {activeSimulation.status === 'completed' ? (
              <span
                data-testid="simulation-status-badge"
                className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#ffe9da] text-[#7b402a]"
              >
                Completed
              </span>
            ) : (
              <span
                data-testid="simulation-status-badge"
                className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#d7ffb8] text-[#285137]"
              >
                Active
              </span>
            )}
            <span
              data-testid="simulation-version"
              className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#f8f7fc] text-[#615d76] border border-[#e8e4f1]"
            >
              v{activeSimulation.version}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {simulations.length > 1 && (
              <select
                id="sim-select"
                data-testid="simulation-select"
                value={activeSimulationId}
                onChange={(e) => handleSwitchSimulation(e.target.value)}
                className="text-xs font-bold rounded-xl border-2 border-[#e5ddf8] bg-[#fbfaff] px-2.5 py-1.5 text-[#222038] focus:border-[#5637ca] focus:outline-none"
                aria-label="Select simulation to switch or resume"
              >
                {simulations.map((sim, index) => (
                  <option key={sim.id} value={sim.id}>
                    {sim.id === INITIAL_SIMULATION_FIXTURE.id
                      ? 'Original run'
                      : `Run ${simulations.length - index}`}{' '}
                    · {sim.current_session}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setIsOverviewOpen(true)}
              aria-label="What is Simulation Tab?"
              className={`${TACTILE_BTN_BASE} px-3 py-1.5 text-xs bg-[#f6f3ff] border-[#dfd5f8] text-[#4f32a9] hover:bg-[#eee6ff]`}
            >
              💡 How it works
            </button>

            <button
              type="button"
              onClick={handleResetSimulation}
              disabled={isAdvancing}
              aria-label="Reset Run"
              className={`${TACTILE_BTN_BASE} px-3 py-1.5 text-xs bg-white border-[#e5ddf8] text-[#615d76] hover:bg-[#f8f7fc] hover:text-[#222038]`}
            >
              🔁 Reset Run
            </button>

            <button
              type="button"
              onClick={() => {
                setShowCreateModal(!showCreateModal);
                setCashValidationError(null);
              }}
              data-testid="toggle-create-sim-btn"
              aria-expanded={showCreateModal}
              className={`${TACTILE_BTN_BASE} px-3.5 py-1.5 text-xs ${
                showCreateModal
                  ? 'bg-white border-[#e5ddf8] text-[#615d76]'
                  : 'bg-[#5637ca] border-[#3c20a3] text-white hover:bg-[#6547db]'
              }`}
            >
              {showCreateModal ? 'Cancel' : '+ New Run'}
            </button>
          </div>
        </div>

        {/* Duolingo Progress Bar Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm sm:text-base font-black text-[#222038]">
              Day {activeSessionIndex + 1} of {totalCalendarSessions}
            </span>
            <span
              data-testid="cursor-current-session"
              className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-[#242042] text-[#dbfb84]"
            >
              {activeSimulation.current_session}
            </span>
            <span data-testid="cursor-current-time" className="sr-only">
              {activeSimulation.current_time}
            </span>
          </div>

          <div
            className="flex-1 h-4 bg-[#ede8fa] rounded-full overflow-hidden border border-[#dfd5f8] relative"
            role="progressbar"
            aria-valuenow={calendarProgressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Session progress"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 relative ${
                activeSimulation.status === 'completed' ? 'bg-[#ffc800]' : 'bg-[#58cc02]'
              }`}
              style={{ width: `${calendarProgressPct}%` }}
            >
              <div className="absolute inset-x-2 top-0.5 h-1 rounded-full bg-white/35" />
            </div>
          </div>

          <span className="text-xs font-extrabold text-[#615d76] font-mono shrink-0">
            {calendarProgressPct}%
          </span>
        </div>

        {/* Clean 3-Chip Wallet & Streak HUD */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#eefbe5] border border-[#b8dfa4] text-xs">
              <span className="font-bold text-[#285137]">💵 Cash Balance:</span>
              <span className="font-mono font-black text-[#1d402a]">
                {formatUSD(cashCents / 100)}
              </span>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#f4f0ff] border border-[#d6c6fa] text-xs">
              <span className="font-bold text-[#4f32a9]">💼 Holdings:</span>
              <span className="font-mono font-black text-[#222038]">
                {formatUSD(totalMarketValueDollars)}
              </span>
              {positions.length > 0 && (
                <LossGainBadge
                  dollarValue={totalReturnDollars}
                  percentValue={totalReturnPct}
                  size="sm"
                />
              )}
            </div>

            {streak > 0 ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#fff7d6] border border-[#ffd84d] text-xs font-black text-[#7a5200]">
                <span aria-hidden="true">🔥</span>
                <span>{streak} streak</span>
              </div>
            ) : predictions > 0 ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#f8f7fc] border border-[#e5ddf8] text-xs font-bold text-[#615d76]">
                <span>⭐ {correctPredictions}/{predictions} calls right</span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#615d76] font-mono">
            <span>Initial Cash: {formatCashCents(activeSimulation.initial_cash)}</span>
            {activeSimulation.status === 'active' && (
              <button
                type="button"
                onClick={() => handleExtendSessions(30)}
                disabled={isAdvancing}
                className="px-2.5 py-1 rounded-xl bg-[#f6f3ff] hover:bg-[#eee6ff] border border-[#dfd5f8] text-[#4f32a9] font-sans font-extrabold cursor-pointer"
              >
                +30 Days
              </button>
            )}
          </div>
        </div>

        {activeSimulation.end_session > historicalEnd && (
          <p className="text-[11px] font-semibold text-[#5637ca]">
            {activeSimulation.current_session > historicalEnd
              ? '✨ Practice mode: prices after Jan 8 are simulated.'
              : `✨ Extended calendar: prices after ${historicalEnd} are simulated for extra practice.`}
          </p>
        )}

        {advanceError && (
          <div
            role="alert"
            data-testid="advance-error-alert"
            className="rounded-2xl bg-[#42202d] border-2 border-[#ff9b85] p-3.5 text-xs text-[#ffe9da] flex items-start justify-between gap-2"
          >
            <div className="space-y-0.5">
              <span className="font-black text-[#dbfb84]">
                {advanceError.code === 'stale_version'
                  ? 'Version Conflict (409):'
                  : advanceError.code === 'simulation_completed'
                  ? 'Simulation Completed (409):'
                  : 'Advance Error:'}
              </span>
              <p>{advanceError.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setAdvanceError(null)}
              className="text-[#ffe9da] hover:text-white font-bold px-1 cursor-pointer"
              aria-label="Dismiss error message"
            >
              ✕
            </button>
          </div>
        )}
      </section>

      {/* Collapsible New Run Panel */}
      {showCreateModal && (
        <Card
          title="Start a New Practice Run"
          subtitle="Pick your starting virtual cash and jump right in"
          className="fw-panel bg-[#fbfaff] border-2 border-[#dfd5f8] !rounded-3xl"
          data-testid="create-simulation-panel"
        >
          <form onSubmit={handleCreateSimulation} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="create-dataset-select"
                  className="block text-xs font-bold text-[#222038] mb-1"
                >
                  Historical Dataset
                </label>
                <select
                  id="create-dataset-select"
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="w-full rounded-xl border border-[#d9d0e9] bg-white px-3 py-2.5 text-sm text-[#222038] shadow-sm focus:border-[#5637ca] focus:outline-none"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label} ({d.synthetic ? 'Synthetic' : 'Real'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Input
                  label="Starting Cash (USD)"
                  id="starting-cash-input"
                  data-testid="starting-cash-input"
                  type="text"
                  value={startingCashInput}
                  onChange={(e) => {
                    setStartingCashInput(e.target.value);
                    setCashValidationError(null);
                  }}
                  helperText="Bounds: $1,000.00 to $1,000,000,000.00 USD (defaults to $10,000.00)"
                  error={cashValidationError || undefined}
                  placeholder="10000"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-xs text-[#615d76] self-center mr-1">Presets:</span>
                  {[1000, 10000, 50000, 1000000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setStartingCashInput(preset.toString());
                        setCashValidationError(null);
                      }}
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#eee6ff] text-[#4f32a9] hover:bg-[#e1d2ff] transition-colors cursor-pointer"
                    >
                      ${preset.toLocaleString('en-US')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#e8e4f1]">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className={`${TACTILE_BTN_BASE} px-4 py-2 text-xs bg-white border-[#e5ddf8] text-[#615d76]`}
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="submit-create-sim-btn"
                disabled={isCreating}
                className={`${TACTILE_BTN_BASE} px-5 py-2 text-xs bg-[#58cc02] border-[#46a302] text-white hover:bg-[#61dc04]`}
              >
                {isCreating ? 'Starting...' : 'Start Run →'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Cycle Completed Trophy Card */}
      {activeSimulation.status === 'completed' && (
        <div className="rounded-3xl border-2 border-[#5637ca] bg-gradient-to-r from-[#242042] via-[#37296d] to-[#4f32a9] p-5 text-white shadow-lg animate-scaleUp">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#dbfb84] text-[#242042] flex items-center justify-center text-2xl shrink-0">
                🏆
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#dbfb84]">
                  Run Complete!
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Final Portfolio Value:{' '}
                  <span className="text-[#dbfb84]">{formatUSD(totalEquityDollars)}</span>
                </h3>
                <p className="text-xs text-[#eee6ff]/85">
                  Want to keep going? Add 30 more days or replay from Day 1!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <button
                type="button"
                data-testid="extend-calendar-btn"
                onClick={() => handleExtendSessions(30)}
                disabled={isAdvancing}
                className={`${TACTILE_BTN_BASE} px-4 py-2.5 text-xs bg-[#dbfb84] border-[#a9cf42] text-[#242042] hover:bg-[#ebffad]`}
              >
                ⚡ Add 30 practice sessions
              </button>
              <button
                type="button"
                data-testid="replay-sim-btn"
                onClick={handleResetSimulation}
                disabled={isAdvancing}
                className={`${TACTILE_BTN_BASE} px-4 py-2.5 text-xs bg-white/15 border-white/30 text-white hover:bg-white/25`}
              >
                🔁 Reset to Day 1
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN DUOLINGO ARCADE STAGE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (7 cols): Step 1 — Clean Stock Chart & Ticker Picker */}
        <section data-testid="market-data-view" className="lg:col-span-7 space-y-3">
          {/* Step 1 Pill Header & Ticker Strip */}
          <div className="rounded-3xl bg-white border-2 border-[#e5ddf8] p-3.5 sm:p-4 space-y-2.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#5637ca] text-white text-xs font-black flex items-center justify-center">
                  1
                </span>
                <span className="text-xs sm:text-sm font-black text-[#222038]">
                  Look at the price chart
                </span>
              </div>
              <span className="text-xs font-bold text-[#615d76]">
                Viewing Symbol: <strong className="text-[#5637ca] font-mono">{selectedSymbol}</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Pick a stock">
              {activeDataset.symbols.map((sym) => {
                const isSelected = selectedSymbol === sym;
                return (
                  <button
                    key={sym}
                    type="button"
                    data-testid={`symbol-picker-${sym}`}
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedSymbol(sym)}
                    className={`px-2.5 py-1 text-xs font-black font-mono rounded-xl border-2 border-b-[3px] active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#242042] text-[#dbfb84] border-[#17142e] shadow-sm'
                        : 'bg-[#f8f7fc] text-[#4f32a9] border-[#e5ddf8] hover:bg-[#eee6ff]'
                    }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clean Chart */}
          <MarketReplayChart
            bars={visibleMarketData}
            selectedSymbol={selectedSymbol}
            activeSession={activeSimulation.current_session}
            mode={chartMode}
            onModeChange={setChartMode}
          />
        </section>

        {/* RIGHT COLUMN (5 cols): Step 2/3/4 — Tuck's Guess + Girl's Quick Trade */}
        <div className="lg:col-span-5 space-y-4">
          {/* TUCK'S ARCADE MOVE CARD */}
          <section
            aria-label="Tuck's Market Call"
            className="rounded-3xl bg-white border-2 border-[#e5ddf8] p-4 sm:p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#58cc02] text-white text-xs font-black flex items-center justify-center">
                  2
                </span>
                <span className="text-xs sm:text-sm font-black text-[#222038]">
                  Predict tomorrow&apos;s move
                </span>
              </div>
              {predictions > 0 && (
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-[#eee6ff] text-[#4f32a9]">
                  {correctPredictions}/{predictions} won
                </span>
              )}
            </div>

            {/* Tuck + Speech Bubble */}
            <div className="flex items-center gap-3">
              <div
                className={`shrink-0 transition-transform ${
                  predictionOutcome === 'match' ? 'animate-bounce' : ''
                }`}
              >
                <Tuck className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-sm" />
              </div>

              <div className="relative flex-1 rounded-2xl bg-[#f6f3ff] border-2 border-[#dfd5f8] p-3.5 shadow-sm">
                {/* Speech Bubble Arrow */}
                <div
                  aria-hidden="true"
                  className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-[#f6f3ff] border-l-2 border-b-2 border-[#dfd5f8] rotate-45"
                />
                <p className="relative text-xs sm:text-sm font-extrabold text-[#222038] leading-snug">
                  {prediction !== undefined && !predictionResult
                    ? getTuckPickReaction(prediction, selectedSymbol)
                    : tuckMessage}
                </p>
              </div>
            </div>

            {/* Instant Animated Outcome Feedback */}
            {predictionResult && (
              <div
                role="status"
                className={`rounded-2xl border-2 p-3 flex items-start gap-2.5 animate-scaleUp ${
                  predictionOutcome === 'match'
                    ? 'bg-[#d7ffb8] border-[#58cc02] text-[#1e4620]'
                    : predictionOutcome === 'miss'
                    ? 'bg-[#fff3e0] border-[#ff9600] text-[#5c3400]'
                    : 'bg-[#f6f3ff] border-[#dfd5f8] text-[#4f32a9]'
                }`}
              >
                <span className="text-lg leading-none" aria-hidden="true">
                  {predictionOutcome === 'match' ? '🎉' : predictionOutcome === 'miss' ? '🐾' : '✦'}
                </span>
                <div className="text-xs leading-snug space-y-0.5">
                  <p className="font-black">
                    {predictionOutcome === 'match'
                      ? 'Spot-on call! +1 Streak!'
                      : predictionOutcome === 'miss'
                      ? 'Plot twist on the tape!'
                      : 'Market note'}
                  </p>
                  <p className="font-semibold">{predictionResult}</p>
                </div>
              </div>
            )}

            {/* Day Holdings Delta Celebration */}
            {dayHoldingDelta !== null && dayHoldingDelta !== 0 && (
              <div
                className={`rounded-2xl border px-3 py-2 text-xs font-black flex items-center justify-between animate-fadeIn ${
                  dayHoldingDelta > 0
                    ? 'bg-[#eefbe5] border-[#9fd884] text-[#225129]'
                    : 'bg-[#fff0eb] border-[#f4b6a2] text-[#8d2c1b]'
                }`}
              >
                <span>
                  {dayHoldingDelta > 0 ? '🚀 Portfolio grew today!' : '📉 Portfolio dipped today'}
                </span>
                <span className="font-mono">
                  {dayHoldingDelta > 0 ? '+' : '-'}
                  {formatUSD(Math.abs(dayHoldingDelta))}
                </span>
              </div>
            )}

            {/* Step 3: Three Huge Tactile 3D Move Buttons */}
            <div
              className="grid grid-cols-3 gap-2"
              role="group"
              aria-label="Predict next session close"
            >
              {PREDICTION_OPTIONS.map(({ value, emoji, label, subLabel, idleClass, activeClass }) => {
                const isSelected = prediction === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={isAdvancing || activeSimulation.status === 'completed'}
                    onClick={() => {
                      setPrediction(value);
                      setPredictionResult('');
                      setPredictionOutcome(null);
                    }}
                    className={`${TACTILE_BTN_BASE} py-2.5 px-2 flex flex-col items-center justify-center text-center ${
                      isSelected ? activeClass : idleClass
                    }`}
                  >
                    <span className="text-xs sm:text-sm leading-tight">
                      <span aria-hidden="true" className="mr-1">{emoji}</span>
                      {label}
                    </span>
                    <span className="text-[10px] font-bold opacity-80 mt-0.5">{subLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Step 4: Big Green Duolingo Advance Day Button */}
            <button
              type="button"
              data-testid="advance-session-btn"
              onClick={handleAdvanceSession}
              disabled={isAdvancing || activeSimulation.status === 'completed'}
              aria-disabled={isAdvancing || activeSimulation.status === 'completed'}
              className={
                activeSimulation.status === 'completed'
                  ? `${TACTILE_BTN_BASE} w-full py-3.5 px-6 text-sm bg-[#ede8fa] border-[#d3c2fa] text-[#615d76]`
                  : `${TACTILE_BTN_BASE} border-b-[5px] w-full py-3.5 px-6 text-base bg-[#58cc02] hover:bg-[#61dc04] text-white border-[#46a302] shadow-md`
              }
            >
              {isAdvancing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Advancing...
                </span>
              ) : activeSimulation.status === 'completed' ? (
                'Simulation Completed'
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>Advance Day →</span>
                  <span className="sr-only">Advance Session</span>
                </span>
              )}
            </button>
          </section>

          {/* MAYA (THE GIRL CHARACTER)'S QUICK TRADE CARD */}
          <section
            aria-label="Simulation Paper Trading Desk"
            className="rounded-3xl bg-white border-2 border-[#e5ddf8] p-4 sm:p-5 shadow-sm space-y-3.5"
          >
            {/* Girl Mascot + Tip Bubble */}
            <div className="flex items-center gap-3">
              <GirlCharacterPortrait className="w-16 h-16 sm:w-[70px] sm:h-[70px]" />
              <div className="relative flex-1 rounded-2xl bg-[#fffbeb] border-2 border-[#fde68a] p-3">
                <div
                  aria-hidden="true"
                  className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#fffbeb] border-l-2 border-b-2 border-[#fde68a] rotate-45"
                />
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#92400e]">
                    Maya&apos;s Quick Trade
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-[#fde68a] text-[#92400e]">
                    Owned: {currentHeldShares} shs
                  </span>
                </div>
                <p className="relative text-xs font-bold text-[#451a03] leading-snug">
                  {girlTip}
                </p>
              </div>
            </div>

            {/* Buy / Sell Tactile Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setOrderSide('buy');
                  setTradeValidationError(null);
                }}
                className={`${TACTILE_BTN_BASE} py-2 text-xs ${
                  orderSide === 'buy'
                    ? 'bg-[#dbfb84] border-[#9ec92a] text-[#222038]'
                    : 'bg-[#f8f7fc] border-[#e5ddf8] text-[#615d76] hover:bg-[#f3effa]'
                }`}
              >
                🟢 Buy {selectedSymbol}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderSide('sell');
                  setTradeValidationError(null);
                }}
                className={`${TACTILE_BTN_BASE} py-2 text-xs ${
                  orderSide === 'sell'
                    ? 'bg-[#ffe9da] border-[#e69f73] text-[#7b402a]'
                    : 'bg-[#f8f7fc] border-[#e5ddf8] text-[#615d76] hover:bg-[#f3effa]'
                }`}
              >
                🔴 Sell {selectedSymbol}
              </button>
            </div>

            {/* Clean Shares Quantity Stepper + Quick Chips */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="sim-trade-qty" className="text-xs font-extrabold text-[#222038] shrink-0">
                  Shares:
                </label>
                <div className="flex-1">
                  <Input
                    id="sim-trade-qty"
                    type="number"
                    min="1"
                    max="1000000"
                    value={tradeQtyInput}
                    onChange={(e) => {
                      setTradeQtyInput(e.target.value);
                      setTradeValidationError(null);
                      setTradeSuccessNotice(null);
                    }}
                    placeholder="10"
                    className="!rounded-xl !border-2 !border-[#dfd5f8] !py-1.5 font-mono font-bold text-center"
                  />
                </div>
                <span className="text-xs font-mono font-black text-[#222038] bg-[#f8f7fc] border border-[#e5ddf8] px-2.5 py-2 rounded-xl shrink-0">
                  {formatUSD((parseInt(tradeQtyInput, 10) || 0) * activeSessionPrice)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 5, 10, 25].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setTradeQtyInput(preset.toString());
                      setTradeValidationError(null);
                    }}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-[#f8f7fc] border border-[#e5ddf8] hover:border-[#5637ca] hover:bg-[#f3effa] text-[#4f32a9] transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
                {orderSide === 'buy' && activeSessionPrice > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const maxShares = Math.max(1, Math.floor((cashCents / 100) / activeSessionPrice));
                      setTradeQtyInput(maxShares.toString());
                      setTradeValidationError(null);
                    }}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-[#eefbe5] text-[#285137] border border-[#b8dfa4] hover:bg-[#e1f7d2] transition-colors cursor-pointer"
                  >
                    Max Buy
                  </button>
                )}
                {orderSide === 'sell' && currentHeldShares > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTradeQtyInput(currentHeldShares.toString());
                      setTradeValidationError(null);
                    }}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-[#ffe9da] text-[#7b402a] border border-[#f4c6a8] hover:bg-[#ffdcc4] transition-colors cursor-pointer"
                  >
                    Sell All ({currentHeldShares})
                  </button>
                )}
              </div>
            </div>

            {tradeValidationError && (
              <div className="p-2.5 rounded-xl bg-[#ffe9da] border border-[#f4c6a8] text-xs font-bold text-[#7b402a]">
                {tradeValidationError}
              </div>
            )}

            {/* Big 3D Execute Order Button */}
            <button
              type="button"
              onClick={handleExecuteTrade}
              className={`${TACTILE_BTN_BASE} w-full py-3 px-4 text-sm ${
                orderSide === 'buy'
                  ? 'bg-[#5637ca] border-[#3c20a3] text-white hover:bg-[#6547db]'
                  : 'bg-[#ff4b4b] border-[#cf2d2d] text-white hover:bg-[#ff6161]'
              }`}
            >
              {orderSide === 'buy' ? 'Buy' : 'Sell'} {parsedQty} {selectedSymbol} ·{' '}
              {formatUSD(parsedQty * activeSessionPrice)}
            </button>
          </section>
        </div>
      </div>

      {/* 3. CLEAN HOLDINGS STRIP */}
      <section className="rounded-3xl bg-white border-2 border-[#e5ddf8] p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-[#222038]">
              💼 Active Simulation Holdings
            </span>
            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#eee6ff] text-[#4f32a9]">
              {positions.length} {positions.length === 1 ? 'Stock' : 'Stocks'}
            </span>
          </div>
          <span className="text-[11px] text-[#615d76] font-mono">
            Session {activeSimulation.current_session}
          </span>
        </div>

        {positions.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-[#e8e4f1]">
            <table className="w-full text-left text-xs" aria-label="Simulation Holdings Table">
              <thead className="bg-[#f6f3ff] text-[#4f32a9] font-extrabold border-b border-[#e8e4f1]">
                <tr>
                  <th className="py-2.5 px-3">Stock</th>
                  <th className="py-2.5 px-3">Shares</th>
                  <th className="py-2.5 px-3">Avg Cost</th>
                  <th className="py-2.5 px-3">Value</th>
                  <th className="py-2.5 px-3">Profit / Loss</th>
                  <th className="py-2.5 px-3 text-right">Quick Sell</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e4f1] font-mono">
                {positions.map((pos) => {
                  const costNum = parseFloat(pos.cost_basis);
                  const priceNum = parseFloat(pos.market_price);
                  const pnlNum = parseFloat(pos.unrealized_pnl);
                  const pnlPct = costNum > 0 ? ((priceNum - costNum) / costNum) * 100 : 0;

                  return (
                    <tr key={pos.symbol} className="hover:bg-[#fbfaff] transition-colors">
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => setSelectedSymbol(pos.symbol)}
                          className="font-black text-[#5637ca] hover:underline text-left font-sans cursor-pointer"
                        >
                          {pos.symbol}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#222038]">{pos.quantity}</td>
                      <td className="py-2.5 px-3 text-[#615d76]">${costNum.toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-bold text-[#222038]">${parseFloat(pos.market_value).toFixed(2)}</td>
                      <td className="py-2.5 px-3">
                        <LossGainBadge
                          dollarValue={pnlNum}
                          percentValue={pnlPct}
                          size="sm"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5 font-sans">
                        <button
                          type="button"
                          onClick={() => handleQuickSell(pos.symbol, 1)}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-white text-[#7b402a] border-2 border-b-[3px] border-[#f4c6a8] hover:bg-[#ffe9da] active:border-b-2 active:translate-y-0.5 cursor-pointer"
                        >
                          Sell 1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickSell(pos.symbol, pos.quantity)}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-[#ffe9da] text-[#7b402a] border-2 border-b-[3px] border-[#f4c6a8] hover:bg-[#ffdcc4] active:border-b-2 active:translate-y-0.5 cursor-pointer"
                        >
                          All
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs font-bold text-[#615d76] bg-[#f8f7fc] rounded-2xl border border-dashed border-[#d6c6fa] px-4 py-3 text-center">
            No stocks owned in this simulation yet — use Maya&apos;s Quick Trade above to buy your first share!
          </p>
        )}
      </section>

      {/* 4. COLLAPSIBLE DETAILS & AUDIT LOGS (Keeps main arcade 100% uncluttered!) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Price Table & Zero-Lookahead Lock Details */}
        <details className="rounded-2xl bg-white border-2 border-[#e5ddf8] px-4 py-3">
          <summary className="cursor-pointer font-extrabold text-xs sm:text-sm text-[#4f32a9] flex items-center justify-between select-none">
            <span>
              📊 Price Table &amp; Locked Days ({visibleMarketData.length} open · {lockedSessionDates.length} locked)
            </span>
            <span className="text-[11px] font-bold text-[#615d76]">Expand ▾</span>
          </summary>

          <div className="pt-4 space-y-4">
            <div className="overflow-x-auto rounded-xl border border-[#e8e4f1]">
              <table className="w-full text-left text-xs" aria-label="Market Data Table">
                <thead>
                  <tr className="border-b border-[#e8e4f1] bg-[#f6f3ff] text-[#4f32a9] font-extrabold">
                    <th className="py-2 px-2.5">Session</th>
                    <th className="py-2 px-2.5">Open</th>
                    <th className="py-2 px-2.5">High</th>
                    <th className="py-2 px-2.5">Low</th>
                    <th className="py-2 px-2.5">Close</th>
                    <th className="py-2 px-2.5 text-right">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e4f1] font-mono">
                  {visibleMarketData.map((bar) => (
                    <tr
                      key={bar.session_date}
                      data-testid={`market-data-row-${bar.session_date}`}
                      className="hover:bg-[#fbfaff]"
                    >
                      <td className="py-2 px-2.5 font-bold text-[#222038]">
                        {bar.session_date}
                      </td>
                      <td className="py-2 px-2.5 text-[#222038]">${parseFloat(bar.open).toFixed(2)}</td>
                      <td className="py-2 px-2.5 text-[#222038]">${parseFloat(bar.high).toFixed(2)}</td>
                      <td className="py-2 px-2.5 text-[#222038]">${parseFloat(bar.low).toFixed(2)}</td>
                      <td className="py-2 px-2.5 font-bold text-[#222038]">${parseFloat(bar.close).toFixed(2)}</td>
                      <td className="py-2 px-2.5 text-right text-[#615d76]">{formatVolume(bar.volume)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              data-testid="future-data-locked-banner"
              className="rounded-2xl border border-[#dfd5f8] bg-[#f6f3ff] p-3.5 space-y-2.5"
            >
              <h4 className="text-xs font-black text-[#4f32a9]">
                🔒 Future Market Prices Locked
              </h4>
              <p className="text-[11px] text-[#615d76] leading-relaxed">
                Future prices are locked until the session is advanced. Market data beyond{' '}
                <strong className="text-[#222038]">{activeSimulation.current_session}</strong> is withheld to prevent lookahead bias.
              </p>

              {lockedSessionDates.length > 0 ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {lockedSessionDates.map((date) => (
                    <div
                      key={date}
                      data-testid={`locked-session-${date}`}
                      className="flex items-center justify-between p-2 rounded-xl border border-dashed border-[#cfc1fa] bg-white text-[#615d76] text-[11px]"
                    >
                      <span className="font-mono font-semibold">{date}</span>
                      <span className="font-bold text-[#4f32a9]">Locked</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] font-bold text-[#285137] bg-[#e3f3d9] border border-[#b8dfa4] p-2.5 rounded-xl">
                  All calendar sessions in this historical dataset have been unlocked.
                </div>
              )}
            </div>
          </div>
        </details>

        {/* Order Audit Log & Dataset Metadata */}
        <details className="rounded-2xl bg-white border-2 border-[#e5ddf8] px-4 py-3">
          <summary className="cursor-pointer font-extrabold text-xs sm:text-sm text-[#4f32a9] flex items-center justify-between select-none">
            <span>
              🧾 Order Log ({transactions.length}) &amp; Dataset Info
            </span>
            <span className="text-[11px] font-bold text-[#615d76]">Expand ▾</span>
          </summary>

          <div className="pt-4 space-y-4">
            {transactions.length > 0 ? (
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                {transactions.slice(0, 8).map((txn) => (
                  <div
                    key={txn.id}
                    className="p-2 rounded-xl bg-[#fbfaff] border border-[#e8e4f1] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full font-sans text-[9px] font-extrabold uppercase ${
                          txn.side === 'buy'
                            ? 'bg-[#e3f3d9] text-[#285137]'
                            : 'bg-[#ffe9da] text-[#7b402a]'
                        }`}
                      >
                        {txn.side}
                      </span>
                      <span className="font-bold text-[#222038]">
                        {txn.quantity} {txn.symbol}
                      </span>
                      <span className="text-[#615d76]">@ ${parseFloat(txn.price).toFixed(2)}</span>
                    </div>
                    <span className="text-[#615d76] font-sans text-[10px]">{txn.session_date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#615d76]">No orders placed yet in this run.</p>
            )}

            <Card data-testid="dataset-metadata-card" className="!p-3.5 !rounded-2xl bg-[#fbfaff] border-[#e8e4f1]">
              <div className="space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-black text-[#222038]" data-testid="dataset-label">
                    {activeDataset.label}
                  </h3>
                  {activeDataset.synthetic ? (
                    <span
                      data-testid="dataset-type-badge"
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ffe9da] text-[#7b402a]"
                    >
                      Synthetic Fixture / Demo Data
                    </span>
                  ) : (
                    <span
                      data-testid="dataset-type-badge"
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e3f3d9] text-[#285137]"
                    >
                      Verified Real Historical Data (No Corporate Actions)
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#615d76]">
                  <span>
                    <strong className="text-[#222038]">Source:</strong>{' '}
                    <span data-testid="dataset-source">{activeDataset.source}</span>
                  </span>
                  <span className="font-mono text-[#4f32a9]" data-testid="dataset-id">
                    {activeDataset.id}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1 pt-1" data-testid="symbol-universe">
                  {activeDataset.symbols.map((sym) => (
                    <span
                      key={sym}
                      data-testid={`symbol-badge-${sym}`}
                      className="px-1.5 py-0.5 rounded bg-[#f6f3ff] text-[#4f32a9] font-mono text-[10px] font-semibold border border-[#e8e4f1]"
                    >
                      {sym}
                    </span>
                  ))}
                </div>

                <div
                  data-testid="limitation-disclosure"
                  className="text-[11px] text-[#615d76] rounded-xl bg-white border border-[#e8e4f1] p-2.5 leading-relaxed"
                >
                  <strong className="text-[#222038]">Educational Price-Only Model Disclosure (MVP):</strong>{' '}
                  This simulation executes against unadjusted daily OHLCV prices. Corporate actions, including
                  dividends and stock splits, margin borrowing, short selling, and options execution are strictly
                  excluded in this MVP educational release.
                </div>
              </div>
            </Card>
          </div>
        </details>
      </div>
    </div>
  );
}

export default SimulationView;

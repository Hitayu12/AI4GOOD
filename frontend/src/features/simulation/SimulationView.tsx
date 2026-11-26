import React, { useEffect, useState, useId, useRef, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
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
  FIXTURE_INSTRUMENTS,
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
    return `Tuck perks up! Bullish energy on ${symbol} — hit Advance Session when you're ready to see the tape!`;
  }
  if (prediction === 0) {
    return `Tuck nods calmly. Calling a flat pause for ${symbol} — advance the session to see if buyers and sellers tie!`;
  }
  return `Tuck raises an eyebrow! Spotting a pullback on ${symbol}? Advance the session to test your read!`;
}

/**
 * FutureWorth Midnight Royal Purple SVG Financial Chart
 * Provides clean candlestick or line view of historical bars up to the current session cursor.
 */
function MarketReplayChart({
  bars,
  selectedSymbol,
  activeSession,
  mode,
}: {
  bars: MarketDataBar[];
  selectedSymbol: string;
  activeSession: string;
  mode: 'candles' | 'line';
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const chartId = useId().replace(/:/g, '');
  const areaGradId = `fw-area-${chartId}`;

  if (bars.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center rounded-[22px] bg-[#272047] border border-[#4f32a9]/60 text-[#d8cbf8] text-xs font-mono">
        Awaiting market data feed...
      </div>
    );
  }

  const svgWidth = 720;
  const svgHeight = 264;
  const padLeft = 48;
  const padRight = 68;
  const padTop = 26;
  const padBottom = 40;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const lows = bars.map((b) => parseFloat(b.low));
  const highs = bars.map((b) => parseFloat(b.high));
  const minLow = Math.min(...lows);
  const maxHigh = Math.max(...highs);
  const spread = maxHigh - minLow || 1;
  const yMin = Math.max(0, minLow - spread * 0.08);
  const yMax = maxHigh + spread * 0.08;
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
  const getVolH = (vol: number) => Math.min(36, (vol / maxVol) * 36);

  const linePoints = bars
    .map((b, i) => `${getX(i).toFixed(1)},${getY(parseFloat(b.close)).toFixed(1)}`)
    .join(' ');
  const areaPoints = `${getX(0).toFixed(1)},${(padTop + chartH).toFixed(1)} ${linePoints} ${getX(
    bars.length - 1
  ).toFixed(1)},${(padTop + chartH).toFixed(1)}`;

  const gridSteps = 4;
  const gridValues = Array.from({ length: gridSteps + 1 }, (_, i) => yMin + (i / gridSteps) * yRange);
  const labelStep = bars.length > 10 ? Math.ceil(bars.length / 8) : 1;

  const activeBar = hoveredIdx !== null && bars[hoveredIdx] ? bars[hoveredIdx] : bars[bars.length - 1];

  return (
    <div className="relative rounded-[22px] bg-[#272047] border border-[#4f32a9]/60 p-4 sm:p-5 shadow-xl overflow-hidden text-white">
      {/* Chart Top Sub-bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-[#dbfb84] text-[#272047]">
            {selectedSymbol}
          </span>
          <span className="text-[#d8cbf8] font-mono text-[11px]">
            {activeBar ? activeBar.session_date : activeSession}
          </span>
          {activeBar && (
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="text-[#c7b9f0]">
                O: <strong className="text-white">${parseFloat(activeBar.open).toFixed(2)}</strong>
              </span>
              <span className="text-[#c7b9f0]">
                H: <strong className="text-[#a7f37a]">${parseFloat(activeBar.high).toFixed(2)}</strong>
              </span>
              <span className="text-[#c7b9f0]">
                L: <strong className="text-[#ffb499]">${parseFloat(activeBar.low).toFixed(2)}</strong>
              </span>
              <span className="text-[#c7b9f0]">
                C: <strong className="text-[#dbfb84]">${parseFloat(activeBar.close).toFixed(2)}</strong>
              </span>
            </div>
          )}
        </div>
        <div className="text-[11px] font-mono text-[#e8dcff] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#dbfb84] animate-pulse" />
          <span>Zero-Lookahead Terminal Feed</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-x-auto pt-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[580px] select-none"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dbfb84" stopOpacity="0.28" />
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
                  x={svgWidth - padRight + 8}
                  y={y + 3}
                  fill="#c7b9f0"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="start"
                >
                  ${val.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Volume histogram bars */}
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
                fillOpacity="0.22"
                rx="1.5"
              />
            );
          })}

          {/* Line or Candle Visuals */}
          {mode === 'line' ? (
            <>
              <polygon points={areaPoints} fill={`url(#${areaGradId})`} />
              <polyline
                fill="none"
                stroke="#dbfb84"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={linePoints}
              />
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
                    <circle
                      cx={x}
                      cy={y}
                      r={isCur ? 5 : hoveredIdx === i ? 4.5 : 3}
                      fill={isCur ? '#dbfb84' : '#a7f37a'}
                      stroke="#272047"
                      strokeWidth="1.75"
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
              const height = Math.max(2, Math.abs(yClose - yOpen));
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
                  {/* High/Low Wick */}
                  <line
                    x1={x}
                    y1={yHigh}
                    x2={x}
                    y2={yLow}
                    stroke={color}
                    strokeWidth={isCur ? '2.2' : '1.5'}
                  />
                  {/* Candle Body */}
                  <rect
                    x={x - candleW / 2}
                    y={top}
                    width={candleW}
                    height={height}
                    fill={color}
                    rx="2"
                  />
                  {/* Current Session Marker */}
                  {isCur && (
                    <circle
                      cx={x}
                      cy={Math.max(8, top - 7)}
                      r="3"
                      fill="#dbfb84"
                    />
                  )}
                </g>
              );
            })
          )}

          {/* Date Axis along the bottom */}
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
                  y={svgHeight - 12}
                  fill={isCur ? '#dbfb84' : '#b7a9e6'}
                  fontSize="10"
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

  // Simulation service instance
  const [simService] = useState<SimulationService>(
    () => service ?? new SimulationService(seeds)
  );

  // Datasets
  const [datasets] = useState<DatasetMetadata[]>(FIXTURE_DATASETS);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(defaultDataset.id);

  // Simulations list & active simulation
  const [simulations, setSimulations] = useState<Simulation[]>(() => {
    if (seeds && seeds.length > 0) {
      return seeds.map((s) => ({ ...s }));
    }
    return [{ ...INITIAL_SIMULATION_FIXTURE }];
  });

  const [activeSimulationId, setActiveSimulationId] = useState(
    () => saved?.activeSimulationId ?? simulations[0].id
  );

  // Active Symbol in Market Data view
  const [selectedSymbol, setSelectedSymbol] = useState(() => saved?.selectedSymbol ?? defaultSymbol);

  // Chart view mode
  const [chartMode, setChartMode] = useState<'candles' | 'line'>('candles');

  // Active simulation object
  const activeSimulation: Simulation =
    simulations.find((s) => s.id === activeSimulationId) || simulations[0] || INITIAL_SIMULATION_FIXTURE;

  // Active dataset
  const activeDataset: DatasetMetadata =
    datasets.find((d) => d.id === activeSimulation.dataset_id) || defaultDataset;

  const sessionDates = useMemo(
    () => getReplaySessionDates(activeDataset.session_dates, activeSimulation.start_session, activeSimulation.end_session),
    [activeDataset, activeSimulation.start_session, activeSimulation.end_session]
  );
  const historicalEnd = activeDataset.session_dates[activeDataset.session_dates.length - 1];

  // Market data bars visible to cursor — derived with strict zero-lookahead filter
  const visibleMarketData: MarketDataBar[] = filterVisibleMarketData(
    selectedSymbol,
    activeSimulation.current_session
  );

  // Advance & Tuck Prediction state
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);
  const [advanceError, setAdvanceError] = useState<{ code?: string; message: string } | null>(null);
  const [prediction, setPrediction] = useState<-1 | 0 | 1>();
  const [predictionResult, setPredictionResult] = useState('');
  const [predictionOutcome, setPredictionOutcome] = useState<PredictionOutcome>(null);
  const [predictions, setPredictions] = useState(0);

  useEffect(() => {
    setPrediction(undefined);
    setPredictionResult('');
    setPredictionOutcome(null);
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

  // Live region announcement
  const liveAnnounceId = useId();
  const [announcement, setAnnouncement] = useState<string>('');

  // Locked future sessions
  const lockedSessionDates: string[] = sessionDates.filter(
    (d) => d > activeSimulation.current_session
  );

  // Calendar progress
  const currentSessionIndex = sessionDates.indexOf(activeSimulation.current_session);
  const activeSessionIndex = Math.max(0, currentSessionIndex);
  const totalCalendarSessions = sessionDates.length;
  const calendarProgressPct =
    totalCalendarSessions > 0
      ? Math.round(((currentSessionIndex + 1) / totalCalendarSessions) * 100)
      : 0;

  // Switch active simulation
  const handleSwitchSimulation = (simId: string) => {
    setActiveSimulationId(simId);
    setAdvanceError(null);
    const chosen = simulations.find((s) => s.id === simId);
    if (chosen) {
      const wallet = wallets.current[simId];
      setCashCents(wallet?.cashCents ?? chosen.initial_cash);
      setPositions(wallet?.positions ?? []);
      setTransactions(wallet?.transactions ?? []);
      setPredictions(0);
      setPredictionOutcome(null);
      setTradeValidationError(null);
      setTradeSuccessNotice(null);
      if (onSimulationChange) {
        onSimulationChange(chosen);
      }
      setAnnouncement(`Switched to simulation ${chosen.id} (Session ${chosen.current_session}).`);
    }
  };

  // Interactive Advance Session Handler
  const handleAdvanceSession = async () => {
    setAdvanceError(null);
    setPredictionResult('');
    setPredictionOutcome(null);

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
      if (prediction !== undefined) {
        const before = visibleMarketData[visibleMarketData.length - 1];
        const revealedBars = filterVisibleMarketData(selectedSymbol, updated.current_session);
        const after = revealedBars[revealedBars.length - 1];
        if (before && after && before.session_date !== after.session_date) {
          const change = Number(after.close) - Number(before.close);
          const direction = change > 0 ? 'rose' : change < 0 ? 'fell' : 'stayed flat';
          const isMatch = Math.sign(change) === prediction;
          const comparison = isMatch
            ? 'That matched your prediction.'
            : 'That differed from your prediction.';
          setPredictionOutcome(isMatch ? 'match' : 'miss');
          setPredictionResult(
            `${selectedSymbol} ${direction} from ${formatUSD(Number(before.close))} to ${formatUSD(
              Number(after.close)
            )}. ${comparison} One session is too little evidence to judge a strategy.`
          );
          setPredictions((count) => count + 1);
        } else {
          setPredictionOutcome('neutral');
          setPredictionResult('There is no new closing price for this symbol in this session.');
        }
        setPrediction(undefined);
      }

      setSimulations((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...updated } : s))
      );

      // Re-evaluate positions market prices and unrealized P&L on new session
      setPositions((prev) =>
        prev.map((pos) => {
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
        })
      );

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

  // Extend Calendar Handler (+30 continuous sessions beyond Day 5)
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

  // Reset Simulation to Day 1 Handler
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
      setPrediction(undefined);
      setPredictionResult('');
      setPredictionOutcome(null);
      setPredictions(0);
      setTradeValidationError(null);
      setTradeSuccessNotice('Reset simulation to Day 1 with fresh virtual cash. Ready to trade again!');
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

  // Create new simulation handler
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

  // Portfolio aggregates
  const totalMarketValueDollars = positions.reduce(
    (sum, pos) => sum + parseFloat(pos.market_value),
    0
  );
  const totalEquityDollars = cashCents / 100 + totalMarketValueDollars;
  const initialCashDollars = activeSimulation.initial_cash / 100;
  const totalReturnDollars = totalEquityDollars - initialCashDollars;
  const totalReturnPct =
    initialCashDollars > 0 ? (totalReturnDollars / initialCashDollars) * 100 : 0;

  // Execute trade order
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
          `Insufficient cash: Estimated cost ${formatUSD(orderCostCents / 100)} exceeds available cash ${formatUSD(
            cashCents / 100
          )}.`
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
        `Bought ${qty} share(s) of ${selectedSymbol} at $${price.toFixed(
          2
        )} on session ${activeSimulation.current_session}!`
      );
    } else {
      const existing = positions.find((p) => p.symbol === selectedSymbol);
      const held = existing?.quantity ?? 0;

      if (held === 0) {
        setTradeValidationError(
          `Cannot place sell order: You do not own any shares of ${selectedSymbol} (no short selling).`
        );
        return;
      }
      if (qty > held) {
        setTradeValidationError(
          `Oversell error: Cannot sell ${qty} shares; you only hold ${held} shares of ${selectedSymbol}.`
        );
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
        `Sold ${qty} share(s) of ${selectedSymbol} at $${price.toFixed(
          2
        )} on session ${activeSimulation.current_session}!`
      );
    }
  };

  // Quick Sell Helper
  const handleQuickSell = (sym: string, qty: number) => {
    setSelectedSymbol(sym);
    setOrderSide('sell');
    setTradeQtyInput(qty.toString());
    setTradeValidationError(null);
    setTradeSuccessNotice(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-[#222038]" style={FW_THEME_VARS}>
      {/* Trade Confirmation Modal */}
      <TradeConfirmationModal
        receipt={tradeReceipt}
        onClose={() => setTradeReceipt(null)}
      />

      {/* Tab Overview Modal */}
      <TabOverviewModal
        tab="simulation"
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
      />

      {/* Live Region for Screen Reader Announcements */}
      <div id={liveAnnounceId} role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Trading Floor Hero Banner with Girl Character Artwork */}
      <section
        role="region"
        aria-label="Curriculum Time Cursor Banner"
        data-testid="time-cursor-banner"
        className="fw-hero shadow-xl"
      >
        <div className="fw-hero-art" aria-hidden="true" />
        <div className="relative z-10 w-full p-6 sm:p-8 lg:p-10">
          <div className="lg:max-w-[66%] space-y-5">
            {/* Hero Kicker & Telemetry Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <p className="fw-hero-tag">
                <span aria-hidden="true">✦</span> FUTUREWORTH TRADING FLOOR
              </p>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#eee6ff] bg-white/10 px-2.5 py-1 rounded-full border border-white/20">
                Curriculum Time Cursor
              </span>
              {activeSimulation.status === 'completed' ? (
                <span
                  data-testid="simulation-status-badge"
                  className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#ffe9da] text-[#7b402a]"
                >
                  Completed
                </span>
              ) : (
                <span
                  data-testid="simulation-status-badge"
                  className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#dbfb84] text-[#272047]"
                >
                  Active
                </span>
              )}
              <span
                data-testid="simulation-version"
                className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-white/10 text-[#eee6ff] border border-white/20"
              >
                v{activeSimulation.version}
              </span>
            </div>

            {/* Hero Headline & Copy */}
            <div className="space-y-2">
              <h2 className="!m-0 font-black tracking-tight text-white">
                Read the tape. Make your move.
              </h2>
              <p className="text-sm sm:text-base text-[#eee6ff]/90 max-w-xl leading-relaxed">
                Step session by session with strict zero-lookahead isolation — read the close, back Tuck&apos;s call, and trade with virtual cash.
              </p>
            </div>

            {/* Session Status & Progress Strip */}
            <div className="rounded-2xl bg-[#242042]/80 backdrop-blur-md border border-white/15 p-4 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span
                    data-testid="cursor-current-session"
                    className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#dbfb84]"
                  >
                    {activeSimulation.current_session}
                  </span>
                  <span className="text-xs font-mono text-[#eee6ff]/85">
                    UTC Close: <span data-testid="cursor-current-time">{activeSimulation.current_time}</span>
                  </span>
                </div>
                <span className="text-xs font-bold text-[#e3f3d9] bg-white/10 px-2.5 py-1 rounded-full font-mono">
                  Day {activeSessionIndex + 1} of {totalCalendarSessions} ({calendarProgressPct}%)
                </span>
              </div>

              <div className="text-xs text-[#e8dcff]/85 flex items-center gap-2 flex-wrap font-mono">
                <span>
                  Session {activeSessionIndex + 1} of {totalCalendarSessions} ({calendarProgressPct}%)
                </span>
                <span>•</span>
                <span>
                  Range: {activeSimulation.start_session} → {activeSimulation.end_session}
                </span>
                <span>•</span>
                <span>
                  Initial Cash: {formatCashCents(activeSimulation.initial_cash)}
                </span>
              </div>

              {activeSimulation.end_session > historicalEnd && (
                <p className="text-xs font-medium text-[#dbfb84]">
                  {activeSimulation.current_session > historicalEnd
                    ? 'Generated practice prices for this session.'
                    : `Historical prices end ${historicalEnd}. Later prices are generated for practice.`}
                </p>
              )}

              {/* Electric Lime Timeline Progress Bar */}
              <div className="w-full bg-white/15 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    activeSimulation.status === 'completed' ? 'bg-[#ffe9da]' : 'bg-[#dbfb84]'
                  }`}
                  style={{ width: `${calendarProgressPct}%` }}
                />
              </div>
            </div>

            {/* Hero Primary & Secondary Actions */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                data-testid="advance-session-btn"
                onClick={handleAdvanceSession}
                disabled={isAdvancing || activeSimulation.status === 'completed'}
                aria-disabled={isAdvancing || activeSimulation.status === 'completed'}
                className={
                  activeSimulation.status === 'completed'
                    ? 'fw-button !mt-0 !bg-white/15 !text-[#eee6ff]/70 border border-white/20 !cursor-not-allowed'
                    : 'fw-button fw-button-lime !mt-0 shadow-md cursor-pointer'
                }
              >
                {isAdvancing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-[#272047]" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Advancing...
                  </span>
                ) : activeSimulation.status === 'completed' ? (
                  'Simulation Completed'
                ) : (
                  'Advance Session →'
                )}
              </button>

              {activeSimulation.status === 'completed' ? (
                <>
                  <button
                    type="button"
                    data-testid="extend-calendar-btn"
                    onClick={() => handleExtendSessions(30)}
                    disabled={isAdvancing}
                    className="fw-button fw-button-lime !mt-0 text-xs shadow-md cursor-pointer"
                  >
                    <span aria-hidden="true">⚡</span>
                    <span>Add 30 practice sessions</span>
                  </button>
                  <button
                    type="button"
                    data-testid="replay-sim-btn"
                    onClick={handleResetSimulation}
                    disabled={isAdvancing}
                    className="fw-quiet !bg-white/10 hover:!bg-white/20 !text-white !border-white/25 text-xs cursor-pointer"
                  >
                    <span aria-hidden="true">🔁</span>
                    <span>Reset to Day 1</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleExtendSessions(30)}
                    disabled={isAdvancing}
                    title="Add 30 generated practice sessions to the calendar"
                    className="fw-quiet !bg-white/10 hover:!bg-white/20 !text-[#eee6ff] !border-white/25 text-xs cursor-pointer"
                  >
                    <span aria-hidden="true">⚡</span>
                    <span>+30 practice sessions</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetSimulation}
                    disabled={isAdvancing}
                    title="Reset simulation back to Day 1 with fresh cash"
                    aria-label="Reset Run"
                    className="fw-quiet !bg-white/10 hover:!bg-white/20 !text-[#eee6ff] !border-white/25 text-xs cursor-pointer"
                  >
                    <span aria-hidden="true">🔁</span>
                    <span className="hidden sm:inline">Reset Run</span>
                  </button>
                </>
              )}
            </div>

            {/* Error Alert Display */}
            {advanceError && (
              <div
                role="alert"
                data-testid="advance-error-alert"
                className="rounded-xl bg-[#42202d]/95 border border-[#ff9b85]/60 p-3.5 text-xs text-[#ffe9da] flex items-start justify-between gap-2"
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
          </div>
        </div>
      </section>

      {/* Run Controls & New Simulation Bar */}
      <div className="fw-panel p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="fw-tile fw-lavender" aria-hidden="true">◷</span>
          <div>
            <p className="fw-kicker">Market Replay Lab</p>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-[#222038]">
              Historical Market Simulation
            </h2>
            <p className="text-xs text-[#615d76]">
              Curriculum-paced historical market environment with strict zero-lookahead price isolation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {simulations.length > 1 && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="sim-select" className="text-xs font-bold text-[#615d76]">
                Run:
              </label>
              <select
                id="sim-select"
                data-testid="simulation-select"
                value={activeSimulationId}
                onChange={(e) => handleSwitchSimulation(e.target.value)}
                className="text-xs font-bold rounded-xl border border-[#d9d0e9] bg-[#fbfaff] px-3 py-2 text-[#222038] focus:border-[#5637ca] focus:outline-none"
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
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOverviewOpen(true)}
            aria-label="What is Simulation Tab?"
            className="fw-quiet !min-h-[40px] !py-1.5 !px-3.5 !bg-[#eee6ff]/70 hover:!bg-[#eee6ff] !border-[#dfd5f8] !text-[#4f32a9] text-xs cursor-pointer"
          >
            <span aria-hidden="true">💡</span>
            <span>What is Simulation?</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowCreateModal(!showCreateModal);
              setCashValidationError(null);
            }}
            data-testid="toggle-create-sim-btn"
            aria-expanded={showCreateModal}
            className={
              showCreateModal
                ? 'fw-quiet !min-h-[40px] !py-1.5 !px-3.5 text-xs cursor-pointer'
                : 'fw-button !min-h-[40px] !py-1.5 !px-3.5 text-xs cursor-pointer'
            }
          >
            {showCreateModal ? 'Cancel' : '+ New Simulation'}
          </button>
        </div>
      </div>

      {/* Create Simulation Collapsible Panel */}
      {showCreateModal && (
        <Card
          title="Create New Historical Simulation"
          subtitle="Configure starting cash and dataset calendar"
          className="fw-panel bg-[#fbfaff] border-[#dfd5f8]"
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
                  className="w-full rounded-xl border border-[#d9d0e9] bg-white px-3 py-2.5 text-sm text-[#222038] shadow-xs focus:border-[#5637ca] focus:outline-none"
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
                      className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#eee6ff] text-[#4f32a9] hover:bg-[#e1d2ff] transition-colors cursor-pointer"
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
                className="fw-quiet !min-h-[40px] !py-1.5 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="submit-create-sim-btn"
                disabled={isCreating}
                className="fw-button !min-h-[40px] !py-1.5 text-xs cursor-pointer"
              >
                {isCreating ? 'Creating...' : 'Initialize Simulation'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Cycle Completed Banner */}
      {activeSimulation.status === 'completed' && (
        <div className="rounded-[22px] border border-[#5637ca]/50 bg-gradient-to-r from-[#272047] via-[#37296d] to-[#4f32a9] p-5 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="fw-tile fw-mint !w-9 !h-9 !text-lg" aria-hidden="true">🏆</span>
                <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#dbfb84]/20 text-[#dbfb84] border border-[#dbfb84]/40">
                  CYCLE COMPLETED
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Historical Cycle Finished! Final Portfolio:{' '}
                <span className="text-[#dbfb84]">{formatUSD(totalEquityDollars)}</span>
              </h3>
              <p className="text-xs text-[#eee6ff]/85">
                You navigated through {activeSimulation.end_session}. Extend the calendar by 30 days to continue trading, or restart to test a new strategy!
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => handleExtendSessions(30)}
                className="fw-button fw-button-lime !min-h-[40px] !py-2 text-xs shadow-md cursor-pointer"
              >
                <span aria-hidden="true">⚡</span>
                <span>Keep Trading (+30 Days)</span>
              </button>
              <button
                type="button"
                onClick={handleResetSimulation}
                className="fw-quiet !min-h-[40px] !py-2 !bg-white/10 hover:!bg-white/20 !text-white !border-white/25 text-xs cursor-pointer"
              >
                <span aria-hidden="true">🔁</span>
                <span>Reset to Day 1</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tuck's Market Call Desk */}
      <section
        aria-label="Tuck's Market Call"
        className="fw-panel border-[#dfd5f8] bg-[linear-gradient(110deg,#ede4ff,#f7f2ff_62%,#f6fde8)] p-5 sm:p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Tuck Mascot + Speech Bubble */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 min-w-0">
            <div className="fw-daily-art p-2.5 shrink-0 border border-[#dfd5f8]">
              <Tuck className="w-24 h-24 sm:w-28 sm:h-28 object-contain" />
            </div>

            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="fw-kicker">Tuck&apos;s Market Call</p>
                {predictions > 0 && (
                  <span className="text-[11px] font-extrabold font-mono px-2.5 py-0.5 rounded-full bg-[#eee6ff] text-[#4f32a9] border border-[#d6c6fa]">
                    {predictions} {predictions === 1 ? 'forecast checked' : 'forecasts checked'}
                  </span>
                )}
              </div>

              <div className="relative rounded-2xl bg-white border border-[#dfd5f8] px-4 py-3 shadow-2xs">
                <p className="text-sm sm:text-[15px] font-bold text-[#222038] leading-snug">
                  {`Day ${activeSessionIndex + 1}: ${selectedSymbol} closed at $${latestClose}. What's your prediction for tomorrow's open?`}
                </p>
                {prediction !== undefined && !predictionResult && (
                  <p role="status" className="mt-1.5 text-xs font-semibold text-[#4f32a9]">
                    {getTuckPickReaction(prediction, selectedSymbol)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Higher / Flat / Lower Prediction Controls */}
          <div
            className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0"
            role="group"
            aria-label="Predict next session close"
          >
            {(
              [
                {
                  value: 1,
                  label: 'Higher ▲',
                  idleClass: 'bg-[#e3f3d9] text-[#285137] border-[#b8dfa4] hover:bg-[#d4ecc5]',
                  activeClass: 'bg-[#dbfb84] text-[#272047] border-[#5637ca] ring-2 ring-[#5637ca]/30 shadow-sm',
                },
                {
                  value: 0,
                  label: 'Flat ━',
                  idleClass: 'bg-[#eee6ff] text-[#4f32a9] border-[#d6c6fa] hover:bg-[#e3d7ff]',
                  activeClass: 'bg-[#5637ca] text-white border-[#4626ad] ring-2 ring-[#5637ca]/30 shadow-sm',
                },
                {
                  value: -1,
                  label: 'Lower ▼',
                  idleClass: 'bg-[#ffe9da] text-[#7b402a] border-[#f4c6a8] hover:bg-[#ffdcc4]',
                  activeClass: 'bg-[#7b402a] text-[#ffe9da] border-[#5e2f1e] ring-2 ring-[#7b402a]/30 shadow-sm',
                },
              ] as const
            ).map(({ value, label, idleClass, activeClass }) => {
              const isSelected = prediction === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={isAdvancing || activeSimulation.status === 'completed'}
                  className={`min-h-[44px] px-4 py-2 rounded-xl border text-xs sm:text-sm font-extrabold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSelected ? activeClass : idleClass
                  }`}
                  onClick={() => {
                    setPrediction(value);
                    setPredictionResult('');
                    setPredictionOutcome(null);
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Outcome Feedback from Tuck */}
        {predictionResult && (
          <div
            role="status"
            className={`fw-feedback !mb-0 flex items-start gap-3 border ${
              predictionOutcome === 'match'
                ? 'fw-mint border-[#b8dfa4] text-[#285137]'
                : predictionOutcome === 'miss'
                ? 'fw-peach border-[#f4c6a8] text-[#7b402a]'
                : 'border-[#dfd5f8] text-[#4f32a9]'
            }`}
          >
            <span className="text-base leading-none mt-0.5" aria-hidden="true">
              {predictionOutcome === 'match' ? '🎉' : predictionOutcome === 'miss' ? '🐾' : '✦'}
            </span>
            <p className="text-xs sm:text-sm font-semibold leading-relaxed">
              <strong className="font-black">
                {predictionOutcome === 'match'
                  ? 'Spot-on call! Tuck gives you a high-five — '
                  : predictionOutcome === 'miss'
                  ? 'Plot twist on the tape! Tuck says keep learning — '
                  : 'Tuck notes: '}
              </strong>
              {predictionResult}
            </p>
          </div>
        )}
      </section>

      {/* Dataset Metadata Ribbon & Educational Disclosure */}
      <Card data-testid="dataset-metadata-card" className="fw-panel py-4 px-5">
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-[#222038]" data-testid="dataset-label">
                  {activeDataset.label}
                </h3>
                {activeDataset.synthetic ? (
                  <span
                    data-testid="dataset-type-badge"
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ffe9da] text-[#7b402a] border border-[#f4c6a8]"
                  >
                    Synthetic Fixture / Demo Data
                  </span>
                ) : (
                  <span
                    data-testid="dataset-type-badge"
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e3f3d9] text-[#285137] border border-[#b8dfa4]"
                  >
                    Verified Real Historical Data (No Corporate Actions)
                  </span>
                )}
              </div>
              <p className="text-xs text-[#615d76]">
                <span className="font-bold text-[#222038]">Source:</span>{' '}
                <span data-testid="dataset-source">{activeDataset.source}</span>
              </p>
            </div>

            <div className="text-left md:text-right">
              <span className="text-[11px] text-[#615d76] block uppercase font-mono tracking-wider">Dataset Identifier</span>
              <span className="text-xs font-mono font-bold text-[#4f32a9]" data-testid="dataset-id">
                {activeDataset.id}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-[#e8e4f1]">
            {/* Symbol Universe Badges */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs" data-testid="symbol-universe">
              <span className="font-bold text-[#615d76] mr-1">Symbols:</span>
              {activeDataset.symbols.map((sym) => {
                const instrumentList = FIXTURE_INSTRUMENTS[activeDataset.id] || [];
                const inst = instrumentList.find((i) => i.symbol === sym);
                return (
                  <span
                    key={sym}
                    data-testid={`symbol-badge-${sym}`}
                    className="inline-flex items-center px-2 py-0.5 rounded-lg bg-[#f6f3ff] text-[#4f32a9] font-mono text-[11px] font-semibold border border-[#e8e4f1]"
                  >
                    {sym} {inst && <span className="text-[#615d76] font-sans ml-1">({inst.name})</span>}
                  </span>
                );
              })}
            </div>

            {/* Price-Only Disclosure Banner */}
            <div
              data-testid="limitation-disclosure"
              className="text-[11px] text-[#615d76] rounded-xl bg-[#f8f7fc] border border-[#e8e4f1] px-3 py-2 flex items-center gap-2"
            >
              <span className="text-[#4f32a9] font-bold" aria-hidden="true">ℹ️</span>
              <span>
                <strong className="text-[#222038]">Educational Price-Only Model Disclosure (MVP):</strong>{' '}
                This simulation executes against unadjusted daily OHLCV prices. Corporate actions, including
                dividends and stock splits, margin borrowing, short selling, and options execution are strictly
                excluded in this MVP educational release. Options are educational curriculum concepts only.
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Spacious Candle/Line Chart & Symbol Workspace */}
      <section data-testid="market-data-view" className="space-y-4">
        {/* Symbol Universe Tabs & Chart Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8e4f1] pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="fw-kicker mr-1.5">Symbols:</span>
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
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#272047] text-[#dbfb84] border-[#272047] shadow-xs'
                      : 'bg-white text-[#4f32a9] border-[#e8e4f1] hover:bg-[#f6f3ff] hover:border-[#cfc1fa]'
                  }`}
                >
                  <span className="font-mono">{sym}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-[#615d76]">
              Viewing Symbol: <strong className="text-[#222038] font-mono">{selectedSymbol}</strong>
            </div>

            {/* Chart Mode Toggle */}
            <div className="inline-flex rounded-xl border border-[#dfd5f8] bg-[#eee6ff] p-0.5 text-[11px] font-extrabold">
              <button
                type="button"
                onClick={() => setChartMode('candles')}
                className={`px-3 py-1 rounded-[10px] transition-colors cursor-pointer ${
                  chartMode === 'candles'
                    ? 'bg-[#272047] text-[#dbfb84] shadow-2xs'
                    : 'text-[#4f32a9] hover:text-[#222038]'
                }`}
              >
                Candles
              </button>
              <button
                type="button"
                onClick={() => setChartMode('line')}
                className={`px-3 py-1 rounded-[10px] transition-colors cursor-pointer ${
                  chartMode === 'line'
                    ? 'bg-[#272047] text-[#dbfb84] shadow-2xs'
                    : 'text-[#4f32a9] hover:text-[#222038]'
                }`}
              >
                Line
              </button>
            </div>
          </div>
        </div>

        {/* FutureWorth Live Session KPI Bar */}
        {latestVisibleBar && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="fw-panel p-3.5 bg-[#f6f3ff] border-[#dfd5f8]">
              <span className="fw-kicker text-[10px] block">Latest Close</span>
              <span className="text-lg font-black font-mono text-[#222038]" data-testid="latest-close-price">
                ${parseFloat(latestVisibleBar.close).toFixed(2)}
              </span>
            </div>
            <div className="fw-panel p-3.5">
              <span className="text-[10px] font-extrabold text-[#615d76] uppercase tracking-wider block">Open</span>
              <span className="text-sm font-black font-mono text-[#222038]">
                ${parseFloat(latestVisibleBar.open).toFixed(2)}
              </span>
            </div>
            <div className="fw-panel p-3.5 bg-[#e3f3d9]/50 border-[#b8dfa4]">
              <span className="text-[10px] font-extrabold text-[#285137] uppercase tracking-wider block">High</span>
              <span className="text-sm font-black font-mono text-[#285137]">
                ${parseFloat(latestVisibleBar.high).toFixed(2)}
              </span>
            </div>
            <div className="fw-panel p-3.5 bg-[#ffe9da]/55 border-[#f4c6a8]">
              <span className="text-[10px] font-extrabold text-[#7b402a] uppercase tracking-wider block">Low</span>
              <span className="text-sm font-black font-mono text-[#7b402a]">
                ${parseFloat(latestVisibleBar.low).toFixed(2)}
              </span>
            </div>
            <div className="fw-panel p-3.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-extrabold text-[#615d76] uppercase tracking-wider block">Volume</span>
              <span className="text-sm font-black font-mono text-[#222038]">
                {formatVolume(latestVisibleBar.volume)}
              </span>
            </div>
          </div>
        )}

        {/* The Financial Terminal Chart */}
        <MarketReplayChart
          bars={visibleMarketData}
          selectedSymbol={selectedSymbol}
          activeSession={activeSimulation.current_session}
          mode={chartMode}
        />

        {/* Market Data Records Table */}
        <Card
          title={`${selectedSymbol} Market Data Records`}
          subtitle={`Sessions up to current cursor (${activeSimulation.current_session})`}
          className="fw-panel"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Market Data Table">
              <thead>
                <tr className="border-b border-[#e8e4f1] bg-[#f6f3ff] text-[#4f32a9] font-extrabold">
                  <th className="py-2.5 px-3">Session Date</th>
                  <th className="py-2.5 px-3">Available At (UTC)</th>
                  <th className="py-2.5 px-3">Open</th>
                  <th className="py-2.5 px-3">High</th>
                  <th className="py-2.5 px-3">Low</th>
                  <th className="py-2.5 px-3">Close</th>
                  <th className="py-2.5 px-3">Session Return</th>
                  <th className="py-2.5 px-3 text-right">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e4f1] font-mono">
                {visibleMarketData.map((bar) => {
                  const openNum = parseFloat(bar.open);
                  const closeNum = parseFloat(bar.close);
                  const diff = closeNum - openNum;
                  const pct = openNum > 0 ? (diff / openNum) * 100 : 0;
                  const isPositive = diff >= 0;

                  return (
                    <tr
                      key={bar.session_date}
                      data-testid={`market-data-row-${bar.session_date}`}
                      className="hover:bg-[#fbfaff] transition-colors"
                    >
                      <td className="py-2.5 px-3 font-bold text-[#222038]">
                        {bar.session_date}
                        {bar.session_date === activeSimulation.current_session && (
                          <span className="ml-2 text-[10px] font-sans font-extrabold bg-[#eee6ff] text-[#4f32a9] border border-[#d6c6fa] px-2 py-0.5 rounded-full">
                            CURRENT
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#615d76]">{bar.available_at}</td>
                      <td className="py-2.5 px-3 text-[#222038]">${openNum.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-[#222038]">${parseFloat(bar.high).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-[#222038]">${parseFloat(bar.low).toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-bold text-[#222038]">${closeNum.toFixed(2)}</td>
                      <td
                        className={`py-2.5 px-3 font-bold ${
                          isPositive ? 'text-[#285137]' : 'text-[#7b402a]'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {diff.toFixed(2)} ({pct.toFixed(2)}%)
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#615d76]">{formatVolume(bar.volume)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Future Sessions Locked Notification */}
        <div
          data-testid="future-data-locked-banner"
          className="rounded-[19px] border border-[#dfd5f8] bg-[#f6f3ff] p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm" aria-hidden="true">🔒</span>
            <h4 className="fw-kicker">
              Future Market Prices Locked
            </h4>
          </div>

          <p className="text-xs text-[#615d76] leading-relaxed">
            Future prices are locked until the session is advanced. Market data beyond{' '}
            <strong className="text-[#222038]">{activeSimulation.current_session}</strong> is strictly
            withheld from the interface to prevent lookahead bias and preserve realistic curriculum pacing.
          </p>

          {lockedSessionDates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
              {lockedSessionDates.map((date) => (
                <div
                  key={date}
                  data-testid={`locked-session-${date}`}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-dashed border-[#cfc1fa] bg-white text-[#615d76] text-xs"
                >
                  <span className="font-mono font-semibold">Session {date}</span>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#4f32a9]">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Locked
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs font-bold text-[#285137] bg-[#e3f3d9] border border-[#b8dfa4] p-3 rounded-xl">
              All calendar sessions in this historical dataset have been unlocked.
            </div>
          )}
        </div>
      </section>

      {/* FutureWorth Paper Trading Desk */}
      <section
        aria-label="Simulation Paper Trading Desk"
        className="fw-panel p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#e8e4f1] pb-4">
          <div className="flex items-center gap-3">
            <span className="fw-tile fw-mint" aria-hidden="true">✦</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-[#222038]">
                  Simulation Paper Trading Desk
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#eee6ff] text-[#4f32a9] border border-[#d6c6fa]">
                  Active Session: {activeSimulation.current_session}
                </span>
              </div>
              <p className="text-xs text-[#615d76] mt-0.5">
                Buy and sell any stock on the current session without lookahead bias.
              </p>
            </div>
          </div>

          {/* Quick Portfolio Balance Ribbon */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-2 rounded-xl bg-[#f6f3ff] border border-[#e8e4f1] text-xs">
              <span className="text-[#615d76] block text-[10px] uppercase font-extrabold">Cash Balance</span>
              <span className="font-mono font-black text-[#222038]">{formatUSD(cashCents / 100)}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#f6f3ff] border border-[#e8e4f1] text-xs">
              <span className="text-[#615d76] block text-[10px] uppercase font-extrabold">Total Portfolio</span>
              <span className="font-mono font-black text-[#222038]">{formatUSD(totalEquityDollars)}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#f6f3ff] border border-[#e8e4f1] text-xs">
              <span className="text-[#615d76] block text-[10px] uppercase font-extrabold mb-0.5">Overall Return</span>
              <LossGainBadge
                dollarValue={totalReturnDollars}
                percentValue={totalReturnPct}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Order Ticket & Holdings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Order Ticket (5 cols) */}
          <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-[#fbfaff] border border-[#e8e4f1] space-y-4">
            <div className="flex items-center justify-between">
              <span className="fw-kicker">
                Place Simulation Order
              </span>
              <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-[#272047] text-[#dbfb84]">
                {selectedSymbol}: ${activeSessionPrice.toFixed(2)}
              </span>
            </div>

            {/* Buy / Sell Toggle */}
            <div className="grid grid-cols-2 gap-1.5 bg-[#eee6ff] p-1 rounded-xl border border-[#dfd5f8]">
              <button
                type="button"
                onClick={() => {
                  setOrderSide('buy');
                  setTradeValidationError(null);
                }}
                className={`py-2 rounded-[10px] text-xs font-extrabold transition-all cursor-pointer ${
                  orderSide === 'buy'
                    ? 'bg-[#dbfb84] text-[#272047] shadow-2xs'
                    : 'text-[#4f32a9] hover:text-[#222038]'
                }`}
              >
                Buy Shares
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderSide('sell');
                  setTradeValidationError(null);
                }}
                className={`py-2 rounded-[10px] text-xs font-extrabold transition-all cursor-pointer ${
                  orderSide === 'sell'
                    ? 'bg-white text-[#7b402a] border border-[#f4c6a8] shadow-2xs'
                    : 'text-[#4f32a9] hover:text-[#222038]'
                }`}
              >
                Sell Shares
              </button>
            </div>

            {/* Selected Stock Info */}
            <div className="p-3 rounded-xl bg-white border border-[#e8e4f1] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[#222038]">
                  {selectedSymbol} • {SYMBOL_NAMES[selectedSymbol] || selectedSymbol}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#eee6ff] text-[#4f32a9]">
                  Held: {currentHeldShares} shs
                </span>
              </div>
              <div className="flex items-center justify-between text-[#615d76] text-[11px]">
                <span>Session Close Price:</span>
                <span className="font-mono font-bold text-[#222038]">${activeSessionPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Quantity Input + Chips */}
            <div className="space-y-1.5">
              <label htmlFor="sim-trade-qty" className="block text-xs font-bold text-[#222038]">
                Shares to {orderSide === 'buy' ? 'Buy' : 'Sell'}:
              </label>
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
                className="w-full !rounded-xl !border-[#d9d0e9]"
              />
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <span className="text-[10px] font-bold text-[#615d76]">Quick:</span>
                {[1, 5, 10, 25, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setTradeQtyInput(preset.toString());
                      setTradeValidationError(null);
                    }}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white border border-[#e8e4f1] hover:border-[#5637ca] hover:bg-[#f6f3ff] text-[#4f32a9] transition-colors cursor-pointer"
                  >
                    +{preset}
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
                    className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-[#e3f3d9] text-[#285137] border border-[#b8dfa4] hover:bg-[#d4ecc5] transition-colors cursor-pointer"
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
                    className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-[#ffe9da] text-[#7b402a] border border-[#f4c6a8] hover:bg-[#ffdcc4] transition-colors cursor-pointer"
                  >
                    Sell All ({currentHeldShares})
                  </button>
                )}
              </div>
            </div>

            {/* Estimated Total */}
            <div className="p-3 rounded-xl bg-white border border-[#e8e4f1] flex items-center justify-between text-xs">
              <span className="text-[#615d76] font-semibold">Estimated Gross Total:</span>
              <span className="font-mono font-black text-sm text-[#222038]">
                {formatUSD((parseInt(tradeQtyInput, 10) || 0) * activeSessionPrice)}
              </span>
            </div>

            {/* Error & Success Messages */}
            {tradeValidationError && (
              <div className="p-3 rounded-xl bg-[#ffe9da] border border-[#f4c6a8] text-xs font-semibold text-[#7b402a]">
                {tradeValidationError}
              </div>
            )}
            {tradeSuccessNotice && (
              <div className="p-3 rounded-xl bg-[#e3f3d9] border border-[#b8dfa4] text-xs font-bold text-[#285137]">
                {tradeSuccessNotice}
              </div>
            )}

            {/* Submit Trade Button: Electric Lime for Buy, Sleek Quiet for Sell */}
            <button
              type="button"
              onClick={handleExecuteTrade}
              className={
                orderSide === 'buy'
                  ? 'fw-button fw-button-lime w-full shadow-xs cursor-pointer'
                  : 'fw-quiet w-full !border-[#cfc1fa] hover:!bg-[#ffe9da]/70 !text-[#7b402a] shadow-2xs cursor-pointer'
              }
            >
              <span>
                {orderSide === 'buy' ? 'Buy' : 'Sell'}{' '}
                {parseInt(tradeQtyInput, 10) || 1} {selectedSymbol} ({formatUSD((parseInt(tradeQtyInput, 10) || 1) * activeSessionPrice)})
              </span>
            </button>
          </div>

          {/* Holdings & Recent Orders (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e8e4f1] pb-2">
              <div className="flex items-center gap-2">
                <span className="fw-kicker">
                  Active Simulation Holdings
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#eee6ff] text-[#4f32a9]">
                  {positions.length} Positions
                </span>
              </div>
              <span className="text-[11px] text-[#615d76]">
                Priced at {activeSimulation.current_session} Close
              </span>
            </div>

            {positions.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-[#e8e4f1]">
                <table className="w-full text-left text-xs" aria-label="Simulation Holdings Table">
                  <thead className="bg-[#f6f3ff] text-[#4f32a9] font-extrabold border-b border-[#e8e4f1]">
                    <tr>
                      <th className="py-2.5 px-3">Asset</th>
                      <th className="py-2.5 px-3">Shares</th>
                      <th className="py-2.5 px-3">Avg Cost</th>
                      <th className="py-2.5 px-3">Market Value</th>
                      <th className="py-2.5 px-3">P&amp;L</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
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
                              className="font-extrabold text-[#5637ca] hover:underline text-left font-sans cursor-pointer"
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
                          <td className="py-2.5 px-3 text-right space-x-1 font-sans">
                            <button
                              type="button"
                              onClick={() => handleQuickSell(pos.symbol, 1)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-white text-[#7b402a] border border-[#f4c6a8] hover:bg-[#ffe9da] transition-colors cursor-pointer"
                            >
                              Sell 1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickSell(pos.symbol, pos.quantity)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-[#ffe9da] text-[#7b402a] border border-[#f4c6a8] hover:bg-[#ffdcc4] transition-colors cursor-pointer"
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
              <div className="p-6 rounded-2xl border border-dashed border-[#cfc1fa] bg-[#f8f7fc] text-center space-y-2">
                <span className="fw-tile fw-lavender mx-auto" aria-hidden="true">💼</span>
                <h4 className="text-sm font-black text-[#222038]">No stocks owned in this simulation yet</h4>
                <p className="text-xs text-[#615d76] max-w-sm mx-auto">
                  Pick a stock on the left, enter how many shares you want, and click <strong>Buy Shares</strong> to start building your portfolio!
                </p>
              </div>
            )}

            {/* Recent Orders Audit Feed */}
            {transactions.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="fw-kicker text-[11px] block">
                  Recent Orders This Run ({transactions.length})
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                  {transactions.slice(0, 6).map((txn) => (
                    <div
                      key={txn.id}
                      className="p-2.5 rounded-xl bg-[#fbfaff] border border-[#e8e4f1] flex items-center justify-between"
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
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default SimulationView;

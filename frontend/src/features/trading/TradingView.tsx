import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  DatasetMetadata,
  MarketDataBar,
  Order,
  OrderSide,
  Position,
  Simulation,
  Transaction,
} from './tradingTypes';
import {
  TradingService,
  formatUSD,
  formatPrice,
  dollarsToCents,
  generateIdempotencyKey,
} from './tradingService';
import {
  FIXTURE_DATASET_METADATA,
  INITIAL_SIMULATION_FIXTURE,
} from '../simulation/simulationFixtures';
import {
  fetchAllLiveQuotes,
  LiveQuote,
  MODERN_BASELINE_PRICES,
} from './yahooFinanceService';

export interface TradingViewProps {
  initialSimulation?: Simulation;
  initialCash?: number; // In dollars (e.g. 10000) or cents
  initialPositions?: Position[];
  initialOrders?: Order[];
  initialTransactions?: Transaction[];
  customMarketData?: Record<string, MarketDataBar[]>;
  customDataset?: DatasetMetadata;
  onOrderPlaced?: (order: Order) => void;
  onAdvance?: (result: {
    simulation: Simulation;
    order?: Order;
    transaction?: Transaction | null;
  }) => void;
  service?: TradingService;
}

export const SUPPORTED_SYMBOLS = [
  'AAPL',
  'MSFT',
  'NVDA',
  'AMZN',
  'GOOGL',
  'TSLA',
  'META',
  'SPY',
  'QQQ',
  'JNJ',
  'JPM',
  'WMT',
  'KO',
  'XOM',
  'MCD',
];

export const SYMBOL_NAMES: Record<string, string> = {
  AAPL: 'Apple Inc.',
  MSFT: 'Microsoft Corporation',
  NVDA: 'NVIDIA Corporation',
  AMZN: 'Amazon.com Inc.',
  GOOGL: 'Alphabet Inc.',
  TSLA: 'Tesla, Inc.',
  META: 'Meta Platforms Inc.',
  SPY: 'SPDR S&P 500 ETF Trust',
  QQQ: 'Invesco QQQ Trust',
  JNJ: 'Johnson & Johnson',
  JPM: 'JPMorgan Chase & Co.',
  WMT: 'Walmart Inc.',
  KO: 'The Coca-Cola Company',
  XOM: 'Exxon Mobil Corporation',
  MCD: "McDonald's Corporation",
};

export const SYMBOL_SECTORS: Record<string, { sector: string; badgeColor: string }> = {
  AAPL: { sector: 'Technology', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200' },
  MSFT: { sector: 'Enterprise Software', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200' },
  NVDA: { sector: 'Semiconductors / AI', badgeColor: 'bg-purple-100 text-purple-800 border-purple-200' },
  AMZN: { sector: 'E-Commerce / Cloud', badgeColor: 'bg-amber-100 text-amber-800 border-amber-200' },
  GOOGL: { sector: 'Internet / Search', badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  TSLA: { sector: 'Automotive / Energy', badgeColor: 'bg-rose-100 text-rose-800 border-rose-200' },
  META: { sector: 'Social Platforms', badgeColor: 'bg-sky-100 text-sky-800 border-sky-200' },
  SPY: { sector: 'Broad S&P 500 ETF', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  QQQ: { sector: 'Tech Nasdaq 100 ETF', badgeColor: 'bg-teal-100 text-teal-800 border-teal-200' },
  JNJ: { sector: 'Healthcare & Pharma', badgeColor: 'bg-red-100 text-red-800 border-red-200' },
  JPM: { sector: 'Banking & Financials', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  WMT: { sector: 'Retail & Consumer', badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  KO: { sector: 'Beverages & Staples', badgeColor: 'bg-rose-100 text-rose-800 border-rose-200' },
  XOM: { sector: 'Energy & Oil/Gas', badgeColor: 'bg-orange-100 text-orange-800 border-orange-200' },
  MCD: { sector: 'Restaurants & Real Estate', badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
};

export function TradingView({
  initialSimulation = INITIAL_SIMULATION_FIXTURE,
  initialCash = 10_000, // Default $10,000.00 cash
  initialPositions = [],
  initialOrders = [],
  initialTransactions = [],
  customMarketData,
  customDataset = FIXTURE_DATASET_METADATA,
  onOrderPlaced,
  onAdvance,
  service,
}: TradingViewProps) {
  // Service instance
  const tradingService = useMemo(
    () => service ?? new TradingService(customMarketData, customDataset),
    [service, customMarketData, customDataset]
  );

  // Simulation Cursor State
  const [simulation, setSimulation] = useState<Simulation>(() => ({ ...initialSimulation }));

  // Cash in cents (precision guarantee)
  const [cashCents, setCashCents] = useState<number>(() => {
    // If initialCash is already large (> 1,000,000) and equals initialSimulation.initial_cash, assume cents
    if (initialCash === initialSimulation.initial_cash && initialCash > 1_000_000) {
      return initialCash;
    }
    // Otherwise treat as dollars
    return dollarsToCents(initialCash);
  });

  // Holdings & Positions State
  const [positions, setPositions] = useState<Position[]>(() =>
    initialPositions.map((p) => ({ ...p }))
  );

  // Orders & Transactions State
  const [orders, setOrders] = useState<Order[]>(() => initialOrders.map((o) => ({ ...o })));
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    initialTransactions.map((t) => ({ ...t }))
  );

  // Active Tab: Orders History vs Transactions Log
  const [activeTab, setActiveTab] = useState<'orders' | 'transactions'>('orders');

  // Mode: Historical Simulation (2024 dataset) vs Live Day Trading (Yahoo Finance Real-Time)
  const [tradingMode, setTradingMode] = useState<'simulation' | 'live_yahoo'>('simulation');

  // Real-time Yahoo Finance Quotes state (initialized with 2026 modern baseline)
  const [liveQuotes, setLiveQuotes] = useState<Record<string, LiveQuote>>(() => {
    const init: Record<string, LiveQuote> = {};
    for (const sym of SUPPORTED_SYMBOLS) {
      const base = MODERN_BASELINE_PRICES[sym] || {
        name: sym,
        price: 150.0,
        prevClose: 149.0,
        high: 152.0,
        low: 148.0,
        volume: 1000000,
      };
      const change = Number((base.price - base.prevClose).toFixed(2));
      const changePercent = Number(((change / base.prevClose) * 100).toFixed(2));
      init[sym] = {
        symbol: sym,
        name: base.name,
        price: base.price,
        previousClose: base.prevClose,
        change,
        changePercent,
        dayHigh: base.high,
        dayLow: base.low,
        volume: base.volume,
        timestamp: new Date().toISOString(),
        isMarketOpen: true,
        bid: Number((base.price - 0.05).toFixed(2)),
        ask: Number((base.price + 0.05).toFixed(2)),
        source: 'cache-fallback',
      };
    }
    return init;
  });

  const [isLiveRefreshing, setIsLiveRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(() => new Date().toLocaleTimeString());

  // Function to refresh all live quotes
  const refreshLiveQuotes = useCallback(async () => {
    setIsLiveRefreshing(true);
    try {
      const quotes = await fetchAllLiveQuotes(SUPPORTED_SYMBOLS);
      setLiveQuotes(quotes);
      setLastRefreshedAt(new Date().toLocaleTimeString());
    } catch {
      // Keep baseline quotes if fetch fails
    } finally {
      setIsLiveRefreshing(false);
    }
  }, []);

  // Polling interval when in Live Day Trading mode
  useEffect(() => {
    if (tradingMode === 'live_yahoo') {
      refreshLiveQuotes();
      const timer = setInterval(refreshLiveQuotes, 6000);
      return () => clearInterval(timer);
    }
  }, [tradingMode, refreshLiveQuotes]);

  // Form State
  const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL');
  const [orderSide, setOrderSide] = useState<OrderSide>('buy');
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => generateIdempotencyKey());
  const [instantFill, setInstantFill] = useState<boolean>(false);

  // Execution Feedback Notices
  const [rejectionNotice, setRejectionNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Single active pending order (if any)
  const pendingOrder: Order | null = orders.find((o) => o.status === 'pending') || null;

  // Latest visible close price for selected symbol (historical 2024 session)
  const latestClosePriceStr = tradingService.getLatestClosePrice(
    selectedSymbol,
    simulation.current_session
  );
  const latestCloseNum = latestClosePriceStr ? parseFloat(latestClosePriceStr) : 0;

  // Active live quote and active trading price
  const activeLiveQuote: LiveQuote | undefined = liveQuotes[selectedSymbol];
  const activePrice =
    tradingMode === 'live_yahoo' && activeLiveQuote
      ? activeLiveQuote.price
      : latestCloseNum;

  // Parsed quantity
  const parsedQuantity = parseInt(quantityInput, 10);
  const isQuantityValid =
    !isNaN(parsedQuantity) &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity >= 1 &&
    parsedQuantity <= 1_000_000;

  // Dynamic estimated order value
  const estimatedOrderValue = isQuantityValid && activePrice > 0
    ? parsedQuantity * activePrice
    : 0;

  // Held shares of currently selected symbol
  const currentHeldShares =
    positions.find((p) => p.symbol === selectedSymbol)?.quantity ?? 0;

  // Handle Quantity Change & Immediate Validation Feedback
  const handleQuantityChange = (val: string) => {
    setQuantityInput(val);
    setRejectionNotice(null);
    setSuccessNotice(null);

    const qty = parseInt(val, 10);
    if (!val || isNaN(qty) || qty < 1) {
      setValidationError('Quantity must be at least 1 whole share.');
      return;
    }
    if (qty > 1_000_000) {
      setValidationError('Quantity cannot exceed 1,000,000 shares.');
      return;
    }

    if (orderSide === 'sell') {
      if (currentHeldShares === 0) {
        setValidationError(
          `Cannot place sell order: You do not own any shares of ${selectedSymbol} (no short selling).`
        );
        return;
      }
      if (qty > currentHeldShares) {
        setValidationError(
          `Oversell error: Cannot sell ${qty} shares; you only hold ${currentHeldShares} shares of ${selectedSymbol}.`
        );
        return;
      }
    }

    if (orderSide === 'buy') {
      const estimatedCostCents = Math.round(qty * activePrice * 100);
      if (estimatedCostCents > cashCents) {
        setValidationError(
          `Insufficient cash: Estimated cost ${formatUSD(
            estimatedCostCents / 100
          )} exceeds available cash ${formatUSD(cashCents / 100)}.`
        );
        return;
      }
    }

    setValidationError(null);
  };

  // Handle Side Toggle
  const handleSideToggle = (side: OrderSide) => {
    setOrderSide(side);
    setRejectionNotice(null);
    setSuccessNotice(null);

    if (isQuantityValid) {
      if (side === 'sell') {
        if (currentHeldShares === 0) {
          setValidationError(
            `Cannot place sell order: You do not own any shares of ${selectedSymbol} (no short selling).`
          );
          return;
        }
        if (parsedQuantity > currentHeldShares) {
          setValidationError(
            `Oversell error: Cannot sell ${parsedQuantity} shares; you only hold ${currentHeldShares} shares of ${selectedSymbol}.`
          );
          return;
        }
      }
      if (side === 'buy') {
        const estimatedCostCents = Math.round(parsedQuantity * activePrice * 100);
        if (estimatedCostCents > cashCents) {
          setValidationError(
            `Insufficient cash: Estimated cost ${formatUSD(
              estimatedCostCents / 100
            )} exceeds available cash ${formatUSD(cashCents / 100)}.`
          );
          return;
        }
      }
    }
    setValidationError(null);
  };

  // Handle Symbol Change
  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol);
    setRejectionNotice(null);
    setSuccessNotice(null);

    const held = positions.find((p) => p.symbol === symbol)?.quantity ?? 0;
    if (orderSide === 'sell' && isQuantityValid) {
      if (held === 0) {
        setValidationError(
          `Cannot place sell order: You do not own any shares of ${symbol} (no short selling).`
        );
        return;
      }
      if (parsedQuantity > held) {
        setValidationError(
          `Oversell error: Cannot sell ${parsedQuantity} shares; you only hold ${held} shares of ${symbol}.`
        );
        return;
      }
    }
    setValidationError(null);
  };

  // Advance Session & Execute Order Core Handler
  const executeAdvanceWithOrder = (orderToExecute: Order | null) => {
    setRejectionNotice(null);
    setSuccessNotice(null);

    try {
      const result = tradingService.advanceAndExecute(
        simulation,
        cashCents,
        positions,
        orderToExecute
      );

      setSimulation(result.nextSimulation);
      setCashCents(result.updatedCashCents);
      setPositions(result.updatedPositions);

      if (result.executionResult) {
        const { order: updatedOrder, transaction, rejectionNotice: rejMsg } =
          result.executionResult;

        // Replace pending order in orders array with executed/rejected order
        setOrders((prev) =>
          prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
        );

        if (transaction) {
          setTransactions((prev) => [transaction, ...prev]);
          setSuccessNotice(
            `Filled ${updatedOrder.side.toUpperCase()} ${updatedOrder.quantity} ${
              updatedOrder.symbol
            } at session open price of ${formatUSD(
              parseFloat(updatedOrder.execution_price || '0')
            )}!`
          );
        }

        if (rejMsg) {
          setRejectionNotice(rejMsg);
        }
      } else {
        setSuccessNotice(`Advanced to session ${result.nextSimulation.current_session}.`);
      }

      onAdvance?.({
        simulation: result.nextSimulation,
        order: result.executionResult?.order,
        transaction: result.executionResult?.transaction,
      });
    } catch (err: unknown) {
      setRejectionNotice(err instanceof Error ? err.message : 'Error advancing simulation.');
    }
  };

  // Advance Session & Execute Order Handler
  const handleAdvanceAndExecute = () => {
    executeAdvanceWithOrder(pendingOrder);
  };

  // Order Submission Handler
  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setRejectionNotice(null);
    setSuccessNotice(null);

    // If in Live Yahoo Day Trading mode, execute immediately against live price
    if (tradingMode === 'live_yahoo') {
      const fillPrice = activeLiveQuote?.price || (latestCloseNum > 0 ? latestCloseNum : 150.0);
      const fillPriceStr = fillPrice.toFixed(2);
      const costCents = Math.round(parsedQuantity * fillPrice * 100);

      if (orderSide === 'buy') {
        if (costCents > cashCents) {
          setValidationError(
            `Insufficient cash: Order requires ${formatUSD(costCents / 100)} but available cash is ${formatUSD(cashCents / 100)}.`
          );
          return;
        }
        setCashCents((prev) => prev - costCents);
      } else {
        if (currentHeldShares < parsedQuantity) {
          setValidationError(
            `Oversell error: Cannot sell ${parsedQuantity} shares; you only hold ${currentHeldShares} shares of ${selectedSymbol}.`
          );
          return;
        }
        setCashCents((prev) => prev + costCents);
      }

      // Update positions
      setPositions((prev) => {
        const existing = prev.find((p) => p.symbol === selectedSymbol);
        if (orderSide === 'buy') {
          if (!existing) {
            return [
              ...prev,
              {
                symbol: selectedSymbol,
                quantity: parsedQuantity,
                cost_basis: fillPriceStr,
                market_price: fillPriceStr,
                market_value: (parsedQuantity * fillPrice).toFixed(2),
                unrealized_pnl: '0.00',
              },
            ];
          }
          const newQty = existing.quantity + parsedQuantity;
          const oldTotalCost = existing.quantity * parseFloat(existing.cost_basis);
          const newTotalCost = oldTotalCost + parsedQuantity * fillPrice;
          const avgCostBasis = (newTotalCost / newQty).toFixed(2);
          const marketValue = (newQty * fillPrice).toFixed(2);
          const pnl = (newQty * fillPrice - newTotalCost).toFixed(2);
          return prev.map((p) =>
            p.symbol === selectedSymbol
              ? {
                  ...p,
                  quantity: newQty,
                  cost_basis: avgCostBasis,
                  market_price: fillPriceStr,
                  market_value: marketValue,
                  unrealized_pnl: pnl,
                }
              : p
          );
        } else {
          // Sell
          const remainingQty = (existing?.quantity ?? 0) - parsedQuantity;
          if (remainingQty <= 0) {
            return prev.filter((p) => p.symbol !== selectedSymbol);
          }
          const costBasis = parseFloat(existing?.cost_basis || fillPriceStr);
          const marketValue = (remainingQty * fillPrice).toFixed(2);
          const pnl = (remainingQty * (fillPrice - costBasis)).toFixed(2);
          return prev.map((p) =>
            p.symbol === selectedSymbol
              ? {
                  ...p,
                  quantity: remainingQty,
                  market_price: fillPriceStr,
                  market_value: marketValue,
                  unrealized_pnl: pnl,
                }
              : p
          );
        }
      });

      const nowIso = new Date().toISOString();
      const liveOrderId = `live-ord-${Date.now().toString().slice(-6)}`;
      const liveTxnId = `live-txn-${Date.now().toString().slice(-6)}`;

      const liveOrder: Order = {
        id: liveOrderId,
        symbol: selectedSymbol,
        side: orderSide,
        quantity: parsedQuantity,
        status: 'filled',
        submitted_at: nowIso,
        execution_price: fillPriceStr,
        executed_at: nowIso,
        rejection_code: null,
      };

      const liveTxn: Transaction = {
        id: liveTxnId,
        order_id: liveOrderId,
        symbol: selectedSymbol,
        side: orderSide,
        quantity: parsedQuantity,
        price: fillPriceStr,
        gross_amount: (parsedQuantity * fillPrice).toFixed(2),
        session_date: nowIso.split('T')[0],
        executed_at: nowIso,
      };

      setOrders((prev) => [liveOrder, ...prev]);
      setTransactions((prev) => [liveTxn, ...prev]);
      setIdempotencyKey(generateIdempotencyKey());
      setSuccessNotice(
        `⚡ LIVE DAY TRADE EXECUTED: Filled ${orderSide.toUpperCase()} ${parsedQuantity} ${selectedSymbol} at $${fillPriceStr} (Total: ${formatUSD(parsedQuantity * fillPrice)}) via Yahoo Finance Feed!`
      );
      onOrderPlaced?.(liveOrder);
      return;
    }

    // Historical Simulation Mode (zero-lookahead paper trading)
    const validation = tradingService.validateOrderSubmission(
      { symbol: selectedSymbol, side: orderSide, quantity: parsedQuantity },
      cashCents,
      positions,
      simulation.current_session,
      simulation.end_session,
      pendingOrder !== null
    );

    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid order parameters.');
      return;
    }

    // Create pending order
    const newOrder = tradingService.createPendingOrder(
      {
        symbol: selectedSymbol,
        side: orderSide,
        quantity: parsedQuantity,
        expected_version: simulation.version,
        idempotency_key: idempotencyKey,
      },
      simulation.current_time
    );

    setOrders((prev) => [newOrder, ...prev]);
    setIdempotencyKey(generateIdempotencyKey());
    onOrderPlaced?.(newOrder);

    if (instantFill) {
      executeAdvanceWithOrder(newOrder);
    } else {
      setSuccessNotice(
        `Order placed in pending status: ${newOrder.side.toUpperCase()} ${newOrder.quantity} ${newOrder.symbol}. Click "Open Market & Fill Order Now" below to execute at upcoming session OPEN.`
      );
    }
  };

  // Portfolio Equity Calculations
  const totalEquity = tradingService.calculateTotalEquity(cashCents, positions);
  const totalUnrealizedPnl = positions.reduce(
    (sum, p) => sum + parseFloat(p.unrealized_pnl),
    0
  );

  return (
    <div className="space-y-6" data-testid="trading-view">
      {/* Mode Switcher Segmented Control */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setTradingMode('simulation');
              setRejectionNotice(null);
              setSuccessNotice(null);
            }}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              tradingMode === 'simulation'
                ? 'bg-white text-blue-950 shadow-xs border border-slate-200/90'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📅</span>
            <span>Historical Simulation (2024 Dataset)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTradingMode('live_yahoo');
              setRejectionNotice(null);
              setSuccessNotice(null);
            }}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              tradingMode === 'live_yahoo'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
            </span>
            <span>⚡ Live Day Trading (Yahoo Finance Feed)</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 justify-between md:justify-end px-1">
          {tradingMode === 'live_yahoo' ? (
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {activeLiveQuote?.source === 'yahoo-live' ? 'Yahoo Live API' : 'Real-Time Stream'}
              </span>
              <button
                type="button"
                onClick={refreshLiveQuotes}
                disabled={isLiveRefreshing}
                className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-1.5 transition-colors text-xs disabled:opacity-50"
              >
                <span className={isLiveRefreshing ? 'animate-spin' : ''}>🔄</span>
                <span>{isLiveRefreshing ? 'Syncing...' : 'Refresh'}</span>
              </button>
              <span className="text-[11px] text-slate-400 hidden sm:inline">Feed: {lastRefreshedAt}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                Zero-Lookahead Backtest Mode
              </span>
              <span className="hidden sm:inline text-[11px] text-slate-400">
                S&amp;P 500 Daily Session Playback
              </span>
            </div>
          )}
        </div>
      </div>

      {tradingMode === 'live_yahoo' ? (
        <>
          {/* Live Yahoo Finance Market Ticker Card */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-slate-50 p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-black text-lg shadow-sm">
                  {selectedSymbol.slice(0, 4)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-bold text-emerald-950">
                      {selectedSymbol} • {SYMBOL_NAMES[selectedSymbol] || selectedSymbol}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ● Streaming Live
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-3 mt-1">
                    <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                      ${activeLiveQuote?.price.toFixed(2) ?? '—'}
                    </span>
                    <span
                      className={`text-sm font-bold font-mono px-2 py-0.5 rounded-md ${
                        (activeLiveQuote?.change ?? 0) >= 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {(activeLiveQuote?.change ?? 0) >= 0 ? '+' : ''}$
                      {activeLiveQuote?.change.toFixed(2)} (
                      {(activeLiveQuote?.changePercent ?? 0) >= 0 ? '+' : ''}
                      {activeLiveQuote?.changePercent.toFixed(2)}%)
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Prev Close: ${activeLiveQuote?.previousClose.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="bg-white/90 border border-slate-200/90 rounded-xl p-2.5 space-y-0.5 min-w-[130px] shadow-2xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Bid / Ask (Spread)</div>
                  <div className="font-mono text-slate-800 font-semibold text-xs">
                    ${activeLiveQuote?.bid.toFixed(2)} / ${activeLiveQuote?.ask.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Spread: ${( (activeLiveQuote?.ask ?? 0) - (activeLiveQuote?.bid ?? 0) ).toFixed(2)}
                  </div>
                </div>

                <div className="bg-white/90 border border-slate-200/90 rounded-xl p-2.5 space-y-0.5 min-w-[130px] shadow-2xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Day's Range &amp; Volume</div>
                  <div className="font-mono text-slate-800 font-semibold text-xs">
                    ${activeLiveQuote?.dayLow.toFixed(2)} – ${activeLiveQuote?.dayHigh.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Vol: {activeLiveQuote?.volume ? (activeLiveQuote.volume / 1_000_000).toFixed(1) + 'M shs' : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Day Trading Educational Notice */}
          <aside
            role="note"
            className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">⚡</span>
              <div className="text-xs sm:text-sm leading-relaxed">
                <strong className="font-semibold block mb-0.5 text-emerald-950">
                  Live Day Trading Feed Active (Yahoo Finance Real-Time)
                </strong>
                Orders placed in this mode execute instantly against streaming Yahoo market quotes. Experience true intraday price volatility, real-time purchasing power changes, and instant execution fills without waiting for session advance.
              </div>
            </div>
          </aside>
        </>
      ) : (
        <>
          {/* Top Simulation Cursor Banner */}
          <div
            data-testid="time-cursor-banner"
            className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow">
                Sim
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-blue-900">
                    Simulation Cursor
                  </span>
                  <span
                    data-testid="simulation-status-badge"
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      simulation.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {simulation.status === 'active' ? 'Active' : 'Completed'}
                  </span>
                  <span
                    data-testid="simulation-version"
                    className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded"
                  >
                    v{simulation.version}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-slate-700">
                  <span>
                    Session:{' '}
                    <strong data-testid="cursor-current-session" className="font-semibold text-slate-900">
                      {simulation.current_session}
                    </strong>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span>
                    Simulated Close (UTC):{' '}
                    <strong data-testid="cursor-current-time" className="font-mono text-xs text-slate-800">
                      {simulation.current_time}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Advance Action Button */}
            <div>
              <Button
                data-testid="advance-session-btn"
                variant="primary"
                onClick={handleAdvanceAndExecute}
                disabled={simulation.status === 'completed'}
                className="flex items-center gap-2 shadow-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                </svg>
                Advance Session &amp; Execute Order
              </Button>
            </div>
          </div>

          {/* Prominent Educational Notice */}
          <aside
            role="note"
            data-testid="educational-notice"
            className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-blue-950 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-xs sm:text-sm leading-relaxed">
                <strong className="font-semibold block mb-0.5 text-blue-900">
                  Paper Trading Simulation Mechanics
                </strong>
                Submitted orders are queued in 'pending' status and execute at the NEXT session's OPEN price after advancing. If opening price gaps higher than available cash, the order is rejected without changing cash or positions. The UI never displays future execution prices.
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Rejection / Gap Error Banner */}
      {rejectionNotice && (
        <div
          role="alert"
          data-testid="rejection-notice-banner"
          className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900 shadow-sm flex items-start gap-3"
        >
          <svg
            className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-sm">
            <strong className="font-semibold block">Execution Rejection:</strong>
            {rejectionNotice}
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {successNotice && (
        <div
          role="status"
          data-testid="success-notice-banner"
          className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 shadow-sm flex items-start gap-3"
        >
          <svg
            className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-sm">{successNotice}</div>
        </div>
      )}

      {/* Portfolio Financial Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/80 border border-emerald-300 shadow-xs hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-900 uppercase tracking-wider">
            <span>Available Cash</span>
            <span className="text-emerald-600 text-sm">💵</span>
          </div>
          <div
            data-testid="cash-balance"
            className="text-2xl font-black text-slate-900 mt-1 font-mono tracking-tight"
          >
            {formatUSD(cashCents / 100)}
          </div>
          <div className="text-xs text-emerald-700/80 mt-1 font-medium">Settled virtual purchasing power</div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100/80 border border-blue-300 shadow-xs hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between text-xs font-bold text-blue-900 uppercase tracking-wider">
            <span>Total Equity</span>
            <span className="text-blue-600 text-sm">💼</span>
          </div>
          <div
            data-testid="total-equity"
            className="text-2xl font-black text-slate-900 mt-1 font-mono tracking-tight"
          >
            {formatUSD(totalEquity)}
          </div>
          <div className="text-xs text-blue-700/80 mt-1 font-medium">Cash + holdings marked to close</div>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-100/80 border border-indigo-300 shadow-xs hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-900 uppercase tracking-wider">
            <span>Unrealized P&amp;L</span>
            <span className="text-indigo-600 text-sm">📊</span>
          </div>
          <div
            data-testid="portfolio-unrealized-pnl"
            className={`text-2xl font-black mt-1 font-mono tracking-tight ${
              totalUnrealizedPnl > 0
                ? 'text-emerald-600'
                : totalUnrealizedPnl < 0
                ? 'text-red-600'
                : 'text-slate-900'
            }`}
          >
            {totalUnrealizedPnl >= 0 ? '+' : ''}
            {formatUSD(totalUnrealizedPnl)}
          </div>
          <div className="text-xs text-indigo-700/80 mt-1 font-medium">Open positions vs cost basis</div>
        </Card>
      </div>

      {/* Active Pending Order Card (Single Pending Constraint) */}
      {pendingOrder && (
        <Card
          data-testid="pending-order-card"
          className="border-amber-300 bg-amber-50/70"
          title="Active Pending Order"
          subtitle="Queued to execute at the upcoming session OPEN price"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  data-testid="pending-order-badge"
                  className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-300"
                >
                  Pending Execution
                </span>
                <span
                  data-testid="pending-order-side"
                  className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    pendingOrder.side === 'buy'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {pendingOrder.side}
                </span>
                <span
                  data-testid="pending-order-symbol"
                  className="font-bold text-slate-900 text-base"
                >
                  {pendingOrder.symbol}
                </span>
              </div>
              <div className="text-sm text-slate-700">
                Quantity:{' '}
                <strong data-testid="pending-order-quantity" className="font-semibold text-slate-900">
                  {pendingOrder.quantity.toLocaleString()} shares
                </strong>
                <span className="mx-2 text-slate-300">|</span>
                Submitted at:{' '}
                <span data-testid="pending-order-submitted-at" className="font-mono text-xs">
                  {pendingOrder.submitted_at}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleAdvanceAndExecute}
                disabled={simulation.status === 'completed'}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-3 flex items-center justify-center gap-1.5 shadow"
              >
                ⚡ Open Market &amp; Fill Order Now
              </Button>
              <div
                data-testid="pending-order-notice"
                className="text-xs font-semibold text-amber-900 bg-amber-100/90 border border-amber-300 px-3 py-2 rounded-lg text-center"
              >
                Pending Order Active (Only 1 pending order allowed for MVP)
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tradable Stock Universe Quick-Picker */}
      <div className="rounded-2xl border border-slate-300/80 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📊</span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Tradable Markets Universe ({SUPPORTED_SYMBOLS.length} Stocks &amp; Index ETFs)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Tech, Healthcare, Financials, Consumer Staples &amp; Energy
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_SYMBOLS.map((sym) => {
            const isSelected = selectedSymbol === sym;
            const sectorInfo = SYMBOL_SECTORS[sym];
            const liveQuote = liveQuotes[sym];
            return (
              <button
                key={sym}
                type="button"
                onClick={() => handleSymbolChange(sym)}
                disabled={pendingOrder !== null || (tradingMode === 'simulation' && simulation.status === 'completed')}
                className={`px-3 py-1.5 rounded-xl border text-xs transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/90 text-blue-950 font-bold shadow-xs ring-1 ring-blue-500'
                    : 'border-slate-200 bg-slate-50/80 hover:bg-white text-slate-700 hover:border-slate-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="font-mono font-bold text-slate-900">{sym}</span>
                {tradingMode === 'live_yahoo' && liveQuote ? (
                  <span
                    className={`font-mono text-[11px] font-semibold ${
                      liveQuote.change >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    ${liveQuote.price.toFixed(2)}
                    <span className="text-[10px] ml-1">
                      ({liveQuote.change >= 0 ? '+' : ''}
                      {liveQuote.changePercent.toFixed(1)}%)
                    </span>
                  </span>
                ) : (
                  <span className="hidden sm:inline text-[11px] text-slate-500">
                    {SYMBOL_NAMES[sym]?.split(' ')[0]}
                  </span>
                )}
                {sectorInfo && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border ${sectorInfo.badgeColor}`}
                  >
                    {sectorInfo.sector.split(' ')[0]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Order Entry Form & Market Context */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Form Card */}
        <Card
          className="lg:col-span-2"
          title={tradingMode === 'live_yahoo' ? 'Execute Live Day Trade' : 'Place Order'}
          subtitle={
            tradingMode === 'live_yahoo'
              ? 'Instant execution at real-time Yahoo Finance market price'
              : 'Whole-share market orders executed at next session OPEN'
          }
        >
          <form
            onSubmit={handleSubmitOrder}
            data-testid="order-entry-form"
            className="space-y-4"
          >
            {/* Symbol Selection */}
            <div>
              <label
                htmlFor="order-symbol-select"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Symbol
              </label>
              <select
                id="order-symbol-select"
                data-testid="symbol-select"
                value={selectedSymbol}
                disabled={pendingOrder !== null || (tradingMode === 'simulation' && simulation.status === 'completed')}
                onChange={(e) => handleSymbolChange(e.target.value)}
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                {SUPPORTED_SYMBOLS.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym} — {SYMBOL_NAMES[sym] || sym} ({SYMBOL_SECTORS[sym]?.sector || 'Stock'})
                  </option>
                ))}
              </select>
            </div>

            {/* Side Toggle: Buy / Sell */}
            <div>
              <span className="block text-sm font-medium text-slate-700 mb-1">
                Order Side
              </span>
              <div
                role="radiogroup"
                aria-label="Order Side"
                className="grid grid-cols-2 gap-2"
              >
                <button
                  type="button"
                  data-testid="side-toggle-buy"
                  aria-checked={orderSide === 'buy'}
                  role="radio"
                  disabled={pendingOrder !== null || (tradingMode === 'simulation' && simulation.status === 'completed')}
                  onClick={() => handleSideToggle('buy')}
                  className={`px-4 py-2 text-sm font-semibold rounded-md border transition-colors ${
                    orderSide === 'buy'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Buy
                </button>
                <button
                  type="button"
                  data-testid="side-toggle-sell"
                  aria-checked={orderSide === 'sell'}
                  role="radio"
                  disabled={pendingOrder !== null || (tradingMode === 'simulation' && simulation.status === 'completed')}
                  onClick={() => handleSideToggle('sell')}
                  className={`px-4 py-2 text-sm font-semibold rounded-md border transition-colors ${
                    orderSide === 'sell'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Sell
                </button>
              </div>
            </div>

            {/* Quantity Input with Day-Trading Presets */}
            <div>
              <Input
                label="Quantity (Whole Shares: 1 – 1,000,000)"
                id="order-quantity-input"
                data-testid="quantity-input"
                type="number"
                min="1"
                max="1000000"
                step="1"
                disabled={pendingOrder !== null || (tradingMode === 'simulation' && simulation.status === 'completed')}
                value={quantityInput}
                onChange={(e) => handleQuantityChange(e.target.value)}
                helperText={
                  orderSide === 'sell'
                    ? `Currently holding ${currentHeldShares} shares of ${selectedSymbol}`
                    : `Whole shares only`
                }
              />
              {/* Quick-Quantity Selector for Day Trading */}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Quick:</span>
                {[1, 5, 10, 25, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleQuantityChange(String(preset))}
                    disabled={pendingOrder !== null || (tradingMode === 'simulation' && simulation.status === 'completed')}
                    className="px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-white text-xs font-mono font-semibold text-slate-700 hover:border-blue-400 transition-colors disabled:opacity-50"
                  >
                    +{preset}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const maxAfford = activePrice > 0 ? Math.floor((cashCents / 100) / activePrice) : 0;
                    if (maxAfford > 0) {
                      handleQuantityChange(String(Math.min(maxAfford, 1000000)));
                    }
                  }}
                  disabled={pendingOrder !== null || (tradingMode === 'simulation' && simulation.status === 'completed')}
                  className="px-2 py-0.5 rounded-md border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 transition-colors disabled:opacity-50"
                >
                  Max Afford
                </button>
              </div>
            </div>

            {/* Dynamic Estimated Order Value Calculation */}
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 flex items-center justify-between text-sm">
              <div>
                <span className="text-slate-600">Estimated Order Value:</span>
                <p className="text-xs text-slate-500">
                  {tradingMode === 'live_yahoo'
                    ? `Based on live Yahoo market price (${formatUSD(activePrice)})`
                    : `Based on latest visible close (${formatUSD(latestCloseNum)})`}
                </p>
              </div>
              <div
                data-testid="estimated-order-value"
                className="text-lg font-bold font-mono text-slate-900"
              >
                {formatUSD(estimatedOrderValue)}
              </div>
            </div>

            {/* Validation Error Message */}
            {validationError && (
              <p
                role="alert"
                data-testid="order-validation-error"
                className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded border border-red-200"
              >
                {validationError}
              </p>
            )}

            {/* Instant Execution Toggle (shown in Simulation Mode) */}
            {tradingMode === 'simulation' && (
              <div className="rounded-lg bg-emerald-50/60 p-3 border border-emerald-200 flex items-center justify-between">
                <label htmlFor="instant-execution-toggle" className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="instant-execution-toggle"
                    checked={instantFill}
                    onChange={(e) => setInstantFill(e.target.checked)}
                    disabled={pendingOrder !== null || simulation.status === 'completed'}
                    className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    <strong className="text-emerald-950 font-semibold">Instant Execution Mode:</strong> Automatically advance simulation and fill order immediately on submit.
                  </span>
                </label>
              </div>
            )}

            {/* Submit Order Button */}
            <Button
              type="submit"
              data-testid="submit-order-btn"
              variant={orderSide === 'buy' ? 'primary' : 'secondary'}
              disabled={
                (tradingMode === 'simulation' && (pendingOrder !== null || simulation.status === 'completed')) ||
                !isQuantityValid ||
                validationError !== null
              }
              className="w-full py-2.5 text-sm font-semibold shadow-sm"
            >
              {tradingMode === 'live_yahoo'
                ? `⚡ Execute Live Market ${orderSide.toUpperCase()} Order`
                : pendingOrder !== null
                ? 'Pending Order Active (Only 1 pending order allowed for MVP)'
                : simulation.status === 'completed'
                ? 'Simulation Completed'
                : `Review & Submit ${orderSide.toUpperCase()} Order`}
            </Button>
          </form>
        </Card>

        {/* Selected Symbol Context Card */}
        <Card
          title={`${selectedSymbol} — ${SYMBOL_NAMES[selectedSymbol] || selectedSymbol}`}
          subtitle={
            tradingMode === 'live_yahoo'
              ? `Real-Time Market • ${SYMBOL_SECTORS[selectedSymbol]?.sector || 'Asset'}`
              : `Session ${simulation.current_session} • ${SYMBOL_SECTORS[selectedSymbol]?.sector || 'Asset'}`
          }
        >
          <div className="space-y-3 text-sm">
            {tradingMode === 'live_yahoo' ? (
              <>
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Live Market Price:</span>
                  <span className="font-mono font-bold text-emerald-700 text-base">
                    ${activeLiveQuote?.price.toFixed(2) ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Bid / Ask Spread:</span>
                  <span className="font-mono text-xs text-slate-800">
                    ${activeLiveQuote?.bid.toFixed(2)} / ${activeLiveQuote?.ask.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Intraday Range:</span>
                  <span className="font-mono text-xs text-slate-700">
                    ${activeLiveQuote?.dayLow.toFixed(2)} – ${activeLiveQuote?.dayHigh.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Held Shares:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {currentHeldShares.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Max Buyable Shares:</span>
                  <span className="font-mono text-slate-800">
                    {activePrice > 0
                      ? Math.floor((cashCents / 100) / activePrice).toLocaleString()
                      : '0'}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-950 leading-normal">
                  <strong>⚡ Instant Execution Rule:</strong> Real-time market orders fill immediately against streaming Yahoo quotes with immediate cash balance update.
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Latest Visible Close:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {latestClosePriceStr ? formatUSD(latestCloseNum) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Raw Price:</span>
                  <span className="font-mono text-xs text-slate-700">
                    {latestClosePriceStr ? formatPrice(latestClosePriceStr) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Held Shares:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {currentHeldShares.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Max Buyable Shares:</span>
                  <span className="font-mono text-slate-800">
                    {latestCloseNum > 0
                      ? Math.floor((cashCents / 100) / latestCloseNum).toLocaleString()
                      : '0'}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-normal">
                  <strong>Execution Rule:</strong> Fill price will be next session's <em>OPEN</em> price, not this visible close price.
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Cash & Holdings Summary Table */}
      <Card
        title="Portfolio Holdings"
        subtitle={`Positions marked to market at close of session ${simulation.current_session}`}
      >
        <div className="overflow-x-auto">
          <table
            data-testid="holdings-table"
            className="w-full text-left text-sm border-collapse"
          >
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3 text-right">Shares</th>
                <th className="py-2.5 px-3 text-right">Cost Basis</th>
                <th className="py-2.5 px-3 text-right">Current Price</th>
                <th className="py-2.5 px-3 text-right">Market Value</th>
                <th className="py-2.5 px-3 text-right">Unrealized P&amp;L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {positions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-slate-400 italic text-sm"
                  >
                    No active positions held. Place an order to build your portfolio.
                  </td>
                </tr>
              ) : (
                positions.map((pos) => {
                  const pnl = parseFloat(pos.unrealized_pnl);
                  return (
                    <tr
                      key={pos.symbol}
                      data-testid={`holding-row-${pos.symbol}`}
                      className="hover:bg-slate-50/50"
                    >
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {pos.symbol}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {pos.quantity.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {formatUSD(parseFloat(pos.cost_basis))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900">
                        {formatUSD(parseFloat(pos.market_price))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                        {formatUSD(parseFloat(pos.market_value))}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono font-semibold ${
                          pnl > 0
                            ? 'text-emerald-600'
                            : pnl < 0
                            ? 'text-red-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {pnl >= 0 ? '+' : ''}
                        {formatUSD(pnl)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Orders History & Transactions Log Tabs & Tables */}
      <Card>
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 mb-4">
          <button
            type="button"
            data-testid="tab-orders"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Orders History ({orders.length})
          </button>
          <button
            type="button"
            data-testid="tab-transactions"
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'transactions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Transactions Log ({transactions.length})
          </button>
        </div>

        {/* Tab 1: Orders History Table */}
        {activeTab === 'orders' ? (
          <div className="overflow-x-auto">
            <table
              data-testid="orders-table"
              className="w-full text-left text-sm border-collapse"
            >
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Exec Price</th>
                  <th className="py-2.5 px-3">Exec Time</th>
                  <th className="py-2.5 px-3">Rejection Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-6 text-center text-slate-400 italic text-sm"
                    >
                      No orders placed yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => (
                    <tr
                      key={ord.id}
                      data-testid={`order-row-${ord.id}`}
                      className="hover:bg-slate-50/50"
                    >
                      <td className="py-3 px-3 font-mono text-xs text-slate-600">
                        {ord.id}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {ord.symbol}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            ord.side === 'buy'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {ord.side}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {ord.quantity.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          data-testid={`order-status-${ord.status}`}
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            ord.status === 'filled'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : ord.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-red-100 text-red-800 border border-red-300'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-800">
                        {ord.execution_price
                          ? formatUSD(parseFloat(ord.execution_price))
                          : '—'}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-600">
                        {ord.executed_at || '—'}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs">
                        {ord.rejection_code ? (
                          <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                            {ord.rejection_code}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Tab 2: Transactions Log Table */
          <div className="overflow-x-auto">
            <table
              data-testid="transactions-table"
              className="w-full text-left text-sm border-collapse"
            >
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Trade ID</th>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Fill Price</th>
                  <th className="py-2.5 px-3 text-right">Gross Amount</th>
                  <th className="py-2.5 px-3">Session Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-6 text-center text-slate-400 italic text-sm"
                    >
                      No transactions executed yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr
                      key={txn.id}
                      data-testid={`transaction-row-${txn.id}`}
                      className="hover:bg-slate-50/50"
                    >
                      <td className="py-3 px-3 font-mono text-xs text-slate-600">
                        {txn.id}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-600">
                        {txn.order_id}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {txn.symbol}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            txn.side === 'buy'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {txn.side}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {txn.quantity.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900">
                        {formatUSD(parseFloat(txn.price))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                        {formatUSD(parseFloat(txn.gross_amount))}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-700">
                        {txn.session_date}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default TradingView;

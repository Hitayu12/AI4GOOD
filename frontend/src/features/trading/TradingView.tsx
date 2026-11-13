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
  generateTradingDays,
} from '../simulation/simulationFixtures';
import {
  fetchAllLiveQuotes,
  LiveQuote,
  MODERN_BASELINE_PRICES,
} from './yahooFinanceService';
import { TradeConfirmationModal, ExecutedTradeReceipt } from './TradeConfirmationModal';
import { TabOverviewModal } from '../../components/common/TabOverviewModal';

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
  AAPL: 'Apple Inc. (iPhones, Macs & AI)',
  MSFT: 'Microsoft Corporation (Windows & Xbox)',
  NVDA: 'NVIDIA Corporation (AI Chips & GPUs)',
  AMZN: 'Amazon.com Inc. (Prime & E-Commerce)',
  GOOGL: 'Alphabet Inc. (Google & YouTube)',
  TSLA: 'Tesla, Inc. (EVs & Clean Energy)',
  META: 'Meta Platforms Inc. (Instagram & VR)',
  SPY: 'SPDR S&P 500 ETF (Top 500 US Giants)',
  QQQ: 'Invesco QQQ Trust (Top 100 Tech Giants)',
  JNJ: 'Johnson & Johnson (Healthcare & Pharma)',
  JPM: 'JPMorgan Chase & Co. (Top US Bank)',
  WMT: 'Walmart Inc. (Everyday Low Prices)',
  KO: 'The Coca-Cola Company (Coke & Drinks)',
  XOM: 'Exxon Mobil Corporation (Global Energy)',
  MCD: "McDonald's Corporation (Burgers & Real Estate)",
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
  const [isOverviewOpen, setIsOverviewOpen] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => generateIdempotencyKey());
  const [instantFill, setInstantFill] = useState<boolean>(false);

  // Execution Feedback Notices & Modal
  const [rejectionNotice, setRejectionNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [tradeReceipt, setTradeReceipt] = useState<ExecutedTradeReceipt | null>(null);

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
  const executeAdvanceWithOrder = (orderToExecute: Order | null, overrideSim?: Simulation) => {
    setRejectionNotice(null);
    setSuccessNotice(null);

    const dataset = customDataset || FIXTURE_DATASET_METADATA;
    let currentSim = overrideSim || simulation;
    const curIdx = dataset.session_dates.indexOf(currentSim.current_session);
    if (
      currentSim.status === 'completed' ||
      curIdx === -1 ||
      curIdx + 1 >= dataset.session_dates.length ||
      currentSim.current_session >= currentSim.end_session
    ) {
      const lastSession = dataset.session_dates[dataset.session_dates.length - 1];
      const newDates = generateTradingDays(lastSession, 30);
      for (const d of newDates) {
        if (!dataset.session_dates.includes(d)) dataset.session_dates.push(d);
      }
      const newEnd = dataset.session_dates[dataset.session_dates.length - 1];
      currentSim = {
        ...currentSim,
        end_session: newEnd,
        status: 'active',
      };
      setSimulation(currentSim);
    }

    try {
      const result = tradingService.advanceAndExecute(
        currentSim,
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
          const fillPriceNum = parseFloat(updatedOrder.execution_price || '0');
          const grossNum = parseFloat(transaction.gross_amount);
          setSuccessNotice(
            `Filled ${updatedOrder.side.toUpperCase()} ${updatedOrder.quantity} ${
              updatedOrder.symbol
            } at session open price of ${formatUSD(fillPriceNum)}!`
          );
          // Trigger Trade Execution Pop-up
          setTradeReceipt({
            symbol: updatedOrder.symbol,
            name: SYMBOL_NAMES[updatedOrder.symbol] || updatedOrder.symbol,
            sector: SYMBOL_SECTORS[updatedOrder.symbol]?.sector,
            side: updatedOrder.side,
            quantity: updatedOrder.quantity,
            price: fillPriceNum,
            grossAmount: grossNum,
            remainingCashDollars: result.updatedCashCents / 100,
            mode: 'simulation',
            sessionDate: transaction.session_date,
            timestamp: new Date().toLocaleTimeString(),
          });
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
    const dataset = customDataset || FIXTURE_DATASET_METADATA;
    const curIdx = dataset.session_dates.indexOf(simulation.current_session);
    if (
      simulation.status === 'completed' ||
      curIdx === -1 ||
      curIdx + 1 >= dataset.session_dates.length ||
      simulation.current_session >= simulation.end_session
    ) {
      const lastSession = dataset.session_dates[dataset.session_dates.length - 1];
      const newDates = generateTradingDays(lastSession, 30);
      for (const d of newDates) {
        if (!dataset.session_dates.includes(d)) dataset.session_dates.push(d);
      }
      const newEnd = dataset.session_dates[dataset.session_dates.length - 1];
      const updatedSim: Simulation = {
        ...simulation,
        end_session: newEnd,
        status: 'active',
      };
      setSimulation(updatedSim);
      executeAdvanceWithOrder(pendingOrder, updatedSim);
      return;
    }
    executeAdvanceWithOrder(pendingOrder);
  };

  // Extend Simulation Calendar (+30 Days)
  const handleExtendSimulation = async (additionalDays: number = 30) => {
    setRejectionNotice(null);
    try {
      if (service) {
        const updated = await service.extendSimulation(simulation.id, additionalDays);
        setSimulation(updated);
      } else {
        const dataset = customDataset || FIXTURE_DATASET_METADATA;
        const lastSession = dataset.session_dates[dataset.session_dates.length - 1];
        const newDates = generateTradingDays(lastSession, additionalDays);
        for (const d of newDates) {
          if (!dataset.session_dates.includes(d)) dataset.session_dates.push(d);
        }
        const newEnd = dataset.session_dates[dataset.session_dates.length - 1];
        setSimulation((prev) => ({
          ...prev,
          end_session: newEnd,
          status: 'active',
        }));
      }
      setSuccessNotice(
        `⚡ Extended simulation horizon by +${additionalDays} trading days! You can now place orders and advance sessions as much as you want.`
      );
    } catch {
      const dataset = customDataset || FIXTURE_DATASET_METADATA;
      const lastSession = dataset.session_dates[dataset.session_dates.length - 1];
      const newDates = generateTradingDays(lastSession, additionalDays);
      for (const d of newDates) {
        if (!dataset.session_dates.includes(d)) dataset.session_dates.push(d);
      }
      const newEnd = dataset.session_dates[dataset.session_dates.length - 1];
      setSimulation((prev) => ({
        ...prev,
        end_session: newEnd,
        status: 'active',
      }));
      setSuccessNotice(
        `⚡ Extended simulation horizon by +${additionalDays} trading days! You can now place orders and advance sessions as much as you want.`
      );
    }
  };

  // Reset Simulation to Day 1
  const handleResetSimulation = async () => {
    setRejectionNotice(null);
    try {
      if (service) {
        const resetSim = await service.resetSimulation(simulation.id);
        setSimulation(resetSim);
      } else {
        setSimulation((prev) => ({
          ...prev,
          current_session: prev.start_session,
          current_time: `${prev.start_session}T21:00:00Z`,
          version: 1,
          status: 'active',
        }));
      }
      setSuccessNotice('🔁 Simulation reset to Day 1. Fresh session ready for trading!');
    } catch {
      setSimulation((prev) => ({
        ...prev,
        current_session: prev.start_session,
        current_time: `${prev.start_session}T21:00:00Z`,
        version: 1,
        status: 'active',
      }));
      setSuccessNotice('🔁 Simulation reset to Day 1. Fresh session ready for trading!');
    }
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
      // Trigger Trade Execution Pop-up
      setTradeReceipt({
        symbol: selectedSymbol,
        name: SYMBOL_NAMES[selectedSymbol] || selectedSymbol,
        sector: SYMBOL_SECTORS[selectedSymbol]?.sector,
        side: orderSide,
        quantity: parsedQuantity,
        price: fillPrice,
        grossAmount: parsedQuantity * fillPrice,
        remainingCashDollars: (orderSide === 'buy' ? cashCents - costCents : cashCents + costCents) / 100,
        mode: 'live_yahoo',
        timestamp: new Date().toLocaleTimeString(),
      });
      onOrderPlaced?.(liveOrder);
      return;
    }

    // Historical Simulation Mode (zero-lookahead paper trading)
    let effectiveEndSession = simulation.end_session;
    if (simulation.status === 'completed' || simulation.current_session >= simulation.end_session) {
      const dataset = customDataset || FIXTURE_DATASET_METADATA;
      const lastSession = dataset.session_dates[dataset.session_dates.length - 1];
      const newDates = generateTradingDays(lastSession, 30);
      for (const d of newDates) {
        if (!dataset.session_dates.includes(d)) dataset.session_dates.push(d);
      }
      effectiveEndSession = dataset.session_dates[dataset.session_dates.length - 1];
      simulation.end_session = effectiveEndSession;
      simulation.status = 'active';
      setSimulation({ ...simulation });
    }

    const validation = tradingService.validateOrderSubmission(
      { symbol: selectedSymbol, side: orderSide, quantity: parsedQuantity },
      cashCents,
      positions,
      simulation.current_session,
      effectiveEndSession,
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
      {/* Trade Execution Confirmation Pop-up Modal */}
      <TradeConfirmationModal
        receipt={tradeReceipt}
        onClose={() => setTradeReceipt(null)}
      />

      {/* Trading Tab Overview Modal */}
      <TabOverviewModal
        tab="trading"
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
      />

      {/* Mode Switcher Segmented Control */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-xl p-3 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setTradingMode('simulation');
              setRejectionNotice(null);
              setSuccessNotice(null);
            }}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              tradingMode === 'simulation'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-400 hover:text-white'
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
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
            </span>
            <span>⚡ Live Day Trading (Yahoo Finance Feed)</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 justify-between md:justify-end px-1 flex-wrap">
          <button
            type="button"
            onClick={() => setIsOverviewOpen(true)}
            aria-label="What is Trading Tab?"
            className="px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>💡</span>
            <span>What is Trading?</span>
          </button>
          {tradingMode === 'live_yahoo' ? (
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-1 rounded-lg text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {activeLiveQuote?.source === 'yahoo-live' ? 'Yahoo Live API' : 'Real-Time Stream'}
              </span>
              <button
                type="button"
                onClick={refreshLiveQuotes}
                disabled={isLiveRefreshing}
                className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-300 font-medium flex items-center gap-1.5 transition-colors text-xs disabled:opacity-50"
              >
                <span className={isLiveRefreshing ? 'animate-spin' : ''}>🔄</span>
                <span>{isLiveRefreshing ? 'Syncing...' : 'Refresh'}</span>
              </button>
              <span className="text-[11px] text-slate-400 hidden sm:inline">Feed: {lastRefreshedAt}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-cyan-300 bg-cyan-500/20 border border-cyan-400/30 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
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
          <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-slate-900/95 via-emerald-950/30 to-slate-900/95 backdrop-blur-xl p-5 shadow-xl text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-md shadow-emerald-500/20">
                  {selectedSymbol.slice(0, 4)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-bold text-emerald-300">
                      {selectedSymbol} • {SYMBOL_NAMES[selectedSymbol] || selectedSymbol}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      ● Streaming Live
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-3 mt-1">
                    <span className="text-3xl font-black text-white font-mono tracking-tight">
                      ${activeLiveQuote?.price.toFixed(2) ?? '—'}
                    </span>
                    <span
                      className={`text-sm font-bold font-mono px-2 py-0.5 rounded-md ${
                        (activeLiveQuote?.change ?? 0) >= 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {(activeLiveQuote?.change ?? 0) >= 0 ? '+' : ''}$
                      {activeLiveQuote?.change.toFixed(2)} (
                      {(activeLiveQuote?.changePercent ?? 0) >= 0 ? '+' : ''}
                      {activeLiveQuote?.changePercent.toFixed(2)}%)
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Prev Close: ${activeLiveQuote?.previousClose.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-0.5 min-w-[130px] shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Bid / Ask (Spread)</div>
                  <div className="font-mono text-slate-200 font-semibold text-xs">
                    ${activeLiveQuote?.bid.toFixed(2)} / ${activeLiveQuote?.ask.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Spread: ${( (activeLiveQuote?.ask ?? 0) - (activeLiveQuote?.bid ?? 0) ).toFixed(2)}
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-0.5 min-w-[130px] shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Day's Range &amp; Volume</div>
                  <div className="font-mono text-slate-200 font-semibold text-xs">
                    ${activeLiveQuote?.dayLow.toFixed(2)} – ${activeLiveQuote?.dayHigh.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Vol: {activeLiveQuote?.volume ? (activeLiveQuote.volume / 1_000_000).toFixed(1) + 'M shs' : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Day Trading Educational Notice */}
          <aside
            role="note"
            className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 backdrop-blur-md p-4 text-emerald-200 shadow-md"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">⚡</span>
              <div className="text-xs sm:text-sm leading-relaxed">
                <strong className="font-semibold block mb-0.5 text-emerald-300">
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
            className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900/95 via-indigo-950/40 to-slate-900/95 backdrop-blur-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4 text-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black text-sm shadow-md shadow-cyan-500/20">
                Sim
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-cyan-300">
                    Simulation Cursor
                  </span>
                  <span
                    data-testid="simulation-status-badge"
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                      simulation.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {simulation.status === 'active' ? 'Active' : 'Completed'}
                  </span>
                  <span
                    data-testid="simulation-version"
                    className="text-xs font-mono bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-md"
                  >
                    v{simulation.version}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-slate-300">
                  <span>
                    Session:{' '}
                    <strong data-testid="cursor-current-session" className="font-bold text-white">
                      {simulation.current_session}
                    </strong>
                  </span>
                  <span className="text-slate-600">|</span>
                  <span>
                    Simulated Close (UTC):{' '}
                    <strong data-testid="cursor-current-time" className="font-mono text-xs text-slate-300">
                      {simulation.current_time}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Advance Action Button & Extension Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                data-testid="advance-session-btn"
                variant="primary"
                onClick={handleAdvanceAndExecute}
                className="flex items-center gap-2 shadow-lg shadow-purple-600/20 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 font-bold"
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
                {simulation.status === 'completed'
                  ? '⚡ Advance & Keep Trading (+30 Days)'
                  : 'Advance Session & Execute Order'}
              </Button>
              <button
                type="button"
                data-testid="extend-trading-sim-btn"
                onClick={() => handleExtendSimulation(30)}
                className="aura-glow-btn px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer ring-1 ring-white/30"
              >
                <span>⚡</span>
                <span>Keep Trading (+30 Days)</span>
              </button>
              <button
                type="button"
                data-testid="reset-trading-sim-btn"
                onClick={handleResetSimulation}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔁</span>
                <span>Reset Day 1</span>
              </button>
            </div>
          </div>

          {/* Celebratory 5-Day Historical Cycle Finished Banner */}
          {simulation.status === 'completed' && (
            <div
              role="status"
              data-testid="trading-sim-completed-banner"
              className="rounded-2xl border border-purple-500/40 bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-amber-400 text-slate-950 font-black flex items-center justify-center text-xl shadow-md shrink-0">
                  🎉
                </div>
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <span>5-Day Historical Cycle Finished!</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                      TRADING DESK UNLOCKED
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    You've reached the end of the initial 5 days. Keep trading for another 30 days to test longer-term market swings, or replay from Day 1!
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleExtendSimulation(30)}
                  className="aura-glow-btn px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer ring-1 ring-white/30"
                >
                  <span>⚡</span>
                  <span>Keep Trading (+30 Days)</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetSimulation}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🔁</span>
                  <span>Reset Day 1</span>
                </button>
              </div>
            </div>
          )}

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
        <Card className="bg-slate-900/90 border border-emerald-500/40 shadow-xl shadow-black/30 hover:border-emerald-400/80 transition-all duration-200">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <span>Available Cash</span>
            <span className="text-emerald-400 text-sm">💵</span>
          </div>
          <div
            data-testid="cash-balance"
            className="text-2xl font-black text-emerald-300 mt-1 font-mono tracking-tight"
          >
            {formatUSD(cashCents / 100)}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Settled virtual purchasing power</div>
        </Card>

        <Card className="bg-slate-900/90 border border-cyan-500/40 shadow-xl shadow-black/30 hover:border-cyan-400/80 transition-all duration-200">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-400 uppercase tracking-wider">
            <span>Total Equity</span>
            <span className="text-cyan-400 text-sm">💼</span>
          </div>
          <div
            data-testid="total-equity"
            className="text-2xl font-black text-cyan-300 mt-1 font-mono tracking-tight"
          >
            {formatUSD(totalEquity)}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Cash + holdings marked to close</div>
        </Card>

        <Card className="bg-slate-900/90 border border-purple-500/40 shadow-xl shadow-black/30 hover:border-purple-400/80 transition-all duration-200">
          <div className="flex items-center justify-between text-xs font-bold text-purple-300 uppercase tracking-wider">
            <span>Unrealized P&amp;L</span>
            <span className="text-purple-400 text-sm">📊</span>
          </div>
          <div
            data-testid="portfolio-unrealized-pnl"
            className={`text-2xl font-black mt-1 font-mono tracking-tight ${
              totalUnrealizedPnl > 0
                ? 'text-emerald-400'
                : totalUnrealizedPnl < 0
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}
          >
            {totalUnrealizedPnl >= 0 ? '+' : ''}
            {formatUSD(totalUnrealizedPnl)}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Open positions vs cost basis</div>
        </Card>
      </div>

      {/* Active Pending Order Card (Single Pending Constraint) */}
      {pendingOrder && (
        <Card
          data-testid="pending-order-card"
          className="border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 shadow-xl text-white"
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
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-xl p-4 shadow-xl text-white">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📊</span>
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Tradable Markets Universe ({SUPPORTED_SYMBOLS.length} Stocks &amp; Index ETFs)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
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
                disabled={pendingOrder !== null}
                className={`px-3 py-1.5 rounded-xl border text-xs transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'border-purple-500 bg-purple-500/20 text-purple-200 font-bold shadow-md shadow-purple-500/20 ring-1 ring-purple-400'
                    : 'border-slate-800 bg-slate-950/70 hover:bg-slate-800 hover:border-slate-700 text-slate-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="font-mono font-bold text-white">{sym}</span>
                {tradingMode === 'live_yahoo' && liveQuote ? (
                  <span
                    className={`font-mono text-[11px] font-semibold ${
                      liveQuote.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    ${liveQuote.price.toFixed(2)}
                    <span className="text-[10px] ml-1">
                      ({liveQuote.change >= 0 ? '+' : ''}
                      {liveQuote.changePercent.toFixed(1)}%)
                    </span>
                  </span>
                ) : (
                  <span className="hidden sm:inline text-[11px] text-slate-400">
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
          className="lg:col-span-2 border-slate-800/80 bg-slate-900/80 backdrop-blur-xl text-white"
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
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Symbol
              </label>
              <select
                id="order-symbol-select"
                data-testid="symbol-select"
                value={selectedSymbol}
                disabled={pendingOrder !== null}
                onChange={(e) => handleSymbolChange(e.target.value)}
                className="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {SUPPORTED_SYMBOLS.map((sym) => (
                  <option key={sym} value={sym} className="bg-slate-950 text-white">
                    {sym} — {SYMBOL_NAMES[sym] || sym} ({SYMBOL_SECTORS[sym]?.sector || 'Stock'})
                  </option>
                ))}
              </select>
            </div>

            {/* Side Toggle: Buy / Sell */}
            <div>
              <span className="block text-sm font-medium text-slate-300 mb-1">
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
                  disabled={pendingOrder !== null}
                  onClick={() => handleSideToggle('buy')}
                  className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${
                    orderSide === 'buy'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900 hover:text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Buy
                </button>
                <button
                  type="button"
                  data-testid="side-toggle-sell"
                  aria-checked={orderSide === 'sell'}
                  role="radio"
                  disabled={pendingOrder !== null}
                  onClick={() => handleSideToggle('sell')}
                  className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${
                    orderSide === 'sell'
                      ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white border-rose-500 shadow-md shadow-rose-500/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900 hover:text-white'
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
                disabled={pendingOrder !== null}
                value={quantityInput}
                onChange={(e) => handleQuantityChange(e.target.value)}
                helperText={
                  orderSide === 'sell'
                    ? `Currently holding ${currentHeldShares} shares of ${selectedSymbol}`
                    : `Whole shares only`
                }
              />
              {/* Quick-Quantity Selector for Day Trading */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick:</span>
                {[1, 5, 10, 25, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleQuantityChange(String(preset))}
                    disabled={pendingOrder !== null}
                    className="px-2 py-0.5 rounded-md border border-slate-700 bg-slate-950 hover:bg-slate-800 text-xs font-mono font-semibold text-slate-300 hover:border-purple-400 transition-colors disabled:opacity-50"
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
                  disabled={pendingOrder !== null}
                  className="px-2 py-0.5 rounded-md border border-emerald-500/50 bg-emerald-950/60 hover:bg-emerald-900 text-xs font-semibold text-emerald-300 transition-colors disabled:opacity-50"
                >
                  Max Afford
                </button>
              </div>
            </div>

            {/* Dynamic Estimated Order Value Calculation */}
            <div className="rounded-xl bg-slate-950/90 p-3 border border-slate-800 flex items-center justify-between text-sm">
              <div>
                <span className="text-slate-300">Estimated Order Value:</span>
                <p className="text-xs text-slate-400">
                  {tradingMode === 'live_yahoo'
                    ? `Based on live Yahoo market price (${formatUSD(activePrice)})`
                    : `Based on latest visible close (${formatUSD(latestCloseNum)})`}
                </p>
              </div>
              <div
                data-testid="estimated-order-value"
                className="text-lg font-bold font-mono text-cyan-300"
              >
                {formatUSD(estimatedOrderValue)}
              </div>
            </div>

            {/* Validation Error Message */}
            {validationError && (
              <p
                role="alert"
                data-testid="order-validation-error"
                className="text-xs font-semibold text-rose-300 bg-rose-950/80 p-2.5 rounded-xl border border-rose-500/40"
              >
                {validationError}
              </p>
            )}

            {/* Instant Execution Toggle (shown in Simulation Mode) */}
            {tradingMode === 'simulation' && (
              <div className="rounded-xl bg-emerald-950/30 p-3 border border-emerald-500/30 flex items-center justify-between">
                <label htmlFor="instant-execution-toggle" className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="instant-execution-toggle"
                    checked={instantFill}
                    onChange={(e) => setInstantFill(e.target.checked)}
                    disabled={pendingOrder !== null}
                    className="h-4 w-4 rounded border-emerald-500 text-emerald-600 focus:ring-emerald-500 bg-slate-950"
                  />
                  <span>
                    <strong className="text-emerald-300 font-semibold">Instant Execution Mode:</strong> Automatically advance simulation and fill order immediately on submit.
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
                (tradingMode === 'simulation' && pendingOrder !== null) ||
                !isQuantityValid ||
                validationError !== null
              }
              className="w-full py-3 text-sm font-bold shadow-lg shadow-purple-600/20 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl"
            >
              {tradingMode === 'live_yahoo'
                ? `⚡ Execute Live Market ${orderSide.toUpperCase()} Order`
                : pendingOrder !== null
                ? 'Pending Order Active (Only 1 pending order allowed for MVP)'
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

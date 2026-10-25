import React, { useState, useMemo } from 'react';
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

export const SUPPORTED_SYMBOLS = ['AAPL', 'MSFT', 'SPY'];

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

  // Form State
  const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL');
  const [orderSide, setOrderSide] = useState<OrderSide>('buy');
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => generateIdempotencyKey());

  // Execution Feedback Notices
  const [rejectionNotice, setRejectionNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Single active pending order (if any)
  const pendingOrder: Order | null = orders.find((o) => o.status === 'pending') || null;

  // Latest visible close price for selected symbol
  const latestClosePriceStr = tradingService.getLatestClosePrice(
    selectedSymbol,
    simulation.current_session
  );
  const latestCloseNum = latestClosePriceStr ? parseFloat(latestClosePriceStr) : 0;

  // Parsed quantity
  const parsedQuantity = parseInt(quantityInput, 10);
  const isQuantityValid =
    !isNaN(parsedQuantity) &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity >= 1 &&
    parsedQuantity <= 1_000_000;

  // Dynamic estimated order value
  const estimatedOrderValue = isQuantityValid && latestCloseNum > 0
    ? parsedQuantity * latestCloseNum
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
      const estimatedCostCents = Math.round(qty * latestCloseNum * 100);
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
        const estimatedCostCents = Math.round(parsedQuantity * latestCloseNum * 100);
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

  // Order Submission Handler
  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setRejectionNotice(null);
    setSuccessNotice(null);

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
    setSuccessNotice(
      `Order queued in pending status: ${newOrder.side.toUpperCase()} ${newOrder.quantity} ${newOrder.symbol}. Will execute at next session OPEN.`
    );
    onOrderPlaced?.(newOrder);
  };

  // Advance Session & Execute Order Handler
  const handleAdvanceAndExecute = () => {
    setRejectionNotice(null);
    setSuccessNotice(null);

    try {
      const result = tradingService.advanceAndExecute(
        simulation,
        cashCents,
        positions,
        pendingOrder
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
            `Executed ${updatedOrder.side.toUpperCase()} ${updatedOrder.quantity} ${
              updatedOrder.symbol
            } at next session open price of ${formatUSD(
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

  // Portfolio Equity Calculations
  const totalEquity = tradingService.calculateTotalEquity(cashCents, positions);
  const totalUnrealizedPnl = positions.reduce(
    (sum, p) => sum + parseFloat(p.unrealized_pnl),
    0
  );

  return (
    <div className="space-y-6" data-testid="trading-view">
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
        <Card className="bg-white">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Available Cash
          </div>
          <div
            data-testid="cash-balance"
            className="text-2xl font-bold text-slate-900 mt-1 font-mono"
          >
            {formatUSD(cashCents / 100)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Settled virtual cash balance</div>
        </Card>

        <Card className="bg-white">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Equity
          </div>
          <div
            data-testid="total-equity"
            className="text-2xl font-bold text-slate-900 mt-1 font-mono"
          >
            {formatUSD(totalEquity)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Cash + holdings marked to close</div>
        </Card>

        <Card className="bg-white">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Unrealized P&amp;L
          </div>
          <div
            data-testid="portfolio-unrealized-pnl"
            className={`text-2xl font-bold mt-1 font-mono ${
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
          <div className="text-xs text-slate-500 mt-1">Open positions vs cost basis</div>
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

            <div
              data-testid="pending-order-notice"
              className="text-xs font-semibold text-amber-900 bg-amber-100/90 border border-amber-300 px-3 py-2 rounded-lg"
            >
              Pending Order Active (Only 1 pending order allowed for MVP)
            </div>
          </div>
        </Card>
      )}

      {/* Order Entry Form & Market Context */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Form Card */}
        <Card
          className="lg:col-span-2"
          title="Place Order"
          subtitle="Whole-share market orders executed at next session OPEN"
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
                disabled={pendingOrder !== null || simulation.status === 'completed'}
                onChange={(e) => handleSymbolChange(e.target.value)}
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                {SUPPORTED_SYMBOLS.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym} — {sym === 'AAPL' ? 'Apple Inc.' : sym === 'MSFT' ? 'Microsoft Corp.' : 'SPDR S&P 500 ETF'}
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
                  disabled={pendingOrder !== null || simulation.status === 'completed'}
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
                  disabled={pendingOrder !== null || simulation.status === 'completed'}
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

            {/* Quantity Input */}
            <div>
              <Input
                label="Quantity (Whole Shares: 1 – 1,000,000)"
                id="order-quantity-input"
                data-testid="quantity-input"
                type="number"
                min="1"
                max="1000000"
                step="1"
                disabled={pendingOrder !== null || simulation.status === 'completed'}
                value={quantityInput}
                onChange={(e) => handleQuantityChange(e.target.value)}
                helperText={
                  orderSide === 'sell'
                    ? `Currently holding ${currentHeldShares} shares of ${selectedSymbol}`
                    : `Whole shares only`
                }
              />
            </div>

            {/* Dynamic Estimated Order Value Calculation */}
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 flex items-center justify-between text-sm">
              <div>
                <span className="text-slate-600">Estimated Order Value:</span>
                <p className="text-xs text-slate-500">
                  Based on latest visible close ({formatUSD(latestCloseNum)})
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

            {/* Submit Order Button */}
            <Button
              type="submit"
              data-testid="submit-order-btn"
              variant={orderSide === 'buy' ? 'primary' : 'secondary'}
              disabled={
                pendingOrder !== null ||
                simulation.status === 'completed' ||
                !isQuantityValid ||
                validationError !== null
              }
              className="w-full py-2.5 text-sm font-semibold shadow-sm"
            >
              {pendingOrder !== null
                ? 'Pending Order Active (Only 1 pending order allowed for MVP)'
                : simulation.status === 'completed'
                ? 'Simulation Completed'
                : `Review & Submit ${orderSide.toUpperCase()} Order`}
            </Button>
          </form>
        </Card>

        {/* Selected Symbol Context Card */}
        <Card
          title={`${selectedSymbol} Market Context`}
          subtitle={`Session ${simulation.current_session}`}
        >
          <div className="space-y-3 text-sm">
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

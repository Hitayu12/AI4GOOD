import React, { useState, useId } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
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
} from './simulationFixtures';
import { SimulationService } from './simulationService';
import { TabOverviewModal } from '../../components/common/TabOverviewModal';
import { TradeConfirmationModal, ExecutedTradeReceipt } from '../trading/TradeConfirmationModal';
import { Position, Transaction } from '../trading/tradingTypes';
import { LossGainBadge } from '../portfolio/PortfolioView';
import { SYMBOL_NAMES, SYMBOL_SECTORS } from '../trading/TradingView';

export interface SimulationViewProps {
  service?: SimulationService;
  initialSimulations?: Simulation[];
  defaultDataset?: DatasetMetadata;
  defaultSymbol?: string;
  onSimulationChange?: (sim: Simulation) => void;
  onAdvance?: (updatedSim: Simulation) => void;
}

export const MIN_STARTING_CASH_USD = 1_000;
export const MAX_STARTING_CASH_USD = 1_000_000_000;
export const DEFAULT_STARTING_CASH_USD = 10_000;

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

export function SimulationView({
  service,
  initialSimulations,
  defaultDataset = FIXTURE_DATASET_METADATA,
  defaultSymbol = 'AAPL',
  onSimulationChange,
  onAdvance,
}: SimulationViewProps) {
  // Independent simulation service instance per view component if not explicitly injected
  const [simService] = useState<SimulationService>(
    () => service ?? new SimulationService(initialSimulations)
  );

  // Datasets
  const [datasets] = useState<DatasetMetadata[]>(FIXTURE_DATASETS);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(defaultDataset.id);

  // Simulations list & active simulation
  const [simulations, setSimulations] = useState<Simulation[]>(() => {
    if (initialSimulations && initialSimulations.length > 0) {
      return initialSimulations.map((s) => ({ ...s }));
    }
    return [{ ...INITIAL_SIMULATION_FIXTURE }];
  });

  const [activeSimulationId, setActiveSimulationId] = useState<string>(() => {
    if (initialSimulations && initialSimulations.length > 0) {
      return initialSimulations[0].id;
    }
    return INITIAL_SIMULATION_FIXTURE.id;
  });

  // Active Symbol in Market Data view
  const [selectedSymbol, setSelectedSymbol] = useState<string>(defaultSymbol);

  // Active simulation object
  const activeSimulation: Simulation =
    simulations.find((s) => s.id === activeSimulationId) || simulations[0] || INITIAL_SIMULATION_FIXTURE;

  // Active dataset
  const activeDataset: DatasetMetadata =
    datasets.find((d) => d.id === activeSimulation.dataset_id) || defaultDataset;

  // Market data bars visible to cursor — derived with strict zero-lookahead filter
  const visibleMarketData: MarketDataBar[] = filterVisibleMarketData(
    selectedSymbol,
    activeSimulation.current_session
  );

  // Advance state
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);
  const [advanceError, setAdvanceError] = useState<{ code?: string; message: string } | null>(null);

  // Create Simulation Form State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [startingCashInput, setStartingCashInput] = useState<string>(DEFAULT_STARTING_CASH_USD.toString());
  const [cashValidationError, setCashValidationError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState<boolean>(false);

  // Simulation Paper Trading & Portfolio State
  const [cashCents, setCashCents] = useState<number>(() => {
    const raw = activeSimulation.initial_cash;
    return raw > 100_000_000 ? raw : raw <= 100_000 ? raw * 100 : raw;
  });
  const [positions, setPositions] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [tradeQtyInput, setTradeQtyInput] = useState<string>('10');
  const [tradeValidationError, setTradeValidationError] = useState<string | null>(null);
  const [tradeSuccessNotice, setTradeSuccessNotice] = useState<string | null>(null);
  const [tradeReceipt, setTradeReceipt] = useState<ExecutedTradeReceipt | null>(null);

  // Live region announcement
  const liveAnnounceId = useId();
  const [announcement, setAnnouncement] = useState<string>('');


  // Locked future sessions
  const lockedSessionDates: string[] = activeDataset.session_dates.filter(
    (d) => d > activeSimulation.current_session
  );

  // Calendar progress
  const currentSessionIndex = activeDataset.session_dates.indexOf(activeSimulation.current_session);
  const totalCalendarSessions = activeDataset.session_dates.length;
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
      const raw = chosen.initial_cash;
      setCashCents(raw > 100_000_000 ? raw : raw <= 100_000 ? raw * 100 : raw);
      setPositions([]);
      setTransactions([]);
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

    // Guard: already completed
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

      // Update in simulation list
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

  // Extend Calendar Handler (allows trading more sessions as much as desired)
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
      setAnnouncement(`Calendar extended by ${additionalDays} days! You can now continue advancing and trading.`);
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
      const raw = updated.initial_cash;
      setCashCents(raw > 100_000_000 ? raw : raw <= 100_000 ? raw * 100 : raw);
      setPositions([]);
      setTransactions([]);
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

  // Current session market price of selected symbol
  const activeSessionPrice = latestVisibleBar ? parseFloat(latestVisibleBar.close) : 150.0;

  // Active held shares for currently selected symbol
  const currentHeldShares = positions.find((p) => p.symbol === selectedSymbol)?.quantity ?? 0;

  // Total portfolio market value and equity
  const totalMarketValueDollars = positions.reduce(
    (sum, pos) => sum + parseFloat(pos.market_value),
    0
  );
  const totalEquityDollars = cashCents / 100 + totalMarketValueDollars;
  const initialCashDollars =
    activeSimulation.initial_cash > 100_000_000
      ? activeSimulation.initial_cash / 100
      : activeSimulation.initial_cash <= 100_000
      ? activeSimulation.initial_cash
      : activeSimulation.initial_cash / 100;
  const totalReturnDollars = totalEquityDollars - initialCashDollars;
  const totalReturnPct =
    initialCashDollars > 0 ? (totalReturnDollars / initialCashDollars) * 100 : 0;

  // Execute trade order directly in simulation
  const handleExecuteTrade = () => {
    setTradeValidationError(null);
    setTradeSuccessNotice(null);

    const qty = parseInt(tradeQtyInput, 10);
    if (!tradeQtyInput || isNaN(qty) || qty < 1) {
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

      setTradeSuccessNotice(
        `Bought ${qty} share(s) of ${selectedSymbol} at $${price.toFixed(
          2
        )} on session ${activeSimulation.current_session}!`
      );
    } else {
      // SELL
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

      setTradeSuccessNotice(
        `Sold ${qty} share(s) of ${selectedSymbol} at $${price.toFixed(
          2
        )} on session ${activeSimulation.current_session}!`
      );
    }
  };

  // Quick Sell Helper from Holdings Row
  const handleQuickSell = (sym: string, qty: number) => {
    setSelectedSymbol(sym);
    setOrderSide('sell');
    setTradeQtyInput(qty.toString());
    setTradeValidationError(null);
    setTradeSuccessNotice(null);
  };

  return (
    <div className="space-y-6">
      {/* Trade Confirmation Pop-up Modal */}
      <TradeConfirmationModal
        receipt={tradeReceipt}
        onClose={() => setTradeReceipt(null)}
      />

      {/* Simulation Tab Overview Popup */}
      <TabOverviewModal
        tab="simulation"
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
      />

      {/* Live Region for Screen Reader Announcements */}
      <div id={liveAnnounceId} role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Historical Market Simulation
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Curriculum-paced historical market environment with strict zero-lookahead price isolation
          </p>
        </div>

        {/* Action Controls: Switcher & New Simulation Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {simulations.length > 1 && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="sim-select" className="text-xs font-semibold text-slate-600">
                Switch:
              </label>
              <select
                id="sim-select"
                data-testid="simulation-select"
                value={activeSimulationId}
                onChange={(e) => handleSwitchSimulation(e.target.value)}
                className="text-xs font-medium rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none"
                aria-label="Select simulation to switch or resume"
              >
                {simulations.map((sim) => (
                  <option key={sim.id} value={sim.id}>
                    {sim.id} ({sim.status.toUpperCase()} • {sim.current_session})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsOverviewOpen(true)}
            aria-label="What is Simulation Tab?"
            className="border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 font-bold"
          >
            <span>💡 What is Simulation?</span>
          </Button>

          <Button
            size="sm"
            variant={showCreateModal ? 'secondary' : 'outline'}
            onClick={() => {
              setShowCreateModal(!showCreateModal);
              setCashValidationError(null);
            }}
            data-testid="toggle-create-sim-btn"
            aria-expanded={showCreateModal}
          >
            {showCreateModal ? 'Cancel' : '+ New Simulation'}
          </Button>
        </div>
      </div>

      {/* Create Simulation Collapsible Card */}
      {showCreateModal && (
        <Card
          title="Create New Historical Simulation"
          subtitle="Configure starting cash and dataset calendar"
          className="bg-blue-50/40 border-blue-200"
          data-testid="create-simulation-panel"
        >
          <form onSubmit={handleCreateSimulation} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="create-dataset-select"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Historical Dataset
                </label>
                <select
                  id="create-dataset-select"
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none"
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
                <div className="flex gap-2 mt-2">
                  <span className="text-xs text-slate-500 self-center">Presets:</span>
                  {[1000, 10000, 50000, 1000000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setStartingCashInput(preset.toString());
                        setCashValidationError(null);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      ${preset.toLocaleString('en-US')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                data-testid="submit-create-sim-btn"
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Initialize Simulation'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Dataset Metadata Card & Price-Only Limitation Disclosure */}
      <Card data-testid="dataset-metadata-card">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900" data-testid="dataset-label">
                  {activeDataset.label}
                </h3>
                {activeDataset.synthetic ? (
                  <span
                    data-testid="dataset-type-badge"
                    className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200"
                  >
                    Synthetic Fixture / Demo Data
                  </span>
                ) : (
                  <span
                    data-testid="dataset-type-badge"
                    className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"
                  >
                    Verified Real Historical Data (No Corporate Actions)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-semibold text-slate-700">Source:</span>{' '}
                <span data-testid="dataset-source">{activeDataset.source}</span>
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-500 block">Dataset Identifier:</span>
              <span className="text-xs font-mono font-semibold text-slate-800" data-testid="dataset-id">
                {activeDataset.id}
              </span>
            </div>
          </div>

          {/* Symbol Universe Badges */}
          <div className="flex items-center gap-2 flex-wrap text-xs" data-testid="symbol-universe">
            <span className="font-semibold text-slate-700">Symbol Universe:</span>
            {activeDataset.symbols.map((sym) => {
              const instrumentList = FIXTURE_INSTRUMENTS[activeDataset.id] || [];
              const inst = instrumentList.find((i) => i.symbol === sym);
              return (
                <span
                  key={sym}
                  data-testid={`symbol-badge-${sym}`}
                  className="inline-flex items-center px-2.5 py-1 rounded bg-slate-100 text-slate-800 font-mono font-medium border border-slate-200"
                >
                  {sym} {inst && <span className="text-slate-400 ml-1">({inst.name})</span>}
                </span>
              );
            })}
          </div>

          {/* Price-Only Limitation Disclosure Callout */}
          <div
            data-testid="limitation-disclosure"
            className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1"
          >
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Educational Price-Only Model Disclosure (MVP)</span>
            </div>
            <p className="leading-relaxed">
              This simulation executes against unadjusted daily OHLCV prices. Corporate actions,
              including dividends and stock splits, margin borrowing, short selling, and options execution are strictly
              excluded in this MVP educational release. Options are educational curriculum concepts only.
            </p>
          </div>
        </div>
      </Card>

      {/* Prominent Curriculum Time Cursor Banner */}
      <section
        role="region"
        aria-label="Curriculum Time Cursor Banner"
        data-testid="time-cursor-banner"
        className="rounded-xl border border-blue-300 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 shadow-lg space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wider font-semibold text-blue-300">
                Curriculum Time Cursor
              </span>
              {activeSimulation.status === 'completed' ? (
                <span
                  data-testid="simulation-status-badge"
                  className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-400 text-amber-950"
                >
                  Completed
                </span>
              ) : (
                <span
                  data-testid="simulation-status-badge"
                  className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-400 text-emerald-950"
                >
                  Active
                </span>
              )}
              <span
                data-testid="simulation-version"
                className="px-2 py-0.5 rounded text-xs font-mono bg-blue-900/90 text-blue-200 border border-blue-700"
              >
                v{activeSimulation.version}
              </span>
            </div>

            <div className="flex items-baseline gap-3 flex-wrap">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white">
                <span data-testid="cursor-current-session">{activeSimulation.current_session}</span>
              </div>
              <div className="text-xs font-mono text-blue-200">
                UTC Close: <span data-testid="cursor-current-time">{activeSimulation.current_time}</span>
              </div>
            </div>

            <div className="text-xs text-blue-200 flex items-center gap-2 flex-wrap">
              <span>
                Session {currentSessionIndex + 1} of {totalCalendarSessions} ({calendarProgressPct}%)
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
          </div>

          {/* Interactive Advance Session Button & Quick Horizon Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
            <Button
              data-testid="advance-session-btn"
              variant={activeSimulation.status === 'completed' ? 'secondary' : 'primary'}
              size="lg"
              onClick={handleAdvanceSession}
              disabled={isAdvancing || activeSimulation.status === 'completed'}
              aria-disabled={isAdvancing || activeSimulation.status === 'completed'}
              className={`${
                activeSimulation.status === 'completed'
                  ? 'bg-slate-700 text-slate-400 border border-slate-600 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
              }`}
            >
              {isAdvancing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
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
            </Button>

            {activeSimulation.status === 'completed' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="extend-calendar-btn"
                  onClick={() => handleExtendSessions(30)}
                  disabled={isAdvancing}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer ring-1 ring-emerald-300"
                >
                  <span>⚡</span>
                  <span>Keep Trading (+30 Days)</span>
                </button>
                <button
                  type="button"
                  data-testid="replay-sim-btn"
                  onClick={handleResetSimulation}
                  disabled={isAdvancing}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>🔁</span>
                  <span>Reset to Day 1</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleExtendSessions(30)}
                  disabled={isAdvancing}
                  title="Add 30 more historical trading sessions to the calendar"
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>⚡</span>
                  <span>+30 Days</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetSimulation}
                  disabled={isAdvancing}
                  title="Reset simulation back to Day 1 with fresh cash"
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>🔁</span>
                  <span className="hidden sm:inline">Reset Run</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-blue-950/80 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              activeSimulation.status === 'completed' ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${calendarProgressPct}%` }}
          />
        </div>

        {/* Error Alert Display */}
        {advanceError && (
          <div
            role="alert"
            data-testid="advance-error-alert"
            className="rounded-lg bg-red-900/95 border border-red-500 p-3 text-xs text-red-100 flex items-start justify-between gap-2"
          >
            <div className="space-y-0.5">
              <span className="font-bold text-red-200">
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
              className="text-red-300 hover:text-white font-bold px-1"
              aria-label="Dismiss error message"
            >
              ✕
            </button>
          </div>
        )}
      </section>

      {/* Cycle Completed Celebration & Horizon Extension Card */}
      {activeSimulation.status === 'completed' && (
        <div className="rounded-2xl border border-emerald-300/80 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-indigo-950/90 p-5 text-white shadow-xl space-y-3 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏆</span>
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                  CYCLE COMPLETED
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Historical Cycle Finished! Final Portfolio:{' '}
                <span className="text-emerald-400">{formatUSD(totalEquityDollars)}</span>
              </h3>
              <p className="text-xs text-slate-300">
                You navigated through {activeSimulation.end_session}. Don&apos;t stop now—extend the calendar by 30 days to keep your profits and continue trading, or restart to test a new strategy!
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => handleExtendSessions(30)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center gap-2 ring-2 ring-emerald-300 cursor-pointer"
              >
                <span>⚡</span>
                <span>Keep Trading (+30 Days)</span>
              </button>
              <button
                type="button"
                onClick={handleResetSimulation}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>🔁</span>
                <span>Reset to Day 1</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Paper Trading Desk (Direct Buy & Sell Trading on Simulation Tab) */}
      <section
        aria-label="Simulation Paper Trading Desk"
        className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Simulation Paper Trading Desk
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                Active Session: {activeSimulation.current_session}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Buy and sell any stock on the current session without lookahead bias. Advance the day to see overnight returns!
            </p>
          </div>

          {/* Quick Portfolio Balance Ribbon */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Cash Balance</span>
              <span className="font-mono font-bold text-slate-900">{formatUSD(cashCents / 100)}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs">
              <span className="text-blue-700 block text-[10px] uppercase font-bold">Total Portfolio</span>
              <span className="font-mono font-bold text-blue-950">{formatUSD(totalEquityDollars)}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs">
              <span className="text-emerald-700 block text-[10px] uppercase font-bold">Overall Return</span>
              <LossGainBadge
                dollarValue={totalReturnDollars}
                percentValue={totalReturnPct}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Order Ticket & Execution Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-5 p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Place Simulation Order
              </span>
              <span className="text-xs font-mono font-bold text-slate-900">
                {selectedSymbol}: ${activeSessionPrice.toFixed(2)}
              </span>
            </div>

            {/* Buy / Sell Toggle */}
            <div className="grid grid-cols-2 gap-2 bg-slate-200/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setOrderSide('buy');
                  setTradeValidationError(null);
                }}
                className={`py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  orderSide === 'buy'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <span>🛒</span>
                <span>Buy Shares</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderSide('sell');
                  setTradeValidationError(null);
                }}
                className={`py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  orderSide === 'sell'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <span>💰</span>
                <span>Sell Shares</span>
              </button>
            </div>

            {/* Selected Symbol Info & Relatable Tag */}
            <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  {selectedSymbol} • {SYMBOL_NAMES[selectedSymbol] || selectedSymbol}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                  Held: {currentHeldShares} shs
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>Session Close Price:</span>
                <span className="font-mono font-bold text-slate-900">${activeSessionPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Quantity Input + Quick Chips */}
            <div className="space-y-1.5">
              <label htmlFor="sim-trade-qty" className="block text-xs font-semibold text-slate-700">
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
                className="w-full"
              />
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <span className="text-[10px] font-semibold text-slate-400">Quick:</span>
                {[1, 5, 10, 25, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setTradeQtyInput(preset.toString());
                      setTradeValidationError(null);
                    }}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white border border-slate-200 hover:border-blue-400 text-slate-700 transition-colors cursor-pointer"
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
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
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
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    Sell All ({currentHeldShares})
                  </button>
                )}
              </div>
            </div>

            {/* Estimated Total */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Estimated Gross Total:</span>
              <span className="font-mono font-extrabold text-sm text-slate-900">
                {formatUSD((parseInt(tradeQtyInput, 10) || 0) * activeSessionPrice)}
              </span>
            </div>

            {/* Error & Success Messages */}
            {tradeValidationError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {tradeValidationError}
              </div>
            )}
            {tradeSuccessNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                {tradeSuccessNotice}
              </div>
            )}

            {/* Submit Trade Button */}
            <button
              type="button"
              onClick={handleExecuteTrade}
              className={`w-full py-3 rounded-xl font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                orderSide === 'buy'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-500/20'
              }`}
            >
              <span>{orderSide === 'buy' ? '🚀' : '💰'}</span>
              <span>
                {orderSide === 'buy' ? 'Buy' : 'Sell'}{' '}
                {parseInt(tradeQtyInput, 10) || 1} {selectedSymbol} ({formatUSD((parseInt(tradeQtyInput, 10) || 1) * activeSessionPrice)})
              </span>
            </button>
          </div>

          {/* Active Simulation Holdings & Recent Orders */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Active Simulation Holdings
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {positions.length} Positions
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Priced at {activeSimulation.current_session} Close
              </span>
            </div>

            {positions.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs" aria-label="Simulation Holdings Table">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Asset</th>
                      <th className="py-2.5 px-3">Shares</th>
                      <th className="py-2.5 px-3">Avg Cost</th>
                      <th className="py-2.5 px-3">Market Value</th>
                      <th className="py-2.5 px-3">P&amp;L</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {positions.map((pos) => {
                      const costNum = parseFloat(pos.cost_basis);
                      const priceNum = parseFloat(pos.market_price);
                      const pnlNum = parseFloat(pos.unrealized_pnl);
                      const pnlPct = costNum > 0 ? ((priceNum - costNum) / costNum) * 100 : 0;

                      return (
                        <tr key={pos.symbol} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3">
                            <button
                              type="button"
                              onClick={() => setSelectedSymbol(pos.symbol)}
                              className="font-bold text-blue-700 hover:underline text-left font-sans"
                            >
                              {pos.symbol}
                            </button>
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">{pos.quantity}</td>
                          <td className="py-2 px-3 text-slate-600">${costNum.toFixed(2)}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">${parseFloat(pos.market_value).toFixed(2)}</td>
                          <td className="py-2 px-3">
                            <LossGainBadge
                              dollarValue={pnlNum}
                              percentValue={pnlPct}
                              size="sm"
                            />
                          </td>
                          <td className="py-2 px-3 text-right space-x-1 font-sans">
                            <button
                              type="button"
                              onClick={() => handleQuickSell(pos.symbol, 1)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                            >
                              Sell 1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickSell(pos.symbol, pos.quantity)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-500 cursor-pointer"
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
              <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center space-y-2">
                <span className="text-3xl block">💼</span>
                <h4 className="text-sm font-bold text-slate-800">No stocks owned in this simulation yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Pick a stock on the left, enter how many shares you want, and click <strong>Buy Shares</strong> to start building your portfolio!
                </p>
              </div>
            )}

            {/* Quick Audit Log */}
            {transactions.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Recent Orders This Run ({transactions.length})
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                  {transactions.slice(0, 6).map((txn) => (
                    <div
                      key={txn.id}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.2 rounded font-sans text-[9px] font-bold uppercase ${
                            txn.side === 'buy'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {txn.side}
                        </span>
                        <span className="font-bold text-slate-900">{txn.quantity} {txn.symbol}</span>
                        <span className="text-slate-500">@ ${parseFloat(txn.price).toFixed(2)}</span>
                      </div>
                      <span className="text-slate-400 font-sans text-[10px]">{txn.session_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Market Data View */}
      <section data-testid="market-data-view" className="space-y-4">
        {/* Symbol Picker Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 mr-1.5">Universe:</span>
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
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-mono">{sym}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Viewing Symbol: <span className="font-bold text-slate-800">{selectedSymbol}</span>
          </div>
        </div>

        {/* Latest Visible Closing Price Quick Glance */}
        {latestVisibleBar && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Latest Close</span>
              <span className="text-lg font-bold font-mono text-slate-900" data-testid="latest-close-price">
                ${parseFloat(latestVisibleBar.close).toFixed(2)}
              </span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Open</span>
              <span className="text-sm font-semibold font-mono text-slate-800">
                ${parseFloat(latestVisibleBar.open).toFixed(2)}
              </span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">High</span>
              <span className="text-sm font-semibold font-mono text-slate-800">
                ${parseFloat(latestVisibleBar.high).toFixed(2)}
              </span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Low</span>
              <span className="text-sm font-semibold font-mono text-slate-800">
                ${parseFloat(latestVisibleBar.low).toFixed(2)}
              </span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Volume</span>
              <span className="text-sm font-semibold font-mono text-slate-800">
                {formatVolume(latestVisibleBar.volume)}
              </span>
            </div>
          </div>
        )}

        {/* Market Data Table (Sessions strictly up to current cursor) */}
        <Card
          title={`${selectedSymbol} Market Data Records`}
          subtitle={`Sessions up to current cursor (${activeSimulation.current_session})`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Market Data Table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
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
              <tbody className="divide-y divide-slate-100 font-mono">
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
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {bar.session_date}
                        {bar.session_date === activeSimulation.current_session && (
                          <span className="ml-2 text-[10px] font-sans font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                            CURRENT
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-500">{bar.available_at}</td>
                      <td className="py-2 px-3 text-slate-700">${openNum.toFixed(2)}</td>
                      <td className="py-2 px-3 text-slate-700">${parseFloat(bar.high).toFixed(2)}</td>
                      <td className="py-2 px-3 text-slate-700">${parseFloat(bar.low).toFixed(2)}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">${closeNum.toFixed(2)}</td>
                      <td className={`py-2 px-3 font-semibold ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                        {isPositive ? '+' : ''}
                        {diff.toFixed(2)} ({pct.toFixed(2)}%)
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700">{formatVolume(bar.volume)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Future Sessions Locked Notification & Placeholders */}
        <div
          data-testid="future-data-locked-banner"
          className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-base" role="img" aria-label="Locked">
              🔒
            </span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Future Market Prices Locked
            </h4>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Future prices are locked until the session is advanced. Market data beyond{' '}
            <strong className="text-slate-900">{activeSimulation.current_session}</strong> is strictly
            withheld from the interface to prevent lookahead bias and preserve realistic curriculum pacing.
          </p>

          {lockedSessionDates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
              {lockedSessionDates.map((date) => (
                <div
                  key={date}
                  data-testid={`locked-session-${date}`}
                  className="flex items-center justify-between p-2 rounded border border-dashed border-slate-300 bg-white text-slate-400 text-xs"
                >
                  <span className="font-mono font-medium">Session {date}</span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
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
            <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded">
              All calendar sessions in this historical dataset have been unlocked.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default SimulationView;

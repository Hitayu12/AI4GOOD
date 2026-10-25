/**
 * Rutgers AI4Good 2026 — Paper Trading Engine & Accounting Service Tests
 * Strictly verifies docs/API_CONTRACT.md (v2) requirements:
 * 1. Queuing buy order creates pending order with null execution price.
 * 2. Attempting second order while pending rejects with 409 pending_order_exists.
 * 3. Oversell attempt (selling more shares than owned) rejects with 422.
 * 4. Advance fills order at next session OPEN price and creates Transaction.
 * 5. Price gap rejection: Buy order rejected when next session open exceeds available cash.
 * 6. Stale version 409 conflict detection.
 * 7. Replay of same idempotency key returns idempotent receipt.
 * 8. Reference reconciliation: buy 2 @ 100 open, mark 110 close -> cash 800, equity 1020.
 * Plus additional edge cases: bounds checking, symbol universe, weighted-average multi-buys.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TradingService } from './tradingService';
import { ApiError, MarketDataBar } from './tradingTypes';
import { FIXTURE_DATASET_ID } from '../simulation/simulationFixtures';

describe('TradingService Paper Trading Engine & Accounting', () => {
  let service: TradingService;

  beforeEach(() => {
    service = new TradingService();
  });

  describe('1. Queuing buy order creates pending order with null execution price', () => {
    it('creates pending order with submitted_at=sim.current_time and null execution fields', async () => {
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 10000000, // $100,000.00 stored in cents
      });

      const res = await service.createOrder(sim.id, {
        symbol: 'AAPL',
        side: 'buy',
        quantity: 10,
        expected_version: 1,
      });

      expect(res.order.id).toMatch(/^ord_/);
      expect(res.order.symbol).toBe('AAPL');
      expect(res.order.side).toBe('buy');
      expect(res.order.quantity).toBe(10);
      expect(res.order.status).toBe('pending');
      expect(res.order.submitted_at).toBe(sim.current_time);
      expect(res.order.executed_at).toBeNull();
      expect(res.order.execution_price).toBeNull();
      expect(res.order.rejection_code).toBeNull();

      // Mutation increments simulation version to 2
      expect(res.simulation.version).toBe(2);

      // Verify order appears in getOrders
      const orders = await service.getOrders(sim.id);
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe(res.order.id);
      expect(orders[0].status).toBe('pending');
    });
  });

  describe('2. Attempting second order while pending rejects with 409 pending_order_exists', () => {
    it('rejects subsequent order creation with 409 when a pending order already exists', async () => {
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 10000000,
      });

      // Place first order
      await service.createOrder(sim.id, {
        symbol: 'AAPL',
        side: 'buy',
        quantity: 5,
        expected_version: 1,
      });

      // Attempt second order while first is still pending (version is now 2)
      try {
        await service.createOrder(sim.id, {
          symbol: 'MSFT',
          side: 'buy',
          quantity: 2,
          expected_version: 2,
        });
        expect.fail('Should have thrown ApiError 409');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(409);
        expect(apiErr.code).toBe('pending_order_exists');
      }

      // Verify only 1 pending order remains
      const orders = await service.getOrders(sim.id);
      expect(orders).toHaveLength(1);
      expect(orders[0].symbol).toBe('AAPL');
    });
  });

  describe('3. Oversell attempt rejects with 422 insufficient_holdings', () => {
    it('rejects selling when holding zero shares', async () => {
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 10000000,
      });

      try {
        await service.createOrder(sim.id, {
          symbol: 'AAPL',
          side: 'sell',
          quantity: 1,
          expected_version: 1,
        });
        expect.fail('Should have rejected oversell with 422');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(422);
        expect(apiErr.code).toBe('insufficient_holdings');
        expect(apiErr.field).toBe('quantity');
      }
    });

    it('rejects selling more shares than currently owned in holdings', async () => {
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 10000000,
      });

      // Set holding to 5 shares of AAPL
      service.setPortfolio(sim.id, {
        positions: [
          {
            symbol: 'AAPL',
            quantity: 5,
            cost_basis: '180.000000',
            market_price: '184.530000',
            market_value: '922.65',
            unrealized_pnl: '22.65',
          },
        ],
      });

      // Attempt to sell 6 shares
      try {
        await service.createOrder(sim.id, {
          symbol: 'AAPL',
          side: 'sell',
          quantity: 6,
          expected_version: 1,
        });
        expect.fail('Should have rejected oversell with 422');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(422);
        expect(apiErr.code).toBe('insufficient_holdings');
      }
    });
  });

  describe('4. Advance fills order at next session OPEN price and creates Transaction', () => {
    it('executes pending buy at 2024-01-03 OPEN price (183.120000) and appends Transaction', async () => {
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 10000000, // $100,000.00
      });

      // Submit buy order for 10 shares of AAPL on 2024-01-02
      await service.createOrder(sim.id, {
        symbol: 'AAPL',
        side: 'buy',
        quantity: 10,
        expected_version: 1,
      });

      // Advance to 2024-01-03 (expected_version: 2)
      const advanceRes = await service.advanceWithTrading(sim.id, 2);

      expect(advanceRes.simulation.current_session).toBe('2024-01-03');
      expect(advanceRes.simulation.version).toBe(3);
      expect(advanceRes.order_results).toHaveLength(1);

      const filledOrder = advanceRes.order_results[0];
      expect(filledOrder.status).toBe('filled');
      expect(filledOrder.execution_price).toBe('183.120000'); // Next session OPEN
      expect(filledOrder.executed_at).toBe('2024-01-03T14:30:00Z');
      expect(filledOrder.rejection_code).toBeNull();

      // Check transaction log
      const txs = await service.getTransactions(sim.id);
      expect(txs).toHaveLength(1);
      expect(txs[0].order_id).toBe(filledOrder.id);
      expect(txs[0].symbol).toBe('AAPL');
      expect(txs[0].side).toBe('buy');
      expect(txs[0].quantity).toBe(10);
      expect(txs[0].price).toBe('183.120000');
      expect(txs[0].gross_amount).toBe('1831.20'); // 10 * 183.12
      expect(txs[0].session_date).toBe('2024-01-03');
      expect(txs[0].executed_at).toBe('2024-01-03T14:30:00Z');

      // Check updated portfolio: cash deducted, position added
      const portfolio = await service.getPortfolio(sim.id);
      expect(portfolio.as_of_session).toBe('2024-01-03');
      expect(portfolio.cash).toBe('98168.80'); // 100000 - 1831.20
      expect(portfolio.positions).toHaveLength(1);
      expect(portfolio.positions[0].symbol).toBe('AAPL');
      expect(portfolio.positions[0].quantity).toBe(10);
      expect(portfolio.positions[0].cost_basis).toBe('183.120000');
      expect(portfolio.positions[0].market_price).toBe('183.150000'); // 2024-01-03 close
      expect(portfolio.positions[0].market_value).toBe('1831.50');
      expect(portfolio.positions[0].unrealized_pnl).toBe('0.30');
    });
  });

  describe('5. Price gap rejection: Buy order rejected when next session open exceeds available cash', () => {
    it('rejects order with insufficient_cash when open gaps higher than available cash without changing portfolio', async () => {
      // Custom bars where price gaps from 100 to 600
      const gapBars: MarketDataBar[] = [
        {
          session_date: '2024-01-02',
          available_at: '2024-01-02T21:00:00Z',
          open: '100.000000',
          high: '105.000000',
          low: '95.000000',
          close: '100.000000',
          volume: 1000,
        },
        {
          session_date: '2024-01-03',
          available_at: '2024-01-03T21:00:00Z',
          open: '600.000000', // Gapped up from 100 to 600!
          high: '620.000000',
          low: '590.000000',
          close: '610.000000',
          volume: 1000,
        },
      ];

      service.setCustomMarketData('AAPL', gapBars);

      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 100000, // $1,000.00 starting cash
      });

      // User places buy order for 2 shares of AAPL
      // Early balance check uses visible close (100.00): 2 * 100 = $200 <= $1,000 cash -> ACCEPTED as pending!
      await service.createOrder(sim.id, {
        symbol: 'AAPL',
        side: 'buy',
        quantity: 2,
        expected_version: 1,
      });

      // Advance to 2024-01-03:
      // Open price is $600.00 -> 2 * $600 = $1,200.00 > $1,000.00 available cash!
      const advanceRes = await service.advanceWithTrading(sim.id, 2);

      expect(advanceRes.order_results).toHaveLength(1);
      const rejectedOrder = advanceRes.order_results[0];
      expect(rejectedOrder.status).toBe('rejected');
      expect(rejectedOrder.rejection_code).toBe('insufficient_cash');
      expect(rejectedOrder.execution_price).toBeNull();
      expect(rejectedOrder.executed_at).toBeNull();

      // Invariant: Cash and positions remain completely unchanged
      const portfolio = await service.getPortfolio(sim.id);
      expect(portfolio.cash).toBe('1000.00');
      expect(portfolio.positions).toHaveLength(0);

      // No transactions logged
      const txs = await service.getTransactions(sim.id);
      expect(txs).toHaveLength(0);
    });
  });

  describe('6. Stale version 409 conflict detection', () => {
    it('rejects createOrder when expected_version does not match current simulation version', async () => {
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 10000000,
      });

      // Expected version 99 != current version 1
      try {
        await service.createOrder(sim.id, {
          symbol: 'AAPL',
          side: 'buy',
          quantity: 1,
          expected_version: 99,
        });
        expect.fail('Should have thrown 409 stale_version');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(409);
        expect(apiErr.code).toBe('stale_version');
        expect(apiErr.field).toBe('expected_version');
      }
    });

    it('rejects advanceWithTrading when expectedVersion does not match current simulation version', async () => {
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 10000000,
      });

      try {
        await service.advanceWithTrading(sim.id, 99);
        expect.fail('Should have thrown 409 stale_version');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(409);
        expect(apiErr.code).toBe('stale_version');
      }
    });
  });

  describe('7. Replay of same idempotency key returns idempotent receipt', () => {
    it('returns original receipt on identical replay without creating duplicate order or incrementing version', async () => {
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 10000000,
      });

      const key = 'idem-order-key-1';

      // First submission
      const firstRes = await service.createOrder(
        sim.id,
        {
          symbol: 'AAPL',
          side: 'buy',
          quantity: 5,
          expected_version: 1,
        },
        key
      );

      expect(firstRes.simulation.version).toBe(2);

      // Replay identical request with same key
      const replayRes = await service.createOrder(
        sim.id,
        {
          symbol: 'AAPL',
          side: 'buy',
          quantity: 5,
          expected_version: 1,
        },
        key
      );

      // Idempotent replay returns same order ID and version
      expect(replayRes.order.id).toBe(firstRes.order.id);
      expect(replayRes.simulation.version).toBe(2);

      // Verify no duplicate order in order list
      const orders = await service.getOrders(sim.id);
      expect(orders).toHaveLength(1);
    });

    it('rejects reused key with different payload with 409 idempotency_conflict', async () => {
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 10000000,
      });

      const key = 'idem-order-key-2';

      await service.createOrder(
        sim.id,
        {
          symbol: 'AAPL',
          side: 'buy',
          quantity: 5,
          expected_version: 1,
        },
        key
      );

      // Different quantity with same key
      try {
        await service.createOrder(
          sim.id,
          {
            symbol: 'AAPL',
            side: 'buy',
            quantity: 10,
            expected_version: 1,
          },
          key
        );
        expect.fail('Should have thrown 409 idempotency_conflict');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(409);
        expect(apiErr.code).toBe('idempotency_conflict');
      }
    });
  });

  describe('8. Reference reconciliation: buy 2 @ 100 open, mark 110 close -> cash 800, equity 1020', () => {
    it('strictly satisfies docs/API_CONTRACT.md line 59 reference walkthrough', async () => {
      // Explicit reference fixture sessions from API Contract:
      // Session 1: initial session (2024-01-02)
      // Session 2: open 100.00, close 110.00 (2024-01-03)
      // Session 3: open 120.00, close 90.00 (2024-01-04)
      // Session 4: open 95.00, close 95.00 (2024-01-05)
      const refBars: MarketDataBar[] = [
        {
          session_date: '2024-01-02',
          available_at: '2024-01-02T21:00:00Z',
          open: '100.000000',
          high: '105.000000',
          low: '95.000000',
          close: '100.000000',
          volume: 1000,
        },
        {
          session_date: '2024-01-03',
          available_at: '2024-01-03T21:00:00Z',
          open: '100.000000',
          high: '115.000000',
          low: '98.000000',
          close: '110.000000',
          volume: 1000,
        },
        {
          session_date: '2024-01-04',
          available_at: '2024-01-04T21:00:00Z',
          open: '120.000000',
          high: '125.000000',
          low: '88.000000',
          close: '90.000000',
          volume: 1000,
        },
        {
          session_date: '2024-01-05',
          available_at: '2024-01-05T21:00:00Z',
          open: '95.000000',
          high: '98.000000',
          low: '92.000000',
          close: '95.000000',
          volume: 1000,
        },
      ];

      service.setCustomMarketData('AAPL', refBars);

      // Initial cash 1000.00
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-05',
        initial_cash: 100000, // 100,000 cents = $1,000.00
      });

      // Step A: Queue buy 2 AAPL at version 1
      await service.createOrder(sim.id, {
        symbol: 'AAPL',
        side: 'buy',
        quantity: 2,
        expected_version: 1,
      });

      // Advance to 2024-01-03: Fills at open 100.00, marked at close 110.00
      await service.advanceWithTrading(sim.id, 2);

      const p1 = await service.getPortfolio(sim.id);
      expect(p1.as_of_session).toBe('2024-01-03');
      expect(p1.cash).toBe('800.00'); // 1000 - 200
      expect(p1.total_equity).toBe('1020.00'); // 800 cash + (2 * 110)
      expect(p1.realized_pnl).toBe('0.00');
      expect(p1.unrealized_pnl).toBe('20.00');
      expect(p1.positions).toHaveLength(1);
      expect(p1.positions[0].quantity).toBe(2);
      expect(p1.positions[0].cost_basis).toBe('100.000000');
      expect(p1.positions[0].market_value).toBe('220.00');

      // Step B: Sell 1 AAPL at next open 120.00, mark close 90.00
      // Current version is 3
      await service.createOrder(sim.id, {
        symbol: 'AAPL',
        side: 'sell',
        quantity: 1,
        expected_version: 3,
      });

      // Advance to 2024-01-04 (version 4)
      await service.advanceWithTrading(sim.id, 4);

      const p2 = await service.getPortfolio(sim.id);
      expect(p2.as_of_session).toBe('2024-01-04');
      expect(p2.cash).toBe('920.00'); // 800 + 120
      expect(p2.realized_pnl).toBe('20.00'); // 120 proceeds - 100 cost
      expect(p2.unrealized_pnl).toBe('-10.00'); // 90 mark - 100 remaining cost
      expect(p2.total_equity).toBe('1010.00'); // 920 cash + 90 market value
      expect(p2.positions).toHaveLength(1);
      expect(p2.positions[0].quantity).toBe(1);

      // Step C: Sell final share at 95.00
      // Current version is 5
      await service.createOrder(sim.id, {
        symbol: 'AAPL',
        side: 'sell',
        quantity: 1,
        expected_version: 5,
      });

      // Advance to 2024-01-05 (version 6)
      await service.advanceWithTrading(sim.id, 6);

      const p3 = await service.getPortfolio(sim.id);
      expect(p3.as_of_session).toBe('2024-01-05');
      expect(p3.cash).toBe('1015.00'); // 920 + 95
      expect(p3.total_equity).toBe('1015.00');
      expect(p3.realized_pnl).toBe('15.00'); // 20.00 previous + (95 - 100) = 15.00 cumulative
      expect(p3.unrealized_pnl).toBe('0.00');
      expect(p3.positions).toHaveLength(0); // Liquidated complete position
    });
  });

  describe('9. Quantity validation rejects non-integer, negative, zero, and overflow quantities', () => {
    it('rejects invalid quantity values with 422 invalid_quantity', async () => {
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 10000000,
      });

      const invalidQuantities = [0, -1, 1.5, 1_000_001, NaN];

      for (const qty of invalidQuantities) {
        try {
          await service.createOrder(sim.id, {
            symbol: 'AAPL',
            side: 'buy',
            quantity: qty,
            expected_version: 1,
          });
          expect.fail(`Should have rejected quantity ${qty}`);
        } catch (err) {
          expect(err).toBeInstanceOf(ApiError);
          const apiErr = err as ApiError;
          expect(apiErr.status).toBe(422);
          expect(apiErr.code).toBe('invalid_quantity');
        }
      }
    });
  });

  describe('10. Early balance check rejects buy when estimated cost exceeds available cash', () => {
    it('rejects buy order with 422 insufficient_cash based on latest visible close', async () => {
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 100000, // $1,000.00 cash
      });

      // MSFT close on 2024-01-02 is $362.85 -> 10 shares = $3,628.50 > $1,000.00 cash
      try {
        await service.createOrder(sim.id, {
          symbol: 'MSFT',
          side: 'buy',
          quantity: 10,
          expected_version: 1,
        });
        expect.fail('Should have rejected buy with insufficient_cash');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(422);
        expect(apiErr.code).toBe('insufficient_cash');
        expect(apiErr.field).toBe('quantity');
      }
    });
  });

  describe('11. Advance without pending orders updates simulation and marks existing positions to market', () => {
    it('advances date, increments version, and updates portfolio market values', async () => {
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 10000000,
      });

      // Seed holding
      service.setPortfolio(sim.id, {
        positions: [
          {
            symbol: 'AAPL',
            quantity: 10,
            cost_basis: '180.000000',
            market_price: '184.530000',
            market_value: '1845.30',
            unrealized_pnl: '45.30',
          },
        ],
      });

      // Advance without any pending order
      const result = await service.advanceWithTrading(sim.id, 1);

      expect(result.simulation.current_session).toBe('2024-01-03');
      expect(result.simulation.version).toBe(2);
      expect(result.order_results).toHaveLength(0);

      // Verify portfolio is marked as of 2024-01-03
      const portfolio = await service.getPortfolio(sim.id);
      expect(portfolio.as_of_session).toBe('2024-01-03');
      expect(portfolio.positions[0].market_price).toBe('183.150000'); // 2024-01-03 close
      expect(portfolio.positions[0].market_value).toBe('1831.50');
    });
  });

  describe('12. Rejects orders and advances on completed simulations', () => {
    it('rejects order placement with 409 when simulation has reached final session', async () => {
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-03',
        initial_cash: 10000000,
      });

      // Advance to end_session
      const adv = await service.advanceWithTrading(sim.id, 1);
      expect(adv.simulation.status).toBe('completed');

      // Attempting to place an order at completed status
      try {
        await service.createOrder(sim.id, {
          symbol: 'AAPL',
          side: 'buy',
          quantity: 1,
          expected_version: 2,
        });
        expect.fail('Should have rejected order on completed simulation');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(409);
        expect((err as ApiError).code).toBe('simulation_completed');
      }

      // Subsequent advance returns 409
      try {
        await service.advanceWithTrading(sim.id, 2);
        expect.fail('Should have rejected advance on completed simulation');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(409);
        expect((err as ApiError).code).toBe('simulation_completed');
      }
    });
  });

  describe('13. Rejects unknown symbols not in simulation universe', () => {
    it('rejects orders for symbols outside the universe with 422 unknown_symbol', async () => {
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 10000000,
      });

      try {
        await service.createOrder(sim.id, {
          symbol: 'TSLA', // TSLA is not in AAPL, MSFT, SPY
          side: 'buy',
          quantity: 1,
          expected_version: 1,
        });
        expect.fail('Should have rejected TSLA');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(422);
        expect(apiErr.code).toBe('unknown_symbol');
        expect(apiErr.field).toBe('symbol');
      }
    });
  });

  describe('14. Weighted-average cost basis with multiple buys before partial sell', () => {
    it('accurately tracks weighted average cost basis across consecutive buys and partial sales', async () => {
      const multiBars: MarketDataBar[] = [
        {
          session_date: '2024-01-02',
          available_at: '2024-01-02T21:00:00Z',
          open: '100.000000',
          high: '105.000000',
          low: '95.000000',
          close: '100.000000',
          volume: 1000,
        },
        {
          session_date: '2024-01-03',
          available_at: '2024-01-03T21:00:00Z',
          open: '100.000000', // First buy fills at 100
          high: '150.000000',
          low: '100.000000',
          close: '140.000000',
          volume: 1000,
        },
        {
          session_date: '2024-01-04',
          available_at: '2024-01-04T21:00:00Z',
          open: '200.000000', // Second buy fills at 200
          high: '210.000000',
          low: '190.000000',
          close: '200.000000',
          volume: 1000,
        },
        {
          session_date: '2024-01-05',
          available_at: '2024-01-05T21:00:00Z',
          open: '180.000000', // Partial sell fills at 180
          high: '185.000000',
          low: '175.000000',
          close: '180.000000',
          volume: 1000,
        },
      ];

      service.setCustomMarketData('AAPL', multiBars);

      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-05',
        initial_cash: 1000000, // $10,000.00 cash
      });

      // Buy 10 @ 100 on 2024-01-03 (cost: 1,000)
      await service.createOrder(sim.id, {
        symbol: 'AAPL',
        side: 'buy',
        quantity: 10,
        expected_version: 1,
      });
      await service.advanceWithTrading(sim.id, 2);

      // Buy 10 @ 200 on 2024-01-04 (cost: 2,000) -> total 20 shares, total cost 3,000 (avg 150/share)
      await service.createOrder(sim.id, {
        symbol: 'AAPL',
        side: 'buy',
        quantity: 10,
        expected_version: 3,
      });
      await service.advanceWithTrading(sim.id, 4);

      let port = await service.getPortfolio(sim.id);
      expect(port.positions[0].quantity).toBe(20);
      expect(port.positions[0].cost_basis).toBe('150.000000'); // (1000 + 2000) / 20 = 150.000000

      // Sell 5 @ 180 on 2024-01-05:
      // Proceeds: 5 * 180 = 900
      // Proportional cost: (5 / 20) * 3000 = 750
      // Realized P&L: 900 - 750 = +150
      // Remaining shares: 15, remaining cost: 2250 (150/share)
      await service.createOrder(sim.id, {
        symbol: 'AAPL',
        side: 'sell',
        quantity: 5,
        expected_version: 5,
      });
      await service.advanceWithTrading(sim.id, 6);

      port = await service.getPortfolio(sim.id);
      expect(port.positions[0].quantity).toBe(15);
      expect(port.positions[0].cost_basis).toBe('150.000000');
      expect(port.realized_pnl).toBe('150.00');
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationService } from './simulationService';
import {
  FIXTURE_DATASET_ID,
  filterVisibleMarketData,
  RAW_MARKET_DATA,
} from './simulationFixtures';
import { ApiError } from './simulationTypes';

describe('SimulationService and Data Fixtures', () => {
  let service: SimulationService;

  beforeEach(() => {
    service = new SimulationService();
  });

  describe('1. Create simulation returns 201 with version 1 and start_session cursor', () => {
    it('creates simulation with version 1, active status, and cursor pinned to start_session', async () => {
      const result = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 100000000,
      });

      expect(result.statusCode).toBe(201);
      expect(result.version).toBe(1);
      expect(result.status).toBe('active');
      expect(result.start_session).toBe('2024-01-02');
      expect(result.current_session).toBe('2024-01-02');
      expect(result.current_time).toBe('2024-01-02T21:00:00Z');
      expect(result.end_session).toBe('2024-01-08');
      expect(result.symbols).toEqual(['AAPL', 'MSFT', 'SPY']);
      expect(result.initial_cash).toBe(100000000);
      expect(result.id).toMatch(/^sim_/);

      // Verify retrieval returns the exact same simulation
      const fetched = await service.getSimulation(result.id);
      expect(fetched).toEqual(result);
    });

    it('returns 201 envelope format via createSimulationEnvelope', async () => {
      const envelope = await service.createSimulationEnvelope({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-05',
        initial_cash: 50000000,
      });

      expect(envelope.status).toBe(201);
      expect(envelope.simulation.version).toBe(1);
      expect(envelope.simulation.current_session).toBe('2024-01-02');
      expect(envelope.simulation.end_session).toBe('2024-01-05');
    });

    it('rejects invalid initial cash (<= 0) with 422 error', async () => {
      await expect(
        service.createSimulation({
          dataset_id: FIXTURE_DATASET_ID,
          start_session: '2024-01-02',
          end_session: '2024-01-08',
          initial_cash: 0,
        })
      ).rejects.toThrowError(ApiError);

      try {
        await service.createSimulation({
          dataset_id: FIXTURE_DATASET_ID,
          start_session: '2024-01-02',
          end_session: '2024-01-08',
          initial_cash: -100,
        });
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(422);
        expect(apiErr.code).toBe('invalid_initial_cash');
      }
    });

    it('rejects invalid session dates or reversed ranges with 422 error', async () => {
      // Non-existent date
      await expect(
        service.createSimulation({
          dataset_id: FIXTURE_DATASET_ID,
          start_session: '2024-01-01', // Holiday
          end_session: '2024-01-08',
          initial_cash: 100000,
        })
      ).rejects.toThrowError(ApiError);

      // Reversed range
      await expect(
        service.createSimulation({
          dataset_id: FIXTURE_DATASET_ID,
          start_session: '2024-01-05',
          end_session: '2024-01-03',
          initial_cash: 100000,
        })
      ).rejects.toThrowError(ApiError);
    });
  });

  describe('2. Advance increments version and updates current_session', () => {
    it('advances simulation from 2024-01-02 to 2024-01-03 and increments version to 2', async () => {
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 100000000,
      });

      expect(sim.version).toBe(1);
      expect(sim.current_session).toBe('2024-01-02');

      const response = await service.advanceSimulation(sim.id, 1);
      expect(response.simulation.version).toBe(2);
      expect(response.simulation.current_session).toBe('2024-01-03');
      expect(response.simulation.current_time).toBe('2024-01-03T21:00:00Z');
      expect(response.simulation.status).toBe('active');
      expect(response.order_results).toEqual([]);

      // Advance again with expected version 2
      const secondAdvance = await service.advanceSimulation(sim.id, 2);
      expect(secondAdvance.simulation.version).toBe(3);
      expect(secondAdvance.simulation.current_session).toBe('2024-01-04');
      expect(secondAdvance.simulation.current_time).toBe('2024-01-04T21:00:00Z');
      expect(secondAdvance.simulation.status).toBe('active');
    });
  });

  describe('3. Strict no-future-data test: market data only returns bars up to current_session', () => {
    it('filterVisibleMarketData strictly excludes any bars with session_date > currentSession', () => {
      // Invariant: At 2024-01-02, only 2024-01-02 is visible
      const barsAtJan2 = filterVisibleMarketData('AAPL', '2024-01-02');
      expect(barsAtJan2).toHaveLength(1);
      expect(barsAtJan2[0].session_date).toBe('2024-01-02');
      expect(barsAtJan2.every((b) => b.session_date <= '2024-01-02')).toBe(true);

      // At 2024-01-04, exactly 3 sessions (2024-01-02, 2024-01-03, 2024-01-04) are visible
      const barsAtJan4 = filterVisibleMarketData('AAPL', '2024-01-04');
      expect(barsAtJan4).toHaveLength(3);
      expect(barsAtJan4.map((b) => b.session_date)).toEqual(['2024-01-02', '2024-01-03', '2024-01-04']);
      expect(barsAtJan4.some((b) => b.session_date > '2024-01-04')).toBe(false);

      // At 2024-01-08, all 5 sessions are visible
      const barsAtJan8 = filterVisibleMarketData('AAPL', '2024-01-08');
      expect(barsAtJan8).toHaveLength(5);
      expect(barsAtJan8.map((b) => b.session_date)).toEqual([
        '2024-01-02',
        '2024-01-03',
        '2024-01-04',
        '2024-01-05',
        '2024-01-08',
      ]);
    });

    it('simulation endpoint exposes ONLY data available up to current cursor and rejects future bounds', async () => {
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 100000000,
      });

      // At session 2024-01-02:
      const aaplBars = await service.getMarketData(sim.id, 'AAPL');
      expect(aaplBars).toHaveLength(1);
      expect(aaplBars[0].session_date).toBe('2024-01-02');
      expect(aaplBars[0].available_at).toBe('2024-01-02T21:00:00Z');
      expect(aaplBars[0].open).toBe('186.030000');
      expect(aaplBars[0].high).toBe('187.320000');
      expect(aaplBars[0].low).toBe('182.790000');
      expect(aaplBars[0].close).toBe('184.530000');
      expect(aaplBars[0].volume).toBe(82488700);

      // Verify future dates do NOT exist in response
      const dates = aaplBars.map((b) => b.session_date);
      expect(dates).not.toContain('2024-01-03');
      expect(dates).not.toContain('2024-01-04');
      expect(dates).not.toContain('2024-01-05');
      expect(dates).not.toContain('2024-01-08');

      // Attempting to query future bounds explicitly with toSession > currentSession rejects with 422
      await expect(
        service.getMarketData(sim.id, 'AAPL', undefined, '2024-01-05')
      ).rejects.toThrowError(ApiError);

      try {
        await service.getMarketData(sim.id, 'AAPL', undefined, '2024-01-05');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(422);
        expect(apiErr.code).toBe('future_session_rejected');
      }

      // Advance to 2024-01-03: now exactly 2 bars are revealed
      await service.advanceSimulation(sim.id, 1);
      const aaplBarsAfterAdvance = await service.getMarketData(sim.id, 'AAPL');
      expect(aaplBarsAfterAdvance).toHaveLength(2);
      expect(aaplBarsAfterAdvance.map((b) => b.session_date)).toEqual(['2024-01-02', '2024-01-03']);
      expect(aaplBarsAfterAdvance.some((b) => b.session_date > '2024-01-03')).toBe(false);
    });

    it('validates price formatting conformance: 6 decimal places and whole cent multiples', () => {
      const symbols = ['AAPL', 'MSFT', 'SPY'];
      for (const sym of symbols) {
        const bars = RAW_MARKET_DATA[sym];
        expect(bars.length).toBe(5);
        for (const bar of bars) {
          expect(bar.session_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(bar.available_at).toMatch(/^\d{4}-\d{2}-\d{2}T21:00:00Z$/);
          expect(bar.open).toMatch(/^\d+\.\d{6}$/);
          expect(bar.high).toMatch(/^\d+\.\d{6}$/);
          expect(bar.low).toMatch(/^\d+\.\d{6}$/);
          expect(bar.close).toMatch(/^\d+\.\d{6}$/);
          expect(bar.volume).toBeGreaterThan(0);
          expect(Number.isInteger(bar.volume)).toBe(true);

          // Suffix ends in 0000 for whole cent multiples
          expect(bar.open.endsWith('0000')).toBe(true);
          expect(bar.high.endsWith('0000')).toBe(true);
          expect(bar.low.endsWith('0000')).toBe(true);
          expect(bar.close.endsWith('0000')).toBe(true);
        }
      }
    });
  });

  describe('4. Stale version (expected_version mismatch) throws 409 error', () => {
    it('throws 409 stale_version and leaves simulation state unmodified when expected_version is wrong', async () => {
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 100000000,
      });

      expect(sim.version).toBe(1);

      // Attempt advance with mismatched expected_version (e.g. 99)
      try {
        await service.advanceSimulation(sim.id, 99);
        expect.fail('Should have thrown 409 ApiError');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(409);
        expect(apiErr.code).toBe('stale_version');
        expect(apiErr.field).toBe('expected_version');
      }

      // Verify state was not mutated
      const unchanged = await service.getSimulation(sim.id);
      expect(unchanged.version).toBe(1);
      expect(unchanged.current_session).toBe('2024-01-02');
      expect(unchanged.status).toBe('active');

      // Attempt advance with expected_version off by 1 (e.g. 2 when current is 1)
      try {
        await service.advanceSimulation(sim.id, 2);
        expect.fail('Should have thrown 409 ApiError');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(409);
        expect(apiErr.code).toBe('stale_version');
      }
    });
  });

  describe('5. End-of-range completion marks simulation as completed and subsequent advance throws 409', () => {
    it('advances through entire session range, completes on 2024-01-08, and throws 409 on subsequent advance', async () => {
      const sim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-08',
        initial_cash: 100000000,
      });

      // Advance 1: 2024-01-02 -> 2024-01-03 (v2, active)
      const adv1 = await service.advanceSimulation(sim.id, 1);
      expect(adv1.simulation.current_session).toBe('2024-01-03');
      expect(adv1.simulation.version).toBe(2);
      expect(adv1.simulation.status).toBe('active');

      // Advance 2: 2024-01-03 -> 2024-01-04 (v3, active)
      const adv2 = await service.advanceSimulation(sim.id, 2);
      expect(adv2.simulation.current_session).toBe('2024-01-04');
      expect(adv2.simulation.version).toBe(3);
      expect(adv2.simulation.status).toBe('active');

      // Advance 3: 2024-01-04 -> 2024-01-05 (v4, active)
      const adv3 = await service.advanceSimulation(sim.id, 3);
      expect(adv3.simulation.current_session).toBe('2024-01-05');
      expect(adv3.simulation.version).toBe(4);
      expect(adv3.simulation.status).toBe('active');

      // Advance 4: 2024-01-05 -> 2024-01-08 (v5, COMPLETED)
      const adv4 = await service.advanceSimulation(sim.id, 4);
      expect(adv4.simulation.current_session).toBe('2024-01-08');
      expect(adv4.simulation.version).toBe(5);
      expect(adv4.simulation.status).toBe('completed');

      // Verify server record reflects completed status
      const completedSim = await service.getSimulation(sim.id);
      expect(completedSim.status).toBe('completed');
      expect(completedSim.version).toBe(5);

      // Advance 5: Subsequent advance MUST throw 409 error
      try {
        await service.advanceSimulation(sim.id, 5);
        expect.fail('Should have thrown 409 error on advance past completion');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(409);
        expect(apiErr.code).toBe('simulation_completed');
      }

      // Repeated attempts continue to return 409
      await expect(service.advanceSimulation(sim.id, 5)).rejects.toThrowError(ApiError);
    });

    it('completes early if simulation configured end_session is before dataset end', async () => {
      // Create simulation with end_session at 2024-01-03
      const customSim = await service.createSimulation({
        dataset_id: FIXTURE_DATASET_ID,
        start_session: '2024-01-02',
        end_session: '2024-01-03',
        initial_cash: 10000000,
      });

      // Advance 1 lands directly on end_session: should mark as completed
      const adv = await service.advanceSimulation(customSim.id, 1);
      expect(adv.simulation.current_session).toBe('2024-01-03');
      expect(adv.simulation.version).toBe(2);
      expect(adv.simulation.status).toBe('completed');

      // Subsequent advance throws 409
      await expect(service.advanceSimulation(customSim.id, 2)).rejects.toThrowError(ApiError);
    });
  });

  describe('Instruments and Dataset Metadata', () => {
    it('returns dataset metadata and instruments list', async () => {
      const datasets = await service.getDatasets();
      expect(datasets).toHaveLength(1);
      expect(datasets[0].id).toBe(FIXTURE_DATASET_ID);
      expect(datasets[0].synthetic).toBe(false);

      const instruments = await service.getInstruments(FIXTURE_DATASET_ID);
      expect(instruments).toHaveLength(3);
      expect(instruments.map((i) => i.symbol)).toEqual(['AAPL', 'MSFT', 'SPY']);
    });
  });
});

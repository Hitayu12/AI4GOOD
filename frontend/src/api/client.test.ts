import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiClient } from './client';
import { ApiError } from './types';

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient({ baseUrl: 'http://localhost:8000/api/v1', fixtureMode: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Fixture Mode', () => {
    it('returns contract mock health when fixture mode is active', async () => {
      client.setFixtureMode(true);
      const res = await client.getHealth();
      expect(res).toEqual({ status: 'ok' });
    });

    it('returns mock datasets when fixture mode is active', async () => {
      client.setFixtureMode(true);
      const res = await client.getDatasets();
      expect(res.items.length).toBeGreaterThan(0);
      expect(res.items[0].symbols).toContain('AAPL');
    });
  });

  describe('HTTP Requests & Normalized Errors', () => {
    it('successfully fetches and deserializes JSON response', async () => {
      const mockData = { status: 'ok' };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await client.getHealth();
      expect(res).toEqual(mockData);
    });

    it('extracts and throws normalized ApiError for 422 domain validation rejection', async () => {
      const errorPayload = {
        error: {
          code: 'insufficient_cash',
          message: 'Not enough virtual cash.',
          field: 'quantity',
        },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(errorPayload), {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      try {
        await client.createOrder('sim_1', {
          symbol: 'AAPL',
          side: 'buy',
          quantity: 1000,
          expected_version: 1,
        });
        expect.fail('Should have thrown an ApiError');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(422);
        expect(apiErr.code).toBe('insufficient_cash');
        expect(apiErr.message).toBe('Not enough virtual cash.');
        expect(apiErr.field).toBe('quantity');
      }
    });

    it('attaches Bearer token header when set', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
      );

      client.setToken('test-opaque-bearer-token');
      await client.getHealth();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const reqHeaders = fetchSpy.mock.calls[0][1]?.headers as Headers;
      expect(reqHeaders.get('Authorization')).toBe('Bearer test-opaque-bearer-token');
    });

    it('attaches Idempotency-Key header on mutating operations', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            simulation: { id: 'sim_1', version: 2 },
            order_results: [],
          }),
          { status: 200 }
        )
      );

      await client.advanceSimulation('sim_1', 1);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const reqHeaders = fetchSpy.mock.calls[0][1]?.headers as Headers;
      expect(reqHeaders.has('Idempotency-Key')).toBe(true);
      expect(reqHeaders.get('Idempotency-Key')).toBeTruthy();
    });
  });
});

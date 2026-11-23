import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchLiveQuote, fetchAllLiveQuotes, MODERN_BASELINE_PRICES } from './yahooFinanceService';

describe('yahooFinanceService — Real-Time Market Data Feed', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. fetches live quote structure correctly with modern baseline fallback', async () => {
    const quote = await fetchLiveQuote('AAPL');
    expect(quote.symbol).toBe('AAPL');
    expect(quote.price).toBeGreaterThan(0);
    expect(quote.previousClose).toBeGreaterThan(0);
    expect(typeof quote.change).toBe('number');
    expect(typeof quote.changePercent).toBe('number');
    expect(quote.dayHigh).toBeGreaterThanOrEqual(quote.price);
    expect(quote.dayLow).toBeLessThanOrEqual(quote.price);
    expect(quote.bid).toBeLessThanOrEqual(quote.ask);
    expect(quote.isMarketOpen).toBe(true);
  });

  it('2. successfully parses mock Yahoo Finance API response', async () => {
    const mockApiResponse = {
      chart: {
        result: [
          {
            meta: {
              symbol: 'NVDA',
              longName: 'NVIDIA Corporation',
              regularMarketPrice: 145.25,
              chartPreviousClose: 140.0,
              regularMarketDayHigh: 146.0,
              regularMarketDayLow: 139.5,
              regularMarketVolume: 50000000,
              regularMarketTime: 1731441600,
            },
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const quote = await fetchLiveQuote('NVDA');
    expect(quote.symbol).toBe('NVDA');
    expect(quote.price).toBe(145.25);
    expect(quote.previousClose).toBe(140.0);
    expect(quote.change).toBe(5.25);
    expect(quote.changePercent).toBe(3.75);
    expect(quote.source).toBe('yahoo-live');
  });

  it('3. falls back gracefully when API returns 429 / error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    } as Response);

    const quote = await fetchLiveQuote('TSLA');
    expect(quote.symbol).toBe('TSLA');
    expect(quote.price).toBe(MODERN_BASELINE_PRICES.TSLA.price);
    expect(quote.source).toBe('cache-fallback');
  });

  it('4. fetchAllLiveQuotes aggregates quotes for multiple symbols', async () => {
    const symbols = ['AAPL', 'MSFT', 'SPY'];
    const quotes = await fetchAllLiveQuotes(symbols);
    expect(Object.keys(quotes)).toHaveLength(3);
    expect(quotes.AAPL).toBeDefined();
    expect(quotes.MSFT).toBeDefined();
    expect(quotes.SPY).toBeDefined();
    expect(quotes.SPY.price).toBeGreaterThan(500);
  });
});

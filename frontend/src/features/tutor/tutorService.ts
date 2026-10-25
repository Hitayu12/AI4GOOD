/**
 * Rutgers AI4Good 2026 — AI Tutor Service
 * Phase 8 Client Validation, Curriculum Lookup & Provider Bridge
 */

import { TutorMessageRequest, TutorMessageResponse } from '../../api/types';
import { ApiClient, defaultApiClient } from '../../api/client';
import { TutorQuickPrompt, TutorValidationResult } from './tutorTypes';

export const MAX_TUTOR_MESSAGE_LENGTH = 2000;

export const QUICK_PROMPTS: TutorQuickPrompt[] = [
  {
    id: 'compound-interest',
    label: 'Compound Interest',
    prompt: 'How does compound interest work, and how does the monthly savings calculator apply it?',
    topic: 'Calculators',
  },
  {
    id: 'etf-vs-stock',
    label: 'ETF vs Single Stock',
    prompt: 'What is the structural difference between buying an ETF like SPY versus buying an individual stock like AAPL?',
    topic: 'Equities',
  },
  {
    id: 'hysa-vs-cd',
    label: 'HYSA vs CD',
    prompt: 'When should a saver choose a High-Yield Savings Account over a Certificate of Deposit?',
    topic: 'Cash Equivalents',
  },
  {
    id: 'order-execution',
    label: 'Next-Session Execution',
    prompt: 'Why does my paper trading order fill at the next session open price instead of immediately?',
    topic: 'Simulation Mechanics',
  },
  {
    id: 'cost-basis',
    label: 'Weighted-Average Cost Basis',
    prompt: 'How is weighted-average cost basis calculated when selling only part of an existing position?',
    topic: 'Portfolio Accounting',
  },
];

/**
 * Validates tutor message string according to contract bounds.
 */
export function validateTutorMessage(rawMessage: string): TutorValidationResult {
  const trimmed = rawMessage.trim();

  if (trimmed.length === 0) {
    return {
      valid: false,
      error: 'Message cannot be empty.',
    };
  }

  if (trimmed.length > MAX_TUTOR_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message exceeds the 2,000 character limit (currently ${trimmed.length} characters).`,
    };
  }

  return {
    valid: true,
    sanitizedMessage: trimmed,
  };
}

/**
 * Checks for prompt patterns requesting personal trade advice or price predictions.
 */
export function isUnsafeFinancialAdvicePrompt(query: string): boolean {
  const lower = query.toLowerCase();
  const patterns = [
    /should i (buy|sell|short)\b/,
    /what stock (should i|to) buy\b/,
    /predict the price\b/,
    /will (aapl|msft|spy|\w+) go up\b/,
    /guaranteed (profit|return)\b/,
    /execute (a|this) trade for me\b/,
  ];
  return patterns.some((p) => p.test(lower));
}

/**
 * Deterministic offline concept catalog for curriculum mode (0 LLM calls).
 */
export const DETERMINISTIC_CURRICULUM_CATALOG: Record<
  string,
  { reply: string; source_links: string[] }
> = {
  compound: {
    reply:
      'Compound interest represents interest earned on both initial principal and previously accumulated interest. In our savings calculator, monthly interest is computed using the effective annual rate formula i = (1 + r)^(1/12) - 1, with contributions credited at the end of each monthly period.',
    source_links: [
      'https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator',
      'https://www.sec.gov/oiea/investor-alerts-bulletins/ib_compoundinterest.html',
    ],
  },
  etf: {
    reply:
      'An Exchange-Traded Fund (ETF) pools investor capital to hold a diversified portfolio of securities (e.g., the S&P 500 index via SPY) and trades intraday on stock exchanges. Individual stocks represent equity ownership in a single corporation with company-specific risk.',
    source_links: [
      'https://www.investor.gov/introduction-investing/investing-basics/investment-products/mutual-funds-and-exchange-traded-1',
      'https://www.sec.gov/investor/alerts/etfs.pdf',
    ],
  },
  cd: {
    reply:
      'A Certificate of Deposit (CD) is a time deposit offered by banks that pays a fixed interest rate in exchange for locking up funds until a specified maturity date, subject to early withdrawal penalties.',
    source_links: [
      'https://www.investor.gov/introduction-investing/investing-basics/investment-products/certificates-deposit-cds',
      'https://www.fdic.gov/resources/deposit-insurance/financial-products-insured/',
    ],
  },
  hysa: {
    reply:
      'A High-Yield Savings Account (HYSA) offers significantly higher interest rates than traditional savings accounts while maintaining liquidity and FDIC/NCUA insurance up to $250,000 per depositor per institution.',
    source_links: [
      'https://www.fdic.gov/resources/deposit-insurance/faq/',
      'https://www.investor.gov/introduction-investing/investing-basics/save-and-invest',
    ],
  },
  options: {
    reply:
      'Options are derivative contracts giving the buyer the right, but not the obligation, to buy (Call) or sell (Put) an underlying asset at an agreed strike price on or before an expiration date. In this curriculum, options are studied strictly for educational understanding; live trading is not permitted in MVP.',
    source_links: [
      'https://www.investor.gov/introduction-investing/investing-basics/investment-products/options',
      'https://www.sec.gov/oiea/investor-alerts-and-bulletins/investor-bulletin-opening-options-account',
    ],
  },
  execution: {
    reply:
      'In our historical simulation, orders submitted after session close are placed in pending status and fill at the next session OPEN price. This realistically models overnight market risk and price gaps between sessions.',
    source_links: [
      'https://www.investor.gov/introduction-investing/investing-basics/how-stock-market-works/market-orders',
      'https://www.sec.gov/fast-answers/answersmktorderhtm.html',
    ],
  },
  basis: {
    reply:
      'Weighted-average cost basis sums the total dollar purchase costs divided by total shares held. When shares are partially sold, the proportional cost basis is allocated to realized P&L; the remainder is allocated on the final sale to prevent rounding drift.',
    source_links: [
      'https://www.irs.gov/publications/p550',
      'https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-5',
    ],
  },
};

/**
 * Matches a query against the deterministic curriculum catalog.
 */
export function lookupCurriculumConcept(query: string): { reply: string; source_links: string[] } {
  const lower = query.toLowerCase();

  if (isUnsafeFinancialAdvicePrompt(query)) {
    return {
      reply:
        'Notice: As an educational platform, the AI Tutor does not provide personalized investment advice, stock recommendations, or price forecasts. All trading decisions in the historical simulation should be based on your research and risk tolerance.',
      source_links: ['https://www.investor.gov/introduction-investing/investing-basics'],
    };
  }

  for (const [key, entry] of Object.entries(DETERMINISTIC_CURRICULUM_CATALOG)) {
    if (lower.includes(key)) {
      return entry;
    }
  }

  // Default educational overview if no keyword matched
  return {
    reply:
      'The educational curriculum covers foundational financial instruments including Certificates of Deposit (CDs), High-Yield Savings Accounts (HYSAs), Equities, ETFs, Options fundamentals, and portfolio accounting principles. Ask about any specific concept to learn more.',
    source_links: [
      'https://www.investor.gov/introduction-investing/investing-basics',
      'https://www.sec.gov/investor',
    ],
  };
}

/**
 * Dispatches message to the API client boundary.
 */
export async function sendTutorQuery(
  rawMessage: string,
  simulationId?: string,
  client: ApiClient = defaultApiClient
): Promise<TutorMessageResponse> {
  const validation = validateTutorMessage(rawMessage);
  if (!validation.valid || !validation.sanitizedMessage) {
    throw new Error(validation.error || 'Invalid message');
  }

  const payload: TutorMessageRequest = {
    message: validation.sanitizedMessage,
    simulation_id: simulationId || undefined,
  };

  return client.sendTutorMessage(payload);
}

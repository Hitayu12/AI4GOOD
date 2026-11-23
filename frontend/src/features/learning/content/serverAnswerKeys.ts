/**
 * Rutgers AI4Good 2026 — Server-Side Quiz Answer Keys & Explanations
 *
 * ARCHITECTURAL BOUNDARY & SECURITY NOTICE:
 * This module contains confidential scoring keys and pedagogical explanations.
 * It is designated for:
 * 1. Reference and ingestion by Siddh Jain (Backend Phase 8) for FastAPI server scoring.
 * 2. Deterministic local fixture simulation and automated scoring test harnesses.
 *
 * PRODUCTION EXCLUSION:
 * This module MUST NOT be bundled into client-facing production browser distributions.
 * The public client bundle must consume only `quizDefinitions.ts` (public schemas).
 */

export interface QuizScoringData {
  answerKey: Record<string, string>;
  explanations: Record<string, string>;
}

export const SERVER_ANSWER_KEYS: Record<string, QuizScoringData> = {
  'quiz-cd-basics': {
    answerKey: {
      q1: 'opt_b',
      q2: 'opt_a',
      q3: 'opt_c',
      q4: 'opt_d',
    },
    explanations: {
      q1: 'A Certificate of Deposit (CD) is a promissory time deposit issued by a bank or credit union. The saver commits a fixed principal sum for an agreed duration (term) in return for a locked, guaranteed Annual Percentage Yield (APY).',
      q2: 'Standard CDs at FDIC-insured depository institutions are backed by the full faith and credit of the U.S. government up to $250,000 per depositor, per insured institution, for each qualifying account ownership category (with identical coverage provided by NCUA for credit unions).',
      q3: 'Because a CD relies on committed capital for the entire term, premature liquidations trigger an Early Withdrawal Penalty (EWP). This penalty commonly equals several months of earned interest, directly reducing the account yield.',
      q4: 'Fixed-rate CDs expose investors to interest rate and inflation risks. If market rates or inflation surge after locking in your CD, your locked yield remains static, causing your purchasing power to lag behind current market opportunities.',
    },
  },

  'quiz-hysa-basics': {
    answerKey: {
      q1: 'opt_b',
      q2: 'opt_a',
      q3: 'opt_d',
      q4: 'opt_c',
    },
    explanations: {
      q1: 'Online banks and digital subsidiaries operate without the immense overhead of physical retail branches, expansive real estate, and localized branch staff. These structural efficiencies are passed to depositors in the form of significantly higher APYs.',
      q2: 'Unlike fixed CDs, HYSA interest rates are variable and fluctuate dynamically. When the Federal Reserve adjusts the federal funds benchmark rate, banks raise or lower their deposit yields in response to prevailing monetary policy.',
      q3: 'An emergency fund demands two non-negotiable qualities: instant liquidity (fast withdrawal without early termination penalties) and capital safety (FDIC/NCUA insurance protecting principal up to $250,000). HYSAs provide both alongside competitive compound interest.',
      q4: 'Real return is calculated as nominal return minus inflation (4.25% - 6.00% = -1.75%). Even though nominal dollar balances grow, purchasing power diminishes because the prices of consumer goods and services are climbing faster than the interest earned.',
    },
  },

  'quiz-stock-basics': {
    answerKey: {
      q1: 'opt_d',
      q2: 'opt_a',
      q3: 'opt_b',
      q4: 'opt_c',
    },
    explanations: {
      q1: 'Common stock represents direct fractional equity ownership in a public corporation. Shareholders hold a proportionate claim on corporate assets and residual profits, as well as voting rights on key governance matters.',
      q2: 'FDIC protects depositors against commercial bank failures. SIPC protects against the financial collapse, insolvency, or fraud of a registered brokerage firm (up to $500,000 including $250,000 for cash). Crucially, SIPC does NOT protect against stock market volatility or investment decline.',
      q3: 'Equity investors profit through capital appreciation (selling shares for more than the purchase price as the business expands) and cash dividends (periodic distributions of corporate profits). In this platform\'s educational simulator, trading focuses on whole-share capital appreciation.',
      q4: 'Holding an undiversified position in a single corporation exposes an investor to company-specific (idiosyncratic) risks such as management failures, competitive disruption, or insolvency. Diversifying across many companies mitigates these single-point risks.',
    },
  },

  'quiz-etf-basics': {
    answerKey: {
      q1: 'opt_a',
      q2: 'opt_b',
      q3: 'opt_c',
      q4: 'opt_d',
    },
    explanations: {
      q1: 'An Exchange-Traded Fund (ETF) is a pooled investment security holding a portfolio of assets (like stocks or bonds) that trades continuously on public stock exchanges throughout the trading day at market prices.',
      q2: 'Traditional open-end mutual funds execute transactions only once per day after market close (4:00 PM ET) based on that day\'s Net Asset Value (NAV). In contrast, ETFs trade continuously during regular exchange hours with live, fluctuating bid and ask prices.',
      q3: 'The expense ratio is the annual fee deducted continuously from the fund\'s total assets to cover investment management, administration, and compliance. Because it is subtracted from fund NAV, investors never receive a direct fee bill.',
      q4: 'A broad-market index ETF (such as an S&P 500 fund) distributes your investment across hundreds of companies across diverse sectors. While overall market volatility remains, idiosyncratic failure risk of any single firm is effectively minimized.',
    },
  },

  'quiz-options-intro': {
    answerKey: {
      q1: 'opt_b',
      q2: 'opt_a',
      q3: 'opt_c',
      q4: 'opt_d',
    },
    explanations: {
      q1: 'A Call option gives the buyer the contractual right—without any obligation—to purchase 100 shares of the underlying equity at a fixed strike price on or before the contract\'s expiration date.',
      q2: 'When you purchase a long Call or Put option, the maximum possible capital loss is capped at 100% of the initial premium paid to acquire the contract. (In stark contrast, writing or selling naked options can expose traders to severe or theoretically unlimited losses).',
      q3: 'Options are wasting assets governed by time decay (Theta). As calendar days pass and expiration draws nearer, the extrinsic time value of the option contract naturally erodes, accelerating rapidly during the final 30 days before expiration.',
      q4: 'Options involve high financial leverage, rapid time decay, volatility sensitivity (the Greeks), and substantial risk of total capital loss. To establish sound financial literacy, this platform\'s MVP simulator focuses strictly on cash-funded, long-only stocks and ETFs without derivative execution.',
    },
  },
};

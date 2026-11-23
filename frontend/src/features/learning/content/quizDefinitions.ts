import { Quiz } from '../../../api/types';

/**
 * Rutgers AI4Good 2026 — Public Quiz Definitions
 * Public question schema definitions delivered to the frontend client.
 *
 * SECURITY & ARCHITECTURAL INVARIANT:
 * This file contains strictly PUBLIC question schemas and options.
 * It contains NO answer keys, correct-answer flags, or scoring hints.
 * Evaluation is handled server-side via POST /api/v1/quizzes/{id}/attempts.
 */

export const QUIZZES: Record<string, Quiz> = {
  'quiz-cd-basics': {
    id: 'quiz-cd-basics',
    version: 1,
    lesson_id: 'cd-basics',
    questions: [
      {
        id: 'q1',
        prompt: 'What is a Certificate of Deposit (CD) and how does it fundamentally work?',
        options: [
          {
            id: 'opt_a',
            text: 'A certificate of stock ownership in a commercial bank that pays quarterly dividends.',
          },
          {
            id: 'opt_b',
            text: 'A time deposit account that holds a fixed sum of money for a specified term in exchange for a guaranteed interest rate.',
          },
          {
            id: 'opt_c',
            text: 'An uncollateralized loan made by a consumer to an investment fund that fluctuates with market indices.',
          },
          {
            id: 'opt_d',
            text: 'A revolving line of credit that permits cash withdrawals up to an approved borrowing limit.',
          },
        ],
      },
      {
        id: 'q2',
        prompt: 'What federal insurance protects consumer deposits in standard CDs at an FDIC-member bank?',
        options: [
          {
            id: 'opt_a',
            text: 'Deposits are insured up to $250,000 per depositor, per insured institution, for each qualifying account ownership category.',
          },
          {
            id: 'opt_b',
            text: 'Deposits are protected against market volatility up to $1,000,000 under the Securities Investor Protection Act.',
          },
          {
            id: 'opt_c',
            text: 'There is no federal insurance protection for CDs because they are classified as investment securities.',
          },
          {
            id: 'opt_d',
            text: 'Deposits are insured only if the account holder maintains an active checking account with the Federal Reserve.',
          },
        ],
      },
      {
        id: 'q3',
        prompt: 'What is the typical consequence if a saver withdraws money from a standard CD before its scheduled maturity date?',
        options: [
          {
            id: 'opt_a',
            text: 'The bank automatically seizes the entire initial deposit balance.',
          },
          {
            id: 'opt_b',
            text: 'The saver must pay a mandatory criminal fine to the Consumer Financial Protection Bureau.',
          },
          {
            id: 'opt_c',
            text: 'The depositor is assessed an early withdrawal penalty, which typically forfeits a portion of the accrued interest.',
          },
          {
            id: 'opt_d',
            text: 'The account interest rate automatically doubles to encourage reinvestment.',
          },
        ],
      },
      {
        id: 'q4',
        prompt: 'Which economic scenario presents a key risk or disadvantage for an investor holding a long-term fixed-rate CD?',
        options: [
          {
            id: 'opt_a',
            text: 'A general decrease in market interest rates and consumer prices.',
          },
          {
            id: 'opt_b',
            text: 'An expansion of FDIC deposit insurance coverage limits by federal regulators.',
          },
          {
            id: 'opt_c',
            text: 'A reduction in the bank\'s operational branches and ATM network.',
          },
          {
            id: 'opt_d',
            text: 'A sharp increase in prevailing market interest rates and inflation, leaving the CD\'s locked return below newer yields.',
          },
        ],
      },
    ],
  },

  'quiz-hysa-basics': {
    id: 'quiz-hysa-basics',
    version: 1,
    lesson_id: 'hysa-basics',
    questions: [
      {
        id: 'q1',
        prompt: 'Why are High-Yield Savings Accounts (HYSAs) typically able to offer significantly higher APYs than traditional brick-and-mortar savings accounts?',
        options: [
          {
            id: 'opt_a',
            text: 'They invest all depositor cash into speculative growth stocks and cryptocurrency.',
          },
          {
            id: 'opt_b',
            text: 'They are predominantly offered by online institutions that operate with lower physical branch overhead and pass savings to customers.',
          },
          {
            id: 'opt_c',
            text: 'They charge depositors a mandatory 15% exit tax on every transfer.',
          },
          {
            id: 'opt_d',
            text: 'They are exempt from FDIC and federal banking reserve regulations.',
          },
        ],
      },
      {
        id: 'q2',
        prompt: 'How does interest rate variability work on a standard High-Yield Savings Account?',
        options: [
          {
            id: 'opt_a',
            text: 'The interest rate is variable, meaning the bank may raise or lower the APY at any time based on benchmark rates and market conditions.',
          },
          {
            id: 'opt_b',
            text: 'The interest rate is locked for a guaranteed 5-year period upon account opening.',
          },
          {
            id: 'opt_c',
            text: 'The interest rate is tied to the price of gold and changes every second on international commodities exchanges.',
          },
          {
            id: 'opt_d',
            text: 'The interest rate can only increase and is legally prohibited from ever decreasing.',
          },
        ],
      },
      {
        id: 'q3',
        prompt: 'Why is an HYSA widely considered an ideal vehicle for a personal emergency fund?',
        options: [
          {
            id: 'opt_a',
            text: 'It guarantees double-digit returns regardless of market conditions.',
          },
          {
            id: 'opt_b',
            text: 'It completely eliminates all state and federal income tax obligations on interest income.',
          },
          {
            id: 'opt_c',
            text: 'It locks money away so the saver cannot access it under any circumstances for five years.',
          },
          {
            id: 'opt_d',
            text: 'It combines high liquidity and capital preservation backed by FDIC insurance with a competitive return on cash.',
          },
        ],
      },
      {
        id: 'q4',
        prompt: 'If an HYSA yields 4.25% APY while inflation is running at 6.00% annually, what happens to the saver\'s purchasing power?',
        options: [
          {
            id: 'opt_a',
            text: 'Purchasing power increases because 4.25% nominal interest is earned.',
          },
          {
            id: 'opt_b',
            text: 'The purchasing power remains identical because FDIC insurance compensates for price inflation.',
          },
          {
            id: 'opt_c',
            text: 'Purchasing power decreases because the real rate of return is negative (-1.75%), meaning prices rise faster than the interest earned.',
          },
          {
            id: 'opt_d',
            text: 'The bank automatically issues bonus shares of stock to offset inflation.',
          },
        ],
      },
    ],
  },

  'quiz-stock-basics': {
    id: 'quiz-stock-basics',
    version: 1,
    lesson_id: 'stock-basics',
    questions: [
      {
        id: 'q1',
        prompt: 'What fundamental asset do you own when you purchase shares of common stock in a public corporation?',
        options: [
          {
            id: 'opt_a',
            text: 'A guaranteed promissory note issued by the U.S. Department of the Treasury.',
          },
          {
            id: 'opt_b',
            text: 'A contractual right to an annual fixed interest payment prior to company taxes.',
          },
          {
            id: 'opt_c',
            text: 'An insurance policy that protects the company\'s bondholders from insolvency.',
          },
          {
            id: 'opt_d',
            text: 'A fractional equity ownership stake in the corporation, representing a claim on its assets and potential earnings.',
          },
        ],
      },
      {
        id: 'q2',
        prompt: 'What is the primary difference between how FDIC insurance and SIPC coverage protect investors?',
        options: [
          {
            id: 'opt_a',
            text: 'FDIC protects bank deposits from bank failures; SIPC protects custody of cash and securities if a brokerage fails, but never covers stock market losses.',
          },
          {
            id: 'opt_b',
            text: 'SIPC reimburses investors for all capital losses incurred during stock market downturns.',
          },
          {
            id: 'opt_c',
            text: 'FDIC covers public equities traded on the NYSE, while SIPC covers checking and savings deposits.',
          },
          {
            id: 'opt_d',
            text: 'Neither agency exists; both are private commercial warranty plans.',
          },
        ],
      },
      {
        id: 'q3',
        prompt: 'What are the two primary ways equity investors realize financial returns from holding common stock?',
        options: [
          {
            id: 'opt_a',
            text: 'Early withdrawal penalties and guaranteed interest coupons.',
          },
          {
            id: 'opt_b',
            text: 'Capital appreciation (selling shares at a higher price than purchased) and dividend distributions.',
          },
          {
            id: 'opt_c',
            text: 'Federal tax credits and synthetic interest rebates.',
          },
          {
            id: 'opt_d',
            text: 'Exchange fees and broker commission splits.',
          },
        ],
      },
      {
        id: 'q4',
        prompt: 'Why is concentrating an entire investment portfolio into a single company\'s stock generally considered high risk?',
        options: [
          {
            id: 'opt_a',
            text: 'Single-stock trades can only be placed once per calendar quarter.',
          },
          {
            id: 'opt_b',
            text: 'Brokerages charge higher tax rates on individual stock gains than on mutual funds.',
          },
          {
            id: 'opt_c',
            text: 'The investor is fully exposed to company-specific (idiosyncratic) risks such as mismanagement, competitive obsolescence, or bankruptcy without diversification.',
          },
          {
            id: 'opt_d',
            text: 'Single stocks cannot be sold unless the original founder provides written approval.',
          },
        ],
      },
    ],
  },

  'quiz-etf-basics': {
    id: 'quiz-etf-basics',
    version: 1,
    lesson_id: 'etf-basics',
    questions: [
      {
        id: 'q1',
        prompt: 'What is an Exchange-Traded Fund (ETF) and how does it trade?',
        options: [
          {
            id: 'opt_a',
            text: 'A pooled investment fund holding a basket of assets that trades throughout the day on public stock exchanges at market-determined prices.',
          },
          {
            id: 'opt_b',
            text: 'A municipal savings bond that trades strictly between commercial banks over the counter.',
          },
          {
            id: 'opt_c',
            text: 'A private equity contract that can only be purchased by accredited institutional investors.',
          },
          {
            id: 'opt_d',
            text: 'A bank deposit account that guarantees fixed interest payments on the first of every month.',
          },
        ],
      },
      {
        id: 'q2',
        prompt: 'What is a major structural difference between an ETF and a traditional open-end mutual fund?',
        options: [
          {
            id: 'opt_a',
            text: 'ETFs are only available to corporate officers, whereas mutual funds are public.',
          },
          {
            id: 'opt_b',
            text: 'ETFs can be bought and sold intraday at fluctuating market prices, whereas traditional mutual funds execute once daily after market close at Net Asset Value (NAV).',
          },
          {
            id: 'opt_c',
            text: 'Mutual funds are traded continuously on NASDAQ, while ETFs settle only on the last day of each month.',
          },
          {
            id: 'opt_d',
            text: 'ETFs do not own any underlying financial securities.',
          },
        ],
      },
      {
        id: 'q3',
        prompt: 'What is an ETF\'s "expense ratio" and how is it paid by shareholders?',
        options: [
          {
            id: 'opt_a',
            text: 'A separate monthly invoice billed directly to the investor\'s checking account.',
          },
          {
            id: 'opt_b',
            text: 'A sales commission charged by your brokerage each time you submit an order.',
          },
          {
            id: 'opt_c',
            text: 'An annual operating fee expressed as a percentage of fund assets, deducted directly and continuously from the fund\'s net asset value.',
          },
          {
            id: 'opt_d',
            text: 'A penalty levied by the SEC on investors who hold the fund for less than one year.',
          },
        ],
      },
      {
        id: 'q4',
        prompt: 'How does purchasing an ETF tracking a broad market index like the S&P 500 improve an investor\'s risk profile?',
        options: [
          {
            id: 'opt_a',
            text: 'It guarantees that the investment will never lose money during a bear market.',
          },
          {
            id: 'opt_b',
            text: 'It eliminates broad macroeconomic market downturns and recessions.',
          },
          {
            id: 'opt_c',
            text: 'It converts all equity holdings into FDIC-insured cash equivalents.',
          },
          {
            id: 'opt_d',
            text: 'It provides instant diversification across hundreds of companies, drastically reducing single-company default risk.',
          },
        ],
      },
    ],
  },

  'quiz-options-intro': {
    id: 'quiz-options-intro',
    version: 1,
    lesson_id: 'options-intro',
    questions: [
      {
        id: 'q1',
        prompt: 'What is an equity Call option and what right does it grant to the buyer?',
        options: [
          {
            id: 'opt_a',
            text: 'A legal obligation requiring the holder to sell 100 shares of stock at the market low.',
          },
          {
            id: 'opt_b',
            text: 'A contract giving the holder the right, but not the obligation, to buy 100 shares of the underlying stock at a specified strike price prior to expiration.',
          },
          {
            id: 'opt_c',
            text: 'A fixed corporate bond that pays 10% coupon interest annually.',
          },
          {
            id: 'opt_d',
            text: 'A mutual agreement to split trading fees with an exchange floor specialist.',
          },
        ],
      },
      {
        id: 'q2',
        prompt: 'What is the maximum potential financial loss for an investor who purchases a long Call or long Put option?',
        options: [
          {
            id: 'opt_a',
            text: 'The total premium (cost) paid upfront to purchase the option contract.',
          },
          {
            id: 'opt_b',
            text: 'An unlimited financial loss if the underlying stock becomes volatile.',
          },
          {
            id: 'opt_c',
            text: '100 shares of the underlying company\'s physical stock.',
          },
          {
            id: 'opt_d',
            text: 'Zero, because all exchange-traded options are guaranteed by SIPC against losses.',
          },
        ],
      },
      {
        id: 'q3',
        prompt: 'In options trading, what does "time decay" (Theta) represent?',
        options: [
          {
            id: 'opt_a',
            text: 'The gradual reduction in brokerage commission fees as a contract gets older.',
          },
          {
            id: 'opt_b',
            text: 'The daily increase in option value caused solely by the passage of time.',
          },
          {
            id: 'opt_c',
            text: 'The natural erosion of an option\'s extrinsic value over time as the contract approaches its expiration date.',
          },
          {
            id: 'opt_d',
            text: 'The statutory requirement that all stock dividends be settled within 30 business days.',
          },
        ],
      },
      {
        id: 'q4',
        prompt: 'Why is options trading restricted to educational concepts only and strictly excluded from trade execution in this platform\'s MVP?',
        options: [
          {
            id: 'opt_a',
            text: 'Federal securities laws prohibit universities from teaching derivatives concepts to students.',
          },
          {
            id: 'opt_b',
            text: 'Options can only be traded using physical paperwork submitted directly to the Options Clearing Corporation.',
          },
          {
            id: 'opt_c',
            text: 'Options contracts are identical to standard savings accounts and provide no differentiated learning value.',
          },
          {
            id: 'opt_d',
            text: 'Options involve high leverage, rapid time decay, complex Greek sensitivities, and high risk of total loss, making them unsuitable for beginner cash-trading simulations.',
          },
        ],
      },
    ],
  },
};

/**
 * Rutgers AI4Good 2026 — Market Strategies Knowledge Base
 * Comparative traditional trading strategies: American (US) vs. European (EU/UK) Markets.
 * Focus: Traditional Long-Only Trading, Zero-Risk Paper Principles (No Derivatives/Options).
 */

export interface MarketTactics {
  region: 'US' | 'EU';
  regionName: string;
  flag: string;
  instrumentName: string;
  strategyName: string;
  tagline: string;
  howItWorks: string[];
  tacticalRules: string[];
  regulatorySafety: string;
  taxOrCostEdge: string;
  recommendedTickersOrTools: string[];
}

export interface TopicStrategy {
  topicId: string;
  topicTitle: string;
  category: 'Cash & Savings' | 'Equities & ETFs';
  usTactics: MarketTactics;
  euTactics: MarketTactics;
  headToHeadDifferences: {
    feature: string;
    usMarket: string;
    euMarket: string;
    winnerOrTakeaway: string;
  }[];
  interactiveChallenge: {
    question: string;
    context: string;
    options: {
      id: string;
      label: string;
      isBest: boolean;
      explanation: string;
    }[];
  };
}

export const MARKET_STRATEGIES: Record<string, TopicStrategy> = {
  'cd-basics': {
    topicId: 'cd-basics',
    topicTitle: 'Certificates of Deposit (CDs) vs. Fixed-Term Deposits',
    category: 'Cash & Savings',
    usTactics: {
      region: 'US',
      regionName: 'United States',
      flag: '🇺🇸',
      instrumentName: 'Certificate of Deposit (CD)',
      strategyName: 'The 4-Quarter Rolling CD Ladder',
      tagline: 'Lock in Federal Reserve cycle peaks while maintaining quarterly liquidity',
      howItWorks: [
        'Divide your dedicated cash into 4 equal tranches (e.g., $2,500 each for a $10,000 total deposit).',
        'Open 4 simultaneous CDs with staggered maturities: 3 months, 6 months, 9 months, and 12 months.',
        'When the 3-month CD matures, re-roll the principal and interest into a new 12-month CD at current market rates.',
        'Repeat every quarter: after month 9, every CD in your portfolio earns the higher 1-year APY while 25% of your cash frees up every 90 days.',
      ],
      tacticalRules: [
        'Use Brokered CDs via low-cost brokerages (Schwab, Fidelity) to shop top national rates across dozens of banks without opening new checking accounts.',
        'Avoid breaking CDs early: standard US bank penalties forfeit 90 to 180 days of accrued interest.',
        'Match maturities to known calendar commitments (tuition deadlines, tax payments, property down payments).',
      ],
      regulatorySafety: 'FDIC & NCUA backed up to $250,000 per depositor, per insured institution.',
      taxOrCostEdge: 'Interest is taxed annually as ordinary income. Consider state-tax-exempt Treasury Bills as a CD alternative if you live in high-tax states (NJ, NY, CA).',
      recommendedTickersOrTools: ['National Banks & Credit Unions', 'Brokered CD Market', 'TreasuryDirect (for T-Bill ladders)'],
    },
    euTactics: {
      region: 'EU',
      regionName: 'European Union & UK',
      flag: '🇪🇺',
      instrumentName: 'Fixed-Term Deposit (Festgeld / Compte à terme)',
      strategyName: 'Pan-European Cross-Border Deposit Arbitrage',
      tagline: 'Leverage the EU single-market banking passport to capture top European Central Bank (ECB) pass-through yields',
      howItWorks: [
        'Under EU Single Market directives, European citizens can deposit funds in insured banks across any EU member nation.',
        'Utilize multi-bank cross-border platforms (such as Raisin / WeltSparen) to compare term deposits across Germany, France, Italy, and Scandinavia.',
        'Stagger fixed-term contracts across 6, 12, and 24-month terms in AAA or AA credit-rated sovereign nations.',
        'Deposits remain denominated in Euros (€), completely eliminating currency exchange fees and volatility.',
      ],
      tacticalRules: [
        'Ensure the foreign bank provides automated local withholding tax relief (Freistellungsauftrag or Tax Exemption Certificate).',
        'European banks are typically stricter on term breaks than US banks: many completely disallow early withdrawals unless hardship is proven.',
        'Keep total deposits per individual bank strictly below €100,000 to guarantee 100% government insurance coverage.',
      ],
      regulatorySafety: 'EU Deposit Guarantee Schemes (DGS) harmonize protection up to €100,000 per depositor per bank across all 27 member states (FSCS £85,000 in the UK).',
      taxOrCostEdge: 'Many EU countries apply a flat withholding tax on interest (e.g. German Abgeltungsteuer 25% + solidarity surcharge). Use local tax allowances (€1,000/yr in Germany).',
      recommendedTickersOrTools: ['Raisin / WeltSparen', 'National Savings & Investments (NS&I - UK)', 'Top Tier EU Retail Banks'],
    },
    headToHeadDifferences: [
      {
        feature: 'Deposit Protection Limit',
        usMarket: '$250,000 USD (FDIC / NCUA)',
        euMarket: '€100,000 EUR (EU DGS) / £85,000 GBP (UK FSCS)',
        winnerOrTakeaway: 'US offers a higher nominal dollar ceiling per bank ($250k vs ~€100k).',
      },
      {
        feature: 'Early Withdrawal Flexibility',
        usMarket: 'Usually permitted with penalty (e.g. 90-180 days interest)',
        euMarket: 'Frequently locked with zero early exit allowed',
        winnerOrTakeaway: 'US CDs offer better emergency exit rights, though penalties still apply.',
      },
      {
        feature: 'Cross-Border Shopping',
        usMarket: 'Brokered CDs through a single brokerage account',
        euMarket: 'Fintech deposit platforms (Raisin) across 27 EU nations',
        winnerOrTakeaway: 'Both markets now offer frictionless multi-bank shopping without paperwork.',
      },
    ],
    interactiveChallenge: {
      question: 'Which CD / Term Deposit strategy best balances yield and emergency access for a student saver?',
      context: 'You have $4,000 saved for tuition due in 9 months, but might need $1,000 for car or laptop repairs before then.',
      options: [
        {
          id: 'opt_1',
          label: 'Lock all $4,000 into a 5-year CD for the maximum available advertised rate.',
          isBest: false,
          explanation: 'Incorrect. If you need cash before year 5, you face heavy early withdrawal penalties that can even erode your principal.',
        },
        {
          id: 'opt_2',
          label: 'Create a ladder: Keep $1,000 in a liquid HYSA/easy-access account, and place $3,000 into a 9-month CD/Festgeld.',
          isBest: true,
          explanation: 'Optimal Strategy! You preserve emergency liquidity while locking in guaranteed yields for your tuition deadline with zero market risk.',
        },
        {
          id: 'opt_3',
          label: 'Keep all $4,000 in a standard checking account paying 0.01% APY.',
          isBest: false,
          explanation: 'Suboptimal. Inflation erodes your purchasing power, and you leave guaranteed interest on the table.',
        },
      ],
    },
  },

  'hysa-basics': {
    topicId: 'hysa-basics',
    topicTitle: 'High-Yield Cash vs. European Easy-Access & Money Market Funds',
    category: 'Cash & Savings',
    usTactics: {
      region: 'US',
      regionName: 'United States',
      flag: '🇺🇸',
      instrumentName: 'High-Yield Savings Account (HYSA) & T-Bill Barbell',
      strategyName: 'The HYSA + Treasury Bill Cash Barbell',
      tagline: 'Combine instant bank liquidity with state-tax-exempt sovereign yield',
      howItWorks: [
        'Keep 1 month of essential expenses in a digital HYSA (yielding 4%–5% APY) connected to your checking account for instant same-day transfers.',
        'Place the remaining 3 to 5 months of your emergency fund into 4-week rolling US Treasury Bills or ultra-short Treasury ETFs (like SGOV or BIL).',
        'Treasury Bills are exempt from state and local income taxes, significantly boosting your net after-tax return in states with high state income taxes.',
        'When the Federal Reserve adjusts the federal funds rate, HYSA and T-Bill yields float dynamically.',
      ],
      tacticalRules: [
        'Confirm the digital bank is a genuine FDIC member (or sweeping into FDIC member banks) rather than an uninsured crypto or fintech platform.',
        'Maintain automatic monthly savings transfers on payday (Pay Yourself First principle).',
        'Do not use an HYSA for multi-year horizons (>5 years) where inflation outpaces cash interest.',
      ],
      regulatorySafety: 'FDIC insured up to $250,000 per depositor; US Treasuries backed by the full faith and credit of the United States Government.',
      taxOrCostEdge: 'Treasury Bills are 100% exempt from State and Local income taxes (saving up to 6%–13% in tax burden depending on state).',
      recommendedTickersOrTools: ['Marcus / Ally / Capital One', 'SGOV (iShares 0-3M Treasury)', 'TreasuryDirect.gov'],
    },
    euTactics: {
      region: 'EU',
      regionName: 'European Union & UK',
      flag: '🇪🇺',
      instrumentName: 'Easy-Access Savings (Tagesgeld) & Euro MMFs (€STR)',
      strategyName: 'The Accumulating €STR Money Market Fund Strategy',
      tagline: 'Bypass sluggish commercial bank deposit rates with direct central bank money market indexing',
      howItWorks: [
        'Traditional retail banks in Europe (like BNP, Deutsche Bank, Santander) often pass on only 1%–2% to depositors even when the ECB rate is 3.5%–4%.',
        'Smart European investors hold cash in accumulating Euro Money Market ETFs tracking the Euro Short-Term Rate (€STR, e.g. ticker XEON or CSH2).',
        'These funds invest in ultra-safe sovereign debt and reverse repos, passing on 100% of the ECB rate with virtually zero credit risk.',
        'Because they are accumulating ("Acc"), interest compounds daily inside the fund with no monthly cash distributions to report manually.',
      ],
      tacticalRules: [
        'Use low-cost European neo-brokers (Trade Republic, Scalable Capital, Interactive Brokers) offering uninvested cash interest at the full ECB benchmark rate.',
        'Keep 2 to 3 months of expenses in an easy-access account (Tagesgeld) that allows instantaneous SEPA Instant credit transfers.',
        'Avoid funds with high Total Expense Ratios (TER > 0.15%) that chew into cash yields.',
      ],
      regulatorySafety: 'EU DGS covers bank cash up to €100k; UCITS Money Market Funds are segregated custodial assets held off-balance-sheet with a custodian bank.',
      taxOrCostEdge: 'In countries with capital gains deferral, Accumulating MMFs let interest compound tax-free until shares are sold.',
      recommendedTickersOrTools: ['XEON (Xtrackers EUR Overnight Rate)', 'CSH2 (Lyxor Smart Overnight)', 'Trade Republic / Scalable Cash'],
    },
    headToHeadDifferences: [
      {
        feature: 'Rate Transmission',
        usMarket: 'Direct competition among online banks yields 4.25% - 5.0% APY',
        euMarket: 'High street banks lag behind ECB; savers use MMFs (XEON) or neo-brokers',
        winnerOrTakeaway: 'US savers get high yields directly in banks; EU savers increasingly turn to €STR ETFs.',
      },
      {
        feature: 'State & Local Tax Exemption',
        usMarket: 'Treasury Bills are 100% exempt from state/city income tax',
        euMarket: 'Sovereign bonds may carry reduced tax (e.g. Italy 12.5% vs 26%)',
        winnerOrTakeaway: 'Both regions reward holding government-backed cash instruments with tax advantages.',
      },
      {
        feature: 'Withdrawal Speed',
        usMarket: 'ACH takes 1 to 3 business days; Wire is same-day',
        euMarket: 'SEPA Instant transfers funds in under 10 seconds across all EU banks',
        winnerOrTakeaway: 'Europe leads in transaction infrastructure speed with SEPA Instant.',
      },
    ],
    interactiveChallenge: {
      question: 'Why do sophisticated European investors often choose an accumulating €STR Money Market ETF over a traditional bank savings account?',
      context: 'The European Central Bank benchmark rate is 3.50%, but your local high-street bank only pays 0.75% on savings.',
      options: [
        {
          id: 'opt_1',
          label: 'Because the €STR ETF captures near 100% of the ECB policy rate and compounds interest automatically with daily liquidity.',
          isBest: true,
          explanation: 'Exact! High-street banks keep the interest margin for themselves. Institutional money market funds pass through central bank rates directly.',
        },
        {
          id: 'opt_2',
          label: 'Because money market ETFs guarantee stock market equity appreciation of 15% per year.',
          isBest: false,
          explanation: 'Incorrect. Money market funds are cash instruments, not equity investments. They do not trade for capital appreciation.',
        },
        {
          id: 'opt_3',
          label: 'Because European regulations make it illegal to hold more than €5,000 in a savings account.',
          isBest: false,
          explanation: 'Incorrect. There is no such limit; deposits are insured up to €100,000 per bank.',
        },
      ],
    },
  },

  'stock-basics': {
    topicId: 'stock-basics',
    topicTitle: 'Stock Market Trading Strategies (US vs. Europe)',
    category: 'Equities & ETFs',
    usTactics: {
      region: 'US',
      regionName: 'United States',
      flag: '🇺🇸',
      instrumentName: 'US Equities (NYSE & Nasdaq)',
      strategyName: 'Dollar-Cost Averaging (DCA) + Pullback Swing Accumulation',
      tagline: 'Harness the dominant liquidity, innovation, and earnings power of American enterprise',
      howItWorks: [
        'Set up automated weekly or monthly Dollar-Cost Averaging (DCA) into established, profitable blue-chip leaders (e.g. Apple, Microsoft, Amazon, Alphabet).',
        'Maintain a 10% to 15% opportunistic cash reserve to purchase additional shares when high-quality stocks pull back to their 200-day simple moving average (SMA).',
        'Hold shares for longer than 1 year to qualify for preferential Long-Term Capital Gains tax rates (0%, 15%, or 20% vs ordinary income tax up to 37%).',
        'Reinvest all quarterly cash dividends automatically using a Dividend Reinvestment Plan (DRIP) to leverage compound share accumulation.',
      ],
      tacticalRules: [
        'Never allocate more than 5% to 10% of total portfolio value to any single individual company.',
        'Use Limit Orders rather than Market Orders during earnings volatility or the first 15 minutes of market open (9:30 - 9:45 AM ET).',
        'Strictly follow long-only paper trading rules: avoid margin loans or speculative leverage.',
      ],
      regulatorySafety: 'Securities Investor Protection Corporation (SIPC) protects up to $500,000 (including $250k cash) against brokerage insolvency; regulated by SEC and FINRA.',
      taxOrCostEdge: 'Long-term holding (>365 days) caps federal tax at 15% for most investors. Zero-commission trading is universal across major US brokerages.',
      recommendedTickersOrTools: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TradingView (for 200-SMA analysis)'],
    },
    euTactics: {
      region: 'EU',
      regionName: 'European Union & UK',
      flag: '🇪🇺',
      instrumentName: 'European Equities (Euronext, Xetra, LSE)',
      strategyName: 'European Dividend Aristocrat & Moat Compounding',
      tagline: 'Target established global leaders with high dividend yields and resilient economic moats',
      howItWorks: [
        'European equity markets are known for world-leading champions in niche global monopolies: semiconductors (ASML), healthcare (Novo Nordisk, Novartis), luxury pricing power (LVMH), and enterprise software (SAP).',
        'European companies traditionally distribute higher cash dividend yields (often 3% to 5%+) compared to US tech-heavy growth stocks.',
        'Strategy: Build a basket of "Wide-Moat Dividend Aristocrats"—companies with 10+ consecutive years of dividend maintenance or growth.',
        'Be mindful of currency exposure: trading in GBP, EUR, or CHF provides natural currency diversification against the US Dollar.',
      ],
      tacticalRules: [
        'Account for local transaction stamp duties (e.g. UK 0.5% Stamp Duty Reserve Tax on UK share purchases; French 0.3% Financial Transaction Tax).',
        'Check cross-border dividend withholding taxes: French and Swiss stocks can withhold up to 25%–35% unless treaty relief forms are filed.',
        'Trade during peak liquidity hours (8:00 AM – 4:30 PM London / Frankfurt time) to minimize bid-ask spreads.',
      ],
      regulatorySafety: 'National investor compensation schemes protect up to €20,000 to €100,000 depending on country (FSCS £85,000 in UK); regulated by ESMA / BaFin / AMF / FCA.',
      taxOrCostEdge: 'Take full advantage of tax-advantaged wrapper accounts: UK Stocks & Shares ISA (zero capital gains and zero dividend tax on up to £20k/yr) or French PEA.',
      recommendedTickersOrTools: ['ASML (Semiconductors)', 'SAP (Enterprise Cloud)', 'NOVO-B (Healthcare)', 'LVMH (Luxury)', 'Trade Republic / DEGIRO / IBKR'],
    },
    headToHeadDifferences: [
      {
        feature: 'Market Profile',
        usMarket: 'Dominated by mega-cap Tech, AI, and High-Growth earnings',
        euMarket: 'Rich in Industrials, Luxury, Healthcare, and High Dividend Payers',
        winnerOrTakeaway: 'US for aggressive capital appreciation; Europe for cash flow & valuation discipline.',
      },
      {
        feature: 'Transaction Taxes',
        usMarket: '$0 stamp duty; zero commissions universal',
        euMarket: 'Stamp duties in UK (0.5%) and France (0.3%) on share buys',
        winnerOrTakeaway: 'US market has lower friction for frequent long-term rebalancing.',
      },
      {
        feature: 'Tax-Advantaged Accounts',
        usMarket: 'Roth IRA & 401(k) ($7,000 / $23,000 annual limits)',
        euMarket: 'UK ISA (£20,000/yr completely tax-free), French PEA (€150,000)',
        winnerOrTakeaway: 'The UK ISA is one of the most generous tax-free wrappers in the world.',
      },
    ],
    interactiveChallenge: {
      question: 'When building a traditional equity portfolio across both markets, what is the key strategic benefit of combining US and European stocks?',
      context: 'An investor holds 100% US tech stocks and wants to diversify their long-term equity exposure.',
      options: [
        {
          id: 'opt_1',
          label: 'Currency diversification (EUR/GBP vs USD) plus exposure to defensive, dividend-paying world leaders (ASML, Novo Nordisk, SAP) that trade at lower valuation multiples.',
          isBest: true,
          explanation: 'Spot on! Holding international blue chips reduces dependence on a single currency and tempers the volatility of high-beta tech stocks.',
        },
        {
          id: 'opt_2',
          label: 'European stocks are completely immune to global economic recessions and inflation.',
          isBest: false,
          explanation: 'Incorrect. All equity markets experience economic cycles and drawdowns.',
        },
        {
          id: 'opt_3',
          label: 'European stocks pay 0% taxes regardless of what account you use.',
          isBest: false,
          explanation: 'Incorrect. European investments are subject to dividend withholding and local capital gains unless held in designated tax wrappers like an ISA.',
        },
      ],
    },
  },

  'etf-basics': {
    topicId: 'etf-basics',
    topicTitle: 'ETF Strategies: US S&P 500 vs. European UCITS Compounding',
    category: 'Equities & ETFs',
    usTactics: {
      region: 'US',
      regionName: 'United States',
      flag: '🇺🇸',
      instrumentName: 'US-Domiciled ETFs (S&P 500, Total Market)',
      strategyName: 'The 80/20 Core-and-Satellite Index Strategy',
      tagline: '80% low-cost broad index foundation + 20% high-conviction factor tilt',
      howItWorks: [
        'Allocate 80% of your long-term equity capital into an ultra-low-cost broad index ETF tracking the S&P 500 or Total US Stock Market (VOO, SPY, or VTI with expense ratios as low as 0.03%).',
        'Allocate the remaining 20% into strategic "satellites": thematic growth (semiconductors, clean energy) or value/dividend funds (SCHD).',
        'Employ Dollar-Cost Averaging (DCA): invest a fixed dollar sum on the 1st of every month regardless of market headlines.',
        'Rebalance once per year: if satellites have outperformed, trim profits back into the core index anchor.',
      ],
      tacticalRules: [
        'Keep total expense ratio (TER) weighted average under 0.10% ($10 per $10,000 invested).',
        'Turn on automatic dividend reinvestment (DRIP) to ensure cash never sits idle.',
        'Never attempt to day-trade index ETFs; compounding requires multi-year holding through pullbacks.',
      ],
      regulatorySafety: 'SEC regulated; protected under SIPC up to $500,000 against brokerage failure.',
      taxOrCostEdge: 'In taxable accounts, US ETFs utilize authorized participant "in-kind" redemption mechanics, resulting in virtually zero capital gains distributions compared to mutual funds.',
      recommendedTickersOrTools: ['VOO (Vanguard S&P 500)', 'VTI (Vanguard Total Market)', 'SPY (SPDR S&P 500)', 'QQQ (Invesco Nasdaq 100)'],
    },
    euTactics: {
      region: 'EU',
      regionName: 'European Union & UK',
      flag: '🇪🇺',
      instrumentName: 'UCITS ETFs (Undertakings for Collective Investment in Transferable Securities)',
      strategyName: 'The Accumulating (Acc) UCITS Global Index Playbook',
      tagline: 'The ultimate European compounding engine: automatic tax-deferred dividend reinvestment',
      howItWorks: [
        'Under EU PRIIPs regulations, European residents cannot directly purchase US-domiciled ETFs (like VOO or VTI). Instead, European investors invest in **UCITS ETFs** (compliant with strict EU investor protection standards).',
        'Crucial Choice: **Accumulating (Acc)** vs. **Distributing (Dist)**:',
        'Choose **Accumulating (Acc)** UCITS funds (e.g. VWCE - Vanguard FTSE All-World Acc, or VUAA - Vanguard S&P 500 Acc).',
        'Instead of paying out cash dividends that trigger annual tax filings and reinvestment fees, accumulating funds automatically reinvest 100% of dividends directly back into the fund’s Net Asset Value.',
        'Irish-domiciled UCITS ETFs benefit from the US-Ireland Double Tax Treaty, which cuts US dividend withholding tax from 30% down to 15% internally.',
      ],
      tacticalRules: [
        'Look for the letters "Acc" or "C" in the ETF title (e.g., VUAA Acc) rather than "Dist" or "Dis".',
        'Prefer physical replication (holding actual shares) over synthetic swap-based replication for maximum transparency.',
        'Check fund currency (EUR vs USD) vs listing currency on your local exchange (Xetra, Euronext, LSE) to avoid FX exchange fees.',
      ],
      regulatorySafety: 'Regulated under UCITS EU directives—the gold standard of fund safety globally, requiring independent custodian segregation, strict liquidity rules, and diversification limits.',
      taxOrCostEdge: 'Accumulating ETFs allow full gross compound growth without annual dividend tax drag in many EU tax codes until final redemption years later.',
      recommendedTickersOrTools: ['VWCE (Vanguard All-World Acc)', 'VUAA / CSPX (S&P 500 Acc)', 'IS3N (Emerging Markets Acc)', 'JustETF.com (Top European ETF screener)'],
    },
    headToHeadDifferences: [
      {
        feature: 'Regulatory Framework',
        usMarket: 'SEC Investment Company Act of 1940',
        euMarket: 'UCITS Directive (Compliant with EU PRIIPs / KID requirements)',
        winnerOrTakeaway: 'European residents must buy UCITS ETFs; US residents buy US-domiciled ETFs.',
      },
      {
        feature: 'Dividend Handling',
        usMarket: 'ETFs must distribute dividends to holders annually (taxable event)',
        euMarket: 'Accumulating (Acc) UCITS funds reinvest internally with 0 friction',
        winnerOrTakeaway: 'European Accumulating UCITS ETFs are arguably the most tax-efficient compounding vehicle in the world.',
      },
      {
        feature: 'Withholding Tax on US Dividends',
        usMarket: '0% withholding for US tax residents',
        euMarket: '15% internal withholding for Irish-domiciled UCITS (reduced from 30% via treaty)',
        winnerOrTakeaway: 'Irish-domiciled UCITS ETFs recover half of the foreign withholding tax automatically.',
      },
    ],
    interactiveChallenge: {
      question: 'Why should a long-term European investor almost always prefer an "Accumulating" (Acc) UCITS ETF over a "Distributing" (Dist) ETF?',
      context: 'You are investing €250/month into an S&P 500 fund and plan to hold it for 20 years without withdrawing.',
      options: [
        {
          id: 'opt_1',
          label: 'Accumulating funds automatically reinvest dividends without transaction fees and defer taxable income events, maximizing exponential compound growth.',
          isBest: true,
          explanation: 'Masterful! In Distributing funds, cash sits uninvested or gets hit by income taxes and reinvestment broker fees. Accumulating funds compound 100% of dividends seamlessly.',
        },
        {
          id: 'opt_2',
          label: 'Because Distributing ETFs are illegal in the European Union.',
          isBest: false,
          explanation: 'Incorrect. Distributing ETFs are legal and common, but require manual dividend reinvestment.',
        },
        {
          id: 'opt_3',
          label: 'Because Accumulating ETFs guarantee you can never lose money.',
          isBest: false,
          explanation: 'Incorrect. Accumulating ETFs still experience regular equity market fluctuations.',
        },
      ],
    },
  },
};

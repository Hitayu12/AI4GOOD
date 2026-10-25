import { Lesson, LessonSummary } from '../../../api/types';

/**
 * Rutgers AI4Good 2026 — Educational Lesson Definitions
 * Starter educational curriculum covering five core financial instruments.
 * Conforms strictly to src/api/types.ts and docs/API_CONTRACT.md.
 */

export const LESSONS: Record<string, Lesson> = {
  'cd-basics': {
    id: 'cd-basics',
    version: 1,
    title: 'Certificates of Deposit (CDs)',
    topic: 'Savings',
    review_status: 'draft',
    quiz_id: 'quiz-cd-basics',
    source_links: [
      'https://www.fdic.gov/resources/deposit-insurance/financial-products-insured/',
      'https://www.consumerfinance.gov/consumer-tools/bank-accounts/',
    ],
    body: `### What is a Certificate of Deposit (CD)?
A Certificate of Deposit (CD) is a specialized time deposit offered by banks and credit unions. When you purchase a CD, you agree to deposit a fixed sum of money for a specified maturity term—ranging from a few months up to five years or longer. In exchange, the financial institution guarantees a fixed interest rate (Annual Percentage Yield or APY) for the entire duration of the term.

### How CDs Work
1. **Principal Commitment**: You deposit a lump sum upfront. Unlike standard checking or savings accounts, you generally cannot add more funds to an existing CD after the initial deposit.
2. **Fixed APY**: Your interest rate is locked on day one. Regardless of whether prevailing market interest rates rise or fall during your term, your rate of return remains constant.
3. **Maturity & Compounding**: Interest compounds over time (daily, monthly, or annually). At maturity, you receive your full principal plus all accrued interest. You can then withdraw the funds or roll them into a new CD.

### The Liquidity Trade-Off & Early Withdrawal Penalties (EWP)
The primary trade-off of a CD is liquidity. In exchange for predictable returns, you surrender immediate access to your cash. If you need your funds before the scheduled maturity date, the issuing bank will typically impose an **Early Withdrawal Penalty (EWP)**. 
- Depending on the term length, this penalty often equals several months of earned interest (e.g., 90 to 180 days of interest).
- In cases where the CD is broken very early in its term, the penalty can even eat into a small portion of your principal.

### Safety and Regulatory Protection
CDs issued by federally insured banks are protected by the **Federal Deposit Insurance Corporation (FDIC)** up to $250,000 per depositor, per insured institution, for each qualifying ownership category. Share certificates issued by credit unions carry identical federal protection through the **National Credit Union Administration (NCUA)**. Because of this backing, CDs carry virtually zero risk of nominal principal loss when held to maturity within insurance limits.

### When to Choose a CD
- **Targeted Goals**: Ideal for savings goals with a known future deadline (e.g., a home down payment in 2 years or tuition due in 12 months).
- **Interest Rate Hedging**: Attractive when interest rates are high and expected to fall, allowing you to lock in elevated yields for multiple years.
- **CD Ladders**: Many investors build "CD ladders"—staggering maturity dates across 6, 12, 18, and 24 months to maintain periodic cash liquidity while capturing higher yields.`,
  },

  'hysa-basics': {
    id: 'hysa-basics',
    version: 1,
    title: 'High-Yield Savings Accounts (HYSAs)',
    topic: 'Savings',
    review_status: 'draft',
    quiz_id: 'quiz-hysa-basics',
    source_links: [
      'https://www.fdic.gov/resources/deposit-insurance/',
      'https://www.consumerfinance.gov/consumer-tools/bank-accounts/',
    ],
    body: `### What is a High-Yield Savings Account (HYSA)?
A High-Yield Savings Account (HYSA) is a federally insured deposit account that pays an Annual Percentage Yield (APY) substantially higher than the national average of traditional brick-and-mortar savings accounts. While traditional branch banks frequently pay nominal rates as low as 0.01% APY, HYSAs often pay 10 to 40 times more on cash deposits.

### Why HYSAs Pay Higher Rates
Most high-yield accounts are offered by online banks or digital divisions of established institutions. Because online banks do not maintain expansive networks of physical retail branches, automated teller teller tellers, or heavy physical infrastructure, their operational overhead is significantly lower. They pass these operational savings to consumers in the form of higher deposit yields to attract deposits.

### Variable Rates & Interest Mechanics
Unlike CDs which lock in your rate for months or years, **HYSA interest rates are variable**:
- Financial institutions adjust HYSA yields dynamically in response to benchmark economic rates set by the Federal Reserve (the Federal Funds Rate).
- When the Federal Reserve raises benchmark interest rates to combat inflation, HYSA yields typically rise.
- When the Federal Reserve lowers rates to stimulate economic activity, HYSA APYs will decrease accordingly.

### Liquidity and Everyday Access
HYSAs provide exceptional liquidity:
- You can deposit additional funds or withdraw money at any time without term lock-ups or early withdrawal penalties.
- While federal reserve rules historically limited savings withdrawals to 6 per month (Regulation D), many institutions maintain flexible online transfers, direct deposits, and mobile banking tools.
- Funds typically take 1 to 3 business days to transfer between external institutions via ACH.

### Safety & Deposit Insurance
Just like traditional accounts, genuine HYSAs offered by insured banks are covered by **FDIC insurance** up to $250,000 per depositor, per insured institution, for each ownership category (or **NCUA insurance** at federal credit unions).

### Role in Personal Financial Health
- **Emergency Fund Foundation**: Financial educators recommend holding 3 to 6 months of essential living expenses in an HYSA. It preserves capital, remains liquid for unexpected medical or auto repairs, and earns compound interest.
- **Short-Term Reserves**: Ideal for discretionary savings needed within 1 to 3 years (vacation, vehicle replacement, wedding) where stock market volatility cannot be tolerated.
- **Inflation Reality**: While HYSAs protect nominal dollars, long-term purchasing power can still erode if inflation exceeds the after-tax yield of the account.`,
  },

  'stock-basics': {
    id: 'stock-basics',
    version: 1,
    title: 'Introduction to Stocks',
    topic: 'Equities',
    review_status: 'draft',
    quiz_id: 'quiz-stock-basics',
    source_links: [
      'https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks',
      'https://www.finra.org/investors/investing/investment-products/stocks',
    ],
    body: `### What is a Stock?
A stock (also known as an equity share) represents fractional ownership in a publicly traded corporation. When you purchase a share of stock, you become a shareholder, legally owning a proportionate claim on the company's underlying assets, intellectual property, and future earnings.

### How Investors Earn Returns
Shareholders generate returns through two primary mechanisms:
1. **Capital Appreciation**: If the company innovates, grows revenue, and improves profitability, market demand for its shares generally rises. Selling your shares at a price higher than your purchase price generates a capital gain.
2. **Dividends**: Profitable corporations may elect to distribute a portion of their net earnings directly to shareholders as periodic cash dividends.

### Market Dynamics & Price Discovery
Public stocks trade on regulated exchanges such as the New York Stock Exchange (NYSE) and Nasdaq. 
- Share prices are not set by the government or individual brokers; they are determined continuously during exchange trading hours by the interaction of buyers and sellers (**supply and demand**).
- Prices react to quarterly financial reports, revenue guidance, macroeconomic news, consumer sentiment, and competitive industry trends.

### Understanding Risk & Volatility
Unlike FDIC-insured bank deposits, stocks carry market risk and volatility:
- **Capital Loss Risk**: A company can experience operational decline, regulatory penalties, loss of market share, or bankruptcy. If a company fails, common shareholders sit lowest in the capital recovery hierarchy and can lose 100% of their invested capital.
- **Idiosyncratic (Company-Specific) Risk**: Holding individual stocks exposes your wealth to unpredictable events specific to one firm. Diversification across multiple companies and sectors helps mitigate this hazard.

### Custodial Safety vs. Investment Loss (SIPC)
Securities held at registered brokerage firms are protected by the **Securities Investor Protection Corporation (SIPC)** up to $500,000 (including up to $250,000 for uninvested cash). 
- **Critical Distinction**: SIPC protects against the financial failure or fraud of the brokerage firm itself (ensuring your securities are returned).
- **SIPC does NOT protect against stock price drops or poor investment performance**.

### Educational Simulation Scope
In our Rutgers AI4Good trading engine:
- Students execute paper trades in real market-like conditions with zero financial risk.
- The simulator strictly enforces **cash-funded, long-only positions** in whole shares.
- Borrowing on margin, short selling, and complex derivatives are prohibited to focus squarely on foundational equity valuation and long-term portfolio growth.`,
  },

  'etf-basics': {
    id: 'etf-basics',
    version: 1,
    title: 'Exchange-Traded Funds (ETFs)',
    topic: 'Equities',
    review_status: 'draft',
    quiz_id: 'quiz-etf-basics',
    source_links: [
      'https://www.investor.gov/introduction-investing/investing-basics/investment-products/mutual-funds-and-exchange-traded-1',
      'https://www.sec.gov/oiea/investor-alerts-and-bulletins/ib_etfs',
    ],
    body: `### What is an Exchange-Traded Fund (ETF)?
An Exchange-Traded Fund (ETF) is a pooled investment vehicle that holds a collection of underlying assets—such as hundreds of stocks, bonds, or commodities. An ETF trades on public stock exchanges throughout the day, just like an individual stock share.

### Instant Diversification
When you purchase a single share of an individual stock, your outcome depends entirely on that single business. If you purchase an ETF tracking a broad index—such as the S&P 500 or the total U.S. stock market—a single share immediately grants you fractional exposure to hundreds or thousands of corporations.
- **Mitigating Single-Company Risk**: If one company in a 500-stock index experiences a crisis, its decline is offset by the collective earnings and stability of the remaining companies.
- **Simplicity**: Investors achieve balanced asset allocation with a single transaction rather than researching and purchasing hundreds of separate stocks.

### How ETFs Differ From Mutual Funds
While both ETFs and mutual funds hold diversified baskets of securities, their trading mechanics differ substantially:
- **Trading Hours**: Mutual funds price and settle trades only once per business day, after the 4:00 PM Eastern market close, at their Net Asset Value (NAV). ETFs trade continuously on public exchanges throughout regular trading hours with live, fluctuating bid and ask prices.
- **Intraday Flexibility**: ETF investors can place limit orders, observe intraday price movements, and trade whenever markets are open.
- **Minimum Investments**: Many mutual funds require minimum initial investments of $1,000 to $3,000. ETFs can be purchased for the price of a single share.

### Expense Ratios & Operating Costs
Every ETF charges an annual management fee known as an **Expense Ratio**, expressed as an annualized percentage of assets:
- For example, an expense ratio of 0.03% means you pay $3.00 annually for every $10,000 invested.
- Unlike broker commissions or account fees, the expense ratio is not billed directly to your account. Instead, it is deducted automatically and continuously from the fund's net asset value.
- Passive index ETFs typically offer exceptionally low expense ratios compared to actively managed funds.

### In the AI4Good Simulator
Broad-market index ETFs (such as S&P 500 funds) provide a core anchor for virtual portfolios. In our historical simulation, students can benchmark their individual stock picks against holding a low-cost, diversified index fund over multi-year market cycles.`,
  },

  'options-intro': {
    id: 'options-intro',
    version: 1,
    title: 'Options Primer (Educational Only)',
    topic: 'Derivatives',
    review_status: 'draft',
    quiz_id: 'quiz-options-intro',
    source_links: [
      'https://www.finra.org/investors/investing/investment-products/options',
      'https://www.optionseducation.org',
    ],
    body: `### MANDATORY EDUCATIONAL NOTICE
**Educational Primer Only**: This module is provided strictly for conceptual understanding of financial derivatives. Options trading involves substantial risk of rapid and complete loss of capital. In accordance with the project contract, **options execution is NOT supported in the Rutgers AI4Good MVP trading engine**. The simulation is strictly limited to cash-funded, long-only equities and ETFs.

### What are Financial Options?
An option is a **derivative contract**—meaning its value is derived from the price movement of an underlying asset (such as an individual stock or ETF). 
- An equity option contract grants the holder the legal **right, but NOT the obligation**, to buy or sell 100 shares of the underlying security at a predetermined price on or before a specified date.
- Standard U.S. exchange-traded equity options represent exactly **100 shares** of stock per contract.

### The Two Fundamental Option Types
1. **Call Option (Right to Buy)**:
   - A Call gives the buyer the right to purchase 100 shares at the agreed **strike price**.
   - Buyers purchase calls when they anticipate the underlying stock price will rise significantly before expiration.
   - Example: If you buy a $100 Call on stock XYZ, and XYZ jumps to $125, your right to purchase shares at $100 becomes highly valuable.
2. **Put Option (Right to Sell)**:
   - A Put gives the buyer the right to sell 100 shares at the agreed **strike price**.
   - Buyers purchase puts when they anticipate the underlying stock price will decline, using them for speculation or as insurance ("hedging") against portfolio losses.

### Core Terminology
- **Strike Price**: The fixed price at which the option holder can exercise their contract to buy or sell the underlying asset.
- **Premium**: The cash market price paid upfront by the buyer to the seller (writer) of the option contract.
- **Expiration Date**: The final day on which the option contract is valid. After this timestamp, unexercised contracts expire and cease to exist.

### Asymmetric Payoff vs. Time Decay (Theta)
- **Capped Risk for Long Buyers**: When you buy a Call or Put, your maximum financial loss is strictly limited to 100% of the initial premium paid.
- **The Enemy of the Buyer — Time Decay (Theta)**: Options are "wasting assets." Unlike shares of stock that you can hold indefinitely, options lose value with each passing day as expiration approaches, even if the underlying stock price does not move.
- **Out-of-the-Money Expirations**: If the stock price does not cross the strike price plus premium by expiration, the contract expires completely worthless, resulting in a total loss of the invested premium.

### Why Derivatives Require Extreme Caution
Options involve leverage: a small percentage move in the underlying stock can result in huge percentage swings—or total erasure—of the option's value. Successful derivatives analysis requires understanding complex mathematical parameters ("the Greeks": Delta, Gamma, Theta, Vega) and implied volatility. For beginners building foundational financial security, disciplined savings, broad index ETFs, and fundamental equity evaluation offer far superior risk-adjusted paths to wealth creation.`,
  },
};

export const LESSON_SUMMARIES: LessonSummary[] = Object.values(LESSONS).map(
  (lesson) => ({
    id: lesson.id,
    version: lesson.version,
    title: lesson.title,
    topic: lesson.topic,
  })
);

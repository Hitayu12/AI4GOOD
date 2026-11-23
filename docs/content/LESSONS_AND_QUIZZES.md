# Educational Lessons & Quizzes — Authoritative Curriculum Specification

**Handoff Reference**: Handoff 002 (Kiran Phase 3 → Siddh Backend Phase 8)  
**Contract Version**: Aligned with `docs/API_CONTRACT.md` (v2)  
**Status**: `ready_for_ingestion`  
**Frontend Source Code**:
- Public Lesson Definitions: `frontend/src/features/learning/content/lessonDefinitions.ts`
- Public Quiz Definitions: `frontend/src/features/learning/content/quizDefinitions.ts`
- Server Answer Keys & Explanations: `frontend/src/features/learning/content/serverAnswerKeys.ts`

---

## 1. Architecture, Contract Rules & Scoring Invariants

### 1.1 Separation of Concerns & Security Boundary
- **Public Quiz Delivery (`GET /api/v1/quizzes/{id}`)**: Returns question prompts and options only (`id` and `text`). The endpoint **must never disclose** the correct answer keys, weights, or scoring flags.
- **Server-Side Scoring (`POST /api/v1/quizzes/{id}/attempts`)**: The client submits user responses. The server evaluates answers against confidential server answer keys and returns the calculated score, pass/fail status, and explanatory feedback.
- **Client Bundle Isolation**: `serverAnswerKeys.ts` is explicitly excluded from production browser builds and must remain accessible only to backend scoring services and test fixtures.

### 1.2 Attempt Validation & Scoring Rules
1. **Completeness & Uniqueness**: The server validates that the payload answers every question in the quiz exactly once. Payloads with missing questions, duplicate question IDs, or invalid option IDs must be rejected with HTTP 422 (`{"error":{"code":"invalid_attempt","message":"Every quiz question must be answered exactly once."}}`).
2. **Version Pinning**: The client sends `quiz_version`. If this does not match the active server quiz version, the server must reject with HTTP 409 (`{"error":{"code":"stale_quiz_version","message":"Quiz has been updated. Please refresh."}}`).
3. **Passing Grade**: The passing threshold is strictly **80.00%**.
   - For a 4-question quiz: 4/4 (100.00%) passes; 3/4 (75.00%) fails.
4. **Progress Tracking (`GET /api/v1/progress`)**:
   - The server maintains per-user, per-lesson progress records.
   - `attempt_count`: Total number of attempts submitted.
   - `latest_score_pct`: Formatted two-decimal string (e.g., `"75.00"`).
   - `best_score_pct`: Highest historical score attained.
   - `completed`: Boolean set to `true` if and only if `best_score_pct >= 80.00%` on the current version.
5. **Idempotency**: Attempt submissions must accept a client-generated `Idempotency-Key` header scoped to `user + route + quiz_id` to guard against network retry duplication.

---

## 2. Topic 1: Certificates of Deposit (CDs)

- **ID**: `cd-basics`
- **Version**: `1`
- **Title**: `Certificates of Deposit (CDs)`
- **Topic**: `Savings`
- **Review Status**: `draft`
- **Quiz ID**: `quiz-cd-basics`
- **Authoritative Sources**:
  - FDIC Insured Financial Products: `https://www.fdic.gov/resources/deposit-insurance/financial-products-insured/`
  - CFPB Bank Accounts & Deposit Tools: `https://www.consumerfinance.gov/consumer-tools/bank-accounts/`

### 2.1 Lesson Summary
A Certificate of Deposit (CD) is a federally insured time deposit where a saver commits a fixed sum of money for a specified maturity term in return for a guaranteed Annual Percentage Yield (APY), accepting an early withdrawal penalty for premature liquidation.

### 2.2 Lesson Body
```markdown
### What is a Certificate of Deposit (CD)?
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
- **CD Ladders**: Many investors build "CD ladders"—staggering maturity dates across 6, 12, 18, and 24 months to maintain periodic cash liquidity while capturing higher yields.
```

### 2.3 Quiz Schema (`quiz-cd-basics`)

#### Question 1 (`q1`)
- **Prompt**: What is a Certificate of Deposit (CD) and how does it fundamentally work?
- **Options**:
  - `opt_a`: A certificate of stock ownership in a commercial bank that pays quarterly dividends.
  - `opt_b`: A time deposit account that holds a fixed sum of money for a specified term in exchange for a guaranteed interest rate.
  - `opt_c`: An uncollateralized loan made by a consumer to an investment fund that fluctuates with market indices.
  - `opt_d`: A revolving line of credit that permits cash withdrawals up to an approved borrowing limit.

#### Question 2 (`q2`)
- **Prompt**: What federal insurance protects consumer deposits in standard CDs at an FDIC-member bank?
- **Options**:
  - `opt_a`: Deposits are insured up to $250,000 per depositor, per insured institution, for each qualifying account ownership category.
  - `opt_b`: Deposits are protected against market volatility up to $1,000,000 under the Securities Investor Protection Act.
  - `opt_c`: There is no federal insurance protection for CDs because they are classified as investment securities.
  - `opt_d`: Deposits are insured only if the account holder maintains an active checking account with the Federal Reserve.

#### Question 3 (`q3`)
- **Prompt**: What is the typical consequence if a saver withdraws money from a standard CD before its scheduled maturity date?
- **Options**:
  - `opt_a`: The bank automatically seizes the entire initial deposit balance.
  - `opt_b`: The saver must pay a mandatory criminal fine to the Consumer Financial Protection Bureau.
  - `opt_c`: The depositor is assessed an early withdrawal penalty, which typically forfeits a portion of the accrued interest.
  - `opt_d`: The account interest rate automatically doubles to encourage reinvestment.

#### Question 4 (`q4`)
- **Prompt**: Which economic scenario presents a key risk or disadvantage for an investor holding a long-term fixed-rate CD?
- **Options**:
  - `opt_a`: A general decrease in market interest rates and consumer prices.
  - `opt_b`: An expansion of FDIC deposit insurance coverage limits by federal regulators.
  - `opt_c`: A reduction in the bank's operational branches and ATM network.
  - `opt_d`: A sharp increase in prevailing market interest rates and inflation, leaving the CD's locked return below newer yields.

### 2.4 Server Answer Key & Explanations (`quiz-cd-basics`)

| Question ID | Correct Option | Pedagogical Explanation |
|---|---|---|
| `q1` | `opt_b` | A Certificate of Deposit (CD) is a promissory time deposit issued by a bank or credit union. The saver commits a fixed principal sum for an agreed duration (term) in return for a locked, guaranteed Annual Percentage Yield (APY). |
| `q2` | `opt_a` | Standard CDs at FDIC-insured depository institutions are backed by the full faith and credit of the U.S. government up to $250,000 per depositor, per insured institution, for each qualifying account ownership category (with identical coverage provided by NCUA for credit unions). |
| `q3` | `opt_c` | Because a CD relies on committed capital for the entire term, premature liquidations trigger an Early Withdrawal Penalty (EWP). This penalty commonly equals several months of earned interest, directly reducing the account yield. |
| `q4` | `opt_d` | Fixed-rate CDs expose investors to interest rate and inflation risks. If market rates or inflation surge after locking in your CD, your locked yield remains static, causing your purchasing power to lag behind current market opportunities. |

---

## 3. Topic 2: High-Yield Savings Accounts (HYSAs)

- **ID**: `hysa-basics`
- **Version**: `1`
- **Title**: `High-Yield Savings Accounts (HYSAs)`
- **Topic**: `Savings`
- **Review Status**: `draft`
- **Quiz ID**: `quiz-hysa-basics`
- **Authoritative Sources**:
  - FDIC Deposit Insurance Overview: `https://www.fdic.gov/resources/deposit-insurance/`
  - CFPB Consumer Bank Account Resources: `https://www.consumerfinance.gov/consumer-tools/bank-accounts/`

### 3.1 Lesson Summary
A High-Yield Savings Account (HYSA) is a liquid, federally insured bank account that offers significantly higher variable interest rates than traditional brick-and-mortar savings accounts, making it the premier vehicle for emergency funds.

### 3.2 Lesson Body
```markdown
### What is a High-Yield Savings Account (HYSA)?
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
- **Inflation Reality**: While HYSAs protect nominal dollars, long-term purchasing power can still erode if inflation exceeds the after-tax yield of the account.
```

### 3.3 Quiz Schema (`quiz-hysa-basics`)

#### Question 1 (`q1`)
- **Prompt**: Why are High-Yield Savings Accounts (HYSAs) typically able to offer significantly higher APYs than traditional brick-and-mortar savings accounts?
- **Options**:
  - `opt_a`: They invest all depositor cash into speculative growth stocks and cryptocurrency.
  - `opt_b`: They are predominantly offered by online institutions that operate with lower physical branch overhead and pass savings to customers.
  - `opt_c`: They charge depositors a mandatory 15% exit tax on every transfer.
  - `opt_d`: They are exempt from FDIC and federal banking reserve regulations.

#### Question 2 (`q2`)
- **Prompt**: How does interest rate variability work on a standard High-Yield Savings Account?
- **Options**:
  - `opt_a`: The interest rate is variable, meaning the bank may raise or lower the APY at any time based on benchmark rates and market conditions.
  - `opt_b`: The interest rate is locked for a guaranteed 5-year period upon account opening.
  - `opt_c`: The interest rate is tied to the price of gold and changes every second on international commodities exchanges.
  - `opt_d`: The interest rate can only increase and is legally prohibited from ever decreasing.

#### Question 3 (`q3`)
- **Prompt**: Why is an HYSA widely considered an ideal vehicle for a personal emergency fund?
- **Options**:
  - `opt_a`: It guarantees double-digit returns regardless of market conditions.
  - `opt_b`: It completely eliminates all state and federal income tax obligations on interest income.
  - `opt_c`: It locks money away so the saver cannot access it under any circumstances for five years.
  - `opt_d`: It combines high liquidity and capital preservation backed by FDIC insurance with a competitive return on cash.

#### Question 4 (`q4`)
- **Prompt**: If an HYSA yields 4.25% APY while inflation is running at 6.00% annually, what happens to the saver's purchasing power?
- **Options**:
  - `opt_a`: Purchasing power increases because 4.25% nominal interest is earned.
  - `opt_b`: The purchasing power remains identical because FDIC insurance compensates for price inflation.
  - `opt_c`: Purchasing power decreases because the real rate of return is negative (-1.75%), meaning prices rise faster than the interest earned.
  - `opt_d`: The bank automatically issues bonus shares of stock to offset inflation.

### 3.4 Server Answer Key & Explanations (`quiz-hysa-basics`)

| Question ID | Correct Option | Pedagogical Explanation |
|---|---|---|
| `q1` | `opt_b` | Online banks and digital subsidiaries operate without the immense overhead of physical retail branches, expansive real estate, and localized branch staff. These structural efficiencies are passed to depositors in the form of significantly higher APYs. |
| `q2` | `opt_a` | Unlike fixed CDs, HYSA interest rates are variable and fluctuate dynamically. When the Federal Reserve adjusts the federal funds benchmark rate, banks raise or lower their deposit yields in response to prevailing monetary policy. |
| `q3` | `opt_d` | An emergency fund demands two non-negotiable qualities: instant liquidity (fast withdrawal without early termination penalties) and capital safety (FDIC/NCUA insurance protecting principal up to $250,000). HYSAs provide both alongside competitive compound interest. |
| `q4` | `opt_c` | Real return is calculated as nominal return minus inflation (4.25% - 6.00% = -1.75%). Even though nominal dollar balances grow, purchasing power diminishes because the prices of consumer goods and services are climbing faster than the interest earned. |

---

## 4. Topic 3: Stocks (Equities)

- **ID**: `stock-basics`
- **Version**: `1`
- **Title**: `Introduction to Stocks`
- **Topic**: `Equities`
- **Review Status**: `draft`
- **Quiz ID**: `quiz-stock-basics`
- **Authoritative Sources**:
  - SEC Investor.gov Stocks: `https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks`
  - FINRA Equity Investing Guide: `https://www.finra.org/investors/investing/investment-products/stocks`

### 4.1 Lesson Summary
A common stock represents fractional equity ownership in a corporation, providing potential financial returns via capital appreciation and dividends while carrying market volatility and company-specific risk.

### 4.2 Lesson Body
```markdown
### What is a Stock?
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
- Borrowing on margin, short selling, and complex derivatives are prohibited to focus squarely on foundational equity valuation and long-term portfolio growth.
```

### 4.3 Quiz Schema (`quiz-stock-basics`)

#### Question 1 (`q1`)
- **Prompt**: What fundamental asset do you own when you purchase shares of common stock in a public corporation?
- **Options**:
  - `opt_a`: A guaranteed promissory note issued by the U.S. Department of the Treasury.
  - `opt_b`: A contractual right to an annual fixed interest payment prior to company taxes.
  - `opt_c`: An insurance policy that protects the company's bondholders from insolvency.
  - `opt_d`: A fractional equity ownership stake in the corporation, representing a claim on its assets and potential earnings.

#### Question 2 (`q2`)
- **Prompt**: What is the primary difference between how FDIC insurance and SIPC coverage protect investors?
- **Options**:
  - `opt_a`: FDIC protects bank deposits from bank failures; SIPC protects custody of cash and securities if a brokerage fails, but never covers stock market losses.
  - `opt_b`: SIPC reimburses investors for all capital losses incurred during stock market downturns.
  - `opt_c`: FDIC covers public equities traded on the NYSE, while SIPC covers checking and savings deposits.
  - `opt_d`: Neither agency exists; both are private commercial warranty plans.

#### Question 3 (`q3`)
- **Prompt**: What are the two primary ways equity investors realize financial returns from holding common stock?
- **Options**:
  - `opt_a`: Early withdrawal penalties and guaranteed interest coupons.
  - `opt_b`: Capital appreciation (selling shares at a higher price than purchased) and dividend distributions.
  - `opt_c`: Federal tax credits and synthetic interest rebates.
  - `opt_d`: Exchange fees and broker commission splits.

#### Question 4 (`q4`)
- **Prompt**: Why is concentrating an entire investment portfolio into a single company's stock generally considered high risk?
- **Options**:
  - `opt_a`: Single-stock trades can only be placed once per calendar quarter.
  - `opt_b`: Brokerages charge higher tax rates on individual stock gains than on mutual funds.
  - `opt_c`: The investor is fully exposed to company-specific (idiosyncratic) risks such as mismanagement, competitive obsolescence, or bankruptcy without diversification.
  - `opt_d`: Single stocks cannot be sold unless the original founder provides written approval.

### 4.4 Server Answer Key & Explanations (`quiz-stock-basics`)

| Question ID | Correct Option | Pedagogical Explanation |
|---|---|---|
| `q1` | `opt_d` | Common stock represents direct fractional equity ownership in a public corporation. Shareholders hold a proportionate claim on corporate assets and residual profits, as well as voting rights on key governance matters. |
| `q2` | `opt_a` | FDIC protects depositors against commercial bank failures. SIPC protects against the financial collapse, insolvency, or fraud of a registered brokerage firm (up to $500,000 including $250,000 for cash). Crucially, SIPC does NOT protect against stock market volatility or investment decline. |
| `q3` | `opt_b` | Equity investors profit through capital appreciation (selling shares for more than the purchase price as the business expands) and cash dividends (periodic distributions of corporate profits). In this platform's educational simulator, trading focuses on whole-share capital appreciation. |
| `q4` | `opt_c` | Holding an undiversified position in a single corporation exposes an investor to company-specific (idiosyncratic) risks such as management failures, competitive disruption, or insolvency. Diversifying across many companies mitigates these single-point risks. |

---

## 5. Topic 4: ETFs (Exchange-Traded Funds)

- **ID**: `etf-basics`
- **Version**: `1`
- **Title**: `Exchange-Traded Funds (ETFs)`
- **Topic**: `Equities`
- **Review Status**: `draft`
- **Quiz ID**: `quiz-etf-basics`
- **Authoritative Sources**:
  - SEC Investor.gov Mutual Funds and ETFs: `https://www.investor.gov/introduction-investing/investing-basics/investment-products/mutual-funds-and-exchange-traded-1`
  - SEC Office of Investor Education and Advocacy Bulletin on ETFs: `https://www.sec.gov/oiea/investor-alerts-and-bulletins/ib_etfs`

### 5.1 Lesson Summary
An Exchange-Traded Fund (ETF) is a pooled investment security holding a diversified basket of underlying assets that trades continuously on public stock exchanges throughout the day, offering broad diversification at low expense ratios.

### 5.2 Lesson Body
```markdown
### What is an Exchange-Traded Fund (ETF)?
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
Broad-market index ETFs (such as S&P 500 funds) provide a core anchor for virtual portfolios. In our historical simulation, students can benchmark their individual stock picks against holding a low-cost, diversified index fund over multi-year market cycles.
```

### 5.3 Quiz Schema (`quiz-etf-basics`)

#### Question 1 (`q1`)
- **Prompt**: What is an Exchange-Traded Fund (ETF) and how does it trade?
- **Options**:
  - `opt_a`: A pooled investment fund holding a basket of assets that trades throughout the day on public stock exchanges at market-determined prices.
  - `opt_b`: A municipal savings bond that trades strictly between commercial banks over the counter.
  - `opt_c`: A private equity contract that can only be purchased by accredited institutional investors.
  - `opt_d`: A bank deposit account that guarantees fixed interest payments on the first of every month.

#### Question 2 (`q2`)
- **Prompt**: What is a major structural difference between an ETF and a traditional open-end mutual fund?
- **Options**:
  - `opt_a`: ETFs are only available to corporate officers, whereas mutual funds are public.
  - `opt_b`: ETFs can be bought and sold intraday at fluctuating market prices, whereas traditional mutual funds execute once daily after market close at Net Asset Value (NAV).
  - `opt_c`: Mutual funds are traded continuously on NASDAQ, while ETFs settle only on the last day of each month.
  - `opt_d`: ETFs do not own any underlying financial securities.

#### Question 3 (`q3`)
- **Prompt**: What is an ETF's "expense ratio" and how is it paid by shareholders?
- **Options**:
  - `opt_a`: A separate monthly invoice billed directly to the investor's checking account.
  - `opt_b`: A sales commission charged by your brokerage each time you submit an order.
  - `opt_c`: An annual operating fee expressed as a percentage of fund assets, deducted directly and continuously from the fund's net asset value.
  - `opt_d`: A penalty levied by the SEC on investors who hold the fund for less than one year.

#### Question 4 (`q4`)
- **Prompt**: How does purchasing an ETF tracking a broad market index like the S&P 500 improve an investor's risk profile?
- **Options**:
  - `opt_a`: It guarantees that the investment will never lose money during a bear market.
  - `opt_b`: It eliminates broad macroeconomic market downturns and recessions.
  - `opt_c`: It converts all equity holdings into FDIC-insured cash equivalents.
  - `opt_d`: It provides instant diversification across hundreds of companies, drastically reducing single-company default risk.

### 5.4 Server Answer Key & Explanations (`quiz-etf-basics`)

| Question ID | Correct Option | Pedagogical Explanation |
|---|---|---|
| `q1` | `opt_a` | An Exchange-Traded Fund (ETF) is a pooled investment security holding a portfolio of assets (like stocks or bonds) that trades continuously on public stock exchanges throughout the trading day at market prices. |
| `q2` | `opt_b` | Traditional open-end mutual funds execute transactions only once per day after market close (4:00 PM ET) based on that day's Net Asset Value (NAV). In contrast, ETFs trade continuously during regular exchange hours with live, fluctuating bid and ask prices. |
| `q3` | `opt_c` | The expense ratio is the annual fee deducted continuously from the fund's total assets to cover investment management, administration, and compliance. Because it is subtracted from fund NAV, investors never receive a direct fee bill. |
| `q4` | `opt_d` | A broad-market index ETF (such as an S&P 500 fund) distributes your investment across hundreds of companies across diverse sectors. While overall market volatility remains, idiosyncratic failure risk of any single firm is effectively minimized. |

---

## 6. Topic 5: Options Primer (Educational Only)

- **ID**: `options-intro`
- **Version**: `1`
- **Title**: `Options Primer (Educational Only)`
- **Topic**: `Derivatives`
- **Review Status**: `draft`
- **Quiz ID**: `quiz-options-intro`
- **Authoritative Sources**:
  - FINRA Options Product Guide: `https://www.finra.org/investors/investing/investment-products/options`
  - The Options Industry Council (OIC) Educational Portal: `https://www.optionseducation.org`

### 6.1 Lesson Summary
An introduction to equity options contracts (Calls and Puts) explaining derivative rights, strike prices, premiums, expiration dates, and time decay (Theta), with strict emphasis that options trading is purely educational and not supported for execution in the MVP.

### 6.2 Lesson Body
```markdown
### MANDATORY EDUCATIONAL NOTICE
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
Options involve leverage: a small percentage move in the underlying stock can result in huge percentage swings—or total erasure—of the option's value. Successful derivatives analysis requires understanding complex mathematical parameters ("the Greeks": Delta, Gamma, Theta, Vega) and implied volatility. For beginners building foundational financial security, disciplined savings, broad index ETFs, and fundamental equity evaluation offer far superior risk-adjusted paths to wealth creation.
```

### 6.3 Quiz Schema (`quiz-options-intro`)

#### Question 1 (`q1`)
- **Prompt**: What is an equity Call option and what right does it grant to the buyer?
- **Options**:
  - `opt_a`: A legal obligation requiring the holder to sell 100 shares of stock at the market low.
  - `opt_b`: A contract giving the holder the right, but not the obligation, to buy 100 shares of the underlying stock at a specified strike price prior to expiration.
  - `opt_c`: A fixed corporate bond that pays 10% coupon interest annually.
  - `opt_d`: A mutual agreement to split trading fees with an exchange floor specialist.

#### Question 2 (`q2`)
- **Prompt**: What is the maximum potential financial loss for an investor who purchases a long Call or long Put option?
- **Options**:
  - `opt_a`: The total premium (cost) paid upfront to purchase the option contract.
  - `opt_b`: An unlimited financial loss if the underlying stock becomes volatile.
  - `opt_c`: 100 shares of the underlying company's physical stock.
  - `opt_d`: Zero, because all exchange-traded options are guaranteed by SIPC against losses.

#### Question 3 (`q3`)
- **Prompt**: In options trading, what does "time decay" (Theta) represent?
- **Options**:
  - `opt_a`: The gradual reduction in brokerage commission fees as a contract gets older.
  - `opt_b`: The daily increase in option value caused solely by the passage of time.
  - `opt_c`: The natural erosion of an option's extrinsic value over time as the contract approaches its expiration date.
  - `opt_d`: The statutory requirement that all stock dividends be settled within 30 business days.

#### Question 4 (`q4`)
- **Prompt**: Why is options trading restricted to educational concepts only and strictly excluded from trade execution in this platform's MVP?
- **Options**:
  - `opt_a`: Federal securities laws prohibit universities from teaching derivatives concepts to students.
  - `opt_b`: Options can only be traded using physical paperwork submitted directly to the Options Clearing Corporation.
  - `opt_c`: Options contracts are identical to standard savings accounts and provide no differentiated learning value.
  - `opt_d`: Options involve high leverage, rapid time decay, complex Greek sensitivities, and high risk of total loss, making them unsuitable for beginner cash-trading simulations.

### 6.4 Server Answer Key & Explanations (`quiz-options-intro`)

| Question ID | Correct Option | Pedagogical Explanation |
|---|---|---|
| `q1` | `opt_b` | A Call option gives the buyer the contractual right—without any obligation—to purchase 100 shares of the underlying equity at a fixed strike price on or before the contract's expiration date. |
| `q2` | `opt_a` | When you purchase a long Call or Put option, the maximum possible capital loss is capped at 100% of the initial premium paid to acquire the contract. (In stark contrast, writing or selling naked options can expose traders to severe or theoretically unlimited losses). |
| `q3` | `opt_c` | Options are wasting assets governed by time decay (Theta). As calendar days pass and expiration draws nearer, the extrinsic time value of the option contract naturally erodes, accelerating rapidly during the final 30 days before expiration. |
| `q4` | `opt_d` | Options involve high financial leverage, rapid time decay, volatility sensitivity (the Greeks), and substantial risk of total capital loss. To establish sound financial literacy, this platform's MVP simulator focuses strictly on cash-funded, long-only stocks and ETFs without derivative execution. |

---

## 7. Master Seed Payloads for Backend Ingestion

Below are the complete raw JSON structures formatted for direct seeding into the backend database (or test fixtures):

### 7.1 Server Answer Keys JSON (`server_answer_keys.json`)
```json
{
  "quiz-cd-basics": {
    "answer_key": {
      "q1": "opt_b",
      "q2": "opt_a",
      "q3": "opt_c",
      "q4": "opt_d"
    },
    "explanations": {
      "q1": "A Certificate of Deposit (CD) is a promissory time deposit issued by a bank or credit union. The saver commits a fixed principal sum for an agreed duration (term) in return for a locked, guaranteed Annual Percentage Yield (APY).",
      "q2": "Standard CDs at FDIC-insured depository institutions are backed by the full faith and credit of the U.S. government up to $250,000 per depositor, per insured institution, for each qualifying account ownership category (with identical coverage provided by NCUA for credit unions).",
      "q3": "Because a CD relies on committed capital for the entire term, premature liquidations trigger an Early Withdrawal Penalty (EWP). This penalty commonly equals several months of earned interest, directly reducing the account yield.",
      "q4": "Fixed-rate CDs expose investors to interest rate and inflation risks. If market rates or inflation surge after locking in your CD, your locked yield remains static, causing your purchasing power to lag behind current market opportunities."
    }
  },
  "quiz-hysa-basics": {
    "answer_key": {
      "q1": "opt_b",
      "q2": "opt_a",
      "q3": "opt_d",
      "q4": "opt_c"
    },
    "explanations": {
      "q1": "Online banks and digital subsidiaries operate without the immense overhead of physical retail branches, expansive real estate, and localized branch staff. These structural efficiencies are passed to depositors in the form of significantly higher APYs.",
      "q2": "Unlike fixed CDs, HYSA interest rates are variable and fluctuate dynamically. When the Federal Reserve adjusts the federal funds benchmark rate, banks raise or lower their deposit yields in response to prevailing monetary policy.",
      "q3": "An emergency fund demands two non-negotiable qualities: instant liquidity (fast withdrawal without early termination penalties) and capital safety (FDIC/NCUA insurance protecting principal up to $250,000). HYSAs provide both alongside competitive compound interest.",
      "q4": "Real return is calculated as nominal return minus inflation (4.25% - 6.00% = -1.75%). Even though nominal dollar balances grow, purchasing power diminishes because the prices of consumer goods and services are climbing faster than the interest earned."
    }
  },
  "quiz-stock-basics": {
    "answer_key": {
      "q1": "opt_d",
      "q2": "opt_a",
      "q3": "opt_b",
      "q4": "opt_c"
    },
    "explanations": {
      "q1": "Common stock represents direct fractional equity ownership in a public corporation. Shareholders hold a proportionate claim on corporate assets and residual profits, as well as voting rights on key governance matters.",
      "q2": "FDIC protects depositors against commercial bank failures. SIPC protects against the financial collapse, insolvency, or fraud of a registered brokerage firm (up to $500,000 including $250,000 for cash). Crucially, SIPC does NOT protect against stock market volatility or investment decline.",
      "q3": "Equity investors profit through capital appreciation (selling shares for more than the purchase price as the business expands) and cash dividends (periodic distributions of corporate profits). In this platform's educational simulator, trading focuses on whole-share capital appreciation.",
      "q4": "Holding an undiversified position in a single corporation exposes an investor to company-specific (idiosyncratic) risks such as management failures, competitive disruption, or insolvency. Diversifying across many companies mitigates these single-point risks."
    }
  },
  "quiz-etf-basics": {
    "answer_key": {
      "q1": "opt_a",
      "q2": "opt_b",
      "q3": "opt_c",
      "q4": "opt_d"
    },
    "explanations": {
      "q1": "An Exchange-Traded Fund (ETF) is a pooled investment security holding a portfolio of assets (like stocks or bonds) that trades continuously on public stock exchanges throughout the trading day at market prices.",
      "q2": "Traditional open-end mutual funds execute transactions only once per day after market close (4:00 PM ET) based on that day's Net Asset Value (NAV). In contrast, ETFs trade continuously during regular exchange hours with live, fluctuating bid and ask prices.",
      "q3": "The expense ratio is the annual fee deducted continuously from the fund's total assets to cover investment management, administration, and compliance. Because it is subtracted from fund NAV, investors never receive a direct fee bill.",
      "q4": "A broad-market index ETF (such as an S&P 500 fund) distributes your investment across hundreds of companies across diverse sectors. While overall market volatility remains, idiosyncratic failure risk of any single firm is effectively minimized."
    }
  },
  "quiz-options-intro": {
    "answer_key": {
      "q1": "opt_b",
      "q2": "opt_a",
      "q3": "opt_c",
      "q4": "opt_d"
    },
    "explanations": {
      "q1": "A Call option gives the buyer the contractual right—without any obligation—to purchase 100 shares of the underlying equity at a fixed strike price on or before the contract's expiration date.",
      "q2": "When you purchase a long Call or Put option, the maximum possible capital loss is capped at 100% of the initial premium paid to acquire the contract. (In stark contrast, writing or selling naked options can expose traders to severe or theoretically unlimited losses).",
      "q3": "Options are wasting assets governed by time decay (Theta). As calendar days pass and expiration draws nearer, the extrinsic time value of the option contract naturally erodes, accelerating rapidly during the final 30 days before expiration.",
      "q4": "Options involve high financial leverage, rapid time decay, volatility sensitivity (the Greeks), and substantial risk of total capital loss. To establish sound financial literacy, this platform's MVP simulator focuses strictly on cash-funded, long-only stocks and ETFs without derivative execution."
    }
  }
}
```

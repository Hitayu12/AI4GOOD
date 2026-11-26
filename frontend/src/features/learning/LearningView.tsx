import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card } from '../../components/common/Card';
import { ApiClient, defaultApiClient } from '../../api/client';
import { Lesson, LessonSummary, ProgressItem, Quiz, QuizAttemptRequest, QuizAttemptResponse } from '../../api/types';
import { LESSONS, LESSON_SUMMARIES } from './content/lessonDefinitions';
import { QUIZZES } from './content/quizDefinitions';
import { SERVER_ANSWER_KEYS, QuizScoringData } from './content/serverAnswerKeys';
import { evaluateQuizAttempt } from './quizScoring';
import { TabOverviewModal } from '../../components/common/TabOverviewModal';
import { questTracker } from '../gamification/questTrackerService';
import { soundFx } from '../gamification/soundFxService';
import { triggerConfetti } from '../../components/common/CelebrationConfetti';
import { loadAuraState, syncLearningAwards } from '../aura/auraService';
import { isRecord, readPractice, useStoredPractice } from '../practiceStorage';
import { Tuck } from '../home/Tuck';
import paydayCover from '../home/payday-cover.jpg';
import '../home/campaign.css';

export interface LearningViewProps {
  apiClient?: ApiClient;
  useInternalScoring?: boolean;
  initialTopicId?: string;
  storageScope?: string;
  quizzes?: Record<string, Quiz>;
  serverAnswerKeys?: Record<string, QuizScoringData>;
  onProgressUpdate?: (progress: Record<string, ProgressItem>) => void;
}

interface MicroCard {
  id: string;
  icon: string;
  title: string;
  badge: string;
  tone: 'lavender' | 'mint' | 'peach' | 'lime';
  body: string;
  takeaway: string;
  tuckSays: string;
  quickCheck: {
    prompt: string;
    options: [string, string];
    correctIndex: 0 | 1;
    rightFeedback: string;
    wrongFeedback: string;
  };
}

const DUO_3D_BTN =
  'border-2 border-b-4 rounded-2xl active:border-b-2 active:translate-y-0.5 transition-all font-bold cursor-pointer select-none';

const DUO_GREEN_BTN =
  'border-2 border-b-4 rounded-2xl border-[#46a302] bg-[#58cc02] hover:bg-[#4ec000] text-white active:border-b-2 active:translate-y-0.5 transition-all font-extrabold cursor-pointer select-none shadow-xs';

const DUO_PURPLE_BTN =
  'border-2 border-b-4 rounded-2xl border-[#3c2396] bg-[#5637ca] hover:bg-[#492cb5] text-white active:border-b-2 active:translate-y-0.5 transition-all font-extrabold cursor-pointer select-none shadow-xs';

function normalizeTopicId(topicId: string): string {
  if (topicId === 'stocks-basics') return 'stock-basics';
  if (topicId === 'options-basics') return 'options-intro';
  return topicId;
}

const TOPIC_VISUALS: Record<string, { icon: string; tone: string }> = {
  'cd-basics': { icon: '🔒', tone: 'bg-[#eee6ff] text-[#4f32a9]' },
  'hysa-basics': { icon: '⚡', tone: 'bg-[#e3f3d9] text-[#285137]' },
  'stock-basics': { icon: '📈', tone: 'bg-[#ffe9da] text-[#7b402a]' },
  'stocks-basics': { icon: '📈', tone: 'bg-[#ffe9da] text-[#7b402a]' },
  'etf-basics': { icon: '🧺', tone: 'bg-[#eee6ff] text-[#4f32a9]' },
  'options-intro': { icon: '⏳', tone: 'bg-[#ffe9da] text-[#7b402a]' },
  'options-basics': { icon: '⏳', tone: 'bg-[#ffe9da] text-[#7b402a]' },
};

const GIRL_MISSIONS: Record<string, { title: string; challenge: string }> = {
  'cd-basics': {
    title: "Maya's Tuition Mission",
    challenge:
      "I saved $1,000 for fall tuition in 12 months! Can I lock in a higher guaranteed rate without risking my money?",
  },
  'hysa-basics': {
    title: "Maya's Emergency Stash",
    challenge:
      'My old bank pays literally $0.01 in interest. Where can I park rainy-day cash so it grows AND stays reachable 24/7?',
  },
  'stock-basics': {
    title: "Maya's First Stock",
    challenge:
      'Everyone talks about buying shares of companies they love. What do I actually own — and how can I manage the risk?',
  },
  'etf-basics': {
    title: "Maya's One-Click Basket",
    challenge:
      'Picking one winning stock feels super stressful! How do I own 500 top companies in one trade with tiny fees?',
  },
  'options-intro': {
    title: "Maya's Safety Check",
    challenge:
      'I keep seeing hype about options online. Why are derivatives so risky, and why does FutureWorth keep them educational-only?',
  },
};

const TOPIC_MICRO_CARDS: Record<string, MicroCard[]> = {
  'cd-basics': [
    {
      id: 'cd-1',
      icon: '🔒',
      title: 'The Money Time Capsule',
      badge: 'Core Idea',
      tone: 'lavender',
      body: 'A Certificate of Deposit (CD) locks a set chunk of money for a fixed term (like 12 months). In return, the bank guarantees your interest rate from day one!',
      takeaway: 'Fixed timer + locked APY = zero rate surprises.',
      tuckSays: 'Tuck says: Think of a CD like a time capsule for your money! 🐕🔒',
      quickCheck: {
        prompt: 'Quick Check: Can the bank slash your CD rate halfway through your term?',
        options: ['Nope — your APY stays locked!', 'Yes, it changes every week'],
        correctIndex: 0,
        rightFeedback: 'Spot on! Once you open a CD, that rate is locked in.',
        wrongFeedback: 'Not quite! Unlike regular savings, a CD locks your rate on day one.',
      },
    },
    {
      id: 'cd-2',
      icon: '📈',
      title: 'Lump Sum, Steady Growth',
      badge: 'How It Works',
      tone: 'mint',
      body: 'You put one lump sum in upfront and let interest compound automatically. When the timer finishes, you get all your cash back plus the guaranteed profit!',
      takeaway: '$1,000 at 5% APY for 1 year turns into $1,050 safely.',
      tuckSays: 'Tuck says: Drop it in once, then let compound interest do the heavy lifting! 🐾✨',
      quickCheck: {
        prompt: 'Quick Check: Can you keep adding random $25 deposits to an existing CD?',
        options: ['Yes, anytime like checking', 'Usually no — it is one lump sum'],
        correctIndex: 1,
        rightFeedback: 'You got it! Standard CDs start with one lump-sum deposit.',
        wrongFeedback: 'Close! Most CDs only accept one initial deposit when you open them.',
      },
    },
    {
      id: 'cd-3',
      icon: '⚠️',
      title: 'Watch the Early Break Fee',
      badge: 'Big Catch',
      tone: 'peach',
      body: 'Pulling cash out before maturity triggers an Early Withdrawal Penalty (often 90–180 days of interest). Break it super early and it can even nibble at your original cash!',
      takeaway: 'Never lock emergency funds inside a CD.',
      tuckSays: 'Tuck says: Keep rainy-day cash outside your CD so you never pay a break penalty! 🛡️',
      quickCheck: {
        prompt: 'Quick Check: Should your 2 AM emergency car-repair cash go in a 2-year CD?',
        options: ['No — keep emergency cash liquid!', 'Yes — lock it up tight'],
        correctIndex: 0,
        rightFeedback: 'Smart! Emergency cash needs instant access with zero penalties.',
        wrongFeedback: 'Careful! An emergency could force you to break the CD and pay a penalty.',
      },
    },
    {
      id: 'cd-4',
      icon: '🛡️',
      title: 'FDIC Shield & CD Ladders',
      badge: 'Pro Move',
      tone: 'lime',
      body: 'FDIC/NCUA insurance protects deposits up to $250,000 per bank. Pro trick: split money into a "CD ladder" (6, 12, 18 mo) so cash unlocks every few months!',
      takeaway: '$250k government shield + staggered maturity dates = pro saver.',
      tuckSays: 'Tuck says: A CD ladder gives you locked yields AND regular cash unlocks! 🪜💎',
      quickCheck: {
        prompt: 'Quick Check: How much does standard FDIC coverage protect per depositor?',
        options: ['Up to $25,000', 'Up to $250,000'],
        correctIndex: 1,
        rightFeedback: 'Nailed it! $250,000 per depositor, per insured bank.',
        wrongFeedback: 'Check again — standard FDIC protection goes all the way up to $250,000!',
      },
    },
  ],
  'hysa-basics': [
    {
      id: 'hysa-1',
      icon: '⚡',
      title: 'Savings on Turbo Mode',
      badge: 'Core Idea',
      tone: 'mint',
      body: 'A High-Yield Savings Account (HYSA) works just like regular savings, except it pays 10x–40x more! Old branch banks pay ~0.01%, while HYSAs often pay ~4%+ APY.',
      takeaway: 'Same safe savings, way bigger interest payouts.',
      tuckSays: 'Tuck says: Stop settling for 0.01% pennies when your cash can earn real dollars! 💸',
      quickCheck: {
        prompt: 'Quick Check: Why do people pick an HYSA over a 0.01% checking/savings account?',
        options: ['Way higher interest on safe cash', 'Because it buys meme stocks'],
        correctIndex: 0,
        rightFeedback: 'Yes! You earn substantially higher APY on federally insured cash.',
        wrongFeedback: 'Nope! An HYSA holds cash safely just like a bank account, just at a higher APY.',
      },
    },
    {
      id: 'hysa-2',
      icon: '📱',
      title: 'Why Online Banks Pay More',
      badge: 'Behind the Scenes',
      tone: 'lavender',
      body: 'Online banks skip expensive marble lobbies and thousands of retail branches. They pass those saved overhead costs straight to you as higher interest!',
      takeaway: 'Lower bank overhead = bigger APY for you.',
      tuckSays: 'Tuck says: Fewer marble lobbies for the bank means more cash for your goals! 🏦➡️📱',
      quickCheck: {
        prompt: 'Quick Check: How can digital banks afford higher APYs?',
        options: ['They skip physical branch overhead', 'They skip FDIC insurance'],
        correctIndex: 0,
        rightFeedback: 'Right! Lower building & staffing overhead goes straight into your APY.',
        wrongFeedback: 'Actually, real HYSAs ARE FDIC insured — they save money by being online!',
      },
    },
    {
      id: 'hysa-3',
      icon: '💧',
      title: '24/7 Access & Variable Rates',
      badge: 'Flexibility',
      tone: 'peach',
      body: 'Deposit or withdraw cash anytime with zero lock-up penalties! Just know HYSA rates are variable — they rise or fall when the Federal Reserve shifts interest rates.',
      takeaway: 'Total liquidity anytime, with rates that float with the Fed.',
      tuckSays: 'Tuck says: Need cash fast at 2 AM? An HYSA lets you pull it without break fees! 💧',
      quickCheck: {
        prompt: 'Quick Check: Are HYSA interest rates locked forever like a CD?',
        options: ['Yes, locked for 5 years', 'No — HYSA rates are variable'],
        correctIndex: 1,
        rightFeedback: 'Correct! HYSA yields adjust when the Fed moves benchmark rates.',
        wrongFeedback: 'Watch out! CDs lock rates; HYSA rates are variable and float over time.',
      },
    },
    {
      id: 'hysa-4',
      icon: '🛡️',
      title: 'Your Emergency Shield',
      badge: 'Smart Strategy',
      tone: 'lime',
      body: 'HYSAs carry $250,000 FDIC/NCUA insurance — making them ideal for 3–6 months of emergency expenses. Just watch inflation: if prices rise faster than your APY, buying power slips.',
      takeaway: '#1 home for emergency cash and 1–2 year goals.',
      tuckSays: 'Tuck says: Build your liquid FDIC-safe cushion before chasing big stock bets! 🛡️🏆',
      quickCheck: {
        prompt: 'Quick Check: If inflation is 6% and your HYSA pays 4%, what happens to buying power?',
        options: ['Real buying power shrinks slightly', 'Buying power doubles automatically'],
        correctIndex: 0,
        rightFeedback: 'Sharp math! When inflation beats APY, real return is negative.',
        wrongFeedback: 'Not quite — if prices climb 6% while cash grows 4%, buying power falls behind.',
      },
    },
  ],
  'stock-basics': [
    {
      id: 'stk-1',
      icon: '🏢',
      title: 'Own a Slice of a Business',
      badge: 'Core Idea',
      tone: 'lavender',
      body: 'Buying a share of stock makes you a fractional co-owner of a real company! You gain a claim on the business’s assets and future profits.',
      takeaway: '1 share = real partial ownership in a corporation.',
      tuckSays: 'Tuck says: A stock is a real slice of a business — not a lottery ticket! 🍕🏢',
      quickCheck: {
        prompt: 'Quick Check: What do you actually own when you buy common stock?',
        options: ['A guaranteed government bond', 'Fractional ownership in the company'],
        correctIndex: 1,
        rightFeedback: 'Exactly! You become a shareholder and co-owner.',
        wrongFeedback: 'Try again — bonds are loans, while stocks are ownership equity!',
      },
    },
    {
      id: 'stk-2',
      icon: '💵',
      title: 'Two Ways Stocks Pay',
      badge: 'Returns',
      tone: 'mint',
      body: 'Shareholders earn through Capital Appreciation (selling higher than you bought) and Dividends (cash profit checks mature companies send to owners).',
      takeaway: 'Rising share prices + cash dividends = total return.',
      tuckSays: 'Tuck says: Earn when the company grows AND when it shares cash dividends! 💰📈',
      quickCheck: {
        prompt: 'Quick Check: What do we call cash payouts a profitable company sends shareholders?',
        options: ['Dividends', 'Early withdrawal penalties'],
        correctIndex: 0,
        rightFeedback: 'Bingo! Dividends share company profits directly with owners.',
        wrongFeedback: 'Nope — cash profit distributions to shareholders are called dividends!',
      },
    },
    {
      id: 'stk-3',
      icon: '🎢',
      title: 'Price Swings & Single-Stock Risk',
      badge: 'Risk Check',
      tone: 'peach',
      body: 'Stock prices move every second with supply and demand. Putting everything into ONE company is risky — if that business flops, shareholders can lose up to 100%!',
      takeaway: 'Invest for 5+ year horizons and diversify across companies.',
      tuckSays: 'Tuck says: Don’t put next month’s rent in stocks — short-term swings can be wild! 🎢',
      quickCheck: {
        prompt: 'Quick Check: Who sets stock prices on exchanges like the NYSE?',
        options: ['Buyers and sellers (supply & demand)', 'A fixed government price list'],
        correctIndex: 0,
        rightFeedback: 'Right! Continuous buyer and seller demand discovers the price.',
        wrongFeedback: 'Not quite — market supply and demand move share prices every second.',
      },
    },
    {
      id: 'stk-4',
      icon: '🛡️',
      title: 'SIPC vs. FDIC Safety',
      badge: 'Protection Rule',
      tone: 'lime',
      body: 'FDIC insures bank cash. SIPC ($500k) protects your brokerage account if the broker goes bust — it NEVER reimburses you if a stock drops in value!',
      takeaway: 'SIPC protects custody, not stock prices.',
      tuckSays: 'Tuck says: Practice cash-only, zero-margin trades in our Trade Lab first! 🎮✨',
      quickCheck: {
        prompt: 'Quick Check: Does SIPC pay you back if your stock drops 25%?',
        options: ['Yes, full refund', 'No — SIPC only covers broker failure'],
        correctIndex: 1,
        rightFeedback: 'Crucial distinction mastered! Market price risk is always yours.',
        wrongFeedback: 'Careful! SIPC only protects your shares if the brokerage firm itself fails.',
      },
    },
  ],
  'etf-basics': [
    {
      id: 'etf-1',
      icon: '🧺',
      title: 'The 500-Company Basket',
      badge: 'Core Idea',
      tone: 'lavender',
      body: 'An ETF bundles hundreds of stocks or bonds into a single share you can buy anytime. One share of an S&P 500 ETF spreads your money across 500 top US firms!',
      takeaway: '1 trade = instant basket of hundreds of companies.',
      tuckSays: 'Tuck says: Don’t hunt for one needle — own the whole haystack with an ETF! 🧺✨',
      quickCheck: {
        prompt: 'Quick Check: What does buying 1 share of an S&P 500 ETF give you?',
        options: ['Exposure to 500 top companies at once', 'A locked 12-month bank CD'],
        correctIndex: 0,
        rightFeedback: 'Boom! Instant diversification in a single share.',
        wrongFeedback: 'Not quite — an ETF holds an entire basket of stocks or assets.',
      },
    },
    {
      id: 'etf-2',
      icon: '🛡️',
      title: 'Built-In Crash Cushion',
      badge: 'Diversification',
      tone: 'mint',
      body: 'If one company in a 500-stock ETF goes bankrupt, the other 499 companies absorb the shock. Broad diversification crushes single-company disaster risk!',
      takeaway: 'One bad company can’t wreck a diversified index.',
      tuckSays: 'Tuck says: One rotten apple won’t spoil a 500-stock basket! 🍎🛡️',
      quickCheck: {
        prompt: 'Quick Check: Does an S&P 500 ETF guarantee you can NEVER lose money?',
        options: ['No — broad market dips still affect it', 'Yes, it turns stocks into FDIC cash'],
        correctIndex: 0,
        rightFeedback: 'Smart! It removes single-company risk, though market swings still happen.',
        wrongFeedback: 'Watch out — ETFs still rise and fall with the overall stock market.',
      },
    },
    {
      id: 'etf-3',
      icon: '⚡',
      title: 'ETFs vs. Mutual Funds',
      badge: 'Trading Style',
      tone: 'peach',
      body: 'Traditional mutual funds only price once a day after 4 PM and often demand $1,000+ minimums. ETFs trade live all day on exchanges — starting at just 1 share!',
      takeaway: 'Live intraday trading + low entry cost.',
      tuckSays: 'Tuck says: ETFs trade live while the market is open, just like regular stocks! ⚡📊',
      quickCheck: {
        prompt: 'Quick Check: When do ETFs execute trades compared to traditional mutual funds?',
        options: ['Intraday while markets are open', 'Only once a month on Fridays'],
        correctIndex: 0,
        rightFeedback: 'Yes! Real-time pricing whenever exchanges are open.',
        wrongFeedback: 'Actually, ETFs trade continuously intraday — mutual funds price once after close.',
      },
    },
    {
      id: 'etf-4',
      icon: '🏷️',
      title: 'Ultra-Tiny Expense Ratios',
      badge: 'Keep Your Gains',
      tone: 'lime',
      body: 'Every fund has an annual "expense ratio" fee quietly deducted from the fund. Top index ETFs charge as little as 0.03% — just $3 a year on $10,000!',
      takeaway: '0.03% fees keep more compounding money in YOUR account.',
      tuckSays: 'Tuck says: Paying 30¢ per $1,000 is a superpower for long-term wealth! 🏷️💎',
      quickCheck: {
        prompt: 'Quick Check: How do you pay an ETF’s expense ratio?',
        options: ['Deducted automatically from fund value', 'Billed by paper mail every month'],
        correctIndex: 0,
        rightFeedback: 'Exact match! It’s baked quietly into the fund’s net asset value.',
        wrongFeedback: 'No paper bills! The tiny fee is deducted automatically inside the fund.',
      },
    },
  ],
  'options-intro': [
    {
      id: 'opt-1',
      icon: '🚨',
      title: 'Educational Sandbox Only',
      badge: 'Safety First',
      tone: 'peach',
      body: 'Important: this module is purely educational! Because options carry high leverage and fast total-loss risk, options trading is NOT enabled in our MVP trading lab.',
      takeaway: 'Learn how contracts work here — practice cash stocks & ETFs to trade.',
      tuckSays: 'Tuck says: Smart investors learn the risks BEFORE ever touching leverage! 🎓🛑',
      quickCheck: {
        prompt: 'Quick Check: Can you execute real or paper options orders in our MVP engine?',
        options: ['No — MVP is strictly cash stocks & ETFs', 'Yes, with 10x borrowed money'],
        correctIndex: 0,
        rightFeedback: 'Right! Our simulator focuses safely on long-only stocks and ETFs.',
        wrongFeedback: 'Check the notice! Options are educational-only and excluded from MVP trading.',
      },
    },
    {
      id: 'opt-2',
      icon: '📜',
      title: 'Calls vs. Puts (100 Shares)',
      badge: 'Mechanics',
      tone: 'lavender',
      body: 'One equity option covers 100 shares at a locked "strike price." A Call gives the right (not obligation) to BUY; a Put gives the right to SELL (often used as insurance).',
      takeaway: 'Call = right to buy; Put = right to sell. 1 contract = 100 shares.',
      tuckSays: 'Tuck says: Think "Call UP" to buy shares, and "Put DOWN" to sell or hedge! 📜↕️',
      quickCheck: {
        prompt: 'Quick Check: Does buying a Call option FORCE you to buy 100 shares?',
        options: ['No — it is a right, not an obligation', 'Yes, you must buy even at a loss'],
        correctIndex: 0,
        rightFeedback: 'You got it! Buyers hold the choice, never an obligation.',
        wrongFeedback: 'Careful! That’s why they’re called "options" — buyers have the right, not duty.',
      },
    },
    {
      id: 'opt-3',
      icon: '⏳',
      title: 'Premium & Time Decay (Theta)',
      badge: 'Ticking Clock',
      tone: 'peach',
      body: 'You pay an upfront cash "Premium" to buy a contract — that’s your maximum loss. Unlike stocks, options expire! "Theta" (time decay) drains contract value every day.',
      takeaway: 'Every day toward expiration eats away an option’s value.',
      tuckSays: 'Tuck says: Stocks can sit forever, but options melt like ice cubes with a deadline! 🧊⏳',
      quickCheck: {
        prompt: 'Quick Check: What does Time Decay (Theta) do as expiration gets closer?',
        options: ['Erodes the option’s value daily', 'Doubles your dividend yield'],
        correctIndex: 0,
        rightFeedback: 'Spot on! Time decay steadily eats extrinsic contract value.',
        wrongFeedback: 'Not quite — Theta is the daily drop in value as expiration approaches.',
      },
    },
    {
      id: 'opt-4',
      icon: '🛡️',
      title: 'Why Steady Wealth Wins',
      badge: 'Bottom Line',
      tone: 'mint',
      body: 'If the stock doesn’t move far enough before expiration, an option expires at $0 (100% loss of premium). HYSAs, CDs, and broad ETFs offer far steadier compounding!',
      takeaway: 'Master savings + index ETFs before ever touching derivatives.',
      tuckSays: 'Tuck says: Steady ETFs + emergency cash win the long game without expiration stress! 🏆',
      quickCheck: {
        prompt: 'Quick Check: What is the max loss when buying a standard Call or Put option?',
        options: ['100% of the upfront premium paid', 'Zero — SIPC covers options bets'],
        correctIndex: 0,
        rightFeedback: 'Correct! Your risk is capped at the premium, but losing 100% is common.',
        wrongFeedback: 'Careful! SIPC never covers trading losses — buyers can lose 100% of the premium.',
      },
    },
  ],
};

const QUIZ_HINTS: Record<string, string> = {
  q1: 'Hint: A CD involves leaving a fixed sum deposited with a bank for a set term in return for guaranteed interest.',
  q2: 'Hint: Standard FDIC and NCUA coverage protects consumer deposits up to a $250,000 limit per depositor.',
  q3: 'Hint: Banks deter savers from pulling money before maturity by imposing an early withdrawal penalty.',
  q4: 'Hint: If interest rates across the economy rise while your money is locked in at an older lower rate, you experience opportunity cost.',
  'q-hysa-1': 'Hint: HYSAs offer high yields with complete liquidity to deposit and withdraw money at any time.',
  'q-hysa-2': 'Hint: Online banks avoid the heavy costs of physical retail branches and pass the savings to consumers.',
  'q-hysa-3': 'Hint: HYSA rates are variable—they adjust dynamically when the Federal Reserve shifts benchmark rates.',
  'q-hysa-4': 'Hint: Emergency money needs to be available on short notice without penalties, making liquid HYSAs ideal.',
  'q-stock-1': 'Hint: Common stock grants actual fractional ownership equity in the issuing corporation.',
  'q-stock-2': 'Hint: Stock prices move with continuous market supply, demand, company profits, and macroeconomic trends.',
  'q-stock-3': 'Hint: Common stocks represent market risk investments and do not carry FDIC deposit insurance.',
  'q-stock-4': 'Hint: Cash distributions paid out of corporate earnings to stockholders are called dividends.',
  'q-etf-1': 'Hint: An ETF bundles an entire basket of stocks or bonds together and trades like a single stock on an exchange.',
  'q-etf-2': 'Hint: Spreading investments across hundreds of companies in one fund provides instant portfolio diversification.',
  'q-etf-3': 'Hint: The ongoing annual percentage fee deducted to manage the fund is called the expense ratio.',
  'q-etf-4': 'Hint: ETFs trade intraday with real-time price updates while stock markets are open.',
  'q-opt-1': 'Hint: Call options give the right to buy shares; Put options give the right to sell shares.',
  'q-opt-2': 'Hint: Options contracts have an expiration date after which expired contracts have zero value.',
  'q-opt-3': 'Hint: Options carry high leverage risk and buyers can lose 100% of the premium paid.',
  'q-opt-4': 'Hint: The cash price paid upfront to purchase an option contract is known as the option premium.',
};

const TOPIC_QUIZ_HINTS: Record<string, Record<string, string>> = {
  'quiz-cd-basics': {
    q1: QUIZ_HINTS.q1,
    q2: QUIZ_HINTS.q2,
    q3: QUIZ_HINTS.q3,
    q4: QUIZ_HINTS.q4,
  },
  'quiz-hysa-basics': {
    q1: QUIZ_HINTS['q-hysa-2'],
    q2: QUIZ_HINTS['q-hysa-3'],
    q3: QUIZ_HINTS['q-hysa-4'],
    q4: 'Hint: When inflation outpaces your APY, your real purchasing power declines even though your balance grows nominally.',
  },
  'quiz-stock-basics': {
    q1: QUIZ_HINTS['q-stock-1'],
    q2: 'Hint: FDIC insures bank deposits; SIPC protects brokerage custody up to $500k, never market price losses.',
    q3: QUIZ_HINTS['q-stock-4'],
    q4: 'Hint: Putting all your money in one company exposes you to company-specific (idiosyncratic) risk.',
  },
  'quiz-etf-basics': {
    q1: QUIZ_HINTS['q-etf-1'],
    q2: QUIZ_HINTS['q-etf-4'],
    q3: QUIZ_HINTS['q-etf-3'],
    q4: QUIZ_HINTS['q-etf-2'],
  },
  'quiz-options-intro': {
    q1: QUIZ_HINTS['q-opt-1'],
    q2: QUIZ_HINTS['q-opt-4'],
    q3: QUIZ_HINTS['q-opt-2'],
    q4: QUIZ_HINTS['q-opt-3'],
  },
};

function renderFormattedInlineText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-[#222038]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface ParsedSection {
  title: string;
  lines: string[];
}

function parseLessonMarkdown(markdown: string): ParsedSection[] {
  const rawSections = markdown.split(/(?=###\s+)/g);
  const sections: ParsedSection[] = [];

  for (const raw of rawSections) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lines = trimmed.split('\n');
    let title = 'Core Concepts';
    let contentLines = lines;

    if (lines[0].startsWith('### ')) {
      title = lines[0].replace('### ', '').trim();
      contentLines = lines.slice(1);
    }

    sections.push({
      title,
      lines: contentLines,
    });
  }

  return sections;
}

function renderSectionLines(lines: string[]) {
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'bullet' | 'ordered'; items: string[] } | null = null;

  const flushList = () => {
    if (!currentList) return;
    if (currentList.type === 'ordered') {
      elements.push(
        <div key={elements.length} className="space-y-2 my-2">
          {currentList.items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-3 rounded-xl bg-[#fbfaff] border border-[#e8e4f1]"
            >
              <span className="w-5 h-5 rounded-md bg-[#eee6ff] text-[#4f32a9] font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="text-xs sm:text-sm leading-relaxed text-[#383354] flex-1">
                {renderFormattedInlineText(item)}
              </div>
            </div>
          ))}
        </div>
      );
    } else {
      elements.push(
        <div key={elements.length} className="space-y-2 my-2">
          {currentList.items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#fbfaff] border border-[#e8e4f1]"
            >
              <span className="w-2 h-2 rounded-full bg-[#5637ca] shrink-0 mt-2 ml-1" />
              <div className="text-xs sm:text-sm leading-relaxed text-[#383354] flex-1">
                {renderFormattedInlineText(item)}
              </div>
            </div>
          ))}
        </div>
      );
    }
    currentList = null;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    const numMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (numMatch) {
      if (!currentList || currentList.type !== 'ordered') {
        flushList();
        currentList = { type: 'ordered', items: [] };
      }
      currentList.items.push(numMatch[1]);
      return;
    }

    const bulletMatch = trimmed.match(/^-\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'bullet') {
        flushList();
        currentList = { type: 'bullet', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      return;
    }

    flushList();
    elements.push(
      <p key={elements.length} className="leading-relaxed text-[#383354] my-1.5">
        {renderFormattedInlineText(trimmed)}
      </p>
    );
  });

  flushList();
  return elements;
}

type ConceptProgress = { understoodMap: Record<number, boolean>; checkList: boolean[] };

function isConceptProgress(value: unknown): value is ConceptProgress {
  return isRecord(value) && isRecord(value.understoodMap)
    && Object.values(value.understoodMap).every((item) => typeof item === 'boolean')
    && Array.isArray(value.checkList) && value.checkList.length === 3
    && value.checkList.every((item) => typeof item === 'boolean');
}

function isQuizProgress(value: unknown): value is Record<string, ProgressItem> {
  return isRecord(value) && Object.values(value).every((item) => isRecord(item)
    && typeof item.lesson_id === 'string' && typeof item.quiz_version === 'number'
    && typeof item.attempt_count === 'number' && typeof item.completed === 'boolean'
    && typeof item.latest_score_pct === 'string' && typeof item.best_score_pct === 'string');
}

const CARD_TONES: Record<MicroCard['tone'], string> = {
  lavender: 'bg-[#eee6ff] border-[#cbb8f6] text-[#4f32a9]',
  mint: 'bg-[#e3f3d9] border-[#a7da8f] text-[#285137]',
  peach: 'bg-[#ffe9da] border-[#f5cdb2] text-[#7b402a]',
  lime: 'bg-[#ecfccb] border-[#a3e635] text-[#27400d]',
};

function DuolingoLessonDeck({
  topicId,
  fontSize,
  storageKey,
  onTuckUpdate,
  onJumpToQuiz,
}: {
  topicId: string;
  fontSize: 'normal' | 'large';
  storageKey?: string;
  onTuckUpdate: (speech: string) => void;
  onJumpToQuiz: () => void;
}) {
  const cards = TOPIC_MICRO_CARDS[topicId] || TOPIC_MICRO_CARDS['cd-basics'];
  const [activeCardIdx, setActiveCardIdx] = useState<number>(0);
  const [quickCheckSelections, setQuickCheckSelections] = useState<Record<string, number>>({});
  const [deckCelebrated, setDeckCelebrated] = useState<boolean>(false);

  const [{ understoodMap }, setConceptProgress] = useStoredPractice<ConceptProgress>(storageKey, () => (
    (storageKey && readPractice(storageKey, isConceptProgress)) || { understoodMap: {}, checkList: [false, false, false] }
  ));

  const activeCard = cards[activeCardIdx] || cards[0];
  const cardAnswer = quickCheckSelections[activeCard.id];
  const isCardCorrect = cardAnswer === activeCard.quickCheck.correctIndex;
  const completedCardsCount = cards.filter((_, idx) => !!understoodMap[idx]).length;
  const deckProgressPct = Math.max(
    Math.round(((activeCardIdx + 1) / cards.length) * 100),
    Math.round((completedCardsCount / cards.length) * 100)
  );

  const selectCard = (idx: number) => {
    soundFx.playTactileClick();
    setActiveCardIdx(idx);
    const nextCard = cards[idx];
    if (nextCard) {
      onTuckUpdate(nextCard.tuckSays);
    }
  };

  const handleQuickCheck = (optionIdx: number) => {
    setQuickCheckSelections((prev) => ({ ...prev, [activeCard.id]: optionIdx }));
    const correct = optionIdx === activeCard.quickCheck.correctIndex;
    if (correct) {
      soundFx.playCoinPing();
      onTuckUpdate(`Tuck says: ${activeCard.quickCheck.rightFeedback} 🌟`);
      setConceptProgress((prev) => ({
        ...prev,
        understoodMap: { ...prev.understoodMap, [activeCardIdx]: true },
      }));
    } else {
      soundFx.playFailureBuzzer();
      onTuckUpdate(`Tuck says: ${activeCard.quickCheck.wrongFeedback}`);
    }
  };

  const handleNextOrFinish = () => {
    setConceptProgress((prev) => ({
      ...prev,
      understoodMap: { ...prev.understoodMap, [activeCardIdx]: true },
    }));

    if (activeCardIdx < cards.length - 1) {
      const nextIdx = activeCardIdx + 1;
      soundFx.playTactileClick();
      setActiveCardIdx(nextIdx);
      onTuckUpdate(cards[nextIdx].tuckSays);
    } else {
      soundFx.playSuccessChord();
      triggerConfetti({ particleCount: 70 });
      setDeckCelebrated(true);
      onTuckUpdate('Tuck says: Woohoo! You crushed every card! Ready to earn +150 Aura on the Quiz? 🎉');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Duolingo Progress Bar & Step Dots */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-black text-[#222038] flex items-center gap-1.5">
            <span aria-hidden="true">⚡</span>
            <span>Card {activeCardIdx + 1} of {cards.length}</span>
          </span>
          <span className="font-extrabold px-2.5 py-0.5 rounded-full bg-[#e8fcd6] text-[#1e4620] border border-[#86efac]">
            {completedCardsCount}/{cards.length} Mastered
          </span>
        </div>

        <div className="h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#58cc02] via-[#76e600] to-[#a3e635] shadow-[0_0_12px_rgba(88,204,2,0.55)] transition-all duration-300"
            style={{ width: `${deckProgressPct}%` }}
          />
        </div>

        {/* Tactile 3D Step Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {cards.map((card, idx) => {
            const isSelected = idx === activeCardIdx;
            const isDone = !!understoodMap[idx];
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => selectCard(idx)}
                className={`px-3 py-2 text-xs text-left flex items-center gap-2 ${DUO_3D_BTN} ${
                  isSelected
                    ? 'bg-[#272047] text-white border-[#1b1533] border-b-[#120d24]'
                    : isDone
                    ? 'bg-[#e8fcd6] hover:bg-[#d8f8bd] text-[#1e4620] border-[#86efac] border-b-[#58cc02]'
                    : 'bg-white hover:bg-[#f6f3ff] text-[#222038] border-[#e2ddf0] border-b-[#cfc7e6]'
                }`}
              >
                <span className="text-base shrink-0" aria-hidden="true">
                  {isDone && !isSelected ? '✅' : card.icon}
                </span>
                <span className="truncate">{idx + 1}. {card.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Focused Bite-Sized Micro-Card */}
      <div className="rounded-3xl border-2 border-[#dfd5f8] bg-gradient-to-br from-white via-[#fbfaff] to-[#f4f0fd] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-b-4 grid place-items-center text-3xl sm:text-4xl shrink-0 ${
              CARD_TONES[activeCard.tone]
            }`}
            aria-hidden="true"
          >
            {activeCard.icon}
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${CARD_TONES[activeCard.tone]}`}>
                {activeCard.badge}
              </span>
              <h4 className="text-lg sm:text-xl font-black tracking-[-0.025em] text-[#222038]">
                {activeCard.title}
              </h4>
            </div>

            <p className={`font-semibold text-[#383354] leading-relaxed ${fontSize === 'large' ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}>
              {activeCard.body}
            </p>

            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#f3effa] border border-[#d3c2fb] text-xs font-extrabold text-[#4f32a9]">
              <span aria-hidden="true">🎯</span>
              <span>Takeaway: {activeCard.takeaway}</span>
            </div>
          </div>
        </div>

        {/* 1-Tap Duolingo Mini-Check */}
        <div className="rounded-2xl bg-white border-2 border-[#e8e4f1] p-4 space-y-2.5">
          <p className="text-xs sm:text-sm font-black text-[#222038]">
            {activeCard.quickCheck.prompt}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {activeCard.quickCheck.options.map((opt, optIdx) => {
              const chosen = cardAnswer === optIdx;
              const isRightOpt = optIdx === activeCard.quickCheck.correctIndex;
              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleQuickCheck(optIdx)}
                  className={`p-3 text-left text-xs sm:text-sm flex items-center justify-between gap-2 ${DUO_3D_BTN} ${
                    chosen
                      ? isRightOpt
                        ? 'bg-[#e8fcd6] border-[#58cc02] border-b-[#46a302] text-[#1e4620]'
                        : 'bg-[#fff1e6] border-[#f97316] border-b-[#c2410c] text-[#7b402a]'
                      : 'bg-[#fbfaff] hover:bg-[#f4f0fd] border-[#e2ddf0] border-b-[#cfc7e6] text-[#222038]'
                  }`}
                >
                  <span>{opt}</span>
                  {chosen && (
                    <span className="text-xs font-black shrink-0">
                      {isRightOpt ? '✓ +25 Aura!' : '↺ Try other'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {cardAnswer !== undefined && (
            <div
              role="status"
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border animate-fadeIn ${
                isCardCorrect
                  ? 'bg-[#e8fcd6] border-[#86efac] text-[#1e4620]'
                  : 'bg-[#fff1e6] border-[#fdba74] text-[#7b402a]'
              }`}
            >
              {isCardCorrect
                ? `🎉 ${activeCard.quickCheck.rightFeedback}`
                : `💡 ${activeCard.quickCheck.wrongFeedback}`}
            </div>
          )}
        </div>

        {/* Micro-Card Navigation Footer */}
        <div className="pt-2 border-t border-[#e8e4f1] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={activeCardIdx === 0}
            onClick={() => selectCard(Math.max(0, activeCardIdx - 1))}
            className={`px-4 py-2 text-xs bg-white hover:bg-[#f4f0fd] border-[#e2ddf0] border-b-[#cfc7e6] text-[#222038] disabled:opacity-40 disabled:cursor-not-allowed ${DUO_3D_BTN}`}
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={handleNextOrFinish}
            className={`px-5 py-2.5 text-xs sm:text-sm ${DUO_GREEN_BTN}`}
          >
            {activeCardIdx === cards.length - 1 ? 'Finish Cards 🎉' : 'Got it! Next →'}
          </button>
        </div>
      </div>

      {deckCelebrated && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-[#e8fcd6] border-2 border-[#58cc02] text-[#1e4620] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-scaleUp shadow-xs"
        >
          <div className="space-y-0.5">
            <p className="text-sm font-black">🎉 Lesson Cards Complete! +150 Aura up for grabs!</p>
            <p className="text-xs font-bold text-[#285137]">
              You crushed every concept! Now test what you learned on the Knowledge Check Quiz.
            </p>
          </div>
          <button
            type="button"
            onClick={onJumpToQuiz}
            className={`px-4 py-2 text-xs whitespace-nowrap ${DUO_GREEN_BTN}`}
          >
            Take Mastery Quiz ↓
          </button>
        </div>
      )}
    </div>
  );
}

export function LearningView({
  apiClient = defaultApiClient,
  useInternalScoring,
  initialTopicId = 'cd-basics',
  storageScope,
  quizzes = QUIZZES,
  serverAnswerKeys = SERVER_ANSWER_KEYS,
  onProgressUpdate,
}: LearningViewProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(() => normalizeTopicId(initialTopicId));
  const quizHeading = useRef<HTMLHeadingElement>(null);
  const topicHeading = useRef<HTMLHeadingElement>(null);

  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [isOverviewOpen, setIsOverviewOpen] = useState<boolean>(false);

  // Tuck live speech reaction
  const [tuckSpeechOverride, setTuckSpeechOverride] = useState<string | null>(null);

  // Hint expansion tracking per question id
  const [openHints, setOpenHints] = useState<Record<string, boolean>>({});

  // Active quiz state for current topic
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [attemptResult, setAttemptResult] = useState<QuizAttemptResponse | null>(null);

  const shouldScoreLocally = useInternalScoring ?? (apiClient.fixtureMode || typeof process !== 'undefined');
  const progressStorageKey = storageScope && shouldScoreLocally ? `quiz-progress:${storageScope}` : undefined;
  const [progressMap, setProgressMap] = useStoredPractice<Record<string, ProgressItem>>(progressStorageKey, () => {
    const stored = progressStorageKey && readPractice(progressStorageKey, isQuizProgress);
    if (stored) return stored;
    const initial: Record<string, ProgressItem> = {};
    for (const topic of LESSON_SUMMARIES) {
      initial[topic.id] = {
        lesson_id: topic.id,
        quiz_version: 1,
        attempt_count: 0,
        best_score_pct: '0.00',
        latest_score_pct: '0.00',
        completed: false,
      };
    }
    return initial;
  });

  useEffect(() => {
    if (!storageScope || shouldScoreLocally) return;
    let active = true;
    void apiClient.getProgress().then(({ items }) => {
      if (active) setProgressMap((current) => ({
        ...current,
        ...Object.fromEntries(items.filter((item) => item.attempt_count >= (current[item.lesson_id]?.attempt_count ?? 0))
          .map((item) => [item.lesson_id, item])),
      }));
    }).catch(() => { /* Quiz submission will surface connection or session errors. */ });
    return () => { active = false; };
  }, [apiClient, setProgressMap, shouldScoreLocally, storageScope]);

  const normalizedSelectedId = normalizeTopicId(selectedTopicId);
  const activeLesson: Lesson = LESSONS[normalizedSelectedId] || LESSONS['cd-basics'];
  const activeQuiz: Quiz = quizzes[activeLesson.quiz_id] || quizzes['quiz-cd-basics'];
  const activeProgress: ProgressItem = progressMap[normalizedSelectedId] || {
    lesson_id: normalizedSelectedId,
    quiz_version: 1,
    attempt_count: 0,
    best_score_pct: '0.00',
    latest_score_pct: '0.00',
    completed: false,
  };

  const completedCount = Object.values(progressMap).filter((p) => p.completed).length;
  const coursePct = LESSON_SUMMARIES.length > 0 ? Math.round((completedCount / LESSON_SUMMARIES.length) * 100) : 0;
  const girlMission = GIRL_MISSIONS[normalizedSelectedId] || GIRL_MISSIONS['cd-basics'];
  const defaultTuckLine =
    (TOPIC_MICRO_CARDS[normalizedSelectedId]?.[0]?.tuckSays) ||
    'Tuck says: Think of a CD like a time capsule for your money! 🐕🔒';
  const activeTuckSpeech = tuckSpeechOverride || defaultTuckLine;
  const fullGuideSections = useMemo(() => parseLessonMarkdown(activeLesson.body), [activeLesson.body]);

  // Handle switching topic
  const handleSelectTopic = (topicId: string) => {
    const nextTopic = normalizeTopicId(topicId);
    soundFx.playTactileClick();
    setSelectedTopicId(nextTopic);
    setSelectedAnswers({});
    setValidationError(null);
    setAttemptResult(null);
    setOpenHints({});
    setTuckSpeechOverride(null);
  };

  const scrollToLesson = () => {
    soundFx.playTactileClick();
    topicHeading.current?.focus({ preventScroll: true });
    topicHeading.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  };

  const scrollToQuiz = () => {
    soundFx.playTactileClick();
    quizHeading.current?.focus({ preventScroll: true });
    quizHeading.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  };

  const handleOptionSelect = (questionId: string, optionId: string) => {
    soundFx.playTactileClick();
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
    if (validationError) {
      setValidationError(null);
    }
  };

  const toggleHint = (qId: string) => {
    soundFx.playTactileClick();
    setOpenHints((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const unansweredQuestions = activeQuiz.questions.filter((q) => !selectedAnswers[q.id]);

    if (unansweredQuestions.length > 0) {
      soundFx.playFailureBuzzer();
      setValidationError(
        `Please answer all questions before submitting. (${unansweredQuestions.length} unanswered)`
      );
      return;
    }

    const attemptRequest: QuizAttemptRequest = {
      quiz_version: activeQuiz.version,
      answers: activeQuiz.questions.map((q) => ({
        question_id: q.id,
        option_id: selectedAnswers[q.id],
      })),
    };

    setIsSubmitting(true);

    try {
      let response: QuizAttemptResponse;

      if (shouldScoreLocally) {
        const serverKey = serverAnswerKeys[activeQuiz.id] || {
          answerKey: {},
          explanations: {},
        };
        response = evaluateQuizAttempt(activeQuiz, attemptRequest, serverKey);
      } else {
        response = await apiClient.submitQuizAttempt(activeQuiz.id, attemptRequest);
      }

      setAttemptResult(response);

      if (response.passed) {
        soundFx.playSuccessChord();
        triggerConfetti({ particleCount: 95 });
        setTuckSpeechOverride(
          `Tuck says: YES!! ${response.score_pct}% mastery — +150 Aura! You totally nailed this! 🎉🏆`
        );
        const currentAura = loadAuraState(storageScope);
        const awarded = syncLearningAwards(
          currentAura,
          { [`lesson-quiz:${normalizedSelectedId}`]: 150 },
          storageScope
        );
        if (awarded !== currentAura && typeof window !== 'undefined') {
          window.dispatchEvent(new Event('storage'));
        }
      } else {
        soundFx.playFailureBuzzer();
        setTuckSpeechOverride(
          'Tuck says: Almost there! Check my quick explanations below and give it one more shot! 💪'
        );
      }

      setProgressMap((prev) => {
        const current = prev[normalizedSelectedId] || {
          lesson_id: normalizedSelectedId,
          quiz_version: activeQuiz.version,
          attempt_count: 0,
          best_score_pct: '0.00',
          latest_score_pct: '0.00',
          completed: false,
        };

        const newAttemptCount = current.attempt_count + 1;
        const newLatestScore = response.score_pct;
        const currentBestNum = parseFloat(current.best_score_pct) || 0;
        const newScoreNum = parseFloat(response.score_pct) || 0;
        const newBestScore =
          newScoreNum > currentBestNum ? response.score_pct : current.best_score_pct;
        const isCompleted = current.completed || response.passed;

        const updated: ProgressItem = {
          lesson_id: normalizedSelectedId,
          quiz_version: activeQuiz.version,
          attempt_count: newAttemptCount,
          best_score_pct: newBestScore,
          latest_score_pct: newLatestScore,
          completed: isCompleted,
        };

        const nextMap = { ...prev, [normalizedSelectedId]: updated };
        onProgressUpdate?.(nextMap);

        if (response.passed) {
          questTracker.recordQuiz(newScoreNum, storageScope);
        }

        return nextMap;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to score quiz attempt';
      setValidationError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryQuiz = () => {
    soundFx.playTactileClick();
    setSelectedAnswers({});
    setValidationError(null);
    setAttemptResult(null);
    setTuckSpeechOverride('Tuck says: Fresh start! Take your time and trust what you learned! 🐾');
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const totalQuestions = activeQuiz.questions.length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-5 max-w-7xl mx-auto text-[#222038]">
      <TabOverviewModal
        tab="learning"
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
      />

      {/* Sleek Duolingo Header Bar */}
      <div className="rounded-3xl border-2 border-[#e8e4f1] bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#eee6ff] border-2 border-[#d3c2fb] grid place-items-center text-xl shrink-0" aria-hidden="true">
            🎓
          </div>
          <div>
            <span className="fw-kicker !text-[10px] block">FutureWorth Academy</span>
            <h2 className="text-lg sm:text-xl font-black tracking-[-0.03em] text-[#222038]">
              Financial Education &amp; Learning
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs font-extrabold px-3.5 py-2 rounded-2xl border-2 ${
              completedCount === LESSON_SUMMARIES.length
                ? 'bg-[#e8fcd6] text-[#1e4620] border-[#58cc02]'
                : 'bg-[#f4f0fd] text-[#4f32a9] border-[#dfd5f8]'
            }`}
          >
            Completed: {completedCount} of {LESSON_SUMMARIES.length} Topics
          </span>

          <button
            type="button"
            onClick={() => setIsOverviewOpen(true)}
            aria-label="What is Learn Tab?"
            className={`px-3.5 py-2 text-xs bg-white hover:bg-[#f4f0fd] border-[#e2ddf0] border-b-[#cfc7e6] text-[#222038] ${DUO_3D_BTN}`}
          >
            💡 Guide
          </button>

          <button
            type="button"
            onClick={scrollToQuiz}
            className={`px-4 py-2 text-xs ${DUO_GREEN_BTN}`}
          >
            Jump to Quiz ↓
          </button>
        </div>
      </div>

      {/* Main Grid: Tactile Duolingo Lesson Path + Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation List of all 5 topics */}
        <nav
          aria-label="Topics Navigation"
          className="lg:col-span-4 rounded-3xl border-2 border-[#e8e4f1] bg-white p-4 shadow-xs space-y-3.5"
        >
          <div className="px-1 flex items-center justify-between gap-2">
            <div>
              <span className="fw-kicker block">Lesson Path</span>
              <span className="text-base font-black tracking-[-0.025em] text-[#222038]">
                Pick a Bite-Sized Skill
              </span>
            </div>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#e8fcd6] text-[#1e4620] border border-[#86efac]">
              {completedCount}/{LESSON_SUMMARIES.length}
            </span>
          </div>

          <div className="h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#58cc02] to-[#a3e635] shadow-[0_0_10px_rgba(88,204,2,0.5)] transition-all duration-300"
              style={{ width: `${coursePct}%` }}
            />
          </div>

          <ul className="space-y-2.5" role="list">
            {LESSON_SUMMARIES.map((topic: LessonSummary, idx: number) => {
              const isSelected = topic.id === normalizedSelectedId;
              const isDone = progressMap[topic.id]?.completed;
              const visual = TOPIC_VISUALS[topic.id] || { icon: '◈', tone: 'bg-[#eee6ff] text-[#4f32a9]' };

              return (
                <li key={topic.id}>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectTopic(topic.id);
                      topicHeading.current?.focus({ preventScroll: true });
                      topicHeading.current?.scrollIntoView?.({ block: 'center' });
                    }}
                    aria-current={isSelected ? 'page' : undefined}
                    className={`w-full text-left px-3.5 py-3 text-sm flex items-center justify-between gap-2.5 ${DUO_3D_BTN} ${
                      isSelected
                        ? 'bg-[#272047] border-[#1b1533] border-b-[#120d24] text-white'
                        : isDone
                        ? 'bg-[#f4fde8] hover:bg-[#e8fcd6] border-[#86efac] border-b-[#58cc02] text-[#1e4620]'
                        : 'bg-[#fbfaff] hover:bg-[#f4f0fd] border-[#e2ddf0] border-b-[#cfc7e6] text-[#222038]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className={`w-10 h-10 rounded-xl grid place-items-center text-lg shrink-0 ${
                          isSelected ? 'bg-[#3d3270] text-[#dbfb84]' : visual.tone
                        }`}
                        aria-hidden="true"
                      >
                        {visual.icon}
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <span className="font-extrabold truncate leading-snug">{topic.title}</span>
                        <span
                          className={`text-xs font-bold ${
                            isSelected ? 'text-[#dbfb84]' : 'text-[#615d76]'
                          }`}
                        >
                          Unit {idx + 1} · {topic.topic}
                        </span>
                      </div>
                    </div>

                    {isDone && (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                          isSelected
                            ? 'bg-[#dbfb84] text-[#272047]'
                            : 'bg-[#58cc02] text-white'
                        }`}
                        title="Topic Completed"
                      >
                        ✓ Done
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content Area: Character Duo + Micro-Cards + Widgets + Quiz */}
        <div className="lg:col-span-8 space-y-5">
          {/* Tuck & Girl Character Guide Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Girl Character Mission Challenge */}
            <section
              aria-label="Maya Mission Challenge"
              className="rounded-3xl border-2 border-[#fcd34d] bg-gradient-to-br from-[#fffbeb] to-[#fef3c7]/60 p-4 flex items-center gap-3.5 shadow-xs"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-b-4 border-amber-500 bg-[#272047] shrink-0 shadow-xs">
                <img
                  src={paydayCover}
                  alt="Maya introducing the mission challenge"
                  className="w-full h-full object-cover object-[74%_18%] scale-125"
                />
              </div>

              <div className="relative flex-1 rounded-2xl bg-white border-2 border-amber-300 px-3.5 py-2.5 shadow-2xs">
                <span
                  aria-hidden="true"
                  className="hidden sm:block absolute -left-2 top-5 w-3.5 h-3.5 rotate-45 bg-white border-l-2 border-b-2 border-amber-300"
                />
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                  🎯 {girlMission.title}
                </span>
                <p className="text-xs font-bold text-[#222038] leading-snug mt-0.5">
                  &ldquo;{girlMission.challenge}&rdquo;
                </p>
              </div>
            </section>

            {/* Tuck Speech Bubble Companion */}
            <section
              aria-label="Tuck's Study Companion"
              className="rounded-3xl border-2 border-[#d3c2fb] bg-gradient-to-br from-[#f5f0ff] to-[#f2fde5] p-4 flex items-center gap-3.5 shadow-xs"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-2 border-b-4 border-[#b79cf7] grid place-items-center p-1.5 shrink-0 shadow-xs">
                <Tuck className="w-full h-full object-contain" />
              </div>

              <div className="relative flex-1 rounded-2xl bg-white border-2 border-[#cbb8f6] px-3.5 py-2.5 shadow-2xs">
                <span
                  aria-hidden="true"
                  className="hidden sm:block absolute -left-2 top-5 w-3.5 h-3.5 rotate-45 bg-white border-l-2 border-b-2 border-[#cbb8f6]"
                />
                <span className="text-[10px] font-black uppercase tracking-wider text-[#5637ca] block">
                  🐾 Coach Tuck
                </span>
                <p className="text-xs font-bold text-[#222038] leading-snug mt-0.5">
                  {activeTuckSpeech}
                </p>
              </div>
            </section>
          </div>

          {/* Main Duolingo Lesson Stage */}
          <Card className="!rounded-3xl border-2 border-[#e8e4f1] shadow-xs bg-white p-5 sm:p-6 space-y-5">
            {/* Header row with badges, level 3 heading, and tactile mode pills */}
            <div className="space-y-3.5 border-b border-[#e8e4f1] pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#eee6ff] text-[#4f32a9] border border-[#dfd5f8]">
                    {activeLesson.topic}
                  </span>
                  <span
                    data-testid="draft-status-badge"
                    className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-[#ffe9da] text-[#7b402a] border border-[#f5cdb2]"
                  >
                    Draft Content - Pending Review
                  </span>
                </div>

                <button
                  type="button"
                  title="Toggle larger reading font size"
                  aria-pressed={fontSize === 'large'}
                  onClick={() => setFontSize((f) => (f === 'normal' ? 'large' : 'normal'))}
                  className={`px-3 py-1.5 text-xs bg-white hover:bg-[#f4f0fd] border-[#e2ddf0] border-b-[#cfc7e6] text-[#222038] ${DUO_3D_BTN}`}
                >
                  {fontSize === 'normal' ? 'Aa+' : 'Aa-'}
                </button>
              </div>

              <h3
                ref={topicHeading}
                tabIndex={-1}
                className="text-2xl sm:text-3xl font-black tracking-[-0.035em] text-[#222038]"
              >
                {activeLesson.title}
              </h3>

              {/* Two-Step Journey Stepper: Lesson First, Quiz After */}
              <nav aria-label="Lesson Progress Steps" className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#f3effa] border-2 border-[#e8e4f1]">
                <button
                  type="button"
                  onClick={scrollToLesson}
                  className="py-2 px-3 rounded-xl text-xs font-black bg-[#272047] text-[#dbfb84] shadow-xs flex items-center justify-center gap-2 border border-[#1b1533] active:translate-y-0.5 transition-all select-none"
                >
                  <span>📖 Step 1: Interactive Lesson</span>
                </button>
                <button
                  type="button"
                  onClick={scrollToQuiz}
                  className="py-2 px-3 rounded-xl text-xs font-black bg-white hover:bg-[#f6f3ff] text-[#4f32a9] flex items-center justify-center gap-2 border border-[#e8e4f1] active:translate-y-0.5 transition-all select-none"
                >
                  <span>🎯 Step 2: Knowledge Check Quiz</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#dbfb84] text-[#272047] font-black">+150 Aura</span>
                </button>
              </nav>
            </div>

            {/* STEP 1: Focused Duolingo Interactive Micro-Cards */}
            <div className="space-y-5">
              <DuolingoLessonDeck
                key={normalizedSelectedId}
                topicId={normalizedSelectedId}
                fontSize={fontSize}
                storageKey={storageScope && `concepts:${storageScope}:${normalizedSelectedId}`}
                onTuckUpdate={(speech) => setTuckSpeechOverride(speech)}
                onJumpToQuiz={scrollToQuiz}
              />

              {/* Collapsed Deep-Dive Reference Textbook & Primary Sources */}
              <details className="rounded-2xl border-2 border-[#e8e4f1] bg-[#fbfaff] p-4 text-xs group">
                <summary className="font-extrabold cursor-pointer text-[#4f32a9] select-none flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span>📖</span>
                    <span>Deep-Dive Reference Textbook &amp; Official Sources (Optional)</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#7257e0]">Click to expand</span>
                </summary>

                <div className="mt-3 pt-3 border-t border-[#e8e4f1] space-y-4">
                  <div className={`space-y-4 ${fontSize === 'large' ? 'text-base' : 'text-sm'}`}>
                    {fullGuideSections.map((section, idx) => (
                      <div key={idx} className="space-y-1">
                        <h4 className="font-black text-[#222038]">{section.title}</h4>
                        {renderSectionLines(section.lines)}
                      </div>
                    ))}
                  </div>

                  {/* Authoritative Sources */}
                  <div className="border-t border-[#e8e4f1] pt-3.5">
                    <h4 className="fw-kicker mb-2">Authoritative Primary Sources</h4>
                    <ul className="space-y-1 text-xs" aria-label="Authoritative Source Links">
                      {activeLesson.source_links.map((link, idx) => (
                        <li key={idx}>
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#4f32a9] hover:text-[#272047] hover:underline font-medium break-all inline-flex items-center gap-1.5 transition-colors"
                          >
                            <span className="text-[#7257e0] text-[10px]" aria-hidden="true">↗</span>
                            <span>{link}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </details>
            </div>
          </Card>

          {/* STEP 2 DIVIDER */}
          <div className="pt-2 flex items-center gap-3">
            <div className="h-0.5 bg-[#dfd5f8] flex-1" />
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#272047] text-white shadow-xs">
              <span className="text-sm">🎯</span>
              <span className="text-xs font-black tracking-wider uppercase">Step 2 · Knowledge Check Quiz</span>
            </div>
            <div className="h-0.5 bg-[#dfd5f8] flex-1" />
          </div>

          {/* Topic Progress Summary */}
          <div className="rounded-3xl border-2 border-[#e8e4f1] bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-[#e8fcd6] border border-[#86efac] grid place-items-center text-lg" aria-hidden="true">
                🏆
              </span>
              <div>
                <h4 className="text-sm font-black text-[#222038]">Topic Progress Summary</h4>
                <p className="text-xs text-[#615d76]">Score 80%+ to master this skill.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="bg-[#f6f3ff] px-3 py-1.5 rounded-xl border border-[#e8e4f1]">
                <span className="text-[#615d76] font-medium">Attempts: </span>
                <span data-testid="progress-attempts" className="font-black text-[#222038] tabular-nums">
                  {activeProgress.attempt_count}
                </span>
              </div>
              <div className="bg-[#f6f3ff] px-3 py-1.5 rounded-xl border border-[#e8e4f1]">
                <span className="text-[#615d76] font-medium">Latest: </span>
                <span data-testid="progress-latest" className="font-black text-[#222038] tabular-nums">
                  {activeProgress.latest_score_pct}%
                </span>
              </div>
              <div className="bg-[#f6f3ff] px-3 py-1.5 rounded-xl border border-[#e8e4f1]">
                <span className="text-[#615d76] font-medium">Best: </span>
                <span data-testid="progress-best" className="font-black text-[#222038] tabular-nums">
                  {activeProgress.best_score_pct}%
                </span>
              </div>
              {activeProgress.completed ? (
                <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#e8fcd6] text-[#1e4620] border border-[#58cc02]">
                  ✓ Completed (80%+ Passed)
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-[#f3effa] text-[#615d76] border border-[#e8e4f1]">
                  Not Completed
                </span>
              )}
            </div>
          </div>

          {/* Knowledge Check Quiz Module */}
          <Card className="!rounded-3xl border-2 border-[#e8e4f1] shadow-xs bg-white p-5 sm:p-6 space-y-5">
            <div className="space-y-3 border-b border-[#e8e4f1] pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="fw-kicker block">Mastery Check</span>
                  <h3
                    ref={quizHeading}
                    tabIndex={-1}
                    className="text-lg sm:text-xl font-black tracking-[-0.03em] text-[#222038] mt-0.5"
                  >
                    Knowledge Check Quiz
                  </h3>
                  <p className="text-xs text-[#615d76] mt-0.5">
                    {activeQuiz.questions.length} quick questions • Score 80%+ for +150 Aura!
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#eee6ff] text-[#4f32a9] border border-[#dfd5f8]">
                    Pass: 80%
                  </span>
                  <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-full bg-[#272047] text-[#dbfb84] tabular-nums">
                    {answeredCount}/{totalQuestions} Answered ({progressPercent}%)
                  </span>
                </div>
              </div>

              {/* Duolingo Glowing Progress Bar */}
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#58cc02] via-[#76e600] to-[#a3e635] shadow-[0_0_12px_rgba(88,204,2,0.55)] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Validation Alert */}
            {validationError && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-[#ffe9da] border-2 border-[#f97316] text-[#7b402a] text-sm font-bold flex items-center justify-between animate-fadeIn"
              >
                <span>⚠️ {validationError}</span>
              </div>
            )}

            {/* Attempt Result Banner & Feedback */}
            {attemptResult ? (
              <div className="space-y-5 animate-fadeIn">
                <div
                  role="alert"
                  data-testid="quiz-result-banner"
                  className={`p-5 rounded-3xl border-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                    attemptResult.passed
                      ? 'bg-[#e8fcd6] border-[#58cc02] text-[#1e4620]'
                      : 'bg-[#ffe9da] border-[#f97316] text-[#7b402a]'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-white border-2 border-current/20 grid place-items-center p-1 shrink-0">
                      <Tuck className="w-full h-full object-contain" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-black">
                          {attemptResult.passed ? '🎉 Passed!' : '⚠️ Needs Review'}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-extrabold bg-white/85">
                          {attemptResult.passed ? 'Status: Passed' : 'Status: Failed'}
                        </span>
                        {attemptResult.passed && (
                          <span className="text-xs px-3 py-0.5 rounded-full font-black bg-[#58cc02] text-white shadow-xs">
                            +150 Aura!
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold">
                        {attemptResult.passed
                          ? 'Congratulations! You achieved at least the 80% passing threshold.'
                          : 'You did not achieve the required 80% passing threshold. Review the explanations below and try again.'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right sm:border-l-2 sm:pl-6 border-current/15">
                    <div data-testid="quiz-score-pct" className="text-3xl font-black font-mono tabular-nums">
                      {attemptResult.score_pct}%
                    </div>
                    <div data-testid="quiz-correct-count" className="text-xs font-extrabold opacity-90">
                      {attemptResult.correct} of {attemptResult.total} correct
                    </div>
                  </div>
                </div>

                {/* Explanations */}
                <div className="space-y-3">
                  <h4 className="fw-kicker">Detailed Explanations</h4>
                  {activeQuiz.questions.map((question, qIdx) => {
                    const feedbackItem = attemptResult.feedback.find(
                      (f) => f.question_id === question.id
                    );
                    const isCorrect = feedbackItem?.correct ?? false;
                    const selectedOptId = selectedAnswers[question.id];
                    const selectedOption = question.options.find((o) => o.id === selectedOptId);

                    return (
                      <div
                        key={question.id}
                        className={`p-4 rounded-2xl border-2 transition-all space-y-2 ${
                          isCorrect
                            ? 'bg-[#f4fde8] border-[#86efac]'
                            : 'bg-[#fff1e6] border-[#fdba74]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-extrabold text-[#222038]">
                            {qIdx + 1}. {question.prompt}
                          </p>
                          <span
                            className={`shrink-0 text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                              isCorrect
                                ? 'bg-[#58cc02] text-white'
                                : 'bg-[#f97316] text-white'
                            }`}
                          >
                            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                        </div>

                        <p className="text-xs text-[#615d76]">
                          <span className="font-bold text-[#222038]">Your selection: </span>
                          {selectedOption?.text || 'None'}
                        </p>

                        <div className="p-3 rounded-xl bg-white border border-[#e8e4f1] text-xs text-[#383354]">
                          <span className="font-extrabold text-[#222038]">Explanation: </span>
                          {feedbackItem?.explanation || 'No explanation provided.'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-[#e8e4f1] flex justify-end">
                  <button
                    type="button"
                    onClick={handleRetryQuiz}
                    className={`w-full sm:w-auto px-6 py-3 text-sm ${DUO_PURPLE_BTN}`}
                  >
                    Retry Quiz
                  </button>
                </div>
              </div>
            ) : (
              /* Duolingo-Style Tactile Quiz Questions Form */
              <form onSubmit={handleSubmitQuiz} className="space-y-5">
                {activeQuiz.questions.map((question, qIdx) => {
                  const promptId = `prompt-${question.id}`;
                  const hintText =
                    TOPIC_QUIZ_HINTS[activeQuiz.id]?.[question.id] ?? QUIZ_HINTS[question.id];
                  const isHintOpen = !!openHints[question.id];

                  return (
                    <fieldset
                      key={question.id}
                      role="radiogroup"
                      aria-labelledby={promptId}
                      className="border-2 border-[#e8e4f1] rounded-3xl p-4 sm:p-5 bg-[#fbfaff] space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <legend
                          id={promptId}
                          className="text-sm sm:text-base font-black text-[#222038] px-1"
                        >
                          {qIdx + 1}. {question.prompt}
                        </legend>

                        {hintText && (
                          <button
                            type="button"
                            onClick={() => toggleHint(question.id)}
                            className={`text-xs shrink-0 flex items-center gap-1 bg-[#eee6ff] hover:bg-[#e4d9ff] px-3 py-1.5 border-[#d3c2fb] border-b-[#b79cf7] text-[#4f32a9] ${DUO_3D_BTN}`}
                          >
                            <span aria-hidden="true">💡</span>
                            <span>{isHintOpen ? 'Hide Hint' : 'Need Hint?'}</span>
                          </button>
                        )}
                      </div>

                      {isHintOpen && hintText && (
                        <div className="p-3 rounded-2xl bg-white border-2 border-[#d3c2fb] text-xs text-[#4f32a9] font-bold flex items-center gap-2.5 animate-fadeIn">
                          <Tuck className="w-8 h-8 object-contain shrink-0" />
                          <span>{hintText}</span>
                        </div>
                      )}

                      <div className="space-y-2.5 pt-1">
                        {question.options.map((option, optIdx) => {
                          const inputId = `opt-${question.id}-${option.id}`;
                          const isChecked = selectedAnswers[question.id] === option.id;
                          const letter = String.fromCharCode(65 + optIdx);

                          return (
                            <div
                              key={option.id}
                              onClick={(e) => {
                                const target = e.target as HTMLElement;
                                if (target.tagName !== 'INPUT' && !target.closest('label')) {
                                  handleOptionSelect(question.id, option.id);
                                }
                              }}
                              className={`flex items-start gap-3 p-3.5 text-xs sm:text-sm ${DUO_3D_BTN} ${
                                isChecked
                                  ? 'bg-[#e8fcd6] border-[#58cc02] border-b-[#46a302] text-[#1e4620]'
                                  : 'bg-white border-[#e2ddf0] border-b-[#cfc7e6] text-[#383354] hover:border-[#b7a5f5] hover:bg-[#f9f6ff]'
                              }`}
                            >
                              <input
                                type="radio"
                                id={inputId}
                                name={`question_${question.id}`}
                                value={option.id}
                                checked={isChecked}
                                onChange={() => handleOptionSelect(question.id, option.id)}
                                aria-checked={isChecked}
                                className="mt-1 h-4 w-4 accent-[#58cc02] shrink-0"
                              />
                              <span
                                className={`w-6 h-6 rounded-lg text-[11px] font-black grid place-items-center shrink-0 mt-0.5 border ${
                                  isChecked
                                    ? 'bg-[#58cc02] text-white border-[#46a302]'
                                    : 'bg-[#f3effa] text-[#4f32a9] border-[#dfd5f8]'
                                }`}
                                aria-hidden="true"
                              >
                                {letter}
                              </span>
                              <label
                                htmlFor={inputId}
                                className="flex-1 select-none leading-snug cursor-pointer"
                              >
                                {option.text}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#e8e4f1]">
                  <span className="text-xs text-[#615d76] font-extrabold">
                    {answeredCount} of {totalQuestions} answered
                  </span>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-6 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${DUO_GREEN_BTN}`}
                  >
                    {isSubmitting ? 'Checking...' : 'Submit Quiz'}
                  </button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default LearningView;

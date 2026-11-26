import React, { useState, useMemo, useEffect, useId, useRef } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ApiClient, defaultApiClient } from '../../api/client';
import { Lesson, LessonSummary, ProgressItem, Quiz, QuizAttemptRequest, QuizAttemptResponse } from '../../api/types';
import { LESSONS, LESSON_SUMMARIES } from './content/lessonDefinitions';
import { QUIZZES } from './content/quizDefinitions';
import { SERVER_ANSWER_KEYS, QuizScoringData } from './content/serverAnswerKeys';
import { evaluateQuizAttempt } from './quizScoring';
import { MarketStrategiesLab } from './strategies/MarketStrategiesLab';
import { TabOverviewModal } from '../../components/common/TabOverviewModal';
import {
  InstrumentLifecycleDiagram,
  InteractiveWhatIfTool,
  InteractiveGoalMatcher,
} from './components/InteractiveConceptWidgets';
import { questTracker } from '../gamification/questTrackerService';
import { isRecord, readPractice, useStoredPractice } from '../practiceStorage';
import { calculateGrowth } from '../calculators/calculatorMath';
import { Tuck } from '../home/Tuck';
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

interface Scenario {
  name: string;
  role: string;
  situation: string;
  takeaway: string;
  tag: string;
}

function normalizeTopicId(topicId: string): string {
  if (topicId === 'stocks-basics') return 'stock-basics';
  if (topicId === 'options-basics') return 'options-intro';
  return topicId;
}

const TOPIC_VISUALS: Record<string, { icon: string; tone: 'fw-lavender' | 'fw-mint' | 'fw-peach' }> = {
  'cd-basics': { icon: '◈', tone: 'fw-lavender' },
  'hysa-basics': { icon: '✧', tone: 'fw-mint' },
  'stock-basics': { icon: '↗', tone: 'fw-peach' },
  'stocks-basics': { icon: '↗', tone: 'fw-peach' },
  'etf-basics': { icon: '◫', tone: 'fw-lavender' },
  'options-intro': { icon: '◷', tone: 'fw-peach' },
  'options-basics': { icon: '◷', tone: 'fw-peach' },
};

const TUCK_TAKEAWAYS: Record<string, string> = {
  'cd-basics':
    "Tuck's Takeaway: Lock in the 5% APY for planned tuition, but always keep your emergency cash liquid!",
  'hysa-basics':
    "Tuck's Takeaway: Old banks pay 0.01% pennies. High-yield accounts pay 4.5%+ dollars, liquid anytime.",
  'stock-basics':
    "Tuck's Takeaway: You're an equity owner now. Ignore daily noise; focus on corporate earnings and 5+ year horizons.",
  'stocks-basics':
    "Tuck's Takeaway: You're an equity owner now. Ignore daily noise; focus on corporate earnings and 5+ year horizons.",
  'etf-basics':
    "Tuck's Takeaway: Don't look for the needle in the haystack. Own the whole haystack with index ETFs.",
  'options-intro':
    "Tuck's Takeaway: Leverage cuts both ways. Time decay is real—learn defined risk before trading.",
  'options-basics':
    "Tuck's Takeaway: Leverage cuts both ways. Time decay is real—learn defined risk before trading.",
};

const STOCK_SCENARIOS: Scenario[] = [
  {
    name: 'Carlos S.',
    role: 'First-Generation Investor',
    situation: 'Purchased 2 shares of an enterprise software company for $150.',
    takeaway:
      'Understands he is an equity co-owner. Price fluctuates day-to-day, but he participates in long-term corporate earnings and dividends.',
    tag: 'Equity Ownership',
  },
  {
    name: 'Amina T.',
    role: 'Market Volatility Awareness',
    situation: 'Experienced a 10% temporary dip during market earnings season.',
    takeaway:
      'Learned why stocks are suited for multi-year horizons rather than money needed next semester.',
    tag: 'Market Risk',
  },
];

const OPTIONS_SCENARIOS: Scenario[] = [
  {
    name: 'Kai P.',
    role: 'Educational Hedger',
    situation: 'Simulates buying a Put option contract to learn portfolio hedging during volatility.',
    takeaway:
      'Options have fixed expiration dates. Leverage means 100% loss of paid premium is common; never risk essential cash.',
    tag: 'Educational Safety',
  },
];

const TOPIC_SCENARIOS: Record<string, Scenario[]> = {
  'cd-basics': [
    {
      name: 'Elena R.',
      role: 'Tuition Deadline Saver',
      situation: 'Has $3,000 saved for college tuition due in exactly 12 months.',
      takeaway:
        'She chooses a 1-year CD at 5.0% APY. Her return is locked at $150 guaranteed with 0% market risk.',
      tag: 'Targeted Goal',
    },
    {
      name: 'Jamal M.',
      role: 'Emergency Cash Lesson',
      situation: 'Locked all his $800 savings into a 2-year CD. Two months later his laptop motherboard died.',
      takeaway:
        'Breaking the CD early triggered a 90-day early withdrawal penalty. Lesson: Keep emergency funds liquid!',
      tag: 'Liquidity Caution',
    },
    {
      name: 'Marcus & Sophia',
      role: 'CD Ladder Strategists',
      situation: 'Split $8,000 into 4 separate CDs maturing every 6 months (6, 12, 18, 24 mo).',
      takeaway:
        'Gets higher locked yields while ensuring fresh cash becomes accessible every 6 months.',
      tag: 'CD Ladder',
    },
  ],
  'hysa-basics': [
    {
      name: 'Maya K.',
      role: 'Working Student',
      situation: 'Keeps a $1,200 emergency fund in a digital bank paying 4.5% APY.',
      takeaway:
        'Earns $54/year in interest instead of $0.12 at her old brick-and-mortar bank, and can withdraw anytime via ACH.',
      tag: 'Emergency Cushion',
    },
    {
      name: 'David L.',
      role: 'Rate-Watch Saver',
      situation:
        'Noticed his HYSA yield moved from 4.75% to 4.25% after the Federal Reserve cut benchmark interest rates.',
      takeaway:
        'Recognized that unlike fixed CDs, HYSA yields are variable and float with macroeconomic conditions.',
      tag: 'Variable Yield',
    },
  ],
  'stock-basics': STOCK_SCENARIOS,
  'stocks-basics': STOCK_SCENARIOS,
  'etf-basics': [
    {
      name: 'Jordan W.',
      role: 'Index Fund Saver',
      situation: 'Invests $100/month into an S&P 500 index ETF (SPY/VOO) with a 0.03% expense ratio.',
      takeaway:
        'Owns 500 top companies with one trade. The annual fee is only 30 cents per $1,000 invested.',
      tag: 'Instant Diversification',
    },
    {
      name: 'Chloe P.',
      role: 'Single Stock vs ETF Test',
      situation: 'Compared owning 1 retail stock vs a broad-market ETF when that retail chain slumped.',
      takeaway:
        'Broad diversification cushioned the impact; the index stayed resilient even as one company dropped.',
      tag: 'Risk Reduction',
    },
  ],
  'options-intro': OPTIONS_SCENARIOS,
  'options-basics': OPTIONS_SCENARIOS,
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
        <div key={elements.length} className="space-y-2 my-3">
          {currentList.items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3.5 rounded-[15px] bg-[#fbfaff] border border-[#e8e4f1]"
            >
              <span className="w-6 h-6 rounded-[8px] bg-[#eee6ff] text-[#4f32a9] font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
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
        <div key={elements.length} className="space-y-2 my-3">
          {currentList.items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-3 rounded-[15px] bg-[#fbfaff] border border-[#e8e4f1]"
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
      <p key={elements.length} className="leading-relaxed text-[#383354] my-2">
        {renderFormattedInlineText(trimmed)}
      </p>
    );
  });

  flushList();
  return elements;
}

function getExecutiveTakeaway(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('penalty') || lower.includes('early') || lower.includes('trade-off')) {
    return 'Liquid cash surrender trade-off: Withdrawing before maturity triggers a 90 to 180-day interest penalty, which can even reduce principal if broken prematurely.';
  }
  if (lower.includes('safety') || lower.includes('protection') || lower.includes('fdic')) {
    return 'Backed by the US government: Standard deposits are protected up to $250,000 per depositor per bank, eliminating nominal default risk.';
  }
  if (lower.includes('how') || lower.includes('work') || lower.includes('mechanics')) {
    return 'Lump-sum contract: Your rate of return is fixed on day one; interest compounds continuously with zero market fluctuations.';
  }
  if (lower.includes('when to choose') || lower.includes('ladder') || lower.includes('strategy')) {
    return 'Goal alignment: Ideal for strict non-negotiable milestones (tuition, down payment) or rate hedging via staggered maturity ladders.';
  }
  if (lower.includes('stock') || lower.includes('equity')) {
    return 'True fractional equity ownership: Participates directly in corporate revenue, cash dividends, and multi-year economic value creation.';
  }
  if (lower.includes('etf') || lower.includes('index')) {
    return 'Instant broad diversification: Replaces single-stock bankruptcy risk with an entire basket of 500+ top companies for a 0.03% expense ratio.';
  }
  if (lower.includes('option') || lower.includes('primer')) {
    return 'High-leverage time decay: Options expire rapidly; buyers frequently lose 100% of their upfront premium. Strict education only.';
  }
  return 'Core financial mechanism designed to build disciplined, wealth-generating habits with zero guesswork.';
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

function RichCurriculumContent({
  body,
  fontSize,
  storageKey,
}: {
  body: string;
  fontSize: 'normal' | 'large';
  storageKey?: string;
}) {
  const sections = useMemo(() => parseLessonMarkdown(body), [body]);
  const [activeConceptIdx, setActiveConceptIdx] = useState<number>(0);
  const [{ understoodMap, checkList }, setConceptProgress] = useStoredPractice<ConceptProgress>(storageKey, () => (
    (storageKey && readPractice(storageKey, isConceptProgress)) || { understoodMap: {}, checkList: [false, false, false] }
  ));
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});

  const toggleSection = (idx: number) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const activeSec = sections[activeConceptIdx] || sections[0];
  const activeLower = activeSec ? activeSec.title.toLowerCase() : '';
  const isActiveWarning =
    activeLower.includes('penalty') ||
    activeLower.includes('risk') ||
    activeLower.includes('trade-off') ||
    activeLower.includes('caution');
  const isActiveSafety =
    activeLower.includes('safety') ||
    activeLower.includes('protection') ||
    activeLower.includes('fdic') ||
    activeLower.includes('sipc');
  const isActiveDefinition =
    activeLower.includes('what is') || activeLower.includes('introduction') || activeLower.includes('primer');
  const isActiveAction =
    activeLower.includes('when to choose') ||
    activeLower.includes('role') ||
    activeLower.includes('how') ||
    activeLower.includes('instant');

  const activeBadgeText = isActiveWarning
    ? 'Risk & Trade-Off'
    : isActiveSafety
    ? 'Safety & Protection'
    : isActiveDefinition
    ? 'Core Definition'
    : isActiveAction
    ? 'Practical Strategy'
    : 'Market Mechanics';

  const activeBadgeTone = isActiveWarning
    ? 'fw-peach border border-[#f5cdb2]'
    : isActiveSafety
    ? 'fw-mint border border-[#c3e2b0]'
    : 'fw-lavender border border-[#dfd5f8]';

  return (
    <div className="space-y-6">
      {/* Concept Navigator Pills */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-[16px] bg-[#f3effa] border border-[#e8e4f1]">
        {sections.map((sec, idx) => {
          const isSelected = idx === activeConceptIdx;
          const isDone = !!understoodMap[idx];
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveConceptIdx(idx)}
              className={`px-3 py-1.5 rounded-[11px] text-xs font-bold transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#5637ca] text-white shadow-xs'
                  : isDone
                  ? 'bg-[#e3f3d9] text-[#285137] hover:bg-[#d7edc8]'
                  : 'text-[#615d76] hover:text-[#222038] hover:bg-white/80'
              }`}
            >
              <span className="text-[10px] opacity-80">{isDone ? '✓' : `${idx + 1}`}</span>
              <span className="truncate max-w-[150px] sm:max-w-[200px]">
                {sec.title.replace('###', '').trim()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Concept Card */}
      {activeSec && (
        <div className="fw-panel !rounded-[21px] border border-[#e8e4f1] bg-white p-5 sm:p-6 shadow-[0_6px_22px_rgba(39,32,71,0.04)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8e4f1] pb-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="fw-kicker">
                Part {activeConceptIdx + 1} of {sections.length}
              </span>
              <h4 className="text-base sm:text-lg font-black tracking-[-0.03em] text-[#222038]">
                {activeSec.title}
              </h4>
            </div>
            <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold ${activeBadgeTone}`}>
              {activeBadgeText}
            </span>
          </div>

          {/* Editorial Key Takeaway */}
          <div className="p-4 rounded-[16px] bg-[#f4f0fd] border border-[#dfd5f8] border-l-4 border-l-[#5637ca] space-y-1">
            <span className="fw-kicker block">Key Insight</span>
            <p className="text-xs sm:text-sm font-semibold text-[#222038] leading-relaxed">
              {getExecutiveTakeaway(activeSec.title)}
            </p>
          </div>

          {/* Content Lines */}
          <div className={`space-y-3 pt-1 ${fontSize === 'large' ? 'text-base' : 'text-sm'}`}>
            {renderSectionLines(activeSec.lines)}
          </div>

          {/* Card Footer Controls */}
          <div className="pt-3.5 border-t border-[#e8e4f1] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setConceptProgress((previous) => {
                  const understood = !previous.understoodMap[activeConceptIdx];
                  return {
                    understoodMap: { ...previous.understoodMap, [activeConceptIdx]: understood },
                    checkList: previous.checkList.map((checked, idx) =>
                      idx === activeConceptIdx ? understood : checked
                    ),
                  };
                });
              }}
              className={`px-3.5 py-2 rounded-[11px] text-xs font-extrabold border transition-all flex items-center gap-1.5 ${
                understoodMap[activeConceptIdx]
                  ? 'bg-[#e3f3d9] text-[#285137] border-[#b7dc9f]'
                  : 'bg-white hover:bg-[#f4f0fd] text-[#222038] border-[#e8e4f1] hover:border-[#cfc1fa]'
              }`}
            >
              <span>{understoodMap[activeConceptIdx] ? '✓' : '○'}</span>
              <span>
                {understoodMap[activeConceptIdx] ? 'Concept Mastered' : 'Mark as Understood'}
              </span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={activeConceptIdx === 0}
                onClick={() => setActiveConceptIdx((p) => Math.max(0, p - 1))}
                className="px-3.5 py-2 text-xs rounded-[11px] border border-[#e8e4f1] bg-white hover:bg-[#f4f0fd] hover:border-[#cfc1fa] disabled:opacity-40 disabled:cursor-not-allowed font-bold text-[#222038] transition-colors"
              >
                ← Prev
              </button>
              <button
                type="button"
                disabled={activeConceptIdx === sections.length - 1}
                onClick={() => setActiveConceptIdx((p) => Math.min(sections.length - 1, p + 1))}
                className="px-4 py-2 text-xs rounded-[11px] bg-[#5637ca] hover:bg-[#4626ad] disabled:bg-[#eeeaf5] disabled:text-[#726a83] disabled:cursor-not-allowed font-bold text-white shadow-2xs transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible reference cards for remaining sections so all text is 100% accessible in DOM */}
      <div className="space-y-2.5">
        <h5 className="fw-kicker">All Curriculum Sections</h5>
        {sections.map((section, sIdx) => {
          if (sIdx === activeConceptIdx) return null;
          const isCollapsed = collapsedSections[sIdx] !== false;

          return (
            <div
              key={sIdx}
              className="fw-panel !rounded-[16px] border border-[#e8e4f1] bg-white p-3.5 hover:border-[#cbb8f6] transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleSection(sIdx)}
                  aria-expanded={!isCollapsed}
                  className="text-left text-xs font-extrabold text-[#222038] flex items-center gap-2 flex-1"
                >
                  <span aria-hidden="true" className="text-[#5b43a7] text-[10px]">
                    {isCollapsed ? '▶' : '▼'}
                  </span>
                  <span>{section.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveConceptIdx(sIdx)}
                  className="text-[11px] font-bold text-[#4f32a9] hover:text-[#272047] px-2.5 py-1 rounded-[9px] bg-[#f4f0fd] hover:bg-[#eee6ff] transition-colors"
                >
                  Focus View →
                </button>
              </div>

              {!isCollapsed && (
                <div
                  className={`space-y-3 pt-3 border-t border-[#e8e4f1] mt-2.5 ${
                    fontSize === 'large' ? 'text-base' : 'text-sm'
                  }`}
                >
                  {renderSectionLines(section.lines)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Concept Checkoff */}
      <div className="fw-panel !rounded-[21px] border border-[#dfd5f8] bg-[#f8f5ff] p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h5 className="fw-kicker">Concept Verification Checklist</h5>
          <span className="text-xs text-[#4f32a9] font-extrabold px-2.5 py-0.5 rounded-full bg-[#eee6ff]">
            {checkList.filter(Boolean).length} of 3 Mastered
          </span>
        </div>

        <div className="space-y-2">
          {[
            'I understand the primary mechanism of how this instrument generates returns or locks interest.',
            'I know the regulatory safety guarantee (FDIC $250k / EU DGS €100k / SIPC $500k).',
            'I recognize the key liquidity trade-offs and time horizon suitability.',
          ].map((item, idx) => (
            <label
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-[14px] border text-xs cursor-pointer transition-colors ${
                checkList[idx]
                  ? 'border-[#b7dc9f] bg-[#e3f3d9]/80 text-[#285137] font-semibold'
                  : 'border-[#e8e4f1] bg-white text-[#222038] hover:border-[#cfc1fa] hover:bg-[#fbf9ff]'
              }`}
            >
              <input
                type="checkbox"
                checked={checkList[idx]}
                onChange={() => {
                  setConceptProgress((previous) => ({
                    ...previous,
                    checkList: previous.checkList.map((checked, itemIndex) =>
                      itemIndex === idx ? !checked : checked
                    ),
                  }));
                }}
                className="rounded border-[#cfc1fa] accent-[#5637ca] mt-0.5"
              />
              <span className="leading-relaxed">{item}</span>
            </label>
          ))}
        </div>

        {checkList.every(Boolean) && (
          <div className="p-3.5 rounded-[14px] bg-[#e3f3d9] border border-[#b7dc9f] text-[#285137] text-xs font-bold flex items-center justify-between">
            <span>✓ All 3 foundational concepts verified. Ready for the Knowledge Check!</span>
          </div>
        )}
      </div>
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

  const [activeTab, setActiveTab] = useState<'interactive' | 'strategies' | 'reader' | 'matrix'>('interactive');
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [isOverviewOpen, setIsOverviewOpen] = useState<boolean>(false);

  // Streamlined Interactive Studio tool selector
  const [activeStudioTool, setActiveStudioTool] = useState<'lifecycle' | 'whatif' | 'simulator' | 'scenarios' | 'matcher'>('lifecycle');

  // Interactive Mini-Simulator State
  const [simDeposit, setSimDeposit] = useState<number>(1000);
  const [simApy, setSimApy] = useState<number>(5.0);
  const [simMonths, setSimMonths] = useState<number>(12);
  const savingsInputId = useId();

  // Active Persona for Case Studies
  const [activePersonaIdx, setActivePersonaIdx] = useState<number>(0);

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
  const scenarios = TOPIC_SCENARIOS[normalizedSelectedId] || TOPIC_SCENARIOS['cd-basics'];
  const tuckTakeaway = TUCK_TAKEAWAYS[normalizedSelectedId] || TUCK_TAKEAWAYS['cd-basics'];

  // Handle switching topic
  const handleSelectTopic = (topicId: string) => {
    const nextTopic = normalizeTopicId(topicId);
    setSelectedTopicId(nextTopic);
    setSelectedAnswers({});
    setValidationError(null);
    setAttemptResult(null);
    setOpenHints({});
    setActivePersonaIdx(0);
    if (nextTopic === 'hysa-basics') {
      setSimApy(4.5);
      setSimMonths(12);
    } else if (nextTopic === 'cd-basics') {
      setSimApy(5.0);
      setSimMonths(12);
    } else {
      setSimDeposit(1000);
    }
  };

  const scrollToQuiz = () => {
    quizHeading.current?.focus({ preventScroll: true });
    quizHeading.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  };

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
    if (validationError) {
      setValidationError(null);
    }
  };

  const toggleHint = (qId: string) => {
    setOpenHints((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const unansweredQuestions = activeQuiz.questions.filter((q) => !selectedAnswers[q.id]);

    if (unansweredQuestions.length > 0) {
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
    setSelectedAnswers({});
    setValidationError(null);
    setAttemptResult(null);
  };

  // Simulator math
  const isSavingsTopic = normalizedSelectedId === 'cd-basics' || normalizedSelectedId === 'hysa-basics';
  const savingsInputs = { mode: 'savings' as const, startingAmount: simDeposit, monthlyContribution: 0, horizonMonths: simMonths };
  const savingsExample = calculateGrowth({ ...savingsInputs, annualRatePercent: simApy });
  const baselineInterest = calculateGrowth({ ...savingsInputs, annualRatePercent: 0.01 }).totalGrowth;
  const penaltyEst = simDeposit * (simApy / 100) * (3 / 12);

  const answeredCount = Object.keys(selectedAnswers).length;
  const totalQuestions = activeQuiz.questions.length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-[#222038]">
      <TabOverviewModal
        tab="learning"
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
      />

      {/* Cinematic FutureWorth Academy Hero Banner */}
      <article className="fw-hero shadow-[0_14px_40px_rgba(39,32,71,0.16)]" aria-label="FutureWorth Academy Hero">
        <div className="fw-hero-art" aria-hidden="true" />
        <div className="fw-hero-content">
          <p className="fw-hero-tag">✦ FUTUREWORTH ACADEMY</p>
          <h2>Knowledge is your leverage.</h2>
          <p>
            Master compound growth, debt shields, and portfolio allocation with interactive labs.
          </p>
          <button
            type="button"
            className="fw-button fw-button-lime"
            onClick={scrollToQuiz}
          >
            Jump to knowledge check <span aria-hidden="true">↓</span>
          </button>
        </div>
      </article>

      {/* Curriculum Overview Bar */}
      <div className="fw-panel !rounded-[21px] border border-[#e8e4f1] bg-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="fw-kicker">Curriculum</span>
          <h2 className="text-xl sm:text-2xl font-black tracking-[-0.035em] text-[#222038] mt-0.5">
            Financial Education &amp; Learning
          </h2>
          <p className="text-xs sm:text-sm text-[#615d76] mt-0.5 max-w-2xl">
            Essential financial instruments explained through structured concepts, scenario modeling, and knowledge checks.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsOverviewOpen(true)}
            aria-label="What is Learn Tab?"
            className="fw-quiet !min-h-[38px] !rounded-full !px-3.5 !py-1.5 text-xs"
          >
            <span aria-hidden="true">💡</span>
            <span>What is Learn?</span>
          </button>
          <span
            className={`text-xs font-extrabold px-3.5 py-2 rounded-full border ${
              completedCount === LESSON_SUMMARIES.length
                ? 'bg-[#e3f3d9] text-[#285137] border-[#b7dc9f]'
                : 'bg-[#eee6ff] text-[#4f32a9] border-[#dfd5f8]'
            }`}
          >
            Completed: {completedCount} of {LESSON_SUMMARIES.length} Topics
          </span>
        </div>
      </div>

      {/* Main Grid: Sidebar Navigation + Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation List of all 5 topics */}
        <nav
          aria-label="Topics Navigation"
          className="lg:col-span-4 fw-panel !rounded-[21px] border border-[#e8e4f1] bg-white p-4 shadow-[0_6px_22px_rgba(39,32,71,0.04)] space-y-3"
        >
          <div className="px-2 pt-1 flex items-center justify-between gap-2">
            <div>
              <span className="fw-kicker block">Lesson Map</span>
              <h3 className="text-base font-black tracking-[-0.025em] text-[#222038]">
                Course Topics
              </h3>
            </div>
            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#eee6ff] text-[#4f32a9]">
              {completedCount}/{LESSON_SUMMARIES.length}
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-[#ece6fa] overflow-hidden">
            <div
              className="h-full bg-[#5637ca] transition-all duration-300"
              style={{
                width: `${LESSON_SUMMARIES.length > 0 ? Math.round((completedCount / LESSON_SUMMARIES.length) * 100) : 0}%`,
              }}
            />
          </div>

          <ul className="space-y-2" role="list">
            {LESSON_SUMMARIES.map((topic: LessonSummary) => {
              const isSelected = topic.id === normalizedSelectedId;
              const isDone = progressMap[topic.id]?.completed;
              const visual = TOPIC_VISUALS[topic.id] || { icon: '◈', tone: 'fw-lavender' as const };

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
                    className={`w-full text-left px-3 py-2.5 rounded-[16px] text-sm transition-all flex items-center justify-between gap-2.5 border ${
                      isSelected
                        ? 'bg-[#272047] border-[#272047] text-white font-bold shadow-[0_8px_20px_rgba(39,32,71,0.18)]'
                        : 'bg-[#fbfaff] border-[#e8e4f1] text-[#222038] hover:bg-[#f4f0fd] hover:border-[#cbb8f6]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className={`fw-tile !w-10 !h-10 !text-lg !rounded-[12px] ${
                          isSelected ? 'bg-[#3d3270] text-[#dbfb84]' : visual.tone
                        }`}
                        aria-hidden="true"
                      >
                        {visual.icon}
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <span className="font-extrabold truncate leading-snug">{topic.title}</span>
                        <span
                          className={`text-xs font-semibold ${
                            isSelected ? 'text-[#e3d7ff]' : 'text-[#615d76]'
                          }`}
                        >
                          {topic.topic}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isDone && (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isSelected
                              ? 'bg-[#dbfb84] text-[#272047]'
                              : 'bg-[#e3f3d9] text-[#285137] border border-[#b7dc9f]'
                          }`}
                          title="Topic Completed"
                        >
                          ✓ Completed
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content Area: Tuck Companion + Lesson Reading + Sources + Progress + Quiz */}
        <div className="lg:col-span-8 space-y-6">
          {/* Tuck's Study Companion Widget */}
          <section
            aria-label="Tuck's Study Companion"
            className="rounded-[21px] border border-[#dfd5f8] bg-[linear-gradient(110deg,#ede4ff,#f7f2ff_60%,#f6fde8)] p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 shadow-[0_6px_22px_rgba(79,50,169,0.06)]"
          >
            <div className="w-24 h-24 rounded-[17px] bg-[radial-gradient(circle,rgba(255,255,255,0.85),rgba(224,206,245,0.65))] grid place-items-center shrink-0 p-2">
              <Tuck className="w-20 h-20 object-contain" />
            </div>

            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="fw-kicker">Tuck&apos;s Study Companion</p>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-white/85 text-[#4f32a9] border border-[#dfd5f8]">
                  {activeLesson.topic}
                </span>
              </div>

              <div className="relative mt-2 rounded-[18px] bg-white border border-[#dfd5f8] px-4 py-3 shadow-[0_4px_14px_rgba(39,32,71,0.05)]">
                <span
                  aria-hidden="true"
                  className="hidden sm:block absolute -left-2 top-5 w-3.5 h-3.5 rotate-45 bg-white border-l border-b border-[#dfd5f8]"
                />
                <p className="text-xs sm:text-sm font-bold leading-relaxed text-[#222038]">
                  {tuckTakeaway}
                </p>
              </div>
            </div>
          </section>

          {/* Main Lesson Card */}
          <Card className="fw-panel !rounded-[21px] border-[#e8e4f1] shadow-[0_6px_24px_rgba(39,32,71,0.04)] bg-white p-6 sm:p-7 space-y-6">
            {/* Header row with badges and controls */}
            <div className="space-y-4 border-b border-[#e8e4f1] pb-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
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

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={scrollToQuiz}
                    className="text-xs font-extrabold text-[#5637ca] hover:text-[#4626ad] transition-colors inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] hover:bg-[#f4f0fd]"
                  >
                    <span>Skip to quiz</span>
                    <span aria-hidden="true">↓</span>
                  </button>

                  <button
                    type="button"
                    title="Toggle larger reading font size"
                    aria-pressed={fontSize === 'large'}
                    onClick={() => setFontSize((f) => (f === 'normal' ? 'large' : 'normal'))}
                    className="px-3 py-1.5 text-xs font-extrabold rounded-[10px] border border-[#e8e4f1] bg-white hover:bg-[#f4f0fd] hover:border-[#cfc1fa] text-[#222038] transition-colors"
                  >
                    {fontSize === 'normal' ? 'Aa+' : 'Aa-'}
                  </button>
                </div>
              </div>

              <div>
                <h3
                  ref={topicHeading}
                  tabIndex={-1}
                  className="text-2xl sm:text-3xl font-black tracking-[-0.04em] text-[#222038]"
                >
                  {activeLesson.title}
                </h3>
              </div>

              {/* Segmented Tab Switcher */}
              <div className="inline-flex rounded-[14px] p-1.5 bg-[#f3effa] border border-[#e8e4f1] text-xs font-bold gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveTab('interactive')}
                  aria-pressed={activeTab === 'interactive'}
                  className={`px-3.5 py-2 rounded-[10px] transition-all ${
                    activeTab === 'interactive'
                      ? 'bg-[#272047] text-[#dbfb84] shadow-xs font-extrabold'
                      : 'text-[#615d76] hover:text-[#222038] hover:bg-white/70'
                  }`}
                >
                  💡 Interactive Explorer
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('strategies')}
                  aria-pressed={activeTab === 'strategies'}
                  className={`px-3.5 py-2 rounded-[10px] transition-all ${
                    activeTab === 'strategies'
                      ? 'bg-[#272047] text-[#dbfb84] shadow-xs font-extrabold'
                      : 'text-[#615d76] hover:text-[#222038] hover:bg-white/70'
                  }`}
                >
                  🌐 US vs EU Strategies
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('reader')}
                  aria-pressed={activeTab === 'reader'}
                  className={`px-3.5 py-2 rounded-[10px] transition-all ${
                    activeTab === 'reader'
                      ? 'bg-[#272047] text-[#dbfb84] shadow-xs font-extrabold'
                      : 'text-[#615d76] hover:text-[#222038] hover:bg-white/70'
                  }`}
                >
                  📖 Full Guide
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('matrix')}
                  aria-pressed={activeTab === 'matrix'}
                  className={`px-3.5 py-2 rounded-[10px] transition-all ${
                    activeTab === 'matrix'
                      ? 'bg-[#272047] text-[#dbfb84] shadow-xs font-extrabold'
                      : 'text-[#615d76] hover:text-[#222038] hover:bg-white/70'
                  }`}
                >
                  ⚖️ Cheat Sheet
                </button>
              </div>
            </div>

            {/* TAB 1: Default Interactive Explorer Mode */}
            {activeTab === 'interactive' && (
              <div className="space-y-7">
                {/* At-a-Glance Pastel Tile Metrics */}
                <div className="grid grid-cols-1 min-[440px]:grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-[18px] border border-[#e8e4f1] bg-[#fbfaff] p-3.5 flex items-center gap-3">
                    <span className="fw-tile fw-lavender !w-10 !h-10 !text-lg !rounded-[12px]" aria-hidden="true">
                      ◈
                    </span>
                    <div className="min-w-0">
                      <span className="fw-kicker !text-[10px] block">Category</span>
                      <span className="text-sm font-black text-[#222038] mt-0.5 block truncate">
                        {activeLesson.topic}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-[#e8e4f1] bg-[#fbfaff] p-3.5 flex items-center gap-3">
                    <span className="fw-tile fw-mint !w-10 !h-10 !text-lg !rounded-[12px]" aria-hidden="true">
                      ✧
                    </span>
                    <div className="min-w-0">
                      <span className="fw-kicker !text-[10px] block">Protection</span>
                      <span className="text-sm font-black text-[#222038] mt-0.5 block truncate">
                        {normalizedSelectedId.includes('cd') || normalizedSelectedId.includes('hysa')
                          ? 'FDIC Insured ($250k)'
                          : normalizedSelectedId.includes('options')
                          ? 'None (Leverage Risk)'
                          : 'SIPC Protected ($500k)'}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-[#e8e4f1] bg-[#fbfaff] p-3.5 flex items-center gap-3">
                    <span className="fw-tile fw-peach !w-10 !h-10 !text-lg !rounded-[12px]" aria-hidden="true">
                      ◷
                    </span>
                    <div className="min-w-0">
                      <span className="fw-kicker !text-[10px] block">Liquidity</span>
                      <span className="text-sm font-black text-[#222038] mt-0.5 block truncate">
                        {normalizedSelectedId.includes('cd')
                          ? 'Locked Term'
                          : normalizedSelectedId.includes('hysa')
                          ? 'Daily Access'
                          : 'Market Hours (T+1)'}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-[#e8e4f1] bg-[#fbfaff] p-3.5 flex items-center gap-3">
                    <span className="fw-tile !w-10 !h-10 !text-lg !rounded-[12px] bg-[#dbfb84] text-[#272047]" aria-hidden="true">
                      ↗
                    </span>
                    <div className="min-w-0">
                      <span className="fw-kicker !text-[10px] block">Return Type</span>
                      <span className="text-sm font-black text-[#222038] mt-0.5 block truncate">
                        {normalizedSelectedId.includes('cd')
                          ? 'Fixed APY'
                          : normalizedSelectedId.includes('hysa')
                          ? 'Variable APY'
                          : 'Capital & Dividends'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Core Curriculum Content */}
                <div>
                  <RichCurriculumContent
                    key={normalizedSelectedId}
                    body={activeLesson.body}
                    fontSize={fontSize}
                    storageKey={storageScope && `concepts:${storageScope}:${normalizedSelectedId}`}
                  />
                </div>

                {/* Streamlined Interactive Studio Workbench */}
                <div className="fw-panel !rounded-[21px] border border-[#dfd5f8] bg-[linear-gradient(145deg,#faf8ff,#f3effb)] p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e8e4f1] pb-3.5">
                    <div className="flex items-center gap-3">
                      <span className="fw-tile fw-lavender !w-10 !h-10 !text-lg !rounded-[12px]" aria-hidden="true">
                        ⚡
                      </span>
                      <div>
                        <span className="fw-kicker block">Hands-on Workbench</span>
                        <h4 className="text-base font-black tracking-[-0.025em] text-[#222038]">
                          Interactive Concept Studio
                        </h4>
                        <p className="text-xs text-[#615d76] mt-0.5">
                          Explore dynamic simulations, lifecycle walkthroughs, and real-world scenarios.
                        </p>
                      </div>
                    </div>

                    {/* Studio Tool Switcher Pills */}
                    <div className="flex flex-wrap items-center gap-1 p-1 bg-white rounded-[14px] border border-[#e8e4f1] text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveStudioTool('lifecycle')}
                        className={`px-3 py-1.5 rounded-[10px] font-bold transition ${
                          activeStudioTool === 'lifecycle'
                            ? 'bg-[#5637ca] text-white shadow-xs'
                            : 'text-[#615d76] hover:text-[#222038] hover:bg-[#f6f3ff]'
                        }`}
                      >
                        Lifecycle
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveStudioTool('whatif')}
                        className={`px-3 py-1.5 rounded-[10px] font-bold transition ${
                          activeStudioTool === 'whatif'
                            ? 'bg-[#5637ca] text-white shadow-xs'
                            : 'text-[#615d76] hover:text-[#222038] hover:bg-[#f6f3ff]'
                        }`}
                      >
                        What-If
                      </button>
                      {isSavingsTopic && (
                        <button
                          type="button"
                          onClick={() => setActiveStudioTool('simulator')}
                          className={`px-3 py-1.5 rounded-[10px] font-bold transition ${
                            activeStudioTool === 'simulator'
                              ? 'bg-[#5637ca] text-white shadow-xs'
                              : 'text-[#615d76] hover:text-[#222038] hover:bg-[#f6f3ff]'
                          }`}
                        >
                          Calculator
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveStudioTool('scenarios')}
                        className={`px-3 py-1.5 rounded-[10px] font-bold transition ${
                          activeStudioTool === 'scenarios'
                            ? 'bg-[#5637ca] text-white shadow-xs'
                            : 'text-[#615d76] hover:text-[#222038] hover:bg-[#f6f3ff]'
                        }`}
                      >
                        Case Studies
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveStudioTool('matcher')}
                        className={`px-3 py-1.5 rounded-[10px] font-bold transition ${
                          activeStudioTool === 'matcher'
                            ? 'bg-[#5637ca] text-white shadow-xs'
                            : 'text-[#615d76] hover:text-[#222038] hover:bg-[#f6f3ff]'
                        }`}
                      >
                        Goal Matcher
                      </button>
                    </div>
                  </div>

                  {/* Active Tool View */}
                  <div className="pt-1">
                    {activeStudioTool === 'lifecycle' && (
                      <InstrumentLifecycleDiagram topicId={normalizedSelectedId} />
                    )}

                    {activeStudioTool === 'whatif' && (
                      <InteractiveWhatIfTool topicId={normalizedSelectedId} />
                    )}

                    {activeStudioTool === 'simulator' && isSavingsTopic && (
                      <div className="fw-panel !rounded-[21px] border border-[#e8e4f1] bg-white p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8e4f1] pb-3">
                          <div>
                            <span className="fw-kicker block">Compound Growth</span>
                            <h4 className="text-base font-black tracking-[-0.03em] text-[#222038] flex items-center gap-1.5 mt-0.5">
                              <span aria-hidden="true">🧮</span> Savings Growth Calculator
                            </h4>
                            <p className="text-xs text-[#615d76]">
                              Adjust parameters below to project potential interest returns.
                            </p>
                          </div>
                          <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-[#e3f3d9] text-[#285137] border border-[#c3e2b0]">
                            Live Preview
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                          <div className="p-3.5 rounded-[16px] bg-[#fbfaff] border border-[#e8e4f1]">
                            <label htmlFor={`${savingsInputId}-deposit`} className="font-bold text-[#222038] block mb-1.5">
                              Deposit: ${simDeposit.toLocaleString()}
                            </label>
                            <input
                              id={`${savingsInputId}-deposit`}
                              type="range"
                              min="100"
                              max="20000"
                              step="100"
                              value={simDeposit}
                              onChange={(e) => setSimDeposit(Number(e.target.value))}
                              className="w-full accent-[#5637ca]"
                            />
                            <div className="flex justify-between text-[10px] font-semibold text-[#615d76] mt-1">
                              <span>$100</span>
                              <span>$10k</span>
                              <span>$20k</span>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-[16px] bg-[#fbfaff] border border-[#e8e4f1]">
                            <label htmlFor={`${savingsInputId}-apy`} className="font-bold text-[#222038] block mb-1.5">
                              APY: {simApy.toFixed(2)}%
                            </label>
                            <input
                              id={`${savingsInputId}-apy`}
                              type="range"
                              min="0.5"
                              max="8.0"
                              step="0.25"
                              value={simApy}
                              onChange={(e) => setSimApy(Number(e.target.value))}
                              className="w-full accent-[#5637ca]"
                            />
                            <div className="flex justify-between text-[10px] font-semibold text-[#615d76] mt-1">
                              <span>0.5%</span>
                              <span>4.0%</span>
                              <span>8.0%</span>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-[16px] bg-[#fbfaff] border border-[#e8e4f1]">
                            <label htmlFor={`${savingsInputId}-months`} className="font-bold text-[#222038] block mb-1.5">
                              Horizon: {simMonths} Months
                            </label>
                            <input
                              id={`${savingsInputId}-months`}
                              type="range"
                              min="3"
                              max="60"
                              step="3"
                              value={simMonths}
                              onChange={(e) => setSimMonths(Number(e.target.value))}
                              className="w-full accent-[#5637ca]"
                            />
                            <div className="flex justify-between text-[10px] font-semibold text-[#615d76] mt-1">
                              <span>3 mo</span>
                              <span>1 yr</span>
                              <span>5 yr</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#e8e4f1]">
                          <div className="p-3.5 rounded-[16px] bg-[#e3f3d9]/70 border border-[#b7dc9f]">
                            <span className="text-[11px] font-bold text-[#285137] block">Estimated Interest</span>
                            <span className="text-lg font-black text-[#285137] font-mono tabular-nums">
                              +${savingsExample.totalGrowth.toFixed(2)}
                            </span>
                          </div>
                          <div className="p-3.5 rounded-[16px] bg-[#eee6ff]/70 border border-[#dfd5f8]">
                            <span className="text-[11px] font-bold text-[#4f32a9] block">Total Balance at Term End</span>
                            <span className="text-lg font-black text-[#222038] font-mono tabular-nums">
                              ${savingsExample.finalBalance.toFixed(2)}
                            </span>
                          </div>
                          <div className="p-3.5 rounded-[16px] bg-[#ffe9da]/70 border border-[#f5cdb2]">
                            <span className="text-[11px] font-bold text-[#7b402a] block">
                              {normalizedSelectedId === 'cd-basics'
                                ? 'Early break penalty (90d)'
                                : 'Baseline interest (0.01% APY)'}
                            </span>
                            <span className="text-xs font-bold text-[#7b402a] font-mono tabular-nums">
                              {normalizedSelectedId === 'cd-basics'
                                ? `-$${penaltyEst.toFixed(2)} if broken early`
                                : `$${baselineInterest.toFixed(2)} ($${(savingsExample.totalGrowth - baselineInterest).toFixed(2)} difference)`}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeStudioTool === 'scenarios' && (
                      <div className="fw-panel !rounded-[21px] border border-[#e8e4f1] bg-white p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8e4f1] pb-3">
                          <div>
                            <span className="fw-kicker block">Learner Profiles</span>
                            <h4 className="text-base font-black tracking-[-0.03em] text-[#222038] mt-0.5">
                              Real-World Case Studies
                            </h4>
                            <p className="text-xs text-[#615d76]">
                              Explore practical situations and strategic takeaways.
                            </p>
                          </div>
                          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#eee6ff] text-[#4f32a9]">
                            Profile {activePersonaIdx + 1} of {scenarios.length}
                          </span>
                        </div>

                        {/* Persona Selector Ribbon */}
                        <div className="flex flex-wrap items-center gap-2">
                          {scenarios.map((sc, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActivePersonaIdx(idx)}
                              className={`px-3.5 py-2 rounded-[13px] text-xs font-bold border transition-all flex items-center gap-2 ${
                                idx === activePersonaIdx
                                  ? 'bg-[#272047] text-white border-[#272047] shadow-xs'
                                  : 'bg-[#fbfaff] hover:bg-[#f4f0fd] text-[#222038] border-[#e8e4f1] hover:border-[#cbb8f6]'
                              }`}
                            >
                              <span>{sc.name}</span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  idx === activePersonaIdx
                                    ? 'bg-[#dbfb84] text-[#272047]'
                                    : 'bg-[#eee6ff] text-[#4f32a9]'
                                }`}
                              >
                                {sc.tag}
                              </span>
                            </button>
                          ))}
                        </div>

                        {/* Active Persona Card */}
                        {scenarios[activePersonaIdx] && (() => {
                          const sc = scenarios[activePersonaIdx];
                          return (
                            <div className="p-4 rounded-[18px] border border-[#dfd5f8] bg-[#f8f5ff] space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <span className="text-sm font-black text-[#222038] block">{sc.name}</span>
                                  <span className="text-xs font-medium text-[#615d76]">{sc.role}</span>
                                </div>
                                <span className="text-[11px] font-extrabold px-3 py-0.5 rounded-full bg-[#eee6ff] text-[#4f32a9] border border-[#dfd5f8]">
                                  {sc.tag}
                                </span>
                              </div>
                              <p className="text-xs text-[#383354] leading-relaxed bg-white p-3.5 rounded-[14px] border border-[#e8e4f1]">
                                <strong className="text-[#222038]">Situation:</strong> {sc.situation}
                              </p>
                              <div className="p-3.5 rounded-[14px] bg-[#e3f3d9]/80 border border-[#b7dc9f] text-xs text-[#285137] flex items-start gap-2.5">
                                <span className="text-base" aria-hidden="true">💡</span>
                                <div>
                                  <strong className="block text-[11px] uppercase tracking-wider font-extrabold text-[#285137]">
                                    Takeaway &amp; Strategy:
                                  </strong>
                                  <span className="leading-relaxed font-medium">{sc.takeaway}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {activeStudioTool === 'matcher' && (
                      <InteractiveGoalMatcher onSelectTopic={handleSelectTopic} />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Market Strategies Lab */}
            {activeTab === 'strategies' && (
              <MarketStrategiesLab
                currentTopicId={normalizedSelectedId}
                onNavigateTopic={handleSelectTopic}
              />
            )}

            {/* TAB 3: Full Reading Guide */}
            {activeTab === 'reader' && (
              <div className="space-y-4">
                <RichCurriculumContent
                  key={normalizedSelectedId}
                  body={activeLesson.body}
                  fontSize={fontSize}
                  storageKey={storageScope && `concepts:${storageScope}:${normalizedSelectedId}`}
                />
              </div>
            )}

            {/* TAB 4: Comparison Cheat Sheet */}
            {activeTab === 'matrix' && (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-[18px] border border-[#e8e4f1] bg-white">
                  <table className="min-w-full text-xs text-left text-[#383354]">
                    <thead className="bg-[#f3effa] text-[#4f32a9] font-extrabold border-b border-[#e8e4f1]">
                      <tr>
                        <th className="p-3.5">Instrument</th>
                        <th className="p-3.5">Safety / Guarantee</th>
                        <th className="p-3.5">Liquidity</th>
                        <th className="p-3.5">Ideal Horizon</th>
                        <th className="p-3.5">Primary Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e8e4f1]">
                      <tr className={normalizedSelectedId === 'cd-basics' ? 'bg-[#eee6ff]/65 font-semibold' : ''}>
                        <td className="p-3.5 font-extrabold text-[#222038]">Certificates of Deposit (CD)</td>
                        <td className="p-3.5 text-[#285137] font-bold">FDIC ($250k)</td>
                        <td className="p-3.5">Locked until maturity</td>
                        <td className="p-3.5">3 months – 5 years</td>
                        <td className="p-3.5 text-[#7b402a] font-semibold">Early withdrawal penalty</td>
                      </tr>
                      <tr className={normalizedSelectedId === 'hysa-basics' ? 'bg-[#eee6ff]/65 font-semibold' : ''}>
                        <td className="p-3.5 font-extrabold text-[#222038]">High-Yield Savings (HYSA)</td>
                        <td className="p-3.5 text-[#285137] font-bold">FDIC ($250k)</td>
                        <td className="p-3.5 text-[#285137] font-bold">Daily complete access</td>
                        <td className="p-3.5">Immediate – 2 years</td>
                        <td className="p-3.5 text-[#7b402a] font-semibold">Floating/variable rates</td>
                      </tr>
                      <tr className={normalizedSelectedId === 'stock-basics' ? 'bg-[#eee6ff]/65 font-semibold' : ''}>
                        <td className="p-3.5 font-extrabold text-[#222038]">Individual Stocks</td>
                        <td className="p-3.5 text-[#615d76]">None (Market Risk)</td>
                        <td className="p-3.5">Market hours (T+1)</td>
                        <td className="p-3.5">3 – 10+ years</td>
                        <td className="p-3.5 text-[#7b402a] font-semibold">Single company volatility</td>
                      </tr>
                      <tr className={normalizedSelectedId === 'etf-basics' ? 'bg-[#eee6ff]/65 font-semibold' : ''}>
                        <td className="p-3.5 font-extrabold text-[#222038]">Index ETFs</td>
                        <td className="p-3.5 text-[#615d76]">None (Market Risk)</td>
                        <td className="p-3.5">Market hours (T+1)</td>
                        <td className="p-3.5">5+ years</td>
                        <td className="p-3.5 text-[#7b402a] font-semibold">Broad market downturns</td>
                      </tr>
                      <tr className={normalizedSelectedId === 'options-intro' ? 'bg-[#eee6ff]/65 font-semibold' : ''}>
                        <td className="p-3.5 font-extrabold text-[#222038]">Options Contracts</td>
                        <td className="p-3.5 text-[#7b402a] font-bold">None (High Leverage)</td>
                        <td className="p-3.5">Market hours (expires)</td>
                        <td className="p-3.5">Days to months</td>
                        <td className="p-3.5 text-[#7b402a] font-bold">100% loss of premium</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="sr-only">{activeLesson.body}</div>
              </div>
            )}

            {/* Authoritative Sources */}
            <div className="border-t border-[#e8e4f1] pt-4 mt-6">
              <h4 className="fw-kicker mb-2">Authoritative Primary Sources</h4>
              <ul className="space-y-1.5 text-xs" aria-label="Authoritative Source Links">
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
          </Card>

          {/* Topic Progress Summary */}
          <div className="fw-panel !rounded-[21px] border border-[#e8e4f1] bg-white p-5 shadow-[0_6px_22px_rgba(39,32,71,0.04)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="fw-tile fw-mint !w-11 !h-11 !text-lg !rounded-[13px]" aria-hidden="true">
                ✦
              </span>
              <div>
                <h4 className="text-sm font-black tracking-[-0.02em] text-[#222038]">
                  Topic Progress Summary
                </h4>
                <p className="text-xs text-[#615d76] mt-0.5">
                  Track your quiz attempts and scores for this lesson.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="bg-[#f6f3ff] px-3 py-1.5 rounded-[12px] border border-[#e8e4f1]">
                <span className="text-[#615d76] font-medium">Attempts: </span>
                <span data-testid="progress-attempts" className="font-black text-[#222038] tabular-nums">
                  {activeProgress.attempt_count}
                </span>
              </div>
              <div className="bg-[#f6f3ff] px-3 py-1.5 rounded-[12px] border border-[#e8e4f1]">
                <span className="text-[#615d76] font-medium">Latest: </span>
                <span data-testid="progress-latest" className="font-black text-[#222038] tabular-nums">
                  {activeProgress.latest_score_pct}%
                </span>
              </div>
              <div className="bg-[#f6f3ff] px-3 py-1.5 rounded-[12px] border border-[#e8e4f1]">
                <span className="text-[#615d76] font-medium">Best: </span>
                <span data-testid="progress-best" className="font-black text-[#222038] tabular-nums">
                  {activeProgress.best_score_pct}%
                </span>
              </div>
              {activeProgress.completed ? (
                <span className="inline-flex items-center px-3 py-1.5 rounded-[12px] text-xs font-extrabold bg-[#e3f3d9] text-[#285137] border border-[#b7dc9f]">
                  ✓ Completed (80%+ Passed)
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1.5 rounded-[12px] text-xs font-bold bg-[#f3effa] text-[#615d76] border border-[#e8e4f1]">
                  Not Completed
                </span>
              )}
            </div>
          </div>

          {/* Knowledge Check Quiz Module */}
          <Card className="fw-panel !rounded-[21px] border-[#e8e4f1] shadow-[0_8px_28px_rgba(39,32,71,0.05)] bg-white p-6 sm:p-7 space-y-6">
            <div className="border-b border-[#e8e4f1] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                  {activeQuiz.questions.length} questions • Minimum passing score is 80%
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#eee6ff] text-[#4f32a9] border border-[#dfd5f8]">
                  Pass Threshold: 80%
                </span>
                <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-full bg-[#272047] text-[#dbfb84] tabular-nums">
                  {answeredCount}/{totalQuestions} Answered ({progressPercent}%)
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-[#ece6fa] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#5637ca] h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Validation Alert */}
            {validationError && (
              <div
                role="alert"
                className="p-4 rounded-[16px] bg-[#ffe9da] border border-[#f0bca0] text-[#7b402a] text-sm font-semibold flex items-center justify-between"
              >
                <span>{validationError}</span>
              </div>
            )}

            {/* Attempt Result Banner & Feedback */}
            {attemptResult ? (
              <div className="space-y-6">
                <div
                  role="alert"
                  data-testid="quiz-result-banner"
                  className={`p-5 rounded-[18px] border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                    attemptResult.passed
                      ? 'bg-[#e3f3d9]/85 border-[#b7dc9f] text-[#285137]'
                      : 'bg-[#ffe9da]/90 border-[#f0bca0] text-[#7b402a]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-black">
                        {attemptResult.passed ? '🎉 Passed!' : '⚠️ Needs Review'}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold ${
                          attemptResult.passed
                            ? 'bg-white/80 text-[#285137]'
                            : 'bg-white/80 text-[#7b402a]'
                        }`}
                      >
                        {attemptResult.passed ? 'Status: Passed' : 'Status: Failed'}
                      </span>
                    </div>
                    <p className="text-xs font-medium">
                      {attemptResult.passed
                        ? 'Congratulations! You achieved at least the 80% passing threshold.'
                        : 'You did not achieve the required 80% passing threshold. Review the explanations below and try again.'}
                    </p>
                  </div>

                  <div className="text-right sm:border-l sm:pl-6 border-current/20">
                    <div data-testid="quiz-score-pct" className="text-2xl font-black font-mono tabular-nums">
                      {attemptResult.score_pct}%
                    </div>
                    <div data-testid="quiz-correct-count" className="text-xs font-bold opacity-85">
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
                        className={`p-4 rounded-[18px] border transition-all space-y-2 ${
                          isCorrect
                            ? 'bg-[#e3f3d9]/50 border-[#b7dc9f]'
                            : 'bg-[#ffe9da]/65 border-[#f5cdb2]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-[#222038]">
                            {qIdx + 1}. {question.prompt}
                          </p>
                          <span
                            className={`shrink-0 text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                              isCorrect
                                ? 'bg-[#e3f3d9] text-[#285137] border border-[#b7dc9f]'
                                : 'bg-[#ffe9da] text-[#7b402a] border border-[#f5cdb2]'
                            }`}
                          >
                            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                        </div>

                        <p className="text-xs text-[#615d76]">
                          <span className="font-bold text-[#222038]">Your selection: </span>
                          {selectedOption?.text || 'None'}
                        </p>

                        <div className="p-3 rounded-[14px] bg-white border border-[#e8e4f1] text-xs text-[#383354]">
                          <span className="font-extrabold text-[#222038]">Explanation: </span>
                          {feedbackItem?.explanation || 'No explanation provided.'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-[#e8e4f1] flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleRetryQuiz}
                    className="w-full sm:w-auto"
                  >
                    Retry Quiz
                  </Button>
                </div>
              </div>
            ) : (
              /* Quiz Questions Form */
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
                      className="border border-[#e8e4f1] rounded-[18px] p-4 sm:p-5 bg-[#fbfaff] space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <legend
                          id={promptId}
                          className="text-sm font-extrabold text-[#222038] px-1"
                        >
                          {qIdx + 1}. {question.prompt}
                        </legend>

                        {hintText && (
                          <button
                            type="button"
                            onClick={() => toggleHint(question.id)}
                            className="text-xs text-[#4f32a9] hover:text-[#272047] font-bold shrink-0 flex items-center gap-1 bg-[#eee6ff] hover:bg-[#e4d9ff] px-2.5 py-1 rounded-[10px] border border-[#dfd5f8] transition-colors"
                          >
                            <span aria-hidden="true">💡</span>
                            <span>{isHintOpen ? 'Hide Hint' : 'Need Hint?'}</span>
                          </button>
                        )}
                      </div>

                      {isHintOpen && hintText && (
                        <div className="p-3.5 rounded-[14px] bg-[#eee6ff] border border-[#dfd5f8] text-xs text-[#4f32a9] font-medium flex items-start gap-2">
                          <span aria-hidden="true">💡</span>
                          <span>{hintText}</span>
                        </div>
                      )}

                      <div className="space-y-2 pt-1">
                        {question.options.map((option) => {
                          const inputId = `opt-${question.id}-${option.id}`;
                          const isChecked = selectedAnswers[question.id] === option.id;

                          return (
                            <label
                              key={option.id}
                              htmlFor={inputId}
                              className={`flex items-start gap-3 p-3.5 rounded-[14px] border text-xs sm:text-sm cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-[#f0eaff] border-[#7257e0] text-[#222038] font-semibold shadow-2xs'
                                  : 'bg-white border-[#e8e4f1] text-[#383354] hover:border-[#cfc1fa] hover:bg-[#fbf9ff]'
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
                                className="mt-0.5 h-4 w-4 accent-[#5637ca] border-[#cfc1fa]"
                              />
                              <span className="flex-1 select-none">{option.text}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}

                <div className="flex items-center justify-between pt-3 border-t border-[#e8e4f1]">
                  <span className="text-xs text-[#615d76] font-bold">
                    {answeredCount} of {totalQuestions} answered
                  </span>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Evaluating...' : 'Submit Quiz'}
                  </Button>
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

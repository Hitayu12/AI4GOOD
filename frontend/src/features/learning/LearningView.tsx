import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ApiClient, defaultApiClient } from '../../api/client';
import { Lesson, LessonSummary, ProgressItem, Quiz, QuizAttemptRequest, QuizAttemptResponse } from '../../api/types';
import { LESSONS, LESSON_SUMMARIES } from './content/lessonDefinitions';
import { QUIZZES } from './content/quizDefinitions';
import { SERVER_ANSWER_KEYS, QuizScoringData } from './content/serverAnswerKeys';
import { evaluateQuizAttempt } from './quizScoring';
import { MarketStrategiesLab } from './strategies/MarketStrategiesLab';
import {
  InstrumentLifecycleDiagram,
  InteractiveWhatIfTool,
  InteractiveGoalMatcher,
} from './components/InteractiveConceptWidgets';

export interface LearningViewProps {
  apiClient?: ApiClient;
  useInternalScoring?: boolean;
  initialTopicId?: string;
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

const TOPIC_SCENARIOS: Record<string, Scenario[]> = {
  'cd-basics': [
    {
      name: 'Elena R.',
      role: 'Tuition Deadline Saver',
      situation: 'Has $3,000 saved for college tuition due in exactly 12 months.',
      takeaway: 'She chooses a 1-year CD at 5.0% APY. Her return is locked at $150 guaranteed with 0% market risk.',
      tag: 'Targeted Goal',
    },
    {
      name: 'Jamal M.',
      role: 'Emergency Cash Lesson',
      situation: 'Locked all his $800 savings into a 2-year CD. Two months later his laptop motherboard died.',
      takeaway: 'Breaking the CD early triggered a 90-day early withdrawal penalty. Lesson: Keep emergency funds liquid!',
      tag: 'Liquidity Caution',
    },
    {
      name: 'Marcus & Sophia',
      role: 'CD Ladder Strategists',
      situation: 'Split $8,000 into 4 separate CDs maturing every 6 months (6, 12, 18, 24 mo).',
      takeaway: 'Gets higher locked yields while ensuring fresh cash becomes accessible every 6 months.',
      tag: 'CD Ladder',
    },
  ],
  'hysa-basics': [
    {
      name: 'Maya K.',
      role: 'Working Student',
      situation: 'Keeps a $1,200 emergency fund in a digital bank paying 4.5% APY.',
      takeaway: 'Earns $54/year in interest instead of $0.12 at her old brick-and-mortar bank, and can withdraw anytime via ACH.',
      tag: 'Emergency Cushion',
    },
    {
      name: 'David L.',
      role: 'Rate-Watch Saver',
      situation: 'Noticed his HYSA yield moved from 4.75% to 4.25% after the Federal Reserve cut benchmark interest rates.',
      takeaway: 'Recognized that unlike fixed CDs, HYSA yields are variable and float with macroeconomic conditions.',
      tag: 'Variable Yield',
    },
  ],
  'stocks-basics': [
    {
      name: 'Carlos S.',
      role: 'First-Generation Investor',
      situation: 'Purchased 2 shares of an enterprise software company for $150.',
      takeaway: 'Understands he is an equity co-owner. Price fluctuates day-to-day, but he participates in long-term corporate earnings and dividends.',
      tag: 'Equity Ownership',
    },
    {
      name: 'Amina T.',
      role: 'Market Volatility Awareness',
      situation: 'Experienced a 10% temporary dip during market earnings season.',
      takeaway: 'Learned why stocks are suited for multi-year horizons rather than money needed next semester.',
      tag: 'Market Risk',
    },
  ],
  'etf-basics': [
    {
      name: 'Jordan W.',
      role: 'Index Fund Saver',
      situation: 'Invests $100/month into an S&P 500 index ETF (SPY/VOO) with a 0.03% expense ratio.',
      takeaway: 'Owns 500 top companies with one trade. The annual fee is only 30 cents per $1,000 invested.',
      tag: 'Instant Diversification',
    },
    {
      name: 'Chloe P.',
      role: 'Single Stock vs ETF Test',
      situation: 'Compared owning 1 retail stock vs a broad-market ETF when that retail chain slumped.',
      takeaway: 'Broad diversification cushioned the impact; the index stayed resilient even as one company dropped.',
      tag: 'Risk Reduction',
    },
  ],
  'options-basics': [
    {
      name: 'Kai P.',
      role: 'Educational Hedger',
      situation: 'Simulates buying a Put option contract to learn portfolio hedging during volatility.',
      takeaway: 'Options have fixed expiration dates. Leverage means 100% loss of paid premium is common; never risk essential cash.',
      tag: 'Educational Safety',
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

function renderFormattedInlineText(text: string) {
  // Parse **bold** into real strong elements
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-slate-900">
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
        <div key={elements.length} className="space-y-2.5 my-3">
          {currentList.items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 bg-white/95 p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-colors"
            >
              <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                {idx + 1}
              </span>
              <div className="text-xs sm:text-sm leading-relaxed text-slate-700 flex-1">
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
              className="flex items-start gap-2.5 bg-white/95 p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                ✓
              </span>
              <div className="text-xs sm:text-sm leading-relaxed text-slate-700 flex-1">
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

    // Numbered item: e.g. "1. **Principal Commitment**: ..."
    const numMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (numMatch) {
      if (!currentList || currentList.type !== 'ordered') {
        flushList();
        currentList = { type: 'ordered', items: [] };
      }
      currentList.items.push(numMatch[1]);
      return;
    }

    // Bullet item: e.g. "- **Targeted Goals**: ..."
    const bulletMatch = trimmed.match(/^-\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'bullet') {
        flushList();
        currentList = { type: 'bullet', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      return;
    }

    // Paragraph
    flushList();
    elements.push(
      <p key={elements.length} className="leading-relaxed text-slate-700 my-2">
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

function RichCurriculumContent({
  body,
  fontSize,
  onOpenStrategies,
}: {
  body: string;
  fontSize: 'normal' | 'large';
  onOpenStrategies?: () => void;
}) {
  const sections = useMemo(() => parseLessonMarkdown(body), [body]);
  const [activeConceptIdx, setActiveConceptIdx] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'deck' | 'list'>('deck');
  const [understoodMap, setUnderstoodMap] = useState<Record<number, boolean>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});
  const [checkList, setCheckList] = useState<boolean[]>([false, false, false]);

  useEffect(() => {
    setActiveConceptIdx(0);
    setUnderstoodMap({});
    setCheckList([false, false, false]);
    setCollapsedSections({});
  }, [body]);

  const toggleSection = (idx: number) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const areAllCollapsed = sections.length > 0 && sections.every((_, i) => !!collapsedSections[i]);

  const toggleAll = () => {
    if (areAllCollapsed) {
      setCollapsedSections({});
    } else {
      const all: Record<number, boolean> = {};
      sections.forEach((_, i) => {
        all[i] = true;
      });
      setCollapsedSections(all);
    }
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

  const activeCardStyle = isActiveWarning
    ? 'border-amber-300 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 text-amber-950'
    : isActiveSafety
    ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 text-emerald-950'
    : isActiveDefinition
    ? 'border-blue-300 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 text-blue-950'
    : isActiveAction
    ? 'border-indigo-300 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/30 text-indigo-950'
    : 'border-slate-300 bg-gradient-to-br from-slate-50/80 via-white to-slate-100/40 text-slate-900';

  const activeBadgeText = isActiveWarning
    ? '⚠️ Trade-Off & Risk Alert'
    : isActiveSafety
    ? '🛡️ Federal & Custodial Safety'
    : isActiveDefinition
    ? '💡 Core Concept Definition'
    : isActiveAction
    ? '🎯 Strategy & Real-World Use'
    : '📘 Market Mechanics';

  const activeBadgeStyle = isActiveWarning
    ? 'bg-amber-100 text-amber-900 border-amber-300'
    : isActiveSafety
    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
    : isActiveDefinition
    ? 'bg-blue-100 text-blue-900 border-blue-300'
    : isActiveAction
    ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
    : 'bg-slate-100 text-slate-800 border-slate-300';

  return (
    <div className="space-y-4">
      {/* Visual Learning Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm border border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/60 border border-blue-400 flex items-center justify-center text-lg">
            🎓
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Interactive Concept Curriculum</h4>
            <p className="text-xs text-blue-200">
              {sections.length} core modular concept blocks • Step-by-step interactive studio
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="inline-flex rounded-lg border border-blue-700 bg-blue-950/80 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('deck')}
              className={`px-2 py-0.5 rounded-md font-semibold transition ${
                viewMode === 'deck' ? 'bg-blue-600 text-white shadow-2xs' : 'text-blue-200 hover:text-white'
              }`}
            >
              🃏 Concept Deck
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2 py-0.5 rounded-md font-semibold transition ${
                viewMode === 'list' ? 'bg-blue-600 text-white shadow-2xs' : 'text-blue-200 hover:text-white'
              }`}
            >
              📑 All Cards
            </button>
          </div>
          <button
            type="button"
            onClick={toggleAll}
            className="px-2.5 py-1 rounded-full bg-blue-800/80 hover:bg-blue-700 text-blue-200 border border-blue-600 font-semibold transition-colors"
          >
            {areAllCollapsed ? '▼ Expand All' : '▲ Collapse All'}
          </button>
        </div>
      </div>

      {/* Quick Launch Callout to US vs Europe Strategies */}
      {onOpenStrategies && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-blue-50/80 via-indigo-50/70 to-purple-50/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌐</span>
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Compare Trading Strategies: 🇺🇸 US vs. 🇪🇺 Europe
              </span>
              <span className="text-[11px] text-slate-600 leading-snug">
                CD ladders, Treasury barbells, UCITS Accumulating ETFs, and cross-border bank yields.
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenStrategies}
            className="text-xs font-semibold bg-white hover:bg-slate-50 border-indigo-300 text-indigo-900 whitespace-nowrap self-start sm:self-center"
          >
            Explore Global Strategies →
          </Button>
        </div>
      )}

      {/* VIEW MODE 1: INTERACTIVE CONCEPT DECK STUDIO */}
      {viewMode === 'deck' && activeSec && (
        <div className="space-y-4">
          {/* Step Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-slate-100/90 border border-slate-200">
            {sections.map((sec, idx) => {
              const isSelected = idx === activeConceptIdx;
              const isDone = !!understoodMap[idx];
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveConceptIdx(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{isDone ? '✓' : `${idx + 1}.`}</span>
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">
                    {sec.title.replace('###', '').trim()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Concept Card */}
          <div className={`rounded-2xl border p-5 shadow-sm space-y-4 ${activeCardStyle}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Concept {activeConceptIdx + 1} of {sections.length}:</span>
                <h4 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                  {activeSec.title}
                </h4>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${activeBadgeStyle}`}
              >
                {activeBadgeText}
              </span>
            </div>

            {/* Executive Key Takeaway Callout */}
            <div className="p-3.5 rounded-xl bg-white/95 border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block">
                💡 Executive Key Takeaway
              </span>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
                {getExecutiveTakeaway(activeSec.title)}
              </p>
            </div>

            {/* Content Lines */}
            <div className={`space-y-3 pt-1 ${fontSize === 'large' ? 'text-base' : 'text-sm'}`}>
              {renderSectionLines(activeSec.lines)}
            </div>

            {/* Card Footer Controls */}
            <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setUnderstoodMap((prev) => {
                    const next = { ...prev, [activeConceptIdx]: !prev[activeConceptIdx] };
                    // If marking understood, also check off matching item in checklist
                    if (activeConceptIdx < 3) {
                      setCheckList((cPrev) => {
                        const cNext = [...cPrev];
                        cNext[activeConceptIdx] = true;
                        return cNext;
                      });
                    }
                    return next;
                  });
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  understoodMap[activeConceptIdx]
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
              >
                <span>{understoodMap[activeConceptIdx] ? '✓' : '○'}</span>
                <span>
                  {understoodMap[activeConceptIdx] ? 'Understood & Mastered' : 'Mark Concept Understood'}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={activeConceptIdx === 0}
                  onClick={() => setActiveConceptIdx((p) => Math.max(0, p - 1))}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700"
                >
                  ← Prev Concept
                </button>
                <button
                  type="button"
                  disabled={activeConceptIdx === sections.length - 1}
                  onClick={() => setActiveConceptIdx((p) => Math.min(sections.length - 1, p + 1))}
                  className="px-3 py-1 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-white shadow-2xs"
                >
                  Next Concept →
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible reference cards for remaining sections so all text is 100% accessible in DOM */}
          <div className="space-y-2 pt-2">
            <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              All Lesson Sections (Click to expand any section):
            </h5>
            {sections.map((section, sIdx) => {
              if (sIdx === activeConceptIdx) return null;
              const isCollapsed = collapsedSections[sIdx] !== false; // default collapsed in deck mode

              return (
                <div
                  key={sIdx}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-blue-200 transition-colors"
                >
                  <div
                    onClick={() => toggleSection(sIdx)}
                    className="flex items-center justify-between cursor-pointer select-none"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleSection(sIdx);
                      }
                    }}
                    aria-expanded={!isCollapsed}
                  >
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span className="text-slate-400 text-[10px]">{isCollapsed ? '▶' : '▼'}</span>
                      <span>{section.title}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveConceptIdx(sIdx);
                      }}
                      className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline px-2 py-0.5 rounded bg-blue-50"
                    >
                      Open in Studio →
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className={`space-y-3 pt-3 border-t border-slate-100 mt-2 ${fontSize === 'large' ? 'text-base' : 'text-sm'}`}>
                      {renderSectionLines(section.lines)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: FULL EXPANDED CARDS LIST */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {sections.map((section, sIdx) => {
            const lower = section.title.toLowerCase();
            const isWarning =
              lower.includes('penalty') ||
              lower.includes('risk') ||
              lower.includes('trade-off') ||
              lower.includes('caution') ||
              lower.includes('mandatory');
            const isSafety =
              lower.includes('safety') ||
              lower.includes('protection') ||
              lower.includes('fdic') ||
              lower.includes('sipc');
            const isDefinition =
              lower.includes('what is') || lower.includes('introduction') || lower.includes('primer');
            const isAction =
              lower.includes('when to choose') ||
              lower.includes('role') ||
              lower.includes('how') ||
              lower.includes('instant') ||
              lower.includes('simulator');

            const cardStyle = isWarning
              ? 'border-amber-300 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 text-amber-950'
              : isSafety
              ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 text-emerald-950'
              : isDefinition
              ? 'border-blue-300 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 text-blue-950'
              : isAction
              ? 'border-indigo-300 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/30 text-indigo-950'
              : 'border-slate-300 bg-gradient-to-br from-slate-50/80 via-white to-slate-100/40 text-slate-900';

            const badgeText = isWarning
              ? '⚠️ Trade-Off & Risk Alert'
              : isSafety
              ? '🛡️ Federal & Custodial Safety'
              : isDefinition
              ? '💡 Core Concept Definition'
              : isAction
              ? '🎯 Strategy & Real-World Use'
              : '📘 Market Mechanics';

            const badgeStyle = isWarning
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : isSafety
              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
              : isDefinition
              ? 'bg-blue-100 text-blue-900 border-blue-300'
              : isAction
              ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
              : 'bg-slate-100 text-slate-800 border-slate-300';

            const isCollapsed = !!collapsedSections[sIdx];

            return (
              <div
                key={sIdx}
                className={`rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all duration-150 ${cardStyle}`}
              >
                <div
                  onClick={() => toggleSection(sIdx)}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3 mb-2 cursor-pointer select-none"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSection(sIdx);
                    }
                  }}
                  aria-expanded={!isCollapsed}
                >
                  <h4 className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-2">
                    <span className="text-slate-400 text-xs">{isCollapsed ? '▶' : '▼'}</span>
                    <span>{section.title}</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}
                    >
                      {badgeText}
                    </span>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className={`space-y-3 pt-1 ${fontSize === 'large' ? 'text-base' : 'text-sm'}`}>
                    {renderSectionLines(section.lines)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Concept Checkoff Card */}
      <div className="rounded-2xl border border-slate-300/80 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">✅</span>
            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Interactive Concept Checkoff
            </h5>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
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
              className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                checkList[idx]
                  ? 'border-emerald-300 bg-emerald-50/60 text-emerald-950 font-medium'
                  : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <input
                type="checkbox"
                checked={checkList[idx]}
                onChange={() => {
                  setCheckList((prev) => {
                    const next = [...prev];
                    next[idx] = !next[idx];
                    return next;
                  });
                }}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
              />
              <span className="leading-relaxed">{item}</span>
            </label>
          ))}
        </div>

        {checkList.every(Boolean) && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold flex items-center justify-between shadow-xs">
            <span>🎉 Outstanding! You have verified all 3 core concepts.</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
              Ready for Quiz!
            </span>
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
  quizzes = QUIZZES,
  serverAnswerKeys = SERVER_ANSWER_KEYS,
  onProgressUpdate,
}: LearningViewProps) {
  // Navigation / Selection
  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopicId);

  // View presentation mode: 'interactive' | 'strategies' | 'reader' | 'matrix'
  const [activeTab, setActiveTab] = useState<'interactive' | 'strategies' | 'reader' | 'matrix'>('interactive');
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');

  // Interactive Mini-Simulator State
  const [simDeposit, setSimDeposit] = useState<number>(1000);
  const [simApy, setSimApy] = useState<number>(5.0);
  const [simMonths, setSimMonths] = useState<number>(12);

  // Hint expansion tracking per question id
  const [openHints, setOpenHints] = useState<Record<string, boolean>>({});

  // Active quiz state for current topic
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [attemptResult, setAttemptResult] = useState<QuizAttemptResponse | null>(null);

  // Progress state tracked locally
  const [progressMap, setProgressMap] = useState<Record<string, ProgressItem>>(() => {
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

  const activeLesson: Lesson = LESSONS[selectedTopicId] || LESSONS['cd-basics'];
  const activeQuiz: Quiz = quizzes[activeLesson.quiz_id] || quizzes['quiz-cd-basics'];
  const activeProgress: ProgressItem = progressMap[selectedTopicId] || {
    lesson_id: selectedTopicId,
    quiz_version: 1,
    attempt_count: 0,
    best_score_pct: '0.00',
    latest_score_pct: '0.00',
    completed: false,
  };

  const completedCount = Object.values(progressMap).filter((p) => p.completed).length;
  const scenarios = TOPIC_SCENARIOS[selectedTopicId] || TOPIC_SCENARIOS['cd-basics'];
  const [activePersonaIdx, setActivePersonaIdx] = useState<number>(0);

  // Handle switching topic
  const handleSelectTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    setSelectedAnswers({});
    setValidationError(null);
    setAttemptResult(null);
    setOpenHints({});
    setActivePersonaIdx(0);
    // Reset simulator defaults based on topic
    if (topicId === 'hysa-basics') {
      setSimApy(4.5);
      setSimMonths(12);
    } else if (topicId === 'cd-basics') {
      setSimApy(5.0);
      setSimMonths(12);
    } else {
      setSimDeposit(1000);
    }
  };

  // Handle selecting an option
  const handleOptionSelect = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
    if (validationError) {
      setValidationError(null);
    }
  };

  // Toggle question hint
  const toggleHint = (qId: string) => {
    setOpenHints((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  // Handle quiz submission
  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate that every question has an answer
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

      const shouldScoreLocally =
        useInternalScoring ?? (apiClient.fixtureMode || typeof process !== 'undefined');

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

      // Update progress
      setProgressMap((prev) => {
        const current = prev[selectedTopicId] || {
          lesson_id: selectedTopicId,
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
          lesson_id: selectedTopicId,
          quiz_version: activeQuiz.version,
          attempt_count: newAttemptCount,
          best_score_pct: newBestScore,
          latest_score_pct: newLatestScore,
          completed: isCompleted,
        };

        const nextMap = { ...prev, [selectedTopicId]: updated };
        onProgressUpdate?.(nextMap);
        return nextMap;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to score quiz attempt';
      setValidationError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle retry
  const handleRetryQuiz = () => {
    setSelectedAnswers({});
    setValidationError(null);
    setAttemptResult(null);
  };

  // Simulator math
  const calculatedInterest = (simDeposit * (simApy / 100) * (simMonths / 12));
  const calculatedTotal = simDeposit + calculatedInterest;
  const penaltyEst = (simDeposit * (simApy / 100) * (3 / 12)); // 90-day penalty

  const answeredCount = Object.keys(selectedAnswers).length;
  const totalQuestions = activeQuiz.questions.length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Financial Education &amp; Learning</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive, inclusive starter curriculum covering savings, equities, and derivatives with hands-on scenario simulators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Completed: {completedCount} of {LESSON_SUMMARIES.length} Topics
          </span>
        </div>
      </div>

      {/* Main Grid: Sidebar Navigation + Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation List of all 5 topics */}
        <nav
          aria-label="Topics Navigation"
          className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2"
        >
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 mb-3">
            Course Topics
          </h3>
          <ul className="space-y-1.5" role="list">
            {LESSON_SUMMARIES.map((topic: LessonSummary) => {
              const isSelected = topic.id === selectedTopicId;
              const isDone = progressMap[topic.id]?.completed;

              return (
                <li key={topic.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectTopic(topic.id)}
                    aria-current={isSelected ? 'page' : undefined}
                    className={`w-full text-left px-3.5 py-3 rounded-lg text-sm transition-colors flex items-center justify-between border ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold shadow-sm'
                        : 'border-transparent text-slate-700 hover:bg-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col pr-2">
                      <span className="truncate">{topic.title}</span>
                      <span className="text-xs font-normal text-slate-500">{topic.topic}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isDone && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800"
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

        {/* Content Area: Lesson Reading + Sources + Progress + Quiz */}
        <div className="lg:col-span-8 space-y-6">
          {/* Lesson Card */}
          <Card className="border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {activeLesson.topic}
                  </span>
                  <span
                    data-testid="draft-status-badge"
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    Draft Content - Pending Review
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{activeLesson.title}</h3>
              </div>

              {/* View Presentation Switcher & Text Size Accessibility */}
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setActiveTab('interactive')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      activeTab === 'interactive'
                        ? 'bg-white text-blue-700 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    💡 Interactive Explorer
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('strategies')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      activeTab === 'strategies'
                        ? 'bg-white text-blue-700 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🌐 US vs EU Strategies
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reader')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      activeTab === 'reader'
                        ? 'bg-white text-blue-700 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📖 Full Guide
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('matrix')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      activeTab === 'matrix'
                        ? 'bg-white text-blue-700 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⚖️ Cheat Sheet
                  </button>
                </div>

                <button
                  type="button"
                  title="Toggle larger reading font size"
                  onClick={() => setFontSize((f) => (f === 'normal' ? 'large' : 'normal'))}
                  className="px-2 py-1 text-xs font-semibold rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  {fontSize === 'normal' ? 'Aa+' : 'Aa-'}
                </button>
              </div>
            </div>

            {/* TAB 1: Interactive Explorer with Simulator & Scenarios */}
            {activeTab === 'interactive' && (
              <div className="space-y-6">
                {/* Visual Highlights Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200">
                    <span className="text-[11px] font-bold text-blue-700 uppercase block">Category</span>
                    <span className="text-sm font-bold text-blue-950">{activeLesson.topic}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase block">Protection</span>
                    <span className="text-sm font-bold text-emerald-950">
                      {selectedTopicId.includes('cd') || selectedTopicId.includes('hysa')
                        ? '🛡️ FDIC ($250k)'
                        : selectedTopicId.includes('options')
                        ? '⚠️ None (Leverage)'
                        : '🏛️ SIPC ($500k)'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200">
                    <span className="text-[11px] font-bold text-amber-700 uppercase block">Liquidity</span>
                    <span className="text-sm font-bold text-amber-950">
                      {selectedTopicId.includes('cd')
                        ? '⏳ Locked Term'
                        : selectedTopicId.includes('hysa')
                        ? '💧 Daily Access'
                        : '📊 Market Hours'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-200">
                    <span className="text-[11px] font-bold text-purple-700 uppercase block">Return Type</span>
                    <span className="text-sm font-bold text-purple-950">
                      {selectedTopicId.includes('cd')
                        ? '🔒 Fixed APY'
                        : selectedTopicId.includes('hysa')
                        ? '📈 Variable APY'
                        : '📊 Capital & Dividends'}
                    </span>
                  </div>
                </div>

                {/* Interactive Lifecycle Step-Through Diagram */}
                <InstrumentLifecycleDiagram topicId={selectedTopicId} />

                {/* Specialized Interactive What-If Scenario Lab */}
                <InteractiveWhatIfTool topicId={selectedTopicId} />

                {/* Hands-On Mini-Simulator Widget */}
                <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-slate-50 to-blue-50/40 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                        <span>🧮</span> Interactive Scenario Simulator
                      </h4>
                      <p className="text-xs text-slate-500">
                        Adjust numbers below to see how this instrument works with real dollars.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      Live Preview
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Deposit Amount: ${simDeposit.toLocaleString()}
                      </label>
                      <input
                        type="range"
                        min="100"
                        max="20000"
                        step="100"
                        value={simDeposit}
                        onChange={(e) => setSimDeposit(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>$100</span>
                        <span>$10k</span>
                        <span>$20k</span>
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Annual Rate (APY): {simApy.toFixed(2)}%
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="8.0"
                        step="0.25"
                        value={simApy}
                        onChange={(e) => setSimApy(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>0.5%</span>
                        <span>4.0%</span>
                        <span>8.0%</span>
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Time Horizon: {simMonths} Months
                      </label>
                      <input
                        type="range"
                        min="3"
                        max="60"
                        step="3"
                        value={simMonths}
                        onChange={(e) => setSimMonths(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>3 mo</span>
                        <span>1 yr</span>
                        <span>5 yr</span>
                      </div>
                    </div>
                  </div>

                  {/* Calculated Result Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-indigo-100">
                    <div className="p-3 rounded-lg bg-white border border-indigo-100 shadow-xs">
                      <span className="text-[11px] text-slate-500 block">Estimated Interest Earned</span>
                      <span className="text-lg font-black text-emerald-600 font-mono">
                        +${calculatedInterest.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white border border-indigo-100 shadow-xs">
                      <span className="text-[11px] text-slate-500 block">Total Balance at End</span>
                      <span className="text-lg font-black text-slate-900 font-mono">
                        ${calculatedTotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white border border-indigo-100 shadow-xs">
                      <span className="text-[11px] text-slate-500 block">
                        {selectedTopicId.includes('cd') ? 'Early Break Penalty (90d)' : 'Traditional Bank (0.01%)'}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 font-mono">
                        {selectedTopicId.includes('cd')
                          ? `-$${penaltyEst.toFixed(2)} if broken early`
                          : `$${(simDeposit * 0.0001).toFixed(2)} (Earn $${(calculatedInterest - simDeposit * 0.0001).toFixed(2)} more!)`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interactive Goal & Asset Matcher */}
                <InteractiveGoalMatcher onSelectTopic={handleSelectTopic} />

                {/* Interactive Real-World Case Studies */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">👥</span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Interactive Real-World Case Studies
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Click any saver or investor to see their scenario and tactical takeaway.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                      Case Study {activePersonaIdx + 1} of {scenarios.length}
                    </span>
                  </div>

                  {/* Persona Selector Ribbon */}
                  <div className="flex flex-wrap items-center gap-2">
                    {scenarios.map((sc, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActivePersonaIdx(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                          idx === activePersonaIdx
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>👤</span>
                        <span>{sc.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-normal ${
                            idx === activePersonaIdx ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600'
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
                      <div className="p-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/50 via-white to-slate-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-blue-950 block">{sc.name}</span>
                            <span className="text-[11px] text-slate-500">{sc.role}</span>
                          </div>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                            {sc.tag}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200/80">
                          <strong>Situation:</strong> {sc.situation}
                        </p>
                        <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
                          <span className="text-base">💡</span>
                          <div>
                            <strong className="block text-[11px] uppercase tracking-wider text-emerald-900">
                              Key Takeaway &amp; Strategy:
                            </strong>
                            <span className="leading-relaxed">{sc.takeaway}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Complete Lesson Body Text with Rich Modular Cards */}
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Core Curriculum Overview
                  </h4>
                  <RichCurriculumContent
                    body={activeLesson.body}
                    fontSize={fontSize}
                    onOpenStrategies={() => setActiveTab('strategies')}
                  />
                </div>
              </div>
            )}

            {/* TAB: US vs EU Market Strategies Lab */}
            {activeTab === 'strategies' && (
              <MarketStrategiesLab
                currentTopicId={selectedTopicId}
                onNavigateTopic={(tId) => setSelectedTopicId(tId)}
              />
            )}

            {/* TAB 2: Full Formatted Reader */}
            {activeTab === 'reader' && (
              <div className="space-y-4">
                <RichCurriculumContent
                  body={activeLesson.body}
                  fontSize={fontSize}
                  onOpenStrategies={() => setActiveTab('strategies')}
                />
              </div>
            )}

            {/* TAB 3: Comparison Matrix */}
            {activeTab === 'matrix' && (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-xs text-left text-slate-700">
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Instrument</th>
                        <th className="p-3">Safety / Guarantee</th>
                        <th className="p-3">Liquidity</th>
                        <th className="p-3">Ideal Horizon</th>
                        <th className="p-3">Primary Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className={selectedTopicId === 'cd-basics' ? 'bg-blue-50/60 font-semibold' : ''}>
                        <td className="p-3 font-bold">Certificates of Deposit (CD)</td>
                        <td className="p-3 text-emerald-700">🛡️ FDIC ($250k)</td>
                        <td className="p-3">Locked until maturity</td>
                        <td className="p-3">3 months – 5 years</td>
                        <td className="p-3 text-amber-700">Early withdrawal penalty</td>
                      </tr>
                      <tr className={selectedTopicId === 'hysa-basics' ? 'bg-blue-50/60 font-semibold' : ''}>
                        <td className="p-3 font-bold">High-Yield Savings (HYSA)</td>
                        <td className="p-3 text-emerald-700">🛡️ FDIC ($250k)</td>
                        <td className="p-3 text-emerald-700">Daily complete access</td>
                        <td className="p-3">Immediate – 2 years</td>
                        <td className="p-3 text-amber-700">Floating/variable rates</td>
                      </tr>
                      <tr className={selectedTopicId === 'stocks-basics' ? 'bg-blue-50/60 font-semibold' : ''}>
                        <td className="p-3 font-bold">Individual Stocks</td>
                        <td className="p-3 text-slate-500">None (Market Risk)</td>
                        <td className="p-3">Market hours (T+1)</td>
                        <td className="p-3">3 – 10+ years</td>
                        <td className="p-3 text-red-700">Single company volatility</td>
                      </tr>
                      <tr className={selectedTopicId === 'etf-basics' ? 'bg-blue-50/60 font-semibold' : ''}>
                        <td className="p-3 font-bold">Index ETFs</td>
                        <td className="p-3 text-slate-500">None (Market Risk)</td>
                        <td className="p-3">Market hours (T+1)</td>
                        <td className="p-3">5+ years</td>
                        <td className="p-3 text-amber-700">Broad market downturns</td>
                      </tr>
                      <tr className={selectedTopicId === 'options-basics' ? 'bg-blue-50/60 font-semibold' : ''}>
                        <td className="p-3 font-bold">Options Contracts</td>
                        <td className="p-3 text-red-600 font-bold">None (High Leverage)</td>
                        <td className="p-3">Market hours (expires)</td>
                        <td className="p-3">Days to months</td>
                        <td className="p-3 text-red-700 font-bold">100% loss of premium</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Keep core text in DOM for reader tab */}
                <div className="sr-only">{activeLesson.body}</div>
              </div>
            )}

            {/* Authoritative Sources */}
            <div className="border-t border-slate-200 pt-4 mt-6">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Authoritative Primary Sources
              </h4>
              <ul className="space-y-1 text-xs" aria-label="Authoritative Source Links">
                {activeLesson.source_links.map((link, idx) => (
                  <li key={idx}>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline break-all inline-flex items-center gap-1"
                    >
                      🔗 {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* Topic Progress Summary */}
          <Card className="bg-slate-50 border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Topic Progress Summary</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track your quiz attempts and scores for this lesson.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-slate-500">Attempts: </span>
                  <span data-testid="progress-attempts" className="font-bold text-slate-900">{activeProgress.attempt_count}</span>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-slate-500">Latest: </span>
                  <span data-testid="progress-latest" className="font-bold text-slate-900">{activeProgress.latest_score_pct}%</span>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-slate-500">Best: </span>
                  <span data-testid="progress-best" className="font-bold text-slate-900">{activeProgress.best_score_pct}%</span>
                </div>
                {activeProgress.completed ? (
                  <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                    ✓ Completed (80%+ Passed)
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700">
                    Not Completed
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Interactive Quiz Module */}
          <Card className="border-slate-200 shadow-sm">
            <div className="border-b border-slate-200 pb-3 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Knowledge Check Quiz</h3>
                <p className="text-xs text-slate-500">
                  {activeQuiz.questions.length} questions • Minimum passing score is 80%
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200">
                  Pass Threshold: 80%
                </span>
                <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">
                  {answeredCount}/{totalQuestions} Answered ({progressPercent}%)
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full mb-6 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Validation Alert */}
            {validationError && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between"
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
                  className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                    attemptResult.passed
                      ? 'bg-green-50 border-green-200 text-green-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold">
                        {attemptResult.passed ? '🎉 Passed!' : '⚠️ Needs Review'}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold ${
                          attemptResult.passed
                            ? 'bg-green-200 text-green-900'
                            : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {attemptResult.passed ? 'Status: Passed' : 'Status: Failed'}
                      </span>
                    </div>
                    <p className="text-xs">
                      {attemptResult.passed
                        ? 'Congratulations! You achieved at least the 80% passing threshold.'
                        : 'You did not achieve the required 80% passing threshold. Review the explanations below and try again.'}
                    </p>
                  </div>

                  <div className="text-right sm:border-l sm:pl-6 border-slate-300/50">
                    <div data-testid="quiz-score-pct" className="text-2xl font-black">{attemptResult.score_pct}%</div>
                    <div data-testid="quiz-correct-count" className="text-xs opacity-80">
                      {attemptResult.correct} of {attemptResult.total} correct
                    </div>
                  </div>
                </div>

                {/* Question-by-Question Feedback & Explanations */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Detailed Explanations
                  </h4>
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
                        className={`p-4 rounded-xl border transition-all ${
                          isCorrect
                            ? 'bg-green-50/50 border-green-200'
                            : 'bg-red-50/50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {qIdx + 1}. {question.prompt}
                          </p>
                          <span
                            className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded ${
                              isCorrect
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 mb-2">
                          <span className="font-semibold">Your selection: </span>
                          {selectedOption?.text || 'None'}
                        </p>

                        <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">
                          <span className="font-bold text-slate-900">Explanation: </span>
                          {feedbackItem?.explanation || 'No explanation provided.'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end">
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
              <form onSubmit={handleSubmitQuiz} className="space-y-6">
                {activeQuiz.questions.map((question, qIdx) => {
                  const promptId = `prompt-${question.id}`;
                  const hintText = QUIZ_HINTS[question.id];
                  const isHintOpen = !!openHints[question.id];

                  return (
                    <fieldset
                      key={question.id}
                      role="radiogroup"
                      aria-labelledby={promptId}
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <legend
                          id={promptId}
                          className="text-sm font-semibold text-slate-900 px-1"
                        >
                          {qIdx + 1}. {question.prompt}
                        </legend>

                        {hintText && (
                          <button
                            type="button"
                            onClick={() => toggleHint(question.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded border border-blue-100"
                          >
                            <span>💡</span>
                            <span>{isHintOpen ? 'Hide Hint' : 'Need Hint?'}</span>
                          </button>
                        )}
                      </div>

                      {isHintOpen && hintText && (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                          <span>💡</span>
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
                              className={`flex items-start gap-3 p-3 rounded-lg border text-xs sm:text-sm cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-blue-50 border-blue-400 text-blue-950 font-medium shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
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
                                className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                              />
                              <span className="flex-1 select-none">{option.text}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}

                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <span className="text-xs text-slate-500">
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

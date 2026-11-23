import { learnerStorageKey } from '../practiceStorage';

export type Lab = 'learning' | 'calculator' | 'simulation' | 'trading' | 'portfolio' | 'tutor';

type Question = {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};

export type Mission = {
  id: string;
  title: string;
  skill: string;
  icon: string;
  color: string;
  scene: string;
  facts: [string, string][];
  prompt: string;
  choices: { label: string; outcome: string; practiceStartingCash?: number }[];
  takeaway: string;
  hint: string;
  transfer: Question;
  review: Question;
  lab: Lab;
  labLabel: string;
  topic?: string;
};

export const missions: Mission[] = [
  {
    id: 'payday', title: 'Payday plot twist', skill: 'Cash flow', icon: '◈', color: 'lavender',
    scene: 'You just got paid for your new part-time job. Rent is due Friday, and a friend texts you about a stock that jumped last month.',
    facts: [['Paycheck', '$600'], ['Rent in 5 days', '$350'], ['Cash buffer', '$200']],
    prompt: 'Where do you put this paycheck?',
    choices: [
      { label: 'Invest all $600', outcome: 'If the stock drops 12%, the investment is worth $528. Your cash buffer covers only $200 of the $350 rent. Selling $150 of stock covers the gap but leaves no cash buffer.' },
      { label: 'Keep all $600 in cash', outcome: 'After paying rent, you have $450 in cash, including your original buffer. You can revisit investing once the bill is covered.' },
      { label: 'Keep $400 in cash, invest $200', outcome: 'After rent, you have $250 in cash, including the original buffer. If the investment drops 12%, it is worth $176.' },
    ],
    takeaway: 'Separate money you need soon from money you can afford to leave invested.',
    hint: 'Ask what has to be paid before you can wait for prices to recover.',
    transfer: { prompt: 'A $180 textbook bill is due Monday. Which plan keeps it covered even if the market drops?', options: ['Leave $180 accessible in cash', 'Buy a stock and sell Monday', 'Invest it in a diversified stock fund'], answer: 0, explanation: 'The deadline is fixed. Accessible cash avoids depending on what an investment is worth on Monday.' },
    review: { prompt: 'Your share of a trip payment is due next week. What matters most when choosing where to keep that money?', options: ['The highest possible return', 'Reliable access to the amount by the deadline', 'Last month’s stock performance'], answer: 1, explanation: 'For a near-term bill, access and stability matter more than a potential gain.' },
    lab: 'learning', labLabel: 'Explore savings accounts', topic: 'hysa-basics',
  },
  {
    id: 'surprise', title: 'The $240 surprise', skill: 'Emergency savings', icon: '✚', color: 'mint',
    scene: 'Your phone breaks the week you start a new shift. The repair costs $240. Compare how three cash buffers change what happens next.',
    facts: [['Repair today', '$240'], ['Next paycheck', '10 days away']],
    prompt: 'Which buffer do you want to try?',
    choices: [
      { label: '$100 buffer', outcome: 'Your buffer covers $100, leaving $140 to find elsewhere. The small buffer still reduces how much you need.', practiceStartingCash: 100 },
      { label: '$250 buffer', outcome: 'You pay the repair in full and have $10 left. Your next paycheck gives you a chance to start rebuilding.', practiceStartingCash: 250 },
      { label: '$400 buffer', outcome: 'You pay the repair in full and have $160 left. Building that larger buffer meant setting aside more from earlier paychecks.', practiceStartingCash: 400 },
    ],
    takeaway: 'An emergency buffer buys time and gives you more ways to handle a surprise bill.',
    hint: 'Subtract the repair from each balance. A negative result is the funding gap.',
    transfer: { prompt: 'You have $150 saved and face a $220 repair. How much is still uncovered?', options: ['$220', '$150', '$70'], answer: 2, explanation: '$220 minus $150 is $70. Even a partly funded buffer makes the problem smaller.' },
    review: { prompt: 'An unexpected $90 bill comes up. Your accessible savings are $120. What is left if you pay from savings?', options: ['$30', '$90', '$210'], answer: 0, explanation: 'Subtract the expense from the buffer. $120 − $90 leaves $30.' },
    lab: 'calculator', labLabel: 'Model your cash buffer',
  },
  {
    id: 'locked', title: 'The lock-up trade-off', skill: 'Savings and CDs', icon: '▣', color: 'peach',
    scene: 'You have $500 for a laptop, but the purchase date could move up. Compare two fictional accounts. The rate difference is small and the withdrawal terms matter.',
    facts: [['Flexible savings', '4% example APY'], ['12-month CD', '5% example APY'], ['Possible purchase', 'In 3 months']],
    prompt: 'Which setup do you want to test?',
    choices: [
      { label: 'Keep $500 in flexible savings', outcome: 'You can access all $500 when the laptop is needed. The savings rate may change before you buy.' },
      { label: 'Lock $500 in the CD', outcome: 'You earn more if you leave the money for the full term at these rates. If you need it in three months, the account’s early withdrawal terms may cost you.' },
      { label: 'Split the money in half', outcome: 'You can access $250 without touching the CD. If the full $500 is due early, check the CD’s withdrawal terms before assuming you can cover it.' },
    ],
    takeaway: 'Compare access rules and penalties alongside the advertised yield.',
    hint: 'The laptop date might arrive before the CD matures.',
    transfer: { prompt: 'An account offers a higher yield but charges for early withdrawals. What should you check first for money needed in four months?', options: ['The account’s app rating', 'Whether the term and withdrawal rules fit the deadline', 'Whether the rate is the largest number on the page'], answer: 1, explanation: 'A higher yield can be outweighed by penalties or problems getting your money on time.' },
    review: { prompt: 'Two CDs show the same APY. What else can change how useful they are for a fixed-date goal?', options: ['Their name', 'The day you saw the offer', 'Their maturity dates and early withdrawal terms'], answer: 2, explanation: 'Matching the maturity date to your goal can matter even when the quoted yields match.' },
    lab: 'learning', labLabel: 'Explore the CD lesson', topic: 'cd-basics',
  },
  {
    id: 'time', title: 'Give it time', skill: 'Compounding', icon: '↗', color: 'lavender',
    scene: 'You are modeling an annual savings rate to see what time changes. The example assumes a fixed rate, no deposits, and no fees or taxes.',
    facts: [['Starting balance', '$500'], ['Illustrative APY', '5%']],
    prompt: 'Which timeline do you want to model?',
    choices: [
      { label: '1 year', outcome: 'The balance reaches $525. The first year adds $25.' },
      { label: '2 years', outcome: 'The balance reaches $551.25. Year two earns $26.25 because interest is applied to the $525 balance.' },
      { label: '3 years', outcome: 'The balance reaches $578.81, rounded to cents. Previous years’ interest earns interest too.' },
    ],
    takeaway: 'Compounding means growth applies to the new balance, including earlier growth.',
    hint: 'Each year multiplies the previous balance by 1.05.',
    transfer: { prompt: '$100 grows 10% per year for two years. What is the result with annual compounding?', options: ['$120', '$110', '$121'], answer: 2, explanation: 'The first year grows to $110. Ten percent of $110 is $11, so the second year ends at $121.' },
    review: { prompt: 'Why is the second year’s growth larger in a positive-rate account with no withdrawals?', options: ['The interest rate must go up', 'Interest is calculated on a larger balance', 'A new contribution is automatic'], answer: 1, explanation: 'The same rate applies to the original amount plus interest already earned.' },
    lab: 'calculator', labLabel: 'Change the timeline',
  },
  {
    id: 'mix', title: 'One basket or many?', skill: 'Diversification', icon: '◫', color: 'mint',
    scene: 'In a fictional market, one company drops 20% after a surprise announcement. Other holdings stay flat in this example.',
    facts: [['Practice portfolio', '$1,000'], ['Company shock', '−20%']],
    prompt: 'How much of the portfolio is exposed to that one company?',
    choices: [
      { label: 'All $1,000', outcome: 'The portfolio falls $200 to $800. One company drives the entire result.' },
      { label: '$500', outcome: 'The portfolio falls $100 to $900. The other $500 holds its value in this scenario.' },
      { label: '$100', outcome: 'The portfolio falls $20 to $980. In a broad downturn, other holdings could fall too.' },
    ],
    takeaway: 'Diversification can reduce exposure to one holding. Losses are still possible.',
    hint: 'Apply the 20% move only to the amount in the company.',
    transfer: { prompt: 'One holding is 25% of a portfolio and loses 20%. Everything else is flat. How much does the whole portfolio fall?', options: ['5%', '20%', '25%'], answer: 0, explanation: '25% × 20% = 5%. The weight determines how strongly one holding moves the portfolio.' },
    review: { prompt: 'Portfolio A has ten stocks in the same industry. What can still drive all ten down together?', options: ['Nothing, because there are ten stocks', 'A risk affecting that whole industry', 'Only the price of the largest stock'], answer: 1, explanation: 'Different companies can share the same exposure. The number of holdings is only part of the story.' },
    lab: 'portfolio', labLabel: 'Inspect a practice portfolio',
  },
  {
    id: 'open', title: 'After the closing bell', skill: 'Order mechanics', icon: '◷', color: 'peach',
    scene: 'In the market replay, a share closed at $50. You make a decision after the close. The next session’s opening price is hidden until you advance time.',
    facts: [['Previous close', '$50'], ['Next open', 'Hidden'], ['Practice order', '1 share']],
    prompt: 'What trade-off do you want to test?',
    choices: [
      { label: 'Queue a market buy', outcome: 'If the next session opens at $54, the replay fills at $54. The previous close was only a reference.' },
      { label: 'Set a $50 buy limit', outcome: 'If the next session opens at $54, the order does not fill at that open. You capped the price and accepted the possibility of no fill.' },
      { label: 'Wait a session', outcome: 'You keep your cash and learn the next price before making a new decision. You miss any move that happens while you wait.' },
    ],
    takeaway: 'A market order prioritizes execution. A limit order constrains price and may go unfilled.',
    hint: 'The previous closing price and the next opening price can differ.',
    transfer: { prompt: 'In this replay, you place a buy limit at $52 and the next session opens at $55. What happens at the open?', options: ['It fills at $55', 'It does not fill at that open', 'It fills at the previous close'], answer: 1, explanation: 'A buy limit sets the most you are willing to pay. $55 is above that limit.' },
    review: { prompt: 'A stock closed at $50 and opened at $47. At what price does this replay fill a pending market order at the open?', options: ['$50', 'The average of $47 and $50', '$47'], answer: 2, explanation: 'This replay uses the next session’s open for market fills. It does not use the previous close.' },
    lab: 'trading', labLabel: 'Try an order in the Trade Lab',
  },
];

const storageKey = 'futureworth-campaign-v1';
const day = 24 * 60 * 60 * 1000;

type MissionProgress = { completedAt: number; reviewAt: number; reviews: number; choice?: number; recalled?: boolean };
export type CampaignProgress = Partial<Record<string, MissionProgress>>;
export type StoryCheckpoint = { missionId: string; step: number; choice?: number };
const checkpointKey = 'futureworth-story-checkpoint-v1';

export function loadCheckpoint(accountId?: string): StoryCheckpoint | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(learnerStorageKey(checkpointKey, accountId)) ?? 'null');
    const mission = missions.find(({ id }) => id === value?.missionId);
    if (!mission || !Number.isInteger(value.step) || value.step < 0 || value.step > 2) return;
    const hasChoice = Number.isInteger(value.choice) && value.choice >= 0 && value.choice < mission.choices.length;
    if (value.step > 0 && !hasChoice) return;
    return { missionId: mission.id, step: value.step, choice: hasChoice ? value.choice : undefined };
  } catch { return undefined; }
}

export function saveCheckpoint(checkpoint?: StoryCheckpoint, accountId?: string) {
  try {
    const key = learnerStorageKey(checkpointKey, accountId);
    if (checkpoint) localStorage.setItem(key, JSON.stringify(checkpoint));
    else localStorage.removeItem(key);
  } catch { /* The story can continue in memory. */ }
}

export function continueStory(mission: Mission, paydayChoice?: number): Mission {
  if (mission.id !== 'surprise' || paydayChoice === undefined) return mission;
  const cash = [0, 450, 250][paydayChoice];
  if (cash === undefined) return mission;
  const left = cash - 240;
  return {
    ...mission,
    scene: `A week after rent, your phone breaks. Your last paycheck decision left you with $${cash} in cash. See what happens when the repair bill arrives.`,
    facts: [['Cash after rent', `$${cash}`], ...mission.facts],
    choices: [
      { label: 'Use the cash you carried forward', practiceStartingCash: cash, outcome: left >= 0
        ? `Your cash covers the repair and leaves $${left}. That’s the buffer you carry into the next paycheck.`
        : `Your cash is $${-left} short of the repair. You would need to find another way to fund the gap, such as adjusting the timing or using money held elsewhere.` },
      ...mission.choices.slice(0, 2),
    ],
  };
}

export function loadCampaign(accountId?: string): CampaignProgress {
  try {
    const raw = JSON.parse(localStorage.getItem(learnerStorageKey(storageKey, accountId)) ?? '{}') ?? {};
    const progress: CampaignProgress = {};
    for (const { id } of missions) {
      const entry = raw[id];
      if (entry && Number.isFinite(entry.completedAt) && Number.isFinite(entry.reviewAt)
        && Number.isInteger(entry.reviews) && entry.reviews >= 0) {
        progress[id] = { ...entry, recalled: entry.recalled === true || entry.reviews > 0 };
      }
    }
    return progress;
  } catch {
    return {};
  }
}

export function saveCampaign(progress: CampaignProgress, accountId?: string) {
  try { localStorage.setItem(learnerStorageKey(storageKey, accountId), JSON.stringify(progress)); } catch { /* Practice still works without storage. */ }
}

export function completeMission(progress: CampaignProgress, id: string, now = Date.now(), choice?: number): CampaignProgress {
  if (progress[id]) return progress;
  return { ...progress, [id]: { completedAt: now, reviewAt: now + day, reviews: 0, choice } };
}

export function recordReview(progress: CampaignProgress, id: string, correct: boolean, now = Date.now()): CampaignProgress {
  const previous = progress[id];
  if (!previous || previous.reviewAt > now) return progress;
  const reviews = correct ? previous.reviews + 1 : 0;
  const delay = correct ? [1, 3, 7, 14][Math.min(reviews, 3)] * day : 10 * 60 * 1000;
  return { ...progress, [id]: { ...previous, reviewAt: now + delay, reviews, recalled: previous.recalled || correct } };
}

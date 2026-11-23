const dayMs = 86_400_000;
export const DAILY_AURA = 40;

type Question = {
  prompt: string;
  hint: string;
  explanation: string;
} & ({ options: string[]; answer: number } | { amount: number });

export type DailyLesson = { title: string; topic: string; questions: Question[] };

export function localPracticeDay(now: number) {
  const date = new Date(now);
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / dayMs);
}

function isoDay(day: number) {
  return new Date(day * dayMs).toISOString().slice(0, 10);
}

export function dailyAwardKey(day: number) {
  return `daily:${isoDay(day)}`;
}

export function practiceWeek(day: number, awards: Record<string, number> = {}) {
  const weekday = new Date(day * dayMs).getUTCDay();
  const monday = day - (weekday + 6) % 7;
  return Array.from({ length: 7 }, (_, index) => {
    const slot = monday + index;
    return {
      date: isoDay(slot),
      label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
      complete: Object.prototype.hasOwnProperty.call(awards, dailyAwardKey(slot)),
      today: slot === day,
    };
  });
}

export function dailyLesson(day: number): DailyLesson {
  const variant = ((Math.floor(day / 4) % 8) + 8) % 8;
  const repair = 180 + variant * 15;
  const cash = 90 + variant * 5;
  const monthly = 20 + variant * 5;
  const holding = 200 + variant * 50;
  const fee = 12 + variant;
  const lessons: DailyLesson[] = [
    {
      title: 'Keep a cash cushion', topic: 'Emergency savings', questions: [
        {
          prompt: 'Your next paycheck arrives in ten days. Your bike needs a repair before your shift tomorrow. What matters most about the money set aside for it?',
          options: ['That its value could rise quickly', 'That you can access it before the repair', 'That it stays locked for a full year'], answer: 1,
          hint: 'Start with when the bill is due.',
          explanation: 'A cash buffer is useful when it’s accessible by the time the bill arrives.',
        },
        {
          prompt: `The repair costs $${repair}. You have $${cash} ready in your buffer. How many dollars do you still need?`,
          amount: repair - cash, hint: 'Subtract your cash buffer from the repair price.',
          explanation: `$${repair} − $${cash} = $${repair - cash}. The buffer reduced the amount you had to find elsewhere.`,
        },
        {
          prompt: 'You use part of your buffer. What makes it more useful the next time something breaks?',
          options: ['Make a realistic plan to refill it', 'Move what’s left into a volatile stock', 'Assume the next bill will be smaller'], answer: 0,
          hint: 'Think about restoring the cash you spent.',
          explanation: 'A plan to refill the buffer restores some flexibility for the next surprise.',
        },
      ],
    },
    {
      title: 'Make a savings plan', topic: 'Budgeting', questions: [
        {
          prompt: 'You want to pay for a course four months from now. Which plan is easiest to check against that deadline?',
          options: ['Save whatever is left at the end', 'Guess how much the market will return', 'Set an amount to put aside each month'], answer: 2,
          hint: 'Look for the plan that gives you an amount and a timeline.',
          explanation: 'A monthly amount gives you a concrete way to check whether the deadline is realistic.',
        },
        {
          prompt: `You set aside $${monthly} each month for four months. With no interest, how many dollars will you have saved?`,
          amount: monthly * 4, hint: 'Multiply one monthly deposit by four.',
          explanation: `Four deposits of $${monthly} add up to $${monthly * 4}.`,
        },
        {
          prompt: 'You learn the fee is due a month earlier. Which change addresses the new deadline?',
          options: ['Leave the plan as it is', 'Recalculate using three deposits and see if a larger deposit fits', 'Count on interest to make up the missing deposit'], answer: 1,
          hint: 'There is one fewer month to save.',
          explanation: 'Recalculate using the time you actually have. If the new amount is unrealistic, you can look for another option early.',
        },
      ],
    },
    {
      title: 'Read the fine print', topic: 'Savings and CDs', questions: [
        {
          prompt: 'A 12-month CD offers a higher yield. You may need the money in three months. What detail should you check first?',
          options: ['The early withdrawal terms', 'The logo on the account', 'The rate you saw last year'], answer: 0,
          hint: 'Your goal might arrive before the account matures.',
          explanation: 'Access and possible penalties can matter more than a higher advertised yield.',
        },
        {
          prompt: `In this example, an early withdrawal adds a $${fee} penalty but you earned $${fee + 4} in interest. How many dollars of interest remain after the penalty?`,
          amount: 4, hint: 'Subtract the penalty from interest earned.',
          explanation: `$${fee + 4} in interest minus a $${fee} penalty leaves $4 of interest in this example.`,
        },
        {
          prompt: 'Two accounts show the same yield. One allows easy withdrawals. Which goal most favors easy withdrawals?',
          options: ['A fixed bill due after both accounts mature', 'A repair that could happen any week', 'A long-term goal with no change in timing'], answer: 1,
          hint: 'Pick the goal with the least predictable deadline.',
          explanation: 'An unpredictable repair makes access valuable even when the interest rates are the same.',
        },
      ],
    },
    {
      title: 'Spread investment risk', topic: 'Diversification', questions: [
        {
          prompt: 'One company announces a setback. Which portfolio is most exposed to that single company?',
          options: ['A portfolio with 10% in that company', 'A portfolio with 100% in that company', 'A portfolio with 25% in that company'], answer: 1,
          hint: 'Compare how much of each portfolio depends on that business.',
          explanation: 'The larger the company’s share of the portfolio, the more its price moves the overall balance.',
        },
        {
          prompt: `You hold $${holding} in one company. It falls 10%, and everything else stays flat. How many dollars does the whole portfolio lose?`,
          amount: holding / 10, hint: 'Apply the 10% drop only to the affected holding.',
          explanation: `10% of $${holding} is $${holding / 10}. The other holdings don’t change in this scenario.`,
        },
        {
          prompt: 'You own ten stocks, all in the same industry. What risk could still affect them together?',
          options: ['An industry-wide setback', 'The exact number of shares you own', 'None, because there are ten stocks'], answer: 0,
          hint: 'Several companies can share the same risk.',
          explanation: 'Diversification depends on what the holdings are exposed to. Different companies can still be affected by the same event.',
        },
      ],
    },
  ];
  return lessons[((day % lessons.length) + lessons.length) % lessons.length];
}

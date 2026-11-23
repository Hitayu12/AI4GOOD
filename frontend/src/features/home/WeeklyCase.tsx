import { useState } from 'react';
import { Options } from './MissionPlayer';

export const WEEKLY_POINTS = 75;
const weekMs = 7 * 24 * 60 * 60 * 1000;
const monday = Date.UTC(2020, 0, 6);

export function weeklyCaseKey(now: number) {
  return `weekly:${Math.floor((now - monday) / weekMs)}`;
}

function weeklyQuestion(now: number) {
  const week = Math.floor((now - monday) / weekMs);
  const step = ((week % 12) + 12) % 12;
  const cases = [
    {
      skill: 'Emergency savings',
      prompt: `You have $${160 + step * 5} in cash. Your bike repair is $${220 + step * 10}. What’s the funding gap?`,
      options: [`$${220 + step * 10}`, `$${60 + step * 5}`, `$${160 + step * 5}`],
      answer: 1,
      explanation: 'Subtract available cash from the cost. The rest is what you still need to cover.',
    },
    {
      skill: 'Time horizons',
      prompt: 'Course fees are due in six weeks. A 12-month CD advertises a higher yield than your flexible savings account. What’s the key trade-off?',
      options: ['Access before maturity may involve a penalty', 'A higher yield guarantees a better fit', 'Flexible savings has to be invested in stocks'],
      answer: 0,
      explanation: 'Compare whether you can access the money by the deadline and what it would cost to withdraw early.',
    },
    {
      skill: 'Portfolio exposure',
      prompt: `A single company makes up ${20 + step * 5}% of your practice portfolio. Its price drops 10%. Everything else is flat. How much does your portfolio fall?`,
      options: [`${20 + step * 5}%`, '10%', `${(20 + step * 5) / 10}%`],
      answer: 2,
      explanation: 'Multiply the holding’s weight by its percentage drop. Cash and the other holdings are unchanged.',
    },
  ];
  return cases[step % cases.length];
}

export function WeeklyCase({ now, completed, onCorrect }: {
  now: number;
  completed: boolean;
  onCorrect: (awardKey: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<number>();
  const [checked, setChecked] = useState(false);
  const question = weeklyQuestion(now);
  const correct = selection === question.answer;

  return (
    <section className="fw-panel fw-weekly">
      <header>
        <div><p className="fw-kicker">{question.skill}</p><h2>Weekly case</h2></div>
        <button type="button" className="fw-quiet" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Close case' : completed ? 'Revisit case' : `Play for ${WEEKLY_POINTS} Aura`}</button>
      </header>
      {!open && <p className="fw-meta">{completed ? 'Completed this week. A new case opens Monday (UTC).' : 'A short decision that changes each week.'}</p>}
      {open && <>
        <Options name="weekly-case" prompt={question.prompt} options={question.options} disabled={checked} selected={selection} onSelect={setSelection} />
        {checked && <p role="status" className={`fw-feedback ${correct ? 'fw-mint' : 'fw-peach'}`}>{question.explanation}</p>}
        {checked ? (
          <button className="fw-quiet" type="button" onClick={() => { setSelection(undefined); setChecked(false); }}>Replay case</button>
        ) : (
          <button type="button" className="fw-button" disabled={selection === undefined} onClick={() => {
            setChecked(true);
            if (correct && !completed) onCorrect(weeklyCaseKey(now));
          }}>Check my answer</button>
        )}
      </>}
    </section>
  );
}

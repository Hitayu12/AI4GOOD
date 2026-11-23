import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Options } from './MissionPlayer';
import { PracticeWeek, Tuck } from './Tuck';
import { DAILY_AURA, dailyAwardKey, dailyLesson } from './dailyPractice';
import { learnerStorageKey } from '../practiceStorage';

type Props = {
  day: number;
  storageScope?: string;
  awards?: Record<string, number>;
  onComplete: (day: number) => void;
  onExit: () => void;
  onReview: () => void;
};

const checkpointKey = 'futureworth-daily-checkpoint-v1';
function readStep(day: number, key: string) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (saved?.day === day && Number.isInteger(saved.step) && saved.step >= 0 && saved.step < 3) return saved.step as number;
  } catch { /* Start fresh if storage is unavailable. */ }
  return 0;
}

function saveStep(day: number, step: number, key: string) {
  try { localStorage.setItem(key, JSON.stringify({ day, step })); }
  catch { /* Practice still works without storage. */ }
}

export function DailyPracticeView({ day, storageScope, awards, onComplete, onExit, onReview }: Props) {
  const key = learnerStorageKey(checkpointKey, storageScope);
  const lesson = dailyLesson(day);
  const done = Boolean(awards?.[dailyAwardKey(day)]);
  const [step, setStep] = useState(() => readStep(day, key));
  const [selected, setSelected] = useState<number>();
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<'right' | 'retry'>();
  const [hintOpen, setHintOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const exercise = lesson.questions[step];
  const isChoice = 'options' in exercise;
  const ready = isChoice ? selected !== undefined : amount.trim() !== '' && Number.isFinite(Number(amount));

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step, done]);

  function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || result) return;
    const correct = 'options' in exercise ? selected === exercise.answer : Number(amount) === exercise.amount;
    setResult(correct ? 'right' : 'retry');
  }

  function next() {
    if (step === lesson.questions.length - 1) {
      onComplete(day);
      return;
    }
    const following = step + 1;
    saveStep(day, following, key);
    setStep(following);
    setSelected(undefined);
    setAmount('');
    setResult(undefined);
    setHintOpen(false);
  }

  return (
    <section className="fw-player fw-daily-player" aria-labelledby="daily-heading">
      <div className="fw-player-top">
        <button type="button" className="fw-quiet" onClick={onExit}>{done ? 'Back to home' : 'Save and exit practice'}</button>
        <span className="fw-meta">{done ? 'Daily practice' : `Step ${step + 1} of ${lesson.questions.length}`}</span>
      </div>
      {!done && <progress className="fw-daily-meter" aria-label="Daily practice progress" value={step + (result === 'right' ? 1 : 0)} max={lesson.questions.length} />}
      <div className="fw-panel fw-player-card">
        <div className="fw-daily-guide">
          <Tuck className="fw-tuck-guide" />
          <div>
            <p className="fw-kicker">Tuck · {lesson.topic}</p>
            <h1 id="daily-heading" ref={heading} tabIndex={-1}>{done ? 'Practice complete.' : lesson.title}</h1>
            <p className="fw-meta">{done ? `+${DAILY_AURA} Aura for today’s practice.` : ['Make the call', 'Work out the numbers', 'Try a new situation'][step]}</p>
          </div>
        </div>
        {done ? <>
          <p className="fw-body">Today’s practice counts toward your weekly goal. Come back for a new topic tomorrow, or practice what you’ve already learned.</p>
          <PracticeWeek day={day} awards={awards} />
          <div className="fw-player-actions"><button className="fw-button" type="button" onClick={onReview}>Open quick review</button></div>
        </> : (
          <form onSubmit={check}>
            {'options' in exercise ? (
              <Options prompt={exercise.prompt} name="daily-choice" options={exercise.options}
                selected={selected} onSelect={setSelected} disabled={Boolean(result)} />
            ) : (
              <label className="fw-field fw-daily-number">
                {exercise.prompt}
                <input type="number" inputMode="numeric" min="0" step="1" value={amount} disabled={Boolean(result)}
                  onChange={(event) => setAmount(event.target.value)} />
              </label>
            )}
            {result && <p role="status" className={`fw-feedback ${result === 'right' ? 'fw-mint' : 'fw-peach'}`}>
              {result === 'right' ? exercise.explanation : exercise.hint}
            </p>}
            {!result && hintOpen && <p className="fw-feedback" role="status">{exercise.hint}</p>}
            <div className="fw-player-actions">
              {result === 'right' ? <button type="button" className="fw-button" onClick={next}>{step === lesson.questions.length - 1 ? 'Finish daily practice' : 'Continue'}</button>
                : result === 'retry' ? <button type="button" className="fw-button" onClick={() => { setResult(undefined); setSelected(undefined); setAmount(''); }}>Try again</button>
                : <>
                  <button type="submit" className="fw-button" disabled={!ready}>Check answer</button>
                  <button type="button" className="fw-quiet" aria-expanded={hintOpen} onClick={() => setHintOpen(!hintOpen)}>{hintOpen ? 'Hide hint' : 'Get a hint from Tuck'}</button>
                </>}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

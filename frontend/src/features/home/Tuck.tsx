import tuck from './tuck-mascot.png';
import { practiceWeek } from './dailyPractice';

export function Tuck({ className }: { className?: string }) {
  return <img className={className} src={tuck} width={480} height={439} alt="" aria-hidden="true" />;
}

export function PracticeWeek({ day, awards }: { day: number; awards?: Record<string, number> }) {
  const week = practiceWeek(day, awards);
  const count = week.filter((slot) => slot.complete).length;
  return (
    <div className="fw-practice-week">
      <p><strong>{count} {count === 1 ? 'day' : 'days'} practiced this week</strong><span>{count >= 3 ? 'Weekly goal reached' : 'Weekly goal: 3 days'}</span></p>
      <ol aria-label="Practice days this week">
        {week.map(({ date, label, complete, today }) => (
          <li key={date} data-done={complete} aria-current={today ? 'date' : undefined}>
            <span>{label}</span>
            <span aria-hidden="true">{complete ? '✓' : '·'}</span>
            <span className="sr-only">{complete ? 'Practiced' : 'Open'}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

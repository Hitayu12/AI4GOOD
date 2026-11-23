import { useState } from 'react';

const cases = [
  { id: 'cash', label: 'Savings', question: 'I need money for a laptop soon. Which detail changes my choice most?', options: ['When I need the money', 'What a friend bought last month'], correct: 0,
    response: 'Start with the deadline. If it comes before the CD matures, compare the withdrawal terms with flexible savings.', next: 'learning' },
  { id: 'growth', label: 'Compounding', question: 'I want to see what compounding adds. Which comparison isolates it?', options: ['Change the rate and the deposit together', 'Keep deposits the same and compare 0% with a positive rate'], correct: 1,
    response: 'Keep the deposits and timeline fixed. The difference then comes from the rate and compounding.', next: 'calculator' },
  { id: 'risk', label: 'Diversification', question: 'One company just dropped. What tells me how much that affects the whole portfolio?', options: ['The company’s share of the portfolio', 'The number of trades I made this week'], correct: 0,
    response: 'Weight is the key. A holding that represents 20% of the portfolio and falls 10% contributes a 2% portfolio drop if everything else is flat.', next: 'portfolio' },
] as const;

export function CoachPractice({ onPractice }: { onPractice: (tab: 'learning' | 'calculator' | 'portfolio') => void }) {
  const [active, setActive] = useState<(typeof cases)[number]>(cases[0]);
  const [response, setResponse] = useState<number>();

  return (
    <section className="fw-panel fw-coach-card" aria-labelledby="coach-practice-heading">
      <h2 id="coach-practice-heading">Work through an example</h2>
      <p className="fw-meta">Choose a topic for a short, guided practice conversation.</p>
      <div className="fw-board-filters mt-3" role="group" aria-label="Practice topic">
        {cases.map((item) => <button key={item.id} type="button" className="fw-quiet" aria-pressed={item.id === active.id} onClick={() => { setActive(item); setResponse(undefined); }}>{item.label}</button>)}
      </div>
      <p className="fw-feedback">{active.question}</p>
      <div className="fw-player-actions">
        {active.options.map((option, index) => <button key={option} type="button" className="fw-quiet" onClick={() => setResponse(index)}>{option}</button>)}
      </div>
      {response !== undefined && <>
        <p role="status" className={`fw-feedback ${response === active.correct ? 'fw-mint' : 'fw-peach'}`}>
          {response === active.correct ? 'That’s the useful comparison. ' : 'Consider this first. '}{active.response}
        </p>
        <button type="button" className="fw-button" onClick={() => onPractice(active.next)}>Try it with a tool</button>
      </>}
    </section>
  );
}

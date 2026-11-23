import { useEffect, useRef, useState } from 'react';
import { Mission, type StoryCheckpoint } from './campaign';
import { Tuck } from './Tuck';

type Props = {
  mission: Mission;
  checkpoint?: StoryCheckpoint;
  onCheckpoint: (checkpoint: StoryCheckpoint) => void;
  onComplete: (choice?: number) => void;
  onExit: () => void;
  onNext: (() => void) | undefined;
  onOpenLab: (choice: number) => void;
};

export function MissionPlayer({ mission, checkpoint, onCheckpoint, onComplete, onExit, onNext, onOpenLab }: Props) {
  const [step, setStep] = useState(checkpoint?.step ?? 0);
  const [choice, setChoice] = useState(checkpoint?.choice);
  const [answer, setAnswer] = useState<number>();
  const [checked, setChecked] = useState(false);
  const [hint, setHint] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const passed = checked && answer === mission.transfer.answer;

  useEffect(() => { heading.current?.focus(); }, [step]);

  function advance() {
    const next = step + 1;
    setStep(next);
    if (next <= 2) onCheckpoint({ missionId: mission.id, step: next, choice });
  }

  return (
    <div className="fw-player">
      <div className="fw-player-top">
        <button type="button" className="fw-quiet" onClick={onExit}>{step === 3 ? 'Exit mission' : 'Save and exit'}</button>
        <span className="fw-meta">{mission.skill} · {Math.min(step + 1, 3)} of 3</span>
      </div>
      <div className="fw-step-meter" aria-hidden="true">
        {['Decide', 'Observe', 'Apply'].map((label, index) => (
          <span key={label} data-active={step >= index}>{label}</span>
        ))}
      </div>
      <article className="fw-panel fw-player-card" key={step}>
        <span className={`fw-tile fw-${mission.color}`} aria-hidden="true">{mission.icon}</span>
        {step === 0 && <>
          <h1 ref={heading} tabIndex={-1}>{mission.title}</h1>
          <p className="fw-body">{mission.scene}</p>
          <dl className="fw-facts">{mission.facts.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}</dl>
          <Options prompt={mission.prompt} name="mission-choice" options={mission.choices.map((item) => item.label)} selected={choice} onSelect={(value) => {
            setChoice(value);
            onCheckpoint({ missionId: mission.id, step, choice: value });
          }} />
          <div className="fw-player-actions">
            <button type="button" className="fw-button" disabled={choice === undefined} onClick={advance}>Reveal the outcome</button>
            <button type="button" className="fw-quiet" aria-expanded={hint} onClick={() => setHint(!hint)}>Get a hint</button>
          </div>
          {hint && <div className="fw-feedback fw-tuck-hint" role="status"><Tuck className="fw-tuck-icon" /><p><strong>Tuck’s hint</strong><br />{mission.hint}</p></div>}
        </>}
        {step === 1 && choice !== undefined && <>
          <h1 ref={heading} tabIndex={-1}>Here’s what happened.</h1>
          <p className="fw-meta">Your choice · {mission.choices[choice].label}</p>
          <p className="fw-body">{mission.choices[choice].outcome}</p>
          <div className="fw-feedback"><strong>Takeaway</strong><p>{mission.takeaway}</p></div>
          <details className="fw-compare">
            <summary>Compare the other choices</summary>
            {mission.choices.filter((_, index) => index !== choice).map((item) => (
              <div key={item.label}><strong>{item.label}</strong><p>{item.outcome}</p></div>
            ))}
          </details>
          <div className="fw-player-actions"><button type="button" className="fw-button" onClick={advance}>Try a new situation</button></div>
        </>}
        {step === 2 && <>
          <h1 ref={heading} tabIndex={-1}>Can you use it somewhere else?</h1>
          <Options prompt={mission.transfer.prompt} name="mission-transfer" options={mission.transfer.options} selected={answer} disabled={checked} onSelect={setAnswer} />
          {checked && <div role="status" className={`fw-feedback ${passed ? 'fw-mint' : 'fw-peach'}`}>
            <strong>{passed ? 'You got it.' : 'Take another look.'}</strong><p>{mission.transfer.explanation}</p>
          </div>}
          <div className="fw-player-actions">
            {!checked && <button type="button" className="fw-button" disabled={answer === undefined} onClick={() => setChecked(true)}>Check my answer</button>}
            {checked && !passed && <button type="button" className="fw-button" onClick={() => { setChecked(false); setAnswer(undefined); }}>Try again</button>}
            {passed && <button type="button" className="fw-button" onClick={() => { onComplete(choice); advance(); }}>Finish mission</button>}
          </div>
        </>}
        {step === 3 && <>
          <h1 ref={heading} tabIndex={-1}>Mission complete.</h1>
          <p className="fw-body">You applied {mission.skill.toLowerCase()} to a new situation. You can see when your follow-up opens in Quick review.</p>
          <div className="fw-feedback fw-mint">{mission.takeaway}</div>
          <div className="fw-player-actions">
            {onNext && <button type="button" className="fw-button" onClick={onNext}>Play next mission</button>}
            <button type="button" className={onNext ? 'fw-quiet' : 'fw-button'} onClick={() => onOpenLab(choice ?? 0)}>{mission.labLabel}</button>
          </div>
        </>}
      </article>
    </div>
  );
}

export function Options({ prompt, name, options, selected, onSelect, disabled }: {
  prompt: string;
  name: string;
  options: string[];
  selected?: number;
  onSelect: (index: number) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="fw-options" disabled={disabled}>
      <legend>{prompt}</legend>
      {options.map((option, index) => (
        <label key={option} data-selected={selected === index}>
          <input type="radio" name={name} checked={selected === index} onChange={() => onSelect(index)} />
          <span>{option}</span>
        </label>
      ))}
    </fieldset>
  );
}

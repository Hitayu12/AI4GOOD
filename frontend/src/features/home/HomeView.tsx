import { useState } from 'react';
import { MarketSentimentArena } from '../community/MarketSentimentArena';
import { CampaignProgress, Mission, missions, type StoryCheckpoint } from './campaign';
import { Options } from './MissionPlayer';
import { WeeklyCase, weeklyCaseKey } from './WeeklyCase';
import { PracticeWeek, Tuck } from './Tuck';
import { DAILY_AURA, dailyAwardKey, dailyLesson, localPracticeDay } from './dailyPractice';
import type { AuraState } from '../aura/auraTypes';
import { goals, schoolName, type StudentProfile } from '../profile/studentProfile';
import './campaign.css';

export type CampaignPage = 'home' | 'missions' | 'review';

type Props = {
  page: CampaignPage;
  progress: CampaignProgress;
  checkpoint?: StoryCheckpoint;
  profile: StudentProfile;
  aura: AuraState;
  storageScope?: string;
  now: number;
  onPlay: (mission: Mission) => void;
  onPage: (page: CampaignPage) => void;
  onReview: (id: string, correct: boolean) => void;
  onOpenTrade: () => void;
  onOpenAuraHub: () => void;
  onOpenDailyDrop: () => void;
  onOpenLeaderboard: () => void;
  onOpenProfile: () => void;
  onOpenDailyPractice: () => void;
  onWeeklyCorrect: (key: string) => void;
  onVoteAura: (points: number) => void;
};

export function HomeView({
  page, progress, checkpoint, profile, aura, storageScope, now, onPlay, onPage, onReview, onOpenTrade,
  onOpenAuraHub, onOpenDailyDrop, onOpenLeaderboard, onOpenProfile, onOpenDailyPractice, onWeeklyCorrect, onVoteAura,
}: Props) {
  const [showArena, setShowArena] = useState(false);
  const next = missions.find(({ id }) => !progress[id]);
  const completed = missions.filter(({ id }) => progress[id]).length;
  const due = missions.filter(({ id }) => (progress[id]?.reviewAt ?? Infinity) <= now);
  const nextReview = Math.min(...missions.map(({ id }) => progress[id]?.reviewAt ?? Infinity));
  const resumed = checkpoint && !progress[checkpoint.missionId] ? missions.find(({ id }) => id === checkpoint.missionId) : undefined;
  const goal = goals.find(({ id }) => id === profile.goal);
  const displayed = resumed ?? next ?? missions[0];
  const school = schoolName(profile);
  const weekKey = weeklyCaseKey(now);
  const today = localPracticeDay(now);
  const dailyDone = Boolean(aura.learningAwards?.[dailyAwardKey(today)]);
  const weekly = <WeeklyCase key={weekKey} now={now} completed={Boolean(aura.learningAwards?.[weekKey])} onCorrect={onWeeklyCorrect} />;
  const nextReviewLabel = Number.isFinite(nextReview)
    ? new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(nextReview)
    : null;

  if (page === 'review') {
    return (
      <div className="fw-narrow">
        <header className="fw-page-header"><p className="fw-kicker">Practice from memory</p><h1>Quick review</h1><p>Try a different example from a mission you’ve already played.</p></header>
        <ReviewCard
          mission={due[0]}
          nextReview={nextReviewLabel}
          onReview={onReview}
          onBrowse={() => onPage('missions')}
        />
        {weekly}
      </div>
    );
  }

  return (
    <div className="fw-home">
      {page === 'home' && <>
        <header className="fw-page-header">
          <p className="fw-kicker">Your money journey</p>
          <h1>Money moves.</h1>
          <p>Play through the decisions that come with your first paycheck.</p>
        </header>
        <section className="fw-daily-card" aria-labelledby="daily-home-title">
          <div className="fw-daily-art"><Tuck className="fw-tuck-home" /></div>
          <div className="fw-daily-copy">
            <p className="fw-kicker">Daily practice with Tuck</p>
            <h2 id="daily-home-title">{dailyLesson(today).title}</h2>
            <p>{dailyDone ? 'You practiced today. A new lesson opens tomorrow.' : `A decision, a quick calculation, and a fresh example. Earn ${DAILY_AURA} Aura.`}</p>
            <button type="button" className="fw-button" onClick={onOpenDailyPractice}>{dailyDone ? 'View today’s practice' : 'Start daily practice'}</button>
          </div>
          <PracticeWeek day={today} awards={aura.learningAwards} />
        </section>
        <div className="fw-dashboard">
          <article className="fw-hero">
            <div className="fw-hero-art" aria-hidden="true" />
            <div className="fw-hero-content">
              <p className="fw-hero-tag"><span aria-hidden="true">✦</span> {resumed ? 'In progress' : next ? 'Up next' : 'Journey complete'}</p>
              <h2>{displayed.title}</h2>
              <p>{displayed.id === 'payday' ? 'You just got paid. Rent’s due Friday. What’s your move?' : displayed.scene}</p>
              <button type="button" className="fw-button fw-button-lime" onClick={() => onPlay(displayed)}>{resumed ? 'Continue mission' : next ? 'Play mission' : 'Replay first mission'} <span aria-hidden="true">▶</span></button>
            </div>
          </article>
          <aside className="fw-dashboard-side">
            <section className="fw-panel fw-mini">
              <span className="fw-tile fw-mint" aria-hidden="true">✧</span>
              <div><h2>Your progress</h2><p>{completed} of {missions.length} missions complete</p></div>
              <progress aria-label="Missions complete" value={completed} max={missions.length} />
              <button type="button" className="fw-quiet" onClick={onOpenProfile}>{aura.points.toLocaleString()} Aura · Level {aura.level}</button>
            </section>
            <section className="fw-panel fw-mini fw-review-summary">
              <span className="fw-tile fw-peach" aria-hidden="true">◷</span>
              <div><h2>Quick review</h2><p>{due.length ? `${due.length} ready to practice` : nextReviewLabel ? `Next: ${nextReviewLabel}` : 'Finish a mission to start'}</p></div>
              <button type="button" className="fw-quiet" onClick={() => onPage('review')}>Open review</button>
            </section>
          </aside>
        </div>
        <div className="fw-campus-callout fw-panel">
          <span className="fw-tile fw-lavender" aria-hidden="true">♜</span>
          <div>
            <h2>{school || 'School & university league'}</h2>
            <p>{school ? 'See your rank among demo classmates and where your school lands.' : 'Pick a school in your profile to preview its standings.'}</p>
          </div>
          <button type="button" className="fw-quiet" onClick={school ? onOpenLeaderboard : onOpenProfile}>{school ? 'Open standings' : 'Choose a school'}</button>
        </div>
      </>}

      <section className="fw-mission-section" aria-labelledby="mission-list-heading">
        <header className="fw-section-heading">
          <div>
            <p className="fw-kicker">First paycheck series</p>
            {page === 'missions' ? <h1 id="mission-list-heading">Mission map</h1> : <h2 id="mission-list-heading">Mission map</h2>}
          </div>
          <span className="fw-meta">{goal ? `Your goal: ${goal.label}` : `${missions.length} playable stories`}</span>
        </header>
        <ol className="fw-mission-grid">
          {missions.map((mission) => (
            <li key={mission.id}>
              <button type="button" className="fw-panel fw-mission-tile" onClick={() => onPlay(mission)}>
                <span className={`fw-tile fw-${mission.color}`} aria-hidden="true">{mission.icon}</span>
                <span className="fw-mission-copy"><small>{mission.skill}</small><strong>{mission.title}</strong></span>
                <span className="fw-mission-indicator" aria-label={progress[mission.id] ? 'Completed' : undefined}>{progress[mission.id] ? '✓' : <span aria-hidden="true">▶</span>}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
      {page === 'home' && weekly}

      {page === 'home' && <section className="fw-panel fw-extras">
        <h2>Extras</h2>
        <div className="fw-player-actions">
          <button type="button" className="fw-quiet" onClick={onOpenAuraHub}>Activity badges</button>
          <button type="button" className="fw-quiet" onClick={onOpenDailyDrop}>Demo reward</button>
          <button type="button" className="fw-quiet" aria-expanded={showArena} onClick={() => setShowArena(!showArena)}>Market sentiment demo</button>
        </div>
        {showArena && <div className="mt-4 space-y-3">
          <p className="fw-meta">This is a demo with fictional community activity.</p>
          <MarketSentimentArena storageScope={storageScope} onVoteAura={onVoteAura} />
          <button type="button" className="fw-quiet" onClick={onOpenTrade}>Open Trade Lab</button>
        </div>}
      </section>}
    </div>
  );
}

function ReviewCard({ mission, nextReview, onReview, onBrowse }: {
  mission: Mission | undefined;
  nextReview: string | null;
  onReview: Props['onReview'];
  onBrowse: () => void;
}) {
  const [selected, setSelected] = useState<number>();
  const [result, setResult] = useState<{ correct: boolean; explanation: string }>();

  function check() {
    if (selected === undefined || !mission) return;
    const correct = selected === mission.review.answer;
    setResult({ correct, explanation: mission.review.explanation });
    onReview(mission.id, correct);
  }

  return (
    <article className="fw-panel fw-player-card">
      {result ? <>
        <h2>{result.correct ? 'Nice recall.' : 'Worth another try.'}</h2>
        <p role="status" className="fw-feedback">{result.explanation}</p>
        {mission
          ? <button type="button" className="fw-button" onClick={() => { setSelected(undefined); setResult(undefined); }}>Next review</button>
          : <button type="button" className="fw-button" onClick={onBrowse}>Browse missions</button>}
      </> : mission ? <>
        <p className="fw-kicker">{mission.skill}</p>
        <Options key={mission.id} prompt={mission.review.prompt} name="review-answer" options={mission.review.options} selected={selected} onSelect={setSelected} />
        <button type="button" className="fw-button" disabled={selected === undefined} onClick={check}>Check my answer</button>
      </> : <>
        <h2>{nextReview ? 'You’re caught up.' : 'Your reviews start here.'}</h2>
        <p className="fw-body">{nextReview ? `Next review opens ${nextReview}.` : 'Complete a mission and its first follow-up question will be ready the next day.'}</p>
        <button type="button" className="fw-button" onClick={onBrowse}>Browse missions</button>
      </>}
    </article>
  );
}

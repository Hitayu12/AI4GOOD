import { useState } from 'react';
import { getStandings, schoolName, type BoardScope, type StudentProfile } from './studentProfile';

const views: { id: BoardScope; label: string }[] = [
  { id: 'all', label: 'All learners' },
  { id: 'my-school', label: 'My school' },
  { id: 'schools', label: 'School rankings' },
];

export function LeaderboardView({ profile, points, initialScope = 'all', onProfile, onMissions }: {
  profile: StudentProfile;
  points: number;
  initialScope?: BoardScope;
  onProfile: () => void;
  onMissions: () => void;
}) {
  const [scope, setScope] = useState<BoardScope>(initialScope);
  const school = schoolName(profile);
  const standings = getStandings(scope, profile, points);
  const current = standings.find((entry) => entry.current);

  return (
    <div className="fw-profile">
      <header className="fw-page-header">
        <p className="fw-kicker">Aura standings</p>
        <h1>Leaderboards</h1>
        <p>Your earned points are real within this browser. The other learners and school scores below are examples.</p>
      </header>
      <section className="fw-profile-hero" aria-label="Leaderboard summary">
        <div className="fw-identity">
          <span className="fw-tile fw-lavender" aria-hidden="true">♜</span>
          <div><h2>{current ? `Rank #${current.rank}` : 'Choose a school'}</h2><p>{current ? views.find(({ id }) => id === scope)?.label : 'Add your school or university to see its demo standings.'}</p></div>
        </div>
        <div className="fw-profile-rank"><p>Your Aura</p><strong>{points.toLocaleString()} <small>pts</small></strong><button className="fw-button fw-button-lime" type="button" onClick={onMissions}>Play a mission</button></div>
      </section>
      <div className="fw-board-bar">
        <div role="group" aria-label="Leaderboard scope" className="fw-board-filters">
          {views.map(({ id, label }) => <button key={id} type="button" className="fw-quiet" aria-pressed={scope === id} onClick={() => setScope(id)}>{label}</button>)}
        </div>
        <button type="button" className="fw-quiet" onClick={onProfile}>{school ? 'Change school' : 'Add school or university'}</button>
      </div>
      <section className="fw-panel fw-board" aria-labelledby="standings-title">
        <h2 id="standings-title">{scope === 'my-school' ? school || 'My school' : scope === 'schools' ? 'School totals' : 'All learners'}</h2>
        <p className="fw-meta">{scope === 'schools' ? 'Each total combines sample scores and any Aura you contribute through your school selection.' : 'Demo standings. Equal scores share a rank.'}</p>
        {!standings.length ? (
          <div className="fw-feedback">Choose a school in Profile to open this board.</div>
        ) : (
          <table className="fw-board-table">
            <thead><tr><th scope="col">Rank</th><th scope="col">{scope === 'schools' ? 'School' : 'Learner'}</th><th scope="col">Aura</th></tr></thead>
            <tbody>{standings.map(({ id, rank, name, points: score, current: highlighted }) => (
              <tr key={id} data-current={highlighted || undefined}>
                <td>#{rank}</td>
                <th scope="row">{name || 'Your school'}{highlighted && <span className="fw-you-tag">{scope === 'schools' ? 'Your school' : 'You'}</span>}</th>
                <td>{score.toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
    </div>
  );
}

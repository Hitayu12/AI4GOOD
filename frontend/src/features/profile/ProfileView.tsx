import { useState, type FormEvent } from 'react';
import type { AuraState } from '../aura/auraTypes';
import { MISSION_POINTS, REVIEW_POINTS } from '../aura/auraService';
import { missions, type CampaignProgress } from '../home/campaign';
import { WEEKLY_POINTS } from '../home/WeeklyCase';
import { DAILY_AURA } from '../home/dailyPractice';
import { avatars, goals, profileAvatar, regions, schoolName, type StudentProfile } from './studentProfile';
import { SchoolFields } from './SchoolFields';

type Props = {
  profile: StudentProfile;
  aura: AuraState;
  progress: CampaignProgress;
  email?: string;
  onSave: (profile: StudentProfile) => Promise<void>;
  onAccount: () => void;
  onLeaderboard: () => void;
  onActivity: () => void;
};

export function ProfileView({ profile, aura, progress, email, onSave, onAccount, onLeaderboard, onActivity }: Props) {
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const avatar = profileAvatar(draft);
  const school = schoolName(profile);
  const region = regions.find(([code]) => code === profile.stateCode)?.[1];
  const complete = missions.filter(({ id }) => progress[id]);
  const badges = aura.badges.filter(({ unlocked }) => unlocked);
  const learningPoints = Object.values(aura.learningAwards ?? {}).reduce((sum, points) => sum + points, 0);

  function change<K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) {
    setSaved(false);
    setSaveError('');
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || (draft.school === 'other' && !draft.customSchool.trim())) return;
    const next = { ...draft, nickname: draft.nickname.trim(), customSchool: draft.school === 'other' ? draft.customSchool.trim() : '' };
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      await onSave(next);
      setDraft(next);
      setSaved(true);
    } catch {
      setSaveError('Your profile couldn’t be saved. Check your connection and try again. If your session expired, sign in again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fw-profile">
      <header className="fw-page-header">
        <p className="fw-kicker">Your journey</p>
        <h1>Profile</h1>
        <p>Make this space yours and see what you’ve earned.</p>
      </header>
      <section className="fw-profile-hero" aria-label="Your rank and points">
        <div className="fw-identity">
          <span className={`fw-tile fw-${avatar.color}`} aria-hidden="true">{avatar.glyph}</span>
          <div><h2>{profile.nickname || 'FutureWorth learner'}</h2><p>{[school || 'Independent learner', region].filter(Boolean).join(' · ')}</p></div>
        </div>
        <div className="fw-profile-rank">
          <p>{aura.tier} · Level {aura.level}</p>
          <strong>{aura.points.toLocaleString()} <small>Aura</small></strong>
          <progress aria-label="Progress to next Aura milestone" value={Math.min(aura.points, aura.nextTierPoints)} max={aura.nextTierPoints} />
          <p>{aura.points >= aura.nextTierPoints ? 'Top milestone reached' : `${(aura.nextTierPoints - aura.points).toLocaleString()} points to the next milestone`}</p>
        </div>
      </section>
      <div className="fw-profile-grid">
        <form className="fw-panel fw-profile-panel" onSubmit={submit} aria-busy={saving}>
          <h2>Edit profile</h2>
          <p className="fw-meta">{email ? 'School and state are saved to your account. Your avatar, nickname, goal, and most practice activity stay in this browser.' : 'Saved in this browser. A nickname and school are optional.'}</p>
          <fieldset disabled={saving}>
          <label className="fw-field">Nickname <input value={draft.nickname} onChange={(event) => change('nickname', event.target.value)} maxLength={24} placeholder="Pick an alias" /></label>
          <fieldset className="fw-avatar-picker">
            <legend>Avatar</legend>
            <div>{avatars.map((item) => (
              <label key={item.id} className={`fw-tile fw-${item.color}`} title={item.label}>
                <input type="radio" name="profile-avatar" aria-label={item.label} value={item.id} checked={draft.avatar === item.id} onChange={() => change('avatar', item.id)} />
                <span aria-hidden="true">{item.glyph}</span>
              </label>
            ))}</div>
          </fieldset>
          <SchoolFields value={{ school: draft.school, customSchool: draft.customSchool, stateCode: draft.stateCode }} onChange={(fields) => {
            setSaveError('');
            setSaved(false);
            setDraft((previous) => ({ ...previous, ...fields }));
          }} />
          <label className="fw-field">Learning goal
            <select value={draft.goal} onChange={(event) => change('goal', goals.find(({ id }) => id === event.target.value)?.id ?? '')}>
              <option value="">Explore everything</option>
              {goals.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <div className="fw-player-actions">
            <button className="fw-button" type="submit">{saving ? 'Saving…' : 'Save profile'}</button>
            <button className="fw-quiet" type="button" onClick={onLeaderboard}>View leaderboards</button>
          </div>
          </fieldset>
          {saved && <p role="status" className="fw-save-status">Profile saved.</p>}
          {saveError && <p role="alert" className="fw-feedback fw-peach">{saveError}</p>}
        </form>
        <div className="fw-profile-side">
          <section className="fw-panel fw-profile-panel">
            <h2>Learning record</h2>
            <dl className="fw-profile-stats">
              <div><dt>Stories completed</dt><dd>{complete.length} / {missions.length}</dd></div>
              <div><dt>Learning Aura</dt><dd>{learningPoints.toLocaleString()}</dd></div>
              <div><dt>Badges earned</dt><dd>{badges.length} / {aura.badges.length}</dd></div>
            </dl>
            <p className="fw-meta">Earn {MISSION_POINTS} Aura for a new story, {REVIEW_POINTS} for its first correct spaced review, {DAILY_AURA} for daily practice, and {WEEKLY_POINTS} for the weekly case.</p>
            {badges.length > 0 && <ul className="fw-badge-list">{badges.map(({ id, icon, title }) => <li key={id}><span aria-hidden="true">{icon} </span>{title}</li>)}</ul>}
            <div className="fw-player-actions"><button type="button" className="fw-quiet" onClick={onActivity}>See badges and quests</button></div>
          </section>
          <section className="fw-panel fw-profile-panel">
            <h2>Skills practiced</h2>
            <dl className="fw-profile-stats">
              {missions.map(({ id, skill }) => <div key={id}><dt>{skill}</dt><dd>{progress[id]?.recalled ? 'Reviewed' : progress[id] ? 'Practiced' : 'Ready to try'}</dd></div>)}
            </dl>
          </section>
          <section className="fw-panel fw-profile-panel">
            <h2>Account</h2>
            <p className="fw-meta">{email ? `Signed in as ${email}` : 'You can play and save local progress without an account.'}</p>
            {email && <p className="fw-meta">Sign in again after a refresh to reopen your account’s practice record in this browser.</p>}
            <div className="fw-player-actions"><button className="fw-quiet" type="button" onClick={onAccount}>{email ? 'Sign out' : 'Sign in'}</button></div>
          </section>
        </div>
      </div>
    </div>
  );
}

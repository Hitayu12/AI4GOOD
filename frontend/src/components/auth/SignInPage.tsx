import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ApiClient } from '../../api/client';
import { ApiError, type SchoolAffiliation, type User } from '../../api/types';
import { SchoolFields } from '../../features/profile/SchoolFields';
import { emptyAffiliation, toAffiliation } from '../../features/profile/studentProfile';

type Props = {
  apiClient: ApiClient;
  onGuest: () => void;
  onAuthenticated: (user: User, expiresAt: string, affiliation?: SchoolAffiliation, notice?: string) => void;
};

function describeError(error: unknown, registering: boolean) {
  if (error instanceof ApiError) {
    if (error.code === 'secure_transport_required') return 'Sign-in needs HTTPS outside this local preview.';
    if (error.status === 429) return 'Too many attempts. Wait a minute before trying again.';
    if (error.status === 401) return 'The email or password didn’t match.';
    if (error.status === 422) return 'Check the email format and use a password between 12 and 128 characters.';
    if (error.status === 409 && registering) return 'This account could not be created. If you already have an account, try signing in.';
  }
  return 'The account service couldn’t complete that request. Try again, or continue as a guest.';
}

export function SignInPage({ apiClient, onGuest, onAuthenticated }: Props) {
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [affiliation, setAffiliation] = useState(emptyAffiliation);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => {
    if (!pending.current) return;
    pending.current.abort();
    pending.current = null;
    apiClient.setToken(null);
  }, [apiClient]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || apiClient.fixtureMode) return;
    const request = new AbortController();
    pending.current = request;
    setError('');
    setBusy(true);
    setReveal(false);
    const credentials = { email: email.trim(), password };
    const profile = toAffiliation(affiliation);
    let accountCreated = false;
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; request.abort(); }, 15_000);
    try {
      if (registering) {
        await apiClient.register(credentials, request.signal);
        accountCreated = true;
      }
      const session = await apiClient.login(credentials, request.signal);
      const user = await apiClient.getMe(request.signal);
      let saved: SchoolAffiliation | undefined;
      let notice: string | undefined;
      try {
        saved = registering && (profile.school_name || profile.state_code)
          ? await apiClient.setSchoolAffiliation(profile, request.signal)
          : await apiClient.getSchoolAffiliation(request.signal);
      } catch {
        notice = registering
          ? 'Your account is ready. Open Profile to finish saving your school and state.'
          : 'Signed in. Your saved school details could not be loaded yet.';
      }
      if (pending.current !== request) return;
      setPassword('');
      setBusy(false);
      pending.current = null;
      onAuthenticated(user, session.expires_at, saved, notice);
    } catch (failure) {
      if (pending.current !== request) return;
      apiClient.setToken(null);
      setPassword('');
      if (accountCreated) {
        setRegistering(false);
        setError('Your account was created. Sign in to finish setting up your profile.');
      } else {
        setError(timedOut ? 'The account service took too long to respond. Try again.' : describeError(failure, registering));
      }
    } finally {
      window.clearTimeout(timeout);
      if (pending.current === request) {
        pending.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <section className="fw-auth" aria-labelledby="sign-in-title">
      <div className="fw-auth-art">
        <span className="fw-tile fw-lavender" aria-hidden="true">✦</span>
        <h2>Set up your learner profile.</h2>
        <p>Choose a school to find its demo standings, or explore independently.</p>
      </div>
      <div className="fw-panel fw-auth-panel">
        <p className="fw-kicker">FutureWorth account</p>
        <h1 id="sign-in-title">{registering ? 'Create your account' : 'Sign in to FutureWorth'}</h1>
        <p className="fw-meta">Use your FutureWorth password. You can use a school email and choose your affiliation separately.</p>
        <p className="fw-meta">Guest progress stays with Guest in this browser. Sign in to continue your account’s separate practice record.</p>
        {error && <p className="fw-feedback fw-peach" role="alert">{error}</p>}
        <form onSubmit={submit} aria-busy={busy} aria-labelledby="sign-in-title">
          <fieldset disabled={busy}>
            <label className="fw-field">Email address
              <input type="email" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254}
                value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="fw-field" htmlFor="futureworth-password">FutureWorth password</label>
            <div className="fw-password fw-field">
              <input id="futureworth-password" name="password" type={reveal ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'}
                value={password} minLength={registering ? 12 : undefined} maxLength={128} required onChange={(event) => setPassword(event.target.value)}
                aria-describedby={registering ? 'new-password-hint' : undefined} />
              <button type="button" className="fw-quiet" aria-pressed={reveal} onClick={() => setReveal(!reveal)}>{reveal ? 'Hide password' : 'Show password'}</button>
            </div>
            {registering && <>
              <p className="fw-meta" id="new-password-hint">Use 12 to 128 characters. Choose a password unique to FutureWorth.</p>
              <div className="fw-affiliation">
                <h2>School affiliation <small>Optional</small></h2>
                <p className="fw-meta">Your selection is self-reported and saved to your account.</p>
                <SchoolFields value={affiliation} onChange={setAffiliation} />
              </div>
            </>}
            <button type="submit" className="fw-button fw-auth-submit">{busy ? 'Working…' : registering ? 'Create account' : 'Sign in'}</button>
          </fieldset>
        </form>
        <div className="fw-player-actions">
          <button type="button" className="fw-quiet" disabled={busy} onClick={() => {
            setRegistering(!registering);
            setPassword('');
            setReveal(false);
            setError('');
          }}>{registering ? 'Use an existing account' : 'Create a FutureWorth account'}</button>
          <button type="button" className="fw-quiet" onClick={onGuest}>Continue as guest</button>
        </div>
      </div>
    </section>
  );
}

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ApiClient, defaultApiClient } from './api/client';
import { EquityPoint, Position, type SchoolAffiliation, User } from './api/types';
import { CelebrationConfetti } from './components/common/CelebrationConfetti';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuraHubModal, addAuraPoints, loadAuraState, saveAuraState } from './features/aura';
import { MISSION_POINTS, REVIEW_POINTS, syncLearningAwards } from './features/aura/auraService';
import { DailyDropModal } from './features/aura/DailyDropModal';
import { SignInPage } from './components/auth/SignInPage';
import { SignInModal } from './components/auth/SignInModal';
import { soundFx } from './features/gamification/soundFxService';
import { QUEST_COMPLETED_EVENT, BADGE_UNLOCKED_EVENT, LEVEL_UP_EVENT } from './features/gamification/questTrackerService';
import { HomeView, CampaignPage } from './features/home/HomeView';
import { MissionPlayer } from './features/home/MissionPlayer';
import { WEEKLY_POINTS } from './features/home/WeeklyCase';
import { DAILY_AURA, dailyAwardKey, localPracticeDay } from './features/home/dailyPractice';
import { Lab, Mission, type StoryCheckpoint, completeMission, continueStory, loadCampaign, loadCheckpoint, missions, recordReview, saveCampaign, saveCheckpoint } from './features/home/campaign';
import { NotificationCenter, NotificationProvider, useNotifications } from './features/notifications';
import { loadProfile, profileAvatar, saveProfile, toAffiliation, withAffiliation, type BoardScope, type StudentProfile } from './features/profile/studentProfile';
import { isRecord, readPractice, useStoredPractice, writePractice } from './features/practiceStorage';
import type { CalculatorPreset } from './features/calculators/CalculatorView';
import type { TradeReplay } from './features/trading/TradingView';

const CalculatorView = lazy(() => import('./features/calculators/CalculatorView').then(({ CalculatorView }) => ({ default: CalculatorView })));
const LearningView = lazy(() => import('./features/learning/LearningView').then(({ LearningView }) => ({ default: LearningView })));
const SimulationView = lazy(() => import('./features/simulation/SimulationView').then(({ SimulationView }) => ({ default: SimulationView })));
const TradingView = lazy(() => import('./features/trading/TradingView').then(({ TradingView }) => ({ default: TradingView })));
const PortfolioView = lazy(() => import('./features/portfolio/PortfolioView').then(({ PortfolioView }) => ({ default: PortfolioView })));
const TutorView = lazy(() => import('./features/tutor/TutorView').then(({ TutorView }) => ({ default: TutorView })));
const ProfileView = lazy(() => import('./features/profile/ProfileView').then(({ ProfileView }) => ({ default: ProfileView })));
const LeaderboardView = lazy(() => import('./features/profile/LeaderboardView').then(({ LeaderboardView }) => ({ default: LeaderboardView })));
const DailyPracticeView = lazy(() => import('./features/home/DailyPracticeView').then(({ DailyPracticeView }) => ({ default: DailyPracticeView })));

type Page = CampaignPage | Lab | 'profile' | 'leaderboards' | 'status' | 'auth' | 'daily';
type Extra = 'progress' | 'reward' | null;
type NavItem<T extends Page> = { id: T; label: string; path: string };

const pagePaths: Record<Page, string> = {
  home: '/', missions: '/missions', review: '/review', daily: '/daily-practice',
  learning: '/lessons', calculator: '/calculator', simulation: '/market-replay', trading: '/trade-lab',
  portfolio: '/portfolio', tutor: '/coach', profile: '/profile', leaderboards: '/leaderboards',
  status: '/settings', auth: '/sign-in',
};

function readPage(): Page {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  return (Object.keys(pagePaths) as Page[]).find((page) => pagePaths[page] === path) ?? 'home';
}

function readBoardScope(): BoardScope {
  const view = new URLSearchParams(window.location.search).get('view');
  if (view === 'my-school') return 'my-school';
  if (view === 'schools') return 'schools';
  return 'all';
}

type SavedTradeLab = { replay?: TradeReplay; equity: EquityPoint[] };

function isSavedTradeLab(value: unknown): value is SavedTradeLab {
  if (!isRecord(value) || !Array.isArray(value.equity)) return false;
  const { replay } = value;
  return replay === undefined || (isRecord(replay) && isRecord(replay.simulation)
    && typeof replay.simulation.current_session === 'string' && typeof replay.simulation.end_session === 'string'
    && typeof replay.startingCashCents === 'number' && typeof replay.cashCents === 'number'
    && Array.isArray(replay.positions) && Array.isArray(replay.orders) && Array.isArray(replay.transactions));
}

const storyNav: NavItem<CampaignPage>[] = [
  { id: 'home', label: 'Home', path: 'M3 11 12 3l9 8M5 10v10h5v-6h4v6h5V10' },
  { id: 'missions', label: 'Missions', path: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16m6-14v16' },
  { id: 'review', label: 'Quick review', path: 'M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4-1v5l3 2' },
];
const dailyNav: NavItem<'daily'> = { id: 'daily', label: 'Daily practice', path: 'M12 2 9 9l-7 3 7 3 3 7 3-7 7-3-7-3z' };
const profileNav: NavItem<'profile'> = { id: 'profile', label: 'Profile', path: 'M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' };
const leaderboardNav: NavItem<'leaderboards'> = { id: 'leaderboards', label: 'Leaderboards', path: 'M3 20v-7h5v7m0 0V5h8v15m0 0v-9h5v9M2 20h20' };

const labNav: NavItem<Lab>[] = [
  { id: 'learning', label: 'Lessons', path: 'M4 19a2 2 0 0 1 2-2h14M6 3h14v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 5h8m-8 4h5' },
  { id: 'calculator', label: 'Calculator', path: 'M6 3h12v18H6zM9 7h6m-6 5h.01m3 0h.01m3 0h.01m-6 5h.01m3 0h.01m3 0h.01' },
  { id: 'simulation', label: 'Market replay', path: 'M4 6h16v14H4zM8 3v6m8-6v6M4 11h16m-10 3 4 2-4 2z' },
  { id: 'trading', label: 'Trade Lab', path: 'm4 8 4-4 4 4M8 4v14m4-2 4 4 4-4m-4 4V6' },
  { id: 'portfolio', label: 'Portfolio', path: 'M3 4v16h18M7 15l4-4 3 2 5-6' },
  { id: 'tutor', label: 'Coach', path: 'M4 5h16v12H9l-5 4zM8 9h8m-8 4h5' },
];

const labTips: Record<Lab, string> = {
  learning: 'Pick a topic, try its interactive example, then check what you remember.',
  calculator: 'Change one input at a time and see what drives the projected balance.',
  simulation: 'Predict the next close or practice buying at the current close. This replay has its own virtual balance. Open Trade Lab to practice orders that fill at the next open.',
  trading: 'Try a simulated order, advance to the next session, then inspect what it did to your portfolio.',
  portfolio: 'Compare cash and holdings. Look at what’s driving the result before focusing on the return.',
  tutor: 'Ask for a hint, a worked example, or another way to explain a concept. Keep personal information out of the chat.',
};

function examplePositions(companyAmount: number): Position[] {
  return [{ symbol: 'COMPANY', amount: companyAmount }, { symbol: 'BROAD FUND', amount: 1_000 - companyAmount }]
    .filter(({ amount }) => amount > 0)
    .map(({ symbol, amount }) => ({
      symbol,
      quantity: amount / 100,
      cost_basis: '100.00',
      market_price: '100.00',
      market_value: amount.toFixed(2),
      unrealized_pnl: '0.00',
    }));
}

function Icon({ path }: { path: string }) {
  return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>;
}

function AppContent() {
  const [page, setPage] = useState(readPage);
  const [mission, setMission] = useState<Mission>();
  const [labMission, setLabMission] = useState<Mission>();
  const [preset, setPreset] = useState<CalculatorPreset>();
  const [portfolioExample, setPortfolioExample] = useState<Position[]>();
  const [boardScope, setBoardScope] = useState(readBoardScope);
  const [progress, setProgress] = useState(loadCampaign);
  const [checkpoint, setCheckpoint] = useState(loadCheckpoint);
  const [profile, setProfile] = useState(loadProfile);
  const [now, setNow] = useState(Date.now);
  const [practiceDay, setPracticeDay] = useState(() => localPracticeDay(Date.now()));
  const [toolsOpen, setToolsOpen] = useState(false);
  const [extras, setExtras] = useState<Extra>(null);
  const [aura, setAura] = useState(loadAuraState);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => readPage() === 'home');
  const [muted, setMuted] = useState(() => soundFx.isMuted());
  const [user, setUser] = useState<User | null>(null);
  const practiceOwner = user?.id ?? 'guest';
  const tradeKey = `trade-lab:${practiceOwner}`;
  const [{ replay, equity: equityHistory }, setTradeLab] = useStoredPractice(tradeKey, () => (
    readPractice(tradeKey, isSavedTradeLab) ?? { equity: [] }
  ));
  const [sessionExpiry, setSessionExpiry] = useState<number>();
  const [accountApiClient] = useState(() => new ApiClient({ fixtureMode: false }));
  const [fixtureMode, setFixtureMode] = useState(() => {
    const preference = readPractice('demo-data', (value): value is boolean => typeof value === 'boolean');
    if (preference !== undefined) defaultApiClient.setFixtureMode(preference);
    return defaultApiClient.fixtureMode;
  });
  const [health, setHealth] = useState<'checking' | 'ok' | 'error'>('checking');
  const healthRequest = useRef(0);
  const main = useRef<HTMLElement>(null);
  const mobileTools = useRef<HTMLElement>(null);
  const toolsButton = useRef<HTMLButtonElement>(null);
  const { notify } = useNotifications();

  function restoreLocalLearning(accountId?: string) {
    setProgress(loadCampaign(accountId));
    setCheckpoint(loadCheckpoint(accountId));
    setAura(loadAuraState(accountId));
  }

  useEffect(() => {
    try { localStorage.removeItem('futureworth_auth_session_v1'); } catch { /* Browser storage may be unavailable. */ }
  }, []);

  useEffect(() => {
    if (sessionExpiry === undefined) return;
    const timer = window.setTimeout(() => {
      accountApiClient.setToken(null);
      defaultApiClient.setToken(null);
      setUser(null);
      setProfile(loadProfile());
      restoreLocalLearning();
      setMission(undefined);
      setLabMission(undefined);
      setPreset(undefined);
      setPortfolioExample(undefined);
      setExtras(null);
      setSessionExpiry(undefined);
    }, Math.max(0, sessionExpiry - Date.now()));
    return () => window.clearTimeout(timer);
  }, [sessionExpiry, accountApiClient]);

  const captureReplay = useCallback((snapshot: TradeReplay) => {
    const session = snapshot.simulation.current_session;
    const equity = snapshot.positions.reduce((balance, position) => balance + Number(position.market_value), snapshot.cashCents / 100);
    setTradeLab((previous) => ({
      replay: snapshot,
      equity: [
        ...previous.equity.filter((point) => point.session_date < session),
        { session_date: session, total_equity: equity.toFixed(2) },
      ],
    }));
  }, [setTradeLab]);

  useEffect(() => {
    saveCampaign(progress, practiceOwner);
    const awards: Record<string, number> = {};
    for (const { id } of missions) {
      if (progress[id]) awards[`mission:${id}`] = MISSION_POINTS;
      if (progress[id]?.recalled) awards[`review:${id}`] = REVIEW_POINTS;
    }
    const savedAura = loadAuraState(practiceOwner);
    const updatedAura = syncLearningAwards(savedAura, awards, practiceOwner);
    if (updatedAura !== savedAura) setAura(updatedAura);
  }, [practiceOwner, progress]);
  useEffect(() => {
    if (!toolsOpen) return;
    mobileTools.current?.querySelector('button')?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setToolsOpen(false);
      toolsButton.current?.focus();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [toolsOpen]);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  useEffect(() => {
    let active = true;
    const sync = () => queueMicrotask(() => { if (active) setAura(loadAuraState(practiceOwner)); });
    const events = [QUEST_COMPLETED_EVENT, BADGE_UNLOCKED_EVENT, LEVEL_UP_EVENT, 'storage'];
    events.forEach((event) => window.addEventListener(event, sync));
    return () => {
      active = false;
      events.forEach((event) => window.removeEventListener(event, sync));
    };
  }, [practiceOwner]);

  async function checkHealth() {
    const request = ++healthRequest.current;
    setHealth('checking');
    try {
      const response = await defaultApiClient.getHealth();
      if (request === healthRequest.current) setHealth(response.status === 'ok' ? 'ok' : 'error');
    } catch {
      if (request === healthRequest.current) setHealth('error');
    }
  }
  useEffect(() => {
    if (page !== 'status') return;
    void checkHealth();
    return () => { healthRequest.current += 1; };
  }, [page, fixtureMode]);

  function goToTop() {
    window.scrollTo({ top: 0 });
    main.current?.focus({ preventScroll: true });
  }
  const showPage = useCallback((target: Page, scope: BoardScope = 'all') => {
    setPage(target);
    setBoardScope(scope);
    if (target === 'daily') setPracticeDay(localPracticeDay(Date.now()));
    setMission(undefined);
    setLabMission(undefined);
    setPreset(undefined);
    setPortfolioExample(undefined);
    setToolsOpen(false);
    setExtras(null);
    setNow(Date.now());
    if (target !== 'home' && target !== 'auth') {
      setIsAuthModalOpen(false);
    }
    window.scrollTo({ top: 0 });
    main.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const restorePage = () => showPage(readPage(), readBoardScope());
    window.addEventListener('popstate', restorePage);
    return () => window.removeEventListener('popstate', restorePage);
  }, [showPage]);
  function navigate(target: Page, scope: BoardScope = 'all', replace = false) {
    const search = target === 'leaderboards' && scope !== 'all' ? `?view=${scope}` : '';
    const path = pagePaths[target] + search;
    if (path !== window.location.pathname + window.location.search) {
      if (replace) window.history.replaceState(null, '', path);
      else window.history.pushState(null, '', path);
    }
    showPage(target, scope);
  }
  function play(target: Mission) {
    setToolsOpen(false);
    setIsAuthModalOpen(false);
    if (checkpoint?.missionId !== target.id) updateCheckpoint({ missionId: target.id, step: 0 });
    setMission(continueStory(target, progress.payday?.choice));
    goToTop();
  }
  function updateCheckpoint(next?: StoryCheckpoint) {
    saveCheckpoint(next, practiceOwner);
    setCheckpoint(next);
  }
  function openMissionLab(choice: number) {
    if (!mission) return;
    navigate(mission.lab);
    setLabMission(mission);
    if (mission.id === 'time') {
      setPreset({ startingAmount: 500, monthlyContribution: 0, annualRatePercent: 5, horizonMonths: (choice + 1) * 12 });
    }
    if (mission.id === 'surprise') {
      setPreset({ startingAmount: mission.choices[choice]?.practiceStartingCash ?? 100, monthlyContribution: 25, annualRatePercent: 0, horizonMonths: 6 });
    }
    if (mission.id === 'mix') setPortfolioExample(examplePositions([1_000, 500, 100][choice]));
  }
  function updateAura(next: ReturnType<typeof loadAuraState>) {
    saveAuraState(next, practiceOwner);
    setAura(next);
  }
  async function signOut() {
    const revocation = accountApiClient.logout();
    accountApiClient.setToken(null);
    defaultApiClient.setToken(null);
    setUser(null);
    setSessionExpiry(undefined);
    setProfile(loadProfile());
    restoreLocalLearning();
    try { await revocation; }
    catch { notify({ type: 'warning', title: 'Signed out on this device', message: 'The service could not confirm token revocation.' }); }
  }
  function handleSignIn(account: User, expiresAt: string, affiliation?: SchoolAffiliation, notice?: string) {
    defaultApiClient.setToken(accountApiClient.getToken());
    setUser(account);
    restoreLocalLearning(account.id);
    const expiration = Date.parse(expiresAt);
    setSessionExpiry(Number.isFinite(expiration) ? expiration : undefined);
    const saved = loadProfile(account.id);
    setProfile(affiliation ? saveProfile(withAffiliation(saved, affiliation), account.id) : saved);
    setIsAuthModalOpen(false);
    if (notice) notify({ type: 'info', title: 'Account ready', message: notice });
    navigate('profile', 'all', true);
  }
  async function updateProfile(next: StudentProfile) {
    if (!user) {
      setProfile(saveProfile(next));
      return;
    }
    const sessionToken = accountApiClient.getToken();
    const affiliation = await accountApiClient.setSchoolAffiliation(toAffiliation(next));
    const saved = saveProfile(withAffiliation(next, affiliation), user.id);
    if (sessionToken === accountApiClient.getToken()) setProfile(saved);
  }
  function toggleService() {
    defaultApiClient.setFixtureMode(!fixtureMode);
    setFixtureMode(!fixtureMode);
    writePractice('demo-data', !fixtureMode);
  }

  const campaignPage = page === 'home' || page === 'missions' || page === 'review';
  const pageLabel = page === 'auth' ? 'Sign in' : [...storyNav, ...labNav, dailyNav, profileNav, leaderboardNav].find((item) => item.id === page)?.label ?? 'Connection';
  const next = mission && missions[missions.findIndex((item) => item.id === mission.id) + 1];
  const modeLabel = fixtureMode ? 'Demo data' : 'Service mode';
  const shownReplay = portfolioExample ? undefined : replay;
  const brand = <><span className="fw-brand-mark" aria-hidden="true">✦</span><span>FutureWorth</span></>;
  const avatar = profileAvatar(profile);
  const goalMission = missions.find(({ id }) => id === profile.goal);

  function navButton(item: NavItem<Page>, mobileLabel?: string) {
    return (
      <button key={item.id} type="button" className={mobileLabel ? undefined : 'fw-nav-button'} aria-current={!mission && page === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}>
        <Icon path={item.path} />{mobileLabel ?? item.label}
      </button>
    );
  }

  return (
    <div className="fw-app">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <NotificationCenter position="top-right" />
      <div className="fw-shell">
        <aside className="fw-sidebar">
          <button type="button" className="fw-brand" onClick={() => navigate('home')}>{brand}</button>
          <nav aria-label="Your journey" className="fw-nav-group">
            <p>Your journey</p>
            {storyNav.map((item) => navButton(item))}
            {navButton(dailyNav)}
            {navButton(leaderboardNav)}
            {navButton(profileNav)}
          </nav>
          <nav aria-label="Practice tools" className="fw-nav-group">
            <p>Practice tools</p>
            {labNav.map((item) => navButton(item))}
          </nav>
          <div className="fw-sidebar-footer">
            {navButton({ id: 'status', label: 'Connection & settings', path: 'M3 12h4l2-7 4 14 2-7h6' })}
          </div>
        </aside>
        <div className="fw-workspace">
          <header className="fw-top">
            <span className="fw-top-title">{mission ? 'Mission player' : pageLabel}</span>
            <button type="button" className="fw-brand fw-mobile-brand" onClick={() => navigate('home')}>{brand}</button>
            <div className="fw-top-actions">
              <span className="fw-mode">{modeLabel}</span>
              <button type="button" className="fw-aura-chip" onClick={() => navigate('profile')} aria-label={`Open profile, ${aura.points.toLocaleString()} Aura, level ${aura.level}`}>
                <span aria-hidden="true">{avatar.glyph}</span> {aura.points.toLocaleString()} <span className="fw-aura-label">Aura</span>
              </button>
              {!user && page !== 'auth' && <button type="button" className="fw-quiet" onClick={() => navigate('auth')}>Sign in</button>}
            </div>
          </header>
          <main id="main-content" className="fw-main" ref={main} tabIndex={-1}>
            {mission ? (
              <MissionPlayer
                key={mission.id}
                mission={mission}
                checkpoint={checkpoint?.missionId === mission.id ? checkpoint : undefined}
                onCheckpoint={updateCheckpoint}
                onComplete={(choice) => {
                  if (!progress[mission.id]) {
                    setProgress((current) => completeMission(current, mission.id, Date.now(), choice));
                    notify({ type: 'success', title: `+${MISSION_POINTS} Aura`, message: 'Mission completed.' });
                  }
                  updateCheckpoint();
                }}
                onExit={() => navigate(campaignPage ? page : 'missions')}
                onNext={next ? () => play(next) : undefined}
                onOpenLab={openMissionLab}
              />
            ) : campaignPage ? (
              <HomeView
                key={`${practiceOwner}:${page}`}
                storageScope={practiceOwner}
                page={page}
                progress={progress}
                checkpoint={checkpoint}
                profile={profile}
                aura={aura}
                now={now}
                onPlay={play}
                onPage={navigate}
                onReview={(id, correct) => {
                  const checkedAt = Date.now();
                  setNow(checkedAt);
                  if (correct && !progress[id]?.recalled) notify({ type: 'success', title: `+${REVIEW_POINTS} Aura`, message: 'First correct spaced review.' });
                  setProgress((current) => recordReview(current, id, correct, checkedAt));
                }}
                onOpenTrade={() => navigate('trading')}
                onOpenAuraHub={() => setExtras('progress')}
                onOpenDailyDrop={() => setExtras('reward')}
                onOpenLeaderboard={() => navigate('leaderboards', 'my-school')}
                onOpenProfile={() => navigate('profile')}
                onOpenDailyPractice={() => navigate('daily')}
                onWeeklyCorrect={(awardKey) => {
                  const current = loadAuraState(practiceOwner);
                  const updated = syncLearningAwards(current, { [awardKey]: WEEKLY_POINTS }, practiceOwner);
                  if (updated !== current) {
                    setAura(updated);
                    notify({ type: 'success', title: `+${WEEKLY_POINTS} Aura`, message: 'Weekly case completed.' });
                  }
                }}
                onVoteAura={(points) => setAura(addAuraPoints(loadAuraState(practiceOwner), points, practiceOwner))}
              />
            ) : page === 'daily' ? (
              <Suspense fallback={<p role="status" className="fw-feedback">Opening daily practice…</p>}>
                <DailyPracticeView key={`${practiceOwner}:${practiceDay}`} storageScope={practiceOwner} day={practiceDay} awards={aura.learningAwards}
                  onExit={() => navigate('home')} onReview={() => navigate('review')}
                  onComplete={(day) => {
                    const current = loadAuraState(practiceOwner);
                    const updated = syncLearningAwards(current, { [dailyAwardKey(day)]: DAILY_AURA }, practiceOwner);
                    setAura(updated);
                  }} />
              </Suspense>
            ) : page === 'auth' ? (
              <Suspense fallback={<p role="status" className="fw-feedback">Opening sign-in…</p>}>
                <SignInPage apiClient={accountApiClient} onGuest={() => navigate('home')} onAuthenticated={handleSignIn} />
              </Suspense>
            ) : page === 'profile' || page === 'leaderboards' ? (
              <Suspense fallback={<p role="status" className="fw-feedback">Opening {pageLabel.toLowerCase()}…</p>}>
                {page === 'profile'
                  ? <ProfileView
                    key={user?.id ?? 'guest'} profile={profile} aura={aura} progress={progress} email={user?.email}
                    onSave={updateProfile}
                    onAccount={() => user ? void signOut() : navigate('auth')}
                    onLeaderboard={() => navigate('leaderboards')}
                    onActivity={() => setExtras('progress')}
                  />
                  : <LeaderboardView key={boardScope} initialScope={boardScope} profile={profile} points={aura.points} onProfile={() => navigate('profile')} onMissions={() => navigate('missions')} />}
              </Suspense>
            ) : page === 'status' ? (
              <section className="fw-narrow">
                <header className="fw-page-header"><h1>Connection & settings</h1><p>Story progress stays in this browser. Practice trades use simulated money.</p></header>
                <div className="fw-panel fw-player-card">
                  <h2>{modeLabel}</h2>
                  <p className="fw-body" role="status">{fixtureMode ? 'The app is using built-in educational examples.' : health === 'ok' ? 'The account service is reachable.' : health === 'checking' ? 'Checking connection…' : 'The service is unavailable. You can switch back to demo data.'}</p>
                  <div className="fw-player-actions">
                    <button type="button" className="fw-quiet" onClick={() => void toggleService()}>Use {fixtureMode ? 'connected service' : 'demo data'}</button>
                    {!fixtureMode && <button type="button" className="fw-quiet" onClick={() => void checkHealth()}>Check connection</button>}
                    <button type="button" className="fw-quiet" onClick={() => { soundFx.setMuted(!muted); setMuted(!muted); }}>{muted ? 'Enable sounds' : 'Mute sounds'}</button>
                  </div>
                </div>
              </section>
            ) : (
              <section>
                <header className="fw-page-header">
                  <p className="fw-kicker">{labMission ? `From the story · ${labMission.title}` : 'Practice tools'}</p>
                  <h1>{pageLabel}</h1>
                  <p>{labTips[page]}</p>
                </header>
                {(labMission || page === 'learning' || page === 'simulation' || page === 'trading' || page === 'portfolio' || page === 'tutor') && (
                  <div className="fw-context">
                    <div>
                      <strong>{labMission ? labMission.skill : page === 'portfolio' && !replay ? 'Your practice portfolio' : 'Try it in practice'}</strong>
                      <p>{portfolioExample ? 'This fictional portfolio uses the allocation you chose in the mission.' : labMission?.takeaway ?? (page === 'tutor'
                        ? 'The coach uses worked examples and answers from the lesson library.'
                        : page === 'learning' ? 'Try a short story before diving into the full lesson or quiz.'
                        : page === 'portfolio' ? replay ? 'Showing your historical Trade Lab account.' : 'Start with $10,000 in virtual cash. Fill a historical order in Trade Lab to see your holdings here.' : 'Uses simulated data. You can return to the mission map any time.')}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {page === 'simulation' && <button type="button" className="fw-quiet" onClick={() => navigate('trading')}>Open Trade Lab</button>}
                      {page === 'learning' && !labMission && <button type="button" className="fw-quiet" onClick={() => play(goalMission ?? missions[0])}>Play {goalMission?.title ?? 'a savings story'}</button>}
                      {page === 'portfolio' && <button type="button" className="fw-quiet" onClick={() => navigate('trading')}>Back to Trade Lab</button>}
                      {labMission && <button type="button" className="fw-quiet" onClick={() => navigate('missions')}>Mission map</button>}
                    </div>
                  </div>
                )}
                <Suspense fallback={<p role="status" className="fw-feedback">Opening {pageLabel.toLowerCase()}…</p>}>
                  {page === 'learning' && <LearningView key={`${practiceOwner}:${labMission?.id ?? 'lessons'}`} initialTopicId={labMission?.topic} storageScope={practiceOwner} useInternalScoring={fixtureMode || !user} />}
                  {page === 'calculator' && <CalculatorView key={`${practiceOwner}:${labMission?.id ?? 'calculator'}`} preset={preset} storageScope={practiceOwner} />}
                  {page === 'simulation' && <SimulationView key={practiceOwner} storageScope={practiceOwner} />}
                  {page === 'trading' && <TradingView key={practiceOwner} storageScope={practiceOwner} replay={replay} onReplayChange={captureReplay} onReflect={() => navigate('portfolio')} />}
                  {page === 'portfolio' && <PortfolioView
                    simulation={shownReplay?.simulation}
                    initialCash={shownReplay ? shownReplay.startingCashCents / 100 : portfolioExample ? 1_000 : 10_000}
                    cash={shownReplay ? shownReplay.cashCents / 100 : portfolioExample ? 0 : 10_000}
                    positions={portfolioExample ?? shownReplay?.positions}
                    equityCurve={shownReplay ? equityHistory : undefined}
                    realizedPnl={shownReplay ? (
                      shownReplay.positions.reduce((balance, position) => (
                        balance + position.quantity * Number(position.cost_basis)
                      ), (shownReplay.cashCents - shownReplay.startingCashCents) / 100)
                    ).toFixed(2) : undefined}
                  />}
                  {page === 'tutor' && <TutorView onPractice={navigate} curriculumOnly />}
                </Suspense>
              </section>
            )}
          </main>
        </div>
      </div>

      {toolsOpen && <nav ref={mobileTools} aria-label="More practice tools" className="fw-mobile-tools" id="practice-tools">
        {navButton(leaderboardNav)}
        {labNav.map((item) => navButton(item))}
        {navButton({ id: 'status', label: 'Connection & settings', path: 'M3 12h4l2-7 4 14 2-7h6' })}
      </nav>}
      <nav aria-label="Mobile navigation" className="fw-mobile-nav">
        {navButton(storyNav[0], 'Home')}
        {navButton(dailyNav, 'Daily')}
        {storyNav.slice(1).map((item) => navButton(item, item.id === 'review' ? 'Review' : item.label))}
        {navButton(profileNav, 'Profile')}
        <button ref={toolsButton} type="button" aria-expanded={toolsOpen} aria-controls={toolsOpen ? 'practice-tools' : undefined} onClick={() => setToolsOpen(!toolsOpen)}>
          <Icon path="M4 5h6v6H4zm10 0h6v6h-6zM4 15h6v6H4zm10 0h6v6h-6z" />Tools
        </button>
      </nav>
      <AuraHubModal isOpen={extras === 'progress'} onClose={() => setExtras(null)} auraState={aura} onUpdateAura={updateAura} onNavigateTab={navigate}
        onOpenDailyDrop={() => setExtras('reward')} onOpenLeaderboard={() => navigate('leaderboards')} />
      <DailyDropModal isOpen={extras === 'reward'} onClose={() => setExtras(null)} auraState={aura} onAuraStateChange={updateAura} />
      <SignInModal
        isOpen={isAuthModalOpen && !user && page !== 'auth'}
        onClose={() => setIsAuthModalOpen(false)}
        apiClient={accountApiClient}
        onAuthenticated={handleSignIn}
      />
      <CelebrationConfetti />
    </div>
  );
}

export function App() {
  return <ErrorBoundary><NotificationProvider><AppContent /></NotificationProvider></ErrorBoundary>;
}

export default App;

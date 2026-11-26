import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { DAILY_AURA, dailyLesson, localPracticeDay } from './features/home/dailyPractice';

describe('FutureWorth learning journey', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => vi.restoreAllMocks());

  it('resumes daily practice, marks its weekday, and grants points only once', async () => {
    const now = new Date(2026, 10, 23, 12).getTime();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    const lesson = dailyLesson(localPracticeDay(now));
    const [first, second, third] = lesson.questions;
    if (!('options' in first) || !('amount' in second) || !('options' in third)) throw new Error('Unexpected exercise order');
    const app = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start daily practice' }));
    await screen.findByRole('heading', { name: lesson.title });
    fireEvent.click(screen.getByRole('button', { name: 'Get a hint from Tuck' }));
    expect(screen.getByText(first.hint)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: first.options[first.answer] }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save and exit practice' }));
    app.unmount();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start daily practice' }));
    const answer = await screen.findByRole('spinbutton', { name: second.prompt });
    fireEvent.change(answer, { target: { value: String(second.amount + 1) } });
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(screen.getByText(second.hint)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    fireEvent.change(answer, { target: { value: String(second.amount) } });
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('radio', { name: third.options[third.answer] }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish daily practice' }));
    expect(screen.getByRole('heading', { name: 'Practice complete.' })).toBeInTheDocument();
    expect(screen.getByText('1 day practiced this week')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }));
    fireEvent.click(screen.getByRole('button', { name: 'View today’s practice' }));
    expect(screen.getByRole('button', { name: new RegExp(`open profile, ${DAILY_AURA} aura`, 'i') })).toBeInTheDocument();
    clock.mockReturnValue(now + 86_400_000);
    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }));
    expect(screen.getByRole('heading', { name: dailyLesson(localPracticeDay(Date.now())).title })).toBeInTheDocument();
  });

  it('teaches through a decision and transfer check, then saves completion and offers a delayed review', () => {
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    const app = render(<App />);
    expect(screen.getByRole('heading', { name: 'Money moves.' })).toBeInTheDocument();
    expect(screen.getByText('Demo data')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Play mission' }));
    expect(screen.getByRole('button', { name: 'Reveal the outcome' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'Keep all $600 in cash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reveal the outcome' }));
    expect(screen.getByText(/you have \$450 in cash/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try a new situation' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Buy a stock and sell Monday' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check my answer' }));
    expect(screen.getByText('Take another look.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Finish mission' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Leave $180 accessible in cash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check my answer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish mission' }));
    expect(screen.getByRole('heading', { name: 'Mission complete.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open profile, 150 aura/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Play next mission' }));
    expect(screen.getByText(/last paycheck decision left you with \$450/i)).toBeInTheDocument();
    app.unmount();
    render(<App />);
    expect(screen.getByText('1 of 6 missions complete')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue mission' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open review' }));
    expect(screen.getByText('You’re caught up.')).toBeInTheDocument();
    clock.mockReturnValue(now + day);
    fireEvent.focus(window);
    fireEvent.click(screen.getByRole('radio', { name: 'Reliable access to the amount by the deadline' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check my answer' }));
    expect(screen.getByText('Nice recall.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open profile, 200 aura/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Browse missions' }));
    expect(screen.getByRole('heading', { name: 'Mission map' })).toBeInTheDocument();
  });

  it('restores the selected school and computes different demo leaderboards', async () => {
    localStorage.setItem('ai4good_aura_state_v1', JSON.stringify({ points: 700 }));
    const app = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose a school' }));
    await screen.findByRole('heading', { name: 'Profile' });
    fireEvent.change(screen.getByLabelText('Nickname'), { target: { value: 'Maple' } });
    fireEvent.change(screen.getByLabelText('School or university'), { target: { value: 'rutgers' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    expect(screen.getByRole('heading', { name: 'Maple' })).toBeInTheDocument();
    expect(await screen.findByText('Profile saved.')).toBeInTheDocument();

    app.unmount();
    render(<App />);
    await screen.findByRole('heading', { name: 'Maple' });
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Your journey' })).getByRole('button', { name: 'Home' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open standings' }));
    await screen.findByRole('heading', { name: 'Leaderboards' });
    expect(screen.getByRole('button', { name: 'My school' })).toHaveAttribute('aria-pressed', 'true');
    const learner = screen.getByRole('row', { name: /#2 Maple You 700/i });
    expect(learner).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'School rankings' }));
    expect(screen.getByRole('row', { name: /#1 Rutgers University Your school 2,960/i })).toBeInTheDocument();
  });

  it('resumes a saved story checkpoint after reloading', () => {
    const app = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play mission' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Keep all $600 in cash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reveal the outcome' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save and exit' }));
    app.unmount();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue mission' }));
    expect(screen.getByRole('heading', { name: 'Here’s what happened.' })).toBeInTheDocument();
    expect(screen.getByText(/you have \$450 in cash/i)).toBeInTheDocument();
  });

  it('keeps all tools and sign-in discoverable', async () => {
    render(<App />);
    const tools = within(screen.getByRole('navigation', { name: 'Practice tools' }));
    fireEvent.click(tools.getByRole('button', { name: 'Lessons' }));
    expect(await screen.findByText('Financial Education & Learning')).toBeInTheDocument();
    fireEvent.click(tools.getByRole('button', { name: 'Market replay' }));
    expect(await screen.findByText('Curriculum Time Cursor', undefined, { timeout: 4000 })).toBeInTheDocument();
    fireEvent.click(tools.getByRole('button', { name: 'Trade Lab' }));
    expect(await screen.findByTestId('trading-view')).toBeInTheDocument();
    fireEvent.click(tools.getByRole('button', { name: 'Portfolio' }));
    expect(await screen.findByText('Showing your historical Trade Lab account.')).toBeInTheDocument();
    expect(await screen.findByTestId('portfolio-view')).toBeInTheDocument();
    fireEvent.click(tools.getByRole('button', { name: 'Calculator' }));
    expect(await screen.findByText('High-Yield Savings & CD Calculator')).toBeInTheDocument();
    fireEvent.click(tools.getByRole('button', { name: 'Coach' }));
    expect(await screen.findByRole('heading', { name: 'Ask the curriculum coach', level: 3 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'How the curriculum coach works' }));
    expect(screen.getByRole('dialog', { name: 'Coach: Practice with the curriculum coach' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Sign in to FutureWorth' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/sign-in');
    fireEvent.click(screen.getByRole('button', { name: 'Continue as guest' }));
    expect(window.location.pathname).toBe('/');
  });

  it('restores a queued Trade Lab order at its page URL and lets the learner cancel it', async () => {
    const app = render(<App />);
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Practice tools' })).getByRole('button', { name: 'Trade Lab' }));
    fireEvent.change(await screen.findByTestId('symbol-select'), { target: { value: 'MSFT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit BUY Practice Order' }));
    expect(screen.getByRole('heading', { name: 'Your order is queued' })).toBeInTheDocument();
    app.unmount();
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Your order is queued' })).toBeInTheDocument();
    expect(screen.getByTestId('symbol-select')).toHaveValue('MSFT');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel practice order' }));
    expect(screen.getByText('Practice order cancelled.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your order is queued' })).not.toBeInTheDocument();
    expect(screen.getByTestId('cash-balance')).toHaveTextContent('$10,000.00');
  });

  it('purges an expired auth session from localStorage on reload and preserves guest state', () => {
    const expiredSession = {
      user: { id: 'usr_old', email: 'old@example.com' },
      token: 'tok_expired',
      expiresAt: new Date(Date.now() - 3600000).toISOString(),
    };
    localStorage.setItem('futureworth_auth_session_v1', JSON.stringify(expiredSession));

    render(<App />);
    expect(localStorage.getItem('futureworth_auth_session_v1')).toBeNull();
    expect(screen.getByText('Demo data')).toBeInTheDocument();
  });

  it('closes initial visit sign-in modal with Escape key', async () => {
    render(<App />);
    const modal = await screen.findByRole('dialog', { name: 'Sign in to FutureWorth' });
    expect(modal).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Sign in to FutureWorth' })).not.toBeInTheDocument();
  });
});

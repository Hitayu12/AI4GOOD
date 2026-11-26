import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../../api/client';
import { ApiError } from '../../api/types';
import { SignInPage } from './SignInPage';

const testUser = { id: 'sandbox-student', email: 'student@example.org' };
const testPassword = 'A unique test password only';
const testSession = { access_token: 'test-only', token_type: 'bearer' as const, expires_at: '2027-01-01T00:00:00Z' };

describe('FutureWorth sign-in', () => {
  afterEach(() => vi.restoreAllMocks());

  it('saves affiliation only after login', async () => {
    const client = new ApiClient({ fixtureMode: false });
    const register = vi.spyOn(client, 'register').mockResolvedValue({ user: testUser });
    const login = vi.spyOn(client, 'login').mockResolvedValue(testSession);
    vi.spyOn(client, 'getMe').mockResolvedValue(testUser);
    const affiliation = { school_name: 'Rutgers University', state_code: 'NJ' };
    const save = vi.spyOn(client, 'setSchoolAffiliation').mockResolvedValue(affiliation);
    const onAuthenticated = vi.fn();
    render(<SignInPage apiClient={client} onGuest={vi.fn()} onAuthenticated={onAuthenticated} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create a FutureWorth account' }));
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: testUser.email } });
    fireEvent.change(screen.getByLabelText('FutureWorth password'), { target: { value: testPassword } });
    fireEvent.change(screen.getByLabelText('School or university'), { target: { value: 'rutgers' } });
    fireEvent.change(screen.getByLabelText('State or territory'), { target: { value: 'NJ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(testUser, testSession.expires_at, affiliation, undefined));
    expect(register.mock.calls[0][0]).toEqual({ email: testUser.email, password: testPassword });
    expect(login.mock.invocationCallOrder[0]).toBeLessThan(save.mock.invocationCallOrder[0]);
    expect(save.mock.calls[0][0]).toEqual(affiliation);
  });

  it('rejects a wrong password without signing in or switching to a fixture', async () => {
    const client = new ApiClient({ fixtureMode: false });
    vi.spyOn(client, 'login').mockRejectedValue(new ApiError(401, 'invalid_credentials', 'backend diagnostic'));
    const onAuthenticated = vi.fn();
    const onGuest = vi.fn();
    render(<SignInPage apiClient={client} onGuest={onGuest} onAuthenticated={onAuthenticated} />);
    const form = within(screen.getByRole('form'));
    fireEvent.change(form.getByLabelText('Email address'), { target: { value: testUser.email } });
    fireEvent.change(form.getByLabelText('FutureWorth password'), { target: { value: testPassword } });
    fireEvent.submit(screen.getByRole('form'));
    expect(await screen.findByRole('alert')).toHaveTextContent('The email or password didn’t match.');
    expect(form.getByLabelText('FutureWorth password')).toHaveValue('');
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(client.fixtureMode).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Continue as guest' }));
    expect(onGuest).toHaveBeenCalledOnce();
  });

  it('blocks credentials from being sent over remote HTTP', async () => {
    const client = new ApiClient({ fixtureMode: false, baseUrl: 'http://school.example.org/api/v1' });
    const fetch = vi.spyOn(window, 'fetch');
    await expect(client.login({ email: testUser.email, password: testPassword })).rejects.toMatchObject({ code: 'secure_transport_required' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects invalid email format upfront without making network calls', async () => {
    const client = new ApiClient({ fixtureMode: false });
    const login = vi.spyOn(client, 'login');
    const onAuthenticated = vi.fn();
    render(<SignInPage apiClient={client} onGuest={vi.fn()} onAuthenticated={onAuthenticated} />);
    const form = within(screen.getByRole('form'));
    fireEvent.change(form.getByLabelText('Email address'), { target: { value: 'not-an-email' } });
    fireEvent.change(form.getByLabelText('FutureWorth password'), { target: { value: testPassword } });
    fireEvent.submit(screen.getByRole('form'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Check the email format and use a password between 12 and 128 characters.');
    expect(login).not.toHaveBeenCalled();
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it('displays secure transport error when login throws secure_transport_required', async () => {
    const client = new ApiClient({ fixtureMode: false });
    vi.spyOn(client, 'login').mockRejectedValue(new ApiError(0, 'secure_transport_required', 'Insecure transport'));
    const onAuthenticated = vi.fn();
    render(<SignInPage apiClient={client} onGuest={vi.fn()} onAuthenticated={onAuthenticated} />);
    const form = within(screen.getByRole('form'));
    fireEvent.change(form.getByLabelText('Email address'), { target: { value: testUser.email } });
    fireEvent.change(form.getByLabelText('FutureWorth password'), { target: { value: testPassword } });
    fireEvent.submit(screen.getByRole('form'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in needs HTTPS outside this local preview.');
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it('falls back to offline login when backend is unreachable with valid credentials', async () => {
    const client = new ApiClient({ fixtureMode: false });
    vi.spyOn(client, 'login').mockRejectedValue(new TypeError('Failed to fetch'));
    const onAuthenticated = vi.fn();
    render(<SignInPage apiClient={client} onGuest={vi.fn()} onAuthenticated={onAuthenticated} />);
    const form = within(screen.getByRole('form'));
    fireEvent.change(form.getByLabelText('Email address'), { target: { value: testUser.email } });
    fireEvent.change(form.getByLabelText('FutureWorth password'), { target: { value: testPassword } });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalled());
    expect(onAuthenticated).toHaveBeenCalledWith(
      expect.objectContaining({ email: testUser.email }),
      expect.any(String),
      expect.any(Object),
      expect.stringContaining('Signed in successfully!')
    );
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthModal } from './AuthModal';
import { ApiClient } from '../../api/client';

describe('AuthModal Component (Shared S4)', () => {
  let mockClient: ApiClient;
  const mockOnClose = vi.fn();
  const mockOnAuthSuccess = vi.fn();

  beforeEach(() => {
    mockClient = new ApiClient();
    mockClient.setFixtureMode(true);
    vi.clearAllMocks();
  });

  it('renders modal with email and password inputs when open', () => {
    render(
      <AuthModal
        isOpen={true}
        onClose={mockOnClose}
        onAuthSuccess={mockOnAuthSuccess}
        apiClient={mockClient}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Sign In' })).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <AuthModal
        isOpen={false}
        onClose={mockOnClose}
        onAuthSuccess={mockOnAuthSuccess}
        apiClient={mockClient}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('toggles to register tab and updates header', () => {
    render(
      <AuthModal
        isOpen={true}
        onClose={mockOnClose}
        onAuthSuccess={mockOnAuthSuccess}
        apiClient={mockClient}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Register' }));
    expect(screen.getByRole('heading', { name: /Create an AI4Good student account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Registration' })).toBeInTheDocument();
  });

  it('successfully submits sign in and invokes onAuthSuccess', async () => {
    render(
      <AuthModal
        isOpen={true}
        onClose={mockOnClose}
        onAuthSuccess={mockOnAuthSuccess}
        apiClient={mockClient}
      />
    );

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'student@rutgers.edu' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'SecretPassword123' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Sign In' }));

    await waitFor(() => {
      expect(mockOnAuthSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'kiran@rutgers.edu' })
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('closes when pressing Escape key', () => {
    render(
      <AuthModal
        isOpen={true}
        onClose={mockOnClose}
        onAuthSuccess={mockOnAuthSuccess}
        apiClient={mockClient}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });
});

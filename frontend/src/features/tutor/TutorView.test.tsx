import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TutorView } from './TutorView';
import { ApiClient } from '../../api/client';

describe('TutorView Component', () => {
  let mockClient: ApiClient;

  beforeEach(() => {
    mockClient = new ApiClient();
    mockClient.setFixtureMode(true);
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('renders header, disclaimer banner, and initial welcome message', () => {
    render(<TutorView apiClient={mockClient} />);

    expect(screen.getByRole('heading', { name: /AI Financial Tutor/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Educational Disclaimer/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Educational Purposes Only:/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Hello! I am your AI Financial Literacy Tutor/i)).toBeInTheDocument();
  });

  it('renders Deterministic Curriculum Mode badge when simulation context is active', () => {
    render(<TutorView apiClient={mockClient} initialSimulationId="sim_test_001" />);

    expect(screen.getByTestId('curriculum-mode-badge')).toBeInTheDocument();
    expect(screen.getByText(/Deterministic Curriculum Mode \(Zero Lookahead\)/i)).toBeInTheDocument();
    expect(screen.getByText(/ZERO-LOOKAHEAD SAFEGUARD/i)).toBeInTheDocument();
  });

  it('switches between AI Mode and Curriculum Mode via the simulation context checkbox', () => {
    render(<TutorView apiClient={mockClient} />);

    // Initially unchecked -> AI mode
    expect(screen.getByTestId('ai-mode-badge')).toBeInTheDocument();

    const checkbox = screen.getByLabelText(/Pin to Active Simulation Context/i);
    fireEvent.click(checkbox);

    // Now checked -> Curriculum mode
    expect(screen.getByTestId('curriculum-mode-badge')).toBeInTheDocument();
  });

  it('populates textarea when clicking a quick prompt shortcut', () => {
    render(<TutorView apiClient={mockClient} />);

    const quickBtn = screen.getByRole('button', { name: /Prompt shortcut: Compound Interest/i });
    fireEvent.click(quickBtn);

    const textarea = screen.getByLabelText('Tutor Query Input') as HTMLTextAreaElement;
    expect(textarea.value).toContain('compound interest');
  });

  it('sends inquiry in curriculum mode and displays response with source links', async () => {
    render(<TutorView apiClient={mockClient} initialSimulationId="sim_test_001" />);

    const textarea = screen.getByLabelText('Tutor Query Input');
    fireEvent.change(textarea, { target: { value: 'Explain compound interest calculation' } });

    const sendBtn = screen.getByRole('button', { name: /Send tutor inquiry/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(/Compound interest is interest calculated on both initial principal/i)).toBeInTheDocument();
    });

    // Check source links
    expect(screen.getAllByText(/Authoritative Sources:/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /compound-interest-calculator/i })).toBeInTheDocument();
  });

  it('sends inquiry in general AI mode when simulation context is disabled', async () => {
    render(<TutorView apiClient={mockClient} />);

    const textarea = screen.getByLabelText('Tutor Query Input');
    fireEvent.change(textarea, { target: { value: 'What is financial risk?' } });

    const sendBtn = screen.getByRole('button', { name: /Send tutor inquiry/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(/Educational AI Tutor: Financial concepts/i)).toBeInTheDocument();
    });
  });

  it('handles 503 tutor_unavailable by showing honest provider unavailable alert', async () => {
    render(<TutorView apiClient={mockClient} />);

    const textarea = screen.getByLabelText('Tutor Query Input');
    // Using test flag SIMULATE_503 that trips 503 error in client fixture
    fireEvent.change(textarea, { target: { value: 'SIMULATE_503' } });

    const sendBtn = screen.getByRole('button', { name: /Send tutor inquiry/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert', { name: /Provider Unavailable Alert/i })).toBeInTheDocument();
      expect(screen.getByText(/Live AI Tutor provider is unconfigured or offline/i)).toBeInTheDocument();
    });
  });

  it('submits query when pressing Enter key in the textarea', async () => {
    render(<TutorView apiClient={mockClient} initialSimulationId="sim_test_001" />);

    const textarea = screen.getByLabelText('Tutor Query Input');
    fireEvent.change(textarea, { target: { value: 'What is an ETF?' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/An Exchange-Traded Fund \(ETF\) pools capital/i)).toBeInTheDocument();
    });
  });
});

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
    expect(screen.getByText(/Pick a starter below/i)).toBeInTheDocument();
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

  it('prevents off-topic prompts and enforces curriculum guardrails in curriculum coach mode', async () => {
    render(<TutorView curriculumOnly={true} />);

    const textarea = screen.getByLabelText('Tutor Query Input');
    const sendBtn = screen.getByRole('button', { name: /Send tutor inquiry/i });

    // 1. Off-topic prompt
    fireEvent.change(textarea, { target: { value: 'What is the capital of France?' } });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/That question is outside my current lesson library/i)
      ).toBeInTheDocument();
    });

    // 2. Unsafe investment advice prompt
    fireEvent.change(textarea, { target: { value: 'Should I buy AAPL right now?' } });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/As an educational platform, the AI Tutor does not provide personalized investment advice/i)
      ).toBeInTheDocument();
    });
  });

  it('handles network latency gracefully by disabling inputs and showing loading indicator', async () => {
    let resolveMessage: (res: unknown) => void = () => {};
    const deferredPromise = new Promise((resolve) => {
      resolveMessage = resolve;
    });

    const latencyClient = new ApiClient();
    vi.spyOn(latencyClient, 'sendTutorMessage').mockReturnValue(
      deferredPromise as unknown as ReturnType<ApiClient['sendTutorMessage']>
    );

    render(<TutorView apiClient={latencyClient} />);

    const textarea = screen.getByLabelText('Tutor Query Input') as HTMLTextAreaElement;
    const sendBtn = screen.getByRole('button', { name: /Send tutor inquiry/i });

    fireEvent.change(textarea, { target: { value: 'Explain risk management' } });
    fireEvent.click(sendBtn);

    // During network latency (in flight):
    expect(sendBtn).toBeDisabled();
    expect(sendBtn).toHaveTextContent('Sending...');
    expect(textarea).toBeDisabled();
    expect(screen.getByText(/AI Tutor is reasoning\.\.\./i)).toBeInTheDocument();

    // Now resolve the network response
    resolveMessage({
      reply: 'Risk management involves balancing potential return against the risk of capital loss.',
      mode: 'ai',
      source_links: ['https://www.investor.gov'],
    });

    await waitFor(() => {
      expect(screen.getByText(/Risk management involves balancing potential return/i)).toBeInTheDocument();
      expect(textarea).not.toBeDisabled();
      expect(sendBtn).toHaveTextContent('Send Query');
    });
  });
});

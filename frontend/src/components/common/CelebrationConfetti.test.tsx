import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CelebrationConfetti, triggerConfetti, CONFETTI_EVENT_NAME } from './CelebrationConfetti';

describe('CelebrationConfetti Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders canvas element with pointer-events-none and aria-hidden', () => {
    render(<CelebrationConfetti />);
    const canvas = screen.getByTestId('celebration-confetti');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    expect(canvas).toHaveClass('pointer-events-none');
  });

  it('listens for ai4good:confetti custom event and triggers without crashing', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    render(<CelebrationConfetti />);

    act(() => {
      triggerConfetti({ particleCount: 50 });
    });

    expect(dispatchSpy).toHaveBeenCalled();
    const eventCall = dispatchSpy.mock.calls.find(
      (c) => (c[0] as CustomEvent).type === CONFETTI_EVENT_NAME
    );
    expect(eventCall).toBeDefined();
    expect((eventCall![0] as CustomEvent).detail.particleCount).toBe(50);
  });
});

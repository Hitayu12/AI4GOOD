import { describe, it, expect, vi, beforeEach } from 'vitest';
import { soundFx, SOUND_MUTE_CHANGED_EVENT } from './soundFxService';

describe('SoundFxService', () => {
  beforeEach(() => {
    localStorage.clear();
    soundFx.setMuted(false);
  });

  it('manages mute state and emits custom event', () => {
    const listener = vi.fn();
    window.addEventListener(SOUND_MUTE_CHANGED_EVENT, listener);

    expect(soundFx.isMuted()).toBe(false);

    soundFx.toggleMute();
    expect(soundFx.isMuted()).toBe(true);
    expect(localStorage.getItem('ai4good_sound_muted')).toBe('true');
    expect(listener).toHaveBeenCalled();

    soundFx.setMuted(false);
    expect(soundFx.isMuted()).toBe(false);
    expect(localStorage.getItem('ai4good_sound_muted')).toBe('false');

    window.removeEventListener(SOUND_MUTE_CHANGED_EVENT, listener);
  });

  it('safely no-ops in headless test environments for all sound presets', () => {
    expect(() => {
      soundFx.playCoinPing();
      soundFx.playLevelUpChime();
      soundFx.playSuccessChord();
      soundFx.playTactileClick();
      soundFx.playMysteryCardFlip();
      soundFx.playFailureBuzzer();
    }).not.toThrow();
  });

  it('strictly respects mute state and never creates audio nodes when muted', () => {
    soundFx.setMuted(true);
    expect(soundFx.isMuted()).toBe(true);

    const mockCreateOscillator = vi.fn();
    const mockAudioContext = vi.fn().mockImplementation(() => ({
      createOscillator: mockCreateOscillator,
      createGain: vi.fn(),
      currentTime: 0,
      destination: {},
    }));
    const originalAudioContext = (window as unknown as { AudioContext?: unknown }).AudioContext;
    (window as unknown as { AudioContext?: unknown }).AudioContext = mockAudioContext;

    soundFx.playCoinPing();
    soundFx.playLevelUpChime();
    soundFx.playSuccessChord();
    soundFx.playTactileClick();
    soundFx.playMysteryCardFlip();
    soundFx.playFailureBuzzer();

    expect(mockAudioContext).not.toHaveBeenCalled();
    expect(mockCreateOscillator).not.toHaveBeenCalled();

    (window as unknown as { AudioContext?: unknown }).AudioContext = originalAudioContext;
  });
});

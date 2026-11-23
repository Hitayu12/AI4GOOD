/**
 * Web Audio API Synthesized Sound Generator
 * 
 * Generates arcade-style micro-delights and tactile audio feedback
 * purely in-browser using Web Audio oscillators and gain envelopes.
 * Zero external audio files or MP3 downloads required.
 */

const STORAGE_KEY_MUTED = 'ai4good_sound_muted';
export const SOUND_MUTE_CHANGED_EVENT = 'ai4good:sound-mute-changed';

class SoundFxService {
  private audioCtx: AudioContext | null = null;
  private muted: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_MUTED);
      // Sound is opt-in. This is a learning product used in classrooms and
      // shared spaces, so a first visit should never make unexpected noise.
      this.muted = saved === null ? true : saved === 'true';
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtxClass) return null;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      return this.audioCtx;
    } catch {
      return null;
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_MUTED, String(muted));
      window.dispatchEvent(
        new CustomEvent(SOUND_MUTE_CHANGED_EVENT, { detail: { muted } })
      );
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Crisp Gold Coin Ping (Robinhood/Mario style)
   * 987.77 Hz (B5) spiking to 1318.51 Hz (E6) with fast exponential decay.
   */
  public playCoinPing(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.setValueAtTime(1318.51, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Ascending Level-Up / Prestige Arpeggio
   * C5 (523.25 Hz) -> E5 (659.25 Hz) -> G5 (783.99 Hz) -> C6 (1046.50 Hz)
   */
  public playLevelUpChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + idx * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.15, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.4);
      });
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Harmonic Major Success Chord (Quiz pass / Quest complete)
   * F5 (698.46 Hz) + A5 (880 Hz) + C6 (1046.5 Hz)
   */
  public playSuccessChord(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const frequencies = [698.46, 880.0, 1046.5];
      const now = ctx.currentTime;

      frequencies.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.6);
      });
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Tactile Mechanical Click
   * 450 Hz dropping to 60 Hz in 22ms at low volume.
   */
  public playTactileClick(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.025);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Holographic Mystery Card Flip Swoosh
   * Rapid frequency sweep 180 Hz -> 900 Hz
   */
  public playMysteryCardFlip(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.15);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Subtle Soft Error Buzzer
   */
  public playFailureBuzzer(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Graceful fallback
    }
  }
}

export const soundFx = new SoundFxService();

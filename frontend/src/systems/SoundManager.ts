export class SoundManager {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playTone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal: number = 0.08, slideFreq?: number) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideFreq) {
        osc.frequency.exponentialRampToValueAtTime(slideFreq, ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Ignore audio context restrictions
    }
  }

  public playJump() {
    this.playTone(240, 0.18, 'sine', 0.09, 540);
  }

  public playJumpPad() {
    this.playTone(280, 0.35, 'triangle', 0.12, 880);
  }

  public playDash() {
    this.playTone(180, 0.15, 'sawtooth', 0.06, 420);
  }

  public playCollect(value: number) {
    const base = value >= 50 ? 587.33 : value >= 25 ? 523.25 : 440;
    this.playTone(base, 0.12, 'triangle', 0.1);
    setTimeout(() => this.playTone(base * 1.25, 0.14, 'triangle', 0.1), 70);
    setTimeout(() => this.playTone(base * 1.5, 0.22, 'sine', 0.12), 140);
  }

  public playCrown() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 0.18, 'triangle', 0.11), idx * 75);
    });
  }

  public playChat() {
    this.playTone(660, 0.08, 'sine', 0.05, 880);
  }

  public playEmote() {
    this.playTone(480, 0.12, 'sine', 0.07, 640);
    setTimeout(() => this.playTone(720, 0.16, 'sine', 0.07), 100);
  }
}

export const soundManager = new SoundManager();

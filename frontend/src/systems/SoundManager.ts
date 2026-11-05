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
    this.playTone(230, 0.16, 'sine', 0.08, 520);
  }

  public playJumpPad() {
    this.playTone(260, 0.35, 'triangle', 0.12, 880);
  }

  public playDash() {
    this.playTone(180, 0.14, 'sawtooth', 0.06, 440);
  }

  public playCollect(value: number) {
    const base = value >= 50 ? 587.33 : value >= 25 ? 523.25 : 440;
    this.playTone(base, 0.11, 'triangle', 0.09);
    setTimeout(() => this.playTone(base * 1.25, 0.13, 'triangle', 0.09), 65);
    setTimeout(() => this.playTone(base * 1.5, 0.2, 'sine', 0.11), 130);
  }

  public playCrown() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 0.18, 'triangle', 0.1), idx * 70);
    });
  }

  public playChat() {
    this.playTone(680, 0.07, 'sine', 0.05, 860);
  }

  public playEmote() {
    this.playTone(480, 0.1, 'sine', 0.07, 640);
    setTimeout(() => this.playTone(720, 0.15, 'sine', 0.07), 95);
  }

  public playHorn() {
    this.playTone(340, 0.16, 'sawtooth', 0.09);
    this.playTone(425, 0.16, 'sawtooth', 0.09);
    setTimeout(() => {
      this.playTone(340, 0.22, 'sawtooth', 0.09);
      this.playTone(425, 0.22, 'sawtooth', 0.09);
    }, 190);
  }
}

export const soundManager = new SoundManager();

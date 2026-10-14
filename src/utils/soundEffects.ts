import type { AudioAssetKey } from '../types/audio';
import { audioStorage } from './audioStorage';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = false;
  private volume: number = 1.0;
  private activeMusicAudio: HTMLAudioElement | null = null;
  private activeMusicKey: AudioAssetKey | null = null;

  constructor() {
    // Initialized lazily on first user interaction
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (!val) {
      this.stopActiveMusic();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.activeMusicAudio) {
      this.activeMusicAudio.volume = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  private initContext() {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    } catch (e) {
      console.warn('AudioContext not supported', e);
    }
  }

  private ensureContext() {
    if (!this.ctx) {
      this.initContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Stop currently playing background music or theme track
  public stopActiveMusic() {
    if (this.activeMusicAudio) {
      try {
        this.activeMusicAudio.pause();
        this.activeMusicAudio.currentTime = 0;
      } catch (e) {
        console.warn('Error stopping music:', e);
      }
      this.activeMusicAudio = null;
      this.activeMusicKey = null;
    }
  }

  public getActiveMusicKey(): AudioAssetKey | null {
    return this.activeMusicKey;
  }

  // Play an assigned authentic audio asset or trigger synthesizer fallback
  public async playAsset(key: AudioAssetKey): Promise<{ success: boolean; isAuthentic: boolean }> {
    if (!this.enabled) return { success: false, isAuthentic: false };

    try {
      const url = await audioStorage.getAudioUrl(key);
      if (url) {
        // Authentic audio asset found! Play authentic soundtrack/cue
        const isMusic = ['theme', 'faceoff', 'countdown', 'finalWinner'].includes(key);

        if (isMusic) {
          this.stopActiveMusic();
        }

        const audio = new Audio(url);
        audio.volume = this.volume;

        if (isMusic) {
          this.activeMusicAudio = audio;
          this.activeMusicKey = key;
          audio.onended = () => {
            if (this.activeMusicAudio === audio) {
              this.activeMusicAudio = null;
              this.activeMusicKey = null;
            }
          };
        }

        await audio.play();
        return { success: true, isAuthentic: true };
      }
    } catch (e) {
      console.warn(`Could not play authentic audio for key "${key}":`, e);
    }

    // Authentic track is missing locally: play subtle synthesized placeholder cue
    this.playSynthesizedFallback(key);
    return { success: true, isAuthentic: false };
  }

  private playSynthesizedFallback(key: AudioAssetKey) {
    this.ensureContext();
    if (!this.ctx) return;

    switch (key) {
      case 'correctDing':
        this.synthChime();
        break;
      case 'strikeBuzzer':
        this.synthBuzzer();
        break;
      case 'thirdStrike':
        this.synthThirdStrike();
        break;
      case 'questionReveal':
        this.synthWhoosh();
        break;
      case 'roundWin':
      case 'finalWinner':
        this.synthFanfare();
        break;
      case 'countdown':
        this.synthClockTick();
        break;
      default:
        // Do not substitute generic music for theme or faceoff
        break;
    }
  }

  // Convenience methods mapped to game events
  public playCorrectAnswer() {
    return this.playAsset('correctDing');
  }

  public playStrike() {
    return this.playAsset('strikeBuzzer');
  }

  public playThirdStrike() {
    return this.playAsset('thirdStrike');
  }

  public playQuestionReveal() {
    return this.playAsset('questionReveal');
  }

  public playRoundWin() {
    return this.playAsset('roundWin');
  }

  public playFinalWinner() {
    return this.playAsset('finalWinner');
  }

  public playOpeningTheme() {
    return this.playAsset('theme');
  }

  public playFaceoff() {
    return this.playAsset('faceoff');
  }

  public playCountdownMusic() {
    return this.playAsset('countdown');
  }

  public playScoreTick() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now);
    osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.1);

    gainNode.gain.setValueAtTime(0.18, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playClockTick() {
    this.synthClockTick();
  }

  public playFanfare() {
    return this.playAsset('finalWinner');
  }

  // Synthesizers
  private synthChime() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.setValueAtTime(880.00, now + 0.12);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, now);
    osc2.frequency.setValueAtTime(1760.00, now + 0.12);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.28, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.9);
    osc2.stop(now + 0.9);
  }

  private synthBuzzer() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(130.81, now);
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(138.59, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.35, now + 0.03);
    gainNode.gain.setValueAtTime(0.35, now + 0.45);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.65);
    osc2.stop(now + 0.65);
  }

  private synthThirdStrike() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const oscSub = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(110.0, now);
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(116.54, now);
    oscSub.type = 'sawtooth';
    oscSub.frequency.setValueAtTime(55.0, now);

    const peakGain = 0.45 * this.volume;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(peakGain, now + 0.04);
    gainNode.gain.setValueAtTime(peakGain, now + 0.75);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.15);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    oscSub.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    oscSub.start(now);
    osc1.stop(now + 1.15);
    osc2.stop(now + 1.15);
    oscSub.stop(now + 1.15);
  }

  private synthWhoosh() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.25);

    gainNode.gain.setValueAtTime(0.02, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  private synthClockTick() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  private synthFanfare() {
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const noteTime = now + idx * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.25, noteTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + (idx === 3 ? 1.4 : 0.35));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + (idx === 3 ? 1.4 : 0.35));
    });
  }
}

export const soundEffects = new SoundEngine();

/**
 * forestAudio.js — Web Audio Synthesizer for The Living Forest.
 * Generates natural ambient drone (gentle wind and foliage hum) and droplet impact sound.
 * Zero external audio asset dependencies, fully client-side and memory-safe.
 */

class ForestAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = true;
    this.masterGain = null;
    this.filterNode = null;
    this.osc1 = null;
    this.osc2 = null;
    this.hasStarted = false;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Warm lowpass filter for gentle natural hum
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(380, this.ctx.currentTime);
      this.filterNode.connect(this.masterGain);

      // Nature harmonic oscillator 1 (110 Hz - A2)
      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = 'sine';
      this.osc1.frequency.setValueAtTime(110, this.ctx.currentTime);

      // Nature harmonic oscillator 2 (164.81 Hz - E3)
      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = 'triangle';
      this.osc2.frequency.setValueAtTime(164.81, this.ctx.currentTime);

      const droneGain = this.ctx.createGain();
      droneGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

      this.osc1.connect(droneGain);
      this.osc2.connect(droneGain);
      droneGain.connect(this.filterNode);

      this.osc1.start();
      this.osc2.start();
      this.hasStarted = true;
    } catch (e) {
      console.warn('Forest Web Audio not initialized yet', e);
    }
  }

  toggleMute() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0.0 : 0.16;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.3);
    }
    return !this.isMuted;
  }

  triggerDropletImpact() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.45);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.55);
    } catch {
      // ignore audio errors
    }
  }
}

export const forestAudio = new ForestAudioEngine();

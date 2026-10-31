/**
 * Web Audio Ambient Soundscape Generator for "Veins of Life".
 * Fully client-side, zero external audio asset dependencies.
 * Generates organic air, droplet entry caustics, and urban ambient harmonics.
 */

class CinematicAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = true;
    this.masterGain = null;
    this.filterNode = null;
    this.natureDrone = null;
    this.urbanDrone = null;
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

      // Lowpass filter for smooth frequency transitions
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(450, this.ctx.currentTime);
      this.filterNode.connect(this.masterGain);

      // Nature organic harmonic oscillator (Gentle wind & leaf hum)
      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = 'sine';
      this.osc1.frequency.setValueAtTime(110, this.ctx.currentTime); // A2

      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = 'triangle';
      this.osc2.frequency.setValueAtTime(164.81, this.ctx.currentTime); // E3

      const droneGain = this.ctx.createGain();
      droneGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

      this.osc1.connect(droneGain);
      this.osc2.connect(droneGain);
      droneGain.connect(this.filterNode);

      this.osc1.start();
      this.osc2.start();
      this.hasStarted = true;
    } catch (e) {
      console.warn('Web Audio not initialized yet', e);
    }
  }

  toggleMute() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0.0 : 0.18;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.3);
    }
    return !this.isMuted;
  }

  updateProgress(t) {
    if (!this.ctx || this.isMuted || !this.filterNode) return;

    // Modulate filter cutoff frequency according to cinematic stage
    // t: 0.0 (Leaf) -> 0.35 (Droplet entry) -> 0.7 (Morph) -> 1.0 (City)
    const baseFreq = 300 + t * 900;
    this.filterNode.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.1);

    if (this.osc1) {
      // Subtle pitch bend as scale shifts
      const freq = 110 + Math.sin(t * Math.PI) * 20;
      this.osc1.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
    }
  }

  triggerDropletImpact() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.5);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.65);
    } catch {
      // ignore audio errors
    }
  }
}

export const cinematicAudio = new CinematicAudioEngine();

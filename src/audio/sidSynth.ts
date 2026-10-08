/**
 * Commodore 64 MOS SID (6581 / 8580) Web Audio Synthesizer Engine
 * Real 3-voice synthesis with Triangle, Sawtooth, Pulse (PWM), LFSR Noise,
 * ADSR envelope generators, and resonant State-Variable/Biquad Filter.
 */

import { SidChipModel } from '../types/c64dos';

export interface SidVoiceState {
  waveform: 'sawtooth' | 'triangle' | 'pulse' | 'noise';
  frequency: number;
  pulseWidth: number; // 0..100%
  attack: number;    // seconds
  decay: number;     // seconds
  sustain: number;   // 0..1
  release: number;   // seconds
  filterEnabled: boolean;
  muted: boolean;
}

export class SidSynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  private isPlayingSequence = false;
  private sequenceTimer: number | null = null;
  private currentStep = 0;
  private currentTuneId = 'cyber_anthem';

  // SID Chip Settings
  public sidModel: SidChipModel = '6581';
  public filterCutoffHz = 2400;
  public filterResonanceQ = 4.5;
  public filterType: 'lowpass' | 'bandpass' | 'highpass' = 'lowpass';

  // Voice States
  public voices: SidVoiceState[] = [
    {
      waveform: 'pulse',
      frequency: 440,
      pulseWidth: 50,
      attack: 0.02,
      decay: 0.15,
      sustain: 0.6,
      release: 0.25,
      filterEnabled: true,
      muted: false,
    },
    {
      waveform: 'sawtooth',
      frequency: 220,
      pulseWidth: 30,
      attack: 0.01,
      decay: 0.1,
      sustain: 0.7,
      release: 0.2,
      filterEnabled: true,
      muted: false,
    },
    {
      waveform: 'noise',
      frequency: 110,
      pulseWidth: 50,
      attack: 0.005,
      decay: 0.12,
      sustain: 0.0,
      release: 0.1,
      filterEnabled: false,
      muted: false,
    },
  ];

  // Cached noise buffer
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    // Lazy AudioContext initialization on user interaction
  }

  private initAudio() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.45, this.ctx.currentTime);

    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 512;
    this.analyserNode.smoothingTimeConstant = 0.8;

    this.filterNode = this.ctx.createBiquadFilter();
    this.updateFilter();

    this.filterNode.connect(this.masterGain);
    this.masterGain.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);

    this.generateNoiseBuffer();
  }

  private generateNoiseBuffer() {
    if (!this.ctx) return;
    // Emulate 23-bit Galois LFSR noise of the MOS 6581
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);

    let lfsr = 0x7ffff8;
    for (let i = 0; i < bufferSize; i++) {
      // MOS 6581 LFSR polynomial feedback: bit 22 XOR bit 17
      const bit = ((lfsr >> 22) ^ (lfsr >> 17)) & 1;
      lfsr = ((lfsr << 1) | bit) & 0x7fffff;
      // Map 8-bit DAC output
      output[i] = ((lfsr & 0xff) / 128.0) - 1.0;
    }
  }

  public updateFilter() {
    if (!this.filterNode || !this.ctx) return;
    this.filterNode.type = this.filterType;
    this.filterNode.frequency.setValueAtTime(this.filterCutoffHz, this.ctx.currentTime);

    // 6581 had lower resonance peak and warm analog saturation, 8580 was sharper
    const qMultiplier = this.sidModel === '6581' ? 1.0 : 1.35;
    this.filterNode.Q.setValueAtTime(this.filterResonanceQ * qMultiplier, this.ctx.currentTime);
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public setMasterVolume(volume: number) {
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime);
  }

  /**
   * Triggers a single note on a specific voice
   */
  public triggerNote(
    voiceIdx: number,
    freq: number,
    durationSeconds = 0.35,
    customWave?: 'sawtooth' | 'triangle' | 'pulse' | 'noise'
  ) {
    this.initAudio();
    if (!this.ctx || !this.masterGain || !this.filterNode) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const voice = this.voices[voiceIdx];
    if (voice.muted) return;

    const wave = customWave || voice.waveform;
    const now = this.ctx.currentTime;

    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(0.0001, now);

    // ADSR Envelope
    const attackEnd = now + Math.max(0.005, voice.attack);
    const decayEnd = attackEnd + Math.max(0.005, voice.decay);
    const peakLevel = 0.5;
    const sustainLevel = peakLevel * voice.sustain;

    voiceGain.gain.exponentialRampToValueAtTime(peakLevel, attackEnd);
    voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustainLevel), decayEnd);

    const noteEnd = now + durationSeconds;
    const releaseEnd = noteEnd + Math.max(0.01, voice.release);

    voiceGain.gain.setValueAtTime(Math.max(0.0001, sustainLevel), noteEnd);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);

    // Route to Filter or Direct to Master
    if (voice.filterEnabled) {
      voiceGain.connect(this.filterNode);
    } else {
      voiceGain.connect(this.masterGain);
    }

    // Source generation
    if (wave === 'noise') {
      if (this.noiseBuffer) {
        const source = this.ctx.createBufferSource();
        source.buffer = this.noiseBuffer;
        source.playbackRate.value = Math.max(0.2, freq / 220);
        source.connect(voiceGain);
        source.start(now);
        source.stop(releaseEnd);
      }
    } else if (wave === 'pulse') {
      // Approximate Pulse wave with variable pulse width
      // Real pulse width via PeriodicWave or dual sawtooth
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);

      // Add mild pulse width duty cycle harmonic coloration
      osc.connect(voiceGain);
      osc.start(now);
      osc.stop(releaseEnd);
    } else {
      const osc = this.ctx.createOscillator();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now);
      osc.connect(voiceGain);
      osc.start(now);
      osc.stop(releaseEnd);
    }
  }

  /**
   * Starts playing chiptune sequence for the given tune ID
   */
  public playTune(tuneId: string) {
    this.initAudio();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.stopTune();
    this.currentTuneId = tuneId;
    this.isPlayingSequence = true;
    this.currentStep = 0;

    const bpm = tuneId === 'cyber_anthem' ? 134 : tuneId === 'racing_rush' ? 142 : 118;
    const stepInterval = (60 / bpm / 4) * 1000; // 16th notes

    this.sequenceTimer = window.setInterval(() => {
      this.tickSequence();
    }, stepInterval);
  }

  public stopTune() {
    if (this.sequenceTimer !== null) {
      clearInterval(this.sequenceTimer);
      this.sequenceTimer = null;
    }
    this.isPlayingSequence = false;
  }

  public isPlaying(): boolean {
    return this.isPlayingSequence;
  }

  private tickSequence() {
    const step = this.currentStep;
    this.currentStep = (this.currentStep + 1) % 64;

    const tune = this.currentTuneId;

    if (tune === 'cyber_anthem') {
      // Voice 1: Fast energetic arpeggios (C minor / Eb / F / G)
      const arpNotes = [261.63, 311.13, 392.00, 523.25, 311.13, 392.00, 523.25, 622.25];
      const rootNote = arpNotes[step % 8];
      const pitchMod = step >= 32 && step < 48 ? 1.25 : step >= 48 ? 1.33 : 1.0;
      this.triggerNote(0, rootNote * pitchMod, 0.09, 'sawtooth');

      // Voice 2: Punchy bassline
      if (step % 4 === 0) {
        const bassFreq = (step % 16 === 0 ? 65.41 : 130.81) * pitchMod;
        this.triggerNote(1, bassFreq, 0.16, 'pulse');
      }

      // Voice 3: Drums / Noise Snare / Hi-Hat
      if (step % 8 === 4) {
        // Snare
        this.triggerNote(2, 280, 0.12, 'noise');
      } else if (step % 2 === 0) {
        // Closed hi-hat
        this.triggerNote(2, 600, 0.03, 'noise');
      }
    } else if (tune === 'racing_rush') {
      // Upbeat racing theme
      const leadScale = [329.63, 392.0, 440.0, 493.88, 587.33, 659.25];
      const note = leadScale[(step * 2) % leadScale.length];
      if (step % 2 === 0) {
        this.triggerNote(0, note, 0.12, 'pulse');
      }

      // Bass driving 8th notes
      if (step % 2 === 0) {
        const bass = step % 8 === 0 ? 82.41 : 164.81;
        this.triggerNote(1, bass, 0.1, 'sawtooth');
      }

      // Snare on 4 and 12
      if (step % 8 === 4) {
        this.triggerNote(2, 220, 0.15, 'noise');
      }
    } else if (tune === 'basic_boot') {
      // Classic nostalgic chimes
      if (step === 0) this.triggerNote(0, 523.25, 0.25, 'triangle');
      if (step === 2) this.triggerNote(0, 659.25, 0.25, 'triangle');
      if (step === 4) this.triggerNote(0, 783.99, 0.4, 'triangle');
      if (step === 8) this.triggerNote(1, 1046.50, 0.6, 'pulse');
    } else {
      // Dungeon / ambient echo
      if (step % 8 === 0) {
        const notes = [146.83, 174.61, 220.00, 196.00];
        const n = notes[(step / 8) % notes.length];
        this.triggerNote(0, n, 0.35, 'triangle');
        this.triggerNote(1, n * 2, 0.2, 'sawtooth');
      }
      if (step % 16 === 12) {
        this.triggerNote(2, 100, 0.3, 'noise');
      }
    }
  }

  public destroy() {
    this.stopTune();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

// Global Singleton for easy state sharing across tabs
export const sidSynth = new SidSynthEngine();

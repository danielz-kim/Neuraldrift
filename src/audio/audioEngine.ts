/**
 * Neuraldrift - Audio Engine
 *
 * Manages Web Audio API for stereo binaural playback.
 * Left oscillator panned fully left (-1), right oscillator fully right (+1).
 * Uses smooth frequency transitions to prevent clicks.
 * Includes optional pink noise masking and gradual ramp-in for efficacy.
 */

const MASTER_GAIN = 0.2;
const RAMP_DURATION = 10; // seconds - gradual onset reduces startle, improves entrainment
const PINK_NOISE_GAIN = 0.06; // ~30% of carrier - masks tones, reduces fatigue
const FADE_OUT_DURATION = 2; // seconds when stopping or ending work session

export type OscillatorType = 'sine' | 'square' | 'triangle' | 'sawtooth';

export interface StartOptions {
  pinkNoise?: boolean;
  rampDuration?: number;
}

interface AudioNodes {
  leftOsc: OscillatorNode;
  rightOsc: OscillatorNode;
  leftGain: GainNode;
  rightGain: GainNode;
  masterGain: GainNode;
  pinkNoiseSource: AudioBufferSourceNode | null;
  pinkNoiseGain: GainNode | null;
}

/**
 * Generate pink noise buffer using Paul Kellet's refined method (-3dB/octave).
 */
function createPinkNoiseBuffer(context: AudioContext, durationSeconds: number): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = sampleRate * durationSeconds;
  const buffer = context.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
  const b6 = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    left[i] = pink;
    right[i] = pink;
  }

  return buffer;
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private nodes: AudioNodes | null = null;
  private playing = false;
  private oscillatorType: OscillatorType = 'sine';
  private pinkNoiseEnabled = true;
  /** 0–1, applied to MASTER_GAIN for ramp and live volume */
  private volumeMultiplier = 1;

  /**
   * Initialize the AudioContext. Call this before start().
   * Must be triggered by a user gesture due to browser autoplay policy.
   */
  init(): void {
    if (this.context) return;
    this.context = new AudioContext();
  }

  /**
   * Start playback. Requires init() and user gesture.
   * Resumes context if suspended (handles autoplay restrictions).
   * Uses 10s ramp-in for gradual onset; optional pink noise masking.
   */
  async start(
    leftHz: number,
    rightHz: number,
    options: StartOptions = {}
  ): Promise<void> {
    if (!this.context) {
      this.init();
    }
    if (!this.context) return;

    // Resume if suspended (browser autoplay policy)
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    if (this.playing) {
      this.stop();
    }

    const rampDuration = options.rampDuration ?? RAMP_DURATION;
    const usePinkNoise = options.pinkNoise ?? this.pinkNoiseEnabled;
    const now = this.context.currentTime;

    const leftOsc = this.context.createOscillator();
    const rightOsc = this.context.createOscillator();
    const leftGain = this.context.createGain();
    const rightGain = this.context.createGain();
    const masterGain = this.context.createGain();

    const leftPanner = this.context.createStereoPanner();
    const rightPanner = this.context.createStereoPanner();

    leftPanner.pan.value = -1;
    rightPanner.pan.value = 1;

    leftOsc.type = this.oscillatorType;
    rightOsc.type = this.oscillatorType;
    leftOsc.frequency.setValueAtTime(leftHz, now);
    rightOsc.frequency.setValueAtTime(rightHz, now);

    leftGain.gain.setValueAtTime(1, now);
    rightGain.gain.setValueAtTime(1, now);

    // Ramp-in: start at 0, fade to full over rampDuration (reduces startle, improves entrainment)
    const targetGain = MASTER_GAIN * this.volumeMultiplier;
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(targetGain, now + rampDuration);

    leftOsc.connect(leftGain);
    leftGain.connect(leftPanner);
    leftPanner.connect(masterGain);

    rightOsc.connect(rightGain);
    rightGain.connect(rightPanner);
    rightPanner.connect(masterGain);

    masterGain.connect(this.context.destination);

    let pinkNoiseSource: AudioBufferSourceNode | null = null;
    let pinkNoiseGain: GainNode | null = null;

    if (usePinkNoise) {
      const buffer = createPinkNoiseBuffer(this.context, 3);
      pinkNoiseSource = this.context.createBufferSource();
      pinkNoiseSource.buffer = buffer;
      pinkNoiseSource.loop = true;

      pinkNoiseGain = this.context.createGain();
      pinkNoiseGain.gain.setValueAtTime(0, now);
      pinkNoiseGain.gain.linearRampToValueAtTime(PINK_NOISE_GAIN, now + rampDuration);

      pinkNoiseSource.connect(pinkNoiseGain);
      pinkNoiseGain.connect(masterGain);
      pinkNoiseSource.start(now);
    }

    leftOsc.start();
    rightOsc.start();

    this.nodes = {
      leftOsc,
      rightOsc,
      leftGain,
      rightGain,
      masterGain,
      pinkNoiseSource,
      pinkNoiseGain,
    };
    this.playing = true;
  }

  /**
   * Stop playback and disconnect all nodes to prevent memory leaks.
   * For a gentle fade-out first, use fadeOutAndStop() instead.
   */
  stop(): void {
    if (!this.nodes || !this.context) return;

    const { leftOsc, rightOsc, pinkNoiseSource } = this.nodes;

    try {
      leftOsc.stop();
      rightOsc.stop();
      if (pinkNoiseSource) pinkNoiseSource.stop();
    } catch {
      // Already stopped
    }

    leftOsc.disconnect();
    rightOsc.disconnect();
    if (pinkNoiseSource) pinkNoiseSource.disconnect();

    this.nodes = null;
    this.playing = false;
  }

  /**
   * Fade master and pink noise to zero over duration, then stop. Returns a promise that resolves when fade is complete.
   */
  async fadeOutAndStop(durationSeconds: number = FADE_OUT_DURATION): Promise<void> {
    if (!this.nodes || !this.context) {
      this.playing = false;
      return;
    }

    const { masterGain, pinkNoiseSource, leftOsc, rightOsc } = this.nodes;
    const now = this.context.currentTime;
    const endTime = now + durationSeconds;

    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, endTime);

    await new Promise<void>((resolve) => {
      const resolveAndStop = () => {
        try {
          leftOsc.stop();
          rightOsc.stop();
          if (pinkNoiseSource) pinkNoiseSource.stop();
        } catch {
          // Already stopped
        }
        leftOsc.disconnect();
        rightOsc.disconnect();
        if (pinkNoiseSource) pinkNoiseSource.disconnect();
        this.nodes = null;
        this.playing = false;
        resolve();
      };
      setTimeout(resolveAndStop, (durationSeconds + 0.05) * 1000);
    });
  }

  /**
   * Play a short gentle chime (e.g. end of work session). Uses existing context.
   */
  playChime(): void {
    const ctx = this.context;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => this.playChime());
      return;
    }

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
    gainNode.connect(ctx.destination);

    const f1 = 523.25;
    const f2 = 659.25;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(f1, now);
    osc2.frequency.setValueAtTime(f2, now);
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
  }

  /**
   * Play a single short countdown beep (e.g. 3, 2, 1 before next work). Uses existing context.
   */
  playCountdownBeep(): void {
    const ctx = this.context;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => this.playCountdownBeep());
      return;
    }

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.12);
    gainNode.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.connect(gainNode);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Enable or disable pink noise. If playing, applies immediately.
   */
  setPinkNoiseEnabled(enabled: boolean): void {
    this.pinkNoiseEnabled = enabled;
    if (!this.nodes || !this.context) return;

    const { pinkNoiseSource, pinkNoiseGain, masterGain } = this.nodes;
    const now = this.context.currentTime;

    if (enabled && !pinkNoiseSource) {
      const buffer = createPinkNoiseBuffer(this.context, 3);
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(PINK_NOISE_GAIN, now + 0.15);

      source.connect(gain);
      gain.connect(masterGain);
      source.start(now);

      this.nodes.pinkNoiseSource = source;
      this.nodes.pinkNoiseGain = gain;
    } else if (!enabled && pinkNoiseSource && pinkNoiseGain) {
      pinkNoiseGain.gain.cancelScheduledValues(now);
      pinkNoiseGain.gain.setValueAtTime(pinkNoiseGain.gain.value, now);
      pinkNoiseGain.gain.linearRampToValueAtTime(0, now + 0.15);
      try {
        pinkNoiseSource.stop(now + 0.2);
      } catch {
        // Already stopped
      }
      pinkNoiseSource.disconnect();
      this.nodes.pinkNoiseSource = null;
      this.nodes.pinkNoiseGain = null;
    }
  }

  /**
   * Whether pink noise is currently enabled.
   */
  isPinkNoiseEnabled(): boolean {
    return this.pinkNoiseEnabled;
  }

  /**
   * Set left channel frequency with smooth transition (prevents clicks).
   */
  setLeftFrequency(value: number): void {
    if (!this.nodes?.leftOsc || !this.context) return;

    const now = this.context.currentTime;
    this.nodes.leftOsc.frequency.cancelScheduledValues(now);
    this.nodes.leftOsc.frequency.setValueAtTime(
      this.nodes.leftOsc.frequency.value,
      now
    );
    this.nodes.leftOsc.frequency.linearRampToValueAtTime(value, now + 0.02);
  }

  /**
   * Set right channel frequency with smooth transition (prevents clicks).
   */
  setRightFrequency(value: number): void {
    if (!this.nodes?.rightOsc || !this.context) return;

    const now = this.context.currentTime;
    this.nodes.rightOsc.frequency.cancelScheduledValues(now);
    this.nodes.rightOsc.frequency.setValueAtTime(
      this.nodes.rightOsc.frequency.value,
      now
    );
    this.nodes.rightOsc.frequency.linearRampToValueAtTime(value, now + 0.02);
  }

  /**
   * Whether audio is currently playing.
   */
  isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Get the current AudioContext (may be null).
   */
  getContext(): AudioContext | null {
    return this.context;
  }

  /**
   * Set oscillator waveform type.
   */
  setOscillatorType(type: OscillatorType): void {
    this.oscillatorType = type;
    if (this.nodes) {
      this.nodes.leftOsc.type = type;
      this.nodes.rightOsc.type = type;
    }
  }

  /**
   * Set master volume (0–1). Stored and applied to MASTER_GAIN on start and when playing.
   */
  setMasterGain(value: number): void {
    this.volumeMultiplier = Math.max(0, Math.min(1, value));
    if (!this.nodes?.masterGain || !this.context) return;

    const now = this.context.currentTime;
    const target = MASTER_GAIN * this.volumeMultiplier;
    this.nodes.masterGain.gain.cancelScheduledValues(now);
    this.nodes.masterGain.gain.setValueAtTime(
      this.nodes.masterGain.gain.value,
      now
    );
    this.nodes.masterGain.gain.linearRampToValueAtTime(target, now + 0.02);
  }

  /**
   * Get current volume multiplier (0–1).
   */
  getMasterGain(): number {
    return this.volumeMultiplier;
  }
}

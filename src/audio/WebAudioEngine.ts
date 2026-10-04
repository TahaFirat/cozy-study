import { AmbientSoundChannel } from '../types';

export type BinauralMode = 'gamma_40hz' | 'beta_14hz' | 'alpha_10hz' | 'theta_6hz';

class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;
  private masterGain: GainNode | null = null;
  private ambientGains: Partial<Record<AmbientSoundChannel, GainNode>> = {};
  private runningChannels = new Set<AmbientSoundChannel>();
  private clockInterval: number | null = null;
  private keyboardTimeout: number | null = null;
  private cafeClinkTimeout: number | null = null;
  private insectsTimeout: number | null = null;
  private trainTimeout: number | null = null;
  private bookPagesTimeout: number | null = null;
  private windChimesTimeout: number | null = null;
  private typewriterTimeout: number | null = null;
  private binauralOscL: OscillatorNode | null = null;
  private binauralOscR: OscillatorNode | null = null;
  private currentBinauralMode: BinauralMode = 'gamma_40hz';

  // Authentic high-fidelity recorded nature loops (hardware decoded AudioBuffers, 0% CPU, true gapless looping)
  private masterVolume: number = 0.8;
  private isMuted: boolean = false;
  private soundFxEnabled: boolean = true;
  private naturalChannelVolumes: Partial<Record<AmbientSoundChannel, number>> = {};
  private naturalBuffers: Partial<Record<AmbientSoundChannel, AudioBuffer>> = {};
  private naturalSources: Partial<Record<AmbientSoundChannel, AudioBufferSourceNode>> = {};
  private naturalStopTimers: Partial<Record<AmbientSoundChannel, number>> = {};
  private loadingNaturalChannels = new Set<AmbientSoundChannel>();
  private thunderTimeouts: number[] = [];
  private activeThunderAudios: HTMLAudioElement[] = [];
  private readonly naturalAudioSources: Partial<Record<AmbientSoundChannel, string>> = {
    rain: '/sounds/rain.ogg',
    fireplace: '/sounds/fireplace.ogg',
    forest: '/sounds/forest.ogg',
    thunder: '/sounds/thunder.ogg',
    wind: '/sounds/wind.ogg',
  };

  public setSoundFxEnabled(enabled: boolean) {
    this.soundFxEnabled = enabled;
  }

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      const channels: AmbientSoundChannel[] = [
        'rain', 'fireplace', 'vinyl', 'keyboard', 'wind', 'thunder', 
        'cafe', 'forest', 'insects', 'clock', 'roomTone',
        'binaural', 'catPurr', 'train', 'bookPages',
        'whiteNoise', 'pinkNoise', 'brownNoise', 'windChimes', 'typewriter'
      ];

      channels.forEach((ch) => {
        if (!this.ctx || !this.masterGain) return;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.connect(this.masterGain);
        this.ambientGains[ch] = gain;
      });

      this.isInitialized = true;

      // Preload the most essential natural audio loops in the background
      this.loadNaturalBuffer('fireplace').catch(() => {});
      this.loadNaturalBuffer('rain').catch(() => {});
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
    }
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    const effectiveVol = this.isMuted ? 0 : this.masterVolume;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(effectiveVol, this.ctx.currentTime, 0.05);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.setMasterVolume(this.masterVolume);
  }

  private async loadNaturalBuffer(channel: AmbientSoundChannel): Promise<AudioBuffer | null> {
    if (this.naturalBuffers[channel]) return this.naturalBuffers[channel]!;
    const src = this.naturalAudioSources[channel];
    if (!src || !this.ctx) return null;
    if (this.loadingNaturalChannels.has(channel)) return null;

    this.loadingNaturalChannels.add(channel);
    try {
      const response = await fetch(src);
      const arrayBuffer = await response.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(arrayBuffer);

      // Apply crossfade smoothing at loop boundary (first and last 2048 samples)
      // to eliminate any click or waveform jump at the loop point
      for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
        const data = decoded.getChannelData(ch);
        const crossfadeLen = Math.min(2048, Math.floor(data.length / 10));
        for (let i = 0; i < crossfadeLen; i++) {
          const t = i / crossfadeLen;
          data[i] = data[i] * t + data[data.length - crossfadeLen + i] * (1 - t);
        }
      }

      this.naturalBuffers[channel] = decoded;
      return decoded;
    } catch (e) {
      console.warn(`Could not decode audio buffer for ${channel}:`, e);
      return null;
    } finally {
      this.loadingNaturalChannels.delete(channel);
    }
  }

  public ensureRunning() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setChannelVolume(channel: AmbientSoundChannel, volume: number) {
    // 1. Natural Recorded High-Fidelity Audio Streams (hardware decoded, 0% CPU, true gapless looping)
    const naturalSrc = this.naturalAudioSources[channel];
    if (naturalSrc) {
      this.naturalChannelVolumes[channel] = volume;
      if (volume > 0.005) {
        if (this.naturalStopTimers[channel]) {
          clearTimeout(this.naturalStopTimers[channel]);
          delete this.naturalStopTimers[channel];
        }

        if (!this.isInitialized) this.init();
        this.ensureRunning();

        const startPlaying = (buf: AudioBuffer) => {
          if (!this.ctx) return;
          // If source node is already active, just adjust gain
          let source = this.naturalSources[channel];
          if (!source) {
            source = this.ctx.createBufferSource();
            source.buffer = buf;
            source.loop = true;

            const channelGain = this.ambientGains[channel] || this.masterGain || this.ctx.destination;
            source.connect(channelGain);
            source.start(0);
            this.naturalSources[channel] = source;
          }
          const gainNode = this.ambientGains[channel];
          if (gainNode) {
            const target = Math.max(0, Math.min(1, volume));
            gainNode.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
          }
        };

        if (this.naturalBuffers[channel]) {
          startPlaying(this.naturalBuffers[channel]!);
        } else {
          this.loadNaturalBuffer(channel).then((buf) => {
            if (buf && (this.naturalChannelVolumes[channel] || 0) > 0.005) {
              startPlaying(buf);
            }
          });
        }
      } else {
        this.stopChannelImmediately(channel);
      }
      return;
    }

    if (!this.isInitialized) {
      if (volume > 0) this.init();
      else return;
    }
    if (volume > 0.01) {
      this.ensureRunning();
      this.ensureChannelActive(channel);
    } else {
      this.deactivateChannel(channel);
    }
    const gainNode = this.ambientGains[channel];
    if (!gainNode || !this.ctx) return;
    const target = Math.max(0, Math.min(1, volume));
    gainNode.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
  }

  public stopChannelImmediately(channel: AmbientSoundChannel) {
    if (this.naturalStopTimers[channel]) {
      clearTimeout(this.naturalStopTimers[channel]);
      delete this.naturalStopTimers[channel];
    }
    this.naturalChannelVolumes[channel] = 0;

    const source = this.naturalSources[channel];
    if (source) {
      try {
        source.stop();
        source.disconnect();
      } catch {}
      delete this.naturalSources[channel];
    }

    const gainNode = this.ambientGains[channel];
    if (gainNode && this.ctx) {
      try {
        gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
        gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch {}
    }

    this.deactivateChannel(channel);
  }

  public stopThunder() {
    for (const t of this.thunderTimeouts) {
      clearTimeout(t);
    }
    this.thunderTimeouts = [];
    for (const a of this.activeThunderAudios) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
    }
    this.activeThunderAudios = [];
  }

  public setAllChannelVolumes(volumes: Record<AmbientSoundChannel, number>) {
    Object.entries(volumes).forEach(([channel, vol]) => {
      this.setChannelVolume(channel as AmbientSoundChannel, vol);
    });
  }

  public setBinauralMode(mode: BinauralMode) {
    this.currentBinauralMode = mode;
    this.applyBinauralFrequencies(mode);
  }

  private applyBinauralFrequencies(mode: BinauralMode) {
    if (!this.ctx || !this.binauralOscL || !this.binauralOscR) return;
    const now = this.ctx.currentTime;
    let base = 200;
    let diff = 40; // Gamma (40Hz)
    switch (mode) {
      case 'theta_6hz':
        base = 140;
        diff = 6;
        break;
      case 'alpha_10hz':
        base = 180;
        diff = 10;
        break;
      case 'beta_14hz':
        base = 200;
        diff = 14;
        break;
      case 'gamma_40hz':
      default:
        base = 210;
        diff = 40;
        break;
    }
    this.binauralOscL.frequency.setTargetAtTime(base, now, 0.15);
    this.binauralOscR.frequency.setTargetAtTime(base + diff, now, 0.15);
  }

  // Helper: Create 5 seconds of looped white/pink noise buffer
  private createNoiseBuffer(type: 'white' | 'pink' | 'brown' = 'white', seconds = 4): AudioBuffer {
    if (!this.ctx) throw new Error('No audio context');
    const bufferSize = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'white') {
        data[i] = white;
      } else if (type === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else {
        // Brown noise
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
    }
    return buffer;
  }

  // Helper: Create seamless organic feline purr buffer
  // Models real feline bio-acoustics: 23.8Hz laryngeal glottal pulses + Hann windowing + chest tone + throat air
  private createCatPurrBuffer(seconds = 4.0): AudioBuffer {
    if (!this.ctx) throw new Error('No audio context');
    const sampleRate = this.ctx.sampleRate;
    const numSamples = Math.floor(sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    const pulseRate = 23.8; // Feline laryngeal twitch rate in Hz
    const pulsePeriod = sampleRate / pulseRate;
    const pulseWidth = Math.floor(sampleRate * 0.025); // 25ms Hann pulse window

    // Pre-generate brown noise for soft throat air turbulence
    const throatNoise = new Float32Array(numSamples);
    let lastNoise = 0.0;
    for (let i = 0; i < numSamples; i++) {
      const white = Math.random() * 2 - 1;
      lastNoise = (lastNoise + 0.03 * white) / 1.03;
      throatNoise[i] = lastNoise;
    }

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;

      // 4.0s Feline Respiratory Cycle (Inhale 1.7s, pause 0.2s, Exhale 1.9s, pause 0.2s)
      const cycleT = t % 4.0;
      let breathGain = 0.0;
      let chestFreq = 72.0;

      if (cycleT < 1.7) {
        // Inhalation: soft, rising breath swell
        const p = cycleT / 1.7;
        breathGain = 0.35 + 0.65 * Math.sin(p * Math.PI);
        chestFreq = 74.0 + 4.0 * Math.sin(p * Math.PI);
      } else if (cycleT < 1.9) {
        // Turnaround pause
        breathGain = 0.22;
        chestFreq = 70.0;
      } else if (cycleT < 3.8) {
        // Exhalation: warmer, deeper chest resonance
        const p = (cycleT - 1.9) / 1.9;
        breathGain = 0.45 + 0.55 * Math.sin(p * Math.PI);
        chestFreq = 68.0 + 3.0 * Math.sin(p * Math.PI);
      } else {
        // Turnaround pause
        breathGain = 0.20;
        chestFreq = 70.0;
      }

      // Glottal pulse calculation (periodic pulse with Hann window smoothing)
      const pulsePhase = i % pulsePeriod;
      let pulseEnv = 0.0;
      if (pulsePhase < pulseWidth) {
        pulseEnv = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * pulsePhase) / pulseWidth));
      }

      // Warm acoustic chest tone (fundamental sine + soft 2nd harmonic)
      const chestTone = Math.sin(2.0 * Math.PI * chestFreq * t) + 0.35 * Math.sin(2.0 * Math.PI * (chestFreq * 2.0) * t);

      // Soft throat friction air
      const frictionAir = throatNoise[i] * 1.8;

      // Composite organic acoustic feline purr sample
      const sample = (chestTone * 0.70 + frictionAir * 0.30) * pulseEnv * breathGain;
      data[i] = sample * 0.75;
    }

    return buffer;
  }

  private ensureChannelActive(channel: AmbientSoundChannel) {
    if (this.runningChannels.has(channel) || !this.ctx) return;
    this.runningChannels.add(channel);

    switch (channel) {
      case 'catPurr':
        try {
          if (this.ambientGains.catPurr) {
            const purrBuf = this.createCatPurrBuffer(4.0);
            const purrSource = this.ctx.createBufferSource();
            purrSource.buffer = purrBuf;
            purrSource.loop = true;

            const purrFilter = this.ctx.createBiquadFilter();
            purrFilter.type = 'lowpass';
            purrFilter.frequency.setValueAtTime(420, this.ctx.currentTime);
            purrFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);

            const purrGain = this.ctx.createGain();
            purrGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

            purrSource.connect(purrFilter);
            purrFilter.connect(purrGain);
            purrGain.connect(this.ambientGains.catPurr);
            purrSource.start();
          }
        } catch (e) {
          console.warn('Cat purr audio error', e);
        }
        break;

      case 'vinyl':
        try {
          if (this.ambientGains.vinyl) {
            const vinylBuf = this.createNoiseBuffer('pink');
            const vinylSource = this.ctx.createBufferSource();
            vinylSource.buffer = vinylBuf;
            vinylSource.loop = true;

            const vinylFilter = this.ctx.createBiquadFilter();
            vinylFilter.type = 'highpass';
            vinylFilter.frequency.setValueAtTime(2500, this.ctx.currentTime);

            const vinylGain = this.ctx.createGain();
            vinylGain.gain.setValueAtTime(0.24, this.ctx.currentTime);

            vinylSource.connect(vinylFilter);
            vinylFilter.connect(vinylGain);
            vinylGain.connect(this.ambientGains.vinyl);
            vinylSource.start();
          }
        } catch (e) {
          console.warn('Vinyl audio error', e);
        }
        break;

      case 'roomTone':
        try {
          if (this.ambientGains.roomTone) {
            const toneBuf = this.createNoiseBuffer('brown');
            const toneSource = this.ctx.createBufferSource();
            toneSource.buffer = toneBuf;
            toneSource.loop = true;

            const toneFilter = this.ctx.createBiquadFilter();
            toneFilter.type = 'lowpass';
            toneFilter.frequency.setValueAtTime(200, this.ctx.currentTime);

            toneSource.connect(toneFilter);
            toneFilter.connect(this.ambientGains.roomTone);
            toneSource.start();
          }
        } catch (e) {
          console.warn('Room tone error', e);
        }
        break;

      case 'binaural':
        try {
          if (this.ambientGains.binaural) {
            const merger = this.ctx.createChannelMerger(2);

            const oscL = this.ctx.createOscillator();
            oscL.type = 'sine';
            const gainL = this.ctx.createGain();
            gainL.gain.setValueAtTime(0.22, this.ctx.currentTime);
            oscL.connect(gainL);
            gainL.connect(merger, 0, 0);

            const oscR = this.ctx.createOscillator();
            oscR.type = 'sine';
            const gainR = this.ctx.createGain();
            gainR.gain.setValueAtTime(0.22, this.ctx.currentTime);
            oscR.connect(gainR);
            gainR.connect(merger, 0, 1);

            const warmFilter = this.ctx.createBiquadFilter();
            warmFilter.type = 'lowpass';
            warmFilter.frequency.setValueAtTime(380, this.ctx.currentTime);
            merger.connect(warmFilter);
            warmFilter.connect(this.ambientGains.binaural);

            this.binauralOscL = oscL;
            this.binauralOscR = oscR;

            this.applyBinauralFrequencies(this.currentBinauralMode);

            oscL.start();
            oscR.start();
          }
        } catch (e) {
          console.warn('Binaural beats error', e);
        }
        break;

      case 'whiteNoise':
        try {
          if (this.ambientGains.whiteNoise) {
            const whiteSource = this.ctx.createBufferSource();
            whiteSource.buffer = this.createNoiseBuffer('white', 3.0);
            whiteSource.loop = true;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(6500, this.ctx.currentTime);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.55, this.ctx.currentTime);
            whiteSource.connect(filter);
            filter.connect(gain);
            gain.connect(this.ambientGains.whiteNoise);
            whiteSource.start();
          }
        } catch (e) {
          console.warn('White noise error', e);
        }
        break;

      case 'pinkNoise':
        try {
          if (this.ambientGains.pinkNoise) {
            const pinkSource = this.ctx.createBufferSource();
            pinkSource.buffer = this.createNoiseBuffer('pink', 3.0);
            pinkSource.loop = true;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(4200, this.ctx.currentTime);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.60, this.ctx.currentTime);
            pinkSource.connect(filter);
            filter.connect(gain);
            gain.connect(this.ambientGains.pinkNoise);
            pinkSource.start();
          }
        } catch (e) {
          console.warn('Pink noise error', e);
        }
        break;

      case 'brownNoise':
        try {
          if (this.ambientGains.brownNoise) {
            const brownSource = this.ctx.createBufferSource();
            brownSource.buffer = this.createNoiseBuffer('brown', 3.0);
            brownSource.loop = true;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.70, this.ctx.currentTime);
            brownSource.connect(filter);
            filter.connect(gain);
            gain.connect(this.ambientGains.brownNoise);
            brownSource.start();
          }
        } catch (e) {
          console.warn('Brown noise error', e);
        }
        break;

      case 'clock':
        try {
          if (this.clockInterval) clearInterval(this.clockInterval);
          let isTick = true;
          this.clockInterval = window.setInterval(() => {
            if (!this.runningChannels.has('clock') || !this.ctx || !this.ambientGains.clock) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'triangle';
            const startFreq = isTick ? 760 : 520;
            isTick = !isTick;

            osc.frequency.setValueAtTime(startFreq, now);
            osc.frequency.exponentialRampToValueAtTime(90, now + 0.032);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1200, now);

            gain.gain.setValueAtTime(isTick ? 0.22 : 0.26, now);
            gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.030);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ambientGains.clock);

            osc.start(now);
            osc.stop(now + 0.035);
          }, 1000);
        } catch (e) {
          console.warn('Clock audio error', e);
        }
        break;

      case 'keyboard':
        try {
          const whiteNoiseBuf = this.createNoiseBuffer('white', 0.5);

          const playKeystroke = (t: number, isSpace = false) => {
            if (!this.runningChannels.has('keyboard') || !this.ctx || !this.ambientGains.keyboard) return;
            const clickSource = this.ctx.createBufferSource();
            clickSource.buffer = whiteNoiseBuf;
            const clickFilter = this.ctx.createBiquadFilter();
            clickFilter.type = 'bandpass';
            clickFilter.frequency.setValueAtTime(isSpace ? 2800 : (3400 + Math.random() * 900), t);
            clickFilter.Q.setValueAtTime(4.2, t);

            const clickGain = this.ctx.createGain();
            clickGain.gain.setValueAtTime(0.18 + Math.random() * 0.06, t);
            clickGain.gain.exponentialRampToValueAtTime(0.0005, t + 0.008);

            clickSource.connect(clickFilter);
            clickFilter.connect(clickGain);
            clickGain.connect(this.ambientGains.keyboard);
            clickSource.start(t);
            clickSource.stop(t + 0.012);

            const thockOsc = this.ctx.createOscillator();
            const thockFilter = this.ctx.createBiquadFilter();
            const thockGain = this.ctx.createGain();

            thockOsc.type = 'triangle';
            const startPitch = isSpace 
              ? (165 + Math.random() * 30) 
              : (280 + Math.random() * 80);
            thockOsc.frequency.setValueAtTime(startPitch, t);
            thockOsc.frequency.exponentialRampToValueAtTime(Math.max(40, startPitch * 0.38), t + 0.030);

            thockFilter.type = 'lowpass';
            thockFilter.frequency.setValueAtTime(isSpace ? 480 : 720, t);

            thockGain.gain.setValueAtTime((isSpace ? 0.48 : 0.38) + Math.random() * 0.10, t);
            thockGain.gain.exponentialRampToValueAtTime(0.001, t + (isSpace ? 0.040 : 0.028));

            thockOsc.connect(thockFilter);
            thockFilter.connect(thockGain);
            thockGain.connect(this.ambientGains.keyboard);
            thockOsc.start(t);
            thockOsc.stop(t + 0.045);
          };

          const scheduleTypingBurst = () => {
            if (!this.runningChannels.has('keyboard') || !this.ctx || !this.ambientGains.keyboard) return;
            const numKeys = 3 + Math.floor(Math.random() * 7);
            let t = this.ctx.currentTime + 0.05;

            for (let i = 0; i < numKeys; i++) {
              const isSpace = i === numKeys - 1 || Math.random() < 0.16;
              playKeystroke(t, isSpace);
              t += isSpace ? (0.16 + Math.random() * 0.12) : (0.085 + Math.random() * 0.065);
            }

            const nextBurst = 1000 + Math.random() * 2200;
            this.keyboardTimeout = window.setTimeout(scheduleTypingBurst, nextBurst);
          };
          scheduleTypingBurst();
        } catch (e) {
          console.warn('Keyboard audio error', e);
        }
        break;

      case 'cafe':
        try {
          const cafeBuf = this.createNoiseBuffer('pink');
          const cafeSource = this.ctx.createBufferSource();
          cafeSource.buffer = cafeBuf;
          cafeSource.loop = true;

          const formant1 = this.ctx.createBiquadFilter();
          formant1.type = 'bandpass';
          formant1.frequency.setValueAtTime(360, this.ctx.currentTime);
          formant1.Q.setValueAtTime(1.8, this.ctx.currentTime);

          const formant2 = this.ctx.createBiquadFilter();
          formant2.type = 'bandpass';
          formant2.frequency.setValueAtTime(880, this.ctx.currentTime);
          formant2.Q.setValueAtTime(2.2, this.ctx.currentTime);

          const cafeGain1 = this.ctx.createGain();
          cafeGain1.gain.setValueAtTime(0.40, this.ctx.currentTime);
          const cafeGain2 = this.ctx.createGain();
          cafeGain2.gain.setValueAtTime(0.30, this.ctx.currentTime);

          cafeSource.connect(formant1);
          cafeSource.connect(formant2);
          formant1.connect(cafeGain1);
          formant2.connect(cafeGain2);

          if (this.ambientGains.cafe) {
            cafeGain1.connect(this.ambientGains.cafe);
            cafeGain2.connect(this.ambientGains.cafe);
          }
          cafeSource.start();

          const scheduleCupClink = () => {
            if (!this.runningChannels.has('cafe') || !this.ctx || !this.ambientGains.cafe) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            const clinkFreq = 2100 + Math.random() * 600;
            osc.frequency.setValueAtTime(clinkFreq, now);
            gain.gain.setValueAtTime(0.12 + Math.random() * 0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

            osc.connect(gain);
            gain.connect(this.ambientGains.cafe);
            osc.start(now);
            osc.stop(now + 0.40);

            const next = 4500 + Math.random() * 8000;
            this.cafeClinkTimeout = window.setTimeout(scheduleCupClink, next);
          };
          scheduleCupClink();
        } catch (e) {
          console.warn('Cafe audio error', e);
        }
        break;

      case 'insects':
        try {
          const cricketTrigger = () => {
            if (!this.runningChannels.has('insects') || !this.ctx || !this.ambientGains.insects) return;
            const now = this.ctx.currentTime;
            
            for (let i = 0; i < 4; i++) {
              const chirpTime = now + i * 0.055;
              const osc1 = this.ctx.createOscillator();
              const oscGain = this.ctx.createGain();

              osc1.type = 'sine';
              osc1.frequency.setValueAtTime(4400 + Math.random() * 150, chirpTime);

              oscGain.gain.setValueAtTime(0, chirpTime);
              oscGain.gain.linearRampToValueAtTime(0.14, chirpTime + 0.015);
              oscGain.gain.linearRampToValueAtTime(0, chirpTime + 0.045);

              osc1.connect(oscGain);
              oscGain.connect(this.ambientGains.insects);

              osc1.start(chirpTime);
              osc1.stop(chirpTime + 0.05);
            }

            const next = 650 + Math.random() * 950;
            this.insectsTimeout = window.setTimeout(cricketTrigger, next);
          };
          cricketTrigger();
        } catch (e) {
          console.warn('Insects audio error', e);
        }
        break;

      case 'train':
        try {
          if (this.ambientGains.train) {
            const trainRumbleBuf = this.createNoiseBuffer('brown');
            const trainSource = this.ctx.createBufferSource();
            trainSource.buffer = trainRumbleBuf;
            trainSource.loop = true;

            const trainFilter = this.ctx.createBiquadFilter();
            trainFilter.type = 'lowpass';
            trainFilter.frequency.setValueAtTime(120, this.ctx.currentTime);

            const trainGain = this.ctx.createGain();
            trainGain.gain.setValueAtTime(0.55, this.ctx.currentTime);

            trainSource.connect(trainFilter);
            trainFilter.connect(trainGain);
            trainGain.connect(this.ambientGains.train);
            trainSource.start();

            const scheduleTrainClick = () => {
              if (!this.runningChannels.has('train') || !this.ctx || !this.ambientGains.train) return;
              const now = this.ctx.currentTime;

              for (let i = 0; i < 2; i++) {
                const clickTime = now + i * 0.09;
                const clickOsc = this.ctx.createOscillator();
                const clickFilter = this.ctx.createBiquadFilter();
                const clickGain = this.ctx.createGain();

                clickOsc.type = 'triangle';
                clickOsc.frequency.setValueAtTime(320 + Math.random() * 60, clickTime);
                clickOsc.frequency.exponentialRampToValueAtTime(70, clickTime + 0.04);

                clickFilter.type = 'lowpass';
                clickFilter.frequency.setValueAtTime(600, clickTime);

                clickGain.gain.setValueAtTime(0.24, clickTime);
                clickGain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.038);

                clickOsc.connect(clickFilter);
                clickFilter.connect(clickGain);
                clickGain.connect(this.ambientGains.train);
                clickOsc.start(clickTime);
                clickOsc.stop(clickTime + 0.045);
              }

              this.trainTimeout = window.setTimeout(scheduleTrainClick, 820 + Math.random() * 60);
            };
            scheduleTrainClick();
          }
        } catch (e) {
          console.warn('Train audio error', e);
        }
        break;

      case 'bookPages':
        try {
          const schedulePageTurn = () => {
            if (!this.runningChannels.has('bookPages') || !this.ctx || !this.ambientGains.bookPages) return;
            const now = this.ctx.currentTime;
            const noiseBuf = this.createNoiseBuffer('white', 0.6);
            const noiseSource = this.ctx.createBufferSource();
            noiseSource.buffer = noiseBuf;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1300, now);
            filter.frequency.linearRampToValueAtTime(2400, now + 0.25);
            filter.frequency.linearRampToValueAtTime(900, now + 0.5);
            filter.Q.setValueAtTime(2.5, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.35, now + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

            noiseSource.connect(filter);
            filter.connect(gain);
            gain.connect(this.ambientGains.bookPages);

            noiseSource.start(now);
            noiseSource.stop(now + 0.6);

            const next = 7000 + Math.random() * 9000;
            this.bookPagesTimeout = window.setTimeout(schedulePageTurn, next);
          };
          schedulePageTurn();
        } catch (e) {
          console.warn('Book pages audio error', e);
        }
        break;

      case 'windChimes':
        try {
          const scheduleChimes = () => {
            if (!this.runningChannels.has('windChimes') || !this.ctx || !this.ambientGains.windChimes) return;
            const now = this.ctx.currentTime;
            const freqs = [1046.5, 1174.7, 1318.5, 1568.0, 1760.0, 2093.0];
            const count = 2 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
              const t = now + i * (0.08 + Math.random() * 0.15);
              const osc = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freqs[Math.floor(Math.random() * freqs.length)], t);
              gain.gain.setValueAtTime(0.16, t);
              gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);
              osc.connect(gain);
              gain.connect(this.ambientGains.windChimes);
              osc.start(t);
              osc.stop(t + 2.1);
            }
            this.windChimesTimeout = window.setTimeout(scheduleChimes, 5500 + Math.random() * 8500);
          };
          scheduleChimes();
        } catch (e) {
          console.warn('Wind chimes error', e);
        }
        break;

      case 'typewriter':
        try {
          const scheduleTypewriter = () => {
            if (!this.runningChannels.has('typewriter') || !this.ctx || !this.ambientGains.typewriter) return;
            const strikes = 3 + Math.floor(Math.random() * 7);
            let t = this.ctx.currentTime;
            for (let i = 0; i < strikes; i++) {
              const osc = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(650 + Math.random() * 450, t);
              osc.frequency.exponentialRampToValueAtTime(100, t + 0.035);
              gain.gain.setValueAtTime(0.28, t);
              gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
              osc.connect(gain);
              gain.connect(this.ambientGains.typewriter);
              osc.start(t);
              osc.stop(t + 0.04);
              t += 0.11 + Math.random() * 0.16;
            }
            this.typewriterTimeout = window.setTimeout(scheduleTypewriter, 3000 + Math.random() * 5000);
          };
          scheduleTypewriter();
        } catch (e) {
          console.warn('Typewriter error', e);
        }
        break;

      default:
        break;
    }
  }

  private deactivateChannel(channel: AmbientSoundChannel) {
    this.runningChannels.delete(channel);
    if (channel === 'clock' && this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    } else if (channel === 'keyboard' && this.keyboardTimeout) {
      clearTimeout(this.keyboardTimeout);
      this.keyboardTimeout = null;
    } else if (channel === 'cafe' && this.cafeClinkTimeout) {
      clearTimeout(this.cafeClinkTimeout);
      this.cafeClinkTimeout = null;
    } else if (channel === 'insects' && this.insectsTimeout) {
      clearTimeout(this.insectsTimeout);
      this.insectsTimeout = null;
    } else if (channel === 'train' && this.trainTimeout) {
      clearTimeout(this.trainTimeout);
      this.trainTimeout = null;
    } else if (channel === 'bookPages' && this.bookPagesTimeout) {
      clearTimeout(this.bookPagesTimeout);
      this.bookPagesTimeout = null;
    } else if (channel === 'windChimes' && this.windChimesTimeout) {
      clearTimeout(this.windChimesTimeout);
      this.windChimesTimeout = null;
    } else if (channel === 'typewriter' && this.typewriterTimeout) {
      clearTimeout(this.typewriterTimeout);
      this.typewriterTimeout = null;
    }
  }

  // --- CUSTOMIZABLE SESSION END CHIMES ---
  public playChime(chimeType: 'singing_bowl' | 'wood_block' | 'retro_bell' | 'digital' | 'zen_gong' = 'singing_bowl') {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (chimeType === 'singing_bowl') {
      // Harmonic singing bowl
      const freqs = [432, 864, 1296];
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.2 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 4.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 4.6);
      });
    } else if (chimeType === 'wood_block') {
      // Japanese temple wood block knock
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (chimeType === 'retro_bell') {
      // 8-bit game level clear arpeggio (C5 - E5 - G5 - C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        if (!this.ctx) return;
        const noteTime = now + i * 0.12;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, noteTime);
        gain.gain.setValueAtTime(0.12, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(noteTime);
        osc.stop(noteTime + 0.36);
      });
    } else if (chimeType === 'digital') {
      // Clean 2-tone chime
      [880, 1174].forEach((freq, i) => {
        if (!this.ctx) return;
        const noteTime = now + i * 0.15;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);
        gain.gain.setValueAtTime(0.2, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 1.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(noteTime);
        osc.stop(noteTime + 1.25);
      });
    } else {
      // Zen Gong: Deep resonant metallic strike
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 5.0);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 5.0);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 5.1);
    }
  }

  // --- COZY SOUND EFFECTS ---
  public playLampSwitch() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  public playCoffeeSip() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Gentle porcelain clink
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playFireplaceStoke() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // 1. Warm air draught whoosh
    const whooshBuf = this.createNoiseBuffer('brown', 0.6);
    const whooshSource = this.ctx.createBufferSource();
    whooshSource.buffer = whooshBuf;
    const whooshFilter = this.ctx.createBiquadFilter();
    whooshFilter.type = 'lowpass';
    whooshFilter.frequency.setValueAtTime(220, now);
    whooshFilter.frequency.linearRampToValueAtTime(750, now + 0.18);
    whooshFilter.frequency.exponentialRampToValueAtTime(280, now + 0.55);

    const whooshGain = this.ctx.createGain();
    whooshGain.gain.setValueAtTime(0.01, now);
    whooshGain.gain.linearRampToValueAtTime(0.35, now + 0.18);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    whooshSource.connect(whooshFilter);
    whooshFilter.connect(whooshGain);
    whooshGain.connect(this.ctx.destination);
    whooshSource.start(now);
    whooshSource.stop(now + 0.56);

    // 2. Cascade of rapid wood crackle snaps ("çıt-çıt-çıt-pıt!")
    const whiteBuf = this.createNoiseBuffer('white', 0.6);
    const snapTimes = [0.06, 0.12, 0.17, 0.23, 0.29, 0.38, 0.44];
    snapTimes.forEach((delay, idx) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const snap = this.ctx.createBufferSource();
        snap.buffer = whiteBuf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800 + Math.random() * 1800, t);
        filter.Q.setValueAtTime(3.8, t);

        const gain = this.ctx.createGain();
        const vol = 0.28 - idx * 0.02 + Math.random() * 0.1;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.018);

        snap.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        snap.start(t);
        snap.stop(t + 0.025);
      }, delay * 1000);
    });
  }

  public playThunderClap() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const brownNoiseBuf = this.createNoiseBuffer('brown', 3.0);
    const pinkNoiseBuf = this.createNoiseBuffer('pink', 1.5);

    // Initial Crack
    const crackSource = this.ctx.createBufferSource();
    crackSource.buffer = pinkNoiseBuf;
    const crackFilter = this.ctx.createBiquadFilter();
    crackFilter.type = 'bandpass';
    crackFilter.frequency.setValueAtTime(450, now);
    crackFilter.Q.setValueAtTime(1.8, now);

    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(0.001, now);
    crackGain.gain.linearRampToValueAtTime(0.22, now + 0.1);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    crackSource.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(this.masterGain || this.ctx.destination);
    crackSource.start(now);
    crackSource.stop(now + 1.5);

    // Deep lowpass rumble
    const rumbleSource = this.ctx.createBufferSource();
    rumbleSource.buffer = brownNoiseBuf;
    const rumbleFilter = this.ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.setValueAtTime(120, now);
    rumbleFilter.Q.setValueAtTime(2.0, now);
    rumbleFilter.frequency.exponentialRampToValueAtTime(50, now + 4.0);

    const rumbleGain = this.ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.001, now);
    rumbleGain.gain.linearRampToValueAtTime(0.45, now + 0.35);
    rumbleGain.gain.linearRampToValueAtTime(0.30, now + 1.4);
    rumbleGain.gain.linearRampToValueAtTime(0.35, now + 2.0);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 4.2);

    rumbleSource.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.masterGain || this.ctx.destination);
    rumbleSource.start(now);
    rumbleSource.stop(now + 4.4);
  }

  public playCatPurr() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      const purrBuf = this.createCatPurrBuffer(2.4);
      const source = this.ctx.createBufferSource();
      source.buffer = purrBuf;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.70, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.3);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      source.start(now);
      source.stop(now + 2.35);
    } catch (e) {
      console.warn('playCatPurr error', e);
    }
  }

  public playCatMeow() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.5, now);

    // Formant sweep: "Mee-Aaa-Ooww"
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.52);

    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(1450, now + 0.18);
    filter.frequency.linearRampToValueAtTime(620, now + 0.52);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.56);
  }

  public playCatChirp() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(4.0, now);

    // Fast chirping trill "mrrp!": 520Hz -> 760Hz
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.18);

    filter.frequency.setValueAtTime(950, now);
    filter.frequency.linearRampToValueAtTime(1600, now + 0.09);
    filter.frequency.linearRampToValueAtTime(1100, now + 0.18);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.20, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playPawStep() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Soft velvet footstep: very low-frequency muted thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.04);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playGlassWipe() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Soft high-frequency friction squeak
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    const startFreq = 1200 + Math.random() * 400;
    const endFreq = startFreq + (Math.random() - 0.5) * 500;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.linearRampToValueAtTime(endFreq, now + 0.07);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(3.5, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.022, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.07);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playBossHit() {
    if (!this.soundFxEnabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Mature, deep acoustic impact thump (warm sub-frequency resonance)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.09);

    oscGain.gain.setValueAtTime(0.08, now);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain || this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);

    // Warm, low-passed subtle tactile desk/punch texture
    try {
      const noiseBuf = this.createNoiseBuffer('brown', 0.1);
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuf;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(160, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.04, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain || this.ctx.destination);
      noiseSource.start(now);
      noiseSource.stop(now + 0.08);
    } catch {}
  }

  public playBossCrit() {
    if (!this.soundFxEnabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Dual power chime explosion
    [440, 880, 1320].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.03);
      gain.gain.setValueAtTime(0.15, now + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);
      osc.start(now + i * 0.03);
      osc.stop(now + 0.5);
    });
  }

  public playBossVictory() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Majestic major fanfare: C5 -> E5 -> G5 -> C6
    const fanfare = [523.25, 659.25, 783.99, 1046.50];
    fanfare.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.14;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);
      osc.start(t);
      osc.stop(t + 1.25);
    });
  }

  public playVictory() {
    this.playBossVictory();
  }

  public playZenChime(type: 'start' | 'finish' = 'start') {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const chords = type === 'start' 
      ? [523.25, 659.25] // C5, E5
      : [440.0, 554.37, 659.25, 880.0]; // A4, C#5, E5, A5 peaceful resolution

    chords.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.15;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 3.0);
    });
  }

  public playChatPing() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [659.25, 880.0].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.08;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  }

  public playCoffeeCheers() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [1046.5, 1318.51, 1567.98].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.06;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.09, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  }

  // Realistic Atmospheric Procedural Thunder Synthesis (Speed-of-Sound Delay, Cascaded 24dB/oct Low-Pass Filters & Multi-Peak Horizon Swells)
  public playThunderStrike(intensity = 0.8, distance: 'near' | 'medium' | 'distant' = 'medium') {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const clamped = Math.max(0.2, Math.min(1.0, intensity));
    const now = this.ctx.currentTime;

    // Physical speed-of-sound distance profiling:
    // Near: crisp electrostatic presence, immediate sub punch (~200ms)
    // Medium: cozy muffled low rumble with 450-800ms natural distance delay
    // Distant: pure velvety deep sub-rumble rolling across distant hills (1.2-2.0s delay)
    let delaySec = 0.40;
    let initialFilterCutoff = 210;
    let rumbleDuration = 4.8;
    let hasCrack = false;

    if (distance === 'near') {
      delaySec = 0.15 + Math.random() * 0.15;
      initialFilterCutoff = 310;
      hasCrack = true;
      rumbleDuration = 3.8;
    } else if (distance === 'medium') {
      delaySec = 0.40 + Math.random() * 0.35;
      initialFilterCutoff = 210;
      hasCrack = false;
      rumbleDuration = 5.0;
    } else {
      delaySec = 1.10 + Math.random() * 0.70;
      initialFilterCutoff = 130;
      hasCrack = false;
      rumbleDuration = 6.0;
    }

    // Play authentic acoustic thunder recording along with sub-bass roll
    try {
      const thunderAudio = new Audio('/sounds/thunder.ogg');
      thunderAudio.volume = Math.max(0.1, Math.min(1.0, clamped * 0.85));
      this.activeThunderAudios.push(thunderAudio);
      const onDone = () => {
        const idx = this.activeThunderAudios.indexOf(thunderAudio);
        if (idx !== -1) this.activeThunderAudios.splice(idx, 1);
      };
      thunderAudio.addEventListener('ended', onDone);
      thunderAudio.addEventListener('error', onDone);

      const tId = window.setTimeout(() => {
        thunderAudio.play().catch(() => {});
      }, delaySec * 1000);
      this.thunderTimeouts.push(tId);
    } catch {}

    const startTime = now + delaySec;

    // 1. Spatial Stereo Panning (Drifting gently across the sky as the sound rolls)
    let pannerNode: StereoPannerNode | GainNode;
    try {
      if (typeof this.ctx.createStereoPanner === 'function') {
        const panner = this.ctx.createStereoPanner();
        const startPan = (Math.random() - 0.5) * 0.75;
        panner.pan.setValueAtTime(startPan, startTime);
        panner.pan.linearRampToValueAtTime(
          Math.max(-1, Math.min(1, startPan + (startPan > 0 ? -0.45 : 0.45))),
          startTime + rumbleDuration
        );
        pannerNode = panner;
      } else {
        pannerNode = this.ctx.createGain();
      }
    } catch {
      pannerNode = this.ctx.createGain();
    }
    pannerNode.connect(this.masterGain || this.ctx.destination);

    // 2. Electrostatic Whip Crack (Muffled & softened for cozy ambience, only on near strikes)
    if (hasCrack) {
      try {
        const crackBuf = this.createNoiseBuffer('white', 0.5);
        const crackSource = this.ctx.createBufferSource();
        crackSource.buffer = crackBuf;

        const crackFilter = this.ctx.createBiquadFilter();
        crackFilter.type = 'bandpass';
        crackFilter.frequency.setValueAtTime(850, startTime);
        crackFilter.Q.setValueAtTime(1.6, startTime);

        const crackGain = this.ctx.createGain();
        crackGain.gain.setValueAtTime(0.0001, startTime);
        crackGain.gain.linearRampToValueAtTime(0.16 * clamped, startTime + 0.015);
        crackGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.16);

        crackSource.connect(crackFilter);
        crackFilter.connect(crackGain);
        crackGain.connect(pannerNode);

        crackSource.start(startTime);
        crackSource.stop(startTime + 0.18);
      } catch (e) {
        console.warn('Thunder crack error', e);
      }
    }

    // 3. Heavy Sub-Bass Acoustic Punch (Triangle pitch glide: 56Hz -> 24Hz)
    try {
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();

      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(distance === 'near' ? 66 : 54, startTime);
      subOsc.frequency.exponentialRampToValueAtTime(24, startTime + 1.2);

      subGain.gain.setValueAtTime(0.0001, startTime);
      subGain.gain.linearRampToValueAtTime(0.30 * clamped, startTime + 0.05);
      subGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.6);

      subOsc.connect(subGain);
      subGain.connect(pannerNode);
      subOsc.start(startTime);
      subOsc.stop(startTime + 1.7);
    } catch (e) {
      console.warn('Thunder sub-bass error', e);
    }

    // 4. Cascaded 24dB/oct Low-Pass Filtered Rolling Rumble
    // Two cascaded Butterworth lowpass filters strip all harshness, leaving warm, velvety thunder
    try {
      const rumbleBuf = this.createNoiseBuffer('brown', 6);
      const rumbleSource = this.ctx.createBufferSource();
      rumbleSource.buffer = rumbleBuf;
      rumbleSource.loop = true;

      const filter1 = this.ctx.createBiquadFilter();
      filter1.type = 'lowpass';
      filter1.frequency.setValueAtTime(initialFilterCutoff, startTime);
      filter1.frequency.exponentialRampToValueAtTime(36, startTime + rumbleDuration);

      const filter2 = this.ctx.createBiquadFilter();
      filter2.type = 'lowpass';
      filter2.frequency.setValueAtTime(initialFilterCutoff, startTime);
      filter2.frequency.exponentialRampToValueAtTime(36, startTime + rumbleDuration);

      // Multi-crest turbulent amplitude envelope (cloud-to-ground & terrain acoustic reflections)
      const rumbleGain = this.ctx.createGain();
      const g = clamped * 0.38;

      rumbleGain.gain.setValueAtTime(0.0001, startTime);
      // Crest 1: Initial shock front arrival
      rumbleGain.gain.linearRampToValueAtTime(g * 1.0, startTime + 0.28);
      rumbleGain.gain.exponentialRampToValueAtTime(g * 0.44, startTime + 0.72);
      // Crest 2: Cloud layer reverberation swell
      rumbleGain.gain.linearRampToValueAtTime(g * 0.70, startTime + 1.20);
      rumbleGain.gain.exponentialRampToValueAtTime(g * 0.28, startTime + 2.05);
      // Crest 3: Distant valley roll
      rumbleGain.gain.linearRampToValueAtTime(g * 0.42, startTime + 2.75);
      rumbleGain.gain.exponentialRampToValueAtTime(0.0001, startTime + rumbleDuration);

      rumbleSource.connect(filter1);
      filter1.connect(filter2);
      filter2.connect(rumbleGain);
      rumbleGain.connect(pannerNode);

      rumbleSource.start(startTime);
      rumbleSource.stop(startTime + rumbleDuration + 0.1);

      // Secondary Rolling Thunder Echo (35% chance of realistic double thunderclap rolling across horizon)
      if (Math.random() < 0.35 && distance !== 'distant') {
        const echoDelay = 1200 + Math.random() * 1100;
        const echoId = window.setTimeout(() => {
          this.playThunderStrike(clamped * 0.65, 'distant');
        }, echoDelay);
        this.thunderTimeouts.push(echoId);
      }
    } catch (e) {
      console.warn('Thunder rumble error', e);
    }
  }

  // --- GENERATIVE LO-FI BACKUP SYNTHESIZER ---
  private isLofiPlaying = false;
  private lofiChordIndex = 0;
  private lofiInterval: number | null = null;
  private lofiGain: GainNode | null = null;

  public startGenerativeLofi(_volume = 0.5) {
    // Disabled to prevent repetitive synthetic beeps
    this.stopGenerativeLofi();
  }

  public stopGenerativeLofi() {
    this.isLofiPlaying = false;
    if (this.lofiInterval) {
      clearInterval(this.lofiInterval);
      this.lofiInterval = null;
    }
    if (this.lofiGain && this.ctx) {
      this.lofiGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  public setGenerativeLofiVolume(_volume: number) {
    // No-op
  }
}

export const webAudioEngine = new WebAudioEngine();

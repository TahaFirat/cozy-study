import { AmbientSoundChannel } from '../types';

export type BinauralMode = 'gamma_40hz' | 'beta_14hz' | 'alpha_10hz' | 'theta_6hz';

class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;
  private masterGain: GainNode | null = null;
  private ambientGains: Partial<Record<AmbientSoundChannel, GainNode>> = {};
  private activeGenerators: Partial<Record<AmbientSoundChannel, () => void>> = {};
  private clockInterval: number | null = null;
  private keyboardInterval: number | null = null;
  private thunderInterval: number | null = null;
  private generativeLofiInterval: number | null = null;
  private windGustTimeout: number | null = null;
  private binauralOscL: OscillatorNode | null = null;
  private binauralOscR: OscillatorNode | null = null;
  private currentBinauralMode: BinauralMode = 'gamma_40hz';

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
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
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
      this.startContinuousGenerators();
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
    }
  }

  public setMasterVolume(vol: number) {
    if (!this.ctx || !this.masterGain) return;
    const clamped = Math.max(0, Math.min(1, vol));
    this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  public ensureRunning() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setChannelVolume(channel: AmbientSoundChannel, volume: number) {
    if (!this.isInitialized) {
      if (volume > 0) this.init();
      else return;
    }
    if (volume > 0) {
      this.ensureRunning();
    }
    const gainNode = this.ambientGains[channel];
    if (!gainNode || !this.ctx) return;
    const target = Math.max(0, Math.min(1, volume));
    gainNode.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
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

  private startContinuousGenerators() {
    if (!this.ctx) return;

    // 1. RAIN GENERATOR: Filtered noise + raindrop patters
    try {
      const rainBuf = this.createNoiseBuffer('pink');
      const rainSource = this.ctx.createBufferSource();
      rainSource.buffer = rainBuf;
      rainSource.loop = true;

      const rainFilter = this.ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);

      const rainHighpass = this.ctx.createBiquadFilter();
      rainHighpass.type = 'highpass';
      rainHighpass.frequency.setValueAtTime(300, this.ctx.currentTime);

      rainSource.connect(rainFilter);
      rainFilter.connect(rainHighpass);
      if (this.ambientGains.rain) rainHighpass.connect(this.ambientGains.rain);
      rainSource.start();
    } catch (e) {
      console.warn('Rain audio error', e);
    }

    // 2. FIREPLACE GENERATOR: Hearth roar + coal simmer + physical wood crackles ("çıt çıt, pıt, çatırtı")
    try {
      // A. Deep warm fireplace body (Brown noise roar)
      const fireBuf = this.createNoiseBuffer('brown');
      const fireSource = this.ctx.createBufferSource();
      fireSource.buffer = fireBuf;
      fireSource.loop = true;

      const fireFilter = this.ctx.createBiquadFilter();
      fireFilter.type = 'lowpass';
      fireFilter.frequency.setValueAtTime(360, this.ctx.currentTime);

      const fireGain = this.ctx.createGain();
      fireGain.gain.setValueAtTime(0.65, this.ctx.currentTime);

      fireSource.connect(fireFilter);
      fireFilter.connect(fireGain);
      if (this.ambientGains.fireplace) fireGain.connect(this.ambientGains.fireplace);
      fireSource.start();

      // B. Continuous glowing embers sizzle / hiss (Filtered pink noise with gentle modulation)
      const sizzleBuf = this.createNoiseBuffer('pink');
      const sizzleSource = this.ctx.createBufferSource();
      sizzleSource.buffer = sizzleBuf;
      sizzleSource.loop = true;

      const sizzleFilter = this.ctx.createBiquadFilter();
      sizzleFilter.type = 'bandpass';
      sizzleFilter.frequency.setValueAtTime(2600, this.ctx.currentTime);
      sizzleFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

      const sizzleGain = this.ctx.createGain();
      sizzleGain.gain.setValueAtTime(0.20, this.ctx.currentTime);

      sizzleSource.connect(sizzleFilter);
      sizzleFilter.connect(sizzleGain);
      if (this.ambientGains.fireplace) sizzleGain.connect(this.ambientGains.fireplace);
      sizzleSource.start();

      // C. Authentic wood crackle & snap generator ("Çıt Çıt, Pıt, Çatırtı")
      const whiteNoiseBuf = this.createNoiseBuffer('white', 1.0);

      const playWoodPop = (volumeScale = 1.0, isSharpSnap = true) => {
        if (!this.ctx || !this.ambientGains.fireplace) return;
        const now = this.ctx.currentTime;

        // 1. High-frequency sap snap click ("ÇIT!")
        const snapSource = this.ctx.createBufferSource();
        snapSource.buffer = whiteNoiseBuf;

        const snapFilter = this.ctx.createBiquadFilter();
        snapFilter.type = 'bandpass';
        snapFilter.frequency.setValueAtTime(1800 + Math.random() * 2200, now);
        snapFilter.Q.setValueAtTime(isSharpSnap ? 4.5 : 2.8, now);

        const snapGain = this.ctx.createGain();
        const peakVol = (isSharpSnap ? 0.30 + Math.random() * 0.35 : 0.15 + Math.random() * 0.22) * volumeScale;
        snapGain.gain.setValueAtTime(peakVol, now);
        // Instant micro-decay for that crisp, real wood "çıt" transient
        const decayDuration = isSharpSnap ? (0.008 + Math.random() * 0.016) : (0.018 + Math.random() * 0.030);
        snapGain.gain.exponentialRampToValueAtTime(0.0001, now + decayDuration);

        snapSource.connect(snapFilter);
        snapFilter.connect(snapGain);
        snapGain.connect(this.ambientGains.fireplace);
        snapSource.start(now);
        snapSource.stop(now + decayDuration + 0.01);

        // 2. Wood hollow resonance pop ("PIT") for bigger pops (65% of the time)
        if (Math.random() < 0.65) {
          const osc = this.ctx.createOscillator();
          const oscGain = this.ctx.createGain();

          osc.type = Math.random() > 0.5 ? 'triangle' : 'sine';
          const startPitch = 360 + Math.random() * 480;
          osc.frequency.setValueAtTime(startPitch, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.04);

          const oscVol = (0.10 + Math.random() * 0.16) * volumeScale;
          oscGain.gain.setValueAtTime(oscVol, now);
          oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

          osc.connect(oscGain);
          oscGain.connect(this.ambientGains.fireplace);
          osc.start(now);
          osc.stop(now + 0.042);
        }

        // 3. Occasional deep log settle thump ("TOK")
        if (Math.random() < 0.22) {
          const thumpOsc = this.ctx.createOscillator();
          const thumpGain = this.ctx.createGain();
          thumpOsc.type = 'sine';
          thumpOsc.frequency.setValueAtTime(105 + Math.random() * 35, now);
          thumpOsc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

          thumpGain.gain.setValueAtTime(0.18 * volumeScale, now);
          thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

          thumpOsc.connect(thumpGain);
          thumpGain.connect(this.ambientGains.fireplace);
          thumpOsc.start(now);
          thumpOsc.stop(now + 0.085);
        }
      };

      // Crackle loop with natural clustering (wood pops in bursts!)
      const triggerFireCrackle = () => {
        if (!this.ctx || !this.ambientGains.fireplace) return;

        // Play a primary pop
        playWoodPop(1.0, Math.random() > 0.25);

        // 50% chance to trigger an immediate micro-crackle companion 30-90ms later ("çıt-çıt!")
        if (Math.random() < 0.50) {
          setTimeout(() => {
            playWoodPop(0.75, true);
          }, 30 + Math.random() * 65);
        }

        // 25% chance of a 3rd trailing ember pop ("çıt-çıt-pıt")
        if (Math.random() < 0.25) {
          setTimeout(() => {
            playWoodPop(0.55, true);
          }, 100 + Math.random() * 95);
        }

        // Natural pause before next crackle event (between 100ms and 500ms)
        const nextDelay = 100 + Math.random() * 400;
        setTimeout(triggerFireCrackle, nextDelay);
      };
      triggerFireCrackle();
    } catch (e) {
      console.warn('Fireplace audio error', e);
    }

    // 3. VINYL CRACKLE: Highpass noise clicks
    try {
      const vinylBuf = this.createNoiseBuffer('pink');
      const vinylSource = this.ctx.createBufferSource();
      vinylSource.buffer = vinylBuf;
      vinylSource.loop = true;

      const vinylFilter = this.ctx.createBiquadFilter();
      vinylFilter.type = 'highpass';
      vinylFilter.frequency.setValueAtTime(2500, this.ctx.currentTime);

      const vinylGain = this.ctx.createGain();
      vinylGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

      vinylSource.connect(vinylFilter);
      vinylFilter.connect(vinylGain);
      if (this.ambientGains.vinyl) vinylGain.connect(this.ambientGains.vinyl);
      vinylSource.start();
    } catch (e) {
      console.warn('Vinyl audio error', e);
    }

    // 4. PROCEDURAL STOCHASTIC WIND GENERATOR
    // Authentic organic dual-layer acoustic wind simulation:
    // - Layer 1 (Breeze Floor): Constant gentle pink noise filtered through gentle lowpass (220Hz)
    // - Layer 2 (Stochastic Gusts): Bandpass noise triggered with Poisson/Brownian random intervals (3.5s - 12s),
    //   variable intensity (whisper -> mountain gale), organic attack/sustain/decay curves, and swept resonant whistle frequencies.
    // ZERO periodic LFO loops! Completely non-repeating and naturalistic.
    try {
      const windBuf = this.createNoiseBuffer('pink');

      // Layer 1: Ambient Breeze Floor (soft, soothing baseline)
      const baseSource = this.ctx.createBufferSource();
      baseSource.buffer = windBuf;
      baseSource.loop = true;
      const baseFilter = this.ctx.createBiquadFilter();
      baseFilter.type = 'lowpass';
      baseFilter.frequency.setValueAtTime(220, this.ctx.currentTime);
      baseFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);
      const baseGain = this.ctx.createGain();
      baseGain.gain.setValueAtTime(0.28, this.ctx.currentTime);
      baseSource.connect(baseFilter);
      baseFilter.connect(baseGain);

      // Layer 2: Dynamic Stochastic Wind Gusts (warm pink air, zero repetitive whistle)
      const gustSource = this.ctx.createBufferSource();
      gustSource.buffer = windBuf;
      gustSource.loop = true;
      const gustFilter = this.ctx.createBiquadFilter();
      gustFilter.type = 'lowpass';
      gustFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
      gustFilter.Q.setValueAtTime(0.85, this.ctx.currentTime);
      const gustGain = this.ctx.createGain();
      gustGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gustSource.connect(gustFilter);
      gustFilter.connect(gustGain);

      if (this.ambientGains.wind) {
        baseGain.connect(this.ambientGains.wind);
        gustGain.connect(this.ambientGains.wind);
      }
      baseSource.start();
      gustSource.start();

      // Organic Random Gust Scheduler (High entropy, zero robotic repeating loops)
      const triggerOrganicGust = () => {
        if (!this.ctx || !this.ambientGains.wind) return;
        const now = this.ctx.currentTime;

        // Randomized gust archetype:
        // 45% subtle gentle breeze swell, 35% slow sweeping wind wave, 20% distant mountain gust
        const roll = Math.random();
        let peakGain: number;
        let peakFreq: number;
        let attackSec: number;
        let sustainSec: number;
        let decaySec: number;

        if (roll < 0.45) {
          // Subtle gentle breeze swell
          peakGain = 0.18 + Math.random() * 0.16;
          peakFreq = 220 + Math.random() * 100;
          attackSec = 2.0 + Math.random() * 2.5;
          sustainSec = 1.0 + Math.random() * 2.0;
          decaySec = 3.0 + Math.random() * 3.5;
        } else if (roll < 0.80) {
          // Slow sweeping wind wave
          peakGain = 0.38 + Math.random() * 0.28;
          peakFreq = 300 + Math.random() * 160;
          attackSec = 3.0 + Math.random() * 3.0;
          sustainSec = 1.5 + Math.random() * 3.0;
          decaySec = 4.0 + Math.random() * 4.0;
        } else {
          // Deeper mountain gust
          peakGain = 0.55 + Math.random() * 0.30;
          peakFreq = 380 + Math.random() * 200;
          attackSec = 2.5 + Math.random() * 2.5;
          sustainSec = 2.0 + Math.random() * 3.5;
          decaySec = 5.0 + Math.random() * 5.0;
        }

        // Cancel previous transitions smoothly
        gustGain.gain.cancelScheduledValues(now);
        gustFilter.frequency.cancelScheduledValues(now);

        const currentG = Math.max(0.005, gustGain.gain.value);
        gustGain.gain.setValueAtTime(currentG, now);
        gustGain.gain.linearRampToValueAtTime(peakGain, now + attackSec);

        const currentF = Math.max(160, gustFilter.frequency.value);
        gustFilter.frequency.setValueAtTime(currentF, now);
        gustFilter.frequency.exponentialRampToValueAtTime(Math.max(180, peakFreq), now + attackSec);

        // Extended organic release / gentle tail
        const sustainEnd = now + attackSec + sustainSec;
        gustGain.gain.setValueAtTime(peakGain, sustainEnd);
        gustGain.gain.exponentialRampToValueAtTime(0.005, sustainEnd + decaySec);
        gustFilter.frequency.exponentialRampToValueAtTime(200, sustainEnd + decaySec);

        // Organic lull interval: 7s to 24s randomized delay to prevent rapid-fire repeating
        const totalDurationMs = (attackSec + sustainSec + decaySec) * 1000;
        const lullMs = 6000 + Math.random() * 16000;
        const nextTriggerMs = totalDurationMs + lullMs;
        this.windGustTimeout = window.setTimeout(triggerOrganicGust, nextTriggerMs);
      };

      // Initial organic delay before first gust (4s to 10s)
      this.windGustTimeout = window.setTimeout(triggerOrganicGust, 4000 + Math.random() * 6000);
    } catch (e) {
      console.warn('Wind audio error', e);
    }

    // 5. ROOM TONE GENERATOR: Warm low-frequency presence
    try {
      const toneBuf = this.createNoiseBuffer('brown');
      const toneSource = this.ctx.createBufferSource();
      toneSource.buffer = toneBuf;
      toneSource.loop = true;

      const toneFilter = this.ctx.createBiquadFilter();
      toneFilter.type = 'lowpass';
      toneFilter.frequency.setValueAtTime(200, this.ctx.currentTime);

      toneSource.connect(toneFilter);
      if (this.ambientGains.roomTone) toneFilter.connect(this.ambientGains.roomTone);
      toneSource.start();
    } catch (e) {
      console.warn('Room tone error', e);
    }

    // 6. CAFE GENERATOR: Filtered murmur + ambient wash
    try {
      const cafeBuf = this.createNoiseBuffer('pink');
      const cafeSource = this.ctx.createBufferSource();
      cafeSource.buffer = cafeBuf;
      cafeSource.loop = true;

      const cafeFilter = this.ctx.createBiquadFilter();
      cafeFilter.type = 'bandpass';
      cafeFilter.frequency.setValueAtTime(650, this.ctx.currentTime);
      cafeFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

      cafeSource.connect(cafeFilter);
      if (this.ambientGains.cafe) cafeFilter.connect(this.ambientGains.cafe);
      cafeSource.start();
    } catch (e) {
      console.warn('Cafe audio error', e);
    }

    // 7. FOREST GENERATOR: Rustling foliage
    try {
      const forestBuf = this.createNoiseBuffer('pink');
      const forestSource = this.ctx.createBufferSource();
      forestSource.buffer = forestBuf;
      forestSource.loop = true;

      const forestFilter = this.ctx.createBiquadFilter();
      forestFilter.type = 'highpass';
      forestFilter.frequency.setValueAtTime(1800, this.ctx.currentTime);

      forestSource.connect(forestFilter);
      if (this.ambientGains.forest) forestFilter.connect(this.ambientGains.forest);
      forestSource.start();
    } catch (e) {
      console.warn('Forest audio error', e);
    }

    // 8. NIGHT INSECTS / CRICKETS: High frequency chirping rhythm
    try {
      const cricketTrigger = () => {
        if (!this.ctx || !this.ambientGains.insects) return;
        const now = this.ctx.currentTime;
        
        // 3 mini chirps in rapid succession
        for (let i = 0; i < 3; i++) {
          const chirpTime = now + i * 0.06;
          const osc1 = this.ctx.createOscillator();
          const oscGain = this.ctx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(4600 + Math.random() * 200, chirpTime);

          oscGain.gain.setValueAtTime(0, chirpTime);
          oscGain.gain.linearRampToValueAtTime(0.04, chirpTime + 0.015);
          oscGain.gain.linearRampToValueAtTime(0, chirpTime + 0.04);

          osc1.connect(oscGain);
          oscGain.connect(this.ambientGains.insects);

          osc1.start(chirpTime);
          osc1.stop(chirpTime + 0.05);
        }

        const next = 700 + Math.random() * 1200;
        setTimeout(cricketTrigger, next);
      };
      cricketTrigger();
    } catch (e) {
      console.warn('Insects audio error', e);
    }

    // 9. CLOCK: Steady 1000ms tick-tock
    try {
      let isTick = true;
      this.clockInterval = window.setInterval(() => {
        if (!this.ctx || !this.ambientGains.clock) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        const freq = isTick ? 1200 : 850;
        isTick = !isTick;

        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.025);

        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

        osc.connect(gain);
        gain.connect(this.ambientGains.clock);

        osc.start(now);
        osc.stop(now + 0.03);
      }, 1000);
    } catch (e) {
      console.warn('Clock audio error', e);
    }

    // 10. KEYBOARD CLICKS: Intermittent realistic typing bursts
    try {
      const scheduleTypingBurst = () => {
        if (!this.ctx || !this.ambientGains.keyboard) return;
        const numKeys = 2 + Math.floor(Math.random() * 6);
        let t = this.ctx.currentTime;

        for (let i = 0; i < numKeys; i++) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'square';
          osc.frequency.setValueAtTime(1800 + Math.random() * 1200, t);
          osc.frequency.exponentialRampToValueAtTime(200, t + 0.02);

          gain.gain.setValueAtTime(0.045, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.018);

          osc.connect(gain);
          gain.connect(this.ambientGains.keyboard);

          osc.start(t);
          osc.stop(t + 0.022);

          t += 0.09 + Math.random() * 0.12;
        }

        const nextBurst = 1500 + Math.random() * 4000;
        setTimeout(scheduleTypingBurst, nextBurst);
      };
      scheduleTypingBurst();
    } catch (e) {
      console.warn('Keyboard audio error', e);
    }

    // 11. THUNDER: Occasional deep low rumble
    try {
      const scheduleThunder = () => {
        if (!this.ctx || !this.ambientGains.thunder) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(55, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 2.5);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

        osc.connect(gain);
        gain.connect(this.ambientGains.thunder);

        osc.start(now);
        osc.stop(now + 3.1);

        const next = 12000 + Math.random() * 25000;
        setTimeout(scheduleThunder, next);
      };
      scheduleThunder();
    } catch (e) {
      console.warn('Thunder audio error', e);
    }

    // 12. BINAURAL BEATS: Dual-Ear Frequency Offset (Gamma, Beta, Alpha, Theta)
    try {
      if (this.ctx && this.ambientGains.binaural) {
        const merger = this.ctx.createChannelMerger(2);

        // Left Ear
        const oscL = this.ctx.createOscillator();
        oscL.type = 'sine';
        const gainL = this.ctx.createGain();
        gainL.gain.setValueAtTime(0.12, this.ctx.currentTime);
        oscL.connect(gainL);
        gainL.connect(merger, 0, 0);

        // Right Ear
        const oscR = this.ctx.createOscillator();
        oscR.type = 'sine';
        const gainR = this.ctx.createGain();
        gainR.gain.setValueAtTime(0.12, this.ctx.currentTime);
        oscR.connect(gainR);
        gainR.connect(merger, 0, 1);

        merger.connect(this.ambientGains.binaural);
        this.binauralOscL = oscL;
        this.binauralOscR = oscR;

        this.applyBinauralFrequencies(this.currentBinauralMode);

        oscL.start();
        oscR.start();
      }
    } catch (e) {
      console.warn('Binaural beats error', e);
    }

    // 13. ACOUSTIC CAT PURR: 28Hz modulated rumble with respiratory envelope
    try {
      if (this.ctx && this.ambientGains.catPurr) {
        const purrOsc = this.ctx.createOscillator();
        purrOsc.type = 'triangle';
        purrOsc.frequency.setValueAtTime(32, this.ctx.currentTime);

        const purrFilter = this.ctx.createBiquadFilter();
        purrFilter.type = 'lowpass';
        purrFilter.frequency.setValueAtTime(95, this.ctx.currentTime);

        // Tremolo LFO for vibration
        const tremolo = this.ctx.createOscillator();
        tremolo.type = 'sine';
        tremolo.frequency.setValueAtTime(24, this.ctx.currentTime);
        const tremoloGain = this.ctx.createGain();
        tremoloGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        tremolo.connect(tremoloGain);

        const purrMasterGain = this.ctx.createGain();
        purrMasterGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

        tremoloGain.connect(purrMasterGain.gain);
        purrOsc.connect(purrFilter);
        purrFilter.connect(purrMasterGain);
        purrMasterGain.connect(this.ambientGains.catPurr);

        purrOsc.start();
        tremolo.start();
      }
    } catch (e) {
      console.warn('Cat purr audio error', e);
    }

    // 14. DISTANT TRAIN: Rhythmic steel wheel rail clatter (820ms loop)
    try {
      if (this.ctx && this.ambientGains.train) {
        const trainRumbleBuf = this.createNoiseBuffer('brown');
        const trainSource = this.ctx.createBufferSource();
        trainSource.buffer = trainRumbleBuf;
        trainSource.loop = true;

        const trainFilter = this.ctx.createBiquadFilter();
        trainFilter.type = 'lowpass';
        trainFilter.frequency.setValueAtTime(140, this.ctx.currentTime);

        trainSource.connect(trainFilter);
        trainFilter.connect(this.ambientGains.train);
        trainSource.start();

        // Clack-clack intervals
        const scheduleTrainClick = () => {
          if (!this.ctx || !this.ambientGains.train) return;
          const now = this.ctx.currentTime;
          
          for (let i = 0; i < 2; i++) {
            const clickTime = now + i * 0.09;
            const clickOsc = this.ctx.createOscillator();
            const clickGain = this.ctx.createGain();
            clickOsc.type = 'square';
            clickOsc.frequency.setValueAtTime(420 + Math.random() * 80, clickTime);
            clickOsc.frequency.exponentialRampToValueAtTime(80, clickTime + 0.04);
            clickGain.gain.setValueAtTime(0.07, clickTime);
            clickGain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.038);
            clickOsc.connect(clickGain);
            clickGain.connect(this.ambientGains.train);
            clickOsc.start(clickTime);
            clickOsc.stop(clickTime + 0.045);
          }

          setTimeout(scheduleTrainClick, 820 + Math.random() * 60);
        };
        scheduleTrainClick();
      }
    } catch (e) {
      console.warn('Train audio error', e);
    }

    // 15. BOOK PAGES: Soft organic paper leaf turn every ~8-16s
    try {
      const schedulePageTurn = () => {
        if (!this.ctx || !this.ambientGains.bookPages) return;
        const now = this.ctx.currentTime;
        const noiseBuf = this.createNoiseBuffer('white', 0.6);
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = noiseBuf;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.linearRampToValueAtTime(2400, now + 0.25);
        filter.frequency.linearRampToValueAtTime(900, now + 0.5);
        filter.Q.setValueAtTime(2.5, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        noiseSource.connect(filter);
        filter.connect(gain);
        gain.connect(this.ambientGains.bookPages);

        noiseSource.start(now);
        noiseSource.stop(now + 0.6);

        const next = 8000 + Math.random() * 10000;
        setTimeout(schedulePageTurn, next);
      };
      schedulePageTurn();
    } catch (e) {
      console.warn('Book pages audio error', e);
    }

    // 16. WHITE NOISE: Pure flat spectrum calming focus noise
    try {
      if (this.ctx && this.ambientGains.whiteNoise) {
        const whiteSource = this.ctx.createBufferSource();
        whiteSource.buffer = this.createNoiseBuffer('white', 3.0);
        whiteSource.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(6500, this.ctx.currentTime);
        whiteSource.connect(filter);
        filter.connect(this.ambientGains.whiteNoise);
        whiteSource.start();
      }
    } catch (e) {
      console.warn('White noise error', e);
    }

    // 17. PINK NOISE: 1/f acoustic balance for deep reading
    try {
      if (this.ctx && this.ambientGains.pinkNoise) {
        const pinkSource = this.ctx.createBufferSource();
        pinkSource.buffer = this.createNoiseBuffer('pink', 3.0);
        pinkSource.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(4200, this.ctx.currentTime);
        pinkSource.connect(filter);
        filter.connect(this.ambientGains.pinkNoise);
        pinkSource.start();
      }
    } catch (e) {
      console.warn('Pink noise error', e);
    }

    // 18. BROWN NOISE: 6dB/octave deep warmth for ADHD & high focus
    try {
      if (this.ctx && this.ambientGains.brownNoise) {
        const brownSource = this.ctx.createBufferSource();
        brownSource.buffer = this.createNoiseBuffer('brown', 3.0);
        brownSource.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        brownSource.connect(filter);
        filter.connect(this.ambientGains.brownNoise);
        brownSource.start();
      }
    } catch (e) {
      console.warn('Brown noise error', e);
    }

    // 19. WIND CHIMES: High resonant metallic pentatonic impulses
    try {
      const scheduleChimes = () => {
        if (!this.ctx || !this.ambientGains.windChimes) return;
        const now = this.ctx.currentTime;
        const freqs = [1046.5, 1174.7, 1318.5, 1568.0, 1760.0, 2093.0];
        const count = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          const t = now + i * (0.08 + Math.random() * 0.15);
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freqs[Math.floor(Math.random() * freqs.length)], t);
          gain.gain.setValueAtTime(0.06, t);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
          osc.connect(gain);
          gain.connect(this.ambientGains.windChimes);
          osc.start(t);
          osc.stop(t + 1.9);
        }
        setTimeout(scheduleChimes, 6000 + Math.random() * 10000);
      };
      scheduleChimes();
    } catch (e) {
      console.warn('Wind chimes error', e);
    }

    // 20. TYPEWRITER: Vintage mechanical key striking with return carriage
    try {
      const scheduleTypewriter = () => {
        if (!this.ctx || !this.ambientGains.typewriter) return;
        const strikes = 3 + Math.floor(Math.random() * 7);
        let t = this.ctx.currentTime;
        for (let i = 0; i < strikes; i++) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(700 + Math.random() * 500, t);
          osc.frequency.exponentialRampToValueAtTime(100, t + 0.035);
          gain.gain.setValueAtTime(0.08, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
          osc.connect(gain);
          gain.connect(this.ambientGains.typewriter);
          osc.start(t);
          osc.stop(t + 0.04);
          t += 0.11 + Math.random() * 0.16;
        }
        setTimeout(scheduleTypewriter, 3500 + Math.random() * 6000);
      };
      scheduleTypewriter();
    } catch (e) {
      console.warn('Typewriter error', e);
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

  public playCatPurr() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Harmonic purring vibration
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(42, now);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(25, now); // 25Hz purr vibration
    lfoGain.gain.setValueAtTime(14, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(now);
    lfo.stop(now + 1.2);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.3);
    gain.gain.linearRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.25);
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
    gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
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
    gain.gain.linearRampToValueAtTime(0.09, now + 0.03);
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
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Metallic impact slash
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playBossCrit() {
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

  // Realistic Procedural Thunder Strike (Whip-Crack, Sub-Bass Boom & Rolling Rumble)
  public playThunderStrike(intensity = 0.8) {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const clamped = Math.max(0.2, Math.min(1.0, intensity));

    // 1. Initial whip / electric crack (sharp filtered noise)
    try {
      const crackBuf = this.createNoiseBuffer('white');
      const crackSource = this.ctx.createBufferSource();
      crackSource.buffer = crackBuf;

      const crackFilter = this.ctx.createBiquadFilter();
      crackFilter.type = 'bandpass';
      crackFilter.frequency.setValueAtTime(1400, now);
      crackFilter.Q.setValueAtTime(1.5, now);

      const crackGain = this.ctx.createGain();
      crackGain.gain.setValueAtTime(0.001, now);
      crackGain.gain.linearRampToValueAtTime(0.28 * clamped, now + 0.02);
      crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      crackSource.connect(crackFilter);
      crackFilter.connect(crackGain);
      crackGain.connect(this.masterGain || this.ctx.destination);
      crackSource.start(now);
      crackSource.stop(now + 0.25);
    } catch (e) {
      console.warn('Thunder crack error', e);
    }

    // 2. Heavy sub-bass impact boom (triangle wave diving 75Hz -> 28Hz)
    try {
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();

      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(75, now);
      subOsc.frequency.exponentialRampToValueAtTime(28, now + 1.2);

      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.45 * clamped, now + 0.05);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      subOsc.connect(subGain);
      subGain.connect(this.masterGain || this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 1.9);
    } catch (e) {
      console.warn('Thunder sub-bass error', e);
    }

    // 3. Resonant rolling thunder rumble (brown noise through modulated lowpass filter)
    try {
      const rumbleBuf = this.createNoiseBuffer('brown');
      const rumbleSource = this.ctx.createBufferSource();
      rumbleSource.buffer = rumbleBuf;
      rumbleSource.loop = true;

      const rumbleFilter = this.ctx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.setValueAtTime(180, now);
      rumbleFilter.frequency.exponentialRampToValueAtTime(45, now + 3.8);

      const rumbleGain = this.ctx.createGain();
      rumbleGain.gain.setValueAtTime(0.001, now);
      rumbleGain.gain.linearRampToValueAtTime(0.38 * clamped, now + 0.35);
      rumbleGain.gain.exponentialRampToValueAtTime(0.18 * clamped, now + 1.8);
      rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);

      rumbleSource.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(this.masterGain || this.ctx.destination);
      rumbleSource.start(now);
      rumbleSource.stop(now + 4.3);
    } catch (e) {
      console.warn('Thunder rumble error', e);
    }
  }

  // --- GENERATIVE LO-FI BACKUP SYNTHESIZER ---
  private isLofiPlaying = false;
  private lofiChordIndex = 0;
  private lofiInterval: number | null = null;
  private lofiGain: GainNode | null = null;

  public startGenerativeLofi(volume = 0.5) {
    this.init();
    if (!this.ctx || this.isLofiPlaying) return;
    this.isLofiPlaying = true;

    this.lofiGain = this.ctx.createGain();
    this.lofiGain.gain.setValueAtTime(volume * 0.35, this.ctx.currentTime);
    this.lofiGain.connect(this.ctx.destination);

    // Warm Rhodes / Lofi 7th & 9th Chord Progressions
    const progressions = [
      [155.56, 196.00, 233.08, 293.66, 349.23], // Ebmaj9
      [130.81, 196.00, 233.08, 261.63, 293.66], // Cm9
      [174.61, 207.65, 261.63, 311.13, 349.23], // Fm9
      [116.54, 174.61, 233.08, 293.66, 329.63], // Bb13
    ];

    const playChord = () => {
      if (!this.ctx || !this.isLofiPlaying || !this.lofiGain) return;
      const chord = progressions[this.lofiChordIndex];
      this.lofiChordIndex = (this.lofiChordIndex + 1) % progressions.length;
      const now = this.ctx.currentTime;

      // Filter for warm lowpass vintage tone
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);

      chord.forEach((freq, idx) => {
        if (!this.ctx || !this.lofiGain) return;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.linearRampToValueAtTime(0.12, now + 0.3);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

        osc.connect(noteGain);
        noteGain.connect(filter);
        osc.start(now);
        osc.stop(now + 4.0);
      });

      filter.connect(this.lofiGain);
    };

    playChord();
    this.lofiInterval = window.setInterval(playChord, 3800);
  }

  public stopGenerativeLofi() {
    this.isLofiPlaying = false;
    if (this.lofiInterval) {
      clearInterval(this.lofiInterval);
      this.lofiInterval = null;
    }
    if (this.lofiGain && this.ctx) {
      this.lofiGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  public setGenerativeLofiVolume(volume: number) {
    if (this.lofiGain && this.ctx) {
      this.lofiGain.gain.setTargetAtTime(volume * 0.35, this.ctx.currentTime, 0.05);
    }
  }
}

export const webAudioEngine = new WebAudioEngine();

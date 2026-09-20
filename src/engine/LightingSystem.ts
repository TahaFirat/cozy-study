import { TimeOfDay, WeatherType } from '../types';

export class LightingSystem {
  public lampCurrentIntensity = 1.0;
  private fireplaceFlicker = 1.0;
  private candleFlicker = 1.0;

  // Gradient caches — rebuild only when key params change (not every frame)
  private cachedWindowGrad: CanvasGradient | null = null;
  private cachedWindowGradKey = '';
  private cachedLampGrad: CanvasGradient | null = null;
  private cachedLampGradKey = '';

  public update(lampOn: boolean, fireplaceActive: boolean, isPlayingMusic = false) {
    // Smooth lamp transition
    const targetLamp = lampOn ? 1.0 : 0.0;
    this.lampCurrentIntensity += (targetLamp - this.lampCurrentIntensity) * 0.14;

    // Audio-reactive lofi micro-resonance (subtle acoustic lamp breathing)
    if (lampOn && isPlayingMusic) {
      const acousticPulse = Math.sin(performance.now() * 0.0038) * 0.035;
      this.lampCurrentIntensity = Math.max(0.85, Math.min(1.08, this.lampCurrentIntensity + acousticPulse * 0.05));
    }

    // Fireplace flicker jitter
    if (fireplaceActive) {
      const musicBoost = isPlayingMusic ? Math.sin(performance.now() * 0.0028) * 0.04 : 0;
      this.fireplaceFlicker = 0.92 + Math.sin(performance.now() * 0.008) * 0.06 + (Math.random() - 0.5) * 0.05 + musicBoost;
    } else {
      this.fireplaceFlicker = 0;
    }

    // Candle micro-flicker
    this.candleFlicker = 0.93 + Math.sin(performance.now() * 0.014) * 0.07;
  }

  public renderLighting(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timeOfDay: TimeOfDay,
    weather: WeatherType,
    inFocus: boolean,
    lightningAlpha: number,
    lampConfig: { x: number; y: number; radius: number; color: string },
    hearthPos?: { x: number; y: number; w: number; h: number },
    windowBounds?: { x: number; y: number; w: number; h: number },
    isPlayingMusic = false
  ) {
    ctx.save();

    // 1. AMBIENT SHADOW / TIME OF DAY TINT LAYER
    let ambientColor = 'rgba(12, 10, 22, 0.42)';
    switch (timeOfDay) {
      case 'morning':
        ambientColor = 'rgba(30, 35, 55, 0.18)';
        break;
      case 'afternoon':
        ambientColor = 'rgba(15, 22, 35, 0.08)';
        break;
      case 'golden_hour':
        ambientColor = 'rgba(55, 25, 12, 0.22)';
        break;
      case 'evening':
        ambientColor = 'rgba(15, 12, 28, 0.48)';
        break;
      case 'midnight':
      default:
        ambientColor = 'rgba(8, 9, 20, 0.68)';
        break;
    }

    if (weather === 'storm' || weather === 'heavy_rain') {
      if (timeOfDay === 'morning' || timeOfDay === 'afternoon') {
        ambientColor = 'rgba(16, 20, 32, 0.42)';
      }
    }

    // Draw ambient darkness (recedes during blinding lightning strikes!)
    if (lightningAlpha > 0.05) {
      ctx.save();
      ctx.globalAlpha = Math.max(0.05, 1 - lightningAlpha * 0.92);
      ctx.fillStyle = ambientColor;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    } else {
      ctx.fillStyle = ambientColor;
      ctx.fillRect(0, 0, width, height);
    }

    // Deepen room slightly during focus sessions
    if (inFocus) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. BLEND MODE FOR RADIANT LIGHTS: 'lighter' / 'screen'
    ctx.globalCompositeOperation = 'lighter';

    // A. WINDOW LIGHT INFLOW — cached gradient (only rebuilds on timeOfDay / window position change)
    if (windowBounds) {
      const wKey = `${timeOfDay}|${windowBounds.x},${windowBounds.y},${windowBounds.w}`;
      if (!this.cachedWindowGrad || this.cachedWindowGradKey !== wKey) {
        this.cachedWindowGradKey = wKey;
        const centerX = windowBounds.x + windowBounds.w * 0.5;
        const centerY = windowBounds.y + windowBounds.h * 0.5;
        const g = ctx.createRadialGradient(centerX, centerY, 30, centerX + 40, centerY + 40, windowBounds.w * 1.8);
        if (timeOfDay === 'golden_hour') {
          g.addColorStop(0, 'rgba(251, 191, 36, 0.18)');
          g.addColorStop(1, 'rgba(245, 158, 11, 0)');
        } else if (timeOfDay === 'morning' || timeOfDay === 'afternoon') {
          g.addColorStop(0, 'rgba(224, 242, 254, 0.15)');
          g.addColorStop(1, 'rgba(186, 230, 253, 0)');
        } else {
          g.addColorStop(0, 'rgba(96, 165, 250, 0.10)');
          g.addColorStop(1, 'rgba(30, 58, 138, 0)');
        }
        this.cachedWindowGrad = g;
      }
      ctx.fillStyle = this.cachedWindowGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // B. NATURAL ATMOSPHERIC SUNLIGHT GLOW (Morning & Golden Hour warmth emanating into room)
    if (windowBounds && (timeOfDay === 'morning' || timeOfDay === 'golden_hour') && weather !== 'storm' && weather !== 'heavy_rain') {
      const now = performance.now();
      const rayAlphaBase = timeOfDay === 'golden_hour' ? 0.08 : 0.05;
      const rayBreathe = rayAlphaBase * (0.9 + Math.sin(now * 0.001) * 0.1);

      const winCenterX = windowBounds.x + windowBounds.w * 0.5;
      const winCenterY = windowBounds.y + windowBounds.h * 0.45;
      const glowRadius = Math.max(windowBounds.w, windowBounds.h) * 1.4;

      ctx.save();
      const sunGrad = ctx.createRadialGradient(
        winCenterX, winCenterY, windowBounds.w * 0.2,
        winCenterX, winCenterY, glowRadius
      );
      if (timeOfDay === 'golden_hour') {
        sunGrad.addColorStop(0, `rgba(251, 191, 36, ${(rayBreathe * 1.4).toFixed(3)})`);
        sunGrad.addColorStop(0.5, `rgba(245, 158, 11, ${(rayBreathe * 0.6).toFixed(3)})`);
        sunGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
      } else {
        sunGrad.addColorStop(0, `rgba(254, 243, 199, ${(rayBreathe * 1.2).toFixed(3)})`);
        sunGrad.addColorStop(0.5, `rgba(224, 242, 254, ${(rayBreathe * 0.5).toFixed(3)})`);
        sunGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
      }

      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }


    // C. TWILIGHT / MIDNIGHT HORIZON AMBIENCE
    if (windowBounds && (timeOfDay === 'midnight' || timeOfDay === 'evening')) {
      const winCenterX = windowBounds.x + windowBounds.w * 0.5;
      const winBotY = windowBounds.y + windowBounds.h;
      const horizonGrad = ctx.createRadialGradient(
        winCenterX, winBotY, 15,
        winCenterX, winBotY, windowBounds.w * 0.85
      );
      if (timeOfDay === 'evening') {
        horizonGrad.addColorStop(0, 'rgba(147, 51, 234, 0.12)');
        horizonGrad.addColorStop(0.55, 'rgba(79, 70, 229, 0.05)');
        horizonGrad.addColorStop(1, 'rgba(30, 27, 75, 0)');
      } else {
        horizonGrad.addColorStop(0, 'rgba(56, 189, 248, 0.09)');
        horizonGrad.addColorStop(0.5, 'rgba(30, 58, 138, 0.04)');
        horizonGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      }
      ctx.fillStyle = horizonGrad;
      ctx.beginPath();
      ctx.ellipse(winCenterX, winBotY, windowBounds.w * 0.8, windowBounds.h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // D. FIREPLACE WARM GLOW — radius flickers so gradient must rebuild each frame (intentional)
    if (hearthPos && this.fireplaceFlicker > 0) {
      const hCenterX = hearthPos.x + hearthPos.w * 0.5;
      const hCenterY = hearthPos.y + hearthPos.h * 0.5;
      const radius = 220 * this.fireplaceFlicker;
      const fireGrad = ctx.createRadialGradient(hCenterX, hCenterY, 15, hCenterX, hCenterY, radius);
      fireGrad.addColorStop(0, 'rgba(254, 215, 170, 0.55)');
      fireGrad.addColorStop(0.3, 'rgba(249, 115, 22, 0.35)');
      fireGrad.addColorStop(0.7, 'rgba(180, 83, 9, 0.15)');
      fireGrad.addColorStop(1, 'rgba(120, 53, 15, 0)');
      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.arc(hCenterX, hCenterY, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // E. DESK LAMP POOL — cached gradient (only rebuilds when intensity changes >0.5%)
    if (this.lampCurrentIntensity > 0.01) {
      const lKey = `${lampConfig.x},${lampConfig.y},${lampConfig.radius},${this.lampCurrentIntensity.toFixed(2)}`;
      if (!this.cachedLampGrad || this.cachedLampGradKey !== lKey) {
        this.cachedLampGradKey = lKey;
        const lampR = lampConfig.radius * this.lampCurrentIntensity;
        const g = ctx.createRadialGradient(lampConfig.x, lampConfig.y, 10, lampConfig.x, lampConfig.y + 40, lampR);
        g.addColorStop(0, `rgba(254, 240, 138, ${(0.6 * this.lampCurrentIntensity).toFixed(3)})`);
        g.addColorStop(0.35, `rgba(245, 158, 11, ${(0.35 * this.lampCurrentIntensity).toFixed(3)})`);
        g.addColorStop(0.75, `rgba(217, 119, 6, ${(0.12 * this.lampCurrentIntensity).toFixed(3)})`);
        g.addColorStop(1, 'rgba(180, 83, 9, 0)');
        this.cachedLampGrad = g;
      }
      const lampR = lampConfig.radius * this.lampCurrentIntensity;
      ctx.fillStyle = this.cachedLampGrad;
      ctx.beginPath();
      ctx.ellipse(lampConfig.x, lampConfig.y + 50, lampR * 1.15, lampR * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // F. AUDIO-REACTIVE LO-FI ROOM RESONANCE (Soft whole-room acoustic breathing)
    if (isPlayingMusic) {
      const acousticGlow = 0.02 + Math.sin(performance.now() * 0.0035) * 0.015;
      ctx.fillStyle = `rgba(251, 191, 36, ${acousticGlow.toFixed(4)})`;
      ctx.fillRect(0, 0, width, height);
    }

    // G. STORM LIGHTNING FLASH (Brilliant electric bloom & global room strobe)
    if (lightningAlpha > 0.01) {
      // 1. Intense electric bloom centered on the window pane
      if (windowBounds) {
        const winCenterX = windowBounds.x + windowBounds.w * 0.5;
        const winCenterY = windowBounds.y + windowBounds.h * 0.5;
        const flashRadius = Math.max(windowBounds.w, windowBounds.h) * 1.8;
        const flashGrad = ctx.createRadialGradient(
          winCenterX, winCenterY, 30,
          winCenterX, winCenterY, flashRadius
        );
        flashGrad.addColorStop(0, `rgba(255, 255, 255, ${lightningAlpha * 0.95})`);
        flashGrad.addColorStop(0.35, `rgba(219, 234, 254, ${lightningAlpha * 0.85})`);
        flashGrad.addColorStop(0.7, `rgba(147, 197, 253, ${lightningAlpha * 0.45})`);
        flashGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');

        ctx.fillStyle = flashGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Global room strobe illumination
      ctx.fillStyle = `rgba(235, 245, 255, ${lightningAlpha * 0.75})`;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }
}

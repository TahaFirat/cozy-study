import { WeatherType } from '../types';
import { webAudioEngine } from '../audio/WebAudioEngine';

interface LightningBolt {
  points: { x: number; y: number }[];
  branches: { x: number; y: number }[][];
}

interface RainStreak {
  x: number;
  y: number;
  speed: number;
  length: number;
  thickness: number;
  alpha: number;
}

interface RainSplash {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  alpha: number;
}

interface DropletSprite {
  radius: number;
  canvas: HTMLCanvasElement;
  offset: number;
}

interface GlassDroplet {
  x: number;
  y: number;
  radius: number;
  mass: number;
  stuck: boolean;
  vy: number;
  slideTimer: number;
  lastTrailY: number;
  trail: { x: number; y: number; alpha: number; width: number }[];
  alpha: number;
  paneIndex: number;
}

interface SnowParticle {
  x: number;
  y: number;
  speed: number;
  size: number;
  drift: number;
  phase: number;
  alpha: number;
  layer: 0 | 1 | 2; // 0 = distant micro, 1 = midground drift, 2 = foreground fluffy
  wobbleSpeed: number;
  paneIndex: number;
}

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}


interface DustMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
}


interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface TwinkleStar {
  x: number;
  y: number;
  baseAlpha: number;
  phase: number;
  twinkleSpeed: number;
}

interface HeartParticle {
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface ZzzParticle {
  x: number;
  y: number;
  text: string;
  size: number;
  alpha: number;
  vy: number;
  phase: number;
  life: number;
  maxLife: number;
}

interface PuddleRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface EavesDrip {
  x: number;
  y: number;
  vy: number;
  length: number;
  alpha: number;
}

interface DistantWindow {
  x: number;
  y: number;
  baseAlpha: number;
  phase: number;
  speed: number;
  color: string;
}

export class ParticleSystem {
  private bgRain: RainStreak[] = [];
  private fgRain: RainStreak[] = [];
  private splashes: RainSplash[] = [];
  private glassDroplets: GlassDroplet[] = [];
  private puddleRipples: PuddleRipple[] = [];
  private eavesDrips: EavesDrip[] = [];
  private distantWindows: DistantWindow[] = [];
  private distantWindowsInitialized = false;
  private lastRoomIdForWindows = '';
  private snow: SnowParticle[] = [];
  private embers: EmberParticle[] = [];
  private dust: DustMote[] = [];
  private hearts: HeartParticle[] = [];
  private zzzParticles: ZzzParticle[] = [];
  private zzzTimer = 0;

  // Exterior Window Life (Twinkling & Shooting Stars)
  private shootingStars: ShootingStar[] = [];
  private shootingStarTimer = 0;
  private twinkleStars: TwinkleStar[] = [];
  private twinkleStarsInitialized = false;

  // Dynamic wind gust simulation
  public currentWindSpeed = 0.35;
  private targetWindSpeed = 0.35;
  private windGustTimer = 0;

  public lightningAlpha = 0;
  private lightningSequence: number[] = [];
  private lightningSequenceIndex = 999;
  private nextLightningTime = 0;
  private currentBolt: LightningBolt | null = null;
  private lastWindowKey = '';

  // Rain rhythm: natural gusts and lulls
  private rainIntensity = 0.6;          // 0..1 live intensity
  private rainBurstTimer = 0;           // frames until next intensity change
  private rainBurstDuration = 0;        // current gust/lull duration

  // Window condensation & finger scratching
  public windowScratches: { x: number; y: number; r: number; time: number }[] = [];
  private mistCanvas: HTMLCanvasElement | null = null;
  private mistCtx: CanvasRenderingContext2D | null = null;

  public addWindowScratch(x: number, y: number, r = 8) {
    const now = performance.now();
    this.windowScratches.push({ x, y, r, time: now });
    if (this.windowScratches.length > 400) {
      this.windowScratches.splice(0, 50);
    }
  }

  // 3D Refractive Droplet Sprite Cache (60fps Canvas 2D optimization)
  private dropletSpriteCache: DropletSprite[] = [];

  constructor() {
    this.dust = [];
    this.buildDropletSpriteCache();
  }

  private buildDropletSpriteCache() {
    if (typeof document === 'undefined') return;
    this.dropletSpriteCache = [];
    const sizes = [1.5, 2.0, 2.5, 3.2, 4.0, 5.0, 6.2, 7.8, 9.5, 12.0];

    sizes.forEach((r) => {
      const dim = Math.ceil((r + 4) * 2);
      const off = document.createElement('canvas');
      off.width = dim;
      off.height = dim;
      const oCtx = off.getContext('2d');
      if (!oCtx) return;

      const cx = dim / 2;
      const cy = dim / 2;

      // 1. Soft ambient drop shadow cast down-right
      oCtx.beginPath();
      oCtx.arc(cx + r * 0.18, cy + r * 0.22, r * 0.95, 0, Math.PI * 2);
      oCtx.fillStyle = 'rgba(8, 16, 26, 0.28)';
      oCtx.fill();

      // 2. Base Lens Body with Asymmetric Radial Gradient (3D refraction simulation)
      const grad = oCtx.createRadialGradient(
        cx - r * 0.35, cy - r * 0.35, r * 0.05,
        cx, cy, r
      );
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.96)');  // Primary specular point
      grad.addColorStop(0.18, 'rgba(215, 235, 255, 0.45)'); // Secondary highlight halo
      grad.addColorStop(0.55, 'rgba(30, 50, 75, 0.06)');     // Clear water core (shows background)
      grad.addColorStop(0.85, 'rgba(15, 25, 45, 0.45)');    // Dark meniscus ring (internal refraction)
      grad.addColorStop(1.0, 'rgba(225, 245, 255, 0.65)');   // Bottom rim caustic glow

      oCtx.beginPath();
      oCtx.arc(cx, cy, r, 0, Math.PI * 2);
      oCtx.fillStyle = grad;
      oCtx.fill();

      // 3. Crisp Specular Glint (Pinpoint sky/light reflection)
      oCtx.beginPath();
      oCtx.arc(cx - r * 0.35, cy - r * 0.35, Math.max(0.6, r * 0.20), 0, Math.PI * 2);
      oCtx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      oCtx.fill();

      // 4. Warm Bottom Bounce Light (Reflecting cozy room lamplight)
      oCtx.beginPath();
      oCtx.arc(cx + r * 0.2, cy + r * 0.38, Math.max(0.8, r * 0.24), 0, Math.PI * 2);
      oCtx.fillStyle = 'rgba(255, 215, 170, 0.35)';
      oCtx.fill();

      this.dropletSpriteCache.push({ radius: r, canvas: off, offset: dim / 2 });
    });
  }

  private getClosestDropletSprite(r: number): DropletSprite | null {
    if (this.dropletSpriteCache.length === 0) {
      this.buildDropletSpriteCache();
      if (this.dropletSpriteCache.length === 0) return null;
    }
    let closest = this.dropletSpriteCache[0];
    let minDiff = Math.abs(r - closest.radius);
    for (let i = 1; i < this.dropletSpriteCache.length; i++) {
      const diff = Math.abs(r - this.dropletSpriteCache[i].radius);
      if (diff < minDiff) {
        minDiff = diff;
        closest = this.dropletSpriteCache[i];
      }
    }
    return closest;
  }

  public clearMistAt(x: number, y: number, r: number) {
    if (!this.mistCtx) return;
    this.mistCtx.save();
    this.mistCtx.globalCompositeOperation = 'destination-out';
    this.mistCtx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    this.mistCtx.beginPath();
    this.mistCtx.arc(x, y, r * 1.15, 0, Math.PI * 2);
    this.mistCtx.fill();
    this.mistCtx.restore();
  }

  private ensureGlassDroplets(
    wb: { x: number; y: number; w: number; h: number },
    windowPanes?: { x: number; y: number; w: number; h: number }[],
    hasGlass = true
  ) {
    if (!hasGlass) {
      this.glassDroplets = [];
      return;
    }
    const panes = windowPanes && windowPanes.length > 0 ? windowPanes : [wb];
    const key = panes.map(p => `${p.x},${p.y},${p.w},${p.h}`).join('|');
    if (this.lastWindowKey === key && this.glassDroplets.length > 0) return;
    this.lastWindowKey = key;

    this.glassDroplets = [];
    panes.forEach((pane, pIdx) => {
      // Natural droplet density scaled by pane width
      const count = Math.max(12, Math.round(28 * (pane.w / 200)));
      for (let i = 0; i < count; i++) {
        const isBig = Math.random() < 0.18;
        const radius = isBig ? (3.0 + Math.random() * 2.4) : (1.4 + Math.random() * 1.5);
        const yPos = pane.y + 4 + Math.random() * (pane.h - 10);
        this.glassDroplets.push({
          x: pane.x + 3 + Math.random() * (pane.w - 6),
          y: yPos,
          radius,
          mass: radius * radius,
          stuck: true,
          vy: 0,
          slideTimer: 40 + Math.random() * 240,
          lastTrailY: yPos,
          trail: [],
          alpha: 0.45 + Math.random() * 0.35,
          paneIndex: pIdx,
        });
      }
    });
  }

  public triggerHeart(x: number, y: number) {
    for (let i = 0; i < 4; i++) {
      this.hearts.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y - i * 6,
        vy: -0.5 - Math.random() * 0.4,
        life: 0,
        maxLife: 70 + Math.random() * 25,
      });
    }
  }

  private generateLightningBolt(windowBounds: { x: number; y: number; w: number; h: number }) {
    const startX = windowBounds.x + windowBounds.w * (0.25 + Math.random() * 0.5);
    const startY = windowBounds.y;
    const endY = windowBounds.y + windowBounds.h * (0.65 + Math.random() * 0.35);
    let curX = startX;
    let curY = startY;
    const mainPoints: { x: number; y: number }[] = [{ x: curX, y: curY }];
    const branches: { x: number; y: number }[][] = [];

    while (curY < endY) {
      const stepY = 14 + Math.random() * 22;
      const stepX = (Math.random() - 0.5) * 28;
      curY += stepY;
      curX += stepX;
      mainPoints.push({ x: curX, y: curY });

      // 35% chance to fork a jagged branch
      if (Math.random() < 0.35 && branches.length < 3) {
        let bX = curX;
        let bY = curY;
        const bPoints: { x: number; y: number }[] = [{ x: bX, y: bY }];
        const dir = Math.random() < 0.5 ? -1 : 1;
        for (let b = 0; b < 4; b++) {
          bY += 10 + Math.random() * 16;
          bX += dir * (10 + Math.random() * 18);
          bPoints.push({ x: bX, y: bY });
        }
        branches.push(bPoints);
      }
    }

    this.currentBolt = { points: mainPoints, branches };
  }

  public update(
    weather: WeatherType,
    fireplaceActive: boolean,
    mugHot: boolean,
    mugPos: { x: number; y: number } | undefined,
    hearthPos: { x: number; y: number; w: number; h: number } | undefined,
    windowBounds: { x: number; y: number; w: number; h: number },
    catBox?: { x: number; y: number; w: number; h: number },
    windowPanes?: { x: number; y: number; w: number; h: number }[],
    timeOfDay = 'midnight',
    roomId = 'bedroom',
    lampOn = true
  ) {
    const isRaining = weather === 'rain' || weather === 'heavy_rain' || weather === 'storm';
    const panes = windowPanes && windowPanes.length > 0 ? windowPanes : [windowBounds];

    const hasGlass = roomId !== 'kyoto_zen';

    // Ensure glass droplets stay strictly inside each glass pane (only while raining)
    this.ensureGlassDroplets(windowBounds, windowPanes, hasGlass && isRaining);

    // 0. DYNAMIC WIND GUST SIMULATION (Couples snow, rain slant, and outdoor trees)
    this.windGustTimer--;
    if (this.windGustTimer <= 0) {
      const isGust = Math.random() < 0.38;
      this.targetWindSpeed = isGust ? (0.75 + Math.random() * 0.85) : (0.15 + Math.random() * 0.30);
      this.windGustTimer = isGust ? (70 + Math.floor(Math.random() * 100)) : (120 + Math.floor(Math.random() * 160));
    }
    this.currentWindSpeed += (this.targetWindSpeed - this.currentWindSpeed) * 0.04;

    // 1. RAIN PARTICLES — organic gust / lull rhythm
    if (isRaining) {
      const isStorm = weather === 'storm';
      const isHeavy = weather === 'heavy_rain' || isStorm;
      const slant = (isStorm ? 0.28 : isHeavy ? 0.22 : 0.16) + this.currentWindSpeed * 0.08;

      // Rain rhythm: intensity drifts between gusts and quiet patches
      this.rainBurstTimer--;
      if (this.rainBurstTimer <= 0) {
        if (isStorm) {
          this.rainIntensity = Math.random() < 0.65 ? (0.80 + Math.random() * 0.20) : (0.60 + Math.random() * 0.25);
          this.rainBurstDuration = 70 + Math.floor(Math.random() * 90);
        } else if (isHeavy) {
          this.rainIntensity = Math.random() < 0.55 ? (0.65 + Math.random() * 0.35) : (0.35 + Math.random() * 0.30);
          this.rainBurstDuration = 80 + Math.floor(Math.random() * 100);
        } else {
          if (Math.random() < 0.45) {
            this.rainIntensity = 0.45 + Math.random() * 0.40;
            this.rainBurstDuration = 60 + Math.floor(Math.random() * 100);
          } else {
            this.rainIntensity = 0.15 + Math.random() * 0.25;
            this.rainBurstDuration = 80 + Math.floor(Math.random() * 140);
          }
        }
        this.rainBurstTimer = this.rainBurstDuration;
      }

      const peakBg = isStorm ? 75 : isHeavy ? 55 : 32;
      const peakFg = isStorm ? 52 : isHeavy ? 38 : 22;
      const capBg  = Math.ceil(peakBg  * this.rainIntensity);
      const capFg  = Math.ceil(peakFg  * this.rainIntensity);

      // Spawn BG drops across panes
      const spawnChanceBg = isStorm ? 0.75 : isHeavy ? 0.55 : 0.35;
      if (this.bgRain.length < capBg && Math.random() < spawnChanceBg) {
        const p = panes[Math.floor(Math.random() * panes.length)];
        const speed = isStorm ? (11 + Math.random() * 6) : (8 + Math.random() * 5);
        const length = isStorm ? (14 + Math.random() * 14) : (10 + Math.random() * 10);
        this.bgRain.push({
          x: p.x + Math.random() * (p.w + p.h * slant),
          y: p.y - 10,
          speed,
          length,
          thickness: isStorm ? 1.2 : 1,
          alpha: (isStorm ? 0.25 : 0.15) + Math.random() * 0.20,
        });
      }

      // Spawn FG drops across panes
      const spawnChanceFg = isStorm ? 0.60 : isHeavy ? 0.40 : 0.25;
      if (this.fgRain.length < capFg && Math.random() < spawnChanceFg) {
        const p = panes[Math.floor(Math.random() * panes.length)];
        const speed = isStorm ? (15 + Math.random() * 8) : (12 + Math.random() * 6);
        const length = isStorm ? (20 + Math.random() * 18) : (16 + Math.random() * 14);
        this.fgRain.push({
          x: p.x + Math.random() * (p.w + p.h * slant),
          y: p.y - 10,
          speed,
          length,
          thickness: isStorm ? 1.8 : 1.5,
          alpha: (isStorm ? 0.38 : 0.28) + Math.random() * 0.30,
        });
      }

      if (this.bgRain.length > capBg + 4 && Math.random() < 0.35) this.bgRain.shift();
      if (this.fgRain.length > capFg + 3 && Math.random() < 0.35) this.fgRain.shift();

      // Update BG Rain
      for (let i = this.bgRain.length - 1; i >= 0; i--) {
        const r = this.bgRain[i];
        r.y += r.speed;
        r.x -= r.speed * slant;
        if (r.y > windowBounds.y + windowBounds.h || r.x < windowBounds.x - 10) {
          this.bgRain.splice(i, 1);
        }
      }

      // Update FG Rain & trigger window sill splashes and ground puddle ripples
      for (let i = this.fgRain.length - 1; i >= 0; i--) {
        const r = this.fgRain[i];
        r.y += r.speed;
        r.x -= r.speed * slant;
        if (r.y > windowBounds.y + windowBounds.h - 8) {
          if (Math.random() < 0.40 && this.splashes.length < 30 && r.x >= windowBounds.x && r.x <= windowBounds.x + windowBounds.w) {
            for (let s = 0; s < 2; s++) {
              this.splashes.push({
                x: r.x + (Math.random() - 0.5) * 3,
                y: windowBounds.y + windowBounds.h - 3,
                vx: (Math.random() - 0.5) * 1.6,
                vy: -1.2 - Math.random() * 1.5,
                life: 0,
                maxLife: 10 + Math.random() * 8,
                alpha: 0.65,
              });
            }
          }

          // Spawn puddle ripples on wet street / veranda
          if (this.puddleRipples.length < 24 && Math.random() < 0.35) {
            let ripColor = 'rgba(186, 230, 253, ';
            if (roomId === 'cafe' && r.x < 140) {
              ripColor = 'rgba(254, 215, 120, ';
            } else if (roomId === 'kyoto_zen') {
              ripColor = 'rgba(215, 235, 250, ';
            }
            this.puddleRipples.push({
              x: r.x,
              y: r.y,
              radius: 1,
              maxRadius: 5 + Math.random() * 6,
              alpha: 0.45,
              color: ripColor,
            });
          }

          this.fgRain.splice(i, 1);
        }
      }

      // Spontaneous ground puddle ripples in outdoor areas (cobblestones / garden paths)
      if (this.puddleRipples.length < 22 && Math.random() < 0.28) {
        if (roomId === 'cafe') {
          // Strictly on outdoor cobblestone sidewalk inside pane (x: 15..205, y: 390..525)
          const rx = 15 + Math.random() * 185;
          const ry = 390 + Math.random() * 135;
          const nearLamp = rx < 120;
          this.puddleRipples.push({
            x: rx,
            y: ry,
            radius: 1,
            maxRadius: 5 + Math.random() * 6,
            alpha: nearLamp ? 0.45 : 0.30,
            color: nearLamp ? 'rgba(254, 215, 120, ' : 'rgba(186, 230, 253, ',
          });
        } else if (roomId === 'kyoto_zen') {
          // Strictly in garden stepping stones (x: 635..895, y: 310..365)
          const rx = 635 + Math.random() * 255;
          const ry = 310 + Math.random() * 55;
          this.puddleRipples.push({
            x: rx,
            y: ry,
            radius: 1,
            maxRadius: 6 + Math.random() * 7,
            alpha: 0.38,
            color: 'rgba(215, 235, 250, ',
          });
        } else if (roomId === 'bedroom') {
          // Strictly on outdoor balcony ledge (x: 165..335, y: 340..356)
          const rx = 165 + Math.random() * 170;
          const ry = 340 + Math.random() * 16;
          this.puddleRipples.push({
            x: rx,
            y: ry,
            radius: 1,
            maxRadius: 4 + Math.random() * 4,
            alpha: 0.30,
            color: 'rgba(186, 230, 253, ',
          });
        }
      }

      // Update Puddle Ripples
      for (let i = this.puddleRipples.length - 1; i >= 0; i--) {
        const rip = this.puddleRipples[i];
        rip.radius += 0.38;
        const progress = rip.radius / rip.maxRadius;
        rip.alpha = (1 - progress) * 0.45;
        if (rip.radius >= rip.maxRadius) {
          this.puddleRipples.splice(i, 1);
        }
      }

      // Kyoto Zen roof eaves drips
      if (roomId === 'kyoto_zen') {
        if (this.eavesDrips.length < 6 && Math.random() < 0.08) {
          this.eavesDrips.push({
            x: 615 + Math.random() * 255,
            y: 64,
            vy: 1.5 + Math.random() * 1.0,
            length: 4 + Math.random() * 4,
            alpha: 0.70,
          });
        }
        for (let i = this.eavesDrips.length - 1; i >= 0; i--) {
          const drip = this.eavesDrips[i];
          drip.vy += 0.25;
          drip.y += drip.vy;
          drip.length = Math.min(12, drip.length + 0.4);
          if (drip.y > 374) {
            this.puddleRipples.push({
              x: drip.x,
              y: 375,
              radius: 1,
              maxRadius: 7,
              alpha: 0.50,
              color: 'rgba(215, 235, 250, ',
            });
            this.eavesDrips.splice(i, 1);
          }
        }
      } else {
        this.eavesDrips = [];
      }

      // Update Splashes with gravity
      for (let i = this.splashes.length - 1; i >= 0; i--) {
        const sp = this.splashes[i];
        sp.life++;
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vy += 0.20;
        if (sp.life >= sp.maxLife) {
          this.splashes.splice(i, 1);
        }
      }

      // Update Glass Droplets (Stick-Slip Physics, Meandering, Trails & Coalescence)
      if (hasGlass && this.glassDroplets.length > 0) {
        for (let i = this.glassDroplets.length - 1; i >= 0; i--) {
          const d = this.glassDroplets[i];
          const pane = panes[d.paneIndex] || panes[0];

          if (d.stuck) {
            d.slideTimer--;
            // Wind gust breakaway: when wind is high, sudden gusts dislodge stuck droplets
            if (this.currentWindSpeed > 0.70 && Math.random() < 0.05) {
              d.stuck = false;
              d.vy = 0.9 + Math.random() * 1.6;
            }
            if (d.slideTimer <= 0) {
              const slipChance = d.radius > 3.0 ? 0.28 : 0.09;
              if (Math.random() < slipChance) {
                d.stuck = false;
                d.vy = 0.8 + Math.random() * 1.5;
              }
              d.slideTimer = 60 + Math.random() * 240;
            }
          } else {
            // Slipping down the glass with gravity, wind drift, and organic sinusoidal meandering
            d.vy = Math.min(3.6, d.vy + 0.05);
            d.y += d.vy;
            const lateralMeander = Math.sin(d.y * 0.065 + d.paneIndex * 1.5) * 0.38 + this.currentWindSpeed * 0.14;
            d.x += lateralMeander;

            // Keep within pane bounds
            d.x = Math.max(pane.x + 3, Math.min(pane.x + pane.w - 3, d.x));

            // Carve path through condensation mist
            this.clearMistAt(d.x, d.y, d.radius);

            // Add wet trail point
            d.trail.push({
              x: d.x,
              y: d.y,
              alpha: 0.35,
              width: Math.max(1, d.radius * 0.65)
            });
            if (d.trail.length > 14) d.trail.shift();

            // Shed daughter micro-bead in wake
            if (d.y - d.lastTrailY > 26 + Math.random() * 20) {
              d.lastTrailY = d.y;
              if (this.glassDroplets.length < 85 && Math.random() < 0.6) {
                const daughterR = 1.2 + Math.random() * 0.8;
                this.glassDroplets.push({
                  x: d.x + (Math.random() - 0.5) * 2,
                  y: d.y - d.radius - 2,
                  radius: daughterR,
                  mass: daughterR * daughterR,
                  stuck: true,
                  vy: 0,
                  slideTimer: 180 + Math.random() * 300,
                  lastTrailY: d.y,
                  trail: [],
                  alpha: 0.45 + Math.random() * 0.25,
                  paneIndex: d.paneIndex,
                });
              }
              d.mass = Math.max(2, d.mass - 0.5);
              d.radius = Math.sqrt(d.mass);
            }

            // Surface tension friction: if drop gets small or loses speed, it sticks again
            if (d.mass < 4 || Math.random() < 0.012) {
              d.stuck = true;
              d.vy = 0;
              d.slideTimer = 100 + Math.random() * 220;
            }

            // Reset droplet if it falls past bottom sill
            if (d.y > pane.y + pane.h - 4) {
              d.y = pane.y + 4 + Math.random() * 14;
              d.x = pane.x + 4 + Math.random() * (pane.w - 8);
              d.mass = Math.random() < 0.8 ? (1.5 + Math.random() * 2.0) : (3.5 + Math.random() * 3.0);
              d.radius = Math.sqrt(d.mass);
              d.stuck = true;
              d.vy = 0;
              d.trail = [];
              d.lastTrailY = d.y;
              d.slideTimer = 60 + Math.random() * 200;
            }
          }

          // Fade trail opacity
          for (const t of d.trail) {
            t.alpha = Math.max(0, t.alpha - 0.008);
          }

          // Coalescence: merge overlapping droplets in the same pane with kinetic energy release
          if (!d.stuck) {
            for (let j = this.glassDroplets.length - 1; j >= 0; j--) {
              if (j === i) continue;
              const other = this.glassDroplets[j];
              if (other.paneIndex !== d.paneIndex) continue;

              const dx = d.x - other.x;
              const dy = d.y - other.y;
              const dist = Math.hypot(dx, dy);

              if (dist < (d.radius + other.radius) * 0.88) {
                d.mass += other.mass;
                d.radius = Math.min(9.5, Math.sqrt(d.mass));
                d.stuck = false;
                d.vy += 1.8; // Instant surface-energy kinetic burst
                d.slideTimer = 35;
                this.clearMistAt(d.x, d.y, d.radius);

                this.glassDroplets.splice(j, 1);
                if (j < i) i--;
                break;
              }
            }
          }
        }
      }
    } else {
      this.bgRain = [];
      this.fgRain = [];
      this.splashes = [];
    }

    // 2. 3-LAYER CINEMATIC PARALLAX SNOW (Strictly outside window glass panes)
    if (weather === 'snow') {
      const targetSnow = 72;
      // Pre-seed window on first activation so user doesn't see a blank sky waiting for flakes
      if (this.snow.length === 0) {
        for (let i = 0; i < targetSnow; i++) {
          const pIdx = Math.floor(Math.random() * panes.length);
          const p = panes[pIdx];
          const rndLayer = Math.random();
          const layer: 0 | 1 | 2 = rndLayer < 0.48 ? 0 : rndLayer < 0.86 ? 1 : 2;
          this.snow.push({
            x: p.x + 2 + Math.random() * (p.w - 4),
            y: p.y + Math.random() * p.h,
            speed: layer === 0 ? (0.28 + Math.random() * 0.22) : layer === 1 ? (0.55 + Math.random() * 0.35) : (0.88 + Math.random() * 0.45),
            size: layer === 0 ? (0.9 + Math.random() * 0.4) : layer === 1 ? (1.6 + Math.random() * 0.6) : (2.6 + Math.random() * 0.8),
            drift: (Math.random() - 0.5) * (layer === 0 ? 0.08 : layer === 1 ? 0.18 : 0.28),
            phase: Math.random() * Math.PI * 2,
            alpha: layer === 0 ? (0.22 + Math.random() * 0.18) : layer === 1 ? (0.50 + Math.random() * 0.22) : (0.75 + Math.random() * 0.20),
            layer,
            wobbleSpeed: layer === 0 ? (0.012 + Math.random() * 0.01) : layer === 1 ? (0.022 + Math.random() * 0.015) : (0.035 + Math.random() * 0.02),
            paneIndex: pIdx,
          });
        }
      }

      // Continuously replenish flakes at the top of glass panes
      if (this.snow.length < targetSnow && Math.random() < 0.60) {
        const pIdx = Math.floor(Math.random() * panes.length);
        const p = panes[pIdx];
        const rndLayer = Math.random();
        const layer: 0 | 1 | 2 = rndLayer < 0.48 ? 0 : rndLayer < 0.86 ? 1 : 2;
        this.snow.push({
          x: p.x + 2 + Math.random() * (p.w - 4),
          y: p.y - 3 + Math.random() * 3,
          speed: layer === 0 ? (0.28 + Math.random() * 0.22) : layer === 1 ? (0.55 + Math.random() * 0.35) : (0.88 + Math.random() * 0.45),
          size: layer === 0 ? (0.9 + Math.random() * 0.4) : layer === 1 ? (1.6 + Math.random() * 0.6) : (2.6 + Math.random() * 0.8),
          drift: (Math.random() - 0.5) * (layer === 0 ? 0.08 : layer === 1 ? 0.18 : 0.28),
          phase: Math.random() * Math.PI * 2,
          alpha: layer === 0 ? (0.22 + Math.random() * 0.18) : layer === 1 ? (0.50 + Math.random() * 0.22) : (0.75 + Math.random() * 0.20),
          layer,
          wobbleSpeed: layer === 0 ? (0.012 + Math.random() * 0.01) : layer === 1 ? (0.022 + Math.random() * 0.015) : (0.035 + Math.random() * 0.02),
          paneIndex: pIdx,
        });
      }

      for (let i = this.snow.length - 1; i >= 0; i--) {
        const s = this.snow[i];
        const p = panes[s.paneIndex] || panes[0];
        s.phase += s.wobbleSpeed;
        s.y += s.speed;

        // Natural aerodynamic motion: harmonic sine flutter + wind gust sway + layer parallax
        const sway = Math.sin(s.phase) * (s.layer === 2 ? 0.45 : s.layer === 1 ? 0.28 : 0.14);
        const windDrift = this.currentWindSpeed * (s.layer === 2 ? 0.32 : s.layer === 1 ? 0.20 : 0.10);
        s.x += sway + windDrift + s.drift;

        // Strict pane bounds checking: Flakes NEVER escape the glass pane!
        if (s.y > p.y + p.h - 2 || s.x > p.x + p.w - 1 || s.x < p.x + 1) {
          this.snow.splice(i, 1);
        }
      }
    } else {
      this.snow = [];
    }

    // 3. THUNDERSTORM LIGHTNING — Realistic multi-strobe pulse & synchronized thunderclaps
    if (weather === 'storm') {
      const now = performance.now();
      if (this.nextLightningTime === 0) {
        this.nextLightningTime = now + 1200;
      }

      if (now > this.nextLightningTime && this.lightningSequenceIndex >= this.lightningSequence.length) {
        this.lightningSequence = [0.75, 0.25, 1.0, 0.92, 0.70, 0.48, 0.32, 0.18, 0.08, 0];
        this.lightningSequenceIndex = 0;
        this.generateLightningBolt(windowBounds);
        this.nextLightningTime = now + 4500 + Math.random() * 6500;
      }

      if (this.lightningSequenceIndex < this.lightningSequence.length) {
        this.lightningAlpha = this.lightningSequence[this.lightningSequenceIndex];
        if (this.lightningSequenceIndex === 2) {
          setTimeout(() => {
            webAudioEngine.playThunderStrike(0.85 + Math.random() * 0.15);
          }, 120);
        }
        this.lightningSequenceIndex++;
      } else {
        this.lightningAlpha = 0;
        this.currentBolt = null;
      }
    } else {
      this.lightningAlpha = 0;
      this.nextLightningTime = 0;
      this.lightningSequenceIndex = 999;
      this.currentBolt = null;
    }

    // 4. FIREPLACE EMBERS
    if (fireplaceActive && hearthPos) {
      if (Math.random() < 0.35 && this.embers.length < 24) {
        const colors = ['#fde047', '#f59e0b', '#f97316', '#ef4444'];
        this.embers.push({
          x: hearthPos.x + hearthPos.w * 0.5 + (Math.random() - 0.5) * (hearthPos.w * 0.5),
          y: hearthPos.y + hearthPos.h * 0.7,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -0.7 - Math.random() * 1.0,
          life: 0,
          maxLife: 40 + Math.random() * 30,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }

      for (let i = this.embers.length - 1; i >= 0; i--) {
        const e = this.embers[i];
        e.life++;
        e.x += e.vx;
        e.y += e.vy;
        e.vx += (Math.random() - 0.5) * 0.06;
        if (e.life >= e.maxLife) {
          this.embers.splice(i, 1);
        }
      }
    } else {
      this.embers = [];
    }


    // 5.5 FLOATING GOLDEN DUST MOTES (Brownian drift in morning rays and lamp pools)
    const hasDust = timeOfDay === 'morning' || timeOfDay === 'golden_hour' || lampOn;
    if (hasDust) {
      while (this.dust.length < 28) {
        const spawnX = windowBounds ? windowBounds.x - 20 + Math.random() * (windowBounds.w + 180) : Math.random() * 960;
        const spawnY = windowBounds ? windowBounds.y + 40 + Math.random() * (windowBounds.h + 220) : Math.random() * 540;
        this.dust.push({
          x: spawnX,
          y: spawnY,
          vx: (Math.random() - 0.5) * 0.18,
          vy: -0.06 - Math.random() * 0.16,
          radius: 0.75 + Math.random() * 0.95,
          alpha: 0.15 + Math.random() * 0.45,
        });
      }

      for (let i = this.dust.length - 1; i >= 0; i--) {
        const m = this.dust[i];
        m.x += m.vx + Math.sin((m.y + performance.now() * 0.05) * 0.04) * 0.12;
        m.y += m.vy;
        m.vx += (Math.random() - 0.5) * 0.02;
        m.vy += (Math.random() - 0.5) * 0.015;
        m.vx *= 0.98;
        m.vy = Math.min(-0.03, Math.max(-0.30, m.vy * 0.98));

        // Wrap boundaries
        if (m.y < 30) {
          m.y = 500;
          m.x = windowBounds ? windowBounds.x + Math.random() * (windowBounds.w + 120) : Math.random() * 960;
        }
      }
    } else {
      this.dust = [];
    }


    // 5.65 DISTANT SKYSCRAPER WINDOWS (Tokyo Apartment & Cyberpunk Loft)
    if (roomId === 'apartment' || roomId === 'cyberpunk_loft') {
      if (!this.distantWindowsInitialized || this.lastRoomIdForWindows !== roomId) {
        this.distantWindowsInitialized = true;
        this.lastRoomIdForWindows = roomId;
        if (roomId === 'apartment') {
          this.distantWindows = [
            // Left skyscraper cluster (x: 130..170)
            { x: 135, y: 75, baseAlpha: 0.45, phase: 0.1, speed: 0.018, color: '#fef08a' },
            { x: 148, y: 88, baseAlpha: 0.55, phase: 1.2, speed: 0.015, color: '#38bdf8' },
            { x: 142, y: 115, baseAlpha: 0.40, phase: 2.3, speed: 0.022, color: '#fef3c7' },
            { x: 155, y: 130, baseAlpha: 0.65, phase: 3.4, speed: 0.018, color: '#fef08a' },
            { x: 162, y: 95, baseAlpha: 0.45, phase: 0.8, speed: 0.020, color: '#67e8f9' },
            // Center towers behind Shinjuku signs (x: 210..270)
            { x: 215, y: 65, baseAlpha: 0.55, phase: 1.7, speed: 0.019, color: '#fef08a' },
            { x: 228, y: 82, baseAlpha: 0.40, phase: 2.9, speed: 0.016, color: '#fde047' },
            { x: 245, y: 70, baseAlpha: 0.50, phase: 4.1, speed: 0.024, color: '#38bdf8' },
            { x: 255, y: 95, baseAlpha: 0.60, phase: 0.5, speed: 0.019, color: '#fef3c7' },
            { x: 270, y: 85, baseAlpha: 0.40, phase: 3.1, speed: 0.021, color: '#fef08a' },
            // Right towers (x: 295..400)
            { x: 295, y: 110, baseAlpha: 0.65, phase: 2.1, speed: 0.017, color: '#67e8f9' },
            { x: 310, y: 125, baseAlpha: 0.50, phase: 1.4, speed: 0.023, color: '#fef08a' },
            { x: 325, y: 140, baseAlpha: 0.55, phase: 4.5, speed: 0.018, color: '#fef3c7' },
            { x: 375, y: 75, baseAlpha: 0.45, phase: 0.9, speed: 0.020, color: '#38bdf8' },
            { x: 390, y: 95, baseAlpha: 0.55, phase: 3.6, speed: 0.016, color: '#fef08a' },
            { x: 400, y: 120, baseAlpha: 0.40, phase: 2.2, speed: 0.025, color: '#fde047' },
          ];
        } else {
          // Cyberpunk Loft neon megalopolis skyline (x: 540..920, y: 60..240)
          this.distantWindows = [
            { x: 545, y: 85, baseAlpha: 0.55, phase: 0.2, speed: 0.020, color: '#38bdf8' },
            { x: 560, y: 110, baseAlpha: 0.65, phase: 1.4, speed: 0.017, color: '#f43f5e' },
            { x: 580, y: 70, baseAlpha: 0.45, phase: 2.8, speed: 0.022, color: '#a855f7' },
            { x: 615, y: 95, baseAlpha: 0.70, phase: 0.9, speed: 0.018, color: '#38bdf8' },
            { x: 635, y: 125, baseAlpha: 0.50, phase: 3.5, speed: 0.025, color: '#fef08a' },
            { x: 670, y: 80, baseAlpha: 0.60, phase: 1.9, speed: 0.016, color: '#f43f5e' },
            { x: 710, y: 105, baseAlpha: 0.55, phase: 4.2, speed: 0.021, color: '#38bdf8' },
            { x: 745, y: 65, baseAlpha: 0.45, phase: 0.6, speed: 0.019, color: '#67e8f9' },
            { x: 780, y: 90, baseAlpha: 0.65, phase: 2.4, speed: 0.023, color: '#fef3c7' },
            { x: 815, y: 115, baseAlpha: 0.50, phase: 3.1, speed: 0.018, color: '#f43f5e' },
            { x: 850, y: 75, baseAlpha: 0.70, phase: 1.1, speed: 0.020, color: '#38bdf8' },
            { x: 885, y: 100, baseAlpha: 0.45, phase: 2.6, speed: 0.024, color: '#a855f7' },
            { x: 910, y: 120, baseAlpha: 0.60, phase: 4.0, speed: 0.017, color: '#fef08a' },
          ];
        }
      }
      for (const dw of this.distantWindows) {
        dw.phase += dw.speed;
      }
    } else {
      this.distantWindowsInitialized = false;
      this.distantWindows = [];
    }

    // 5.7 MIDNIGHT TWINKLING STARS & ETHEREAL SHOOTING STARS
    const isNightSky = timeOfDay === 'midnight' && (weather === 'clear' || weather === 'snow');
    if (isNightSky && windowBounds) {
      if (!this.twinkleStarsInitialized) {
        this.twinkleStarsInitialized = true;
        this.twinkleStars = [];
        for (let i = 0; i < 22; i++) {
          this.twinkleStars.push({
            x: windowBounds.x + 8 + Math.random() * (windowBounds.w - 16),
            y: windowBounds.y + 6 + Math.random() * (windowBounds.h * 0.45),
            baseAlpha: 0.35 + Math.random() * 0.45,
            phase: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.02 + Math.random() * 0.03,
          });
        }
      }

      for (const ts of this.twinkleStars) {
        ts.phase += ts.twinkleSpeed;
      }

      this.shootingStarTimer++;
      if (this.shootingStarTimer > 900 && Math.random() < 0.012 && this.shootingStars.length === 0) {
        this.shootingStarTimer = 0;
        this.shootingStars.push({
          x: windowBounds.x + windowBounds.w * 0.70 + Math.random() * 40,
          y: windowBounds.y + 8 + Math.random() * 25,
          vx: -3.8 - Math.random() * 1.8,
          vy: 2.0 + Math.random() * 1.0,
          length: 22 + Math.random() * 14,
          alpha: 0.95,
          life: 0,
          maxLife: 26,
        });
      }

      for (let i = this.shootingStars.length - 1; i >= 0; i--) {
        const ss = this.shootingStars[i];
        ss.life++;
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.alpha = 1 - (ss.life / ss.maxLife);
        if (ss.life >= ss.maxLife) {
          this.shootingStars.splice(i, 1);
        }
      }
    } else {
      this.twinkleStarsInitialized = false;
      this.twinkleStars = [];
      this.shootingStars = [];
    }

    // 6. PURR HEARTS
    for (let i = this.hearts.length - 1; i >= 0; i--) {
      const h = this.hearts[i];
      h.life++;
      h.y += h.vy;
      if (h.life >= h.maxLife) {
        this.hearts.splice(i, 1);
      }
    }

    // 7. SLEEPING CAT "Zzz" FLOATING PIXEL PARTICLES
    if (catBox) {
      this.zzzTimer++;
      if (this.zzzTimer >= 140) {
        this.zzzTimer = 0;
        const letters = ['z', 'Z', 'z', 'Zzz'];
        const text = letters[Math.floor(Math.random() * letters.length)];
        const startX = catBox.x + catBox.w * 0.35 + (Math.random() * 4 - 2);
        const startY = catBox.y + 2;
        this.zzzParticles.push({
          x: startX,
          y: startY,
          text,
          size: text === 'Zzz' ? 10 : text === 'Z' ? 9 : 7.5,
          alpha: 0,
          vy: 0.09 + Math.random() * 0.04,
          phase: Math.random() * Math.PI * 2,
          life: 0,
          maxLife: 280 + Math.random() * 50,
        });
      }

      for (let i = this.zzzParticles.length - 1; i >= 0; i--) {
        const p = this.zzzParticles[i];
        p.life++;
        p.y -= p.vy;
        p.phase += 0.018;
        p.x += Math.sin(p.phase) * 0.15;

        const normalized = p.life / p.maxLife;
        p.alpha = Math.sin(normalized * Math.PI) * 0.82;

        if (p.life >= p.maxLife) {
          this.zzzParticles.splice(i, 1);
        }
      }
    } else {
      this.zzzParticles = [];
    }
  }

  public renderWindowWeather(
    ctx: CanvasRenderingContext2D, 
    windowBounds: { x: number; y: number; w: number; h: number },
    windowPolygon?: { x: number; y: number }[],
    windowPanes?: { x: number; y: number; w: number; h: number }[],
    weather?: WeatherType,
    roomId?: string,
    bgImage?: HTMLImageElement
  ) {
    // CRITICAL: Strict clipping so weather NEVER spills onto wooden frames, mullions, or interior walls!
    ctx.save();
    ctx.beginPath();
    const activePanes = windowPanes && windowPanes.length > 0 ? windowPanes : null;
    if (activePanes) {
      for (const p of activePanes) {
        ctx.rect(p.x, p.y, p.w, p.h);
      }
    } else if (windowPolygon && windowPolygon.length >= 3) {
      ctx.moveTo(windowPolygon[0].x, windowPolygon[0].y);
      for (let i = 1; i < windowPolygon.length; i++) {
        ctx.lineTo(windowPolygon[i].x, windowPolygon[i].y);
      }
      ctx.closePath();
    } else {
      ctx.rect(windowBounds.x, windowBounds.y, windowBounds.w, windowBounds.h);
    }
    ctx.clip();

    const now = performance.now();
    const isRaining = weather === 'rain' || weather === 'heavy_rain' || weather === 'storm';

    // 0. THUNDERSTORM: SKY FLASH & JAGGED BOLT (Inside window glass)
    if (this.lightningAlpha > 0.04) {
      ctx.fillStyle = `rgba(219, 234, 254, ${this.lightningAlpha * 0.55})`;
      ctx.fillRect(windowBounds.x, windowBounds.y, windowBounds.w, windowBounds.h);

      if (this.currentBolt && this.lightningAlpha > 0.20) {
        ctx.save();
        ctx.strokeStyle = `rgba(147, 197, 253, ${Math.min(1.0, this.lightningAlpha * 1.2)})`;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        const pts = this.currentBolt.points;
        if (pts.length > 0) {
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
        }
        for (const branch of this.currentBolt.branches) {
          if (branch.length > 0) {
            ctx.moveTo(branch[0].x, branch[0].y);
            for (let i = 1; i < branch.length; i++) {
              ctx.lineTo(branch[i].x, branch[i].y);
            }
          }
        }
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1.0, this.lightningAlpha * 1.5)})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
      }
    }

    const hasGlass = roomId !== 'kyoto_zen';


    // 2. Background Rain — high-performance batched stroke with streetlamp warm light
    if (this.bgRain.length > 0) {
      const isStorm = weather === 'storm';
      const isHeavy = weather === 'heavy_rain' || isStorm;
      const slant = (isStorm ? 0.28 : isHeavy ? 0.22 : 0.16) + this.currentWindSpeed * 0.08;
      ctx.save();
      ctx.lineWidth = 0.9;

      if (roomId === 'cafe') {
        // Separate cool streaks vs golden backlit streaks near the streetlamp
        ctx.beginPath();
        for (const r of this.bgRain) {
          const distToLamp = Math.hypot(r.x - 72, r.y - 105);
          if (distToLamp >= 100) {
            ctx.moveTo(r.x, r.y);
            ctx.lineTo(r.x - r.length * slant, r.y + r.length);
          }
        }
        ctx.strokeStyle = `rgba(186, 230, 253, ${(0.24 * this.rainIntensity).toFixed(2)})`;
        ctx.stroke();

        ctx.beginPath();
        for (const r of this.bgRain) {
          const distToLamp = Math.hypot(r.x - 72, r.y - 105);
          if (distToLamp < 100) {
            ctx.moveTo(r.x, r.y);
            ctx.lineTo(r.x - r.length * slant, r.y + r.length);
          }
        }
        ctx.strokeStyle = `rgba(255, 220, 130, ${(0.45 * this.rainIntensity).toFixed(2)})`;
        ctx.stroke();
      } else {
        ctx.strokeStyle = `rgba(186, 230, 253, ${(0.24 * this.rainIntensity).toFixed(2)})`;
        ctx.beginPath();
        for (const r of this.bgRain) {
          ctx.moveTo(r.x, r.y);
          ctx.lineTo(r.x - r.length * slant, r.y + r.length);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Foreground Rain — crisp motion-blurred streaks with lamp illumination
    if (this.fgRain.length > 0) {
      const isStorm = weather === 'storm';
      const isHeavy = weather === 'heavy_rain' || isStorm;
      const slant = (isStorm ? 0.28 : isHeavy ? 0.22 : 0.16) + this.currentWindSpeed * 0.08;
      ctx.save();
      ctx.lineWidth = 1.3;

      if (roomId === 'cafe') {
        ctx.beginPath();
        for (const r of this.fgRain) {
          const distToLamp = Math.hypot(r.x - 72, r.y - 105);
          if (distToLamp >= 100) {
            ctx.moveTo(r.x, r.y);
            ctx.lineTo(r.x - r.length * slant, r.y + r.length);
          }
        }
        ctx.strokeStyle = `rgba(215, 238, 255, ${(0.42 * this.rainIntensity).toFixed(2)})`;
        ctx.stroke();

        ctx.beginPath();
        for (const r of this.fgRain) {
          const distToLamp = Math.hypot(r.x - 72, r.y - 105);
          if (distToLamp < 100) {
            ctx.moveTo(r.x, r.y);
            ctx.lineTo(r.x - r.length * slant, r.y + r.length);
          }
        }
        ctx.strokeStyle = `rgba(255, 225, 140, ${(0.70 * this.rainIntensity).toFixed(2)})`;
        ctx.stroke();
      } else {
        ctx.strokeStyle = `rgba(215, 238, 255, ${(0.42 * this.rainIntensity).toFixed(2)})`;
        ctx.beginPath();
        for (const r of this.fgRain) {
          ctx.moveTo(r.x, r.y);
          ctx.lineTo(r.x - r.length * slant, r.y + r.length);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3.5 Ground Puddle Ripples (Wet cobblestones, garden path, veranda)
    if (this.puddleRipples.length > 0) {
      ctx.save();
      ctx.lineWidth = 1.0;
      for (const rip of this.puddleRipples) {
        ctx.strokeStyle = rip.color + rip.alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.ellipse(Math.round(rip.x), Math.round(rip.y), rip.radius, rip.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3.6 Kyoto Zen Eaves Rain Drips
    if (this.eavesDrips.length > 0) {
      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.75)';
      ctx.beginPath();
      for (const d of this.eavesDrips) {
        ctx.moveTo(d.x, d.y - d.length);
        ctx.lineTo(d.x, d.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 4. Splash droplets strictly on glass sill
    if (this.splashes.length > 0) {
      for (const sp of this.splashes) {
        const lifeRatio = 1 - sp.life / sp.maxLife;
        ctx.fillStyle = `rgba(225, 245, 255, ${(sp.alpha * lifeRatio).toFixed(2)})`;
        ctx.fillRect(Math.round(sp.x), Math.round(sp.y), 1.5, 1.5);
      }
    }

    // 5. MASTERPIECE DISCRETE PIXEL-ART GLASS DROPLETS & WET TRAILS (Coffee Talk / Celeste Style)
    if (hasGlass && this.glassDroplets.length > 0) {
      // Pass 1: Delicate 1px wet trails behind sliding drops
      ctx.save();
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = 'rgba(215, 235, 255, 0.20)';
      ctx.beginPath();
      for (const d of this.glassDroplets) {
        if (d.trail.length > 1) {
          for (let i = 0; i < d.trail.length - 1; i++) {
            const t1 = d.trail[i];
            const t2 = d.trail[i + 1];
            if (t1.alpha <= 0.02) continue;
            ctx.moveTo(Math.round(t1.x), Math.round(t1.y));
            ctx.lineTo(Math.round(t2.x), Math.round(t2.y));
          }
        }
      }
      ctx.stroke();
      ctx.restore();

      // Pass 2: Discrete Pixel-Art Droplet Beads
      for (const d of this.glassDroplets) {
        const px = Math.round(d.x);
        const py = Math.round(d.y);
        const r = Math.round(d.radius);

        if (r <= 2) {
          // 1-2px Micro-Bead: 1 bright specular glint px + 1 translucent body px + 1 subtle shadow px
          ctx.fillStyle = `rgba(255, 255, 255, ${(d.alpha * 0.85).toFixed(2)})`;
          ctx.fillRect(px, py, 1, 1);
          ctx.fillStyle = `rgba(210, 235, 255, ${(d.alpha * 0.45).toFixed(2)})`;
          ctx.fillRect(px + 1, py, 1, 1);
          ctx.fillStyle = `rgba(15, 23, 42, ${(d.alpha * 0.30).toFixed(2)})`;
          ctx.fillRect(px, py + 1, 2, 1);
        } else {
          // 3-4px Teardrop Cluster:
          ctx.fillStyle = `rgba(255, 255, 255, ${(d.alpha * 0.90).toFixed(2)})`;
          ctx.fillRect(px, py, 1, 1); // Specular highlight
          ctx.fillStyle = `rgba(220, 240, 255, ${(d.alpha * 0.50).toFixed(2)})`;
          ctx.fillRect(px + 1, py, r - 1, 1);
          ctx.fillRect(px - 1, py + 1, r + 1, r - 1);
          ctx.fillStyle = `rgba(15, 23, 42, ${(d.alpha * 0.32).toFixed(2)})`;
          ctx.fillRect(px, py + r, r, 1); // Meniscus bottom shadow
        }
      }
    }

    // 6. 3-Layer Parallax Snow Flakes (Layer 0 = Distant, Layer 1 = Midground, Layer 2 = Foreground Fluffy)
    if (this.snow.length > 0) {
      for (const s of this.snow) {
        if (s.layer === 0) {
          // Distant micro-flake
          ctx.fillStyle = `rgba(215, 235, 255, ${s.alpha.toFixed(2)})`;
          ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
        } else if (s.layer === 1) {
          // Midground drifting flake
          ctx.fillStyle = `rgba(240, 249, 255, ${s.alpha.toFixed(2)})`;
          const sz = Math.round(s.size);
          ctx.fillRect(Math.round(s.x), Math.round(s.y), sz, sz);
        } else {
          // Foreground fluffy flake with soft circular body
          ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 7. Midnight Twinkling Stars (Inside upper window sky)
    if (this.twinkleStars.length > 0) {
      for (const ts of this.twinkleStars) {
        const pulse = Math.sin(ts.phase);
        const alpha = Math.max(0.1, ts.baseAlpha + pulse * 0.25);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
        ctx.fillRect(Math.round(ts.x), Math.round(ts.y), 1.5, 1.5);
      }
    }

    // 8. Midnight Ethereal Shooting Stars
    if (this.shootingStars.length > 0) {
      ctx.save();
      for (const ss of this.shootingStars) {
        const grad = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.vx * 3.5, ss.y - ss.vy * 3.5);
        grad.addColorStop(0, `rgba(255, 255, 255, ${ss.alpha.toFixed(2)})`);
        grad.addColorStop(0.3, `rgba(186, 230, 253, ${(ss.alpha * 0.7).toFixed(2)})`);
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(ss.x - ss.vx * 2.8, ss.y - ss.vy * 2.8);
        ctx.stroke();

        // Bright star head
        ctx.fillStyle = `rgba(255, 255, 255, ${ss.alpha.toFixed(2)})`;
        ctx.fillRect(Math.round(ss.x), Math.round(ss.y), 2, 2);
      }
      ctx.restore();
    }


    ctx.restore();
  }

  public renderInteriorEffects(ctx: CanvasRenderingContext2D) {
    // 1. Fireplace Spark Embers
    this.embers.forEach((e) => {
      const alpha = 1 - e.life / e.maxLife;
      ctx.fillStyle = e.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(Math.round(e.x), Math.round(e.y), 2.5, 2.5);
    });
    ctx.globalAlpha = 1;


    // 3. Floating Golden Dust Motes (Brownian motion in sunbeams & lamp glow)
    if (this.dust.length > 0) {
      ctx.save();
      for (const d of this.dust) {
        if (d.alpha <= 0.02) continue;
        ctx.fillStyle = `rgba(254, 243, 199, ${d.alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(Math.round(d.x), Math.round(d.y), d.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Cat Purr Hearts (On user click)
    this.hearts.forEach((h) => {
      const progress = h.life / h.maxLife;
      const alpha = 1 - progress;
      ctx.fillStyle = `rgba(244, 63, 94, ${alpha})`;
      const px = Math.round(h.x);
      const py = Math.round(h.y);
      ctx.fillRect(px + 1, py, 2, 2);
      ctx.fillRect(px + 4, py, 2, 2);
      ctx.fillRect(px, py + 2, 7, 2);
      ctx.fillRect(px + 1, py + 4, 5, 2);
      ctx.fillRect(px + 2, py + 6, 3, 1);
      ctx.fillRect(px + 3, py + 7, 1, 1);
    });

    // 5. Sleeping Cat "Zzz" Floating Particles
    if (this.zzzParticles.length > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const p of this.zzzParticles) {
        if (p.alpha <= 0.01) continue;
        ctx.font = `bold ${p.size}px monospace`;
        ctx.fillStyle = `rgba(15, 10, 5, ${p.alpha * 0.65})`;
        ctx.fillText(p.text, p.x + 0.8, p.y + 0.8);

        ctx.fillStyle = `rgba(254, 243, 199, ${p.alpha})`;
        ctx.fillText(p.text, p.x, p.y);
      }
      ctx.restore();
    }
  }
}

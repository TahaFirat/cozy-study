import { SceneContext } from './types';
import { ParticleSystem } from './ParticleSystem';
import { LightingSystem } from './LightingSystem';
import { InteractiveObjectId, RoomId } from '../types';
import { ROOM_CONFIGS, RoomConfig } from './roomConfigs';

const GLOBAL_IMAGE_CACHE: Partial<Record<RoomId, HTMLImageElement>> = {};

export class PixelRenderer {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public width = 960;
  public height = 540;

  public particleSystem: ParticleSystem;
  public lightingSystem: LightingSystem;

  private isRunning = false;
  private animationFrameId: number | null = null;
  public currentRoomId: RoomId = 'bedroom';

  // Cached bounding rect — updated by ResizeObserver, not on every mousemove
  private cachedRect: DOMRect | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Cached hovered hotspot — avoid find() every animation frame
  private cachedHoveredId: InteractiveObjectId | null = null;
  private cachedHotspot: { x: number; y: number; w: number; h: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not obtain 2D canvas context');
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;

    this.particleSystem = new ParticleSystem();
    this.lightingSystem = new LightingSystem();

    this.preloadRoomImages();

    // Cache bounding rect via ResizeObserver (avoids layout thrash on every mousemove)
    this.cachedRect = this.canvas.getBoundingClientRect();
    this.resizeObserver = new ResizeObserver(() => {
      this.cachedRect = this.canvas.getBoundingClientRect();
    });
    this.resizeObserver.observe(this.canvas);
  }

  private preloadRoomImages() {
    Object.values(ROOM_CONFIGS).forEach((cfg) => {
      if (!GLOBAL_IMAGE_CACHE[cfg.id]) {
        const img = new Image();
        img.src = cfg.imageSrc;
        GLOBAL_IMAGE_CACHE[cfg.id] = img;
      }
    });
  }

  public getRoomConfig(roomId: RoomId): RoomConfig {
    return ROOM_CONFIGS[roomId] || ROOM_CONFIGS.bedroom;
  }

  public getHoveredObject(clientX: number, clientY: number, roomId: RoomId): InteractiveObjectId | null {
    const rect = this.cachedRect ?? this.canvas.getBoundingClientRect();
    const scaleX = this.width / rect.width;
    const scaleY = this.height / rect.height;
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    const cfg = this.getRoomConfig(roomId);

    // Check hotspots (reverse order)
    for (let i = cfg.hotspots.length - 1; i >= 0; i--) {
      const h = cfg.hotspots[i];
      if (
        canvasX >= h.x && canvasX <= h.x + h.w &&
        canvasY >= h.y && canvasY <= h.y + h.h
      ) {
        return h.id;
      }
    }
    return null;
  }

  public start(getContext: () => SceneContext) {
    if (this.isRunning) return;
    this.isRunning = true;

    let lastTime = performance.now();
    const loop = (time: number) => {
      if (!this.isRunning) return;
      const delta = Math.min(100, Math.max(1, time - lastTime));
      lastTime = time;
      const sceneCtx = getContext();
      if (this.currentRoomId !== sceneCtx.roomId) {
        this.currentRoomId = sceneCtx.roomId;
      }

      this.update(sceneCtx, delta);
      this.render(sceneCtx);

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    // Clean up ResizeObserver to avoid memory leak
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  private update(sceneCtx: SceneContext, delta = 16) {
    const cfg = this.getRoomConfig(sceneCtx.roomId);

    // 1. Update Particles
    this.particleSystem.update(
      sceneCtx.weather,
      sceneCtx.fireplaceActive,
      sceneCtx.mugHot,
      cfg.mug,
      cfg.hearth,
      cfg.windowBounds,
      cfg.cat,
      cfg.windowPanes,
      sceneCtx.timeOfDay,
      sceneCtx.roomId,
      sceneCtx.lampOn
    );

    // 2. Update Lighting
    this.lightingSystem.update(sceneCtx.lampOn, sceneCtx.fireplaceActive, sceneCtx.isPlayingMusic);
  }

  private render(sceneCtx: SceneContext) {
    const ctx = this.ctx;
    const cfg = this.getRoomConfig(sceneCtx.roomId);
    // 1. BASE BACKGROUND IMAGE (Masterpiece 32-Bit Pixel Art)
    const bgImage = GLOBAL_IMAGE_CACHE[sceneCtx.roomId];
    if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
      ctx.drawImage(bgImage, 0, 0, this.width, this.height);
    } else {
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. DYNAMIC WINDOW RAIN & GLASS PHYSICS (Strictly clipped inside glass panes)
    this.renderWindowWeatherEffects(cfg, sceneCtx.weather, bgImage);

    // 3. ANIMATED HEARTH FLAMES (Living flickering pixel flame & embers from artwork)
    this.renderAnimatedFireplace(bgImage, cfg.hearth, sceneCtx.fireplaceActive);

    // 3.5 LIVING INTERIOR MICRO-DETAILS (Candle flame, monitor phosphor & terminal wash)
    this.renderLivingMicroDetails(sceneCtx, cfg);

    // 4. LIVING INTERIOR PARTICLES (Fireplace embers, hot mug steam, cat purr hearts, sleeping Zzz)
    this.particleSystem.renderInteriorEffects(ctx);

    // 5. DYNAMIC ATMOSPHERIC LIGHTING & COLOR GRADING LAYER
    this.lightingSystem.renderLighting(
      ctx,
      this.width,
      this.height,
      sceneCtx.timeOfDay,
      sceneCtx.weather,
      sceneCtx.inFocusSession,
      this.particleSystem.lightningAlpha,
      cfg.lamp,
      cfg.hearth,
      cfg.windowBounds,
      sceneCtx.isPlayingMusic
    );

    // 6. HOVER HIGHLIGHT RETICLE
    if (sceneCtx.hoveredObject) {
      this.renderHoverHighlight(sceneCtx.hoveredObject, cfg);
    }
  }

  // --- LIVING WINDOW WEATHER (Strictly clipped inside window glass) ---
  private renderWindowWeatherEffects(
    cfg: RoomConfig, 
    weather: SceneContext['weather'],
    bgImage?: HTMLImageElement
  ) {
    const ctx = this.ctx;
    const wb = cfg.windowBounds;

    // Render Falling Rain / Snow / Water Droplets strictly inside the glass panes
    // Note: renderWindowWeather clips strictly to cfg.windowPanes, so mullions and exterior structures remain 100% pristine!
    this.particleSystem.renderWindowWeather(ctx, wb, cfg.windowPolygon, cfg.windowPanes, weather, cfg.id, bgImage);
  }

  // --- PHYSICS-BASED FLUID FIREPLACE DYNAMICS ---
  // Physically-grounded combustion and heat dissipation:
  // 1. Horizontal scanline fluid undulation (ZERO vertical cuts, ZERO barcode seams)
  // 2. ZERO dark box shading — preserves authentic artist fireplace stone work 100%
  // 3. Strouhal vortex core temperature breathing & turbulent flare pulses
  // 4. Physical aerodynamic buoyant ember sparks (drag, convective rise, cooling)
  // 5. Breathing glowing coal bed under the oak logs
  // 6. Warm ambient firelight reflection on surrounding stone arch
  private renderAnimatedFireplace(
    bgImage: HTMLImageElement | undefined,
    hearth?: { x: number; y: number; w: number; h: number },
    active?: boolean
  ) {
    if (!hearth || !active || !bgImage || !bgImage.complete || bgImage.naturalWidth === 0) return;
    const ctx = this.ctx;
    const now = performance.now();

    const scaleX = bgImage.naturalWidth / this.width;
    const scaleY = bgImage.naturalHeight / this.height;

    const flameX = hearth.x;
    const flameW = hearth.w;
    const flameY = hearth.y;
    const flameH = hearth.h * 0.76; // Flame height above logs

    ctx.save();

    // 1. SEAMLESS HORIZONTAL SCANLINE FLAME UNDULATION:
    // Slices HORIZONTALLY along Y from logs up to flame tips.
    // Every row spans the FULL flame width (no vertical comb cuts!).
    // Row height = 2px (matching pixel art resolution).
    const rowStep = 2;
    const logsY = flameY + flameH;
    const tFast = now * 0.011;
    const tMid = now * 0.0055;

    for (let y = flameY; y < logsY; y += rowStep) {
      const hNorm = Math.max(0, (logsY - y) / flameH); // 0 at logs (base), 1.0 at flame tips
      // Physical fluid wave: 0 at logs, increasing smoothly toward tips
      const wave1 = Math.sin(tFast + y * 0.075);
      const wave2 = Math.cos(tMid * 1.8 + y * 0.12 + 0.6);
      const shiftX = (wave1 * 0.6 + wave2 * 0.4) * (2.4 * Math.pow(hNorm, 1.5));
      const scaleW = 1.0 + (Math.sin(tFast * 1.3 + y * 0.09) * 0.03 * hNorm);

      if (Math.abs(shiftX) > 0.06 || Math.abs(scaleW - 1) > 0.005) {
        const srcX = flameX * scaleX;
        const srcY = y * scaleY;
        const srcW = flameW * scaleX;
        const srcH = rowStep * scaleY;

        const destW = flameW * scaleW;
        const destX = flameX + shiftX - (destW - flameW) * 0.5;

        ctx.drawImage(
          bgImage,
          srcX, srcY, srcW, srcH,
          destX, y, destW, rowStep
        );
      }
    }

    // 2. RE-ANCHOR OAK LOGS & IRON GRATE (Base stays 100% rock-solid and crisp)
    const logsTopY = hearth.y + hearth.h * 0.70;
    const logsHeight = hearth.h * 0.30;
    ctx.drawImage(
      bgImage,
      flameX * scaleX, logsTopY * scaleY, flameW * scaleX, logsHeight * scaleY,
      flameX, logsTopY, flameW, logsHeight
    );

    // 3. PLANCK BLACKBODY TEMPERATURE CYCLE (Core Combustion Luminance):
    // Hot core flares naturally at ~4-7 Hz (buoyant eddy shedding Strouhal frequency)
    const tCore = now * 0.001;
    const coreTurbulence = 0.85 
      + 0.12 * Math.sin(tCore * 2 * Math.PI * 4.2)
      + 0.08 * Math.cos(tCore * 2 * Math.PI * 6.8)
      + 0.05 * Math.sin(tCore * 2 * Math.PI * 11.4);

    ctx.globalCompositeOperation = 'lighter';
    const coreCenterX = flameX + flameW * 0.5 + Math.sin(now * 0.004) * 2;
    const coreCenterY = flameY + flameH * 0.55;
    const coreRadius = flameW * 0.36;

    const coreGrad = ctx.createRadialGradient(
      coreCenterX, coreCenterY, 3,
      coreCenterX, coreCenterY, coreRadius
    );
    coreGrad.addColorStop(0, `rgba(254, 240, 138, ${0.22 * coreTurbulence})`);
    coreGrad.addColorStop(0.5, `rgba(245, 158, 11, ${0.14 * coreTurbulence})`);
    coreGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(flameX - 10, flameY, flameW + 20, flameH + 10);

    // 4. INCANDESCENT CHARCOAL BED BREATHING (Under logs)
    const bedPulse = 0.65 + Math.sin(now * 0.0022) * 0.22 + Math.cos(now * 0.0013) * 0.12;
    const bedGrad = ctx.createRadialGradient(
      flameX + flameW * 0.5, logsTopY + logsHeight * 0.35, 3,
      flameX + flameW * 0.5, logsTopY + logsHeight * 0.35, flameW * 0.45
    );
    bedGrad.addColorStop(0, `rgba(251, 146, 60, ${0.28 * bedPulse})`);
    bedGrad.addColorStop(0.55, `rgba(220, 38, 38, ${0.20 * bedPulse})`);
    bedGrad.addColorStop(1, 'rgba(153, 27, 27, 0)');
    ctx.fillStyle = bedGrad;
    ctx.fillRect(flameX, logsTopY, flameW, logsHeight);

    // 5. AERODYNAMIC BUOYANT EMBER SPARKS (Physical Trajectories):
    // Ejected from hot wood, rising into chimney with convection draft and cooling
    ctx.globalCompositeOperation = 'source-over';
    const sparkLoop = (now * 0.0009);
    for (let s = 0; s < 6; s++) {
      const p = (sparkLoop + s * 0.18) % 1.0;
      const seed = s * 37 + 11;
      const startX = flameX + flameW * (0.28 + 0.44 * (Math.sin(seed) * 0.5 + 0.5));
      const startY = logsTopY + 4;
      
      // Upward convective acceleration with slight deceleration at top
      const driftX = Math.sin(p * Math.PI * 3 + seed) * (4 + p * 6);
      const sparkX = startX + driftX;
      const sparkY = startY - p * (flameH + 28);
      const alpha = Math.sin(p * Math.PI) * 0.95;

      if (p > 0.04 && p < 0.94) {
        // Temperature cooling: White -> Yellow -> Golden Amber -> Ember Red
        ctx.fillStyle = p < 0.28
          ? `rgba(255, 255, 255, ${alpha})`
          : p < 0.60
          ? `rgba(254, 240, 138, ${alpha})`
          : p < 0.82
          ? `rgba(249, 115, 22, ${alpha})`
          : `rgba(220, 38, 38, ${alpha * 0.7})`;
        const sz = p < 0.35 ? 2 : 1;
        ctx.fillRect(Math.round(sparkX), Math.round(sparkY), sz, sz);
      }
    }

    ctx.restore();
  }

  // --- LIVING INTERIOR MICRO-DETAILS ---
  private renderLivingMicroDetails(sceneCtx: SceneContext, cfg: RoomConfig) {
    const ctx = this.ctx;
    const now = performance.now();

    // A. Living Lantern Dancing Flame (Cabin Kerosene Lantern)
    if (sceneCtx.lampOn && sceneCtx.roomId === 'cabin') {
      ctx.save();
      const flameBaseX = 502;
      const flameBaseY = 368;

      const flickerX = Math.sin(now * 0.015) * 1.2;
      const flameHeight = 4.5 + Math.sin(now * 0.022) * 1.2;

      // Outer soft amber glow halo
      const haloGrad = ctx.createRadialGradient(flameBaseX, flameBaseY, 1, flameBaseX, flameBaseY, 12);
      haloGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      haloGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.2)');
      haloGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(flameBaseX, flameBaseY, 12, 0, Math.PI * 2);
      ctx.fill();

      // Teardrop flame body
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(flameBaseX - 1.5, flameBaseY);
      ctx.quadraticCurveTo(flameBaseX - 1.8, flameBaseY - flameHeight * 0.5, flameBaseX + flickerX, flameBaseY - flameHeight);
      ctx.quadraticCurveTo(flameBaseX + 1.8, flameBaseY - flameHeight * 0.5, flameBaseX + 1.5, flameBaseY);
      ctx.closePath();
      ctx.fill();

      // Hot white flame core
      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(Math.round(flameBaseX - 0.75), Math.round(flameBaseY - flameHeight * 0.5), 1.5, 2);
      ctx.restore();
    }

    // B. Cafe Edison Bulb Filament Breathing (Warm Amber Bloom)
    if (sceneCtx.roomId === 'cafe' && sceneCtx.lampOn) {
      ctx.save();
      const fPulse = 0.93 + Math.sin(now * 0.016) * 0.07;
      const bulbGrad = ctx.createRadialGradient(416, 156, 3, 416, 156, 46);
      bulbGrad.addColorStop(0, `rgba(254, 240, 138, ${(0.40 * fPulse).toFixed(3)})`);
      bulbGrad.addColorStop(0.4, `rgba(245, 158, 11, ${(0.20 * fPulse).toFixed(3)})`);
      bulbGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
      ctx.fillStyle = bulbGrad;
      ctx.fillRect(380, 120, 72, 72);

      // Delicate dual-loop incandescent filament
      ctx.strokeStyle = `rgba(255, 255, 235, ${(0.85 * fPulse).toFixed(3)})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(413, 146);
      ctx.bezierCurveTo(411, 155, 413, 164, 416, 166);
      ctx.bezierCurveTo(419, 164, 421, 155, 419, 146);
      ctx.stroke();
      ctx.restore();
    }

    // C. Kyoto Zen Washi Paper Lantern Subsurface Glow
    if (sceneCtx.roomId === 'kyoto_zen' && sceneCtx.lampOn) {
      ctx.save();
      const zPulse = 0.92 + Math.sin(now * 0.0035) * 0.08;
      const zGrad = ctx.createRadialGradient(215, 170, 5, 215, 170, 55);
      zGrad.addColorStop(0, `rgba(255, 237, 213, ${(0.32 * zPulse).toFixed(3)})`);
      zGrad.addColorStop(0.5, `rgba(251, 146, 60, ${(0.14 * zPulse).toFixed(3)})`);
      zGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = zGrad;
      ctx.fillRect(170, 110, 90, 120);
      ctx.restore();
    }

    // D. Library Banker's Desk Lamp Emerald Pool
    if (sceneCtx.roomId === 'library' && sceneCtx.lampOn) {
      ctx.save();
      const bGrad = ctx.createRadialGradient(555, 345, 6, 555, 365, 75);
      bGrad.addColorStop(0, 'rgba(74, 222, 128, 0.15)');
      bGrad.addColorStop(0.45, 'rgba(254, 240, 138, 0.07)');
      bGrad.addColorStop(1, 'rgba(22, 101, 52, 0)');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.ellipse(555, 380, 85, 45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // --- PHYSICAL DESK STICKY NOTE (North Star Goal) ---
  private renderDeskStickyNote(sceneCtx: SceneContext, cfg: RoomConfig) {
    if (!cfg.stickyNote) return;
    const ctx = this.ctx;
    const { x, y, w, h, rot = 0 } = cfg.stickyNote;

    ctx.save();
    ctx.translate(x + w * 0.5, y + h * 0.5);
    ctx.rotate((rot * Math.PI) / 180);

    // 1. Soft paper drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.fillRect(-w * 0.5 + 2, -h * 0.5 + 2, w, h);

    // 2. Post-It Yellow Body
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-w * 0.5, -h * 0.5, w, h);

    // 3. Top adhesive strip (warm amber)
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-w * 0.5, -h * 0.5, w, 5);

    // 4. Curled dog-ear bottom-right corner
    const dogEar = 6;
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - dogEar, h * 0.5);
    ctx.lineTo(w * 0.5, h * 0.5 - dogEar);
    ctx.lineTo(w * 0.5, h * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fef9c3';
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - dogEar, h * 0.5);
    ctx.lineTo(w * 0.5, h * 0.5 - dogEar);
    ctx.lineTo(w * 0.5 - dogEar, h * 0.5 - dogEar);
    ctx.closePath();
    ctx.fill();

    // 5. Paper outline
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(-w * 0.5, -h * 0.5, w, h);

    // 6. Text / Goal / Ruled lines
    const goal = sceneCtx.currentGoal?.trim();
    if (goal) {
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('★', -w * 0.5 + 3, -h * 0.5 + 13);

      ctx.fillStyle = '#451a03';
      ctx.font = 'bold 6px sans-serif';
      if (goal.length <= 8) {
        ctx.fillText(goal, -w * 0.5 + 10, -h * 0.5 + 12);
      } else {
        const line1 = goal.slice(0, 8);
        const line2 = goal.length > 16 ? goal.slice(8, 15) + '…' : goal.slice(8);
        ctx.fillText(line1, -w * 0.5 + 10, -h * 0.5 + 11);
        ctx.fillText(line2, -w * 0.5 + 3, -h * 0.5 + 18);
      }

      // Sub-badge: "2x CRIT"
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 5.5px monospace';
      ctx.fillText('⚡2x CRIT', -w * 0.5 + 3, -h * 0.5 + 26);
    } else {
      ctx.fillStyle = '#ca8a04';
      ctx.font = 'bold 7px sans-serif';
      ctx.fillText('✦ HEDEF', -w * 0.5 + 4, -h * 0.5 + 13);

      ctx.strokeStyle = 'rgba(202, 138, 4, 0.45)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-w * 0.5 + 4, -h * 0.5 + 19);
      ctx.lineTo(w * 0.5 - 7, -h * 0.5 + 19);
      ctx.moveTo(-w * 0.5 + 4, -h * 0.5 + 25);
      ctx.lineTo(w * 0.5 - 7, -h * 0.5 + 25);
      ctx.stroke();
    }

    ctx.restore();
  }

  // --- TANGIBLE BOSS RAID TROPHIES ---
  private renderBossTrophies(sceneCtx: SceneContext, cfg: RoomConfig) {
    const trophies = sceneCtx.unlockedTrophies || [];
    if (trophies.length === 0) return;

    const ctx = this.ctx;
    const now = performance.now();
    const shelf = cfg.trophyShelf || cfg.trophyDesk;
    if (!shelf) return;

    // 1. Horologium's Golden Hourglass (Left on Shelf)
    if (trophies.includes('trophy_hourglass')) {
      const x = shelf.x - 22;
      const y = shelf.y;
      ctx.save();
      // Ambient golden breathing halo
      const pulse = 0.5 + Math.sin(now * 0.003) * 0.3;
      const grad = ctx.createRadialGradient(x + 10, y + 12, 2, x + 10, y + 12, 16);
      grad.addColorStop(0, `rgba(251, 191, 36, ${(0.3 * pulse).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - 10, y - 8, 40, 40);

      // Contact drop shadow on shelf wood
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(x + 1, y + 23, 18, 2);

      // Golden brass top/bottom caps
      ctx.fillStyle = '#d97706';
      ctx.fillRect(x + 2, y, 16, 2.5);
      ctx.fillRect(x + 2, y + 20, 16, 2.5);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(x + 4, y + 1, 12, 1);
      ctx.fillRect(x + 4, y + 21, 12, 1);

      // Glass bulb & sand
      ctx.fillStyle = 'rgba(224, 242, 254, 0.45)';
      ctx.fillRect(x + 5, y + 3, 10, 16);

      // Golden sand pile at bottom
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x + 6, y + 14, 8, 5);
      // Falling sand trickle
      ctx.fillRect(x + 9, y + 6, 2, 7);

      // Brass pillars
      ctx.fillStyle = '#b45309';
      ctx.fillRect(x + 3, y + 2, 1.5, 18);
      ctx.fillRect(x + 15, y + 2, 1.5, 18);

      // Star gleam
      if (Math.sin(now * 0.005) > 0.6) {
        ctx.fillStyle = '#fffbeb';
        ctx.fillRect(x + 3, y + 1, 2, 2);
      }
      ctx.restore();
    }

    // 2. Acedia's Zen Incense Censer (Center-Left on Shelf)
    if (trophies.includes('trophy_censer')) {
      const x = shelf.x + 2;
      const y = shelf.y + 3;
      ctx.save();
      // Contact shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.fillRect(x + 2, y + 18, 14, 2);

      // Celadon ceramic bowl
      ctx.fillStyle = '#0f766e';
      ctx.beginPath();
      ctx.arc(x + 9, y + 11, 7, 0, Math.PI);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#14b8a6';
      ctx.fillRect(x + 3, y + 10, 12, 1.8);

      // Incense stick
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 9, y + 10);
      ctx.lineTo(x + 11, y - 1);
      ctx.stroke();

      // Glowing ember tip
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x + 10.5, y - 2, 1.5, 1.5);

      // Sinuous curling lavender smoke
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.32)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      const smokeStartY = y - 2;
      ctx.moveTo(x + 11, smokeStartY);
      for (let s = 1; s <= 16; s += 2) {
        const swX = x + 11 + Math.sin(now * 0.004 + s * 0.45) * (s * 0.35);
        const swY = smokeStartY - s;
        ctx.lineTo(swX, swY);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 3. Cacophony's Prism Focus Crystal (Center-Right on Ornate Brass Stand)
    if (trophies.includes('trophy_prism_crystal')) {
      const cx = shelf.x + 24;
      const cy = shelf.y + 4;
      ctx.save();
      const pPulse = 0.6 + Math.sin(now * 0.005) * 0.4;

      // Soft caustic glow
      const cGrad = ctx.createRadialGradient(cx + 6, cy + 6, 1, cx + 6, cy + 6, 12);
      cGrad.addColorStop(0, `rgba(6, 182, 212, ${(0.28 * pPulse).toFixed(3)})`);
      cGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = cGrad;
      ctx.fillRect(cx - 6, cy - 6, 24, 24);

      // Contact drop shadow on shelf
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.fillRect(cx - 1, cy + 16, 14, 2.5);

      // Ornate Brass Pedestal Stand
      ctx.fillStyle = '#b45309';
      ctx.fillRect(cx, cy + 13, 12, 2.5);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(cx + 1, cy + 13, 10, 0.8);
      // Brass mounting prongs
      ctx.fillStyle = '#d97706';
      ctx.fillRect(cx + 1, cy + 8, 1.5, 5);
      ctx.fillRect(cx + 9.5, cy + 8, 1.5, 5);

      // Gemstone Crystal Facet Body
      ctx.fillStyle = '#0891b2';
      ctx.beginPath();
      ctx.moveTo(cx + 6, cy);
      ctx.lineTo(cx + 11, cy + 7);
      ctx.lineTo(cx + 6, cy + 13);
      ctx.lineTo(cx + 1, cy + 7);
      ctx.closePath();
      ctx.fill();

      // Front Refractive Facet Highlight
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.moveTo(cx + 6, cy);
      ctx.lineTo(cx + 6, cy + 13);
      ctx.lineTo(cx + 1, cy + 7);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#67e8f9';
      ctx.beginPath();
      ctx.moveTo(cx + 6, cy + 2);
      ctx.lineTo(cx + 9, cy + 7);
      ctx.lineTo(cx + 6, cy + 11);
      ctx.closePath();
      ctx.fill();

      // Specular shine spark
      if (Math.sin(now * 0.006) > 0.3) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx + 5, cy + 4, 1.8, 1.8);
      }
      ctx.restore();
    }

    // 4. Oblivion's Eternal Chrono-Crown (Right on Royal Velvet Pillow)
    if (trophies.includes('trophy_eternal_crown')) {
      const cx = shelf.x + 44;
      const cy = shelf.y + 6;
      ctx.save();
      // Contact shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.fillRect(cx, cy + 16, 22, 2.5);

      // Royal velvet cushion
      ctx.fillStyle = '#881337';
      ctx.fillRect(cx, cy + 12, 22, 5);
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(cx + 2, cy + 13, 18, 3);
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(cx + 4, cy + 13, 14, 1);

      // Golden Crown with 5 peaks
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(cx + 1, cy + 12);
      ctx.lineTo(cx + 1, cy + 5);
      ctx.lineTo(cx + 5, cy + 8);
      ctx.lineTo(cx + 11, cy + 2);
      ctx.lineTo(cx + 17, cy + 8);
      ctx.lineTo(cx + 21, cy + 5);
      ctx.lineTo(cx + 21, cy + 12);
      ctx.closePath();
      ctx.fill();

      // Ruby jewels on crown peaks
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(cx + 1, cy + 4, 1.8, 1.8);
      ctx.fillRect(cx + 10, cy + 1, 2.2, 2.2);
      ctx.fillRect(cx + 20, cy + 4, 1.8, 1.8);

      // Royal sparkling aura
      if (Math.sin(now * 0.007) > 0.4) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx + 10, cy, 2, 2);
      }
      ctx.restore();
    }
  }

  // --- PRECISION STUDIO HOVER RETICLE ---
  private renderHoverHighlight(objectId: InteractiveObjectId, cfg: RoomConfig) {
    const ctx = this.ctx;

    // Windows are scenic backdrops; avoid drawing obtrusive full-wall reticle boxes over nature
    if (objectId === 'window') return;

    // Cache the find result — only redo when objectId changes
    if (this.cachedHoveredId !== objectId) {
      this.cachedHoveredId = objectId;
      this.cachedHotspot = cfg.hotspots.find((h) => h.id === objectId) ?? null;
    }
    const targetBox = this.cachedHotspot;
    if (!targetBox) return;

    const now = performance.now();
    const pulse = 0.55 + Math.sin(now * 0.007) * 0.35;
    const pad = 4;
    const x = targetBox.x - pad;
    const y = targetBox.y - pad;
    const w = targetBox.w + pad * 2;
    const h = targetBox.h + pad * 2;
    const cornerLen = Math.min(10, Math.min(w, h) * 0.28);

    ctx.save();
    // Distinct Studio Viewfinder Corner Brackets (no harsh full-box wireframe or opaque fill)
    ctx.strokeStyle = `rgba(251, 191, 36, ${(0.75 + pulse * 0.25).toFixed(3)})`;
    ctx.lineWidth = 1.5;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(x, y + cornerLen);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerLen, y);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(x + w - cornerLen, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + cornerLen);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(x, y + h - cornerLen);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + cornerLen, y + h);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(x + w - cornerLen, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - cornerLen);
    ctx.stroke();

    // Center focal indicator
    ctx.fillStyle = `rgba(251, 191, 36, ${(pulse * 0.9).toFixed(3)})`;
    ctx.fillRect(Math.round(x + w * 0.5 - 1), Math.round(y + h * 0.5 - 1), 2, 2);

    ctx.restore();
  }
}

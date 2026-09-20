// ============================================================================
// Chronos Realm: Game-Grade Boss Sprite & Combat Animation Engine
// Features preloaded authentic 32-bit RPG character sprites, dynamic idle physics
// (breathing, hover levitation, spring recoil), procedural aura/ember particles,
// trauma screen shake, katana slash VFX, floating combat numbers & defeat dissolution.
// ============================================================================

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  isCritical: boolean;
  color: string;
  alpha: number;
  scale: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export interface ImpactParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

export interface SlashEffect {
  x: number;
  y: number;
  angle: number;
  progress: number;
  length: number;
  color: string;
}

export class BossPixelRenderer {
  private images: Record<string, HTMLImageElement> = {};
  private imagesLoaded: Record<string, boolean> = {};

  private arenaImages: Record<string, HTMLImageElement> = {};
  private arenaImagesLoaded: Record<string, boolean> = {};

  private floatingTexts: FloatingText[] = [];
  private particles: ImpactParticle[] = [];
  private ambientParticles: { x: number; y: number; vy: number; vx: number; size: number; alpha: number; color: string }[] = [];
  private currentSlash: SlashEffect | null = null;
  
  // Trauma / Screen shake
  private shakeTime = 0;
  private shakeDuration = 0;
  private shakeMagnitude = 0;

  // Hurt / Hit Flash & Recoil
  private hitFlashTimer = 0;
  private hitFlashType: 'none' | 'white' | 'red' = 'none';
  private recoilX = 0;
  private recoilY = 0;

  // Defeat explosion particles
  private defeatParticles: { x: number; y: number; vx: number; vy: number; color: string; size: number; alpha: number }[] = [];

  constructor() {
    const bossIds = ['horologium', 'acedia', 'cacophony', 'oblivion'];
    bossIds.forEach((id) => {
      // 1. Boss Character Sprites
      const img = new Image();
      img.src = `/sprites/bosses/boss_${id}.png`;
      img.onload = () => {
        this.imagesLoaded[id] = true;
      };
      this.images[id] = img;

      // 2. High-Quality Scenic Arena Backgrounds
      const arenaImg = new Image();
      arenaImg.src = `/rooms/arenas/arena_${id}.jpg`;
      arenaImg.onload = () => {
        this.arenaImagesLoaded[id] = true;
      };
      this.arenaImages[id] = arenaImg;
    });
  }

  public clearCombatVFX() {
    this.floatingTexts = [];
    this.particles = [];
    this.defeatParticles = [];
    this.currentSlash = null;
    this.shakeTime = 0;
    this.hitFlashTimer = 0;
    this.hitFlashType = 'none';
    this.recoilX = 0;
    this.recoilY = 0;
  }

  // Trigger hit reaction from store or click
  public triggerHit(damage: number, isCritical: boolean, bossThemeColor: string) {
    // Snappy, crisp micro-shake (3-5px)
    this.shakeDuration = isCritical ? 0.2 : 0.14;
    this.shakeTime = this.shakeDuration;
    this.shakeMagnitude = isCritical ? 5 : 3;

    // Crisp 0.08s hit flinch
    this.hitFlashTimer = 0.08;
    this.hitFlashType = 'white';

    // Downward punch recoil
    this.recoilX = 0;
    this.recoilY = isCritical ? -4 : -2.5;

    // Fast, sleek slash arc
    const angle = -Math.PI / 4;
    this.currentSlash = {
      x: 240,
      y: 125,
      angle,
      progress: 0,
      length: isCritical ? 120 : 90,
      color: isCritical ? '#fbbf24' : '#f87171',
    };

    // Clean floating combat text
    this.floatingTexts.push({
      id: `dmg-${Date.now()}-${Math.random()}`,
      x: 240 + (Math.random() - 0.5) * 30,
      y: 75,
      text: isCritical ? `⚡ CRIT -${damage}` : `-${damage}`,
      isCritical,
      color: isCritical ? '#fbbf24' : '#ef4444',
      alpha: 1.0,
      scale: 1.0,
      vx: 0,
      vy: -1.8,
      life: 0,
      maxLife: 0.9,
    });

    // Clean, tight impact spark burst (4-8 particles)
    const count = isCritical ? 8 : 4;
    for (let i = 0; i < count; i++) {
      const spd = 1.8 + Math.random() * 2.5;
      const ang = Math.random() * Math.PI * 2;
      this.particles.push({
        x: 240,
        y: 125,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 0.8,
        color: isCritical ? '#fbbf24' : '#f87171',
        size: 2,
        alpha: 1.0,
        life: 0.3 + Math.random() * 0.2,
      });
    }
  }

  // Trigger defeat explosion
  public triggerDefeat(bossThemeColor: string) {
    this.shakeDuration = 0.9;
    this.shakeTime = 0.9;
    this.shakeMagnitude = 12;

    this.hitFlashTimer = 0.35;
    this.hitFlashType = 'white';

    for (let i = 0; i < 90; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1 + Math.random() * 5.5;
      this.defeatParticles.push({
        x: 240 + (Math.random() - 0.5) * 60,
        y: 130 + (Math.random() - 0.5) * 60,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 2.0,
        color: Math.random() > 0.4 ? '#fbbf24' : (Math.random() > 0.5 ? '#ffffff' : bossThemeColor),
        size: 2 + Math.floor(Math.random() * 3),
        alpha: 1.0,
      });
    }
  }

  // Master Render Frame
  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    bossId: 'horologium' | 'acedia' | 'cacophony' | 'oblivion',
    currentHp: number,
    maxHp: number,
    isDefeated: boolean,
    themeColor: string,
    dt: number,
    time: number
  ) {
    ctx.imageSmoothingEnabled = false;

    // Update Shake
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const intensity = (this.shakeTime / this.shakeDuration) * this.shakeMagnitude;
      shakeX = (Math.random() - 0.5) * intensity * 2;
      shakeY = (Math.random() - 0.5) * intensity * 2;
    }

    // Update Hit Flash state
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      if (this.hitFlashTimer > 0.04) {
        this.hitFlashType = 'white';
      } else if (this.hitFlashTimer > 0) {
        this.hitFlashType = 'red';
      } else {
        this.hitFlashType = 'none';
      }
    } else {
      this.hitFlashType = 'none';
    }

    // Update Spring Recoil
    this.recoilX *= Math.pow(0.04, dt);
    this.recoilY *= Math.pow(0.04, dt);

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 1. SCENIC PIXEL ART ARENA BACKGROUND
    this.renderArenaBackground(ctx, width, height, bossId, themeColor, time);

    // 2. NATURAL FLOOR CONTACT SHADOW
    const cx = width / 2;
    const groundY = Math.round(height * 0.82);
    if (!isDefeated) {
      this.renderFloorContactShadow(ctx, cx, groundY, bossId, time);
    }

    // 3. SPRITE RENDERING
    const hpRatio = Math.max(0, currentHp / maxHp);
    ctx.save();
    if (!isDefeated) {
      // Fluid idle hover & organic breathing
      const isFloating = bossId === 'acedia';
      const idleHover = isFloating ? Math.sin(time * 0.003) * 6 : 0;
      const idleBreath = Math.sin(time * 0.004) * 0.012;

      let spriteSize = Math.round(height * 0.74);
      if (bossId === 'oblivion') spriteSize = Math.round(height * 0.78);
      if (bossId === 'cacophony') spriteSize = Math.round(height * 0.73);
      if (bossId === 'acedia') spriteSize = Math.round(height * 0.71);

      let baseCenterY = groundY - (spriteSize / 2);
      if (bossId === 'acedia') baseCenterY -= 12; // Floating ghost slightly elevated

      ctx.translate(cx + this.recoilX, baseCenterY + idleHover + this.recoilY);
      ctx.scale(1 + idleBreath, 1 - idleBreath);

      // Hit Flash filter (gentle and dignified, no blinding overexposure)
      if (this.hitFlashType === 'white') {
        ctx.filter = 'brightness(1.3) contrast(1.15) sepia(0.2)';
      } else if (this.hitFlashType === 'red') {
        ctx.filter = 'brightness(1.15) saturate(1.6) hue-rotate(-25deg)';
      } else {
        ctx.filter = 'none';
      }

      // Draw the Boss Character Sprite
      this.renderBossSprite(ctx, bossId, spriteSize, themeColor, time, hpRatio);
    } else {
      // Defeated State: Royal Victory Crown & Dissolution
      this.renderDefeatedBoss(ctx, cx, 130, time, themeColor);
    }
    ctx.restore();

    // 4. COMBAT SLASH VFX
    this.renderSlash(ctx, dt);

    // 5. IMPACT PARTICLES
    this.renderParticles(ctx, dt);

    // 6. DEFEAT DISSOLUTION PARTICLES
    this.renderDefeatParticles(ctx, dt);

    // 7. FLOATING COMBAT TEXT
    this.renderFloatingText(ctx, dt);

    // 8. ENRAGED CINEMATIC VIGNETTE (<25% HP)
    if (!isDefeated) {
      this.renderEnragedVignette(ctx, width, height, time, hpRatio);
    }

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // SCENIC PIXEL ART ARENA BACKGROUND (Warm, atmospheric, rich)
  // --------------------------------------------------------------------------
  private renderArenaBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    bossId: 'horologium' | 'acedia' | 'cacophony' | 'oblivion',
    themeColor: string,
    time: number
  ) {
    const arenaImg = this.arenaImages[bossId];
    const isLoaded = this.arenaImagesLoaded[bossId];

    if (arenaImg && isLoaded) {
      // Draw scenic pixel art arena image covering the canvas cleanly
      ctx.drawImage(arenaImg, 0, 0, width, height);

      // Delicate floor depth shading at the bottom
      const floorGrad = ctx.createLinearGradient(0, height * 0.72, 0, height);
      floorGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      floorGrad.addColorStop(1, 'rgba(10, 8, 14, 0.42)');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, height * 0.72, width, height * 0.28);
    } else {
      // Warm stone/wood gradient fallback while loading
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#1c1622');
      bgGrad.addColorStop(0.7, '#141018');
      bgGrad.addColorStop(1, '#0e0b12');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    }
  }

  // --------------------------------------------------------------------------
  // NATURAL FLOOR CONTACT SHADOW (Grounds characters realistically into scenery)
  // --------------------------------------------------------------------------
  private renderFloorContactShadow(
    ctx: CanvasRenderingContext2D,
    cx: number,
    groundY: number,
    bossId: 'horologium' | 'acedia' | 'cacophony' | 'oblivion',
    time: number
  ) {
    ctx.save();
    if (bossId === 'horologium') {
      // Deep contact shadow directly under mechanical boots
      ctx.fillStyle = 'rgba(10, 7, 5, 0.7)';
      ctx.beginPath();
      ctx.ellipse(cx, groundY, 52, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(20, 14, 10, 0.35)';
      ctx.beginPath();
      ctx.ellipse(cx, groundY + 1, 80, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (bossId === 'oblivion') {
      // Giant stone colossus heavy floor shadow
      ctx.fillStyle = 'rgba(10, 7, 7, 0.75)';
      ctx.beginPath();
      ctx.ellipse(cx, groundY, 78, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(30, 18, 12, 0.38)';
      ctx.beginPath();
      ctx.ellipse(cx, groundY + 2, 110, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (bossId === 'cacophony') {
      // Talon contact shadow on reflective cyber floor
      ctx.fillStyle = 'rgba(8, 12, 16, 0.65)';
      ctx.beginPath();
      ctx.ellipse(cx, groundY, 48, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(15, 22, 30, 0.3)';
      ctx.beginPath();
      ctx.ellipse(cx, groundY + 1, 72, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (bossId === 'acedia') {
      // Floating phantom hovering shadow that dynamically scales
      const hoverY = Math.sin(time * 0.003) * 6;
      const shadowScale = 1 - (hoverY / 6) * 0.15;
      ctx.fillStyle = 'rgba(18, 10, 30, 0.45)';
      ctx.beginPath();
      ctx.ellipse(cx, groundY + 3, 56 * shadowScale, 13 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // ENRAGED MODE VIGNETTE (<25% HP - Subtle, atmospheric red tint)
  // --------------------------------------------------------------------------
  private renderEnragedVignette(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    hpRatio: number
  ) {
    if (hpRatio >= 0.25) return;

    ctx.save();
    const intensity = Math.min(1.0, (0.25 - hpRatio) / 0.25);
    const pulse = 0.7 + Math.sin(time * 0.004) * 0.3;

    // Subtle atmospheric red tint on borders
    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.sqrt(cx * cx + cy * cy);
    const grad = ctx.createRadialGradient(cx, cy, maxRadius * 0.55, cx, cy, maxRadius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.8, `rgba(185, 28, 28, ${0.1 * intensity * pulse})`);
    grad.addColorStop(1, `rgba(127, 29, 29, ${0.28 * intensity * pulse})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // BOSS CHARACTER SPRITE RENDERING (Clean, unhampered)
  // --------------------------------------------------------------------------
  private renderBossSprite(
    ctx: CanvasRenderingContext2D,
    bossId: 'horologium' | 'acedia' | 'cacophony' | 'oblivion',
    spriteSize: number,
    themeColor: string,
    time: number,
    hpRatio: number
  ) {
    const img = this.images[bossId];
    const isLoaded = this.imagesLoaded[bossId];

    if (!img || !isLoaded) {
      ctx.fillStyle = themeColor;
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⏳ LOADING...', 0, 0);
      return;
    }

    const halfSize = spriteSize / 2;

    // Render the sprite with crisp pixel rendering
    ctx.drawImage(img, -halfSize, -halfSize, spriteSize, spriteSize);
  }

  // --------------------------------------------------------------------------
  // DEFEATED STATE: ROYAL CROWN & GOLDEN DISSOLUTION
  // --------------------------------------------------------------------------
  private renderDefeatedBoss(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    time: number,
    themeColor: string
  ) {
    ctx.save();
    ctx.translate(cx, cy);

    const pulse = 0.5 + Math.sin(time * 0.005) * 0.3;
    ctx.fillStyle = 'rgba(251, 191, 36, 0.28)';
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0, Math.PI * 2);
    ctx.fill();

    const crownBob = Math.sin(time * 0.003) * 6;
    ctx.translate(0, -10 + crownBob);

    ctx.fillStyle = '#78350f';
    ctx.fillRect(-38, 12, 76, 14);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-36, 10, 72, 12);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-34, 12, 68, 4);

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-36, 10);
    ctx.lineTo(-28, -18);
    ctx.lineTo(-14, 10);
    ctx.lineTo(0, -28);
    ctx.lineTo(14, 10);
    ctx.lineTo(28, -18);
    ctx.lineTo(36, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -4, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(-21, 0, 5, 0, Math.PI * 2);
    ctx.arc(21, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1.5, -38, 3, 10);
    ctx.fillRect(-5, -34.5, 10, 3);

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // COMBAT SLASH VFX
  // --------------------------------------------------------------------------
  private renderSlash(ctx: CanvasRenderingContext2D, dt: number) {
    if (!this.currentSlash) return;

    this.currentSlash.progress += dt * 5.0;
    if (this.currentSlash.progress >= 1.0) {
      this.currentSlash = null;
      return;
    }

    const { x, y, angle, progress, length, color } = this.currentSlash;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const halfLen = length / 2;
    const currentLen = length * Math.min(1.0, progress * 1.8);
    const alpha = Math.max(0, 1.0 - progress);

    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-halfLen, 0);
    ctx.lineTo(-halfLen + currentLen, 0);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-halfLen + 12, 0);
    ctx.lineTo(-halfLen + currentLen - 6, 0);
    ctx.stroke();

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // PARTICLES
  // --------------------------------------------------------------------------
  private renderParticles(ctx: CanvasRenderingContext2D, dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.16;
      p.alpha -= dt * 2.2;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1.0;
  }

  private renderDefeatParticles(ctx: CanvasRenderingContext2D, dt: number) {
    for (let i = this.defeatParticles.length - 1; i >= 0; i--) {
      const p = this.defeatParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.06;
      p.alpha -= dt * 0.65;

      if (p.alpha <= 0) {
        this.defeatParticles.splice(i, 1);
        continue;
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1.0;
  }

  // --------------------------------------------------------------------------
  // FLOATING COMBAT TEXT
  // --------------------------------------------------------------------------
  private renderFloatingText(ctx: CanvasRenderingContext2D, dt: number) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.life += dt;
      t.x += t.vx;
      t.y += t.vy;
      t.vy *= 0.94;

      if (t.life > t.maxLife * 0.6) {
        t.alpha = Math.max(0, 1.0 - (t.life - t.maxLife * 0.6) / (t.maxLife * 0.4));
      }

      if (t.life >= t.maxLife) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);
      ctx.globalAlpha = t.alpha;

      ctx.font = t.isCritical ? '900 19px "Courier New", monospace' : 'bold 16px "Courier New", monospace';
      ctx.fillStyle = '#000000';
      ctx.fillText(t.text, 2, 2);

      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 0, 0);

      if (t.isCritical) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.strokeText(t.text, 0, 0);
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }
}

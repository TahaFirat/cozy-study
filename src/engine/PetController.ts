import { RoomId, WeatherType, TimeOfDay } from '../types';
import { ROOM_CONFIGS, CozySpot } from './roomConfigs';
import { webAudioEngine } from '../audio/WebAudioEngine';

export type PetFsmState = 
  | 'sleeping_curled' 
  | 'waking_up' 
  | 'stretching' 
  | 'walking' 
  | 'sitting_down' 
  | 'curling_loaf'
  | 'rolling_belly'
  | 'grooming_paw'
  | 'butt_wiggle_pounce'
  | 'peeking_tall';

const SPRITE_CACHE: Record<string, HTMLImageElement> = {};
const PATCH_CACHE: Record<string, HTMLImageElement> = {};

function getImage(src: string): HTMLImageElement {
  if (!SPRITE_CACHE[src]) {
    const img = new Image();
    img.src = src;
    SPRITE_CACHE[src] = img;
  }
  return SPRITE_CACHE[src];
}

function getPatchImage(src: string): HTMLImageElement {
  if (!PATCH_CACHE[src]) {
    const img = new Image();
    img.src = src;
    PATCH_CACHE[src] = img;
  }
  return PATCH_CACHE[src];
}

export class PetController {
  public x = 750;
  public y = 445;
  public w = 78;
  public h = 50;
  public facing: 1 | -1 = -1; // 1 = right, -1 = left
  public state: PetFsmState = 'sleeping_curled';

  public currentRoomId: RoomId = 'bedroom';
  public currentSpotIndex = 0;
  public targetSpotIndex = 0;

  // Animation Timers & Procedural Animation Variables
  private stateTimer = 0;
  private breatheTime = 0;
  private actionTime = 0;
  private lastRandomBehavior = '';

  // Locomotion (Sub-pixel smooth quadruped trot)
  private walkProgress = 0;
  private walkDuration = 3200;
  private walkStartX = 0;
  private walkStartY = 0;
  private walkTargetX = 0;
  private walkTargetY = 0;
  private walkFrameIndex = 0;
  private walkStepPhase = 0;
  private lastStepBeat = -1;

  // Cartoon Squash & Stretch / Procedural Physics
  private squashX = 1.0;
  private squashY = 1.0;
  private bounceY = 0;
  private jumpX = 0;
  private jumpY = 0;
  private rotation = 0;
  private shakeX = 0;
  private pouncePhase: 'wiggle' | 'leap' | 'land' = 'wiggle';

  // Floating Zzz particles
  private zzzParticles: Array<{ x: number; y: number; alpha: number; size: number; vy: number }> = [];
  private zzzSpawnTimer = 0;

  // Hearts trigger callback
  public onHeartTrigger?: (x: number, y: number) => void;

  constructor() {
    this.preloadAllSprites();
  }

  private preloadAllSprites() {
    const breeds = ['calico', 'tabby'];
    const names = [
      'walk_0', 'walk_1', 'walk_2', 'walk_3', 
      'wake', 'mrrp', 'stretch', 'sit', 'loaf', 'sleep',
      'roll', 'groom', 'pounce', 'peek'
    ];
    breeds.forEach((breed) => {
      names.forEach((name) => {
        getImage(`/sprites/cat/${breed}/${name}.png`);
      });
    });

    const patchSources = [
      '/rooms/patches/bedroom_rug.png',
      '/rooms/patches/apartment_cushion.png',
      '/rooms/patches/cabin_rug.png',
      '/rooms/patches/kyoto_cushion.png',
    ];
    patchSources.forEach((src) => getPatchImage(src));
  }

  private resetTransforms() {
    this.squashX = 1.0;
    this.squashY = 1.0;
    this.bounceY = 0;
    this.jumpX = 0;
    this.jumpY = 0;
    this.rotation = 0;
    this.shakeX = 0;
  }

  public setRoom(roomId: RoomId) {
    if (this.currentRoomId === roomId) return;
    this.currentRoomId = roomId;
    const cfg = ROOM_CONFIGS[roomId] || ROOM_CONFIGS.bedroom;
    const spots = cfg.cozySpots || [];
    this.currentSpotIndex = 0;
    this.targetSpotIndex = 0;
    this.state = 'sleeping_curled';
    this.stateTimer = 0;
    this.actionTime = 0;
    this.walkProgress = 0;
    this.zzzParticles = [];
    this.resetTransforms();

    if (spots.length > 0) {
      this.x = spots[0].x;
      this.y = spots[0].y;
      this.facing = spots[0].facing;
    } else {
      this.x = cfg.cat.x;
      this.y = cfg.cat.y;
      this.facing = -1;
    }
  }

  public getHitbox(): { x: number; y: number; w: number; h: number } {
    return {
      x: this.x - this.w * 0.55,
      y: this.y - this.h * 0.85,
      w: this.w * 1.1,
      h: this.h * 1.15,
    };
  }

  public hitTest(canvasX: number, canvasY: number): boolean {
    const hb = this.getHitbox();
    const margin = 18; // comfortable generous petting radius
    return (
      canvasX >= hb.x - margin &&
      canvasX <= hb.x + hb.w + margin &&
      canvasY >= hb.y - margin &&
      canvasY <= hb.y + hb.h + margin
    );
  }

  /**
   * Interactive Click/Pet Handler: Triggers rich random cartoon behaviors!
   */
  public onPetClick(): { x: number; y: number } {
    const petPos = { x: this.x, y: this.y - 15 };

    if (this.onHeartTrigger) {
      this.onHeartTrigger(petPos.x, petPos.y);
    }

    this.zzzParticles = []; // Clear sleeping particles immediately
    this.resetTransforms();
    this.actionTime = 0;

    // Rich deck of cartoon actions
    const candidateBehaviors: PetFsmState[] = [
      'rolling_belly',
      'butt_wiggle_pounce',
      'grooming_paw',
      'peeking_tall',
      'stretching',
      'walking',
    ];

    // Filter out the immediate last behavior so every click feels surprising and fresh!
    const available = candidateBehaviors.filter((b) => b !== this.lastRandomBehavior);
    const chosen = available[Math.floor(Math.random() * available.length)];
    this.lastRandomBehavior = chosen;

    switch (chosen) {
      case 'rolling_belly': {
        this.state = 'rolling_belly';
        this.stateTimer = 2600;
        webAudioEngine.playCatPurr();
        // Burst extra floating hearts on belly roll!
        if (this.onHeartTrigger) {
          setTimeout(() => this.onHeartTrigger?.(this.x + 8, this.y - 20), 400);
          setTimeout(() => this.onHeartTrigger?.(this.x - 8, this.y - 24), 800);
        }
        break;
      }

      case 'butt_wiggle_pounce': {
        this.state = 'butt_wiggle_pounce';
        this.pouncePhase = 'wiggle';
        this.stateTimer = 2400;
        break;
      }

      case 'grooming_paw': {
        this.state = 'grooming_paw';
        this.stateTimer = 2600;
        webAudioEngine.playCatPurr();
        break;
      }

      case 'peeking_tall': {
        this.state = 'peeking_tall';
        this.stateTimer = 2200;
        webAudioEngine.playCatChirp();
        break;
      }

      case 'stretching': {
        this.state = 'stretching';
        this.stateTimer = 1800;
        webAudioEngine.playCatChirp();
        break;
      }

      case 'walking':
      default: {
        this.startWalkingToNextSpot();
        webAudioEngine.playCatChirp();
        break;
      }
    }

    return petPos;
  }

  public onUserFocusStart() {
    this.state = 'sleeping_curled';
    this.stateTimer = 0;
    this.resetTransforms();
  }

  public update(delta: number, _weather: WeatherType, _timeOfDay: TimeOfDay, _inFocus: boolean) {
    this.breatheTime += delta * 0.0028;

    // --- State Machine Updates ---
    switch (this.state) {
      case 'rolling_belly': {
        this.actionTime += delta;
        this.stateTimer -= delta;

        // Rocking side-to-side belly wiggle physics
        this.rotation = Math.sin(this.actionTime * 0.007) * 0.14;
        this.squashX = 1.0 + Math.sin(this.actionTime * 0.012) * 0.05;
        this.squashY = 1.0 - Math.sin(this.actionTime * 0.012) * 0.05;

        if (this.stateTimer <= 0) {
          this.resetTransforms();
          this.state = 'sitting_down';
          this.stateTimer = 1800;
        }
        break;
      }

      case 'butt_wiggle_pounce': {
        this.actionTime += delta;
        this.stateTimer -= delta;

        if (this.actionTime < 1100) {
          // Phase 1: Crouch & rapid playful hip waggle
          this.pouncePhase = 'wiggle';
          this.shakeX = Math.sin(this.actionTime * 0.038) * 3.5;
          this.squashX = 1.14;
          this.squashY = 0.86;
        } else if (this.actionTime < 1650) {
          // Phase 2: Cartoon parabolic spring leap!
          this.pouncePhase = 'leap';
          this.shakeX = 0;
          const leapT = (this.actionTime - 1100) / 550;
          this.jumpY = -Math.sin(leapT * Math.PI) * 22;
          this.jumpX = leapT * (this.facing * 32);
          this.squashX = 0.88;
          this.squashY = 1.18;
          this.rotation = this.facing * Math.sin(leapT * Math.PI) * 0.12;
        } else if (this.actionTime < 1950) {
          // Phase 3: Landing impact & soft recovery squash
          if (this.pouncePhase !== 'land') {
            this.pouncePhase = 'land';
            this.x += this.jumpX;
            this.jumpX = 0;
            this.jumpY = 0;
            this.rotation = 0;
            webAudioEngine.playPawStep();
          }
          this.squashX = 1.16;
          this.squashY = 0.84;
        } else {
          // Phase 4: Settle upright
          this.resetTransforms();
          if (this.stateTimer <= 0) {
            this.state = 'sitting_down';
            this.stateTimer = 1800;
          }
        }
        break;
      }

      case 'grooming_paw': {
        this.actionTime += delta;
        this.stateTimer -= delta;

        // Upright gentle cheek-wiping rhythm
        this.bounceY = Math.sin(this.actionTime * 0.008) * 1.5;
        this.rotation = Math.sin(this.actionTime * 0.004) * 0.04;
        this.squashY = 1.0 + Math.sin(this.actionTime * 0.008) * 0.03;

        if (this.stateTimer <= 0) {
          this.resetTransforms();
          this.state = 'curling_loaf';
          this.stateTimer = 1600;
        }
        break;
      }

      case 'peeking_tall': {
        this.actionTime += delta;
        this.stateTimer -= delta;

        // Standing tall on hind legs with curious head tilt
        this.squashX = 0.88;
        this.squashY = 1.16;
        this.rotation = Math.sin(this.actionTime * 0.005) * 0.07;

        if (this.stateTimer <= 0) {
          this.resetTransforms();
          this.state = 'sitting_down';
          this.stateTimer = 1800;
        }
        break;
      }

      case 'waking_up': {
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this.state = 'stretching';
          this.stateTimer = 1600;
          this.actionTime = 0;
        }
        break;
      }

      case 'stretching': {
        this.actionTime += delta;
        this.stateTimer -= delta;

        if (this.actionTime < 1100) {
          // Deep satisfying spine arch
          this.squashX = 0.86;
          this.squashY = 1.22;
          this.shakeX = 0;
        } else if (this.actionTime < 1600) {
          // Cartoon fluff shake vibration!
          this.squashX = 1.04;
          this.squashY = 0.96;
          this.shakeX = Math.sin(this.actionTime * 0.048) * 2.8;
        } else {
          this.resetTransforms();
        }

        if (this.stateTimer <= 0) {
          this.resetTransforms();
          this.state = 'sitting_down';
          this.stateTimer = 1800;
        }
        break;
      }

      case 'walking': {
        this.updateWalking(delta);
        break;
      }

      case 'sitting_down': {
        this.stateTimer -= delta;
        // Gentle sitting breathing
        this.squashY = 1.0 + Math.sin(this.breatheTime * 1.5) * 0.02;
        if (this.stateTimer <= 0) {
          this.state = 'curling_loaf';
          this.stateTimer = 1800;
        }
        break;
      }

      case 'curling_loaf': {
        this.stateTimer -= delta;
        this.squashY = 1.0 + Math.sin(this.breatheTime * 1.2) * 0.025;
        if (this.stateTimer <= 0) {
          this.state = 'sleeping_curled';
          this.stateTimer = 35000 + Math.random() * 45000;
          webAudioEngine.playCatPurr();
        }
        break;
      }

      case 'sleeping_curled': {
        this.resetTransforms();
        // Dynamic floating Zzz generator (only when actually sleeping)
        this.zzzSpawnTimer += delta;
        if (this.zzzSpawnTimer > 1900) {
          this.zzzSpawnTimer = 0;
          this.zzzParticles.push({
            x: this.x + (this.facing === 1 ? 18 : -18),
            y: this.y - 14,
            alpha: 0.92,
            size: 8.5 + Math.random() * 4.5,
            vy: -15 - Math.random() * 8,
          });
        }
        break;
      }
    }

    // Update floating Zzz
    for (let i = this.zzzParticles.length - 1; i >= 0; i--) {
      const z = this.zzzParticles[i];
      z.y += z.vy * (delta / 1000);
      z.x += Math.sin(this.breatheTime * 2 + i) * 0.4;
      z.alpha -= 0.35 * (delta / 1000);
      if (z.alpha <= 0) {
        this.zzzParticles.splice(i, 1);
      }
    }
  }

  private startWalkingToNextSpot() {
    const cfg = ROOM_CONFIGS[this.currentRoomId] || ROOM_CONFIGS.bedroom;
    const spots = cfg.cozySpots || [];
    if (spots.length <= 1) {
      this.state = 'sitting_down';
      this.stateTimer = 1600;
      return;
    }

    // Pick a destination different from current spot
    const available = spots
      .map((s, idx) => ({ s, idx }))
      .filter((item) => item.idx !== this.currentSpotIndex);
    const chosen = available[Math.floor(Math.random() * available.length)];

    this.targetSpotIndex = chosen.idx;
    this.walkStartX = this.x;
    this.walkStartY = this.y;
    this.walkTargetX = chosen.s.x;
    this.walkTargetY = chosen.s.y;

    // Authentic feline trot pace (~55px/sec)
    const dx = this.walkTargetX - this.walkStartX;
    const dy = this.walkTargetY - this.walkStartY;
    const dist = Math.hypot(dx, dy);
    this.walkDuration = Math.max(2400, (dist / 55) * 1000);
    this.walkProgress = 0;
    this.walkStepPhase = 0;
    this.walkFrameIndex = 0;
    this.lastStepBeat = -1;

    // Turn facing towards movement
    if (Math.abs(dx) > 4) {
      this.facing = dx >= 0 ? 1 : -1;
    }

    this.state = 'walking';
  }

  private updateWalking(delta: number) {
    this.walkProgress += delta / this.walkDuration;
    const t = Math.min(1.0, this.walkProgress);

    // Smoothstep Cubic Easing for organic feline motion
    const easeT = t * t * (3 - 2 * t);

    // Floor navigation subtle elevation curve
    const navArcY = -Math.sin(t * Math.PI) * 10;

    this.x = this.walkStartX + (this.walkTargetX - this.walkStartX) * easeT;
    this.y = this.walkStartY + (this.walkTargetY - this.walkStartY) * easeT + navArcY;

    // 60 FPS Procedural Gait Physics: Continuous Sinusoidal Bounce & Squash/Stretch
    this.walkStepPhase += delta * 0.016;
    this.bounceY = -Math.abs(Math.sin(this.walkStepPhase)) * 3.2;
    this.squashX = 1.0 + Math.cos(this.walkStepPhase * 2) * 0.04;
    this.squashY = 1.0 - Math.cos(this.walkStepPhase * 2) * 0.04;

    // 4-frame gait cycle locked to continuous sine phase
    this.walkFrameIndex = Math.floor((this.walkStepPhase / (Math.PI * 0.5)) % 4);

    // Velvet paw step sound on step downbeat
    const currentBeat = Math.floor(this.walkStepPhase / Math.PI);
    if (currentBeat !== this.lastStepBeat) {
      this.lastStepBeat = currentBeat;
      webAudioEngine.playPawStep();
    }

    // Check arrival
    if (t >= 1.0) {
      this.x = this.walkTargetX;
      this.y = this.walkTargetY;
      this.currentSpotIndex = this.targetSpotIndex;
      this.resetTransforms();

      const cfg = ROOM_CONFIGS[this.currentRoomId] || ROOM_CONFIGS.bedroom;
      const spot = cfg.cozySpots?.[this.currentSpotIndex];
      if (spot) {
        this.facing = spot.facing;
      }
      this.state = 'sitting_down';
      this.stateTimer = 1900;
    }
  }

  /**
   * Render the inpainting patch over Spot 0 when the cat is moving or at another spot
   */
  public renderPatch(ctx: CanvasRenderingContext2D, roomId: RoomId) {
    const cfg = ROOM_CONFIGS[roomId];
    if (!cfg || !cfg.inpaintingPatch) return;

    const p = cfg.inpaintingPatch;
    const patchImg = getPatchImage(p.imageSrc);
    if (patchImg && patchImg.complete && patchImg.naturalWidth > 0) {
      ctx.save();
      ctx.drawImage(patchImg, p.x, p.y, p.w, p.h);
      ctx.restore();
    }
  }

  /**
   * Render the animated feline sprite with cartoon fluidity & natural room blending
   */
  public render(ctx: CanvasRenderingContext2D, roomId: RoomId) {
    const cfg = ROOM_CONFIGS[roomId] || ROOM_CONFIGS.bedroom;
    const breed = cfg.catBreed || 'tabby';

    let spriteName = 'sleep';
    switch (this.state) {
      case 'sleeping_curled': spriteName = 'sleep'; break;
      case 'waking_up': spriteName = 'wake'; break;
      case 'stretching': spriteName = 'stretch'; break;
      case 'walking': spriteName = `walk_${this.walkFrameIndex}`; break;
      case 'sitting_down': spriteName = 'sit'; break;
      case 'curling_loaf': spriteName = 'loaf'; break;
      case 'rolling_belly': spriteName = 'roll'; break;
      case 'grooming_paw': spriteName = 'groom'; break;
      case 'butt_wiggle_pounce':
        spriteName = this.pouncePhase === 'land' ? 'sit' : 'pounce';
        break;
      case 'peeking_tall': spriteName = 'peek'; break;
    }

    const sprite = getImage(`/sprites/cat/${breed}/${spriteName}.png`);
    if (!sprite || !sprite.complete || sprite.naturalWidth === 0) return;

    ctx.save();

    // Subtle rhythmic breathing offset during sleep
    const breatheOffset = (this.state === 'sleeping_curled' || this.state === 'curling_loaf') 
      ? Math.sin(this.breatheTime) * 1.1 
      : 0;

    // --- 1. Multi-Layered Soft Ambient Occlusion Contact Shadow ---
    const shadowW = this.w * 0.85 * (1 + (this.squashX - 1) * 0.5);
    const shadowH = 12 * (1 + (this.squashY - 1) * 0.5);
    const shadowYOffset = this.h * 0.42;

    const groundX = this.x + this.jumpX;
    const groundY = this.y + shadowYOffset;
    const airHeight = Math.max(0, -this.jumpY);
    const shadowScale = Math.max(0.55, 1.0 - airHeight / 55);
    const shadowAlpha = Math.max(0.12, 0.48 * (1.0 - airHeight / 45));

    // Room ambient warm shadow color
    const shadowColor = (roomId === 'cabin' || roomId === 'bedroom')
      ? `rgba(35, 16, 8, ${shadowAlpha})`
      : `rgba(16, 18, 28, ${shadowAlpha})`;

    // Outer diffused contact penumbra
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.ellipse(groundX, groundY, (shadowW * 0.5) * shadowScale, (shadowH * 0.5) * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner dark contact occlusion
    if (airHeight < 4) {
      ctx.fillStyle = `rgba(12, 10, 8, ${shadowAlpha * 0.75})`;
      ctx.beginPath();
      ctx.ellipse(groundX, groundY - 1, (shadowW * 0.3) * shadowScale, (shadowH * 0.28) * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- 2. Sprite Scale & Proportions Calibrated to Room Art ---
    const aspect = sprite.naturalWidth / sprite.naturalHeight;
    let drawH = this.h;
    if (this.state === 'peeking_tall') {
      drawH = this.h * 1.25;
    } else if (this.state === 'sitting_down' || this.state === 'grooming_paw') {
      drawH = this.h * 1.15;
    } else if (this.state === 'stretching') {
      drawH = this.h * 1.18;
    } else if (this.state === 'butt_wiggle_pounce') {
      drawH = this.h * 1.05;
    } else if (this.state === 'rolling_belly') {
      drawH = this.h * 1.08;
    } else if (this.state === 'walking') {
      drawH = this.h * 1.08;
    }
    const drawW = drawH * aspect;

    // --- 3. Cartoon Transformations (Squash, Stretch, Bounce, Rotation, Shake) ---
    ctx.translate(
      this.x + this.jumpX + this.shakeX, 
      this.y - drawH * 0.5 + breatheOffset + this.bounceY + this.jumpY
    );
    ctx.rotate(this.rotation);
    ctx.scale(this.facing * this.squashX, this.squashY);

    // Crisp pixel art rendering matching room pixel density
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, -drawW * 0.5, -drawH * 0.5, drawW, drawH);

    // --- 4. Room Lighting Warmth Blending ---
    // Warm amber glow in cozy wooden fireplace rooms
    if (roomId === 'cabin' || roomId === 'bedroom') {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
      ctx.fillRect(-drawW * 0.5, -drawH * 0.5, drawW, drawH);
      ctx.restore();
    }

    ctx.restore();

    // --- 5. Sleeping "Zzz" Particles (Follows cat dynamically) ---
    if (this.zzzParticles.length > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(254, 243, 199, 0.88)';
      this.zzzParticles.forEach((z) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, z.alpha));
        ctx.font = `bold ${Math.round(z.size)}px "Courier New", monospace`;
        ctx.fillText('z', z.x, z.y);
        ctx.restore();
      });
      ctx.restore();
    }
  }
}

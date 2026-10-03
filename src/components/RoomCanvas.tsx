import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PixelRenderer } from '../engine/PixelRenderer';
import { useAppStore } from '../store/useAppStore';
import { useAudioStore } from '../store/useAudioStore';
import { useTimerStore } from '../store/useTimerStore';
import { useStatsStore } from '../store/useStatsStore';
import { useBossRaidStore } from '../store/useBossRaidStore';
import { useGamificationStore } from '../store/useGamificationStore';
import { webAudioEngine } from '../audio/WebAudioEngine';
import { SceneContext } from '../engine/types';
import { InteractiveObjectId } from '../types';
import { ROOM_CONFIGS } from '../engine/roomConfigs';
import { TRANSLATIONS } from '../i18n/translations';

export const RoomCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<PixelRenderer | null>(null);

  const {
    language,
    activeRoom,
    timeOfDay,
    weather,
    lampOn,
    mugHot,
    fireplaceActive,
    reduceMotion,
    batterySaverMode,
    hoveredObject,
    setHoveredObject,
    toggleLamp,
    sipMug,
    toggleFireplace,
    setActiveModal,
    showToast,
  } = useAppStore();

  const { isPlayingMusic, togglePlayMusic } = useAudioStore();
  const timerState = useTimerStore((s) => s.timerState);
  const currentGoal = useTimerStore((s) => s.currentGoal);
  const { getTotalFocusHours } = useStatsStore();
  const { unlockedTrophies } = useBossRaidStore();

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const isMouseDownRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartTimeRef = useRef(0);
  const lastTouchPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchTimeRef = useRef(0);
  const lastInteractionTimeRef = useRef(0);
  const lastScratchAudioRef = useRef(0);

  // Persistent SceneContext Ref to eliminate any canvas unmount/remount flickering
  const sceneContextRef = useRef<SceneContext>({
    width: 960,
    height: 540,
    timeOfDay,
    weather,
    roomId: activeRoom,
    lampOn,
    mugHot,
    fireplaceActive,
    reduceMotion,
    inFocusSession: timerState === 'running',
    focusProgress: 0,
    progressionHours: getTotalFocusHours(),
    hoveredObject,
    isPlayingMusic,
    currentGoal,
    unlockedTrophies,
    batterySaverMode,
  });

  // Always keep sceneContextRef updated synchronously with latest React state
  sceneContextRef.current = {
    width: 960,
    height: 540,
    timeOfDay,
    weather,
    roomId: activeRoom,
    lampOn,
    mugHot,
    fireplaceActive,
    reduceMotion,
    inFocusSession: timerState === 'running',
    focusProgress: sceneContextRef.current.focusProgress,
    progressionHours: getTotalFocusHours(),
    hoveredObject,
    isPlayingMusic,
    currentGoal,
    unlockedTrophies,
    batterySaverMode,
  };

  // Initialize Canvas & Renderer Loop strictly ONCE - zero flickering on hover or interaction!
  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new PixelRenderer(canvasRef.current);
    rendererRef.current = renderer;
    (window as unknown as { __pixelRenderer: PixelRenderer }).__pixelRenderer = renderer;

    renderer.start(() => {
      const tState = useTimerStore.getState();
      const totalSecs = tState.durationMinutes * 60;
      const progress = totalSecs > 0 ? (totalSecs - tState.secondsRemaining) / totalSecs : 0;
      sceneContextRef.current.focusProgress = progress;
      sceneContextRef.current.inFocusSession = tState.timerState === 'running';
      sceneContextRef.current.currentGoal = tState.currentGoal;
      return sceneContextRef.current;
    });

    return () => {
      renderer.stop();
    };
  }, []);

  const handleMouseDown = () => {
    isMouseDownRef.current = true;
    dragDistanceRef.current = 0;
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
  };

  // Handle Mouse Hover & Window Scratching (Optimized to avoid 60-120 FPS React re-renders)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current || !canvasRef.current) return;
    const hovered = rendererRef.current.getHoveredObject(e.clientX, e.clientY, activeRoom);
    if (hovered !== hoveredObject) {
      setHoveredObject(hovered);
    }
    // Only update React mousePos state when hovering an interactive object to show the tooltip
    if (hovered) {
      setMousePos({ x: e.clientX, y: e.clientY });
    } else if (mousePos) {
      setMousePos(null);
    }

    // Interactive Window Condensation Scratching (Rain / Snow)
    if (isMouseDownRef.current) {
      dragDistanceRef.current += Math.hypot(e.movementX, e.movementY);
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = 960 / rect.width;
      const scaleY = 540 / rect.height;
      const canvasX = (e.clientX - rect.left) * scaleX;
      const canvasY = (e.clientY - rect.top) * scaleY;

      const cfg = ROOM_CONFIGS[activeRoom];
      let insideWindow = false;
      if (cfg.windowPanes && cfg.windowPanes.length > 0) {
        insideWindow = cfg.windowPanes.some(p =>
          canvasX >= p.x && canvasX <= p.x + p.w &&
          canvasY >= p.y && canvasY <= p.y + p.h
        );
      } else {
        const wb = cfg.windowBounds;
        insideWindow = (
          canvasX >= wb.x && canvasX <= wb.x + wb.w &&
          canvasY >= wb.y && canvasY <= wb.y + wb.h
        );
      }

      if (insideWindow) {
        rendererRef.current.particleSystem.addWindowScratch(canvasX, canvasY, 8);
        const now = Date.now();
        if (now - lastScratchAudioRef.current > 130) {
          webAudioEngine.playGlassWipe();
          lastScratchAudioRef.current = now;
        }
      }
    }
  };

  const handleMouseLeave = () => {
    isMouseDownRef.current = false;
    setHoveredObject(null);
    setMousePos(null);
  };

  // Translations
  const t = TRANSLATIONS[language];

  // Handle Interactive Clicks & Taps
  const handleInteractiveClick = (clicked: InteractiveObjectId) => {
    const now = performance.now();
    // Guard against rapid duplicate triggers (350ms cooldown)
    if (now - lastInteractionTimeRef.current < 350) return;
    lastInteractionTimeRef.current = now;

    webAudioEngine.init();

    switch (clicked) {
      case 'lamp':
        webAudioEngine.playLampSwitch();
        toggleLamp();
        showToast(lampOn ? t.toasts.lampOff : t.toasts.lampOn, 2000);
        break;

      case 'mug':
        webAudioEngine.playCoffeeSip();
        sipMug();
        showToast(language === 'tr' ? '☕ Sıcak bir yudum aldın... Zihnin canlandı!' : '☕ Took a warm sip... Mind refreshed!', 2500);
        break;

      case 'fireplace': {
        const nextActive = !fireplaceActive;
        toggleFireplace();
        webAudioEngine.playFireplaceStoke();
        useAudioStore.getState().setChannelVolume('fireplace', nextActive ? 0.65 : 0);
        showToast(nextActive ? t.toasts.fireplaceOn : t.toasts.fireplaceOff, 2500);
        break;
      }

      case 'cat': {
        webAudioEngine.playCatPurr();
        const catSpot = ROOM_CONFIGS[activeRoom].hotspots.find((h) => h.id === 'cat') || ROOM_CONFIGS[activeRoom].cat;
        rendererRef.current?.particleSystem.triggerHeart(catSpot.x + catSpot.w * 0.5, catSpot.y + catSpot.h * 0.2);

        useBossRaidStore.getState().grantCatMoraleBuff();
        const petResult = useGamificationStore.getState().petCat();
        if (petResult.rewarded) {
          showToast(
            language === 'tr'
              ? `🐾 Kedini sevdin! "Huzur Desteği" aktif (+15 XP, +%10 Boss Hasarı • Toplam: ${petResult.totalPets}/25)`
              : `🐾 You petted your cat! "Cozy Morale Boost" active (+15 XP, +10% Boss DMG • Total: ${petResult.totalPets}/25)`,
            3500
          );
        } else {
          const remainingMins = Math.ceil(petResult.cooldownRemainingMs / 60000);
          showToast(
            language === 'tr'
              ? `🐾 Mırıldanıyor... (Huzur desteği aktif. Yeni XP için ${remainingMins} dk • Toplam Sevgi: ${petResult.totalPets}/25)`
              : `🐾 Purring softly... (Morale boost active. Next XP in ${remainingMins}m • Total Pets: ${petResult.totalPets}/25)`,
            2500
          );
        }
        break;
      }

      case 'radio':
        togglePlayMusic();
        showToast(isPlayingMusic ? t.toasts.musicPause : t.toasts.musicPlay, 2000);
        break;

      case 'clock':
        setActiveModal('timer_custom');
        break;

      case 'notebook':
        setActiveModal('journal');
        break;

      case 'window':
        if (weather === 'rain' || weather === 'storm') {
          webAudioEngine.playThunderStrike(0.65, 'distant');
        }
        setActiveModal('settings');
        break;

      case 'plant':
      case 'chair':
        setActiveModal('progression');
        break;

      case 'globe':
        setActiveModal('globe_explorer');
        break;

      case 'bookshelf':
        setActiveModal('stats');
        break;

      case 'sticky_note':
        setActiveModal('north_star_goal');
        break;

      case 'boss_trophy':
        setActiveModal('boss_raid');
        break;
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // If this click is a synthetic event emitted by the browser right after a touch, ignore it!
    if (performance.now() - lastTouchTimeRef.current < 500) {
      return;
    }
    if (!rendererRef.current) return;
    const clicked = rendererRef.current.getHoveredObject(e.clientX, e.clientY, activeRoom);
    if (clicked) {
      handleInteractiveClick(clicked);
    }
  };

  // Mobile Touch Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!e.touches[0] || !canvasRef.current || !rendererRef.current) return;
    isMouseDownRef.current = true;
    dragDistanceRef.current = 0;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    touchStartTimeRef.current = performance.now();
    lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
    const hovered = rendererRef.current.getHoveredObject(touch.clientX, touch.clientY, activeRoom);
    if (hovered !== hoveredObject) {
      setHoveredObject(hovered);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isMouseDownRef.current || !e.touches[0] || !canvasRef.current || !rendererRef.current) return;
    const touch = e.touches[0];

    if (lastTouchPosRef.current) {
      dragDistanceRef.current += Math.hypot(
        touch.clientX - lastTouchPosRef.current.x,
        touch.clientY - lastTouchPosRef.current.y
      );
      lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = 960 / rect.width;
    const scaleY = 540 / rect.height;
    const canvasX = (touch.clientX - rect.left) * scaleX;
    const canvasY = (touch.clientY - rect.top) * scaleY;

    const cfg = ROOM_CONFIGS[activeRoom];
    let insideWindow = false;
    if (cfg.windowPanes && cfg.windowPanes.length > 0) {
      insideWindow = cfg.windowPanes.some((p) =>
        canvasX >= p.x && canvasX <= p.x + p.w &&
        canvasY >= p.y && canvasY <= p.y + p.h
      );
    } else {
      insideWindow =
        canvasX >= cfg.windowBounds.x &&
        canvasX <= cfg.windowBounds.x + cfg.windowBounds.w &&
        canvasY >= cfg.windowBounds.y &&
        canvasY <= cfg.windowBounds.y + cfg.windowBounds.h;
    }

    if (insideWindow) {
      rendererRef.current.particleSystem.addWindowScratch(canvasX, canvasY, 14);
      const now = performance.now();
      if (now - lastScratchAudioRef.current > 120) {
        webAudioEngine.playGlassWipe();
        lastScratchAudioRef.current = now;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    isMouseDownRef.current = false;
    lastTouchPosRef.current = null;
    const now = performance.now();
    lastTouchTimeRef.current = now;

    if (e.changedTouches[0] && canvasRef.current && rendererRef.current) {
      const touch = e.changedTouches[0];
      const startPos = touchStartPosRef.current;
      const duration = now - touchStartTimeRef.current;
      const totalMoved = startPos 
        ? Math.hypot(touch.clientX - startPos.x, touch.clientY - startPos.y) 
        : dragDistanceRef.current;

      // Reliable mobile tap: movement < 32px and tap duration < 500ms
      if (totalMoved < 32 && duration < 500) {
        const clicked = rendererRef.current.getHoveredObject(touch.clientX, touch.clientY, activeRoom);
        if (clicked) {
          handleInteractiveClick(clicked);
        }
      }
    }
  };

  // Safe lookup for hovered hotspot with localized name & hint
  const activeRoomConfig = ROOM_CONFIGS[activeRoom] || ROOM_CONFIGS.bedroom;
  const currentHotspot = activeRoomConfig.hotspots.find((h) => h.id === hoveredObject);
  const fallbackLocalized = hoveredObject && t.hotspots[hoveredObject as keyof typeof t.hotspots];

  const isTr = language === 'tr';
  const displayName = currentHotspot
    ? (isTr
        ? currentHotspot.nameTr || fallbackLocalized?.name || currentHotspot.name
        : currentHotspot.name)
    : (fallbackLocalized?.name || '');

  const displayHint = currentHotspot
    ? (isTr
        ? currentHotspot.hintTr || fallbackLocalized?.hint || currentHotspot.hint
        : currentHotspot.hint)
    : (fallbackLocalized?.hint || '');

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black select-none"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))',
      }}
    >
      {/* Dynamic Living Ambilight Aura (Radiates room ambiance outwards) */}
      <div 
        className="absolute inset-0 ambilight-halo pointer-events-none flex items-center justify-center overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <img 
          src={activeRoomConfig.imageSrc} 
          alt="" 
          className="w-full h-full max-w-[190vh] max-h-[60vw] object-cover scale-110 opacity-70"
        />
      </div>

      {/* Aspect-ratio preserving 16:9 pixel canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative z-10 pixel-canvas object-contain w-full h-full max-w-[177.78vh] max-h-[calc(100vh-env(safe-area-inset-top,0px)-5rem)] xs:max-h-[56.25vw] cursor-${
          hoveredObject ? 'pointer' : 'default'
        } transition-all duration-700`}
        style={{
          boxShadow: '0 0 70px rgba(0,0,0,0.92), 0 0 20px rgba(0,0,0,0.8)',
          touchAction: 'none',
          imageRendering: 'pixelated',
        }}
      />

      {/* Floating Luxury Hover Object Hint Tooltip */}
      {hoveredObject && currentHotspot && mousePos && (
        <div
          className="pointer-events-none fixed z-50 px-3.5 py-1.5 bg-stone-950/92 text-amber-100 text-xs font-sans font-medium rounded-xl border border-amber-500/50 shadow-2xl backdrop-blur-xl -translate-x-1/2 -translate-y-12 transition-transform duration-75 flex items-center gap-2 ring-1 ring-amber-400/20"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
          }}
        >
          <span className="text-amber-400 text-xs animate-pulse">✦</span>
          <span className="font-semibold text-amber-200 tracking-wide">
            {displayName}
          </span>
          {displayHint && (
            <span className="text-[11px] text-stone-400 font-normal">
              ({displayHint})
            </span>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
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

function getLetterboxedCanvasCoords(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  const contentRatio = 960 / 540;
  const elemRatio = rect.width / rect.height;
  let drawW = rect.width;
  let drawH = rect.height;
  let offsetX = 0;
  let offsetY = 0;

  if (elemRatio > contentRatio) {
    drawW = rect.height * contentRatio;
    offsetX = (rect.width - drawW) / 2;
  } else {
    drawH = rect.width / contentRatio;
    offsetY = (rect.height - drawH) / 2;
  }

  const relX = clientX - rect.left - offsetX;
  const relY = clientY - rect.top - offsetY;
  const x = Math.max(0, Math.min(960, (relX / drawW) * 960));
  const y = Math.max(0, Math.min(540, (relY / drawH) * 540));
  return { x, y };
}

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
  const isPointerDownRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const dragDistanceRef = useRef(0);
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const pointerStartTimeRef = useRef(0);
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null);
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

  const scratchWindowAt = (clientX: number, clientY: number, intensity: number) => {
    if (!rendererRef.current || !canvasRef.current) return;
    const { x: canvasX, y: canvasY } = getLetterboxedCanvasCoords(canvasRef.current, clientX, clientY);
    const cfg = ROOM_CONFIGS[activeRoom];
    const insideWindow = cfg.windowPanes?.length
      ? cfg.windowPanes.some((p) =>
          canvasX >= p.x && canvasX <= p.x + p.w && canvasY >= p.y && canvasY <= p.y + p.h
        )
      : canvasX >= cfg.windowBounds.x &&
        canvasX <= cfg.windowBounds.x + cfg.windowBounds.w &&
        canvasY >= cfg.windowBounds.y &&
        canvasY <= cfg.windowBounds.y + cfg.windowBounds.h;

    if (!insideWindow) return;
    rendererRef.current.particleSystem.addWindowScratch(canvasX, canvasY, intensity);
    const now = performance.now();
    if (now - lastScratchAudioRef.current > 130) {
      webAudioEngine.playGlassWipe();
      lastScratchAudioRef.current = now;
    }
  };

  // A single Pointer Events path prevents iOS/Android from dispatching both a
  // touch action and its synthetic click for the same physical tap.
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary || !rendererRef.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;
    isPointerDownRef.current = true;
    dragDistanceRef.current = 0;
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
    pointerStartTimeRef.current = performance.now();

    const hovered = rendererRef.current.getHoveredObject(e.clientX, e.clientY, activeRoom);
    if (hovered !== hoveredObject) {
      setHoveredObject(hovered);
    }
  };

  // Hover and window scratching without a parallel touch handler.
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current || !canvasRef.current || !e.isPrimary) return;
    const hovered = rendererRef.current.getHoveredObject(e.clientX, e.clientY, activeRoom);
    if (hovered !== hoveredObject) setHoveredObject(hovered);

    // Touch tooltips obscure the small scene. Show them only for hover-capable pointers.
    if (e.pointerType !== 'touch') {
      if (hovered) setMousePos({ x: e.clientX, y: e.clientY });
      else if (mousePos) setMousePos(null);
    }

    if (isPointerDownRef.current && activePointerIdRef.current === e.pointerId) {
      const previous = lastPointerPosRef.current;
      if (previous) {
        dragDistanceRef.current += Math.hypot(e.clientX - previous.x, e.clientY - previous.y);
      }
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
      scratchWindowAt(e.clientX, e.clientY, e.pointerType === 'touch' ? 14 : 8);
    }
  };

  const clearPointerInteraction = () => {
    isPointerDownRef.current = false;
    activePointerIdRef.current = null;
    pointerStartPosRef.current = null;
    lastPointerPosRef.current = null;
  };

  const handlePointerLeave = () => {
    if (isPointerDownRef.current) return;
    setHoveredObject(null);
    setMousePos(null);
  };

  // Translations
  const t = TRANSLATIONS[language];

  // Handle Interactive Clicks & Taps
  const handleInteractiveClick = (clicked: InteractiveObjectId) => {
    const now = performance.now();
    // Guard only against genuinely duplicated platform events. Normal taps are
    // already de-duplicated by the unified pointer pipeline.
    if (now - lastInteractionTimeRef.current < 250) return;
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

      case 'desk':
        setActiveModal('tasks');
        break;

      case 'bed':
        setActiveModal('break_guide');
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

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary || activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    const now = performance.now();
    const startPos = pointerStartPosRef.current;
    const duration = now - pointerStartTimeRef.current;
    const totalMoved = startPos
      ? Math.max(dragDistanceRef.current, Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y))
      : dragDistanceRef.current;
    const tapTolerance = e.pointerType === 'touch' ? 28 : 8;

    if (totalMoved <= tapTolerance && duration < 750 && rendererRef.current) {
      const clicked = rendererRef.current.getHoveredObject(e.clientX, e.clientY, activeRoom);
      if (clicked) handleInteractiveClick(clicked);
    }

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    clearPointerInteraction();
    if (e.pointerType === 'touch') {
      setHoveredObject(null);
      setMousePos(null);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    clearPointerInteraction();
    setHoveredObject(null);
    setMousePos(null);
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
    <div className="room-stage relative w-full h-full flex items-center justify-center overflow-hidden bg-stone-950 select-none">
      {/* Dynamic Living Ambilight Aura (Radiates room ambiance outwards) */}
      <div 
        className="room-stage-backdrop absolute inset-0 ambilight-halo pointer-events-none flex items-center justify-center overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <img 
          src={activeRoomConfig.imageSrc} 
          alt="" 
          className="w-full h-full object-cover scale-110 opacity-80"
        />
      </div>

      {/* Aspect-ratio preserving 16:9 pixel canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        className={`room-scene-canvas relative z-10 pixel-canvas aspect-video cursor-${
          hoveredObject ? 'pointer' : 'default'
        }`}
        role="application"
        aria-label={language === 'tr' ? 'Etkileşimli çalışma odası' : 'Interactive study room'}
        style={{
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

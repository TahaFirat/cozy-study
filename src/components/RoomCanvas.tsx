import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PixelRenderer } from '../engine/PixelRenderer';
import { useAppStore } from '../store/useAppStore';
import { useAudioStore } from '../store/useAudioStore';
import { useTimerStore } from '../store/useTimerStore';
import { useStatsStore } from '../store/useStatsStore';
import { useBossRaidStore } from '../store/useBossRaidStore';
import { webAudioEngine } from '../audio/WebAudioEngine';
import { SceneContext } from '../engine/types';
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
    hoveredObject,
    setHoveredObject,
    toggleLamp,
    sipMug,
    toggleFireplace,
    setActiveModal,
    showToast,
  } = useAppStore();

  const { isPlayingMusic, togglePlayMusic } = useAudioStore();
  const { timerState, durationMinutes, secondsRemaining, currentGoal, setCurrentGoal } = useTimerStore();
  const { getTotalFocusHours } = useStatsStore();
  const { unlockedTrophies } = useBossRaidStore();

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const isMouseDownRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const lastScratchAudioRef = useRef(0);

  // Persistent SceneContext Ref to eliminate any canvas unmount/remount flickering
  const totalSecs = durationMinutes * 60;
  const progress = totalSecs > 0 ? (totalSecs - secondsRemaining) / totalSecs : 0;
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
    focusProgress: progress,
    progressionHours: getTotalFocusHours(),
    hoveredObject,
    isPlayingMusic,
    currentGoal,
    unlockedTrophies,
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
    focusProgress: progress,
    progressionHours: getTotalFocusHours(),
    hoveredObject,
    isPlayingMusic,
    currentGoal,
    unlockedTrophies,
  };

  // Initialize Canvas & Renderer Loop strictly ONCE - zero flickering on hover or interaction!
  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new PixelRenderer(canvasRef.current);
    rendererRef.current = renderer;
    (window as unknown as { __pixelRenderer: PixelRenderer }).__pixelRenderer = renderer;

    renderer.start(() => sceneContextRef.current);

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

  // Handle Mouse Hover & Window Scratching
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current || !canvasRef.current) return;
    const hovered = rendererRef.current.getHoveredObject(e.clientX, e.clientY, activeRoom);
    if (hovered !== hoveredObject) {
      setHoveredObject(hovered);
    }
    setMousePos({ x: e.clientX, y: e.clientY });

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

  // Handle Interactive Clicks
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current) return;
    const clicked = rendererRef.current.getHoveredObject(e.clientX, e.clientY, activeRoom);
    if (!clicked) return;

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
        rendererRef.current.particleSystem.triggerHeart(catSpot.x + catSpot.w * 0.5, catSpot.y + catSpot.h * 0.2);
        showToast(t.toasts.catPet, 2500);
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
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black select-none">
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
        className={`relative z-10 pixel-canvas object-contain w-full h-full max-w-[177.78vh] max-h-[56.25vw] cursor-${
          hoveredObject ? 'pointer' : 'default'
        } transition-all duration-700`}
        style={{
          boxShadow: '0 0 70px rgba(0,0,0,0.92), 0 0 20px rgba(0,0,0,0.8)',
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

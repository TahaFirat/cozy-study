import React, { useEffect, useRef, useState } from 'react';
import { PixelRenderer } from '../engine/PixelRenderer';
import { useAppStore } from '../store/useAppStore';
import { useAudioStore } from '../store/useAudioStore';
import { useTimerStore } from '../store/useTimerStore';
import { useStatsStore } from '../store/useStatsStore';
import { useBossRaidStore } from '../store/useBossRaidStore';
import { useGamificationStore } from '../store/useGamificationStore';
import { useCommunityStore } from '../store/useCommunityStore';
import { useTaskStore } from '../store/useTaskStore';
import { webAudioEngine } from '../audio/WebAudioEngine';
import { SceneContext } from '../engine/types';
import { InteractiveObjectId, WeatherType } from '../types';
import { ROOM_CONFIGS } from '../engine/roomConfigs';
import { TRANSLATIONS, getRoomTranslation } from '../i18n/translations';

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

const WEATHER_CYCLE: WeatherType[] = ['rain', 'heavy_rain', 'storm', 'snow', 'clear'];

export const RoomCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<PixelRenderer | null>(null);

  const {
    language,
    activeRoom,
    timeOfDay,
    weather,
    setWeather,
    lampOn,
    mugHot,
    fireplaceActive,
    immersiveMode,
    reduceMotion,
    batterySaverMode,
    hoveredObject,
    setHoveredObject,
    toggleLamp,
    sipMug,
    setFireplace,
    setActiveModal,
    showToast,
  } = useAppStore();

  const { isPlayingMusic, togglePlayMusic, ambientVolumes } = useAudioStore();
  const timerState = useTimerStore((s) => s.timerState);
  const currentGoal = useTimerStore((s) => s.currentGoal);
  const { getTotalFocusHours, streakDays } = useStatsStore();
  const { unlockedTrophies, currentBossId, bosses, strikeCharges } = useBossRaidStore();
  const xp = useGamificationStore((s) => s.xp);
  const onlineCount = useCommunityStore((s) => s.onlineCount);
  const toggleChat = useCommunityStore((s) => s.toggleChat);
  const tasks = useTaskStore((s) => s.tasks);
  const toggleTaskDrawer = useTaskStore((s) => s.toggleTaskDrawer);

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
        const currentFireVol = useAudioStore.getState().ambientVolumes.fireplace || 0;
        const nextActive = !fireplaceActive || currentFireVol < 0.05;
        setFireplace(nextActive);
        if (nextActive) {
          webAudioEngine.playFireplaceStoke();
        }
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

  const handleCycleWeather = () => {
    webAudioEngine.init();
    const idx = WEATHER_CYCLE.indexOf(weather);
    const nextWeather = WEATHER_CYCLE[(idx + 1) % WEATHER_CYCLE.length];
    setWeather(nextWeather);
    const wLabel = t.weather[nextWeather] || nextWeather;
    showToast(language === 'tr' ? `🌤️ Atmosfer: ${wLabel}` : `🌤️ Weather: ${wLabel}`, 2000);
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

  const localizedRoomName = getRoomTranslation(language, activeRoom)?.name || activeRoom;
  const localizedTime = t.times[timeOfDay] || timeOfDay;
  const localizedWeather = t.weather[weather] || weather;
  const currentBoss = bosses[currentBossId] || bosses.horologium || Object.values(bosses)[0];
  const bossHpPct = currentBoss ? Math.max(0, Math.round((currentBoss.currentHp / Math.max(1, currentBoss.maxHp)) * 100)) : 100;
  const pendingTasksCount = tasks.filter((tk) => tk.status !== 'done').length;
  const playerLevel = Math.floor(xp / 500) + 1;
  const isFireSoundOn = fireplaceActive && (ambientVolumes.fireplace || 0) > 0.02;

  const weatherEmoji =
    weather === 'clear' ? '☀️' : weather === 'snow' ? '❄️' : weather === 'storm' ? '⛈️' : '🌧️';

  return (
    <div className={`room-stage relative w-full h-full flex items-center justify-center overflow-hidden bg-stone-950 select-none ${immersiveMode ? 'is-immersive-stage' : ''}`}>
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

      {/* Stage Card Wrapper (acts as `display: contents` on Desktop/Landscape, and as a Framed Sanctuary Card on Mobile Portrait) */}
      <div className="portrait-stage-card relative z-10">
        {/* Mobile Portrait Stage Header Strip */}
        <div className="portrait-stage-header hidden items-center justify-between px-3 py-2 bg-stone-950/90 border-b border-white/10 text-[11px]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] shrink-0" />
            <span className="font-bold text-amber-100 truncate">{localizedRoomName}</span>
            <span className="text-stone-500">•</span>
            <button
              type="button"
              onClick={handleCycleWeather}
              className="flex items-center gap-1 text-stone-300 hover:text-amber-200 font-medium shrink-0 cursor-pointer"
            >
              <span>{weatherEmoji}</span>
              <span>{localizedWeather}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={toggleChat}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-semibold text-[10px] shrink-0 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{onlineCount || 1} {isTr ? 'Yayında' : 'Live'}</span>
          </button>
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

        {/* Mobile Portrait Subtle Interactive Hint Footer inside Stage Card */}
        <div className="portrait-stage-footer hidden items-center justify-between px-3 py-1.5 bg-stone-950/90 border-t border-white/5 text-[10px] text-stone-400">
          <span>✨ {isTr ? 'Eşyalara doğrudan dokun veya aşağıdaki konsolu kullan' : 'Tap objects directly or use the console below'}</span>
          <span className="font-mono text-amber-300/90">{localizedTime}</span>
        </div>
      </div>

      {/* Mobile Portrait Sanctuary Console (Fills vertical phone screen with tactile room controls & live widgets) */}
      {!immersiveMode && (
        <div className="portrait-sanctuary-console hidden relative z-20 w-full flex-col gap-2.5">
          {/* 1. Tactile Room Object Quick-Interactions (6 Cozy Pills in 3x2 Grid) */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleInteractiveClick('fireplace')}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-left transition-all active:scale-95 cursor-pointer ${
                isFireSoundOn
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'bg-stone-900/85 border-white/10 text-stone-300'
              }`}
            >
              <span className="text-base leading-none">🔥</span>
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">{isTr ? 'Şömine' : 'Hearth'}</div>
                <div className="text-[9px] text-amber-300/90 font-mono">
                  {isFireSoundOn ? (isTr ? 'Çıtırdıyor' : 'Crackling') : (isTr ? 'Yak / Ses' : 'Ignite')}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleInteractiveClick('lamp')}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-left transition-all active:scale-95 cursor-pointer ${
                lampOn
                  ? 'bg-amber-400/15 border-amber-400/40 text-amber-100'
                  : 'bg-stone-900/85 border-white/10 text-stone-300'
              }`}
            >
              <span className="text-base leading-none">💡</span>
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">{isTr ? 'Lamba' : 'Lamp'}</div>
                <div className="text-[9px] text-stone-400 font-mono">
                  {lampOn ? (isTr ? 'Açık' : 'On') : (isTr ? 'Kapalı' : 'Off')}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleInteractiveClick('cat')}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border bg-stone-900/85 border-white/10 text-stone-200 text-left transition-all active:scale-95 cursor-pointer"
            >
              <span className="text-base leading-none">🐾</span>
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">{isTr ? 'Kediyi Sev' : 'Pet Cat'}</div>
                <div className="text-[9px] text-amber-300/90 font-mono">+10% DMG</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleInteractiveClick('mug')}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border bg-stone-900/85 border-white/10 text-stone-200 text-left transition-all active:scale-95 cursor-pointer"
            >
              <span className="text-base leading-none">☕</span>
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">{isTr ? 'Kahve İç' : 'Sip Mug'}</div>
                <div className="text-[9px] text-stone-400 font-mono">{isTr ? 'Zihin Aç' : 'Refresh'}</div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleCycleWeather}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border bg-stone-900/85 border-white/10 text-stone-200 text-left transition-all active:scale-95 cursor-pointer"
            >
              <span className="text-base leading-none">{weatherEmoji}</span>
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">{isTr ? 'Atmosfer' : 'Weather'}</div>
                <div className="text-[9px] text-sky-300 font-mono truncate">{localizedWeather}</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal('rooms')}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border bg-stone-900/85 border-white/10 text-stone-200 text-left transition-all active:scale-95 cursor-pointer"
            >
              <span className="text-base leading-none">🏠</span>
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">{isTr ? 'Mekanlar' : 'Rooms'}</div>
                <div className="text-[9px] text-amber-300 font-mono">7 {isTr ? 'Oda' : 'Rooms'}</div>
              </div>
            </button>
          </div>

          {/* 2. Two-Column Live Bento Status Cards (Tasks/Streak & Boss Raid) */}
          <div className="grid grid-cols-2 gap-2">
            {/* Left Bento: Focus Goal, Tasks & Streak */}
            <button
              type="button"
              onClick={toggleTaskDrawer}
              className="p-2.5 rounded-2xl bg-stone-900/90 border border-white/10 text-left flex flex-col justify-between gap-1.5 shadow-lg active:scale-98 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <span>🎯</span> {isTr ? 'Odak & Görev' : 'Focus & Tasks'}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {isTr ? `Sv.${playerLevel}` : `Lv.${playerLevel}`}
                </span>
              </div>
              <div className="text-xs font-bold text-stone-100 truncate w-full">
                {currentGoal ? `"${currentGoal}"` : (pendingTasksCount > 0 ? (isTr ? `${pendingTasksCount} Aktif Görev` : `${pendingTasksCount} Active Tasks`) : (isTr ? 'Görev Ekle / Hedef Seç' : 'Add Task / Set Goal'))}
              </div>
              <div className="flex items-center justify-between w-full text-[10px] text-stone-400 font-mono">
                <span>🔥 {streakDays} {isTr ? 'Gün Seri' : 'Day Streak'}</span>
                <span className="text-amber-300 font-semibold">{isTr ? 'Aç →' : 'Open →'}</span>
              </div>
            </button>

            {/* Right Bento: Live Global Boss Raid */}
            <button
              type="button"
              onClick={() => setActiveModal('boss_raid')}
              className="p-2.5 rounded-2xl bg-gradient-to-br from-stone-900/95 via-red-950/25 to-stone-900/95 border border-red-500/30 text-left flex flex-col justify-between gap-1.5 shadow-lg active:scale-98 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-300 flex items-center gap-1 truncate">
                  <span>⚔️</span> {currentBoss?.name || 'Boss Raid'}
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-300 shrink-0">
                  ⚡{strikeCharges ?? 0}
                </span>
              </div>
              <div className="w-full bg-stone-950 h-2 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${bossHpPct}%`,
                    backgroundColor: currentBoss?.themeColor || '#f59e0b',
                  }}
                />
              </div>
              <div className="flex items-center justify-between w-full text-[10px] font-mono">
                <span className="text-stone-300 font-bold">HP: {bossHpPct}%</span>
                <span className="text-red-300 font-semibold">{isTr ? 'Savaşa Gir →' : 'Join Raid →'}</span>
              </div>
            </button>
          </div>
        </div>
      )}

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

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Minimize2 } from 'lucide-react';
import { RoomCanvas } from './components/RoomCanvas';
import { TopBar } from './components/ui/TopBar';
import { MusicPlayerWidget } from './components/ui/MusicPlayerWidget';
import { FocusTimerWidget } from './components/ui/FocusTimerWidget';
import { AmbientMixerWidget } from './components/ui/AmbientMixerWidget';
import { StatsModal } from './components/ui/StatsModal';
import { JournalModal } from './components/ui/JournalModal';
import { ProgressionModal } from './components/ui/ProgressionModal';
import { RoomSwitcherModal } from './components/ui/RoomSwitcherModal';
import { SettingsModal } from './components/ui/SettingsModal';
import { CustomTimerModal } from './components/ui/CustomTimerModal';
import { SessionNotePromptModal } from './components/ui/SessionNotePromptModal';
import { ToastNotification } from './components/ui/ToastNotification';
import { CommunityChatDrawer } from './components/ui/CommunityChatDrawer';
import { AuthModal } from './components/ui/AuthModal';

import { useAppStore, getSystemTimeOfDay } from './store/useAppStore';
import { useAudioStore } from './store/useAudioStore';
import { useTimerStore } from './store/useTimerStore';
import { useCommunityStore } from './store/useCommunityStore';
import { webAudioEngine } from './audio/WebAudioEngine';

import { ShortcutsModal } from './components/ui/ShortcutsModal';
import { GamificationModal } from './components/ui/GamificationModal';
import { SubscriptionModal } from './components/ui/SubscriptionModal';
import { TaskDrawer } from './components/ui/TaskDrawer';
import { CommandPalette } from './components/ui/CommandPalette';
import { BreakGuideModal } from './components/ui/BreakGuideModal';
import { GlobeExplorerModal } from './components/ui/GlobeExplorerModal';
import { BossRaidModal } from './components/ui/BossRaidModal';
import { SessionShareModal } from './components/ui/SessionShareModal';
import { NorthStarGoalModal } from './components/ui/NorthStarGoalModal';
import { UserProfileModal } from './components/ui/UserProfileModal';
import { useSubscriptionStore } from './store/useSubscriptionStore';

import { useBossRaidStore } from './store/useBossRaidStore';

if (typeof window !== 'undefined') {
  (window as unknown as { __useAppStore: typeof useAppStore }).__useAppStore = useAppStore;
  (window as unknown as { __useTimerStore: typeof useTimerStore }).__useTimerStore = useTimerStore;
  (window as unknown as { __useBossRaidStore: typeof useBossRaidStore }).__useBossRaidStore = useBossRaidStore;
}

export const App: React.FC = () => {
  const {
    immersiveMode,
    toggleImmersiveMode,
    setImmersiveMode,
    crtOverlay,
    toggleLamp,
    toggleFireplace,
    activeModal,
    setActiveModal,
  } = useAppStore();

  const { toggleMute, togglePlayMusic } = useAudioStore();
  const { timerState, startTimer, pauseTimer, resumeTimer } = useTimerStore();
  const { isChatOpen, toggleChat, setChatOpen } = useCommunityStore();
  const selectedCrtTheme = useSubscriptionStore((s) => s.selectedCrtTheme);

  const [isTopHovered, setIsTopHovered] = useState(false);

  // Sync fullscreen state with native browser events (F11, ESC, etc.)
  useEffect(() => {
    const handleFullscreenChange = () => {
      useAppStore.setState({ isFullscreen: !!document.fullscreenElement });
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette (Ctrl+K or Cmd+K) works anywhere
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveModal(activeModal === 'command_palette' ? 'none' : 'command_palette');
        return;
      }

      // Don't intercept if user is typing in textarea or input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Escape') {
        if (isChatOpen) {
          setChatOpen(false);
        } else if (activeModal !== 'none') {
          setActiveModal('none');
        } else if (immersiveMode) {
          setImmersiveMode(false);
        }
        return;
      }

      // If any modal or chat drawer is open, prevent room and timer keyboard triggers
      if (activeModal !== 'none' || isChatOpen) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (timerState === 'running') {
          pauseTimer();
        } else if (timerState === 'paused') {
          resumeTimer();
        } else {
          startTimer();
        }
      } else if (e.key === 't' || e.key === 'T') {
        setActiveModal('tasks');
      } else if (e.key === 'b' || e.key === 'B') {
        setActiveModal('break_guide');
      } else if (e.key === 'c' || e.key === 'C') {
        toggleChat();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'i' || e.key === 'I') {
        toggleImmersiveMode();
      } else if (e.key === 'p' || e.key === 'P') {
        togglePlayMusic();
      } else if (e.key === 'l' || e.key === 'L') {
        webAudioEngine.playLampSwitch();
        toggleLamp();
      } else if (e.key === 'f' || e.key === 'F') {
        const willBeActive = !useAppStore.getState().fireplaceActive;
        toggleFireplace();
        webAudioEngine.playFireplaceStoke();
        useAudioStore.getState().setChannelVolume('fireplace', willBeActive ? 0.65 : 0);
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setActiveModal('shortcuts');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    timerState, 
    startTimer, 
    pauseTimer, 
    resumeTimer,
    isChatOpen,
    toggleChat,
    setChatOpen, 
    toggleMute, 
    toggleImmersiveMode, 
    togglePlayMusic, 
    toggleLamp, 
    toggleFireplace,
    activeModal,
    setActiveModal,
    immersiveMode,
    setImmersiveMode,
  ]);

  // First interaction Audio Context unlock & ambient weather/hearth sync
  useEffect(() => {
    const handleFirstInteraction = () => {
      webAudioEngine.init();
      const appState = useAppStore.getState();
      const weather = appState.weather;
      const audio = useAudioStore.getState();
      
      // Auto-enable fireplace crackling if in a fireplace room and active
      if (appState.fireplaceActive && (appState.activeRoom === 'cabin' || appState.activeRoom === 'bedroom')) {
        if (audio.ambientVolumes.fireplace === 0) {
          audio.setChannelVolume('fireplace', 0.65);
        }
      }

      if (weather === 'storm') {
        audio.setChannelVolume('rain', 0.85);
        audio.setChannelVolume('wind', 0.45);
        audio.setChannelVolume('thunder', 0.75);
      } else if (weather === 'heavy_rain') {
        audio.setChannelVolume('rain', 0.85);
        audio.setChannelVolume('wind', 0.25);
        audio.setChannelVolume('thunder', 0.15);
      } else if (weather === 'rain') {
        audio.setChannelVolume('rain', 0.55);
        audio.setChannelVolume('wind', 0.05);
        audio.setChannelVolume('thunder', 0);
      } else if (weather === 'snow') {
        audio.setChannelVolume('rain', 0);
        audio.setChannelVolume('wind', 0.35);
        audio.setChannelVolume('thunder', 0);
      } else if (weather === 'clear') {
        audio.setChannelVolume('rain', 0);
        audio.setChannelVolume('thunder', 0);
      }
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // Real-time Firebase Community Chat Subscription across all tabs & devices
  useEffect(() => {
    const unsub = useCommunityStore.getState().initChatSubscription();
    return () => {
      unsub?.();
    };
  }, []);

  // Real-world system clock synchronization for time of day
  const isAutoTime = useAppStore((s) => s.isAutoTime);
  const setTimeOfDay = useAppStore((s) => s.setTimeOfDay);

  useEffect(() => {
    if (!isAutoTime) return;
    const syncTime = () => {
      const current = getSystemTimeOfDay();
      if (useAppStore.getState().timeOfDay !== current) {
        setTimeOfDay(current);
      }
    };
    syncTime();
    const interval = window.setInterval(syncTime, 30000);
    return () => window.clearInterval(interval);
  }, [isAutoTime, setTimeOfDay]);

  // In immersive mode, hovering near the top edge (< 55px) temporarily reveals the TopBar
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (immersiveMode) {
      setIsTopHovered(e.clientY < 55);
    }
  }, [immersiveMode]);

  const isUiVisible = !immersiveMode || isTopHovered;

  return (
    <div
      onMouseMove={handleMouseMove}
      className={`relative w-screen h-screen overflow-hidden bg-stone-950 font-sans select-none ${
        crtOverlay ? `crt-overlay crt-theme-${selectedCrtTheme}` : ''
      }`}
    >
      {/* 1. Main Pixel Art Study Room Canvas Viewport */}
      <RoomCanvas />

      {/* 2. Cozy Vignette Lighting Edge */}
      <div className="vignette-overlay absolute inset-0 pointer-events-none z-10" />

      {/* 3. Toast Notifications */}
      <ToastNotification />

      {/* 4. Floating UI Controls Layer (Fades in Immersive Mode) */}
      <div
        className={`transition-opacity duration-500 ${
          isUiVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <TopBar />
        <MusicPlayerWidget />
        <FocusTimerWidget />
        <AmbientMixerWidget />
      </div>

      {/* Floating Zen / Immersive Mode Exit Button */}
      {immersiveMode && (
        <div className="fixed top-3.5 right-4 z-50 animate-fade-in flex items-center gap-2">
          <button
            onClick={() => {
              toggleImmersiveMode();
              webAudioEngine.init();
              webAudioEngine.playChime('wood_block');
            }}
            className="px-3.5 py-1.5 rounded-full bg-stone-900/90 hover:bg-stone-800 text-stone-200 hover:text-amber-300 border border-stone-700/90 hover:border-amber-500/50 backdrop-blur-md shadow-2xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer group active:scale-95"
            title={useAppStore.getState().language === 'tr' ? 'Odak Modundan Çık (ESC veya I)' : 'Exit Focus Mode (ESC or I)'}
          >
            <Minimize2 className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>{useAppStore.getState().language === 'tr' ? 'Odak Modundan Çık (ESC)' : 'Exit Focus (ESC)'}</span>
          </button>
        </div>
      )}

      {/* 5. Modals, Drawers & Dialogs */}
      <CommunityChatDrawer />
      <TaskDrawer />
      <CommandPalette />
      <BreakGuideModal />
      <GlobeExplorerModal />
      <SubscriptionModal />
      <StatsModal />
      <JournalModal />
      <ProgressionModal />
      <RoomSwitcherModal />
      <SettingsModal />
      <CustomTimerModal />
      <SessionNotePromptModal />
      <BossRaidModal />
      <SessionShareModal />
      <NorthStarGoalModal />
      <ShortcutsModal />
      <GamificationModal />
      <UserProfileModal />
      <AuthModal />
    </div>
  );
};

export default App;

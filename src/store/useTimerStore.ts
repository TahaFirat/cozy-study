import { create } from 'zustand';
import { TimerState } from '../types';
import { webAudioEngine } from '../audio/WebAudioEngine';
import { useAppStore } from './useAppStore';
import { useStatsStore } from './useStatsStore';
import { TRANSLATIONS } from '../i18n/translations';
import { useSubscriptionStore } from './useSubscriptionStore';
import { useBossRaidStore, isFrenzyHour } from './useBossRaidStore';

interface TimerStoreState {
  durationMinutes: number;
  secondsRemaining: number;
  timerState: TimerState;
  lastCompletedMinutes: number;
  isNotePromptOpen: boolean;
  currentGoal: string;

  // Actions
  setDuration: (minutes: number) => void;
  setCurrentGoal: (goal: string) => void;
  startTimer: (minutes?: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  tick: () => void;
  finishSession: () => void;
  closeNotePrompt: () => void;
  saveSessionNote: (note: string) => void;
}

let timerInterval: number | null = null;
let targetEndTime: number | null = null;

const TIMER_STORAGE_KEY = 'cozy_focus_timer_v1';

interface PersistedTimerSnapshot {
  durationMinutes: number;
  secondsRemaining: number;
  timerState: TimerState;
  targetEndTime: number | null;
  currentGoal: string;
  updatedAt: number;
}

function saveTimerSnapshot(snapshot: PersistedTimerSnapshot) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(snapshot));
    }
  } catch {}
}

function loadTimerSnapshot(): PersistedTimerSnapshot | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(TIMER_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PersistedTimerSnapshot;
    }
  } catch {}
  return null;
}

export const useTimerStore = create<TimerStoreState>((set, get) => ({
  durationMinutes: 25,
  secondsRemaining: 25 * 60,
  timerState: 'idle',
  lastCompletedMinutes: 25,
  isNotePromptOpen: false,
  currentGoal: '',

  setCurrentGoal: (currentGoal) => {
    set({ currentGoal });
    const s = get();
    saveTimerSnapshot({
      durationMinutes: s.durationMinutes,
      secondsRemaining: s.secondsRemaining,
      timerState: s.timerState,
      targetEndTime,
      currentGoal,
      updatedAt: Date.now(),
    });
  },

  setDuration: (minutes) => {
    if (get().timerState === 'running') return;
    const clampedMins = Math.max(1, Math.min(180, Math.floor(minutes || 25)));
    targetEndTime = null;
    set({
      durationMinutes: clampedMins,
      secondsRemaining: clampedMins * 60,
      timerState: 'idle',
    });
    saveTimerSnapshot({
      durationMinutes: clampedMins,
      secondsRemaining: clampedMins * 60,
      timerState: 'idle',
      targetEndTime: null,
      currentGoal: get().currentGoal,
      updatedAt: Date.now(),
    });
  },

  startTimer: (minutes) => {
    const rawMins = minutes ?? get().durationMinutes;
    const mins = Math.max(1, Math.min(180, Math.floor(rawMins || 25)));
    const totalSecs = mins * 60;
    targetEndTime = Date.now() + totalSecs * 1000;

    set({
      durationMinutes: mins,
      secondsRemaining: totalSecs,
      timerState: 'running',
    });

    saveTimerSnapshot({
      durationMinutes: mins,
      secondsRemaining: totalSecs,
      timerState: 'running',
      targetEndTime,
      currentGoal: get().currentGoal,
      updatedAt: Date.now(),
    });

    webAudioEngine.setTimerKeepAlive(true);
    webAudioEngine.playZenChime('start');
    const lang = useAppStore.getState().language;
    useAppStore.getState().showToast(TRANSLATIONS[lang].timer.sessionYours(mins), 4000);

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = window.setInterval(() => {
      get().tick();
    }, 1000);
  },

  pauseTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    const remaining = targetEndTime
      ? Math.max(0, Math.round((targetEndTime - Date.now()) / 1000))
      : get().secondsRemaining;
    targetEndTime = null;
    webAudioEngine.setTimerKeepAlive(false);
    set({ timerState: 'paused', secondsRemaining: remaining });
    saveTimerSnapshot({
      durationMinutes: get().durationMinutes,
      secondsRemaining: remaining,
      timerState: 'paused',
      targetEndTime: null,
      currentGoal: get().currentGoal,
      updatedAt: Date.now(),
    });
  },

  resumeTimer: () => {
    const remaining = Math.max(1, get().secondsRemaining);
    targetEndTime = Date.now() + remaining * 1000;
    set({ timerState: 'running', secondsRemaining: remaining });
    saveTimerSnapshot({
      durationMinutes: get().durationMinutes,
      secondsRemaining: remaining,
      timerState: 'running',
      targetEndTime,
      currentGoal: get().currentGoal,
      updatedAt: Date.now(),
    });
    webAudioEngine.setTimerKeepAlive(true);
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = window.setInterval(() => {
      get().tick();
    }, 1000);
  },

  resetTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    targetEndTime = null;
    webAudioEngine.setTimerKeepAlive(false);
    const totalSecs = get().durationMinutes * 60;
    set({
      timerState: 'idle',
      secondsRemaining: totalSecs,
    });
    saveTimerSnapshot({
      durationMinutes: get().durationMinutes,
      secondsRemaining: totalSecs,
      timerState: 'idle',
      targetEndTime: null,
      currentGoal: get().currentGoal,
      updatedAt: Date.now(),
    });
  },

  tick: () => {
    const { secondsRemaining, timerState, durationMinutes, currentGoal } = get();
    if (timerState !== 'running') return;

    let nextSeconds = secondsRemaining - 1;
    if (targetEndTime) {
      nextSeconds = Math.max(0, Math.round((targetEndTime - Date.now()) / 1000));
    }

    const elapsedSeconds = (durationMinutes * 60) - nextSeconds;
    const lang = useAppStore.getState().language;
    const isTr = lang === 'tr';

    // 20-20-20 Eye Strain Reminder (at 20m)
    if (elapsedSeconds === 20 * 60) {
      useAppStore.getState().showToast(
        isTr 
          ? '👁️ 20-20-20 Kuralı: 20 saniye uzağa bakın, gözlerinizi dinlendirin.' 
          : '👁️ 20-20-20 Rule: Look away for 20 seconds to rest your eyes.',
        5000
      );
    }
    // Posture check (at 35m)
    if (elapsedSeconds === 35 * 60) {
      useAppStore.getState().showToast(
        isTr 
          ? '🧘 Duruş Kontrolü: Sırtınızı dikleştirin ve omuzları gevşetin.' 
          : '🧘 Posture Check: Straighten your back and relax shoulders.',
        5000
      );
    }
    // Hydration alert (at 50m)
    if (elapsedSeconds === 50 * 60) {
      useAppStore.getState().showToast(
        isTr 
          ? '💧 Su Vakti: Bir bardak su için ve odağınızı tazeleyin.' 
          : '💧 Hydration Alert: Take a sip of water to refresh focus.',
        5000
      );
    }

    if (nextSeconds <= 0) {
      get().finishSession();
    } else {
      set({ secondsRemaining: nextSeconds });
      // Persist periodically so even abrupt WebView kills preserve wall-clock targetEndTime
      if (nextSeconds % 5 === 0) {
        saveTimerSnapshot({
          durationMinutes,
          secondsRemaining: nextSeconds,
          timerState: 'running',
          targetEndTime,
          currentGoal,
          updatedAt: Date.now(),
        });
      }
    }
  },

  finishSession: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    targetEndTime = null;
    webAudioEngine.setTimerKeepAlive(false);
    const completedMins = get().durationMinutes;
    const currentRoom = useAppStore.getState().activeRoom;

    set({
      timerState: 'completed',
      secondsRemaining: 0,
      lastCompletedMinutes: completedMins,
      isNotePromptOpen: true,
    });

    saveTimerSnapshot({
      durationMinutes: completedMins,
      secondsRemaining: completedMins * 60,
      timerState: 'idle',
      targetEndTime: null,
      currentGoal: get().currentGoal,
      updatedAt: Date.now(),
    });

    // 1. Immediately record session in stats so XP and badges are awarded without waiting for note prompt
    useStatsStore.getState().recordSession(completedMins, currentRoom, '');

    // 2. Award Focus Strike Charges (Odak Vuruş Yükü) for Boss Raid!
    const isFrenzy = isFrenzyHour();
    const baseCharges = Math.max(1, Math.floor(completedMins / 25));
    const earnedCharges = isFrenzy ? baseCharges * 2 : baseCharges;
    useBossRaidStore.getState().addStrikeCharges(earnedCharges);

    // 3. Record session combo & daily dawn bonus in Boss Raid
    const sessionProgress = useBossRaidStore.getState().recordSessionCompleted(completedMins);

    // 4. Deal collective damage to active world boss with completed focus session
    const hasGoal = Boolean(get().currentGoal && get().currentGoal.trim().length > 0);
    useBossRaidStore.getState().attackCurrentBoss(completedMins, hasGoal);

    try {
      const selectedChime = useSubscriptionStore.getState().selectedChime;
      webAudioEngine.playChime(selectedChime);
    } catch {}
    const lang = useAppStore.getState().language;

    let chargeMsg = lang === 'tr'
      ? `⚡ +${earnedCharges} Odak Vuruş Yükü kazandın!`
      : `⚡ Earned +${earnedCharges} Focus Strike Charge!`;

    if (isFrenzy) {
      chargeMsg += lang === 'tr' ? ' (🔥 2x Altın Saat Bonusu)' : ' (🔥 2x Frenzy Bonus)';
    }

    if (sessionProgress.comboCount > 1) {
      chargeMsg += lang === 'tr' ? ` • 🔥 ${sessionProgress.comboCount}'li Odak Kombosu!` : ` • 🔥 ${sessionProgress.comboCount}x Focus Combo!`;
    }

    useAppStore.getState().showToast(
      `${TRANSLATIONS[lang].timer.sessionStayed(completedMins)} ${TRANSLATIONS[lang].timer.focusRecorded(completedMins)} • ${chargeMsg}`,
      7000
    );
  },

  closeNotePrompt: () => {
    set({ isNotePromptOpen: false, timerState: 'idle', secondsRemaining: get().durationMinutes * 60 });
  },

  saveSessionNote: (note: string) => {
    if (note.trim()) {
      useStatsStore.getState().updateLatestSessionNote(note.trim());
    }
    set({ isNotePromptOpen: false, timerState: 'idle', secondsRemaining: get().durationMinutes * 60 });
    const lang = useAppStore.getState().language;
    useAppStore.getState().showToast(TRANSLATIONS[lang].toasts.journalSaved, 3000);
  },
}));

// Hydrate & synchronize Focus Timer across backgrounding, screen lock, or WebView reloads
if (typeof window !== 'undefined') {
  const saved = loadTimerSnapshot();
  if (saved) {
    const mins = Math.max(1, Math.min(180, Math.floor(saved.durationMinutes || 25)));
    const goal = saved.currentGoal || '';

    if (saved.timerState === 'running' && saved.targetEndTime) {
      const remaining = Math.max(0, Math.round((saved.targetEndTime - Date.now()) / 1000));
      if (remaining > 0) {
        targetEndTime = saved.targetEndTime;
        useTimerStore.setState({
          durationMinutes: mins,
          secondsRemaining: remaining,
          timerState: 'running',
          currentGoal: goal,
        });
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = window.setInterval(() => {
          useTimerStore.getState().tick();
        }, 1000);
      } else {
        // Timer completed while app was suspended/reloaded in background
        useTimerStore.setState({
          durationMinutes: mins,
          secondsRemaining: 1,
          timerState: 'running',
          currentGoal: goal,
        });
        window.setTimeout(() => {
          if (useTimerStore.getState().timerState === 'running') {
            useTimerStore.getState().finishSession();
          }
        }, 450);
      }
    } else if (saved.timerState === 'paused' && saved.secondsRemaining > 0) {
      useTimerStore.setState({
        durationMinutes: mins,
        secondsRemaining: Math.min(mins * 60, saved.secondsRemaining),
        timerState: 'paused',
        currentGoal: goal,
      });
    } else {
      useTimerStore.setState({
        durationMinutes: mins,
        secondsRemaining: mins * 60,
        timerState: 'idle',
        currentGoal: goal,
      });
    }
  }

  const syncTimerFromWallClock = () => {
    const state = useTimerStore.getState();
    if (state.timerState === 'running') {
      if (!targetEndTime) {
        const snap = loadTimerSnapshot();
        if (snap?.targetEndTime) {
          targetEndTime = snap.targetEndTime;
        }
      }
      state.tick();
      if (useTimerStore.getState().timerState === 'running' && !timerInterval) {
        timerInterval = window.setInterval(() => {
          useTimerStore.getState().tick();
        }, 1000);
      }
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      syncTimerFromWallClock();
    }
  });
  window.addEventListener('focus', syncTimerFromWallClock);
  window.addEventListener('pageshow', syncTimerFromWallClock);
}

import { create } from 'zustand';
import { TimerState } from '../types';
import { webAudioEngine } from '../audio/WebAudioEngine';
import { useAppStore } from './useAppStore';
import { useStatsStore } from './useStatsStore';
import { TRANSLATIONS } from '../i18n/translations';
import { useSubscriptionStore } from './useSubscriptionStore';
import { useBossRaidStore } from './useBossRaidStore';

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

export const useTimerStore = create<TimerStoreState>((set, get) => ({
  durationMinutes: 25,
  secondsRemaining: 25 * 60,
  timerState: 'idle',
  lastCompletedMinutes: 25,
  isNotePromptOpen: false,
  currentGoal: '',

  setCurrentGoal: (currentGoal) => set({ currentGoal }),

  setDuration: (minutes) => {
    if (get().timerState === 'running') return;
    set({
      durationMinutes: minutes,
      secondsRemaining: minutes * 60,
      timerState: 'idle',
    });
  },

  startTimer: (minutes) => {
    const mins = minutes ?? get().durationMinutes;
    set({
      durationMinutes: mins,
      secondsRemaining: mins * 60,
      timerState: 'running',
    });

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
    set({ timerState: 'paused' });
  },

  resumeTimer: () => {
    set({ timerState: 'running' });
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
    set({
      timerState: 'idle',
      secondsRemaining: get().durationMinutes * 60,
    });
  },

  tick: () => {
    const { secondsRemaining, timerState, durationMinutes } = get();
    if (timerState !== 'running') return;

    const elapsedSeconds = (durationMinutes * 60) - secondsRemaining + 1;
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

    if (secondsRemaining <= 1) {
      get().finishSession();
    } else {
      set({ secondsRemaining: secondsRemaining - 1 });
    }
  },

  finishSession: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    const completedMins = get().durationMinutes;
    set({
      timerState: 'completed',
      secondsRemaining: 0,
      lastCompletedMinutes: completedMins,
      isNotePromptOpen: true,
    });

    const selectedChime = useSubscriptionStore.getState().selectedChime;
    webAudioEngine.playChime(selectedChime);
    const lang = useAppStore.getState().language;
    useAppStore.getState().showToast(`${TRANSLATIONS[lang].timer.sessionStayed(completedMins)} ${TRANSLATIONS[lang].timer.focusRecorded(completedMins)}`, 6000);

    // Deal damage to active Chronos Boss Raid
    useBossRaidStore.getState().attackCurrentBoss(completedMins, !!get().currentGoal.trim());
  },

  closeNotePrompt: () => {
    // Record session without note if closed
    const completedMins = get().lastCompletedMinutes;
    const currentRoom = useAppStore.getState().activeRoom;
    useStatsStore.getState().recordSession(completedMins, currentRoom, '');
    set({ isNotePromptOpen: false, timerState: 'idle', secondsRemaining: get().durationMinutes * 60 });
  },

  saveSessionNote: (note: string) => {
    const completedMins = get().lastCompletedMinutes;
    const currentRoom = useAppStore.getState().activeRoom;
    useStatsStore.getState().recordSession(completedMins, currentRoom, note);
    set({ isNotePromptOpen: false, timerState: 'idle', secondsRemaining: get().durationMinutes * 60 });
    const lang = useAppStore.getState().language;
    useAppStore.getState().showToast(TRANSLATIONS[lang].toasts.journalSaved, 3000);
  },
}));

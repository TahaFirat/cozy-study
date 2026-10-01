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
    const clampedMins = Math.max(1, Math.min(180, Math.floor(minutes || 25)));
    set({
      durationMinutes: clampedMins,
      secondsRemaining: clampedMins * 60,
      timerState: 'idle',
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
    targetEndTime = null;
    set({ timerState: 'paused' });
  },

  resumeTimer: () => {
    const remaining = Math.max(0, get().secondsRemaining);
    targetEndTime = Date.now() + remaining * 1000;
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
    targetEndTime = null;
    set({
      timerState: 'idle',
      secondsRemaining: get().durationMinutes * 60,
    });
  },

  tick: () => {
    const { secondsRemaining, timerState, durationMinutes } = get();
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
    }
  },

  finishSession: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    const completedMins = get().durationMinutes;
    const currentRoom = useAppStore.getState().activeRoom;

    set({
      timerState: 'completed',
      secondsRemaining: 0,
      lastCompletedMinutes: completedMins,
      isNotePromptOpen: true,
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

import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Clock, Sparkles, Coffee, Target, Check, X } from 'lucide-react';
import { useTimerStore } from '../../store/useTimerStore';
import { useAppStore } from '../../store/useAppStore';
import { TRANSLATIONS } from '../../i18n/translations';
import { webAudioEngine } from '../../audio/WebAudioEngine';

export const FocusTimerWidget: React.FC = () => {
  const {
    durationMinutes,
    secondsRemaining,
    timerState,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    setDuration,
    currentGoal,
    setCurrentGoal,
  } = useTimerStore();

  const { language, breakMode, setBreakMode, setActiveModal } = useAppStore();
  const [showPresets, setShowPresets] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(currentGoal);
  const t = TRANSLATIONS[language];

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isRunning = timerState === 'running';
  const focusPresets = [25, 50, 90];
  const breakPresets = [5, 15];

  const handleToggleTimer = () => {
    webAudioEngine.init();
    if (isRunning) {
      pauseTimer();
    } else if (timerState === 'paused') {
      resumeTimer();
    } else {
      startTimer();
    }
  };

  const handleSelectDuration = (mins: number, isBreak = false) => {
    webAudioEngine.init();
    setBreakMode(isBreak ? (mins === 5 ? 'short' : 'long') : 'none');
    setDuration(mins);
    setShowPresets(false);
  };

  return (
    <div 
      className="absolute left-1/2 -translate-x-1/2 z-30 pointer-events-auto transition-all duration-300 flex flex-col items-center"
      style={{ bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
    >
      {/* Current Goal / Focus Pledge Pill */}
      {currentGoal && (
        <div className="mb-2 flex items-center justify-center animate-in fade-in slide-in-from-bottom-2">
          <div className="px-3.5 py-1 glass-island rounded-full shadow-lg text-[11px] text-amber-200 flex items-center gap-2 border border-amber-500/30">
            <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-semibold text-stone-400">{language === 'tr' ? 'Hedef:' : 'Pledge:'}</span>
            <span className="font-medium text-amber-100 max-w-[220px] truncate">{currentGoal}</span>
            <button
              onClick={() => {
                setCurrentGoal('');
                setTempGoal('');
              }}
              className="ml-1 text-stone-400 hover:text-stone-200 p-0.5 rounded cursor-pointer"
              title={language === 'tr' ? 'Hedefi Kaldır' : 'Clear Goal'}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <div
        className={`flex items-center gap-3.5 px-5 py-2.5 glass-island text-stone-100 rounded-2xl shadow-2xl transition-all duration-300 ${
          isRunning
            ? breakMode !== 'none'
              ? 'border-emerald-500/70 shadow-[0_0_24px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/30'
              : 'border-amber-500/70 shadow-[0_0_24px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/30'
            : 'border-white/10 hover:border-white/20'
        }`}
      >
        {/* Status Indicator / Focus Icon */}
        <button
          onClick={() => setShowPresets(!showPresets)}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isRunning
              ? breakMode !== 'none'
                ? 'text-emerald-400 animate-pulse bg-emerald-500/10'
                : 'text-amber-400 animate-pulse bg-amber-500/10'
              : 'text-stone-400 hover:text-stone-100 bg-stone-800/60'
          }`}
          title={t.timer.customDuration}
        >
          {breakMode !== 'none' ? (
            <Coffee className="w-5 h-5 text-emerald-400" />
          ) : isRunning ? (
            <Sparkles className="w-5 h-5 text-amber-400" />
          ) : (
            <Clock className="w-5 h-5" />
          )}
        </button>

        {/* Large, Clear Digital Countdown */}
        <div 
          onClick={() => setShowPresets(!showPresets)}
          className="font-mono text-3xl font-bold tracking-widest text-amber-100 min-w-[95px] text-center cursor-pointer select-none"
          title={t.timer.customDuration}
        >
          {formatTime(secondsRemaining)}
        </div>

        {/* Action Buttons: Play/Pause & Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleTimer}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors cursor-pointer shadow-md ${
              isRunning
                ? breakMode !== 'none'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
                  : 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
            }`}
            title={isRunning ? t.timer.pause : t.timer.start}
          >
            {isRunning ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={() => {
              resetTimer();
              setBreakMode('none');
            }}
            className="p-2 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer rounded-lg hover:bg-stone-800/80"
            title={t.timer.reset}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Duration & Break selector dropdown popup */}
        {showPresets && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-stone-900/95 border border-stone-700/80 rounded-xl shadow-2xl p-2.5 flex flex-col gap-2 backdrop-blur-md min-w-[260px]">
            {/* Focus presets row */}
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-wider px-1">
                {t.timer.tags.deep_work}
              </span>
              <div className="flex items-center gap-1">
                {focusPresets.map((mins) => (
                  <button
                    key={mins}
                    onClick={() => handleSelectDuration(mins, false)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                      durationMinutes === mins && breakMode === 'none'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                        : 'text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Break presets row */}
            <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-stone-800">
              <span className="text-[11px] font-semibold text-emerald-400/80 uppercase tracking-wider px-1">
                {t.timer.takeBreak}
              </span>
              <div className="flex items-center gap-1">
                {breakPresets.map((mins) => (
                  <button
                    key={mins}
                    onClick={() => handleSelectDuration(mins, true)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                      durationMinutes === mins && breakMode !== 'none'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                        : 'text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    {mins === 5 ? t.timer.break5 : t.timer.break15}
                  </button>
                ))}
              </div>
            </div>

            {/* Focus Pledge / Goal Input */}
            <div className="pt-2 border-t border-stone-800/90">
              <div className="flex items-center justify-between text-[10px] font-bold text-amber-300/90 mb-1 px-0.5">
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-amber-400" />
                  <span>{language === 'tr' ? 'Seans Hedefi / Odak Sözü' : 'Session Goal / Pledge'}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={tempGoal}
                  onChange={(e) => setTempGoal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setCurrentGoal(tempGoal.trim());
                      setShowPresets(false);
                    }
                  }}
                  placeholder={language === 'tr' ? 'Örn: 20 soru çöz, API yaz...' : 'E.g. Solve 20 math problems...'}
                  className="flex-1 bg-stone-950 border border-stone-700/80 rounded-lg px-2 py-1 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  maxLength={60}
                />
                <button
                  type="button"
                  onClick={() => {
                    setCurrentGoal(tempGoal.trim());
                    setShowPresets(false);
                  }}
                  className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-all cursor-pointer shadow"
                  title={language === 'tr' ? 'Hedefi Kaydet' : 'Save Goal'}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Custom Minutes & Guided Break Options */}
            <div className="pt-1.5 border-t border-stone-800 space-y-1">
              <button
                onClick={() => {
                  setShowPresets(false);
                  setActiveModal('timer_custom');
                }}
                className="w-full py-1 text-xs font-medium text-stone-400 hover:text-amber-200 hover:bg-stone-800/80 rounded transition-colors cursor-pointer"
              >
                ✦ {t.timer.customDuration}
              </button>
              <button
                onClick={() => {
                  setShowPresets(false);
                  setActiveModal('break_guide');
                }}
                className="w-full py-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🌿</span>
                <span>{language === 'tr' ? 'Rehberli Mola Egzersizi' : 'Guided Break Guide'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Clock, Play } from 'lucide-react';
import { useTimerStore } from '../../store/useTimerStore';
import { useAppStore } from '../../store/useAppStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { TRANSLATIONS } from '../../i18n/translations';
import { Crown } from 'lucide-react';

export const CustomTimerModal: React.FC = () => {
  const { activeModal, setActiveModal, language } = useAppStore();
  const { durationMinutes, setDuration, startTimer } = useTimerStore();
  const { isPro } = useSubscriptionStore();
  const [customVal, setCustomVal] = useState(durationMinutes);

  if (activeModal !== 'timer_custom') return null;

  const t = TRANSLATIONS[language];
  const presets = [15, 25, 45, 50, 60, 90, 120, 180];

  const handleStart = (mins: number) => {
    setDuration(mins);
    startTimer(mins);
    setActiveModal('none');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm pointer-events-auto">
      <div className="bg-stone-900/95 text-stone-100 border border-stone-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-amber-200">{t.timer.customDuration}</h3>
              <p className="text-xs text-stone-400">{language === 'tr' ? 'Sakin ve derin çalışma süreni belirle' : 'Set your quiet deep work stretch'}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets Grid */}
        <div className="py-4 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {presets.map((mins) => {
              const isLocked = mins > 60 && !isPro;
              return (
                <button
                  key={mins}
                  onClick={() => {
                    if (isLocked) {
                      setActiveModal('subscription');
                      return;
                    }
                    handleStart(mins);
                  }}
                  className={`py-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer relative ${
                    customVal === mins
                      ? 'bg-amber-500/25 border-amber-500/60 text-amber-200'
                      : isLocked
                      ? 'bg-stone-900/60 border-amber-500/20 text-stone-500'
                      : 'bg-stone-800/70 hover:bg-stone-800 border-stone-700/60 text-stone-200'
                  }`}
                >
                  {mins} {language === 'tr' ? 'dk' : 'm'}
                  {isLocked && (
                    <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-amber-500 text-stone-950 rounded-full w-3.5 h-3.5 flex items-center justify-center">👑</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Slider for custom value — PRO only */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-200 mb-2">
              <span className="flex items-center gap-1.5">
                {t.timer.customMinutes}:
                {!isPro && <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold">PRO</span>}
              </span>
              <span className="text-amber-300 font-bold text-base font-mono">{customVal} {language === 'tr' ? 'dk' : 'min'}</span>
            </div>
            {isPro ? (
              <input
                type="range"
                min="5"
                max="240"
                step="5"
                value={customVal}
                onChange={(e) => setCustomVal(parseInt(e.target.value))}
                className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            ) : (
              <button
                onClick={() => setActiveModal('subscription')}
                className="w-full h-8 bg-stone-900/60 border border-amber-500/30 rounded-lg flex items-center justify-center gap-2 text-xs text-amber-400 font-medium cursor-pointer hover:bg-amber-950/30 transition-colors"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>{language === 'tr' ? 'Özel süre için PRO gereklidir' : 'Custom duration requires PRO'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3.5 border-t border-stone-800 flex justify-end gap-2.5">
          <button
            onClick={() => setActiveModal('none')}
            className="px-4 py-2 rounded-lg bg-stone-800 text-stone-300 text-xs font-semibold hover:bg-stone-700 cursor-pointer"
          >
            {t.timer.cancel}
          </button>
          <button
            onClick={() => handleStart(customVal)}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold cursor-pointer shadow"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{t.timer.beginSession}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { useTimerStore } from '../../store/useTimerStore';
import { useAppStore } from '../../store/useAppStore';
import { TRANSLATIONS } from '../../i18n/translations';

export const SessionNotePromptModal: React.FC = () => {
  const { isNotePromptOpen, lastCompletedMinutes, saveSessionNote, closeNotePrompt } = useTimerStore();
  const { language } = useAppStore();
  const t = TRANSLATIONS[language];

  const [note, setNote] = useState('');
  const [selectedTagKey, setSelectedTagKey] = useState<keyof typeof t.timer.tags>('deep_work');

  if (!isNotePromptOpen) return null;

  const tagKeys: (keyof typeof t.timer.tags)[] = ['deep_work', 'coding', 'reading', 'writing', 'study', 'creative'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tagLabel = t.timer.tags[selectedTagKey];
    const finalNote = note.trim() 
      ? `[${tagLabel}] ${note.trim()}` 
      : `[${tagLabel}] ${language === 'tr' ? 'Sessiz derin odaklanma.' : 'Quiet focused session.'}`;
    saveSessionNote(finalNote);
    setNote('');
  };

  const handleSkip = () => {
    closeNotePrompt();
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm pointer-events-auto">
      <div className="bg-stone-900/95 text-stone-100 border border-amber-600/70 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        
        {/* Harmonious gentle header */}
        <div className="text-center pb-4 border-b border-stone-800">
          <div className="w-12 h-12 mx-auto mb-2.5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-base font-bold text-amber-200">
            {t.timer.sessionStayed(lastCompletedMinutes)}
          </h3>
          <p className="text-xs font-semibold text-amber-400 mt-1 font-mono">
            {t.timer.focusRecorded(lastCompletedMinutes)}
          </p>
        </div>

        {/* Note Form */}
        <form onSubmit={handleSubmit} className="py-4 space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-stone-300 block mb-2">
              {t.timer.whatWorkedOn} <span className="text-stone-500 font-normal">{t.timer.optional}</span>
            </label>
            
            {/* Quick Tag Pills */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {tagKeys.map((key) => {
                const label = t.timer.tags[key];
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setSelectedTagKey(key)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      selectedTagKey === key
                        ? 'bg-amber-500/30 text-amber-200 border border-amber-500/60'
                        : 'bg-stone-800 text-stone-300 hover:text-stone-100 border border-transparent'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={language === 'tr' ? 'Örn. Zorlu bir hatayı çözdüm, 2 bölüm okudum, tasarım eskizlerini bitirdim...' : 'e.g., Solved challenging bugs, finished 2 chapters, wrote proposal...'}
              rows={3}
              autoFocus
              className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 resize-none font-sans leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSkip}
                className="px-3 py-2 rounded-lg text-stone-400 hover:text-stone-200 text-xs font-semibold cursor-pointer"
              >
                {t.timer.skip}
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSubmit(new Event('submit') as unknown as React.FormEvent);
                  useAppStore.getState().setActiveModal('session_share');
                }}
                className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors border border-amber-500/30"
                title={language === 'tr' ? '9:16 Hikaye Kartı Oluştur' : 'Create 9:16 Story Card'}
              >
                <span>📸 {language === 'tr' ? 'Kart Paylaş' : 'Share Card'}</span>
              </button>
            </div>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold cursor-pointer shadow-md transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{t.timer.saveJournal}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

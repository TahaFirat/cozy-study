import React from 'react';
import { X, Award, CheckCircle2, Lock } from 'lucide-react';
import { useStatsStore } from '../../store/useStatsStore';
import { useAppStore } from '../../store/useAppStore';
import { TRANSLATIONS } from '../../i18n/translations';

export const ProgressionModal: React.FC = () => {
  const { activeModal, setActiveModal, language } = useAppStore();
  const { getTotalFocusHours, getUnlockedProgression } = useStatsStore();

  if (activeModal !== 'progression') return null;

  const t = TRANSLATIONS[language];
  const totalHours = getTotalFocusHours();
  const tiers = getUnlockedProgression();

  // Find next tier
  const nextTier = tiers.find((t) => !t.unlocked);
  const hoursToNext = nextTier ? Math.max(0, Number((nextTier.hoursRequired - totalHours).toFixed(1))) : 0;
  const progressToNext = nextTier ? Math.min(100, Math.round((totalHours / nextTier.hoursRequired) * 100)) : 100;

  const getTierIcon = (type: string) => {
    switch (type) {
      case 'plant': return '🪴';
      case 'books': return '📚';
      case 'desk': return '🪵';
      case 'posters': return '✨';
      case 'fireplace': return '🔥';
      case 'pet': return '🐾';
      case 'secret': return '🔭';
      default: return '⭐';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm pointer-events-auto">
      <div className="bg-stone-900/95 text-stone-100 border border-stone-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-amber-200">{t.progression.title}</h3>
              <p className="text-xs text-stone-400">{t.progression.subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Hours & Next Unlock Banner */}
        <div className="py-3.5 px-4 bg-stone-950/60 border border-stone-800 rounded-xl my-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-amber-300">
              {t.progression.totalDevoted(totalHours)}
            </span>
            {nextTier ? (
              <span className="text-xs text-stone-400 font-medium">
                {t.progression.hoursUntilNext(hoursToNext)}
              </span>
            ) : (
              <span className="text-xs text-emerald-400 font-semibold">
                {t.progression.allUnlocked}
              </span>
            )}
          </div>

          {nextTier && (
            <div className="mt-2.5">
              <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-stone-400 mt-1.5">
                <span>{t.progression.next} {nextTier.title}</span>
                <span className="font-mono font-semibold">{progressToNext}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Progression List */}
        <div className="flex-1 overflow-y-auto py-2.5 space-y-3 pr-1">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                tier.unlocked
                  ? 'bg-amber-950/20 border-amber-900/40 text-stone-100'
                  : 'bg-stone-950/30 border-stone-800/60 opacity-60'
              }`}
            >
              <div className="text-3xl p-2.5 rounded-xl bg-stone-900/80 border border-stone-800 flex-shrink-0">
                {getTierIcon(tier.rewardType)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-amber-200 flex items-center gap-1.5">
                    {tier.title}
                    {tier.unlocked && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                    )}
                  </span>
                  <span className="text-xs font-mono font-semibold text-stone-400">
                    {t.progression.hoursRequirement(tier.hoursRequired)}
                  </span>
                </div>
                <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                  {tier.description}
                </p>
                {!tier.unlocked && (
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-2 font-medium">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{t.progression.lockNotice(Math.max(0, Number((tier.hoursRequired - totalHours).toFixed(1))))}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3.5 border-t border-stone-800 flex justify-end">
          <button
            onClick={() => setActiveModal('none')}
            className="px-5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            {t.stats.close}
          </button>
        </div>
      </div>
    </div>
  );
};

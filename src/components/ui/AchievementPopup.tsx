import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles, X, Award } from 'lucide-react';
import { useGamificationStore } from '../../store/useGamificationStore';
import { useAppStore } from '../../store/useAppStore';

export const AchievementPopup: React.FC = () => {
  const { recentUnlockedBadge, dismissRecentUnlockedBadge } = useGamificationStore();
  const { language } = useAppStore();
  const [progress, setProgress] = useState(100);

  const isTr = language === 'tr';

  useEffect(() => {
    if (!recentUnlockedBadge) {
      setProgress(100);
      return;
    }

    setProgress(100);
    const duration = 5000;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          dismissRecentUnlockedBadge();
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [recentUnlockedBadge?.id, dismissRecentUnlockedBadge]);

  if (!recentUnlockedBadge) return null;

  return (
    <aside
      aria-label={isTr ? 'Başarım Bildirimi' : 'Achievement Notification'}
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto max-w-sm sm:max-w-md w-[92%] animate-in fade-in slide-in-from-top-6 duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900/95 via-stone-950/95 to-amber-950/90 border-2 border-amber-400/60 shadow-[0_0_40px_rgba(245,158,11,0.35)] backdrop-blur-xl p-4 text-stone-100 ring-1 ring-white/20">
        {/* Golden celebratory shimmer overlay */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-yellow-500/15 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-start gap-3.5 relative z-10">
          {/* Glowing Emoji / Trophy Container */}
          <div className="relative flex-shrink-0">
            <div className="w-13 h-13 rounded-xl bg-gradient-to-br from-amber-400/30 to-amber-600/20 border border-amber-400/50 flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(251,191,36,0.5)] transform hover:rotate-6 transition-transform">
              <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {recentUnlockedBadge.emoji}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-stone-950 p-0.5 rounded-full ring-2 ring-stone-900 shadow-sm">
              <Trophy className="w-3 h-3 fill-stone-950" />
            </div>
          </div>

          {/* Text Information */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 font-mono drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">
                {isTr ? 'BAŞARIM KAZANILDI!' : 'ACHIEVEMENT UNLOCKED!'}
              </span>
            </div>

            <h4 className="text-sm font-bold text-white truncate drop-shadow-sm flex items-center gap-1.5">
              <span>{isTr ? recentUnlockedBadge.nameTr : recentUnlockedBadge.nameEn}</span>
            </h4>

            <p className="text-xs text-stone-300/90 mt-0.5 leading-snug line-clamp-2">
              {isTr ? recentUnlockedBadge.descTr : recentUnlockedBadge.descEn}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/40 text-[11px] font-bold text-amber-300 font-mono shadow-sm">
                <Award className="w-3 h-3 text-amber-400" />
                <span>+25 XP</span>
              </span>
              <span className="text-[10px] text-stone-400 font-medium">
                {isTr ? 'Profiline eklendi' : 'Added to profile'}
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={dismissRecentUnlockedBadge}
            className="absolute top-0 right-0 p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label={isTr ? 'Kapat' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dismiss countdown progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-800/80 overflow-hidden rounded-b-2xl">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </aside>
  );
};

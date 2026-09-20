import React, { useEffect } from 'react';
import { X, Zap, Star, CheckCircle2, Circle, Trophy, Target } from 'lucide-react';
import { useGamificationStore } from '../../store/useGamificationStore';
import { useAppStore } from '../../store/useAppStore';

export const GamificationModal: React.FC = () => {
  const { activeModal, setActiveModal, language, showToast } = useAppStore();
  const {
    xp,
    badges,
    dailyChallenges,
    mugClickCount,
    totalSessionCount,
    visitedRooms,
    getLevel,
    getXpToNextLevel,
    getLevelProgress,
    refreshDailyChallengesIfNeeded,
  } = useGamificationStore();

  const isOpen = activeModal === 'gamification';

  // Refresh challenges when modal opens
  useEffect(() => {
    if (isOpen) {
      refreshDailyChallengesIfNeeded();
    }
  }, [isOpen, refreshDailyChallengesIfNeeded]);

  if (!isOpen) return null;

  const level = getLevel();
  const xpToNext = getXpToNextLevel();
  const levelPct = getLevelProgress();

  const unlockedBadges = badges.filter((b) => b.unlocked).length;
  const completedChallenges = dailyChallenges.filter((c) => c.completed).length;

  const tr = language === 'tr';

  const close = () => setActiveModal('none');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm pointer-events-auto">
      <div className="bg-stone-900/95 text-stone-100 border border-stone-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-amber-200">
                {tr ? 'Başarımlar & Görevler' : 'Achievements & Challenges'}
              </h3>
              <p className="text-xs text-stone-400">
                {tr
                  ? `${unlockedBadges}/${badges.length} rozet · Seviye ${level}`
                  : `${unlockedBadges}/${badges.length} badges · Level ${level}`}
              </p>
            </div>
          </div>
          <button
            onClick={close}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable Body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 pr-5">

          {/* XP Level Bar */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-500/20 border border-amber-600/40">
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-stone-400 leading-none">
                    {tr ? 'Seviye' : 'Level'}
                  </p>
                  <p className="text-lg font-black text-amber-300 leading-tight">{level}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-amber-200">{xp.toLocaleString()} XP</p>
                <p className="text-xs text-stone-500">
                  {tr ? `Sonraki seviye: ${xpToNext} XP` : `Next level: ${xpToNext} XP`}
                </p>
              </div>
            </div>
            <div className="w-full bg-stone-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-700"
                style={{ width: `${levelPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-stone-500 mt-1">
              <span>{tr ? `Seviye ${level}` : `Level ${level}`}</span>
              <span className="font-mono font-semibold text-amber-500">{levelPct}%</span>
              <span>{tr ? `Seviye ${level + 1}` : `Level ${level + 1}`}</span>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-stone-800">
              <div className="text-center">
                <p className="text-base font-bold text-amber-300">{totalSessionCount}</p>
                <p className="text-[10px] text-stone-500">{tr ? 'Toplam Seans' : 'Total Sessions'}</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-amber-300">{visitedRooms.length}/5</p>
                <p className="text-[10px] text-stone-500">{tr ? 'Oda Keşfedildi' : 'Rooms Visited'}</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-amber-300">{mugClickCount}</p>
                <p className="text-[10px] text-stone-500">{tr ? 'Kupa Tıklama' : 'Mug Clicks'}</p>
              </div>
            </div>
          </div>

          {/* Daily Challenges */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Target className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-emerald-300">
                {tr ? 'Günlük Görevler' : 'Daily Challenges'}
              </h4>
              <span className="ml-auto text-xs font-semibold text-stone-500">
                {completedChallenges}/{dailyChallenges.length} {tr ? 'tamamlandı' : 'done'}
              </span>
            </div>
            <div className="space-y-2">
              {dailyChallenges.map((ch) => (
                <div
                  key={ch.id}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all ${
                    ch.completed
                      ? 'bg-emerald-950/30 border-emerald-800/50'
                      : 'bg-stone-950/40 border-stone-800'
                  }`}
                >
                  {ch.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-stone-600 flex-shrink-0" />
                  )}
                  <span className={`text-sm flex-1 ${ch.completed ? 'text-stone-400 line-through' : 'text-stone-200'}`}>
                    {tr ? ch.textTr : ch.textEn}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    ch.completed
                      ? 'bg-emerald-900/50 text-emerald-400'
                      : 'bg-amber-900/30 text-amber-400'
                  }`}>
                    +{ch.xpReward} XP
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Badges Grid */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Star className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-amber-300">
                {tr ? 'Rozetler' : 'Badges'}
              </h4>
              <span className="ml-auto text-xs font-semibold text-stone-500">
                {unlockedBadges}/{badges.length} {tr ? 'kazanıldı' : 'earned'}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {badges.map((badge) => (
                <button
                  key={badge.id}
                  title={badge.unlocked
                    ? (tr ? badge.nameTr : badge.nameEn)
                    : (tr ? '🔒 ' + badge.descTr : '🔒 ' + badge.descEn)}
                  onClick={() => {
                    if (badge.unlocked) {
                      showToast(
                        tr
                          ? `${badge.emoji} ${badge.nameTr} — ${badge.descTr}`
                          : `${badge.emoji} ${badge.nameEn} — ${badge.descEn}`,
                        3000
                      );
                    }
                  }}
                  className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all cursor-pointer group ${
                    badge.unlocked
                      ? 'bg-amber-950/25 border-amber-800/50 hover:bg-amber-900/30 hover:border-amber-600'
                      : 'bg-stone-950/40 border-stone-800/50 opacity-40 hover:opacity-60'
                  }`}
                >
                  <span className={`text-2xl leading-none ${badge.unlocked ? '' : 'grayscale'}`}>
                    {badge.emoji}
                  </span>
                  <span className={`text-[10px] font-semibold text-center leading-tight ${
                    badge.unlocked ? 'text-amber-200' : 'text-stone-500'
                  }`}>
                    {tr ? badge.nameTr : badge.nameEn}
                  </span>
                  {badge.unlocked && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Badge descriptions for unlocked ones */}
          {unlockedBadges > 0 && (
            <div>
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                {tr ? 'Kazanılan Rozetler' : 'Earned Badges'}
              </h4>
              <div className="space-y-1.5">
                {badges
                  .filter((b) => b.unlocked)
                  .map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-2.5 px-3 py-2 bg-amber-950/15 border border-amber-900/30 rounded-lg"
                    >
                      <span className="text-lg">{badge.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-200">
                          {tr ? badge.nameTr : badge.nameEn}
                        </p>
                        <p className="text-[11px] text-stone-400 leading-tight">
                          {tr ? badge.descTr : badge.descEn}
                        </p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="px-6 py-3.5 border-t border-stone-800 flex justify-end flex-shrink-0">
          <button
            onClick={close}
            className="px-5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            {tr ? 'Kapat' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

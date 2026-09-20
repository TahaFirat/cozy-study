import React from 'react';
import { X, Flame, Clock, Calendar, CheckCircle2, TrendingUp, Award, Target } from 'lucide-react';
import { useStatsStore } from '../../store/useStatsStore';
import { useAppStore } from '../../store/useAppStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { TRANSLATIONS } from '../../i18n/translations';

export const StatsModal: React.FC = () => {
  const { activeModal, setActiveModal, language, dailyGoalMinutes, showToast } = useAppStore();
  const { isPro } = useSubscriptionStore();
  const {
    sessions,
    streakDays,
    getTotalFocusMinutes,
    getTotalFocusHours,
    getTodayMinutes,
    getThisWeekMinutes,
    getHeatmapDays,
    getYearlyHeatmapDays,
    getUnlockedProgression,
  } = useStatsStore();

  const [heatmapView, setHeatmapView] = React.useState<'21days' | 'yearly'>('21days');

  if (activeModal !== 'stats') return null;

  const t = TRANSLATIONS[language];
  const totalMinutes = getTotalFocusMinutes();
  const todayMinutes = getTodayMinutes();
  const weekMinutes = getThisWeekMinutes();
  const completedSessionsCount = sessions.length;
  const avgSessionLength = completedSessionsCount > 0 
    ? Math.round(totalMinutes / completedSessionsCount) 
    : 0;
  
  const longestSession = sessions.reduce((max, s) => Math.max(max, s.durationMinutes), 0);
  const heatmapDays = getHeatmapDays();
  const yearlyDays = getYearlyHeatmapDays(language === 'tr' ? 'tr-TR' : 'en-US');
  const unlockedProgression = getUnlockedProgression();
  const unlockedCount = unlockedProgression.filter((p) => p.unlocked).length;

  // Group 364 days into 52 weeks (7 days each)
  const yearlyWeeks: typeof yearlyDays[] = [];
  for (let i = 0; i < yearlyDays.length; i += 7) {
    yearlyWeeks.push(yearlyDays.slice(i, i + 7));
  }

  const formatHoursMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} ${language === 'tr' ? 'dk' : 'm'}`;
    return `${h} ${language === 'tr' ? 'sa' : 'h'} ${m} ${language === 'tr' ? 'dk' : 'm'}`;
  };

  // Streak Plant Visual Evolution (Localized)
  const getStreakPlant = (streak: number) => {
    const s = t.stats.plantStages;
    if (streak <= 1) {
      return { stage: s.stage1, icon: '🌱', desc: s.desc1 };
    } else if (streak <= 4) {
      return { stage: s.stage2, icon: '🌿', desc: s.desc2 };
    } else if (streak <= 9) {
      return { stage: s.stage3, icon: '🪴', desc: s.desc3 };
    } else if (streak <= 19) {
      return { stage: s.stage4, icon: '🌸', desc: s.desc4 };
    } else {
      return { stage: s.stage5, icon: '🌺', desc: s.desc5 };
    }
  };

  const plantInfo = getStreakPlant(streakDays);
  const dailyGoalPercent = Math.min(100, Math.round((todayMinutes / (dailyGoalMinutes || 120)) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm pointer-events-auto">
      <div className="bg-stone-900/95 text-stone-100 border border-stone-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📊</span>
            <div>
              <h3 className="text-base font-bold text-amber-200">{t.stats.title}</h3>
              <p className="text-xs text-stone-400">
                {t.stats.todayActive(formatHoursMinutes(todayMinutes))}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Daily Goal Target Bar (Optimization #8) */}
          <div className="p-3.5 bg-stone-950/60 border border-stone-800/90 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-200 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-400" />
                {language === 'tr' ? 'Günlük Odak Hedefi' : 'Daily Focus Goal'}
              </span>
              <span className="font-mono text-stone-300">
                {todayMinutes} / {dailyGoalMinutes} dk ({dailyGoalPercent}%)
              </span>
            </div>
            <div className="w-full bg-stone-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-500"
                style={{ width: `${dailyGoalPercent}%` }}
              />
            </div>
          </div>

          {/* Visual Streak Plant Showcase */}
          <div className="p-4 bg-stone-950/60 border border-stone-800/90 rounded-xl flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center text-3xl shadow-inner flex-shrink-0">
              {plantInfo.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400 fill-current" />
                  {streakDays} {t.streak}
                </span>
                <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
                  {plantInfo.stage}
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                {plantInfo.desc}
              </p>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-stone-950/40 border border-stone-800/80 rounded-xl">
              <div className="text-xs font-medium text-stone-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {t.stats.allTime}
              </div>
              <div className="text-xl font-bold font-mono text-amber-100 mt-1">
                {getTotalFocusHours()}h
              </div>
              <div className="text-[11px] text-stone-500">{t.stats.totalFocused}</div>
            </div>

            <div className="p-2.5 bg-stone-950/40 border border-stone-800/80 rounded-xl">
              <div className="text-xs font-medium text-stone-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                {t.stats.thisWeek}
              </div>
              <div className="text-xl font-bold font-mono text-sky-200 mt-1">
                {formatHoursMinutes(weekMinutes)}
              </div>
              <div className="text-[11px] text-stone-500">{t.stats.last7Days}</div>
            </div>

            <div className="p-2.5 bg-stone-950/40 border border-stone-800/80 rounded-xl">
              <div className="text-xs font-medium text-stone-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {t.stats.sessions}
              </div>
              <div className="text-xl font-bold font-mono text-emerald-200 mt-1">
                {completedSessionsCount}
              </div>
              <div className="text-[11px] text-stone-500">{t.stats.completed}</div>
            </div>

            <div className="p-2.5 bg-stone-950/40 border border-stone-800/80 rounded-xl">
              <div className="text-xs font-medium text-stone-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-purple-400" />
                {t.stats.unlocksCount}
              </div>
              <div className="text-xl font-bold font-mono text-purple-200 mt-1">
                {unlockedCount}/7
              </div>
              <div className="text-[11px] text-stone-500">{t.stats.treasures}</div>
            </div>
          </div>

          {/* Heatmap Section (21-Day & 52-Week GitHub Style) */}
          <div className="p-4 bg-stone-950/40 border border-stone-800/80 rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  {t.stats.heatmapTitle}
                </span>
                {/* View Mode Toggle */}
                <div className="flex bg-stone-900 border border-stone-800 rounded-lg p-0.5 text-[11px]">
                  <button
                    onClick={() => setHeatmapView('21days')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      heatmapView === '21days'
                        ? 'bg-amber-500/20 text-amber-300 font-bold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {language === 'tr' ? '21 Gün' : '21 Days'}
                  </button>
                  <button
                    onClick={() => setHeatmapView('yearly')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors flex items-center gap-1 ${
                      heatmapView === 'yearly'
                        ? 'bg-amber-500/20 text-amber-300 font-bold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <span>{language === 'tr' ? '52 Hafta (Yıllık)' : '52 Weeks (Yearly)'}</span>
                    <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1 py-0.2 rounded font-mono font-bold">365d</span>
                  </button>
                </div>
              </div>

              <span className="text-xs text-stone-400">
                {t.stats.avgSession(avgSessionLength)}
              </span>
            </div>

            {heatmapView === '21days' ? (
              <div className="grid grid-cols-7 gap-2 pt-1">
                {heatmapDays.map((day) => {
                  let bgClass = 'bg-stone-800/60 border-stone-700/40 text-stone-400';
                  if (day.intensity === 1) bgClass = 'bg-amber-950/70 border-amber-800/50 text-amber-300 font-medium';
                  if (day.intensity === 2) bgClass = 'bg-amber-800/80 border-amber-600/70 text-amber-100 font-semibold';
                  if (day.intensity === 3) bgClass = 'bg-amber-600 border-amber-400 text-stone-950 font-bold';
                  if (day.intensity === 4) bgClass = 'bg-amber-400 border-amber-200 text-stone-950 font-bold';

                  const shortDate = day.date.slice(5); // MM-DD

                  return (
                    <div
                      key={day.date}
                      className={`h-11 rounded-lg border flex flex-col items-center justify-center text-xs font-mono transition-transform hover:scale-105 ${bgClass}`}
                      title={`${day.date}: ${day.minutes} min focused`}
                    >
                      <span className="text-[10px]">{shortDate}</span>
                      <span className="text-xs font-bold leading-none mt-0.5">{day.minutes}m</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* GitHub-Style 52-Week Contribution Matrix */
              <div className="overflow-x-auto pb-1 pt-1">
                <div className="min-w-[620px]">
                  {/* Month header row */}
                  <div className="flex text-[10px] text-stone-400 font-mono mb-1.5 pl-6">
                    {yearlyWeeks.map((week, wIdx) => {
                      const firstDay = week[0];
                      const isFirstWeekOfMonth = firstDay && (wIdx === 0 || (week.some(d => d.date.endsWith('-01'))));
                      return (
                        <div key={wIdx} className="w-2.5 mr-[3px] text-left overflow-visible">
                          {isFirstWeekOfMonth ? (
                            <span className="font-semibold text-amber-300/80 whitespace-nowrap">
                              {firstDay.month}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {/* Heatmap Grid with Weekday Labels */}
                  <div className="flex gap-1.5 items-start">
                    {/* Weekday indicators (Mon, Wed, Fri) */}
                    <div className="flex flex-col justify-between h-[82px] text-[9px] text-stone-500 font-mono pr-1 select-none">
                      <span>{language === 'tr' ? 'Pzt' : 'Mon'}</span>
                      <span>{language === 'tr' ? 'Çar' : 'Wed'}</span>
                      <span>{language === 'tr' ? 'Cum' : 'Fri'}</span>
                    </div>

                    {/* 52 Columns */}
                    <div className="flex gap-[3px]">
                      {yearlyWeeks.map((week, wIdx) => (
                        <div key={wIdx} className="flex flex-col gap-[3px]">
                          {week.map((day) => {
                            let bgClass = 'bg-stone-800/50 border-stone-800 hover:border-stone-500';
                            if (day.intensity === 1) bgClass = 'bg-amber-950/80 border-amber-900/60 hover:border-amber-500';
                            if (day.intensity === 2) bgClass = 'bg-amber-700/80 border-amber-600/70 hover:border-amber-400';
                            if (day.intensity === 3) bgClass = 'bg-amber-500 border-amber-400 hover:border-amber-200';
                            if (day.intensity === 4) bgClass = 'bg-amber-400 border-amber-200 shadow-[0_0_6px_rgba(251,191,36,0.4)] hover:scale-125';

                            return (
                              <div
                                key={day.date}
                                className={`w-2.5 h-2.5 rounded-[2px] border transition-transform cursor-pointer ${bgClass}`}
                                title={`${day.date} (${day.month}): ${day.minutes} ${language === 'tr' ? 'dk odaklanıldı' : 'min focused'}`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-stone-400 mt-3 pt-1 border-t border-stone-800/60">
              <span className="text-[11px] text-stone-400">
                {heatmapView === 'yearly' 
                  ? (language === 'tr' ? 'Son 364 günlük odak grafiği' : 'Past 364 days focus matrix') 
                  : (language === 'tr' ? 'Son 3 haftalık odak özeti' : 'Past 3 weeks focus summary')}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-stone-400">
                <span>{t.stats.less}</span>
                <span className="w-2.5 h-2.5 rounded-[2px] bg-stone-800/60 border border-stone-700/40" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-950/80 border border-amber-900/60" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-700/80 border border-amber-600/70" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-500 border border-amber-300" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-400 border border-amber-200" />
                <span>{t.stats.more}</span>
              </div>
            </div>
          </div>

          {/* Personal Record & Pro Exports */}
          <div className="text-xs text-stone-300 px-1 flex items-center justify-between">
            <span>{t.stats.longestSession}</span>
            <span className="text-amber-300 font-bold text-sm font-mono">{longestSession} {t.stats.minutes}</span>
          </div>
        </div>

        {/* Footer with CSV Export & Close */}
        <div className="pt-3.5 border-t border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!isPro) {
                  showToast(language === 'tr' ? '👑 CSV dışa aktarımı PRO üyelere özeldir' : '👑 CSV export is a PRO feature', 2500);
                  setActiveModal('subscription');
                  return;
                }
                const csvHeader = 'Tarih,Sure_Dakika,Etiket,Not\n';
                const rows = sessions.map(s => `"${new Date(s.timestamp).toISOString()}","${s.durationMinutes}","${s.tag || ''}","${(s.note || '').replace(/"/g, '""')}"`).join('\n');
                const blob = new Blob([csvHeader + rows], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cozy_focus_history_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-700"
              title="CSV Olarak İndir"
            >
              <span>📄 CSV İndir</span>
              {!isPro && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded font-bold">PRO</span>}
            </button>

            <button
              onClick={() => {
                if (!isPro) {
                  showToast(language === 'tr' ? '👑 PDF raporu PRO üyelere özeldir' : '👑 PDF report is a PRO feature', 2500);
                  setActiveModal('subscription');
                  return;
                }
                window.print();
              }}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-700"
              title="Yazdır veya PDF Kaydet"
            >
              <span>🖨️ PDF / Rapor</span>
              {!isPro && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded font-bold">PRO</span>}
            </button>
          </div>

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

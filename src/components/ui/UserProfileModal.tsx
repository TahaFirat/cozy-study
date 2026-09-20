import React, { useState } from 'react';
import { 
  X, 
  Trophy, 
  Flame, 
  Swords, 
  BarChart2, 
  Share2, 
  Check, 
  Lock, 
  Clock, 
  Calendar,
  ExternalLink
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { useStatsStore } from '../../store/useStatsStore';
import { useGamificationStore } from '../../store/useGamificationStore';
import { useBossRaidStore } from '../../store/useBossRaidStore';
import { TRANSLATIONS } from '../../i18n/translations';

export const UserProfileModal: React.FC = () => {
  const { activeModal, setActiveModal, language, showToast } = useAppStore();
  const { user } = useAuthStore();
  const { streakDays, getTotalFocusHours, sessions, getHeatmapDays } = useStatsStore();
  const { xp, getLevel } = useGamificationStore();
  const { bosses, unlockedTrophies } = useBossRaidStore();

  const [copied, setCopied] = useState(false);

  if (activeModal !== 'profile') return null;

  const isTr = language === 'tr';
  const t = TRANSLATIONS[language];

  const totalHours = getTotalFocusHours();
  const level = getLevel();
  const completedCount = sessions.length;

  // Determine honorific title based on defeated bosses
  let playerTitle = isTr ? 'Çırak Odakçı' : 'Apprentice Studier';
  if (bosses.oblivion?.isDefeated) {
    playerTitle = isTr ? '👑 Ebedi Kronos Fatihi' : '👑 Eternal Chronos Conqueror';
  } else if (bosses.cacophony?.isDefeated) {
    playerTitle = isTr ? '💎 Sessizliğin Efendisi' : '💎 Master of Silence';
  } else if (bosses.acedia?.isDefeated) {
    playerTitle = isTr ? '🪔 Atalet Kıran' : '🪔 Sloth Slayer';
  } else if (bosses.horologium?.isDefeated) {
    playerTitle = isTr ? '🕰️ Zaman Muhafızı' : '🕰️ Time Guardian';
  }

  const displayName = user?.displayName || user?.email?.split('@')[0] || (isTr ? 'Misafir Çalışmacı' : 'Guest Studier');
  const userInitials = displayName.slice(0, 2).toUpperCase();

  const trophyList = [
    {
      id: 'trophy_hourglass',
      bossId: 'horologium',
      emoji: '🕰️',
      name: isTr ? 'Altın Kum Saati' : "Horologium's Golden Hourglass",
      bossName: 'Horologium',
      desc: isTr 
        ? 'Zamanın Mekanik Muhafızı Horologium mağlup edildiğinde kazanılan kadim zafer kupası.'
        : 'Ancient victory artifact forged upon overcoming the Clockwork Titan.',
      theme: 'from-amber-500/30 to-amber-900/30 border-amber-500/50 text-amber-300',
    },
    {
      id: 'trophy_censer',
      bossId: 'acedia',
      emoji: '🪔',
      name: isTr ? 'Sonsuz Zen Tütsülüğü' : "Acedia's Zen Incense Censer",
      bossName: 'Acedia',
      desc: isTr 
        ? 'Erteleme Hayaleti Acedia zincirlerinden arındırıldığında kazanılan huzur eseri.'
        : 'Serenity relic earned by purging the spectral whispers of procrastination.',
      theme: 'from-purple-500/30 to-purple-900/30 border-purple-500/50 text-purple-300',
    },
    {
      id: 'trophy_prism_crystal',
      bossId: 'cacophony',
      emoji: '💎',
      name: isTr ? 'Prizma Odak Kristali' : 'Prism Focus Crystal & Halo',
      bossName: 'Cacophony',
      desc: isTr 
        ? 'Dikkat Dağınıklığı Sireni Cacophony susturulduğunda açılan parlak prizma kristali.'
        : 'Radiant crystal node earned by silencing notification noise and social distraction.',
      theme: 'from-cyan-500/30 to-cyan-900/30 border-cyan-500/50 text-cyan-300',
    },
    {
      id: 'trophy_eternal_crown',
      bossId: 'oblivion',
      emoji: '👑',
      name: isTr ? 'Ebedi Kronos Tacı & Asası' : 'Eternal Chrono-Crown & Scepter',
      bossName: 'Oblivion',
      desc: isTr 
        ? 'Tükenmişliğin Kadim Devi Oblivion fethedildiğinde tahta geçen odak ustalarına verilir.'
        : 'The ultimate royal badge of study mastery, earned by triumphing over burnout.',
      theme: 'from-red-500/30 to-amber-900/30 border-red-500/50 text-red-300',
    },
  ];

  const handleCopyProfileLink = () => {
    const fakeUsername = displayName.toLowerCase().replace(/\s+/g, '_');
    const profileUrl = `${window.location.origin}/p/${fakeUsername}`;
    
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(profileUrl).then(() => {
        setCopied(true);
        showToast(
          isTr ? 'Profil bağlantısı panoya kopyalandı! 📋 Diğer öğrencilerle paylaşabilirsin.' : 'Profile link copied to clipboard! 📋 Ready to share.',
          3500
        );
        setTimeout(() => setCopied(false), 2500);
      });
    } else {
      showToast(isTr ? 'Profil linki: ' + profileUrl : 'Profile URL: ' + profileUrl, 4000);
    }
  };

  const heatmapDays = getHeatmapDays().slice(-14);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm pointer-events-auto">
      <div className="bg-stone-900/98 text-stone-100 border border-amber-600/50 rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={displayName}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-500/60 shadow-lg"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-500/60 flex items-center justify-center text-lg font-black text-amber-200 shadow-inner">
                {userInitials}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-amber-100">{displayName}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {isTr ? 'Sv.' : 'Lv.'}{level}
                </span>
              </div>
              <p className="text-xs font-semibold text-amber-400/90 mt-0.5 flex items-center gap-1.5">
                <span>{playerTitle}</span>
                <span className="text-stone-500">•</span>
                <span className="text-stone-400 font-mono">{xp} XP</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyProfileLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-amber-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              title={isTr ? 'Genel profil bağlantısını kopyala' : 'Copy public profile link'}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? (isTr ? 'Kopyalandı!' : 'Copied!') : (isTr ? 'Profili Paylaş' : 'Share Profile')}</span>
            </button>
            <button
              onClick={() => setActiveModal('none')}
              className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          
          {/* Quick Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-stone-950/60 border border-stone-800 rounded-xl flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-400">
                <Flame className="w-4 h-4 fill-current" />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-medium">
                  {t.streak}
                </span>
                <span className="text-base font-bold text-amber-200 font-mono">
                  {streakDays} {isTr ? 'Gün' : 'Days'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-stone-950/60 border border-stone-800 rounded-xl flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-medium">
                  {t.stats.totalFocused}
                </span>
                <span className="text-base font-bold text-amber-200 font-mono">
                  {totalHours} {isTr ? 'Saat' : 'Hrs'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-stone-950/60 border border-stone-800 rounded-xl flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-medium">
                  {t.stats.sessions}
                </span>
                <span className="text-base font-bold text-amber-200 font-mono">
                  {completedCount}
                </span>
              </div>
            </div>

            <div className="p-3 bg-stone-950/60 border border-stone-800 rounded-xl flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-medium">
                  {isTr ? 'Zafer Kupaları' : 'Trophies'}
                </span>
                <span className="text-base font-bold text-amber-200 font-mono">
                  {unlockedTrophies.length} / {trophyList.length}
                </span>
              </div>
            </div>
          </div>

          {/* BOSS RAID TROPHIES SHOWCASE */}
          <div className="p-4 bg-stone-950/70 border border-amber-500/30 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-bold text-amber-200">
                  {isTr ? 'Kronos Boss Zafer Eserleri & Kupaları' : 'Chronos Boss Raid Trophies'}
                </h4>
              </div>
              <button
                onClick={() => setActiveModal('boss_raid')}
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer group"
              >
                <Swords className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
                <span>{isTr ? 'Boss Arenasına Git' : 'Enter Boss Arena'}</span>
              </button>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              {isTr 
                ? 'Ders çalıştıkça ve Pomodoro seanslarını tamamladıkça Kronos canavarlarına hasar verirsin. Yendiğin bossların ebedi kupaları burada sergilenir ve profilinde herkese görünür.'
                : 'Focus sessions inflict damage on Chronos raid bosses. Defeating them permanently unlocks these radiant trophies showcased on your public profile.'}
            </p>

            {/* 4 Trophies Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {trophyList.map((trItem) => {
                const boss = bosses[trItem.bossId as keyof typeof bosses];
                const isEarned = unlockedTrophies.includes(trItem.id) || boss?.isDefeated;

                return (
                  <div
                    key={trItem.id}
                    className={`p-3.5 rounded-xl border flex items-start gap-3.5 transition-all ${
                      isEarned
                        ? `bg-gradient-to-br ${trItem.theme} shadow-lg shadow-black/40`
                        : 'bg-stone-900/50 border-stone-800/80 opacity-60'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border ${
                      isEarned 
                        ? 'bg-stone-900/90 border-amber-400/50 shadow-inner scale-105' 
                        : 'bg-stone-950 border-stone-800 text-stone-600'
                    }`}>
                      {isEarned ? trItem.emoji : <Lock className="w-5 h-5 text-stone-600" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className={`text-xs font-bold truncate ${isEarned ? 'text-amber-100' : 'text-stone-400'}`}>
                          {trItem.name}
                        </h5>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          isEarned 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                            : 'bg-stone-800 text-stone-500'
                        }`}>
                          {isEarned ? (isTr ? 'Kazanıldı ✓' : 'Earned ✓') : (isTr ? 'Kilitli' : 'Locked')}
                        </span>
                      </div>

                      <p className="text-[11px] text-stone-300/90 mt-1 leading-relaxed line-clamp-2">
                        {trItem.desc}
                      </p>

                      {!isEarned && boss && (
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-[10px] text-stone-400">
                            <span>Boss HP: {boss.name}</span>
                            <span>{Math.round((boss.currentHp / boss.maxHp) * 100)}%</span>
                          </div>
                          <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-red-500 h-full rounded-full"
                              style={{ width: `${Math.round((boss.currentHp / boss.maxHp) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Heatmap & Detailed Stats Shortcut */}
          <div className="p-4 bg-stone-950/60 border border-stone-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-amber-200">
                  {isTr ? 'Son 14 Günlük Odaklanma Isı Haritası' : 'Recent 14-Day Focus Heatmap'}
                </h4>
              </div>
              <button
                onClick={() => setActiveModal('stats')}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer flex items-center gap-1"
              >
                <span>{isTr ? 'Tam Isı Haritasını Aç (52 Hafta)' : 'Open Full 52-Week Heatmap'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mini Heatmap Strip */}
            <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 pt-1">
              {heatmapDays.map((day) => {
                let bgClass = 'bg-stone-800/60 border-stone-700/40 text-stone-400';
                if (day.intensity === 1) bgClass = 'bg-amber-950/70 border-amber-800/50 text-amber-300';
                if (day.intensity === 2) bgClass = 'bg-amber-800/80 border-amber-600/70 text-amber-100 font-semibold';
                if (day.intensity === 3) bgClass = 'bg-amber-600 border-amber-400 text-stone-950 font-bold';
                if (day.intensity === 4) bgClass = 'bg-amber-400 border-amber-200 text-stone-950 font-bold';

                const shortDate = day.date.slice(5);

                return (
                  <div
                    key={day.date}
                    className={`h-10 rounded-lg border flex flex-col items-center justify-center text-[10px] font-mono ${bgClass}`}
                    title={`${day.date}: ${day.minutes} min`}
                  >
                    <span className="text-[9px] opacity-80">{shortDate}</span>
                    <span className="text-[11px] font-bold mt-0.5">{day.minutes}m</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Social Share Story Action */}
          <div className="p-3.5 bg-gradient-to-r from-amber-950/30 to-stone-900/60 border border-stone-800 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-amber-200">
                  {isTr ? '9:16 Hikaye Kartı Oluştur' : 'Generate 9:16 Story Card'}
                </h5>
                <p className="text-[11px] text-stone-400">
                  {isTr ? 'Kupalarını, serini ve çalışma saatlerini estetik bir kartta paylaş.' : 'Share your streak, trophies, and hours as an aesthetic story card.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveModal('session_share')}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0 shadow-md"
            >
              {isTr ? 'Kartı Aç 🎨' : 'Create Card 🎨'}
            </button>
          </div>

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

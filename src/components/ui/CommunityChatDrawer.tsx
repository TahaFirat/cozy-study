import React from 'react';
import { 
  X, 
  Users, 
  Coffee, 
  Flame, 
  Clock, 
  Award,
  Sparkles,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { useCommunityStore } from '../../store/useCommunityStore';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTimerStore } from '../../store/useTimerStore';
import { useStatsStore } from '../../store/useStatsStore';
import { TRANSLATIONS } from '../../i18n/translations';

export const CommunityChatDrawer: React.FC = () => {
  const { 
    isChatOpen, 
    setChatOpen, 
    onlineCount, 
    studyBuddies, 
    sendReaction 
  } = useCommunityStore();

  const { language, activeRoom, showToast } = useAppStore();
  const { user } = useAuthStore();
  const { timerState, currentGoal } = useTimerStore();
  const { streakDays, getTodayMinutes } = useStatsStore();

  if (!isChatOpen) return null;

  const isTr = language === 'tr';
  const t = TRANSLATIONS[language];
  const roomName = t?.rooms?.[activeRoom]?.name || (isTr ? 'Sıcak Yatak Odası' : 'Cozy Bedroom');
  const todayMinutes = typeof getTodayMinutes === 'function' ? getTodayMinutes() : 0;

  const [lastReactionTime, setLastReactionTime] = React.useState<number>(0);

  const handleSendReaction = (type: 'coffee' | 'cheer' | 'fire') => {
    const now = Date.now();
    if (now - lastReactionTime < 15000) {
      const waitSec = Math.ceil((15000 - (now - lastReactionTime)) / 1000);
      showToast(isTr ? `Lütfen ${waitSec} sn bekleyin... ⏳` : `Please wait ${waitSec}s... ⏳`, 1500);
      return;
    }
    setLastReactionTime(now);
    sendReaction(type);
  };

  return (
    <>
      {/* Full Backdrop (Closes on outside click across mobile, tablet, and desktop) */}
      <div 
        onClick={() => setChatOpen(false)}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs pointer-events-auto animate-fade-in"
      />

      <div 
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-y-0 sm:inset-y-3 right-0 sm:right-3 w-full sm:w-96 max-w-full sm:max-w-md z-50 flex flex-col bg-stone-900/98 text-stone-100 border-l sm:border border-stone-800 rounded-none sm:rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden animate-in slide-in-from-right-10 duration-200 pointer-events-auto"
      >
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 border-b border-stone-800/90 bg-stone-950/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-amber-200">
                  {isTr ? 'Canlı Çalışma Arkadaşları' : 'Live Study Buddies'}
                </h3>
                <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  {onlineCount} {isTr ? 'Yayında' : 'Live'}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {isTr ? 'Dünya genelinde seninle odaklananlar' : 'Studying live together around the world'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setChatOpen(false)}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            title={isTr ? 'Kapat (Esc veya C)' : 'Close (Esc or C)'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Cheer / Room Energy Bar (1-Tap interactions) */}
        <div className="px-3.5 py-2.5 bg-stone-950/40 border-b border-stone-800/70 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-stone-400 shrink-0">
            {isTr ? 'Odaya Enerji Gönder:' : 'Send Cheer:'}
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleSendReaction('coffee')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800/90 hover:bg-amber-950/50 text-amber-200 text-xs font-semibold border border-stone-700/80 transition-all cursor-pointer whitespace-nowrap active:scale-95"
              title={isTr ? 'Odadakilere sıcak kahve ikram et' : 'Share coffee with the room'}
            >
              <Coffee className="w-3.5 h-3.5 text-amber-400" />
              <span>{isTr ? 'Kahve ☕' : 'Coffee'}</span>
            </button>

            <button
              onClick={() => handleSendReaction('cheer')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800/90 hover:bg-amber-950/50 text-amber-200 text-xs font-semibold border border-stone-700/80 transition-all cursor-pointer whitespace-nowrap active:scale-95"
              title={isTr ? 'Herkesi alkışla ve tebrik et' : 'Cheer everyone on'}
            >
              <span>👏</span>
              <span>{isTr ? 'Tebrik' : 'Cheer'}</span>
            </button>

            <button
              onClick={() => handleSendReaction('fire')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800/90 hover:bg-amber-950/50 text-amber-200 text-xs font-semibold border border-stone-700/80 transition-all cursor-pointer whitespace-nowrap active:scale-95"
              title={isTr ? 'Derin odak motivasyon ateşi gönder' : 'Send focus energy'}
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>{isTr ? 'Ateş 🔥' : 'Fire'}</span>
            </button>
          </div>
        </div>

        {/* Study Buddies List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar">
          {/* 1. Self Card (Always at the top) */}
          <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/20 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-base shadow-inner">
                  {user?.photoURL?.startsWith('http') ? (
                    <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span>🧑‍💻</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-amber-100">
                      {user?.displayName || (isTr ? 'Sen (Bu Cihaz)' : 'You (This Device)')}
                    </span>
                    <span className="text-[10px] bg-amber-500/30 text-amber-200 font-extrabold px-1.5 py-0.2 rounded-full border border-amber-500/40">
                      {isTr ? 'SEN' : 'YOU'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-stone-400">
                    <Compass className="w-3 h-3 text-stone-400" />
                    <span>{roomName}</span>
                  </div>
                </div>
              </div>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                timerState === 'running'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                  : 'bg-stone-800 text-stone-300 border-stone-700'
              }`}>
                {timerState === 'running' 
                  ? (isTr ? '⚡ Odaklanıyor' : '⚡ Focusing') 
                  : (isTr ? '☕ Hazırlanıyor' : '☕ Ready')}
              </span>
            </div>

            {/* Self Stats & Goal */}
            <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px] text-stone-300">
              <span className="truncate max-w-[190px] text-stone-300 italic">
                🎯 {currentGoal || (isTr ? 'Derin Odak Seansı' : 'Deep Focus Session')}
              </span>
              <div className="flex items-center gap-2 font-mono shrink-0">
                <span className="text-amber-400">🔥 {streakDays} gün</span>
                <span className="text-stone-400">⏱️ {todayMinutes} dk</span>
              </div>
            </div>
          </div>

          {/* 2. Remote Peers / Study Buddies */}
          {studyBuddies.filter((b) => !b.isSelf).length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-stone-800 text-center flex flex-col items-center justify-center space-y-2 mt-4 bg-stone-950/30">
              <div className="w-12 h-12 rounded-2xl bg-stone-800/80 border border-stone-700/80 flex items-center justify-center text-xl shadow-inner text-amber-400">
                👥
              </div>
              <h4 className="text-xs font-bold text-stone-200">
                {isTr ? 'Tek Başına Derin Odaktasın' : 'Solo Deep Focus'}
              </h4>
              <p className="text-[11px] text-stone-400 max-w-xs leading-relaxed">
                {isTr 
                  ? 'Arkadaşların veya diğer kullanıcılar LockIn uygulamasını açtığında burada anlık olarak canlı görünecekler.' 
                  : 'When your friends or peers open LockIn, they will appear here live in real-time.'}
              </p>
            </div>
          ) : (
            studyBuddies
              .filter((b) => !b.isSelf)
              .map((buddy) => (
                <div 
                  key={buddy.id || buddy.sessionId}
                  className="p-3 rounded-xl border border-stone-800/80 bg-stone-950/40 hover:border-stone-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-sm shrink-0">
                        {buddy.avatar?.startsWith('http') ? (
                          <img src={buddy.avatar} alt={buddy.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span>{buddy.avatar || '🧑‍💻'}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-stone-200 truncate">
                            {buddy.name}
                          </span>
                          <span className="text-[11px] shrink-0">{buddy.flag || '🇹🇷'}</span>
                        </div>
                        <span className="text-[10px] text-stone-400 block truncate">
                          {buddy.roomName || (isTr ? 'Çalışma Odası' : 'Study Room')}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      buddy.status === 'focusing'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : buddy.status === 'break'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-stone-800 text-stone-400 border-stone-700'
                    }`}>
                      {buddy.status === 'focusing'
                        ? (isTr ? '⚡ Odakta' : '⚡ Focusing')
                        : buddy.status === 'break'
                        ? (isTr ? '☕ Mola' : '☕ Break')
                        : (isTr ? '🌱 Başladı' : '🌱 Started')}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-stone-800/60 flex items-center justify-between text-[10px] text-stone-400">
                    <span className="truncate max-w-[180px] text-stone-300">
                      🎯 {buddy.task || (isTr ? 'Derin Çalışma' : 'Deep Study')}
                    </span>
                    <div className="flex items-center gap-2 font-mono shrink-0">
                      <span className="text-amber-400/90">🔥 {buddy.streakDays || 1}g</span>
                      <span className="text-stone-400">⏱️ {buddy.minutesFocused || 0} dk</span>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Drawer Footer Notice */}
        <div className="p-3 border-t border-stone-800 bg-stone-950/60 text-center text-[11px] text-stone-400">
          <span>🌿 {isTr ? 'Sessiz ve sakin çalışma alanı. Birlikte odaklanın!' : 'Quiet co-study sanctuary. Focus together!'}</span>
        </div>
      </div>
    </>
  );
};

export default CommunityChatDrawer;

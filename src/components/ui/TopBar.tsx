import React from 'react';
import { 
  BookOpen, 
  Settings, 
  Maximize2, 
  Minimize2, 
  CloudRain, 
  Sun, 
  CloudSnow, 
  CloudLightning, 
  Compass,
  Flame,
  Award,
  HelpCircle,
  Languages,
  Expand,
  Shrink,
  Users,
  CheckSquare,
  Search,
  Activity,
  Crown,
  Swords,
  Share2,
  BarChart2,
  Trophy
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useStatsStore } from '../../store/useStatsStore';
import { useCommunityStore } from '../../store/useCommunityStore';
import { useGamificationStore } from '../../store/useGamificationStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useBossRaidStore } from '../../store/useBossRaidStore';
import { ROOMS } from '../../audio/soundPresets';
import { TRANSLATIONS, getRoomTranslation } from '../../i18n/translations';
import { UserMenu } from './UserMenu';
import { ProBadge } from './ProBadge';
import { webAudioEngine } from '../../audio/WebAudioEngine';

export const TopBar: React.FC = () => {
  const {
    language,
    setLanguage,
    activeRoom,
    timeOfDay,
    weather,
    immersiveMode,
    toggleImmersiveMode,
    isFullscreen,
    toggleFullscreen,
    setActiveModal,
  } = useAppStore();

  const { streakDays, getTotalFocusHours } = useStatsStore();
  const { onlineCount, unreadCount, toggleChat } = useCommunityStore();
  const { xp } = useGamificationStore();
  const { tasks, toggleTaskDrawer } = useTaskStore();
  const { currentBossId, bosses } = useBossRaidStore();
  const currentBoss = bosses[currentBossId] || bosses.horologium;
  const bossHpPercent = Math.round((currentBoss.currentHp / currentBoss.maxHp) * 100);
  const gamificationLevel = Math.floor(xp / 500) + 1;
  const t = TRANSLATIONS[language];
  const currentRoom = ROOMS.find((r) => r.id === activeRoom) || ROOMS[0];
  const localizedRoomName = getRoomTranslation(language, activeRoom)?.name || currentRoom.name;

  const getWeatherIcon = () => {
    switch (weather) {
      case 'clear': return <Sun className="w-4 h-4 text-amber-300" />;
      case 'snow': return <CloudSnow className="w-4 h-4 text-blue-200" />;
      case 'storm': return <CloudLightning className="w-4 h-4 text-indigo-300" />;
      case 'heavy_rain':
      case 'rain':
      default:
        return <CloudRain className="w-4 h-4 text-sky-300" />;
    }
  };

  const localizedTime = t.times[timeOfDay] || timeOfDay;
  const localizedWeather = t.weather[weather] || weather;

  return (
    <header 
      className="absolute left-4 right-4 z-30 flex items-center justify-between pointer-events-none transition-all duration-300"
      style={{ top: 'max(1rem, env(safe-area-inset-top, 1rem))' }}
    >
      {/* 1. LEFT LUXURY ISLAND: Atmosphere, Room & Live Co-Study */}
      <div className="glass-island rounded-2xl p-1.5 flex items-center gap-1 sm:gap-2 pointer-events-auto shadow-2xl">
        {/* Room Selector */}
        <button
          onClick={() => setActiveModal('rooms')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 text-stone-100 transition-all group cursor-pointer"
          title={t.changeRoom}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 group-hover:scale-125 shadow-[0_0_8px_rgba(251,191,36,0.6)] transition-all" />
          <span className="text-xs sm:text-sm font-bold tracking-wide text-amber-100">{localizedRoomName}</span>
          <Compass className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-300 transition-colors" />
        </button>

        <div className="w-[1px] h-4 bg-white/10 hidden sm:block" />

        {/* Weather & Circadian Time */}
        <button
          onClick={() => setActiveModal('settings')}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/5 text-stone-300 text-xs font-medium transition-colors cursor-pointer"
          title={t.changeWeather}
        >
          {getWeatherIcon()}
          <span>{localizedTime} · {localizedWeather}</span>
        </button>

        <div className="w-[1px] h-4 bg-white/10 hidden md:block" />

        {/* Live Co-Study Buddies */}
        <button
          onClick={toggleChat}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer group"
          title={language === 'tr' ? 'Birlikte Çalışanlar & Canlı Sohbet (C)' : 'Co-Study Community & Chat (C)'}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Users className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span className="font-bold tracking-wide text-[11px] sm:text-xs">
            {onlineCount} {language === 'tr' ? 'Yayında' : 'Live'}
          </span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-400 text-stone-950 font-black text-[10px] rounded-full animate-bounce leading-none">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* 2. CENTER LUXURY ISLAND: Streak, Mastery & Level */}
      <div className="hidden lg:flex items-center gap-2 glass-island glass-island-gold rounded-2xl px-3 py-1.5 pointer-events-auto shadow-2xl">
        <button
          onClick={() => setActiveModal('stats')}
          className="flex items-center gap-1.5 text-xs font-bold text-amber-200 hover:text-amber-100 transition-colors cursor-pointer"
          title={t.stats.title}
        >
          <Flame className="w-4 h-4 text-orange-400 fill-current animate-pulse drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
          <span>{streakDays} {t.streak}</span>
        </button>

        <div className="w-[1px] h-4 bg-amber-500/20" />

        <button
          onClick={() => setActiveModal('gamification')}
          className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
          title={language === 'tr' ? 'Başarımlar & Seviye' : 'Achievements & Level'}
        >
          <span className="text-sm leading-none">⚡</span>
          <span>{language === 'tr' ? 'Sv.' : 'Lv.'}{gamificationLevel}</span>
        </button>

        <div className="w-[1px] h-4 bg-amber-500/20" />

        {/* Boss Raid Arena Trigger */}
        <button
          onClick={() => setActiveModal('boss_raid')}
          className="flex items-center gap-1.5 text-xs font-bold text-red-300 hover:text-red-200 transition-colors cursor-pointer bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 px-2 py-0.5 rounded-lg"
          title={language === 'tr' ? 'Kronos Boss Savaşı Arenası' : 'Chronos Boss Raid Arena'}
        >
          <Swords className="w-3.5 h-3.5 text-red-400" />
          <span>Boss</span>
          <span className="text-[10px] font-mono text-red-300">{bossHpPercent}%</span>
        </button>

        <div className="w-[1px] h-4 bg-amber-500/20" />

        <ProBadge onClick={() => setActiveModal('subscription')} />
      </div>

      {/* 3. RIGHT LUXURY ISLAND: Studio Command Toolbar & Profile */}
      <div className="glass-island rounded-2xl p-1.5 flex items-center gap-1 pointer-events-auto shadow-2xl">
        {/* Study Statistics & Heatmap */}
        <button
          onClick={() => setActiveModal('stats')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-amber-500/15 text-amber-200/90 hover:text-amber-100 text-xs font-bold transition-all cursor-pointer bg-amber-500/10 border border-amber-500/30"
          title={language === 'tr' ? 'Çalışma İstatistikleri & Isı Haritası' : 'Study Statistics & Heatmap'}
        >
          <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">{language === 'tr' ? 'İstatistikler' : 'Stats'}</span>
        </button>

        {/* Social Share 9:16 Story Card */}
        <button
          onClick={() => setActiveModal('session_share')}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-white/5 text-stone-300 hover:text-amber-200 text-xs font-medium transition-colors cursor-pointer"
          title={language === 'tr' ? 'Sosyal Hikaye Kartı Oluştur (9:16)' : 'Create Social Story Card (9:16)'}
        >
          <Share2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden xl:inline">{language === 'tr' ? 'Paylaş' : 'Share'}</span>
        </button>

        {/* Study Tasks & Mini Kanban */}
        <button
          onClick={toggleTaskDrawer}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-white/5 text-stone-300 hover:text-amber-200 text-xs font-medium transition-colors cursor-pointer relative"
          title={language === 'tr' ? 'Çalışma Görevleri & Kanban Panosu (T)' : 'Tasks & Kanban (T)'}
        >
          <CheckSquare className="w-4 h-4 text-amber-400" />
          <span className="hidden xl:inline">{language === 'tr' ? 'Görevler' : 'Tasks'}</span>
          {tasks.filter(t => t.status !== 'done').length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        {/* Break & Reset Guide */}
        <button
          onClick={() => setActiveModal('break_guide')}
          className="hidden xl:flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-white/5 text-stone-300 hover:text-emerald-300 text-xs font-medium transition-colors cursor-pointer"
          title={language === 'tr' ? 'Mola & Göz Dinlendirme Rehberi' : 'Break & Eye Rest Guide'}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>{language === 'tr' ? 'Mola' : 'Reset'}</span>
        </button>

        {/* Command Palette Trigger */}
        <button
          onClick={() => setActiveModal('command_palette')}
          className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-white/5 text-stone-400 hover:text-stone-100 text-xs font-mono transition-colors cursor-pointer"
          title={language === 'tr' ? 'Hızlı Komut Paleti (Ctrl+K)' : 'Command Palette (Ctrl+K)'}
        >
          <Search className="w-3.5 h-3.5 text-stone-400" />
          <span className="text-[10px] opacity-70">⌘K</span>
        </button>

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
          className="flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-white/5 text-amber-200/90 text-xs font-bold transition-all cursor-pointer"
          title={language === 'tr' ? 'Switch to English' : 'Türkçe Dilini Seç'}
        >
          <Languages className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px]">{language === 'tr' ? 'TR' : 'EN'}</span>
        </button>

        <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

        {/* Study Journal */}
        <button
          onClick={() => setActiveModal('journal')}
          className="hidden sm:flex p-1.5 rounded-xl hover:bg-white/5 text-stone-300 hover:text-amber-200 transition-colors cursor-pointer"
          title={t.journalModal.title}
        >
          <BookOpen className="w-4 h-4 text-amber-300/90" />
        </button>

        {/* Progression Unlocks */}
        <button
          onClick={() => setActiveModal('progression')}
          className="hidden md:flex p-1.5 rounded-xl hover:bg-white/5 text-stone-300 hover:text-amber-200 transition-colors cursor-pointer"
          title={t.progression.title}
        >
          <Award className="w-4 h-4 text-amber-400/90" />
        </button>

        {/* Keyboard Shortcuts */}
        <button
          onClick={() => setActiveModal('shortcuts')}
          className="hidden lg:flex p-1.5 rounded-xl hover:bg-white/5 text-stone-400 hover:text-amber-200 transition-colors cursor-pointer"
          title={t.settingsModal.shortcuts}
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className={`p-1.5 rounded-xl transition-all cursor-pointer ${
            isFullscreen 
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
              : 'hover:bg-white/5 text-stone-400 hover:text-amber-200'
          }`}
          title={isFullscreen 
            ? (language === 'tr' ? "Tam Ekrandan Çık (F11)" : "Exit Fullscreen (F11)") 
            : (language === 'tr' ? "Tam Ekran (F11)" : "Fullscreen (F11)")
          }
        >
          {isFullscreen ? <Shrink className="w-4 h-4 text-amber-400" /> : <Expand className="w-4 h-4" />}
        </button>

        {/* Immersive / Zen Focus Mode */}
        <button
          onClick={() => {
            webAudioEngine.init();
            webAudioEngine.playChime('singing_bowl');
            toggleImmersiveMode();
          }}
          className={`p-1.5 rounded-xl transition-all cursor-pointer ${
            immersiveMode 
              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20' 
              : 'hover:bg-white/5 text-stone-400 hover:text-amber-200'
          }`}
          title={immersiveMode 
            ? (language === 'tr' ? "Zen Odak Modundan Çık (I veya ESC)" : "Exit Focus Mode (I or ESC)") 
            : (language === 'tr' ? "Zen / Odak Modu (I) - Arayüzü Gizle" : "Zen Focus Mode (I) - Hide UI")
          }
        >
          {immersiveMode ? <Minimize2 className="w-4 h-4 text-amber-400 animate-pulse" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Settings */}
        <button
          onClick={() => setActiveModal('settings')}
          className="p-1.5 rounded-xl hover:bg-white/5 text-stone-400 hover:text-amber-200 transition-colors cursor-pointer"
          title={t.settings}
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

        {/* User Account Menu Avatar */}
        <UserMenu />
      </div>
    </header>
  );
};

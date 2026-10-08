import React, { useState, useEffect } from 'react';
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
  Swords,
  Share2,
  BarChart2,
  Menu,
  X,
  Clock,
  Zap
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useStatsStore } from '../../store/useStatsStore';
import { useCommunityStore } from '../../store/useCommunityStore';
import { useGamificationStore } from '../../store/useGamificationStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useBossRaidStore, isFrenzyHour } from '../../store/useBossRaidStore';
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
    batterySaverMode,
    toggleBatterySaverMode,
    setActiveModal,
  } = useAppStore();

  const { streakDays } = useStatsStore();
  const { onlineCount, unreadCount, toggleChat } = useCommunityStore();
  const { xp } = useGamificationStore();
  const { tasks, toggleTaskDrawer } = useTaskStore();
  const { currentBossId, bosses } = useBossRaidStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentBoss = bosses[currentBossId] || bosses.horologium;
  const bossHpPercent = Math.round((currentBoss.currentHp / currentBoss.maxHp) * 100);
  const gamificationLevel = Math.floor(xp / 500) + 1;
  const frenzyActive = isFrenzyHour();
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

  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hoursStr = String(currentDate.getHours()).padStart(2, '0');
  const minutesStr = String(currentDate.getMinutes()).padStart(2, '0');
  const secondsStr = String(currentDate.getSeconds()).padStart(2, '0');
  const dateStr = currentDate.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const localizedTime = t.times[timeOfDay] || timeOfDay;
  const localizedWeather = t.weather[weather] || weather;

  return (
    <header 
      className="topbar-shell fixed left-2 right-2 sm:left-4 sm:right-4 z-30 flex items-center justify-between pointer-events-none transition-all duration-300 gap-2"
      style={{ top: 'max(1.2rem, calc(env(safe-area-inset-top, 0px) + 0.8rem))' }}
    >
      {/* 1. LEFT LUXURY ISLAND: Atmosphere, Room & Live Co-Study */}
      <div className="topbar-left glass-island rounded-2xl p-1 sm:p-1.5 flex items-center gap-1 sm:gap-2 pointer-events-auto shadow-2xl shrink-0 min-w-0">
        {/* Room Selector */}
        <button
          onClick={() => setActiveModal('rooms')}
          className="topbar-room-button flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl hover:bg-white/5 text-stone-100 transition-all group cursor-pointer min-w-0"
          title={t.changeRoom}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 group-hover:scale-125 shadow-[0_0_8px_rgba(251,191,36,0.6)] transition-all shrink-0" />
          <span className="topbar-room-label text-xs sm:text-sm font-bold tracking-wide text-amber-100 max-w-[85px] sm:max-w-none truncate">
            {localizedRoomName}
          </span>
          <Compass className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-300 transition-colors shrink-0" />
        </button>

        <div className="w-[1px] h-4 bg-white/10 hidden xl:block" />

        {/* Weather & Circadian Time — Only on large screens (xl+) to preserve tablet space */}
        <button
          onClick={() => setActiveModal('settings')}
          className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/5 text-stone-300 text-xs font-medium transition-colors cursor-pointer"
          title={t.changeWeather}
        >
          {getWeatherIcon()}
          <span>{localizedTime} · {localizedWeather}</span>
        </button>

        <div className="w-[1px] h-4 bg-white/10 hidden sm:block" />

        {/* Live Co-Study Buddies */}
        <button
          onClick={toggleChat}
          className="topbar-community flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer group shrink-0"
          title={language === 'tr' ? 'Birlikte Çalışanlar & Canlı Sohbet (C)' : 'Co-Study Community & Chat (C)'}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Users className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
          <span className="font-bold tracking-wide text-[11px] sm:text-xs">
            <span className="hidden sm:inline">{onlineCount} {language === 'tr' ? 'Yayında' : 'Live'}</span>
            <span className="sm:hidden">{onlineCount}</span>
          </span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-400 text-stone-950 font-black text-[10px] rounded-full animate-bounce leading-none">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* 2. CENTER LUXURY ISLAND: Real-time Ambient Digital Clock & Streak */}
      <div className="topbar-clock flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
        {/* Real-time Digital Clock Island */}
        <div 
          className="glass-island px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl flex items-center gap-1.5 sm:gap-2 shadow-2xl border border-white/10 select-none backdrop-blur-md"
          title={language === 'tr' ? 'Gerçek Zamanlı Dijital Saat' : 'Real-Time Digital Clock'}
        >
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div className="font-mono text-xs sm:text-sm font-extrabold tracking-widest text-amber-100 flex items-center">
            <span>{hoursStr}</span>
            <span className="animate-pulse mx-[1px] text-amber-400 font-black">:</span>
            <span>{minutesStr}</span>
            <span className="text-[10px] text-amber-300/80 font-mono ml-0.5 hidden xs:inline">
              :{secondsStr}
            </span>
          </div>
          <span className="hidden lg:inline text-[10px] uppercase font-bold text-stone-400 tracking-wider pl-1.5 border-l border-white/10">
            {dateStr}
          </span>
        </div>

        {/* Streak, Mastery & Level (Desktop 2xl+) */}
        <div className="hidden 2xl:flex items-center gap-2 glass-island glass-island-gold rounded-2xl px-3 py-1.5 shadow-2xl shrink-0">
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

          <ProBadge onClick={() => setActiveModal('subscription')} />
        </div>
      </div>

      {/* 3. RIGHT LUXURY ISLAND: Studio Command Toolbar & Profile */}
      <div className="topbar-actions glass-island rounded-2xl p-1 sm:p-1.5 flex items-center gap-1 pointer-events-auto shadow-2xl shrink-0">
        {/* Study Statistics & Heatmap */}
        <button
          onClick={() => setActiveModal('stats')}
          className="topbar-secondary-action flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl hover:bg-amber-500/15 text-amber-200/90 hover:text-amber-100 text-xs font-bold transition-all cursor-pointer bg-amber-500/10 border border-amber-500/30 shrink-0"
          title={language === 'tr' ? 'Çalışma İstatistikleri & Isı Haritası' : 'Study Statistics & Heatmap'}
        >
          <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">{language === 'tr' ? 'İstatistikler' : 'Stats'}</span>
        </button>

        {/* Boss Raid Arena Trigger — Visible & Prominent on all screens! */}
        <button
          onClick={() => setActiveModal('boss_raid')}
          className={`topbar-secondary-action flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
            frenzyActive 
              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse'
              : 'bg-red-950/50 hover:bg-red-900/70 text-red-200 hover:text-red-100 border-red-500/40 shadow-sm'
          }`}
          title={
            language === 'tr' 
              ? (frenzyActive ? '🔥 ALTIN SAAT: 2x Yük & 1.5x Hasar Aktif!' : 'Kronos Boss Savaşı Arenası') 
              : (frenzyActive ? '🔥 FRENZY HOUR: 2x Charges & 1.5x DMG Active!' : 'Chronos Boss Raid Arena')
          }
        >
          {frenzyActive ? (
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
          ) : (
            <Swords className="w-3.5 h-3.5 text-red-400" />
          )}
          <span className="hidden sm:inline">Boss</span>
          <span className={`text-[10px] font-mono font-bold ${frenzyActive ? 'text-amber-300' : 'text-red-300'}`}>
            {bossHpPercent}%
          </span>
          {frenzyActive && (
            <span className="text-[9px] bg-amber-400 text-stone-950 font-black px-1 rounded-sm leading-tight hidden sm:inline">
              2x
            </span>
          )}
        </button>

        {/* Study Tasks & Mini Kanban — Prominent, easy-to-tap pill for phone & tablet */}
        <button
          onClick={toggleTaskDrawer}
          className="topbar-secondary-action flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer relative shrink-0 active:scale-95 shadow-sm"
          title={language === 'tr' ? 'Çalışma Görevleri & To-Do Listesi (T)' : 'Tasks & To-Do List (T)'}
        >
          <CheckSquare className="w-4 h-4 text-amber-400" />
          <span className="font-bold">Todo</span>
          {tasks.filter(t => t.status !== 'done').length > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-400 text-stone-950 font-black text-[10px] rounded-full leading-none">
              {tasks.filter(t => t.status !== 'done').length}
            </span>
          )}
        </button>

        {/* DESKTOP-ONLY SHORTCUTS (hidden on screens < 1536px / tablet & laptop, accessible via Studio Menu) */}
        <div className="hidden 2xl:flex items-center gap-1">
          {/* Social Share 9:16 Story Card */}
          <button
            onClick={() => setActiveModal('session_share')}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-white/5 text-stone-300 hover:text-amber-200 text-xs font-medium transition-colors cursor-pointer"
            title={language === 'tr' ? 'Sosyal Hikaye Kartı Oluştur (9:16)' : 'Create Social Story Card (9:16)'}
          >
            <Share2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'tr' ? 'Paylaş' : 'Share'}</span>
          </button>

          {/* Break & Reset Guide */}
          <button
            onClick={() => setActiveModal('break_guide')}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-white/5 text-stone-300 hover:text-emerald-300 text-xs font-medium transition-colors cursor-pointer"
            title={language === 'tr' ? 'Mola & Göz Dinlendirme Rehberi' : 'Break & Eye Rest Guide'}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'tr' ? 'Mola' : 'Reset'}</span>
          </button>

          {/* Command Palette Trigger */}
          <button
            onClick={() => setActiveModal('command_palette')}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-white/5 text-stone-400 hover:text-stone-100 text-xs font-mono transition-colors cursor-pointer"
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
            className="p-1.5 rounded-xl hover:bg-white/5 text-stone-300 hover:text-amber-200 transition-colors cursor-pointer"
            title={t.journalModal.title}
          >
            <BookOpen className="w-4 h-4 text-amber-300/90" />
          </button>

          {/* Progression Unlocks */}
          <button
            onClick={() => setActiveModal('progression')}
            className="p-1.5 rounded-xl hover:bg-white/5 text-stone-300 hover:text-amber-200 transition-colors cursor-pointer"
            title={t.progression.title}
          >
            <Award className="w-4 h-4 text-amber-400/90" />
          </button>

          {/* Help & Tutorial Guide */}
          <button
            onClick={() => setActiveModal('shortcuts')}
            className="p-1.5 rounded-xl hover:bg-white/5 text-stone-400 hover:text-amber-200 transition-colors cursor-pointer"
            title={t.helpModal.title}
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

          {/* Battery Saver Mode Quick Toggle */}
          <button
            onClick={() => {
              webAudioEngine.init();
              webAudioEngine.playChime('wood_block');
              toggleBatterySaverMode();
            }}
            className={`p-1.5 rounded-xl transition-all cursor-pointer ${
              batterySaverMode 
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20' 
                : 'hover:bg-white/5 text-stone-400 hover:text-emerald-300'
            }`}
            title={batterySaverMode 
              ? (language === 'tr' ? "🔋 Güç Tasarrufu Modu: Açık (12 FPS, Isınma Önleyici)" : "🔋 Battery Saver: ON (12 FPS)") 
              : (language === 'tr' ? "🔋 Güç Tasarrufu Modunu Aç (Tablet ve Telefon Isınmasını Önle)" : "🔋 Enable Battery Saver Mode")
            }
          >
            <Zap className={`w-4 h-4 ${batterySaverMode ? 'text-emerald-400 fill-current animate-pulse' : ''}`} />
          </button>

          {/* Settings */}
          <button
            onClick={() => setActiveModal('settings')}
            className="p-1.5 rounded-xl hover:bg-white/5 text-stone-400 hover:text-amber-200 transition-colors cursor-pointer"
            title={t.settings}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* STUDIO MENU TOGGLE BUTTON (Screens < 1536px, Mobile & Tablet) */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`topbar-menu-trigger 2xl:hidden p-1.5 rounded-xl transition-all cursor-pointer ${
            isMobileMenuOpen ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'hover:bg-white/5 text-stone-300'
          }`}
          title={language === 'tr' ? 'Stüdyo Menüsü' : 'Studio Menu'}
        >
          {isMobileMenuOpen ? <X className="w-4 h-4 text-amber-400" /> : <Menu className="w-4 h-4 text-stone-300" />}
        </button>

        <div className="topbar-actions-divider w-[1px] h-4 bg-white/10 mx-0.5" />

        {/* User Account Menu Avatar */}
        <UserMenu />
      </div>

      {/* 4. MOBILE & TABLET STUDIO DRAWER / MENU POPUP (Screens < 1536px) */}
      {isMobileMenuOpen && (
        <div 
          className="app-modal-overlay topbar-mobile-menu 2xl:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm pointer-events-auto animate-fade-in flex flex-col justify-start p-4 pt-16"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="bg-stone-900/98 text-stone-100 border border-stone-800 rounded-2xl shadow-2xl p-4 w-full max-w-sm sm:max-w-md ml-auto flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150 max-h-[85dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold text-sm">☕ LockIn Studio</span>
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-bold">
                  {language === 'tr' ? `Sv.${gamificationLevel}` : `Lv.${gamificationLevel}`}
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Language Switch */}
              <button
                onClick={() => {
                  setLanguage(language === 'tr' ? 'en' : 'tr');
                }}
                className="p-2.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-left flex items-center gap-2 text-stone-200 transition-colors cursor-pointer"
              >
                <Languages className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-[11px] text-amber-200">{language === 'tr' ? 'Dil: Türkçe' : 'Language: EN'}</div>
                  <div className="text-[10px] text-stone-400">{language === 'tr' ? 'Switch to English' : 'Türkçe Dilini Seç'}</div>
                </div>
              </button>

              {/* Boss Raid Arena */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setActiveModal('boss_raid');
                }}
                className="p-2.5 rounded-xl bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 text-left flex items-center gap-2 text-stone-200 transition-colors cursor-pointer"
              >
                <Swords className="w-4 h-4 text-red-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-[11px] text-red-200">Boss Savaşı</div>
                  <div className="text-[10px] text-red-400 font-mono">HP: {bossHpPercent}%</div>
                </div>
              </button>

              {/* Study Journal */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setActiveModal('journal');
                }}
                className="p-2.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-left flex items-center gap-2 text-stone-200 transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-amber-300 shrink-0" />
                <div className="min-w-0 font-medium">
                  <div>{t.journalModal.title}</div>
                  <div className="text-[10px] text-stone-400">{language === 'tr' ? 'Kişisel Notlar' : 'Session Notes'}</div>
                </div>
              </button>

              {/* Progression Unlocks */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setActiveModal('progression');
                }}
                className="p-2.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-left flex items-center gap-2 text-stone-200 transition-colors cursor-pointer"
              >
                <Award className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0 font-medium">
                  <div>{t.progression.title}</div>
                  <div className="text-[10px] text-stone-400">{language === 'tr' ? 'Rozetler & Kilitler' : 'Badges & Rooms'}</div>
                </div>
              </button>

              {/* Break Guide */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setActiveModal('break_guide');
                }}
                className="p-2.5 rounded-xl bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/30 text-left flex items-center gap-2 text-stone-200 transition-colors cursor-pointer"
              >
                <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0 font-medium">
                  <div className="text-emerald-200">{language === 'tr' ? 'Mola Rehberi' : 'Break Guide'}</div>
                  <div className="text-[10px] text-emerald-400/80">{language === 'tr' ? 'Göz & Beden' : 'Eye & Body'}</div>
                </div>
              </button>

              {/* Social Share 9:16 */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setActiveModal('session_share');
                }}
                className="p-2.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-left flex items-center gap-2 text-stone-200 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0 font-medium">
                  <div>{language === 'tr' ? 'Hikaye Paylaş' : 'Share Story'}</div>
                  <div className="text-[10px] text-stone-400">9:16 Card</div>
                </div>
              </button>

              {/* Battery Saver Mode (Mobile Menu) */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  webAudioEngine.init();
                  webAudioEngine.playChime('wood_block');
                  toggleBatterySaverMode();
                }}
                className={`p-2.5 rounded-xl text-left flex items-center gap-2 transition-colors cursor-pointer border ${
                  batterySaverMode 
                    ? 'bg-emerald-950/40 text-emerald-200 border-emerald-500/40 shadow-sm' 
                    : 'bg-stone-800/80 hover:bg-stone-700 text-stone-200 border-transparent'
                }`}
              >
                <Zap className={`w-4 h-4 shrink-0 ${batterySaverMode ? 'text-emerald-400 fill-current' : 'text-stone-400'}`} />
                <div className="min-w-0 font-medium">
                  <div>{language === 'tr' ? 'Güç Tasarruf Modu' : 'Battery Saver Mode'}</div>
                  <div className="text-[10px] text-stone-400">
                    {batterySaverMode ? (language === 'tr' ? 'Etkin (12 FPS)' : 'Active (12 FPS)') : (language === 'tr' ? 'Isınmayı önle' : 'Prevent heating')}
                  </div>
                </div>
              </button>

              {/* Settings */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setActiveModal('settings');
                }}
                className="p-2.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-left flex items-center gap-2 text-stone-200 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 text-stone-400 shrink-0" />
                <div className="min-w-0 font-medium">
                  <div>{t.settings}</div>
                  <div className="text-[10px] text-stone-400">{localizedTime} · {localizedWeather}</div>
                </div>
              </button>

              {/* Immersive / Zen Focus Mode */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  webAudioEngine.init();
                  webAudioEngine.playChime('singing_bowl');
                  toggleImmersiveMode();
                }}
                className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left flex items-center gap-2 text-amber-200 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0 font-medium">
                  <div>{language === 'tr' ? 'Zen Odak Modu' : 'Zen Focus Mode'}</div>
                  <div className="text-[10px] text-amber-400/80">{language === 'tr' ? 'Arayüzü Gizle' : 'Hide UI'}</div>
                </div>
              </button>

              {/* Help & Shortcuts Guide */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setActiveModal('shortcuts');
                }}
                className="p-2.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-left flex items-center gap-2 text-stone-200 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0 font-medium">
                  <div>{t.helpModal.title}</div>
                  <div className="text-[10px] text-stone-400">{language === 'tr' ? 'Kullanım Rehberi' : 'Quick Guide'}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default TopBar;

import React from 'react';
import { 
  X, 
  Sun, 
  Sunset, 
  Moon, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  Tv, 
  Eye, 
  Sliders, 
  Flame, 
  Lightbulb, 
  HelpCircle,
  Languages,
  Volume2,
  Target,
  Clock,
  Download,
  Bell,
  Crown,
  Sparkles
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { webAudioEngine } from '../../audio/WebAudioEngine';
import { TimeOfDay, WeatherType } from '../../types';
import { TRANSLATIONS } from '../../i18n/translations';

export const SettingsModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    language,
    setLanguage,
    timeOfDay,
    setTimeOfDay,
    isAutoTime,
    setAutoTime,
    weather,
    setWeather,
    crtOverlay,
    toggleCrtOverlay,
    reduceMotion,
    toggleReduceMotion,
    soundFxEnabled,
    toggleSoundFx,
    dailyGoalMinutes,
    setDailyGoalMinutes,
    lampOn,
    toggleLamp,
    fireplaceActive,
    toggleFireplace,
    showToast,
  } = useAppStore();

  const {
    isPro,
    selectedCrtTheme,
    setCrtTheme,
    selectedChime,
    setSelectedChime,
    weatherIntensity,
    setWeatherIntensity,
    selectedCatBreed,
    setCatBreed,
  } = useSubscriptionStore();

  const handleDownloadWallpaper = () => {
    if (!isPro) {
      showToast(language === 'tr' ? '👑 Duvar kağıdı indirme PRO özelliğidir' : '👑 Wallpaper export is a PRO feature', 2500);
      setActiveModal('subscription');
      return;
    }
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      showToast(language === 'tr' ? 'Tuval bulunamadı' : 'Canvas not found', 2000);
      return;
    }
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `cozy_study_room_${Date.now()}.png`;
      a.click();
      showToast(language === 'tr' ? 'Duvar kağıdı indirildi! 🎨' : 'Wallpaper downloaded! 🎨', 2500);
    } catch {
      showToast('Error exporting wallpaper', 2000);
    }
  };

  if (activeModal !== 'settings') return null;

  const t = TRANSLATIONS[language];

  const times: { id: TimeOfDay; icon: React.ReactNode }[] = [
    { id: 'morning', icon: <Sun className="w-4 h-4 text-amber-300" /> },
    { id: 'afternoon', icon: <Sun className="w-4 h-4 text-sky-300" /> },
    { id: 'golden_hour', icon: <Sunset className="w-4 h-4 text-orange-400" /> },
    { id: 'evening', icon: <Moon className="w-4 h-4 text-indigo-300" /> },
    { id: 'midnight', icon: <Moon className="w-4 h-4 text-purple-300" /> },
  ];

  const weathers: { id: WeatherType; icon: React.ReactNode }[] = [
    { id: 'clear', icon: <Sun className="w-4 h-4 text-amber-300" /> },
    { id: 'rain', icon: <CloudRain className="w-4 h-4 text-sky-400" /> },
    { id: 'heavy_rain', icon: <CloudRain className="w-4 h-4 text-blue-400" /> },
    { id: 'snow', icon: <CloudSnow className="w-4 h-4 text-slate-200" /> },
    { id: 'storm', icon: <CloudLightning className="w-4 h-4 text-indigo-400" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm pointer-events-auto">
      <div className="bg-stone-900/95 text-stone-100 border border-stone-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-amber-200">{t.settingsModal.title}</h3>
              <p className="text-xs text-stone-400">{t.settingsModal.subtitle}</p>
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
          {/* Language Selection Section (Optimization & Turkish Support) */}
          <div>
            <label className="text-xs font-bold text-stone-300 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <Languages className="w-3.5 h-3.5 text-amber-400" />
              {t.settingsModal.language}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setLanguage('tr')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                  language === 'tr'
                    ? 'bg-amber-950/50 border-amber-500/80 text-amber-200 ring-1 ring-amber-500/30'
                    : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:bg-stone-800/60'
                }`}
              >
                <span className="text-base">🇹🇷</span>
                <span>Türkçe</span>
              </button>

              <button
                onClick={() => setLanguage('en')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                  language === 'en'
                    ? 'bg-amber-950/50 border-amber-500/80 text-amber-200 ring-1 ring-amber-500/30'
                    : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:bg-stone-800/60'
                }`}
              >
                <span className="text-base">🇬🇧</span>
                <span>English</span>
              </button>
            </div>
          </div>

          {/* Daily Focus Goal Setting (Optimization #8) */}
          <div>
            <label className="text-xs font-bold text-stone-300 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              {language === 'tr' ? 'GÜNLÜK HEDEF (DAKİKA)' : 'DAILY GOAL (MINUTES)'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[60, 90, 120, 180].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setDailyGoalMinutes(mins)}
                  className={`p-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors text-center ${
                    dailyGoalMinutes === mins
                      ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50'
                      : 'bg-stone-800/70 hover:bg-stone-800 text-stone-300 border border-transparent'
                  }`}
                >
                  {mins} {language === 'tr' ? 'dk' : 'min'}
                </button>
              ))}
            </div>
          </div>

          {/* Time of Day */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-stone-300 block uppercase tracking-wider">
                {t.settingsModal.timeOfDay}
              </label>
              <button
                type="button"
                onClick={() => {
                  const next = !isAutoTime;
                  setAutoTime(next);
                  showToast(next ? (language === 'tr' ? 'Otomatik saat senkronizasyonu aktif 🕒' : 'Real-world time sync enabled 🕒') : (language === 'tr' ? 'Manuel saat moduna geçildi' : 'Manual time mode set'), 1800);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  isAutoTime
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-stone-800/80 text-stone-400 hover:text-stone-300 border border-stone-700'
                }`}
                title={t.settingsModal.autoTimeDesc}
              >
                <Clock className="w-3 h-3" />
                <span>{t.settingsModal.autoTimeTitle}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${isAutoTime ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'}`} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {times.map((timeItem) => {
                const localizedTimeName = t.times[timeItem.id as keyof typeof t.times];
                return (
                  <button
                    key={timeItem.id}
                    onClick={() => {
                      setAutoTime(false);
                      setTimeOfDay(timeItem.id);
                      showToast(t.toasts.timeShifted(localizedTimeName), 1500);
                    }}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      timeOfDay === timeItem.id
                        ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50'
                        : 'bg-stone-800/70 hover:bg-stone-800 text-stone-300 border border-transparent'
                    }`}
                  >
                    {timeItem.icon}
                    <span>{localizedTimeName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weather */}
          <div>
            <label className="text-xs font-bold text-stone-300 mb-2 block uppercase tracking-wider">
              {t.settingsModal.weatherAtmosphere}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {weathers.map((w) => {
                const localizedWeatherName = t.weather[w.id as keyof typeof t.weather];
                return (
                  <button
                    key={w.id}
                    onClick={() => {
                      setWeather(w.id);
                      showToast(t.toasts.weatherSet(localizedWeatherName), 1500);
                    }}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      weather === w.id
                        ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50'
                        : 'bg-stone-800/70 hover:bg-stone-800 text-stone-300 border border-transparent'
                    }`}
                  >
                    {w.icon}
                    <span>{localizedWeatherName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room Switches */}
          <div>
            <label className="text-xs font-bold text-stone-300 mb-2 block uppercase tracking-wider">
              {t.settingsModal.lightSources}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={toggleLamp}
                className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                  lampOn
                    ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                    : 'bg-stone-950/40 border-stone-800 text-stone-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  <span>{t.settingsModal.lamp}</span>
                </div>
                <span className="text-xs font-mono">
                  {lampOn ? (language === 'tr' ? 'AÇIK' : 'ON') : (language === 'tr' ? 'KAPALI' : 'OFF')}
                </span>
              </button>

              <button
                onClick={toggleFireplace}
                className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                  fireplaceActive
                    ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                    : 'bg-stone-950/40 border-stone-800 text-stone-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  <span>{t.settingsModal.fireplace}</span>
                </div>
                <span className="text-xs font-mono">
                  {fireplaceActive ? (language === 'tr' ? 'AÇIK' : 'ON') : (language === 'tr' ? 'KAPALI' : 'OFF')}
                </span>
              </button>
            </div>
          </div>

          {/* Visual Effects, Sound FX & Accessibility */}
          <div>
            <label className="text-xs font-bold text-stone-300 mb-2 block uppercase tracking-wider">
              {t.settingsModal.effects}
            </label>
            <div className="space-y-2">
              <div
                onClick={toggleCrtOverlay}
                className="flex items-center justify-between p-3 bg-stone-950/40 border border-stone-800 rounded-xl cursor-pointer hover:border-stone-700"
              >
                <div className="flex items-center gap-2.5">
                  <Tv className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-sm font-semibold text-stone-200">{t.settingsModal.crtTitle}</div>
                    <div className="text-xs text-stone-400">{t.settingsModal.crtDesc}</div>
                  </div>
                </div>
                <span className={`text-xs font-mono font-bold ${crtOverlay ? 'text-amber-400' : 'text-stone-500'}`}>
                  {crtOverlay ? (language === 'tr' ? 'AÇIK' : 'ENABLED') : (language === 'tr' ? 'KAPALI' : 'DISABLED')}
                </span>
              </div>

              <div
                onClick={toggleReduceMotion}
                className="flex items-center justify-between p-3 bg-stone-950/40 border border-stone-800 rounded-xl cursor-pointer hover:border-stone-700"
              >
                <div className="flex items-center gap-2.5">
                  <Eye className="w-4 h-4 text-sky-400" />
                  <div>
                    <div className="text-sm font-semibold text-stone-200">{t.settingsModal.reduceMotionTitle}</div>
                    <div className="text-xs text-stone-400">{t.settingsModal.reduceMotionDesc}</div>
                  </div>
                </div>
                <span className={`text-xs font-mono font-bold ${reduceMotion ? 'text-amber-400' : 'text-stone-500'}`}>
                  {reduceMotion ? (language === 'tr' ? 'AÇIK' : 'ON') : (language === 'tr' ? 'KAPALI' : 'OFF')}
                </span>
              </div>

              <div
                onClick={toggleSoundFx}
                className="flex items-center justify-between p-3 bg-stone-950/40 border border-stone-800 rounded-xl cursor-pointer hover:border-stone-700"
              >
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-sm font-semibold text-stone-200">{language === 'tr' ? 'Etkileşim Sesleri' : 'Interaction Audio FX'}</div>
                    <div className="text-xs text-stone-400">{language === 'tr' ? 'Tıklama, zil ve mırıldanma sesleri' : 'Clicks, chimes, and purr effects'}</div>
                  </div>
                </div>
                <span className={`text-xs font-mono font-bold ${soundFxEnabled ? 'text-amber-400' : 'text-stone-500'}`}>
                  {soundFxEnabled ? (language === 'tr' ? 'AÇIK' : 'ON') : (language === 'tr' ? 'KAPALI' : 'OFF')}
                </span>
              </div>
            </div>
          </div>

          {/* CRT Theme Customization */}
          {crtOverlay && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Tv className="w-3.5 h-3.5 text-amber-400" />
                  {language === 'tr' ? 'CRT Ekran Teması' : 'CRT Screen Theme'}
                </label>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">PRO</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'classic' as const, label: 'Classic Scanlines', isProOnly: false },
                  { id: 'amber' as const, label: 'Amber Phosphor', isProOnly: true },
                  { id: 'green_matrix' as const, label: 'Matrix Terminal', isProOnly: true },
                  { id: 'gameboy' as const, label: 'GameBoy Green', isProOnly: true },
                  { id: 'cyberpunk' as const, label: 'Cyberpunk Neon', isProOnly: true },
                ].map((theme) => {
                  const isLocked = theme.isProOnly && !isPro;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => {
                        if (isLocked) {
                          setActiveModal('subscription');
                          return;
                        }
                        setCrtTheme(theme.id);
                        showToast(`CRT: ${theme.label}`);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                        selectedCrtTheme === theme.id
                          ? 'bg-amber-500/20 text-amber-200 border-amber-500/50'
                          : 'bg-stone-950/40 border-stone-800 text-stone-300 hover:bg-stone-850'
                      }`}
                    >
                      <span className="truncate">{theme.label}</span>
                      {isLocked && <Crown className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Session Chime Selector with Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                {language === 'tr' ? 'Oturum Tamamlanma Zili' : 'Session End Chime'}
              </label>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">PRO</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: 'singing_bowl' as const, label: language === 'tr' ? 'Tibet Çanağı' : 'Singing Bowl', isProOnly: false },
                { id: 'wood_block' as const, label: language === 'tr' ? 'Zen Ahşap Blok' : 'Zen Wood Block', isProOnly: true },
                { id: 'retro_bell' as const, label: language === 'tr' ? 'Retro Resepsiyon' : 'Retro Desk Bell', isProOnly: true },
                { id: 'digital' as const, label: language === 'tr' ? '8-Bit Dijital Melodi' : '8-Bit Digital', isProOnly: true },
                { id: 'zen_gong' as const, label: language === 'tr' ? 'Derin Tapınak Gongu' : 'Deep Temple Gong', isProOnly: true },
              ].map((chime) => {
                const isLocked = chime.isProOnly && !isPro;
                return (
                  <div
                    key={chime.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold ${
                      selectedChime === chime.id
                        ? 'bg-amber-500/20 text-amber-200 border-amber-500/50'
                        : 'bg-stone-950/40 border-stone-800 text-stone-300'
                    }`}
                  >
                    <button
                      onClick={() => {
                        if (isLocked) {
                          setActiveModal('subscription');
                          return;
                        }
                        setSelectedChime(chime.id);
                        webAudioEngine.playChime(chime.id);
                      }}
                      className="flex-1 text-left flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="truncate">{chime.label}</span>
                      {isLocked && <Crown className="w-3.5 h-3.5 text-amber-400/80" />}
                    </button>
                    <button
                      onClick={() => {
                        if (isLocked) {
                          setActiveModal('subscription');
                          return;
                        }
                        webAudioEngine.init();
                        webAudioEngine.playChime(chime.id);
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] cursor-pointer transition-colors ${
                        isLocked
                          ? 'bg-amber-950/40 text-amber-500 border border-amber-500/30'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                      }`}
                      title={isLocked ? (language === 'tr' ? 'PRO gerekli' : 'PRO required') : (language === 'tr' ? 'Dinle' : 'Preview')}
                    >
                      {isLocked ? '🔒' : '▶'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Virtual Cat Breed Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {language === 'tr' ? 'Oda Kedisi Türü' : 'Room Cat Breed'}
              </label>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">PRO</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'tabby' as const, label: language === 'tr' ? 'Tekir (Turuncu)' : 'Orange Tabby', isProOnly: false },
                { id: 'black' as const, label: language === 'tr' ? 'Gece Siyahı' : 'Midnight Black', isProOnly: true },
                { id: 'white' as const, label: language === 'tr' ? 'Kar Beyazı' : 'Snow White', isProOnly: true },
                { id: 'calico' as const, label: language === 'tr' ? 'Alaca (Kaliko)' : 'Calico Tri-color', isProOnly: true },
                { id: 'tuxedo' as const, label: language === 'tr' ? 'Smokin Kedi' : 'Gentleman Tuxedo', isProOnly: true },
              ].map((cat) => {
                const isLocked = cat.isProOnly && !isPro;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (isLocked) {
                        setActiveModal('subscription');
                        return;
                      }
                      setCatBreed(cat.id);
                      webAudioEngine.playCatPurr();
                      showToast(language === 'tr' ? `Kedi seçildi: ${cat.label} 🐾` : `Cat selected: ${cat.label} 🐾`);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                      selectedCatBreed === cat.id
                        ? 'bg-amber-500/20 text-amber-200 border-amber-500/50'
                        : 'bg-stone-950/40 border-stone-800 text-stone-300 hover:bg-stone-850'
                    }`}
                  >
                    <span className="truncate">{cat.label}</span>
                    {isLocked && <Crown className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weather Intensity Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5 uppercase tracking-wider">
                {language === 'tr' ? 'Hava Durumu Yoğunluğu' : 'Weather Intensity'}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-300">
                  {weatherIntensity.toFixed(1)}x
                </span>
                {!isPro && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">PRO</span>
                )}
              </div>
            </div>
            {isPro ? (
              <input
                type="range"
                min="0.2"
                max="2.0"
                step="0.1"
                value={weatherIntensity}
                onChange={(e) => setWeatherIntensity(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            ) : (
              <button
                onClick={() => setActiveModal('subscription')}
                className="w-full h-8 bg-stone-900/60 border border-amber-500/30 rounded-lg flex items-center justify-center gap-2 text-xs text-amber-400 font-medium cursor-pointer hover:bg-amber-950/30 transition-colors"
              >
                <span>🔒</span>
                <span>{language === 'tr' ? 'PRO üyeliği gereklidir' : 'Requires PRO membership'}</span>
              </button>
            )}
          </div>

          {/* Wallpaper Export Action Button */}
          <div className="p-3 bg-gradient-to-r from-amber-950/30 to-stone-950/60 border border-amber-500/25 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-amber-400" />
                {language === 'tr' ? 'Pixel Art Duvar Kağıdı İndir' : 'Export Pixel Art Wallpaper'}
                {!isPro && <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30 ml-1">PRO</span>}
              </div>
              <div className="text-[11px] text-stone-400">
                {language === 'tr' ? 'Mevcut odanı yüksek çözünürlüklü PNG olarak kaydet' : 'Download high-res snapshot of current room'}
              </div>
            </div>
            <button
              onClick={handleDownloadWallpaper}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'tr' ? 'İndir' : 'Export'}</span>
            </button>
          </div>

          {/* Keyboard Shortcuts Reference */}
          <div className="p-3.5 bg-stone-950/60 border border-stone-800/80 rounded-xl text-xs space-y-2">
            <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              {t.settingsModal.shortcuts}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-stone-300">
              <div><kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-stone-200 font-mono text-xs border border-stone-700">Space</kbd> {t.settingsModal.shortcutsList.space}</div>
              <div><kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-stone-200 font-mono text-xs border border-stone-700">M</kbd> {t.settingsModal.shortcutsList.m}</div>
              <div><kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-stone-200 font-mono text-xs border border-stone-700">I</kbd> {t.settingsModal.shortcutsList.i}</div>
              <div><kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-stone-200 font-mono text-xs border border-stone-700">P</kbd> {t.settingsModal.shortcutsList.p}</div>
              <div><kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-stone-200 font-mono text-xs border border-stone-700">L</kbd> {t.settingsModal.shortcutsList.l}</div>
              <div><kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-stone-200 font-mono text-xs border border-stone-700">F</kbd> {t.settingsModal.shortcutsList.f}</div>
            </div>
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

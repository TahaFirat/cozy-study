import React, { useMemo } from 'react';
import { 
  Sliders, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  X,
  CloudRain,
  Flame,
  Disc,
  Keyboard,
  Wind,
  CloudLightning,
  Coffee,
  Trees,
  Bug,
  Clock,
  Waves,
  Zap,
  Heart,
  BookOpen,
  Crown,
  Compass,
  Timer,
  Radio,
  Headphones,
  Bell,
  PenTool
} from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { useAppStore } from '../../store/useAppStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { AMBIENT_PRESETS } from '../../audio/soundPresets';
import { AmbientSoundChannel } from '../../types';
import { TRANSLATIONS } from '../../i18n/translations';
import { webAudioEngine } from '../../audio/WebAudioEngine';

export const AmbientMixerWidget: React.FC = () => {
  const {
    ambientVolumes,
    setChannelVolume,
    binauralMode,
    setBinauralMode,
    activePresetId,
    applyPreset,
    resetAmbient,
    masterVolume,
    setMasterVolume,
    isMuted,
    toggleMute,
  } = useAudioStore();

  const { activeModal, setActiveModal, language, showToast } = useAppStore();
  const { isPro } = useSubscriptionStore();
  const t = TRANSLATIONS[language];
  const isOpen = activeModal === 'mixer';

  const isTr = language === 'tr';

  const channels: { id: AmbientSoundChannel; icon: React.ReactNode; isProOnly?: boolean }[] = useMemo(() => [
    { id: 'rain', icon: <CloudRain className="w-4 h-4 text-sky-400" /> },
    { id: 'fireplace', icon: <Flame className="w-4 h-4 text-amber-500" /> },
    { id: 'vinyl', icon: <Disc className="w-4 h-4 text-stone-400" /> },
    { id: 'keyboard', icon: <Keyboard className="w-4 h-4 text-teal-400" /> },
    { id: 'wind', icon: <Wind className="w-4 h-4 text-slate-300" /> },
    { id: 'thunder', icon: <CloudLightning className="w-4 h-4 text-indigo-400" /> },
    { id: 'cafe', icon: <Coffee className="w-4 h-4 text-orange-400" /> },
    { id: 'forest', icon: <Trees className="w-4 h-4 text-emerald-400" /> },
    { id: 'insects', icon: <Bug className="w-4 h-4 text-lime-400" /> },
    { id: 'clock', icon: <Clock className="w-4 h-4 text-amber-300" /> },
    { id: 'roomTone', icon: <Waves className="w-4 h-4 text-purple-400" /> },
    { id: 'whiteNoise', icon: <Radio className="w-4 h-4 text-cyan-300" /> },
    // PRO Channels
    { id: 'binaural', icon: <Zap className="w-4 h-4 text-amber-400" />, isProOnly: true },
    { id: 'catPurr', icon: <Heart className="w-4 h-4 text-rose-400" />, isProOnly: true },
    { id: 'train', icon: <Compass className="w-4 h-4 text-blue-400" />, isProOnly: true },
    { id: 'bookPages', icon: <BookOpen className="w-4 h-4 text-amber-300" />, isProOnly: true },
    { id: 'pinkNoise', icon: <Headphones className="w-4 h-4 text-pink-400" />, isProOnly: true },
    { id: 'brownNoise', icon: <Waves className="w-4 h-4 text-amber-600" />, isProOnly: true },
    { id: 'windChimes', icon: <Bell className="w-4 h-4 text-yellow-300" />, isProOnly: true },
    { id: 'typewriter', icon: <PenTool className="w-4 h-4 text-stone-300" />, isProOnly: true },
  ], []);

  const activeChannelsCount = Object.values(ambientVolumes).filter((v) => v > 0).length;

  return (
    <>
      {/* Bottom-right Floating Mixer Trigger Button */}
      <div 
        className="absolute right-4 z-30 pointer-events-auto"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
      >
        <button
          onClick={() => setActiveModal(isOpen ? 'none' : 'mixer')}
          className={`flex items-center gap-2.5 px-4 py-2.5 glass-island text-stone-100 rounded-2xl shadow-2xl transition-all duration-300 cursor-pointer ${
            isOpen || activeChannelsCount > 0
              ? 'border-amber-500/70 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
              : 'border-white/10 hover:border-white/20'
          }`}
          title={t.mixer.title}
        >
          <Sliders className="w-4 h-4" />
          <span className="text-sm font-bold tracking-wide hidden sm:inline">{t.mixer.title}</span>
          {activeChannelsCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.4)]">
              {activeChannelsCount}
            </span>
          )}
        </button>
      </div>

      {/* Floating Ambient Mixer Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm pointer-events-auto">
          <div className="bg-stone-900/95 text-stone-100 border border-stone-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-amber-200">{t.mixer.title}</h3>
                  <p className="text-xs text-stone-400">{t.mixer.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal('none')}
                className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets Grid */}
            <div className="py-3.5 border-b border-stone-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  {t.mixer.presets}
                </span>
                {!isPro && (
                  <button 
                    onClick={() => setActiveModal('subscription')}
                    className="flex items-center gap-1 text-[10px] text-amber-400 font-bold hover:underline cursor-pointer"
                  >
                    <Crown className="w-3 h-3" />
                    <span>{isTr ? 'Tüm Pro Sesleri Aç' : 'Unlock All Pro Sounds'}</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AMBIENT_PRESETS.map((preset) => {
                  const localizedPresetName = t.mixer.presetNames[preset.id as keyof typeof t.mixer.presetNames] || preset.name;
                  const isProPreset = preset.id.includes('binaural') || preset.id.includes('cat') || preset.id.includes('gothic') || preset.id.includes('train');

                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        if (isProPreset && !isPro) {
                          showToast(isTr ? 'Bu ses manzarası Cozy Room PRO üyelerine özeldir 👑' : 'This soundscape is exclusive to Cozy Room PRO 👑', 2500);
                          setActiveModal('subscription');
                          return;
                        }
                        webAudioEngine.init();
                        applyPreset(preset.id);
                        const curWeather = useAppStore.getState().weather;
                        if (curWeather === 'snow' || curWeather === 'clear') {
                          setChannelVolume('rain', 0);
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer truncate flex items-center justify-between gap-1.5 ${
                        activePresetId === preset.id
                          ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50'
                          : 'bg-stone-800/70 hover:bg-stone-800 text-stone-300 border border-transparent'
                      }`}
                      title={preset.description}
                    >
                      <span className="truncate">{localizedPresetName}</span>
                      {isProPreset && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Master Volume & Sleep Timer Bar */}
            <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 text-sm">
              <div className="flex items-center gap-2.5 text-stone-200 flex-1">
                <button
                  onClick={toggleMute}
                  className={`cursor-pointer ${isMuted ? 'text-red-400' : 'text-stone-400 hover:text-stone-200'}`}
                  title={isMuted ? 'Unmute (M)' : 'Mute All (M)'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <span className="font-semibold text-xs text-stone-300">{t.mixer.master}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={isMuted ? 0 : masterVolume}
                  onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={resetAmbient}
                  className="flex items-center gap-1 text-xs text-stone-300 hover:text-stone-100 px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 cursor-pointer"
                  title={t.mixer.reset}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.mixer.reset}</span>
                </button>
              </div>
            </div>

            {/* Scrollable Sound Channels Sliders */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1.5 custom-scrollbar">
              {channels.map((ch) => {
                const vol = ambientVolumes[ch.id] || 0;
                const percent = Math.round(vol * 100);
                const localizedName = t.mixer.channels[ch.id as keyof typeof t.mixer.channels] || ch.id;

                return (
                  <div key={ch.id} className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-40 flex-shrink-0">
                        {ch.icon}
                        <span className="text-xs font-medium text-stone-200 truncate">{localizedName}</span>
                        {ch.isProOnly && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                      </div>

                      <div className="flex-1 flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={vol}
                          onChange={(e) => {
                            if (ch.isProOnly && !isPro) {
                              showToast(isTr ? 'Bu ses kanalı Cozy Room PRO üyelerine özeldir 👑' : 'This channel requires Cozy Room PRO 👑', 2500);
                              setActiveModal('subscription');
                              return;
                            }
                            webAudioEngine.init();
                            setChannelVolume(ch.id, parseFloat(e.target.value));
                          }}
                          className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                        />
                        <span className="text-xs font-mono font-semibold text-amber-300 w-10 text-right flex-shrink-0">
                          {percent}%
                        </span>
                      </div>
                    </div>

                    {/* Binaural Beats Frequency Mode Pill Selector */}
                    {ch.id === 'binaural' && vol > 0 && (
                      <div className="ml-6 pl-2 border-l-2 border-amber-500/40 flex items-center gap-1.5 flex-wrap pt-1 pb-1">
                        <span className="text-[10px] text-amber-400/90 font-bold uppercase tracking-wider mr-1">
                          {isTr ? 'Frekans Modu:' : 'Frequency:'}
                        </span>
                        {[
                          { id: 'gamma_40hz', label: isTr ? '⚡ 40Hz Gamma (Hiper Odak)' : '⚡ 40Hz Gamma (Hyper Focus)' },
                          { id: 'beta_14hz', label: isTr ? '🎯 14Hz Beta (Aktif Ders)' : '🎯 14Hz Beta (Active Study)' },
                          { id: 'alpha_10hz', label: isTr ? '🌊 10Hz Alpha (Akış/Okuma)' : '🌊 10Hz Alpha (Flow/Reading)' },
                          { id: 'theta_6hz', label: isTr ? '🌙 6Hz Theta (Derin Dinlenme)' : '🌙 6Hz Theta (Relaxation)' },
                        ].map((m) => (
                          <button
                            key={m.id}
                            onClick={() => {
                              webAudioEngine.init();
                              setBinauralMode(m.id as any);
                            }}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                              binauralMode === m.id
                                ? 'bg-amber-500/30 text-amber-200 border border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                                : 'bg-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800 border border-transparent'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-stone-800 text-center">
              <p className="text-xs text-stone-400">
                {t.mixer.proceduralNotice}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  Shuffle, 
  Repeat, 
  Radio, 
  ListMusic, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { useAppStore } from '../../store/useAppStore';
import { MUSIC_CATEGORIES } from '../../audio/musicTracks';
import { MusicCategory } from '../../types';
import { TRANSLATIONS } from '../../i18n/translations';
import { webAudioEngine } from '../../audio/WebAudioEngine';

export const MusicPlayerWidget: React.FC = () => {
  const {
    isPlayingMusic,
    togglePlayMusic,
    nextTrack,
    prevTrack,
    getCurrentTrack,
    musicVolume,
    setMusicVolume,
    currentTime,
    duration,
    isShuffle,
    toggleShuffle,
    isRepeat,
    toggleRepeat,
    selectedCategory,
    setCategory,
    getFilteredTracks,
    playTrack,
  } = useAudioStore();

  const { language } = useAppStore();
  const t = TRANSLATIONS[language];

  const [expanded, setExpanded] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const currentTrack = getCurrentTrack();
  const playlist = getFilteredTracks();

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleTogglePlay = () => {
    webAudioEngine.init();
    togglePlayMusic();
  };

  return (
    <div 
      className="absolute left-4 z-30 transition-all duration-300 pointer-events-auto"
      style={{ bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
    >
      <div className="glass-island text-stone-100 rounded-2xl shadow-2xl p-3 w-80 sm:w-96 border border-white/10">
        
        {/* Upper: Now Playing Info, Dancing Equalizer & Controls */}
        <div className="flex items-center gap-3">
          {/* Cassette / Disc Icon */}
          <button
            onClick={handleTogglePlay}
            className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-stone-900/80 border border-stone-700/80 hover:border-amber-500/80 transition-all cursor-pointer shadow-md ${
              isPlayingMusic ? 'text-amber-400 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]' : 'text-stone-400'
            }`}
            title={isPlayingMusic ? t.player.pause : t.player.play}
          >
            {isPlayingMusic ? (
              <Radio className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
            ) : (
              <Radio className="w-5 h-5" />
            )}
          </button>

          {/* Title, Artist & Live Dancing Waveform Equalizer */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-amber-100 truncate block leading-tight">
                {currentTrack.title}
              </span>

              {/* Dynamic Dancing Audio Spectrum Bars */}
              {isPlayingMusic && (
                <div className="flex items-end gap-[2.5px] h-3.5 shrink-0" title="Audio Spectrum">
                  <span className="w-[2.5px] bg-amber-400 rounded-full animate-eq-1" />
                  <span className="w-[2.5px] bg-amber-300 rounded-full animate-eq-2" />
                  <span className="w-[2.5px] bg-amber-400 rounded-full animate-eq-3" />
                  <span className="w-[2.5px] bg-amber-300 rounded-full animate-eq-4" />
                </div>
              )}
            </div>
            <span className="text-xs text-stone-400 font-medium truncate block mt-0.5">
              {currentTrack.artist}
            </span>
          </div>

          {/* Play / Next / Expander Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                webAudioEngine.init();
                prevTrack();
              }}
              className="p-1.5 text-stone-400 hover:text-stone-100 transition-colors cursor-pointer rounded-lg hover:bg-white/5"
              title={t.player.prev}
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={handleTogglePlay}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
              title={isPlayingMusic ? t.player.pause : t.player.play}
            >
              {isPlayingMusic ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => {
                webAudioEngine.init();
                nextTrack();
              }}
              className="p-1.5 text-stone-400 hover:text-stone-100 transition-colors cursor-pointer rounded-lg hover:bg-white/5"
              title={t.player.next}
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-stone-400 hover:text-amber-300 transition-colors cursor-pointer ml-0.5 rounded-lg hover:bg-white/5"
              title={expanded ? t.player.minimize : t.player.expand}
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Progress Line */}
        <div className="w-full bg-stone-800/80 h-1.5 rounded-full mt-2.5 overflow-hidden">
          <div 
            className="bg-amber-400 h-full transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Expanded Drawer: Categories, Volume, Shuffle, Playlist */}
        {expanded && (
          <div className="mt-3 pt-2.5 border-t border-stone-800 space-y-2.5 text-xs">
            {/* Scrubber & Time */}
            <div className="flex items-center justify-between text-xs text-stone-400 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration || currentTrack.duration)}</span>
            </div>

            {/* Volume slider & Toggles */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Volume2 className="w-4 h-4 text-stone-400 flex-shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-stone-700 rounded appearance-none cursor-pointer accent-amber-400"
                  title={t.player.volume}
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleShuffle}
                  className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                    isShuffle ? 'text-amber-400 bg-stone-800' : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title={t.player.shuffle}
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                <button
                  onClick={toggleRepeat}
                  className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                    isRepeat ? 'text-amber-400 bg-stone-800' : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title={t.player.repeat}
                >
                  <Repeat className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowPlaylist(!showPlaylist)}
                  className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                    showPlaylist ? 'text-amber-400 bg-stone-800' : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title={t.player.playlist}
                >
                  <ListMusic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Category Tags */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {MUSIC_CATEGORIES.map((cat) => {
                const localizedCat = t.player.categories[cat.id as keyof typeof t.player.categories] || cat.label;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id as MusicCategory)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-stone-800/80 text-stone-300 hover:text-stone-100 border border-transparent'
                    }`}
                  >
                    {localizedCat}
                  </button>
                );
              })}
            </div>

            {/* Playlist Drawer */}
            {showPlaylist && (
              <div className="max-h-40 overflow-y-auto space-y-1 pt-1 pr-1">
                {playlist.map((track, idx) => (
                  <button
                    key={track.id}
                    onClick={() => {
                      webAudioEngine.init();
                      playTrack(idx);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      currentTrack.id === track.id
                        ? 'bg-amber-950/40 text-amber-200 font-semibold'
                        : 'hover:bg-stone-800/80 text-stone-300'
                    }`}
                  >
                    <span className="truncate pr-2">{track.title}</span>
                    <span className="text-xs text-stone-500 font-mono flex-shrink-0">
                      {formatTime(track.duration)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

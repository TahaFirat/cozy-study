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
  ChevronUp,
  X,
  ExternalLink,
  Music2,
  Tv
} from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { useAppStore } from '../../store/useAppStore';
import { 
  MUSIC_CATEGORIES, 
  SPOTIFY_PLAYLISTS, 
  YOUTUBE_STREAMS,
  SpotifyPlaylist,
  YouTubeStream 
} from '../../audio/musicTracks';
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
  const isTr = language === 'tr';

  const [expanded, setExpanded] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  
  // Media Tabs: 'radio' | 'spotify' | 'youtube'
  const [mediaTab, setMediaTab] = useState<'radio' | 'spotify' | 'youtube'>('radio');
  const [selectedSpotify, setSelectedSpotify] = useState<SpotifyPlaylist>(SPOTIFY_PLAYLISTS[0]);
  const [selectedYouTube, setSelectedYouTube] = useState<YouTubeStream>(YOUTUBE_STREAMS[0]);

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

  // Content for the complete player card (reusable for desktop & mobile modal)
  const renderPlayerCardContent = (isMobileView = false) => (
    <div className="flex flex-col gap-2.5">
      {/* 1. Header with Source Tabs & Close Button */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-800">
        <div className="flex items-center gap-1 bg-stone-950/80 p-0.5 rounded-xl border border-stone-800">
          <button
            onClick={() => setMediaTab('radio')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              mediaTab === 'radio'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isTr ? '24/7 Radyo' : 'Radio'}</span>
          </button>

          <button
            onClick={() => setMediaTab('spotify')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              mediaTab === 'spotify'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Music2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Spotify</span>
          </button>

          <button
            onClick={() => setMediaTab('youtube')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              mediaTab === 'youtube'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5 text-red-400" />
            <span>YouTube</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {!isMobileView ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-stone-400 hover:text-amber-300 transition-colors cursor-pointer rounded-lg hover:bg-white/5"
              title={expanded ? t.player.minimize : t.player.expand}
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          ) : (
            <button
              onClick={() => setIsMobileModalOpen(false)}
              className="p-1.5 text-stone-400 hover:text-stone-100 transition-colors cursor-pointer rounded-lg hover:bg-white/5"
              title="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. TAB A: 24/7 LO-FI & CHILL RADIO */}
      {mediaTab === 'radio' && (
        <>
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
            </div>
          </div>

          {/* Progress / Live indicator */}
          <div className="w-full bg-stone-800/80 h-1.5 rounded-full mt-1 overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 rounded-full ${
                isPlayingMusic ? 'bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'bg-stone-700'
              }`}
              style={{ width: isPlayingMusic ? '100%' : '0%' }}
            />
          </div>

          {/* Expanded Section: Categories, Volume, Station List */}
          {(expanded || isMobileView) && (
            <div className="mt-2.5 pt-2.5 border-t border-stone-800 space-y-2.5 text-xs">
              {/* Volume slider & Toggles */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                  <Volume2 className="w-4 h-4 text-stone-400 shrink-0" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    title={t.player.volume}
                  />
                  <span className="text-[10px] font-mono text-stone-400 w-7">
                    {Math.round(musicVolume * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowPlaylist(!showPlaylist)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                      showPlaylist ? 'bg-amber-500/20 text-amber-300' : 'text-stone-400 hover:text-stone-100 hover:bg-white/5'
                    }`}
                    title={isTr ? 'İstasyon Listesi' : 'Station List'}
                  >
                    <ListMusic className="w-4 h-4" />
                    <span>{isTr ? 'İstasyonlar' : 'Stations'}</span>
                  </button>
                </div>
              </div>

              {/* Station Playlist List */}
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar pt-1">
                {playlist.map((track, idx) => {
                  const isCurrent = track.id === currentTrack.id;
                  return (
                    <button
                      key={track.id}
                      onClick={() => playTrack(idx)}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                          : 'hover:bg-stone-800/80 text-stone-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="w-4 text-center font-mono text-stone-500 text-[10px]">
                          {isCurrent && isPlayingMusic ? '▶' : idx + 1}
                        </span>
                        <div className="truncate">
                          <div className={`font-semibold truncate text-[11px] ${isCurrent ? 'text-amber-200 font-bold' : ''}`}>
                            {track.title}
                          </div>
                          <div className="text-[10px] text-stone-400 truncate">
                            {track.artist}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 font-mono shrink-0">
                        24/7 Live
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* 3. TAB B: SPOTIFY EMBED & QUICK CONNECT (Kept mounted off-screen when inactive so audio NEVER cuts off) */}
      <div className={mediaTab === 'spotify' ? 'space-y-3 pt-1 block' : 'fixed -left-[9999px] -top-[9999px] w-1 h-1 opacity-0 pointer-events-none'}>
        {/* Playlist selector chips */}
        <div className="flex flex-wrap gap-1.5">
          {SPOTIFY_PLAYLISTS.map((pl) => (
            <button
              key={pl.id}
              onClick={() => setSelectedSpotify(pl)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedSpotify.id === pl.id
                  ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/60 shadow-sm'
                  : 'bg-stone-800/60 text-stone-300 hover:bg-stone-700 hover:text-white border border-stone-700/50'
              }`}
            >
              <span>{pl.icon}</span>
              <span>{pl.title}</span>
            </button>
          ))}
        </div>

        {/* Official Spotify Embed Player */}
        <div className="rounded-xl overflow-hidden bg-black/40 border border-stone-800 shadow-inner">
          <iframe
            src={selectedSpotify.embedUrl}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title={selectedSpotify.title}
            className="w-full rounded-xl"
          />
        </div>

        {/* Quick Connect & Launch in Spotify app */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-[11px] text-stone-400">
            {isTr ? 'Spotify hesabınızla doğrudan dinleyin' : 'Play directly with your Spotify account'}
          </span>
          <a
            href={selectedSpotify.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-[#1DB954] hover:bg-[#1aa34a] text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <Music2 className="w-3.5 h-3.5" />
            <span>{isTr ? "Spotify'da Aç" : 'Open in Spotify'}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* 4. TAB C: YOUTUBE LO-FI LIVE STREAMS (Kept mounted off-screen when inactive so audio continues) */}
      <div className={mediaTab === 'youtube' ? 'space-y-3 pt-1 block' : 'fixed -left-[9999px] -top-[9999px] w-1 h-1 opacity-0 pointer-events-none'}>
        {/* Stream selector chips */}
        <div className="flex flex-wrap gap-1.5">
          {YOUTUBE_STREAMS.map((yt) => (
            <button
              key={yt.id}
              onClick={() => setSelectedYouTube(yt)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedYouTube.id === yt.id
                  ? 'bg-red-500/30 text-red-200 border border-red-500/60 shadow-sm'
                  : 'bg-stone-800/60 text-stone-300 hover:bg-stone-700 hover:text-white border border-stone-700/50'
              }`}
            >
              <span>{yt.icon}</span>
              <span>{yt.title}</span>
            </button>
          ))}
        </div>

        {/* Embedded YouTube Stream */}
        <div className="rounded-xl overflow-hidden aspect-video bg-black/60 border border-stone-800 shadow-inner">
          <iframe
            src={selectedYouTube.embedUrl}
            title={selectedYouTube.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Quick link to YouTube Music */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-[11px] text-stone-400">
            {isTr ? '24/7 Canlı Lo-Fi Odak Yayını' : '24/7 Live Lo-Fi Study Broadcast'}
          </span>
          <a
            href={selectedYouTube.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{isTr ? "YouTube'da Aç" : 'Watch on YouTube'}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. MOBILE & TABLET TRIGGER: Floating pill button */}
      <div 
        className="2xl:hidden absolute left-3 sm:left-4 z-30 transition-all duration-300 pointer-events-auto"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
      >
        <button
          onClick={() => setIsMobileModalOpen(true)}
          className={`flex items-center gap-2 p-2.5 sm:px-3 sm:py-2.5 glass-island text-stone-100 rounded-2xl shadow-2xl transition-all cursor-pointer ${
            mediaTab === 'spotify'
              ? 'border-emerald-500/70 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
              : mediaTab === 'youtube'
              ? 'border-red-500/70 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
              : isPlayingMusic 
              ? 'border-amber-500/70 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.25)]' 
              : 'border-white/10 hover:border-white/20'
          }`}
          title={
            mediaTab === 'spotify'
              ? `Spotify · ${selectedSpotify.title}`
              : mediaTab === 'youtube'
              ? `YouTube · ${selectedYouTube.title}`
              : isPlayingMusic ? `${t.player.pause} · ${currentTrack.title}` : t.player.play
          }
        >
          {mediaTab === 'spotify' ? (
            <>
              <Music2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-200 max-w-[130px] truncate">
                {selectedSpotify.title}
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/30 hidden xs:inline">
                Spotify
              </span>
            </>
          ) : mediaTab === 'youtube' ? (
            <>
              <Tv className="w-4 h-4 shrink-0 text-red-400" />
              <span className="text-xs font-bold text-red-200 max-w-[130px] truncate">
                {selectedYouTube.title}
              </span>
              <span className="text-[10px] bg-red-500/20 text-red-300 font-bold px-1.5 py-0.5 rounded-full border border-red-500/30 hidden xs:inline">
                YouTube
              </span>
            </>
          ) : (
            <>
              <Radio 
                className={`w-4 h-4 shrink-0 ${isPlayingMusic ? 'animate-spin text-amber-400' : 'text-stone-400'}`} 
                style={isPlayingMusic ? { animationDuration: '4s' } : undefined} 
              />
              <span className="text-xs font-bold text-amber-100 max-w-[120px] truncate hidden sm:inline">
                {currentTrack.title}
              </span>
              {isPlayingMusic && (
                <div className="flex items-end gap-[1.5px] h-2.5 shrink-0">
                  <span className="w-[2px] bg-amber-400 rounded-full animate-eq-1" />
                  <span className="w-[2px] bg-amber-300 rounded-full animate-eq-2" />
                  <span className="w-[2px] bg-amber-400 rounded-full animate-eq-3" />
                </div>
              )}
            </>
          )}
        </button>
      </div>

      {/* 2. MOBILE & TABLET MODAL / BOTTOM SHEET (Kept mounted in DOM so Spotify/YouTube audio keeps playing after closing) */}
      <div 
        onClick={() => setIsMobileModalOpen(false)}
        className={`2xl:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm transition-all duration-200 pointer-events-auto ${
          isMobileModalOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          className="bg-stone-900/98 text-stone-100 border border-stone-800 rounded-2xl shadow-2xl p-4 w-full max-w-lg max-h-[88vh] flex flex-col overflow-y-auto"
        >
          {renderPlayerCardContent(true)}
        </div>
      </div>

      {/* 3. DESKTOP PERSISTENT CARD (Screens >= 1536px) */}
      <div 
        className="hidden 2xl:block absolute left-4 z-30 transition-all duration-300 pointer-events-auto"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
      >
        <div className="glass-island text-stone-100 rounded-2xl shadow-2xl p-3 w-80 sm:w-96 border border-white/10">
          {renderPlayerCardContent(false)}
        </div>
      </div>
    </>
  );
};

export default MusicPlayerWidget;

import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp,
  X,
  ExternalLink,
  Music2,
  Tv
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { 
  SPOTIFY_PLAYLISTS, 
  YOUTUBE_STREAMS,
  SpotifyPlaylist,
  YouTubeStream 
} from '../../audio/musicTracks';
import { TRANSLATIONS } from '../../i18n/translations';

export const MusicPlayerWidget: React.FC = () => {
  const { language } = useAppStore();
  const t = TRANSLATIONS[language];
  const isTr = language === 'tr';

  const [expanded, setExpanded] = useState(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  
  // Media Tabs: 'spotify' | 'youtube' (High-fidelity, reliable mobile-compatible audio)
  const [mediaTab, setMediaTab] = useState<'spotify' | 'youtube'>('spotify');
  const [selectedSpotify, setSelectedSpotify] = useState<SpotifyPlaylist>(SPOTIFY_PLAYLISTS[0]);
  const [selectedYouTube, setSelectedYouTube] = useState<YouTubeStream>(YOUTUBE_STREAMS[0]);


  // Content for the complete player card (reusable for desktop & mobile modal)
  const renderPlayerCardContent = (isMobileView = false) => (
    <div className="flex flex-col gap-2.5">
      {/* 1. Header with Source Tabs & Close Button */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-800">
        <div className="flex items-center gap-1 bg-stone-950/80 p-0.5 rounded-xl border border-stone-800">
          <button
            onClick={() => setMediaTab('spotify')}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
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
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              mediaTab === 'youtube'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5 text-red-400" />
            <span>YouTube Live</span>
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
              title={isTr ? 'Kapat' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

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
        className="mobile-music-trigger 2xl:hidden absolute left-3 sm:left-4 z-30 transition-all duration-300 pointer-events-auto"
        style={{ bottom: 'max(1.75rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))' }}
      >
        <button
          onClick={() => setIsMobileModalOpen(true)}
          className={`flex items-center gap-2 p-2.5 sm:px-3 sm:py-2.5 glass-island text-stone-100 rounded-2xl shadow-2xl transition-all cursor-pointer ${
            mediaTab === 'spotify'
              ? 'border-emerald-500/70 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
              : 'border-red-500/70 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
          }`}
          title={
            mediaTab === 'spotify'
              ? `Spotify · ${selectedSpotify.title}`
              : `YouTube · ${selectedYouTube.title}`
          }
        >
          {mediaTab === 'spotify' ? (
            <>
              <Music2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="mobile-widget-label hidden lg:inline text-xs font-bold text-emerald-200 max-w-[130px] truncate">
                {selectedSpotify.title}
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/30 hidden xs:inline">
                Spotify
              </span>
            </>
          ) : (
            <>
              <Tv className="w-4 h-4 shrink-0 text-red-400" />
              <span className="mobile-widget-label hidden lg:inline text-xs font-bold text-red-200 max-w-[130px] truncate">
                {selectedYouTube.title}
              </span>
              <span className="text-[10px] bg-red-500/20 text-red-300 font-bold px-1.5 py-0.5 rounded-full border border-red-500/30 hidden xs:inline">
                YouTube
              </span>
            </>
          )}
        </button>
      </div>

      {/* 2. MOBILE & TABLET MODAL / BOTTOM SHEET (Kept mounted in DOM so Spotify/YouTube audio keeps playing after closing) */}
      <div 
        onClick={() => setIsMobileModalOpen(false)}
        className={`app-modal-overlay 2xl:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm transition-all duration-300 pointer-events-auto ${
          isMobileModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none translate-y-full'
        }`}
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          className="bg-stone-900/98 text-stone-100 border border-stone-800 rounded-2xl shadow-2xl p-4 w-full max-w-lg max-h-[88dvh] flex flex-col overflow-y-auto"
        >
          {renderPlayerCardContent(true)}
        </div>
      </div>

      {/* 3. DESKTOP PERSISTENT CARD (Screens >= 1536px) */}
      <div 
        className="hidden 2xl:block absolute left-4 z-30 transition-all duration-300 pointer-events-auto"
        style={{ bottom: 'max(1.75rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))' }}
      >
        <div className="glass-island text-stone-100 rounded-2xl shadow-2xl p-3 w-80 sm:w-96 border border-white/10">
          {renderPlayerCardContent(false)}
        </div>
      </div>
    </>
  );
};

export default MusicPlayerWidget;

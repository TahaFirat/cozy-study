import { MusicCategory, MusicTrack } from '../types';

export interface SpotifyPlaylist {
  id: string;
  title: string;
  subtitle: string;
  embedUrl: string;
  appUrl: string;
  webUrl: string;
  icon: string;
}

export interface YouTubeStream {
  id: string;
  title: string;
  subtitle: string;
  embedUrl: string;
  webUrl: string;
  icon: string;
}

export const SPOTIFY_PLAYLISTS: SpotifyPlaylist[] = [
  {
    id: 'lofi-beats',
    title: 'Lofi Beats',
    subtitle: 'Dünyanın 1 Numaralı Odaklanma Çalma Listesi',
    embedUrl: 'https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM?utm_source=generator&theme=0',
    appUrl: 'spotify:playlist:0vvXsWCC9xrXsKd4FyS8kM',
    webUrl: 'https://open.spotify.com/playlist/0vvXsWCC9xrXsKd4FyS8kM',
    icon: '☕',
  },
  {
    id: 'deep-focus',
    title: 'Deep Focus',
    subtitle: 'Derin Çalışma & Zihinsel Akış (Flow State)',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0',
    appUrl: 'spotify:playlist:37i9dQZF1DWZeKCadgRdKQ',
    webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ',
    icon: '🧠',
  },
  {
    id: 'peaceful-piano',
    title: 'Peaceful Piano',
    subtitle: 'Dingin & Sakinleştirici Akustik Piyano',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO?utm_source=generator&theme=0',
    appUrl: 'spotify:playlist:37i9dQZF1DX4sWSpwq3LiO',
    webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO',
    icon: '🎹',
  },
  {
    id: 'chill-study',
    title: 'Chill Lofi Study',
    subtitle: 'Ders & Kodlama İçin Yumuşak Ritimler',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS?utm_source=generator&theme=0',
    appUrl: 'spotify:playlist:37i9dQZF1DX8Uebhn9wzrS',
    webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS',
    icon: '📚',
  },
  {
    id: 'synthwave-chill',
    title: 'Synthwave / Retro Focus',
    subtitle: 'Siberpunk & Gece Çalışmaları',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXdLEN7aqioXM?utm_source=generator&theme=0',
    appUrl: 'spotify:playlist:37i9dQZF1DXdLEN7aqioXM',
    webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXdLEN7aqioXM',
    icon: '🌆',
  },
];

export const YOUTUBE_STREAMS: YouTubeStream[] = [
  {
    id: 'lofi-girl',
    title: 'Lofi Girl Live',
    subtitle: 'beats to relax/study to (24/7 Canlı Yayın)',
    embedUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&enablejsapi=1',
    webUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    icon: '👧',
  },
  {
    id: 'chillhop-radio',
    title: 'Chillhop Radio',
    subtitle: 'Jazzy & Lofi Hip Hop Beats (24/7 Canlı)',
    embedUrl: 'https://www.youtube.com/embed/5yx6BWlEVcY?autoplay=1&enablejsapi=1',
    webUrl: 'https://www.youtube.com/watch?v=5yx6BWlEVcY',
    icon: '🦝',
  },
  {
    id: 'synthwave-radio',
    title: 'Synthwave Radio Live',
    subtitle: 'ChillSynth & Retrowave 24/7 Focus',
    embedUrl: 'https://www.youtube.com/embed/4xDzrJKXOOY?autoplay=1&enablejsapi=1',
    webUrl: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    icon: '👾',
  },
];

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'station-groove-salad',
    title: 'Groove Salad (Chill & Lo-Fi)',
    artist: 'SomaFM 24/7 Live Stream (San Francisco)',
    category: 'lofi',
    url: 'https://ice2.somafm.com/groovesalad-128-mp3',
    duration: 3600,
  },
  {
    id: 'station-lush',
    title: 'Lush (Mellow Study & Ambient)',
    artist: 'SomaFM 24/7 Live Stream (Sensuous Chill)',
    category: 'chillhop',
    url: 'https://ice2.somafm.com/lush-128-mp3',
    duration: 3600,
  },
  {
    id: 'station-secret-agent',
    title: 'Secret Agent (Vintage Lounge & Jazz)',
    artist: 'SomaFM 24/7 Live Stream (Jazzhop & Soul)',
    category: 'jazzhop',
    url: 'https://ice2.somafm.com/secretagent-128-mp3',
    duration: 3600,
  },
  {
    id: 'station-dronezone',
    title: 'Drone Zone (Deep Focus & Space)',
    artist: 'SomaFM 24/7 Live Stream (Hyper Concentration)',
    category: 'deep_focus',
    url: 'https://ice2.somafm.com/dronezone-128-mp3',
    duration: 3600,
  },
  {
    id: 'station-defcon',
    title: 'DEF CON Radio (Cyber & Retro)',
    artist: 'SomaFM 24/7 Live Stream (Coding & Hacker Vibe)',
    category: 'night',
    url: 'https://ice2.somafm.com/defcon-128-mp3',
    duration: 3600,
  },
  {
    id: 'station-suburbs-of-goa',
    title: 'Suburbs of Goa (Asian Zen & Beats)',
    artist: 'SomaFM 24/7 Live Stream (Eastern Calm)',
    category: 'chillhop',
    url: 'https://ice2.somafm.com/suburbsofgoa-128-mp3',
    duration: 3600,
  },
  {
    id: 'station-beat-blender',
    title: 'Beat Blender (Deep House Flow)',
    artist: 'SomaFM 24/7 Live Stream (Rhythmic Study)',
    category: 'study',
    url: 'https://ice2.somafm.com/beatblender-128-mp3',
    duration: 3600,
  },
  {
    id: 'track-generative',
    title: 'Endless Lo-Fi Radio (Vinyl Chords)',
    artist: 'WebAudio Procedural Synth (Offline Ready)',
    category: 'lofi',
    url: 'generative',
    duration: 3600,
  },
];

export const MUSIC_CATEGORIES: { id: MusicCategory; label: string }[] = [
  { id: 'all', label: 'Tüm Radyolar' },
  { id: 'lofi', label: 'Lo-Fi Chill' },
  { id: 'chillhop', label: 'Mellow & Zen' },
  { id: 'jazzhop', label: 'Vintage Lounge' },
  { id: 'deep_focus', label: 'Derin Odak' },
  { id: 'night', label: 'Siberpunk' },
  { id: 'study', label: 'Ritmik Çalışma' },
];

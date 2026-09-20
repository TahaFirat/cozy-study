import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AmbientSoundChannel, MusicCategory, MusicTrack } from '../types';
import { AMBIENT_PRESETS, DEFAULT_AMBIENT_VOLUMES } from '../audio/soundPresets';
import { MUSIC_TRACKS } from '../audio/musicTracks';
import { webAudioEngine } from '../audio/WebAudioEngine';

interface AudioState {
  masterVolume: number;
  isMuted: boolean;
  
  // Ambient Sound
  ambientVolumes: Record<AmbientSoundChannel, number>;
  activePresetId: string | null;
  binauralMode: 'gamma_40hz' | 'beta_14hz' | 'alpha_10hz' | 'theta_6hz';

  // Music Player
  musicVolume: number;
  isPlayingMusic: boolean;
  currentTrackIndex: number;
  selectedCategory: MusicCategory;
  isShuffle: boolean;
  isRepeat: boolean;
  currentTime: number;
  duration: number;

  // Actions
  setMasterVolume: (vol: number) => void;
  toggleMute: () => void;
  setChannelVolume: (channel: AmbientSoundChannel, vol: number) => void;
  setBinauralMode: (mode: 'gamma_40hz' | 'beta_14hz' | 'alpha_10hz' | 'theta_6hz') => void;
  applyPreset: (presetId: string) => void;
  applyRoomVolumes: (volumes: Partial<Record<AmbientSoundChannel, number>>, weather?: string) => void;
  resetAmbient: () => void;

  setMusicVolume: (vol: number) => void;
  togglePlayMusic: () => void;
  playTrack: (index: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setCategory: (category: MusicCategory) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  getCurrentTrack: () => MusicTrack;
  getFilteredTracks: () => MusicTrack[];
}

let audioPlayer: HTMLAudioElement | null = null;

function getAudioElement(): HTMLAudioElement {
  if (!audioPlayer) {
    audioPlayer = new Audio();
    audioPlayer.preload = 'metadata';
    audioPlayer.crossOrigin = 'anonymous';

    audioPlayer.addEventListener('ended', () => {
      const store = useAudioStore.getState();
      if (store.isRepeat) {
        audioPlayer?.play().catch(console.warn);
      } else {
        store.nextTrack();
      }
    });

    audioPlayer.addEventListener('timeupdate', () => {
      if (audioPlayer) {
        useAudioStore.getState().setCurrentTime(audioPlayer.currentTime);
      }
    });

    audioPlayer.addEventListener('loadedmetadata', () => {
      if (audioPlayer) {
        useAudioStore.getState().setDuration(audioPlayer.duration || 0);
      }
    });

    audioPlayer.addEventListener('error', (e) => {
      console.warn('Audio stream playback note:', e);
    });
  }
  return audioPlayer;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      masterVolume: 0.8,
      isMuted: false,

      ambientVolumes: { ...DEFAULT_AMBIENT_VOLUMES },
      activePresetId: 'rainy_study',
      binauralMode: 'gamma_40hz',

      musicVolume: 0.6,
      isPlayingMusic: false,
      currentTrackIndex: 0,
      selectedCategory: 'all',
      isShuffle: false,
      isRepeat: false,
      currentTime: 0,
      duration: 0,

      setMasterVolume: (masterVolume) => {
        set({ masterVolume });
        webAudioEngine.setMasterVolume(get().isMuted ? 0 : masterVolume);
        const player = getAudioElement();
        player.volume = get().isMuted ? 0 : masterVolume * get().musicVolume;
      },

      toggleMute: () => {
        const isMuted = !get().isMuted;
        set({ isMuted });
        const masterVolume = get().masterVolume;
        webAudioEngine.setMasterVolume(isMuted ? 0 : masterVolume);
        const player = getAudioElement();
        const effectiveVol = isMuted ? 0 : masterVolume * get().musicVolume;
        player.volume = effectiveVol;
        webAudioEngine.setGenerativeLofiVolume(effectiveVol);
      },

      setChannelVolume: (channel, vol) => {
        const ambientVolumes = { ...get().ambientVolumes, [channel]: vol };
        set({ ambientVolumes, activePresetId: null });
        webAudioEngine.setChannelVolume(channel, vol);
      },

      setBinauralMode: (binauralMode) => {
        set({ binauralMode });
        webAudioEngine.setBinauralMode(binauralMode);
      },

      applyPreset: (presetId) => {
        const preset = AMBIENT_PRESETS.find((p) => p.id === presetId);
        if (preset) {
          const merged = { ...DEFAULT_AMBIENT_VOLUMES, ...preset.volumes };
          set({ ambientVolumes: merged, activePresetId: presetId });
          webAudioEngine.setAllChannelVolumes(merged);
        }
      },

      applyRoomVolumes: (volumes, weather) => {
        const merged = { ...DEFAULT_AMBIENT_VOLUMES, ...volumes };
        if (weather === 'snow' || weather === 'clear') {
          merged.rain = 0;
          merged.thunder = 0;
        }
        set({ ambientVolumes: merged, activePresetId: null });
        webAudioEngine.setAllChannelVolumes(merged);
      },

      resetAmbient: () => {
        set({ ambientVolumes: { ...DEFAULT_AMBIENT_VOLUMES }, activePresetId: null });
        webAudioEngine.setAllChannelVolumes(DEFAULT_AMBIENT_VOLUMES);
      },

      setMusicVolume: (musicVolume) => {
        set({ musicVolume });
        const effectiveVol = get().isMuted ? 0 : get().masterVolume * musicVolume;
        const player = getAudioElement();
        player.volume = effectiveVol;
        webAudioEngine.setGenerativeLofiVolume(effectiveVol);
      },

      togglePlayMusic: () => {
        const player = getAudioElement();
        const currentlyPlaying = get().isPlayingMusic;
        const effectiveVol = get().isMuted ? 0 : get().masterVolume * get().musicVolume;

        if (currentlyPlaying) {
          player.pause();
          webAudioEngine.stopGenerativeLofi();
          set({ isPlayingMusic: false });
        } else {
          webAudioEngine.init();
          const track = get().getCurrentTrack();
          if (track.url === 'generative') {
            player.pause();
            webAudioEngine.startGenerativeLofi(effectiveVol);
            set({ isPlayingMusic: true });
          } else {
            webAudioEngine.stopGenerativeLofi();
            if (player.src !== track.url) {
              player.src = track.url;
              player.load();
            }
            player.volume = effectiveVol;
            player.play()
              .then(() => set({ isPlayingMusic: true }))
              .catch((err) => {
                console.warn('Network track unavailable, switching to procedural Lo-Fi beats:', err);
                webAudioEngine.startGenerativeLofi(effectiveVol);
                set({ isPlayingMusic: true });
              });
          }
        }
      },

      playTrack: (index) => {
        const filtered = get().getFilteredTracks();
        if (index >= 0 && index < filtered.length) {
          const track = filtered[index];
          // Find original index
          const originalIdx = MUSIC_TRACKS.findIndex((t) => t.id === track.id);
          set({ currentTrackIndex: originalIdx >= 0 ? originalIdx : index, isPlayingMusic: true });
          
          webAudioEngine.init();
          const effectiveVol = get().isMuted ? 0 : get().masterVolume * get().musicVolume;
          const player = getAudioElement();
          if (track.url === 'generative') {
            player.pause();
            webAudioEngine.startGenerativeLofi(effectiveVol);
          } else {
            webAudioEngine.stopGenerativeLofi();
            player.src = track.url;
            player.load();
            player.volume = effectiveVol;
            player.play().catch((err) => {
              console.warn('Track playback failed, switching to procedural Lo-Fi:', err);
              webAudioEngine.startGenerativeLofi(effectiveVol);
            });
          }
        }
      },

      nextTrack: () => {
        const filtered = get().getFilteredTracks();
        if (filtered.length === 0) return;

        let nextIdx = 0;
        if (get().isShuffle) {
          nextIdx = Math.floor(Math.random() * filtered.length);
        } else {
          const currentTrack = get().getCurrentTrack();
          const currentFilterIdx = filtered.findIndex((t) => t.id === currentTrack.id);
          nextIdx = (currentFilterIdx + 1) % filtered.length;
        }
        get().playTrack(nextIdx);
      },

      prevTrack: () => {
        const filtered = get().getFilteredTracks();
        if (filtered.length === 0) return;

        const currentTrack = get().getCurrentTrack();
        const currentFilterIdx = filtered.findIndex((t) => t.id === currentTrack.id);
        const prevIdx = (currentFilterIdx - 1 + filtered.length) % filtered.length;
        get().playTrack(prevIdx);
      },

      setCategory: (selectedCategory) => {
        set({ selectedCategory });
      },

      toggleShuffle: () => set((s) => ({ isShuffle: !s.isShuffle })),
      toggleRepeat: () => set((s) => ({ isRepeat: !s.isRepeat })),
      setCurrentTime: (currentTime) => set({ currentTime }),
      setDuration: (duration) => set({ duration }),

      getCurrentTrack: () => {
        const idx = get().currentTrackIndex;
        return MUSIC_TRACKS[idx] || MUSIC_TRACKS[0];
      },

      getFilteredTracks: () => {
        const cat = get().selectedCategory;
        if (cat === 'all') return MUSIC_TRACKS;
        return MUSIC_TRACKS.filter((t) => t.category === cat);
      },
    }),
    {
      name: 'cozy_room_audio_settings',
      partialize: (state) => ({
        masterVolume: state.masterVolume,
        ambientVolumes: state.ambientVolumes,
        musicVolume: state.musicVolume,
        activePresetId: state.activePresetId,
        selectedCategory: state.selectedCategory,
        isShuffle: state.isShuffle,
        isRepeat: state.isRepeat,
      }),
    }
  )
);

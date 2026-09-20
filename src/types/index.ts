export type TimeOfDay = 'morning' | 'afternoon' | 'golden_hour' | 'evening' | 'midnight';

export type WeatherType = 'clear' | 'rain' | 'heavy_rain' | 'snow' | 'storm';

export type RoomId = 'bedroom' | 'apartment' | 'cabin' | 'library' | 'cafe' | 'kyoto_zen' | 'cyberpunk_loft';

export interface RoomDefinition {
  id: RoomId;
  name: string;
  subtitle: string;
  description: string;
  themeColor: string;
  defaultTimeOfDay: TimeOfDay;
  defaultWeather: WeatherType;
  defaultAmbient: Partial<Record<AmbientSoundChannel, number>>;
  isProOnly?: boolean;
}

export type PetState = 
  | 'sleeping' 
  | 'breathing' 
  | 'stretching' 
  | 'window_watching' 
  | 'fire_curled' 
  | 'grooming' 
  | 'alert';

export type InteractiveObjectId = 
  | 'lamp' 
  | 'mug' 
  | 'fireplace' 
  | 'radio' 
  | 'clock' 
  | 'notebook' 
  | 'cat' 
  | 'window' 
  | 'plant' 
  | 'bookshelf'
  | 'chair'
  | 'globe'
  | 'sticky_note'
  | 'boss_trophy';

export interface InteractiveHitbox {
  id: InteractiveObjectId;
  name: string;
  hint: string;
  x: number;      // normalized 0..1 or canvas coordinate
  y: number;
  width: number;
  height: number;
}

export type AmbientSoundChannel = 
  | 'rain' 
  | 'fireplace' 
  | 'vinyl' 
  | 'keyboard' 
  | 'wind' 
  | 'thunder' 
  | 'cafe' 
  | 'forest' 
  | 'insects' 
  | 'clock' 
  | 'roomTone'
  | 'binaural'
  | 'catPurr'
  | 'train'
  | 'bookPages'
  | 'whiteNoise'
  | 'pinkNoise'
  | 'brownNoise'
  | 'windChimes'
  | 'typewriter';

export interface AmbientPreset {
  id: string;
  name: string;
  description: string;
  volumes: Record<AmbientSoundChannel, number>;
}

export type MusicCategory = 
  | 'all' 
  | 'lofi' 
  | 'jazzhop' 
  | 'chillhop' 
  | 'piano' 
  | 'night' 
  | 'rainy' 
  | 'study' 
  | 'deep_focus';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  category: MusicCategory;
  url: string;
  duration: number; // in seconds
  bpm?: number;
}

export type TimerState = 'idle' | 'running' | 'paused' | 'completed';

export interface FocusSession {
  id: string;
  timestamp: number;
  durationMinutes: number;
  roomId: RoomId;
  note?: string;
  tag?: string;
}

export interface ProgressionItem {
  id: string;
  hoursRequired: number;
  title: string;
  description: string;
  rewardType: 'plant' | 'books' | 'desk' | 'posters' | 'fireplace' | 'pet' | 'secret';
  unlocked: boolean;
}

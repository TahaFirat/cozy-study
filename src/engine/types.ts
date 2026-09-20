import { TimeOfDay, WeatherType, RoomId, InteractiveObjectId } from '../types';

export interface SceneContext {
  width: number;
  height: number;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  roomId: RoomId;
  lampOn: boolean;
  mugHot: boolean;
  fireplaceActive: boolean;
  reduceMotion: boolean;
  inFocusSession: boolean;
  focusProgress: number; // 0..1
  progressionHours: number;
  hoveredObject: InteractiveObjectId | null;
  isPlayingMusic?: boolean;
  currentGoal?: string;
  unlockedTrophies?: string[];
}

export interface Hotspot {
  id: InteractiveObjectId;
  name: string;
  hint: string;
  nameTr?: string;
  hintTr?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

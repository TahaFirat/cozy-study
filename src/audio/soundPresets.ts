import { AmbientPreset, AmbientSoundChannel, RoomDefinition, RoomId } from '../types';

export const DEFAULT_AMBIENT_VOLUMES: Record<AmbientSoundChannel, number> = {
  rain: 0,
  fireplace: 0,
  vinyl: 0,
  keyboard: 0,
  wind: 0,
  thunder: 0,
  cafe: 0,
  forest: 0,
  insects: 0,
  clock: 0,
  roomTone: 0.15,
  binaural: 0,
  catPurr: 0,
  train: 0,
  bookPages: 0,
  whiteNoise: 0,
  pinkNoise: 0,
  brownNoise: 0,
  windChimes: 0,
  typewriter: 0,
};

export const AMBIENT_PRESETS: AmbientPreset[] = [
  {
    id: 'rainy_study',
    name: 'Rainy Study',
    description: 'Soft raindrops on glass, distant thunder rumble, and crackling vinyl.',
    volumes: {
      ...DEFAULT_AMBIENT_VOLUMES,
      rain: 0.65,
      fireplace: 0.25,
      vinyl: 0.2,
      keyboard: 0.15,
      thunder: 0.1,
      clock: 0.1,
      roomTone: 0.15,
    },
  },
  {
    id: 'binaural_deep_focus',
    name: '⚡ Binaural 40Hz Gamma Flow (PRO)',
    description: 'Scientifically calibrated 40Hz focus wave, mechanical keys, and calming room tone.',
    volumes: {
      ...DEFAULT_AMBIENT_VOLUMES,
      binaural: 0.55,
      roomTone: 0.35,
      keyboard: 0.25,
      clock: 0.1,
    },
  },
  {
    id: 'rainy_cat_cafe',
    name: '☕ Rainy Cat Sanctuary (PRO)',
    description: 'Gentle feline purring, soft cafe murmurs, window rain, and warm crackles.',
    volumes: {
      ...DEFAULT_AMBIENT_VOLUMES,
      catPurr: 0.65,
      rain: 0.5,
      cafe: 0.35,
      vinyl: 0.2,
      roomTone: 0.15,
    },
  },
  {
    id: 'gothic_midnight_study',
    name: '📜 Midnight Archive (PRO)',
    description: 'Old paper page rustles, gothic hearth fire, pendulum clock, and distant storm.',
    volumes: {
      ...DEFAULT_AMBIENT_VOLUMES,
      bookPages: 0.5,
      fireplace: 0.65,
      clock: 0.25,
      wind: 0.2,
      thunder: 0.15,
      roomTone: 0.2,
    },
  },
  {
    id: 'night_train_journey',
    name: '🚂 Midnight Alpine Express (PRO)',
    description: 'Rhythmic rail clicks, mountain wind gusts, night rain, and soothing brown noise.',
    volumes: {
      ...DEFAULT_AMBIENT_VOLUMES,
      train: 0.6,
      wind: 0.35,
      rain: 0.3,
      roomTone: 0.25,
    },
  },
  {
    id: 'warm_fireplace',
    name: 'Warm Hearth',
    description: 'Gentle wood pops, warm glowing hearth, and soothing room presence.',
    volumes: {
      ...DEFAULT_AMBIENT_VOLUMES,
      fireplace: 0.85,
      vinyl: 0.2,
      wind: 0.15,
      clock: 0.1,
      roomTone: 0.2,
    },
  },
  {
    id: 'late_night',
    name: 'Late Night Focus',
    description: 'Chirping crickets, deep midnight atmosphere, and steady clock ticks.',
    volumes: {
      ...DEFAULT_AMBIENT_VOLUMES,
      insects: 0.45,
      vinyl: 0.25,
      clock: 0.2,
      roomTone: 0.3,
      keyboard: 0.15,
    },
  },
  {
    id: 'cafe_vibes',
    name: 'Lo-Fi Cafe',
    description: 'Subtle bustling murmur, clinking cups, and rhythmic keyboard keystrokes.',
    volumes: {
      ...DEFAULT_AMBIENT_VOLUMES,
      cafe: 0.6,
      keyboard: 0.35,
      vinyl: 0.25,
      rain: 0.15,
      roomTone: 0.15,
    },
  },
  {
    id: 'winter_cabin',
    name: 'Snowy Cabin',
    description: 'Howling mountain breeze, roaring timber fire, and isolated tranquility.',
    volumes: {
      ...DEFAULT_AMBIENT_VOLUMES,
      wind: 0.6,
      fireplace: 0.8,
      vinyl: 0.15,
      roomTone: 0.2,
    },
  },
  {
    id: 'deep_focus',
    name: 'Deep Silence',
    description: 'Hypnotic brown noise room tone, subtle analog clock, and mechanical keys.',
    volumes: {
      ...DEFAULT_AMBIENT_VOLUMES,
      roomTone: 0.45,
      keyboard: 0.3,
      clock: 0.15,
    },
  },
];

export const ROOMS: RoomDefinition[] = [
  {
    id: 'bedroom',
    name: 'Cozy Bedroom & Study',
    subtitle: 'Warm lamplight, rain against the pane, and an afternoon cat nap',
    description: 'A personal sanctuary filled with wooden bookshelves, a brick fireplace, your favorite mug, and a sleeping feline friend.',
    themeColor: '#e0a96d',
    defaultTimeOfDay: 'evening',
    defaultWeather: 'rain',
    defaultAmbient: {
      rain: 0.45,
      fireplace: 0.4,
      vinyl: 0.2,
      roomTone: 0.15,
    }
  },
  {
    id: 'apartment',
    name: 'Tokyo Rainy Apartment',
    subtitle: 'Neon window reflections, city mist, and calm focus',
    description: 'High above the quiet side streets, surrounded by indoor ferns and mist condensating on the tall picture window.',
    themeColor: '#7aa2f7',
    defaultTimeOfDay: 'midnight',
    defaultWeather: 'heavy_rain',
    defaultAmbient: {
      rain: 0.7,
      thunder: 0.2,
      roomTone: 0.25,
      keyboard: 0.2,
    }
  },
  {
    id: 'cabin',
    name: 'Pine Mountain Cabin',
    subtitle: 'Timber logs, roaring stone hearth, and cedar trees',
    description: 'A secluded mountain hideaway surrounded by heavy pine snow, with a wood-burning stove and rustic oak desk.',
    themeColor: '#e07a5f',
    defaultTimeOfDay: 'golden_hour',
    defaultWeather: 'snow',
    defaultAmbient: {
      wind: 0.45,
      fireplace: 0.75,
      roomTone: 0.2,
    }
  },
  {
    id: 'library',
    name: 'Antique Grand Library',
    subtitle: 'Centuries of leather tomes, arched windows, and brass lamps',
    description: 'Tall mahogany shelves reaching toward vaulted ceilings, soft dust motes, and quiet scholarly reverence.',
    themeColor: '#c5a880',
    defaultTimeOfDay: 'afternoon',
    defaultWeather: 'clear',
    defaultAmbient: {
      clock: 0.35,
      vinyl: 0.15,
      roomTone: 0.3,
      keyboard: 0.1,
    }
  },
  {
    id: 'cafe',
    name: 'Midnight Jazz Cafe',
    subtitle: 'Espresso steam, corner booth, and rainy cobblestones outside',
    description: 'Tucked in a warm corner booth with warm Edison bulbs, a glowing chalkboard menu, and late night jazz vibes.',
    themeColor: '#d4a373',
    defaultTimeOfDay: 'evening',
    defaultWeather: 'rain',
    defaultAmbient: {
      cafe: 0.5,
      rain: 0.3,
      vinyl: 0.3,
      roomTone: 0.15,
    }
  },
  {
    id: 'kyoto_zen',
    name: 'Kyoto Zen Tea Room',
    subtitle: 'Misty bamboo garden, paper lanterns, and tranquil focus',
    description: 'Traditional tatami study with an open shoji door to a rain-swept rock garden and steaming matcha.',
    themeColor: '#84cc16',
    defaultTimeOfDay: 'afternoon',
    defaultWeather: 'rain',
    isProOnly: true,
    defaultAmbient: {
      rain: 0.5,
      roomTone: 0.2,
      catPurr: 0.3,
      binaural: 0.25,
    }
  },
  {
    id: 'cyberpunk_loft',
    name: 'Neo-Tokyo Cyberpunk Loft',
    subtitle: 'Neon rain vista, holographic monitors, and cyber lo-fi',
    description: 'High-rise studio overlooking towering neon spires in the rain, mechanical keyboard clicks, and nocturnal energy.',
    themeColor: '#a855f7',
    defaultTimeOfDay: 'midnight',
    defaultWeather: 'heavy_rain',
    isProOnly: true,
    defaultAmbient: {
      rain: 0.65,
      thunder: 0.25,
      keyboard: 0.45,
      binaural: 0.35,
    }
  }
];

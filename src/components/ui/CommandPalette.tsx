import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Home, 
  Play, 
  Pause, 
  CloudRain, 
  Sun, 
  Volume2, 
  CheckSquare, 
  BarChart2, 
  BookOpen, 
  Settings, 
  Crown,
  Sparkles,
  Flame,
  Lightbulb,
  Maximize,
  HelpCircle,
  Clock
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTimerStore } from '../../store/useTimerStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { RoomId, WeatherType, TimeOfDay } from '../../types';

interface CommandPaletteProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenSubscription?: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onOpenSubscription }) => {
  const { 
    activeModal,
    setActiveModal,
    setActiveRoom, 
    setTimeOfDay, 
    setWeather, 
    toggleLamp, 
    toggleFireplace, 
    toggleImmersiveMode, 
    toggleFullscreen, 
    showToast,
    language
  } = useAppStore();

  const isPaletteOpen = isOpen !== undefined ? isOpen : activeModal === 'command_palette';
  const handleClose = onClose || (() => setActiveModal('none'));
  const handleOpenSubscription = onOpenSubscription || (() => setActiveModal('subscription'));

  const { timerState, startTimer, pauseTimer, resetTimer, setDuration } = useTimerStore();
  const { toggleTaskDrawer } = useTaskStore();
  const { isPro } = useSubscriptionStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isTr = language === 'tr';

  const commands: CommandItem[] = useMemo(() => [
    // Timer
    {
      id: 'timer-toggle',
      title: timerState === 'running' ? (isTr ? 'Sayacı Duraklat' : 'Pause Timer') : (isTr ? 'Sayacı Başlat' : 'Start Timer'),
      category: isTr ? 'Zamanlayıcı' : 'Timer',
      icon: timerState === 'running' ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />,
      shortcut: 'Space',
      action: () => timerState === 'running' ? pauseTimer() : startTimer(),
    },
    {
      id: 'timer-reset',
      title: isTr ? 'Sayacı Sıfırla' : 'Reset Timer',
      category: isTr ? 'Zamanlayıcı' : 'Timer',
      icon: <Clock className="w-4 h-4 text-stone-400" />,
      action: () => resetTimer(),
    },
    {
      id: 'timer-25',
      title: isTr ? 'Standart Pomodoro (25 dk)' : 'Standard Pomodoro (25 min)',
      category: isTr ? 'Zamanlayıcı' : 'Timer',
      icon: <Clock className="w-4 h-4 text-amber-400" />,
      action: () => setDuration(25),
    },
    {
      id: 'timer-50',
      title: isTr ? 'Derin Çalışma (50 dk - PRO)' : 'Deep Work (50 min - PRO)',
      category: isTr ? 'Zamanlayıcı' : 'Timer',
      icon: <Crown className="w-4 h-4 text-amber-400" />,
      action: () => setDuration(50),
    },

    // Tasks & Kanban
    {
      id: 'tasks-open',
      title: isTr ? 'Çalışma Görevleri & Mini Kanban Panosu' : 'Tasks & Mini Kanban Board',
      category: isTr ? 'Üretkenlik' : 'Productivity',
      icon: <CheckSquare className="w-4 h-4 text-amber-400" />,
      shortcut: 'T',
      action: () => toggleTaskDrawer(),
    },

    // Rooms
    {
      id: 'room-bedroom',
      title: isTr ? 'Odaya Git: Yatak Odası & Çalışma Masası' : 'Go to: Bedroom Study',
      category: isTr ? 'Odalar' : 'Rooms',
      icon: <Home className="w-4 h-4 text-amber-300" />,
      action: () => setActiveRoom('bedroom'),
    },
    {
      id: 'room-cabin',
      title: isTr ? 'Odaya Git: Çam Dağı Kütük Evi' : 'Go to: Pine Mountain Cabin',
      category: isTr ? 'Odalar' : 'Rooms',
      icon: <Home className="w-4 h-4 text-amber-500" />,
      action: () => setActiveRoom('cabin'),
    },
    {
      id: 'room-apartment',
      title: isTr ? 'Odaya Git: Şinjuku Şehir Apartmanı' : 'Go to: Shinjuku Apartment',
      category: isTr ? 'Odalar' : 'Rooms',
      icon: <Home className="w-4 h-4 text-indigo-400" />,
      action: () => setActiveRoom('apartment'),
    },
    {
      id: 'room-library',
      title: isTr ? 'Odaya Git: Gotik Kütüphane (PRO)' : 'Go to: Gothic Library (PRO)',
      category: isTr ? 'Odalar' : 'Rooms',
      icon: <Crown className="w-4 h-4 text-amber-400" />,
      action: () => setActiveRoom('library'),
    },
    {
      id: 'room-cafe',
      title: isTr ? 'Odaya Git: Gece Yarısı Caz Kafe (PRO)' : 'Go to: Midnight Jazz Cafe (PRO)',
      category: isTr ? 'Odalar' : 'Rooms',
      icon: <Crown className="w-4 h-4 text-amber-400" />,
      action: () => setActiveRoom('cafe'),
    },

    // Weather & Time
    {
      id: 'weather-snow',
      title: isTr ? 'Hava Durumu: Sessiz Kar Yağışı' : 'Weather: Gentle Snowfall',
      category: isTr ? 'Atmosfer' : 'Atmosphere',
      icon: <Sparkles className="w-4 h-4 text-sky-300" />,
      action: () => setWeather('snow'),
    },
    {
      id: 'weather-rain',
      title: isTr ? 'Hava Durumu: Huzurlu Yağmur' : 'Weather: Peaceful Rain',
      category: isTr ? 'Atmosfer' : 'Atmosphere',
      icon: <CloudRain className="w-4 h-4 text-sky-400" />,
      action: () => setWeather('rain'),
    },
    {
      id: 'weather-storm',
      title: isTr ? 'Hava Durumu: Gök Gürültülü Fırtına' : 'Weather: Thunderstorm',
      category: isTr ? 'Atmosfer' : 'Atmosphere',
      icon: <CloudRain className="w-4 h-4 text-indigo-400" />,
      action: () => setWeather('storm'),
    },
    {
      id: 'time-night',
      title: isTr ? 'Zaman: Gece Yarısı Modu' : 'Time: Midnight Sanctuary',
      category: isTr ? 'Atmosfer' : 'Atmosphere',
      icon: <Sun className="w-4 h-4 text-purple-400" />,
      action: () => setTimeOfDay('midnight'),
    },

    // Interactive Switches
    {
      id: 'toggle-fireplace',
      title: isTr ? 'Şömineyi Aç / Kapat' : 'Toggle Fireplace',
      category: isTr ? 'Etkileşim' : 'Interaction',
      icon: <Flame className="w-4 h-4 text-orange-400" />,
      shortcut: 'F',
      action: () => toggleFireplace(),
    },
    {
      id: 'toggle-lamp',
      title: isTr ? 'Masa Lambasını Aç / Kapat' : 'Toggle Desk Lamp',
      category: isTr ? 'Etkileşim' : 'Interaction',
      icon: <Lightbulb className="w-4 h-4 text-amber-300" />,
      shortcut: 'L',
      action: () => toggleLamp(),
    },
    {
      id: 'toggle-immersive',
      title: isTr ? 'Zen / Sinematik Odak Modu' : 'Zen / Immersive Mode',
      category: isTr ? 'Görünüm' : 'View',
      icon: <Maximize className="w-4 h-4 text-emerald-400" />,
      shortcut: 'I',
      action: () => toggleImmersiveMode(),
    },

    // Modals
    {
      id: 'modal-stats',
      title: isTr ? 'Çalışma İstatistikleri & Isı Haritası' : 'Study Analytics & Heatmap',
      category: isTr ? 'Paneller' : 'Panels',
      icon: <BarChart2 className="w-4 h-4 text-blue-400" />,
      action: () => setActiveModal('stats'),
    },
    {
      id: 'modal-journal',
      title: isTr ? 'Çalışma Günlüğü & Notlar' : 'Study Journal & Notes',
      category: isTr ? 'Paneller' : 'Panels',
      icon: <BookOpen className="w-4 h-4 text-amber-300" />,
      action: () => setActiveModal('journal'),
    },
    {
      id: 'modal-settings',
      title: isTr ? 'Atmosfer & Genel Ayarlar' : 'Settings & Preferences',
      category: isTr ? 'Paneller' : 'Panels',
      icon: <Settings className="w-4 h-4 text-stone-400" />,
      action: () => setActiveModal('settings'),
    },
    {
      id: 'pro-upgrade',
      title: isTr ? 'Cozy Room PRO: Tüm 50+ Özelliği Aç' : 'Cozy Room PRO: Unlock All 50+ Features',
      category: 'PRO',
      icon: <Crown className="w-4 h-4 text-amber-400" />,
      action: () => handleOpenSubscription(),
    },
  ], [timerState, isTr, pauseTimer, startTimer, resetTimer, setDuration, toggleTaskDrawer, setActiveRoom, setWeather, setTimeOfDay, toggleFireplace, toggleLamp, toggleImmersiveMode, setActiveModal, handleOpenSubscription]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(c => 
      c.title.toLowerCase().includes(q) || 
      c.category.toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered]);

  useEffect(() => {
    if (!isPaletteOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          handleClose();
        }
      } else if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaletteOpen, filtered, selectedIndex, handleClose]);

  if (!isPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/75 backdrop-blur-md animate-fade-in" onClick={handleClose}>
      <div className="relative w-full max-w-xl bg-stone-900 border border-stone-700/80 rounded-2xl shadow-2xl overflow-hidden text-stone-100 flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Search Header */}
        <div className="p-4 border-b border-stone-800 flex items-center gap-3 bg-stone-950/60">
          <Search className="w-5 h-5 text-stone-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isTr ? 'Komut ara, odaya git veya ayarı değiştir... (Örn: şömine, kar, 50 dk)' : 'Search command, jump to room or switch setting...'}
            className="flex-1 bg-transparent text-sm text-white placeholder-stone-500 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 text-[10px] font-mono text-stone-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 custom-scrollbar space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-500">
              {isTr ? 'Eşleşen komut bulunamadı.' : 'No commands matched your search.'}
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => {
                  item.action();
                  handleClose();
                }}
                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                  idx === selectedIndex
                    ? 'bg-amber-500/20 text-white border border-amber-500/40'
                    : 'hover:bg-stone-800/60 text-stone-300 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-stone-800 border border-stone-700">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-xs font-semibold">{item.title}</div>
                    <div className="text-[10px] text-stone-400">{item.category}</div>
                  </div>
                </div>

                {item.shortcut && (
                  <kbd className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 text-[10px] font-mono text-stone-400">
                    {item.shortcut}
                  </kbd>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-800 bg-stone-950/60 flex items-center justify-between text-[11px] text-stone-500">
          <span>{isTr ? 'Gezinmek için ↑ ↓, seçmek için Enter' : '↑ ↓ to navigate, Enter to select'}</span>
          <span className="flex items-center gap-1 text-amber-400 font-semibold">
            <Crown className="w-3.5 h-3.5" />
            {isPro ? 'PRO Üye' : 'Cozy Room Free'}
          </span>
        </div>
      </div>
    </div>
  );
};

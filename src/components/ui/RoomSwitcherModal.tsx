import React from 'react';
import { X, Check, Compass, Crown } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAudioStore } from '../../store/useAudioStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { ROOMS } from '../../audio/soundPresets';
import { RoomId } from '../../types';
import { TRANSLATIONS, getRoomTranslation } from '../../i18n/translations';

export const RoomSwitcherModal: React.FC = () => {
  const { activeModal, setActiveModal, activeRoom, setActiveRoom, setTimeOfDay, setWeather, showToast, language } = useAppStore();
  const { applyRoomVolumes } = useAudioStore();
  const { isPro } = useSubscriptionStore();

  if (activeModal !== 'rooms') return null;

  const t = TRANSLATIONS[language];

  const handleSelectRoom = (roomId: RoomId) => {
    const room = ROOMS.find((r) => r.id === roomId);
    if (!room) return;

    if (room.isProOnly && !isPro) {
      setActiveModal('subscription');
      showToast(language === 'tr' ? 'Bu oda Cozy Room PRO abonelerine özeldir! 👑' : 'This room is exclusive to Cozy Room PRO! 👑', 3000);
      return;
    }

    setActiveRoom(roomId);
    setTimeOfDay(room.defaultTimeOfDay);
    setWeather(room.defaultWeather);

    // Apply complete room soundscape (crossfading out non-room channels and strictly syncing with weather)
    applyRoomVolumes(room.defaultAmbient || {}, room.defaultWeather);

    setActiveModal('none');
    const localizedRoomName = getRoomTranslation(language, roomId)?.name || room.name;
    showToast(t.toasts.roomChanged(localizedRoomName), 3000);
  };

  const getRoomEmoji = (id: RoomId) => {
    switch (id) {
      case 'bedroom': return '🛏️';
      case 'apartment': return '🏙️';
      case 'cabin': return '🪵';
      case 'library': return '🏛️';
      case 'cafe': return '☕';
      case 'kyoto_zen': return '🎋';
      case 'cyberpunk_loft': return '🌆';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm pointer-events-auto">
      <div className="bg-stone-900/95 text-stone-100 border border-stone-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-amber-200">{t.rooms.title}</h3>
              <p className="text-xs text-stone-400">{t.rooms.subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room Cards Grid */}
        <div className="flex-1 overflow-y-auto py-3.5 space-y-3 pr-1">
          {ROOMS.map((room) => {
            const isSelected = activeRoom === room.id;
            const roomTranslation = getRoomTranslation(language, room.id);
            const roomName = roomTranslation?.name || room.name;
            const roomDesc = roomTranslation?.desc || room.description;
            const roomTime = t.times[room.defaultTimeOfDay] || room.defaultTimeOfDay;
            const roomWeather = t.weather[room.defaultWeather] || room.defaultWeather;

            return (
              <div
                key={room.id}
                onClick={() => handleSelectRoom(room.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 group ${
                  isSelected
                    ? 'bg-amber-950/35 border-amber-500/70 shadow-lg'
                    : 'bg-stone-950/40 border-stone-800 hover:border-stone-700 hover:bg-stone-800/40'
                }`}
              >
                <div className="text-3xl p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex-shrink-0 group-hover:scale-105 transition-transform">
                  {getRoomEmoji(room.id)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-amber-200 group-hover:text-amber-300 transition-colors">
                        {roomName}
                      </h4>
                      {room.isProOnly && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/40">
                          <Crown className="w-3 h-3" /> PRO
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                        <Check className="w-3.5 h-3.5" /> {t.rooms.current}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-300 mt-1.5 leading-relaxed">
                    {roomDesc}
                  </p>
                  <div className="flex items-center gap-2.5 mt-2.5 text-xs text-stone-400">
                    <span className="capitalize text-stone-200 font-medium">{t.rooms.default}: {roomTime}</span>
                    <span>•</span>
                    <span className="capitalize text-stone-200 font-medium">{roomWeather}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3.5 border-t border-stone-800 flex justify-end">
          <button
            onClick={() => setActiveModal('none')}
            className="px-5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            {t.stats.close}
          </button>
        </div>
      </div>
    </div>
  );
};

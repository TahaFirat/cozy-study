import React, { useState } from 'react';
import { 
  X, 
  Keyboard, 
  Sparkles, 
  Timer, 
  Swords, 
  Heart, 
  Sliders, 
  CheckSquare, 
  Users, 
  Lightbulb, 
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useCommunityStore } from '../../store/useCommunityStore';
import { TRANSLATIONS } from '../../i18n/translations';

export const ShortcutsModal: React.FC = () => {
  const { activeModal, setActiveModal, language } = useAppStore();
  const [activeTab, setActiveTab] = useState<'tutorial' | 'shortcuts'>('tutorial');

  if (activeModal !== 'shortcuts') return null;

  const t = TRANSLATIONS[language];
  const helpT = t.helpModal;
  const list = t.settingsModal.shortcutsList;
  const isTr = language === 'tr';

  const cardIcons: Record<string, { icon: React.ReactNode; color: string; border: string; bg: string }> = {
    timer: { 
      icon: <Timer className="w-5 h-5 text-amber-400" />, 
      color: 'text-amber-300',
      border: 'border-amber-500/25 hover:border-amber-500/50',
      bg: 'bg-amber-500/10'
    },
    boss: { 
      icon: <Swords className="w-5 h-5 text-rose-400" />, 
      color: 'text-rose-300',
      border: 'border-rose-500/25 hover:border-rose-500/50',
      bg: 'bg-rose-500/10'
    },
    pet: { 
      icon: <Heart className="w-5 h-5 text-pink-400" />, 
      color: 'text-pink-300',
      border: 'border-pink-500/25 hover:border-pink-500/50',
      bg: 'bg-pink-500/10'
    },
    audio: { 
      icon: <Sliders className="w-5 h-5 text-sky-400" />, 
      color: 'text-sky-300',
      border: 'border-sky-500/25 hover:border-sky-500/50',
      bg: 'bg-sky-500/10'
    },
    tasks: { 
      icon: <CheckSquare className="w-5 h-5 text-emerald-400" />, 
      color: 'text-emerald-300',
      border: 'border-emerald-500/25 hover:border-emerald-500/50',
      bg: 'bg-emerald-500/10'
    },
    community: { 
      icon: <Users className="w-5 h-5 text-indigo-400" />, 
      color: 'text-indigo-300',
      border: 'border-indigo-500/25 hover:border-indigo-500/50',
      bg: 'bg-indigo-500/10'
    },
  };

  const handleCardAction = (id: string) => {
    switch (id) {
      case 'boss':
        setActiveModal('boss_raid');
        break;
      case 'audio':
        setActiveModal('mixer');
        break;
      case 'tasks':
        setActiveModal('none');
        useTaskStore.getState().setTaskDrawerOpen(true);
        break;
      case 'community':
        setActiveModal('none');
        useCommunityStore.getState().setChatOpen(true);
        break;
      case 'pet':
        setActiveModal('none');
        useAppStore.getState().showToast(
          isTr ? '🐾 Masadaki veya koltuktaki kediye tıklayarak sevebilirsin!' : '🐾 Click the cat on the desk or sofa to pet it!',
          3500
        );
        break;
      default:
        setActiveModal('none');
        break;
    }
  };

  const shortcuts = [
    { key: 'Space', label: list.space, category: isTr ? 'Sayaç' : 'Timer' },
    { key: 'C', label: isTr ? 'Birlikte Çalışanlar & Sohbeti Aç / Kapat' : 'Toggle Community Lounge & Chat', category: isTr ? 'Topluluk' : 'Community' },
    { key: 'M', label: list.m, category: isTr ? 'Ses' : 'Audio' },
    { key: 'P', label: list.p, category: isTr ? 'Müzik' : 'Music' },
    { key: 'I', label: list.i, category: isTr ? 'Görünüm' : 'View' },
    { key: 'L', label: list.l, category: isTr ? 'Oda' : 'Room' },
    { key: 'F', label: list.f, category: isTr ? 'Oda' : 'Room' },
    { key: '?', label: isTr ? 'Yardım & Başlangıç Rehberi' : 'Help & Tutorial Guide', category: isTr ? 'Yardım' : 'Help' },
    { key: 'Esc', label: list.esc, category: isTr ? 'Navigasyon' : 'Navigation' },
  ];

  return (
    <div 
      onClick={() => setActiveModal('none')}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm pointer-events-auto"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-stone-900/98 text-stone-100 border border-stone-800 rounded-3xl shadow-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-sm">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-100">
                {helpT.title}
              </h3>
              <p className="text-[11px] text-stone-400">
                {helpT.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="flex gap-2 pt-3 pb-1 border-b border-stone-800/60">
          <button
            onClick={() => setActiveTab('tutorial')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tutorial'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                : 'bg-stone-800/60 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{helpT.tabTutorial}</span>
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'shortcuts'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                : 'bg-stone-800/60 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>{helpT.tabShortcuts}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-3 pr-1 space-y-3 custom-scrollbar">
          {activeTab === 'tutorial' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {helpT.tutorialCards.map((card) => {
                const conf = cardIcons[card.id] || cardIcons.timer;
                return (
                  <div
                    key={card.id}
                    className={`p-3.5 rounded-2xl bg-stone-950/50 border ${conf.border} transition-all flex flex-col justify-between group shadow-sm`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg ${conf.bg} border border-white/5 flex items-center justify-center shrink-0`}>
                            {conf.icon}
                          </div>
                          <h4 className="text-xs font-bold text-stone-200">
                            {card.title}
                          </h4>
                        </div>
                      </div>

                      <p className="text-[11px] text-stone-400 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-stone-800/60 space-y-2">
                      <div className="flex items-start gap-1.5 text-[10px] text-amber-300/90 font-mono bg-amber-500/5 px-2 py-1 rounded-lg border border-amber-500/15">
                        <Lightbulb className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{card.tip}</span>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => handleCardAction(card.id)}
                          className="text-[10px] font-semibold text-stone-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>{isTr ? 'Hemen İncele' : 'Try Now'}</span>
                          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {isTr 
                    ? 'Klavyedeki hızlı tuşları kullanarak fareye dokunmadan odayı yönetebilirsin.' 
                    : 'Use keyboard hotkeys to navigate and control your study room seamlessly.'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {shortcuts.map((sc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950/40 border border-stone-800/80 hover:border-stone-700/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <kbd className="px-2 py-1 bg-stone-800 border border-stone-700 text-amber-300 font-mono text-xs font-bold rounded-md shadow-inner min-w-[34px] text-center shrink-0">
                        {sc.key}
                      </kbd>
                      <span className="text-xs font-medium text-stone-200 truncate">{sc.label}</span>
                    </div>
                    <span className="text-[9.5px] uppercase font-semibold text-stone-500 tracking-wider shrink-0 ml-2">
                      {sc.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-800/90 flex items-center justify-between">
          <span className="text-[11px] text-stone-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {isTr ? 'Esc tuşu veya dışarı tıklayarak kapatabilirsin' : 'Press Esc or click outside to close'}
          </span>
          <button
            onClick={() => setActiveModal('none')}
            className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold cursor-pointer transition-colors"
          >
            {t.stats.close}
          </button>
        </div>
      </div>
    </div>
  );
};

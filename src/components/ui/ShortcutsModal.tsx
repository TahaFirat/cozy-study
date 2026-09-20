import React from 'react';
import { X, Keyboard, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { TRANSLATIONS } from '../../i18n/translations';

export const ShortcutsModal: React.FC = () => {
  const { activeModal, setActiveModal, language } = useAppStore();
  if (activeModal !== 'shortcuts') return null;

  const t = TRANSLATIONS[language];
  const list = t.settingsModal.shortcutsList;

  const shortcuts = [
    { key: 'Space', label: list.space, category: language === 'tr' ? 'Sayaç' : 'Timer' },
    { key: 'C', label: language === 'tr' ? 'Birlikte Çalışanlar & Sohbeti Aç / Kapat' : 'Toggle Community Lounge & Chat', category: language === 'tr' ? 'Topluluk' : 'Community' },
    { key: 'M', label: list.m, category: language === 'tr' ? 'Ses' : 'Audio' },
    { key: 'P', label: list.p, category: language === 'tr' ? 'Müzik' : 'Music' },
    { key: 'I', label: list.i, category: language === 'tr' ? 'Görünüm' : 'View' },
    { key: 'L', label: list.l, category: language === 'tr' ? 'Oda' : 'Room' },
    { key: 'F', label: list.f, category: language === 'tr' ? 'Oda' : 'Room' },
    { key: '?', label: language === 'tr' ? 'Kısayol Rehberini Aç / Kapat' : 'Show / Hide Shortcuts', category: language === 'tr' ? 'Yardım' : 'Help' },
    { key: 'Esc', label: list.esc, category: language === 'tr' ? 'Navigasyon' : 'Navigation' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm pointer-events-auto">
      <div className="bg-stone-900/95 text-stone-100 border border-stone-800 rounded-2xl shadow-2xl p-6 w-full max-w-md flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-amber-200">{t.settingsModal.shortcuts}</h3>
              <p className="text-xs text-stone-400">
                {language === 'tr' ? 'Hızlı klavye erişim tuşları' : 'Quick keyboard access keys'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="py-4 space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950/40 border border-stone-800/80 hover:border-stone-700/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <kbd className="px-2.5 py-1 bg-stone-800 border border-stone-700 text-amber-300 font-mono text-xs font-bold rounded-md shadow-inner min-w-[38px] text-center">
                  {sc.key}
                </kbd>
                <span className="text-xs font-medium text-stone-200">{sc.label}</span>
              </div>
              <span className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider">
                {sc.category}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3.5 border-t border-stone-800 flex items-center justify-between">
          <span className="text-[11px] text-stone-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {language === 'tr' ? 'Esc ile kapatabilirsiniz' : 'Press Esc to close'}
          </span>
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

import React, { useState, useEffect } from 'react';
import { Target, Zap, X, Check, Trash2, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTimerStore } from '../../store/useTimerStore';
import { webAudioEngine } from '../../audio/WebAudioEngine';

export const NorthStarGoalModal: React.FC = () => {
  const { activeModal, setActiveModal, language, showToast } = useAppStore();
  const { currentGoal, setCurrentGoal } = useTimerStore();

  const [inputVal, setInputVal] = useState('');
  const isTr = language === 'tr';

  useEffect(() => {
    if (activeModal === 'north_star_goal') {
      setInputVal(currentGoal || '');
    }
  }, [activeModal, currentGoal]);

  if (activeModal !== 'north_star_goal') return null;

  const handleClose = () => {
    setActiveModal('none');
  };

  const handleSave = (goalText?: string) => {
    const textToSave = (goalText !== undefined ? goalText : inputVal).trim();
    setCurrentGoal(textToSave);
    webAudioEngine.playZenChime('start');
    
    if (textToSave) {
      showToast(
        isTr 
          ? `✍️ Kuzey Yıldızı Hedefi Belirlendi: "${textToSave}" (2x Kritik Aktif!)` 
          : `✍️ North Star Goal Set: "${textToSave}" (2x Critical Strike Active!)`,
        3500
      );
    } else {
      showToast(
        isTr ? '✍️ Masadaki hedef temizlendi.' : '✍️ Desk goal cleared.',
        2500
      );
    }
    handleClose();
  };

  const handleClear = () => {
    setCurrentGoal('');
    setInputVal('');
    webAudioEngine.playZenChime('start');
    showToast(
      isTr ? '✍️ Masadaki hedef temizlendi.' : '✍️ Desk goal cleared.',
      2500
    );
    handleClose();
  };

  const presets = isTr
    ? [
        '📐 30 Matematik / Deneme Sorusu Çöz',
        '📖 Kitap / Makale 2 Bölüm Oku & Not Çıkar',
        '💻 Zorlu Kod Bug / Özellik Geliştirmesi',
        '✍️ Tez / Rapor Taslak Yazımı',
      ]
    : [
        '📐 Solve 30 Practice Problems',
        '📖 Read 2 Chapters & Summarize Notes',
        '💻 Solve Challenging Bug / Feature',
        '✍️ Write Draft for Essay / Report',
      ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div 
        className="relative w-full max-w-md bg-stone-900/98 text-stone-100 border border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(245, 158, 11, 0.15)',
        }}
      >
        {/* Subtle Top Accent Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-200 flex items-center gap-2">
                {isTr ? 'Kuzey Yıldızı Hedefi' : 'North Star Goal Pledge'}
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              </h2>
              <p className="text-xs text-stone-400">
                {isTr ? 'Masandaki sarı Post-It odak taahhüdü' : 'Your desk sticky note focus commitment'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2x Critical Strike Perk Banner */}
        <div className="my-4 p-3 rounded-xl bg-gradient-to-r from-amber-950/60 to-orange-950/40 border border-amber-600/40 flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Zap className="w-4 h-4 fill-amber-400" />
          </div>
          <div className="text-xs">
            <span className="font-bold text-amber-300">
              {isTr ? '⚡ 2X KRİTİK VURUŞ ÇARPANI' : '⚡ 2X CRITICAL STRIKE ACTIVE'}
            </span>
            <p className="text-stone-300 mt-0.5 text-[11px] leading-relaxed">
              {isTr 
                ? 'Hedefini belirleyip oturumu tamamladığında, Boss Raid canavarına tam 2 katı kritik hasar vurursun!'
                : 'Pledge a goal and finish the timer session to deal 2x double damage to the active Boss!'}
            </p>
          </div>
        </div>

        {/* Input Form */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }} 
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              {isTr ? 'Bu odak oturumunda neyi tamamlayacaksın?' : 'What will you accomplish in this session?'}
            </label>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={isTr ? 'Örn: Matematik soru bankası test 4-6...' : 'e.g. Finish math test 4-6...'}
              maxLength={60}
              autoFocus
              className="w-full bg-stone-950/90 border border-stone-700/80 rounded-xl px-3.5 py-2.5 text-sm text-amber-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-all font-sans"
            />
            <div className="flex justify-between items-center mt-1 px-1 text-[10px] text-stone-500">
              <span>{isTr ? 'Masadaki nota anında yansır' : 'Pencils directly onto desk Post-It'}</span>
              <span>{inputVal.length}/60</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-[11px] font-medium text-stone-400 block mb-1.5">
              {isTr ? 'Hızlı İlham Şablonları:' : 'Quick Presets:'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {presets.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setInputVal(p.replace(/^[^\s]+ /, ''))}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-800/70 hover:bg-amber-950/40 text-stone-300 hover:text-amber-200 border border-stone-700/60 hover:border-amber-500/50 text-[11px] font-medium text-left truncate transition-all cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-stone-800">
            {currentGoal ? (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-950/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isTr ? 'Hedefi Kaldır' : 'Clear Goal'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-2 rounded-xl text-stone-400 hover:text-stone-200 text-xs font-semibold cursor-pointer"
              >
                {isTr ? 'Vazgeç' : 'Cancel'}
              </button>
            )}

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-900/30 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {isTr ? 'Hedefi Belirle & 2x Kritik Aktif Et' : 'Save Goal & Activate 2x Crit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

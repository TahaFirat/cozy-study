import React, { useState, useEffect } from 'react';
import { Eye, Heart, Activity, Wind, X, Check, Smile } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface BreakGuideModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const BreakGuideModal: React.FC<BreakGuideModalProps> = ({ isOpen, onClose }) => {
  const { language, activeModal, setActiveModal } = useAppStore();
  const isTr = language === 'tr';
  const isModalOpen = isOpen !== undefined ? isOpen : activeModal === 'break_guide';
  const handleClose = onClose || (() => setActiveModal('none'));

  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale' | 'pause'>('inhale');
  const [breathTimer, setBreathTimer] = useState(4);

  // Box Breathing cycle (4s Inhale - 4s Hold - 4s Exhale - 4s Pause)
  useEffect(() => {
    if (!isModalOpen) return;
    const interval = setInterval(() => {
      setBreathTimer((prev) => {
        if (prev > 1) return prev - 1;
        // switch phase
        setBreathPhase((current) => {
          if (current === 'inhale') return 'hold';
          if (current === 'hold') return 'exhale';
          if (current === 'exhale') return 'pause';
          return 'inhale';
        });
        return 4;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isModalOpen]);

  if (!isModalOpen) return null;

  const breathText = {
    inhale: isTr ? 'Derin Nefes Al (Burundan)...' : 'Inhale deeply through nose...',
    hold: isTr ? 'Nefesini Tut (Sakin Kal)...' : 'Hold breath gently...',
    exhale: isTr ? 'Yavaşça Nefesi Ver (Ağızdan)...' : 'Exhale slowly through mouth...',
    pause: isTr ? 'Bekle ve Rahatla...' : 'Pause and relax...',
  }[breathPhase];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-6 text-stone-100 flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {isTr ? 'Mola & Yenilenme Rehberi' : 'Break & Reset Guide'}
              </h2>
              <p className="text-xs text-stone-400">
                {isTr ? 'Gözlerini ve bedenini dinlendir, zihnini tazele' : 'Rest your eyes, stretch muscles, and clear mind'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Box Breathing Interactive Circle */}
        <div className="p-5 rounded-xl bg-stone-950/60 border border-stone-800 flex flex-col items-center text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1 mb-3">
            <Wind className="w-3.5 h-3.5" />
            {isTr ? 'Kutu Nefesi (Box Breathing - 4-4-4-4)' : 'Box Breathing Reset'}
          </span>

          <div className="relative w-28 h-28 flex items-center justify-center my-2">
            <div 
              className={`absolute inset-0 rounded-full border-2 transition-all duration-1000 ${
                breathPhase === 'inhale' ? 'scale-110 border-emerald-400 bg-emerald-500/10' :
                breathPhase === 'hold' ? 'scale-110 border-amber-400 bg-amber-500/10' :
                breathPhase === 'exhale' ? 'scale-90 border-blue-400 bg-blue-500/10' :
                'scale-90 border-stone-600 bg-stone-800/10'
              }`} 
            />
            <div className="text-2xl font-black font-mono text-white">
              {breathTimer}
            </div>
          </div>

          <div className="text-xs font-semibold text-emerald-300 mt-1">
            {breathText}
          </div>
        </div>

        {/* 2. 20-20-20 Eye Strain Rule */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-stone-950/40 border border-stone-800/80">
          <Eye className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-stone-200">
              {isTr ? '20-20-20 Kuralı (Göz Sağlığı)' : '20-20-20 Eye Rest Rule'}
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
              {isTr 
                ? 'Ekrana bakmayı bırak. En az 6 metre (20 feet) uzaktaki bir nesneye 20 saniye boyunca odaklanarak göz kaslarını gevşet.'
                : 'Look away from the screen. Focus on an object at least 20 feet away for 20 seconds to ease eye strain.'}
            </p>
          </div>
        </div>

        {/* 3. Posture & Shoulder Stretch */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-stone-950/40 border border-stone-800/80">
          <Smile className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-stone-200">
              {isTr ? 'Omuz & Boyun Gevşetme' : 'Shoulder & Neck Release'}
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
              {isTr 
                ? 'Omuzlarını 5 kez geriye, 5 kez öne doğru dairesel çevir. Bir yudum su iç ve sırtını dikleştir.'
                : 'Roll your shoulders backwards 5 times and forwards 5 times. Take a sip of water and align your posture.'}
            </p>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          {isTr ? 'Yenilendim, Seansa Devam Et' : 'I Feel Refreshed, Continue'}
        </button>
      </div>
    </div>
  );
};

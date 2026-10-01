import React from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { useSubscriptionStore, PAYWALL_ENABLED } from '../../store/useSubscriptionStore';
import { useAppStore } from '../../store/useAppStore';

interface ProBadgeProps {
  onClick: () => void;
}

export const ProBadge: React.FC<ProBadgeProps> = ({ onClick }) => {
  const { isPro } = useSubscriptionStore();
  const { language, showToast } = useAppStore();

  const isTr = language === 'tr';

  if (!PAYWALL_ENABLED) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 hover:border-amber-400 transition-all cursor-pointer shadow-sm group"
    >
      <Crown className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
      <span>{isTr ? 'PRO\'ya Geç' : 'Get PRO'}</span>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
    </button>
  );
};

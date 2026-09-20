import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export const ToastNotification: React.FC = () => {
  const { toastMessage } = useAppStore();

  if (!toastMessage) return null;

  return (
    <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="px-5 py-2.5 bg-stone-900/95 text-amber-100 text-sm font-semibold rounded-xl border border-amber-500/60 shadow-2xl backdrop-blur-md flex items-center gap-2.5">
        <span className="text-base">☕</span>
        <span>{toastMessage}</span>
      </div>
    </div>
  );
};

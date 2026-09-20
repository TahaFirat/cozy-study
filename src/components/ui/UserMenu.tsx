import React, { useState, useRef, useEffect } from 'react';
import { LogOut, User, Cloud, Loader2, Settings, ChevronDown, Trophy, BarChart2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';

export const UserMenu: React.FC = () => {
  const { user, isLoading, isSyncing, signOut, syncToCloud } = useAuthStore();
  const { setActiveModal, language, showToast } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tr = language === 'tr';

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (isLoading) {
    return (
      <div className="p-2 bg-stone-900/85 border border-stone-800 rounded-lg">
        <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />
      </div>
    );
  }

  // Not logged in — show Guest Menu with Profile, Stats, and Sign In
  if (!user) {
    return (
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-900/85 hover:bg-stone-800 text-amber-200 border border-amber-800/60 hover:border-amber-500 rounded-xl backdrop-blur-md text-xs font-bold transition-all cursor-pointer shadow-sm"
          title={tr ? 'Profil & Hesap Menüsü' : 'Profile & Account Menu'}
        >
          <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] text-amber-300">
            <User className="w-3 h-3" />
          </div>
          <span className="hidden sm:inline">{tr ? 'Profilim' : 'Profile'}</span>
          <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-stone-900/98 border border-stone-700/80 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-4 py-3 border-b border-stone-800 bg-stone-950/40">
              <p className="text-sm font-semibold text-amber-200 truncate">
                {tr ? 'Misafir Öğrenci' : 'Guest Studier'}
              </p>
              <p className="text-[11px] text-stone-400 truncate">
                {tr ? 'Verileriniz bu tarayıcıda saklanıyor' : 'Data stored in this browser'}
              </p>
            </div>

            <div className="p-1.5 space-y-0.5">
              <button
                onClick={() => { setActiveModal('profile'); setIsOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-amber-200 hover:bg-stone-800 rounded-lg cursor-pointer transition-colors font-semibold"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>{tr ? 'Profilim & Zafer Kupaları' : 'My Profile & Trophies'}</span>
              </button>

              <button
                onClick={() => { setActiveModal('stats'); setIsOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-200 hover:bg-stone-800 rounded-lg cursor-pointer transition-colors"
              >
                <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{tr ? 'Çalışma İstatistikleri & Isı Haritası' : 'Study Stats & Heatmap'}</span>
              </button>

              <div className="h-px bg-stone-800 my-1" />

              <button
                onClick={() => { setActiveModal('auth'); setIsOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-amber-300 hover:bg-amber-950/40 rounded-lg cursor-pointer transition-colors font-bold"
              >
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>{tr ? 'Giriş Yap / Buluta Bağlan' : 'Sign In / Connect Cloud'}</span>
              </button>

              <button
                onClick={() => { setActiveModal('settings'); setIsOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-200 hover:bg-stone-800 rounded-lg cursor-pointer transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-stone-400" />
                <span>{tr ? 'Ayarlar' : 'Settings'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Logged in — show avatar + dropdown
  const initials = user.displayName
    ? user.displayName.slice(0, 2).toUpperCase()
    : (user.email?.[0] ?? 'U').toUpperCase();

  const handleSync = async () => {
    await syncToCloud();
    showToast(tr ? 'Veriler buluta kaydedildi ☁️' : 'Data synced to cloud ☁️', 2500);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    showToast(tr ? 'Çıkış yapıldı. İyi çalışmalar! 👋' : 'Signed out. Happy studying! 👋', 2500);
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-900/85 hover:bg-stone-800 border border-stone-700/80 hover:border-stone-600 rounded-xl backdrop-blur-md text-xs font-medium transition-all cursor-pointer"
        title={user.displayName || user.email || ''}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || ''}
            className="w-5 h-5 rounded-full object-cover border border-stone-600"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-amber-500/30 border border-amber-500/60 flex items-center justify-center text-[9px] font-black text-amber-200">
            {initials}
          </div>
        )}
        <span className="text-stone-200 max-w-[80px] truncate hidden sm:block">
          {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || (tr ? 'Hesabım' : 'Account')}
        </span>
        {isSyncing ? (
          <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
        ) : (
          <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-stone-900/98 border border-stone-700/80 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-stone-800 bg-stone-950/40">
            <p className="text-sm font-semibold text-amber-200 truncate">
              {user.displayName || (tr ? 'Çalışmacı' : 'Studier')}
            </p>
            <p className="text-[11px] text-stone-400 truncate">{user.email}</p>
          </div>

          {/* Actions */}
          <div className="p-1.5 space-y-0.5">
            <button
              onClick={() => { setActiveModal('profile'); setIsOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-amber-200 hover:bg-stone-800 rounded-lg cursor-pointer transition-colors font-semibold"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>{tr ? 'Profilim & Zafer Kupaları' : 'My Profile & Trophies'}</span>
            </button>

            <button
              onClick={() => { setActiveModal('stats'); setIsOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-200 hover:bg-stone-800 rounded-lg cursor-pointer transition-colors"
            >
              <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{tr ? 'Çalışma İstatistikleri & Isı Haritası' : 'Study Stats & Heatmap'}</span>
            </button>

            <div className="h-px bg-stone-800 my-1" />

            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-200 hover:bg-stone-800 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSyncing ? (
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{tr ? 'Buluta Kaydet' : 'Sync to Cloud'}</span>
            </button>

            <button
              onClick={() => { setActiveModal('settings'); setIsOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-200 hover:bg-stone-800 rounded-lg cursor-pointer transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-stone-400" />
              <span>{tr ? 'Ayarlar' : 'Settings'}</span>
            </button>

            <div className="h-px bg-stone-800 my-1" />

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40 rounded-lg cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{tr ? 'Çıkış Yap' : 'Sign Out'}</span>
            </button>
          </div>

          {/* Cloud status */}
          <div className="px-4 py-2 border-t border-stone-800 bg-stone-950/20 flex items-center gap-1.5">
            {isSyncing ? (
              <>
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-[10px] text-amber-400">{tr ? 'Kaydediliyor...' : 'Syncing...'}</span>
              </>
            ) : (
              <>
                <Cloud className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-400">{tr ? 'Bulut bağlantısı aktif' : 'Cloud connected'}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

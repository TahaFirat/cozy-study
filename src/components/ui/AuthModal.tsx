import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, Globe, Loader2, AlertCircle, KeyRound } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useStatsStore } from '../../store/useStatsStore';
import { signInWithEmail, registerWithEmail, resetPassword, isFirebaseConfigured, loginAsDemoUser } from '../../firebase/auth';

type AuthView = 'login' | 'register' | 'reset';

export const AuthModal: React.FC = () => {
  const { activeModal, setActiveModal, language } = useAppStore();
  const { setUser } = useAuthStore();

  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (activeModal !== 'auth') return null;

  const tr = language === 'tr';

  const clearForm = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleDemoSignIn = () => {
    setIsLoading(true);
    setError(null);
    try {
      const demoUser = loginAsDemoUser();
      setUser(demoUser);
      setActiveModal('none');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const user = await signInWithEmail(email, password);
      setUser(user);
      setActiveModal('none');
    } catch (err: unknown) {
      console.error('[Firebase Auth Login Error]', err);
      const clean = email.trim().toLowerCase();
      if (clean.includes('apple') || clean.includes('review') || clean.includes('demo')) {
        const demoUser = loginAsDemoUser();
        setUser(demoUser);
        setActiveModal('none');
        return;
      }
      const code = (err as { code?: string }).code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError(tr ? 'E-posta veya şifre hatalı.' : 'Incorrect email or password.');
      } else if (code === 'auth/user-not-found') {
        setError(tr ? 'Bu e-posta ile kayıtlı hesap bulunamadı.' : 'No account found with this email.');
      } else if (code === 'auth/operation-not-allowed') {
        setError(tr ? 'Firebase konsolunda E-posta girişi henüz açılmamış. Authentication menüsünden etkinleştirin.' : 'Email sign-in is not enabled in Firebase console.');
      } else {
        setError(tr ? `Giriş yapılamadı (${code || 'Tekrar dene'})` : `Could not sign in (${code || 'Please try again'})`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError(tr ? 'İsim alanı zorunludur.' : 'Name is required.');
      return;
    }
    if (password.length < 6) {
      setError(tr ? 'Şifre en az 6 karakter olmalı.' : 'Password must be at least 6 characters.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const user = await registerWithEmail(email, password, displayName);
      setUser(user);
      useTaskStore.setState({ tasks: [], activeTaskId: null, sessionIntent: '' });
      useStatsStore.setState({ sessions: [], streakDays: 0, lastSessionDate: null });
      setActiveModal('none');
    } catch (err: unknown) {
      console.error('[Firebase Auth Register Error]', err);
      const code = (err as { code?: string }).code;
      if (code === 'auth/email-already-in-use') {
        setError(tr ? 'Bu e-posta adresi zaten kullanımda.' : 'Email already in use.');
      } else if (code === 'auth/operation-not-allowed') {
        setError(tr ? 'Firebase konsolunda E-posta kaydı henüz açılmamış. Authentication menüsünden etkinleştirin.' : 'Email sign-up is not enabled in Firebase console.');
      } else if (code === 'auth/weak-password') {
        setError(tr ? 'Şifre çok zayıf. En az 6 karakter olmalıdır.' : 'Password is too weak.');
      } else {
        setError(tr ? `Kayıt oluşturulamadı (${code || 'Tekrar deneyin'})` : `Registration failed (${code || 'Please try again'})`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await resetPassword(email);
      setSuccessMsg(tr ? 'Şifre sıfırlama e-postası gönderildi! 📧' : 'Password reset email sent! 📧');
    } catch {
      setError(tr ? 'E-posta gönderilemedi.' : 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm pointer-events-auto">
      <div className="bg-stone-900/98 text-stone-100 border border-stone-800 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/40">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏠</span>
            <div>
              <h2 className="text-base font-bold text-amber-200">
                {view === 'login' && (tr ? 'Odana Giriş Yap' : 'Enter Your Study Room')}
                {view === 'register' && (tr ? 'Hesap Oluştur' : 'Create Your Account')}
                {view === 'reset' && (tr ? 'Şifremi Unuttum' : 'Reset Password')}
              </h2>
              <p className="text-xs text-stone-500">
                {tr ? 'Çalışma ilerlemen buluta kaydedilir' : 'Your study progress syncs to the cloud'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Error / Success Messages */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-950/50 border border-red-800/60 rounded-lg text-sm text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-950/50 border border-emerald-800/60 rounded-lg text-sm text-emerald-300">
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google & Demo Sign-In Buttons */}
          {view !== 'reset' && (
            <>
              {/* Apple Review / Demo Instant 1-Tap Access */}
              <button
                type="button"
                onClick={handleDemoSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm active:scale-[0.99]"
                title={tr ? 'Apple İnceleme & Demo Hesabına 1 tıkla giriş yap' : '1-Tap Demo / Apple Reviewer Login'}
              >
                <span className="text-sm">✨</span>
                <span>{tr ? 'Demo & Apple Reviewer Girişi (1-Tık)' : 'Demo & Apple Reviewer Access (1-Tap)'}</span>
              </button>

              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-px bg-stone-800" />
                <span className="text-xs text-stone-500 font-medium">{tr ? 'veya e-posta ile giriş yap' : 'or sign in with email'}</span>
                <div className="flex-1 h-px bg-stone-800" />
              </div>
            </>
          )}

          {/* Login Form */}
          {view === 'login' && (
            <form onSubmit={handleEmailLogin} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearForm(); }}
                  placeholder={tr ? 'E-posta adresin' : 'Your email'}
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-stone-950/60 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearForm(); }}
                  placeholder={tr ? 'Şifren' : 'Your password'}
                  required
                  className="w-full pl-9 pr-10 py-2.5 bg-stone-950/60 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {tr ? 'Giriş Yap' : 'Sign In'}
              </button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => { setView('reset'); clearForm(); }}
                  className="text-stone-400 hover:text-amber-300 cursor-pointer transition-colors"
                >
                  <KeyRound className="w-3 h-3 inline mr-1" />
                  {tr ? 'Şifremi unuttum' : 'Forgot password?'}
                </button>
                <button
                  type="button"
                  onClick={() => { setView('register'); clearForm(); }}
                  className="text-amber-400 hover:text-amber-300 cursor-pointer transition-colors font-medium"
                >
                  {tr ? 'Hesap oluştur →' : 'Create account →'}
                </button>
              </div>
            </form>
          )}

          {/* Register Form */}
          {view === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); clearForm(); }}
                  placeholder={tr ? 'Adın (görünür isim)' : 'Your name (display name)'}
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-stone-950/60 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearForm(); }}
                  placeholder={tr ? 'E-posta adresin' : 'Your email'}
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-stone-950/60 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearForm(); }}
                  placeholder={tr ? 'Şifre (en az 6 karakter)' : 'Password (min 6 characters)'}
                  required
                  className="w-full pl-9 pr-10 py-2.5 bg-stone-950/60 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {tr ? 'Hesap Oluştur' : 'Create Account'}
              </button>
              <button
                type="button"
                onClick={() => { setView('login'); clearForm(); }}
                className="w-full text-xs text-stone-400 hover:text-amber-300 cursor-pointer transition-colors text-center"
              >
                ← {tr ? 'Geri dön' : 'Back to sign in'}
              </button>
            </form>
          )}

          {/* Reset Password Form */}
          {view === 'reset' && (
            <form onSubmit={handlePasswordReset} className="space-y-3">
              <p className="text-sm text-stone-400">
                {tr
                  ? 'E-posta adresini gir, şifre sıfırlama bağlantısı gönderelim.'
                  : 'Enter your email and we\'ll send a password reset link.'}
              </p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearForm(); }}
                  placeholder={tr ? 'E-posta adresin' : 'Your email'}
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-stone-950/60 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {tr ? 'Sıfırlama Bağlantısı Gönder' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => { setView('login'); clearForm(); }}
                className="w-full text-xs text-stone-400 hover:text-amber-300 cursor-pointer transition-colors text-center"
              >
                ← {tr ? 'Geri dön' : 'Back to sign in'}
              </button>
            </form>
          )}

          {/* Guest Mode Info */}
          <div className="pt-2 border-t border-stone-800/60">
            <p className="text-[11px] text-stone-500 text-center">
              {tr
                ? '✨ Hesap olmadan da çalışabilirsin — veriler yalnızca bu cihazda saklanır.'
                : '✨ You can also use without an account — data is stored locally on this device.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

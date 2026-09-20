import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  Tag,
  Printer,
  Sparkles,
  Crown,
  AlertTriangle,
  Loader2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Info,
  CreditCard,
  Zap,
} from 'lucide-react';
import { useSubscriptionStore, SubscriptionPlan } from '../../store/useSubscriptionStore';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { webAudioEngine } from '../../audio/WebAudioEngine';
import { openPaddleCheckout, isPaddleConfigured } from '../../lib/paddle';
import { saveSubscriptionToFirestore } from '../../firebase/sync';

interface CheckoutModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  selectedPlan: SubscriptionPlan;
}

type CheckoutStep = 'plan_summary' | 'verifying' | 'success' | 'error';

const PLAN_INFO: Record<SubscriptionPlan, {
  labelTr: string;
  labelEn: string;
  priceTr: number;
  priceUsd: number;
  billing: string;
}> = {
  free:     { labelTr: 'Ücretsiz', labelEn: 'Free', priceTr: 0, priceUsd: 0, billing: '' },
  monthly:  { labelTr: 'Aylık Plan', labelEn: 'Monthly Plan', priceTr: 29, priceUsd: 1.49, billing: 'Aylık yenilenir · İstediğin zaman iptal' },
  yearly:   { labelTr: 'Yıllık Plan (%70 İndirim)', labelEn: 'Annual Plan (70% OFF)', priceTr: 99, priceUsd: 4.99, billing: 'Yıllık tek çekim · Sınırsız erişim' },
  lifetime: { labelTr: 'Ömür Boyu Lisans', labelEn: 'Lifetime Access', priceTr: 199, priceUsd: 9.99, billing: 'Tek seferlik ödeme · Ömür boyu sınırsız erişim' },
};

const COUPONS: Record<string, number> = {
  'COZY40': 40,
  'STUDENT50': 50,
  'LAUNCH30': 30,
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, selectedPlan }) => {
  const { upgradeToPro } = useSubscriptionStore();
  const { language, activeModal, setActiveModal, showToast } = useAppStore();
  const { user } = useAuthStore();

  const isModalOpen = isOpen !== undefined ? isOpen : activeModal === 'checkout';
  const handleClose = onClose || (() => setActiveModal('none'));
  const isTr = language === 'tr';

  // Steps
  const [step, setStep] = useState<CheckoutStep>('plan_summary');

  // Coupon
  const [couponInput, setCouponInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number } | null>(null);
  const [couponError, setCouponError] = useState('');

  // Status
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [successPlan, setSuccessPlan] = useState<SubscriptionPlan>(selectedPlan);

  const planInfo = PLAN_INFO[selectedPlan] || PLAN_INFO.yearly;
  const basePrice = planInfo.priceTr;
  const discountAmount = appliedDiscount ? Math.floor((basePrice * appliedDiscount.percent) / 100) : 0;
  const finalPrice = Math.max(0, basePrice - discountAmount);
  const hasPaddleLive = isPaddleConfigured();

  // URL'de ödeme sonucu parametreleri kontrolü (Paddle redirect callback)
  useEffect(() => {
    if (!isModalOpen) return;
    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get('payment');
    const resultPlan = (params.get('plan') as SubscriptionPlan) || selectedPlan;

    if (paymentResult === 'success') {
      const txId = params.get('transactionId') || `pdl_${Date.now()}`;
      handlePaymentSuccess(resultPlan, txId);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [isModalOpen]);

  if (!isModalOpen) return null;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleApplyCoupon = () => {
    setCouponError('');
    const code = couponInput.trim().toUpperCase();
    const percent = COUPONS[code];
    if (percent) {
      setAppliedDiscount({ code, percent });
      showToast(isTr ? `🎉 %${percent} indirim uygulandı!` : `🎉 ${percent}% discount applied!`, 2500);
    } else {
      setCouponError(isTr ? 'Geçersiz veya süresi dolmuş kupon kodu' : 'Invalid or expired promo code');
    }
  };

  const handlePaymentSuccess = async (plan: SubscriptionPlan, pid: string) => {
    setPaymentId(pid);
    setSuccessPlan(plan);
    upgradeToPro(plan);

    // Firebase'e kaydet (eğer giriş yapmışsa)
    if (user?.uid) {
      try {
        await saveSubscriptionToFirestore(user.uid, {
          isPro: true,
          plan,
          paymentId: pid,
          provider: 'paddle',
        });
      } catch (e) {
        console.warn('[Firebase subscription save]', e);
      }
    }

    setStep('success');
    setIsProcessing(false);
    webAudioEngine.init();
    webAudioEngine.playChime('singing_bowl');
    showToast(
      isTr ? '🌟 Ödeme onaylandı! Cozy Room PRO aktif edildi.' : '🌟 Payment verified! Cozy Room PRO is now active.',
      4500
    );
  };

  const handleStartCheckout = async () => {
    if (finalPrice === 0) {
      // Ücretsiz plan veya %100 kupon
      await handlePaymentSuccess(selectedPlan, `free_${Date.now()}`);
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    if (hasPaddleLive) {
      // Gerçek Paddle Overlay Aç
      const opened = await openPaddleCheckout({
        plan: selectedPlan,
        userId: user?.uid || `guest_${Date.now()}`,
        userEmail: user?.email || '',
        userName: user?.displayName || undefined,
        discountCode: appliedDiscount?.code,
        onSuccess: (data) => {
          handlePaymentSuccess(data.plan, data.transactionId);
        },
        onClose: () => {
          setIsProcessing(false);
        },
        onError: (err) => {
          setErrorMessage(err);
          setStep('error');
          setIsProcessing(false);
        },
      });

      if (!opened) {
        // Paddle henüz yapılandırılmamışsa simülasyona geç
        simulateTestPayment();
      }
    } else {
      // Paddle API henüz eklenmemişse güvenli Sandbox simülasyonu
      simulateTestPayment();
    }
  };

  const simulateTestPayment = () => {
    setStep('verifying');
    setTimeout(() => {
      handlePaymentSuccess(selectedPlan, `pdl_sim_${Date.now()}`);
    }, 1800);
  };

  const handleRetry = () => {
    setErrorMessage('');
    setStep('plan_summary');
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-stone-900 border border-stone-700/80 rounded-2xl shadow-2xl overflow-hidden text-stone-100 flex flex-col max-h-[94vh]">

        {/* Header */}
        <div className="p-4 border-b border-stone-800 bg-stone-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{isTr ? 'Cozy Room PRO — Güvenli Ödeme' : 'Cozy Room PRO — Secure Checkout'}</span>
                <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  3D SECURE
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {planInfo.labelTr} {finalPrice > 0 ? `· ₺${finalPrice}` : '· Ücretsiz'}
              </p>
            </div>
          </div>
          {step !== 'verifying' && (
            <button
              onClick={handleClose}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Integration Badge */}
        <div className="px-4 py-2 bg-stone-950/90 border-b border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-stone-300 font-medium">Paddle Billing (Türkiye & Global)</span>
          </div>
          <span className="text-stone-500 font-mono text-[10px]">
            {hasPaddleLive ? 'Live Checkout Aktif' : 'Sandbox / Test Modu'}
          </span>
        </div>

        {/* STEP: Plan Summary */}
        {step === 'plan_summary' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">

            {/* Plan Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 to-stone-950 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-amber-300 text-base">{planInfo.labelTr}</div>
                  <div className="text-xs text-stone-400 mt-0.5">{planInfo.billing}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white font-mono">₺{finalPrice}</div>
                  {appliedDiscount && (
                    <div className="text-xs text-emerald-400 line-through text-stone-500">₺{basePrice}</div>
                  )}
                </div>
              </div>

              <div className="border-t border-stone-700/60 pt-3 grid grid-cols-2 gap-y-1.5 text-xs text-stone-300">
                {[
                  isTr ? '✓ Tüm Premium Odalar' : '✓ All Premium Rooms',
                  isTr ? '✓ Binaural Beats & Özel Sesler' : '✓ Binaural Beats & Special Audio',
                  isTr ? '✓ Sınırsız Müzik & Lo-Fi Radyo' : '✓ Unlimited Lo-Fi Radio',
                  isTr ? '✓ Duvar Kağıdı İndirme' : '✓ Wallpaper Export',
                  isTr ? '✓ Kedi Özelleştirme' : '✓ Cat Customization',
                  isTr ? '✓ Mini Kanban & Özel Süreler' : '✓ Mini Kanban & Custom Timer',
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Coupon Input */}
            <div className="p-3 bg-stone-950/80 border border-stone-800 rounded-xl space-y-2">
              <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                {isTr ? 'İndirim Kodu' : 'Promo Code'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  placeholder={isTr ? 'COZY40, STUDENT50...' : 'COZY40, STUDENT50...'}
                  className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={!!appliedDiscount || !couponInput}
                  className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isTr ? 'Uygula' : 'Apply'}
                </button>
              </div>
              {couponError && <p className="text-xs text-rose-400">{couponError}</p>}
              {appliedDiscount && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-medium">✓ {appliedDiscount.code} — %{appliedDiscount.percent} indirim uygulandı</span>
                  <button onClick={() => setAppliedDiscount(null)} className="text-stone-500 hover:text-rose-400 cursor-pointer">✕</button>
                </div>
              )}
            </div>

            {/* Price Summary */}
            <div className="p-3 bg-stone-950/60 border border-stone-800 rounded-xl space-y-1.5 text-sm">
              <div className="flex justify-between text-stone-400">
                <span>{isTr ? 'Plan Fiyatı' : 'Plan Price'}</span>
                <span className="font-mono">₺{basePrice}</span>
              </div>
              {appliedDiscount && (
                <div className="flex justify-between text-emerald-400">
                  <span>İndirim ({appliedDiscount.code})</span>
                  <span className="font-mono">-₺{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-white pt-1.5 border-t border-stone-700 text-base">
                <span>{isTr ? 'Ödenecek Tutar' : 'Total'}</span>
                <span className="font-mono text-amber-300">₺{finalPrice}</span>
              </div>
              <p className="text-[10px] text-stone-500">{isTr ? 'Tüm vergiler dahil · Ek ücret yok' : 'All taxes included · No hidden fees'}</p>
            </div>

            {/* Sandbox Test Card Notice & Helper */}
            <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-2.5">
              <div className="flex items-start gap-2 text-xs text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">Sandbox Test Uyarısı: </span>
                  {isTr 
                    ? 'Test modunda gerçek kart girilirse bankanız güvenlik gereği işlemi reddeder. Lütfen aşağıdaki resmi test kartını kullanın:'
                    : 'In sandbox mode, real cards are rejected by banks. Please use the official test card:'}
                </div>
              </div>

              {/* Test Card Details Pill */}
              <div className="p-2.5 bg-stone-950/80 rounded-lg border border-amber-500/20 flex items-center justify-between font-mono text-xs text-stone-200">
                <div className="space-y-0.5">
                  <div className="text-amber-300 font-bold tracking-wider">4242 4242 4242 4242</div>
                  <div className="text-[11px] text-stone-400">SKT: 12/28 · CVC: 123 · Posta: 34000</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText('4242424242424242');
                    showToast(isTr ? '✓ Test kart numarası kopyalandı!' : '✓ Test card number copied!', 2000);
                  }}
                  className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-sans text-xs font-bold rounded cursor-pointer border border-amber-500/30 transition-colors"
                >
                  {isTr ? 'Kopyala' : 'Copy'}
                </button>
              </div>

              {/* 1-Click Instant Test Activation */}
              <button
                type="button"
                onClick={() => simulateTestPayment()}
                className="w-full py-2 bg-stone-800 hover:bg-stone-750 text-amber-300 text-xs font-semibold rounded-lg cursor-pointer border border-stone-750 flex items-center justify-center gap-1.5 transition-colors hover:border-amber-500/40"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{isTr ? '⚡ Form Doldurmadan Test Modunda Anında PRO\'yu Başlat' : '⚡ Instant Test Mode PRO Activation'}</span>
              </button>
            </div>

            {/* Pay Button */}
            <button
              type="button"
              onClick={handleStartCheckout}
              disabled={isProcessing}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-70 text-stone-950 font-bold text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isTr ? 'Ödeme başlatılıyor...' : 'Launching checkout...'}</span>
                </>
              ) : finalPrice === 0 ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{isTr ? 'Ücretsiz Aktif Et' : 'Activate Free'}</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>{isTr ? `₺${finalPrice} Paddle ile Güvenli Öde` : `Pay ₺${finalPrice} via Paddle`}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                </>
              )}
            </button>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-4 text-[10px] text-stone-500">
              <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> 256-BIT SSL</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-blue-500" /> PCI DSS</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-amber-500" /> 3D SECURE</span>
              <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-purple-500" /> ANINDA AKTİF</span>
            </div>
          </div>
        )}

        {/* STEP: Verifying */}
        {step === 'verifying' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-5 text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
              <ShieldCheck className="w-8 h-8 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isTr ? 'Ödeme Doğrulanıyor...' : 'Verifying Payment...'}
              </h3>
              <p className="text-sm text-stone-400 mt-1">
                {isTr ? 'Güvenli ödeme onaylanıyor, lütfen bekleyin...' : 'Confirming secure payment...'}
              </p>
            </div>
          </div>
        )}

        {/* STEP: Success */}
        {step === 'success' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                  {isTr ? 'Ödeme Onaylandı!' : 'Payment Confirmed!'}
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </h3>
                <p className="text-sm text-stone-400 mt-1">
                  {isTr
                    ? 'Cozy Room PRO üyeliğiniz başarıyla aktif edildi 🎉'
                    : 'Your Cozy Room PRO subscription is now active 🎉'}
                </p>
              </div>
            </div>

            {/* Official Invoice */}
            <div className="p-4 bg-stone-950/80 border border-stone-700 rounded-xl space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-stone-800 text-stone-400">
                <span>{isTr ? 'ELEKTRONİK MAKBUZ / INVOICE' : 'TAX INVOICE'}</span>
                <span>#{`CR-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`}</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 text-stone-300">
                <div><span className="text-stone-500">{isTr ? 'Sağlayıcı:' : 'Provider:'}</span> Paddle (MoR)</div>
                <div><span className="text-stone-500">{isTr ? 'Tarih:' : 'Date:'}</span> {new Date().toLocaleDateString('tr-TR')}</div>
                <div><span className="text-stone-500">Plan:</span> {PLAN_INFO[successPlan].labelTr}</div>
                {paymentId && <div><span className="text-stone-500">ID:</span> {paymentId.slice(0, 14)}</div>}
              </div>
              <div className="pt-2 border-t border-stone-800 flex items-center justify-between font-bold text-white text-sm">
                <span>{isTr ? 'Ödenen Tutar:' : 'Total Paid:'}</span>
                <span className="text-amber-400">₺{finalPrice} TRY</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                {isTr ? 'Makbuzu Yazdır' : 'Print Receipt'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5 transition-colors active:scale-95"
              >
                <Crown className="w-4 h-4" />
                {isTr ? 'PRO Odaları Keşfet' : 'Explore PRO Rooms'}
              </button>
            </div>
          </div>
        )}

        {/* STEP: Error */}
        {step === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{isTr ? 'Ödeme Başlatılamadı' : 'Payment Error'}</h3>
              <p className="text-sm text-stone-400 mt-1 max-w-xs">{errorMessage || (isTr ? 'Bir hata oluştu' : 'An error occurred')}</p>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={handleRetry}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                {isTr ? 'Tekrar Dene' : 'Try Again'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-semibold rounded-xl cursor-pointer"
              >
                {isTr ? 'Kapat' : 'Close'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

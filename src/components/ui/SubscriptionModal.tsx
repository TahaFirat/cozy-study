import React, { useState } from 'react';
import { 
  Crown, 
  Check, 
  Sparkles, 
  X, 
  ShieldCheck, 
  Zap, 
  Flame, 
  Clock, 
  Volume2, 
  Sliders, 
  Download, 
  HeartHandshake,
  ShieldAlert,
  Lock,
  Users,
  Activity,
  CloudRain,
  Heart,
  Monitor,
  FileText,
  Trophy,
  CheckCircle2,
  Bell,
  Award
} from 'lucide-react';
import { useSubscriptionStore, SubscriptionPlan, PAYWALL_ENABLED } from '../../store/useSubscriptionStore';
import { useAppStore } from '../../store/useAppStore';
import { PRO_FEATURES_CATALOG, ProFeatureItem } from '../../data/proFeatures';
import { CheckoutModal } from './CheckoutModal';

interface SubscriptionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const { isPro, plan, upgradeToPro, cancelPro } = useSubscriptionStore();
  const { language, showToast, activeModal, setActiveModal } = useAppStore();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showCheckout, setShowCheckout] = useState(false);

  const isModalOpen = isOpen !== undefined ? isOpen : activeModal === 'subscription';
  const handleClose = onClose || (() => setActiveModal('none'));

  if (!PAYWALL_ENABLED || !isModalOpen) return null;

  const isTr = language === 'tr';

  const handleSubscribe = () => {
    setShowCheckout(true);
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldAlert': return <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'Flame': return <Flame className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'Lock': return <Lock className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'Users': return <Users className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'Zap': return <Zap className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'Clock': return <Clock className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'Activity': return <Activity className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'Crown': return <Crown className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'CloudRain': return <CloudRain className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'Heart': return <Heart className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'Monitor': return <Monitor className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'FileText': return <FileText className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'Trophy': return <Trophy className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'CheckCircle2': return <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'Download': return <Download className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'Bell': return <Bell className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'Award': return <Award className="w-4 h-4 text-amber-400 shrink-0" />;
      default: return <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />;
    }
  };

  const proFeatures = [
    { icon: <Crown className="w-4 h-4 text-amber-400" />, title: isTr ? 'Tüm Özel Pro Odalar (Kyoto Zen, Cyberpunk Loft, Gothic Library)' : 'All Pro Rooms (Kyoto Zen, Cyberpunk Loft, Gothic Library)' },
    { icon: <Zap className="w-4 h-4 text-amber-400" />, title: isTr ? 'Binaural 40Hz Gamma & 14Hz Beta Odak Frekansları' : 'Binaural 40Hz Gamma & 14Hz Beta Focus Waves' },
    { icon: <Volume2 className="w-4 h-4 text-amber-400" />, title: isTr ? 'Kedi Mırıltısı, Gece Treni & Sayfa Çevirme Ses Kanalları' : 'Cat Purr, Distant Train & Book Page Acoustics' },
    { icon: <Flame className="w-4 h-4 text-amber-400" />, title: isTr ? 'Seri Kalkanı (Streak Freeze) & Seri Sigortası' : 'Streak Freeze & Daily Streak Protection' },
    { icon: <Clock className="w-4 h-4 text-amber-400" />, title: isTr ? 'Gelişmiş Pomodoro Varyasyonları (50/10, 90/20 Ultradian)' : 'Advanced Pomodoro Modes (50/10, 90/20 Ultradian)' },
    { icon: <Sliders className="w-4 h-4 text-amber-400" />, title: isTr ? 'Özel CRT Shaders (Amber Monitör, Yeşil Matrix, GameBoy)' : 'Custom CRT Shaders (Amber, Green Matrix, GameBoy)' },
    { icon: <Download className="w-4 h-4 text-amber-400" />, title: isTr ? 'PDF/CSV Çalışma Raporları & 4K Piksel Duvar Kağıdı İndirme' : 'PDF/CSV Study Reports & 4K Pixel Wallpaper Export' },
    { icon: <Sparkles className="w-4 h-4 text-amber-400" />, title: isTr ? 'Sanal Kedi Özelleştirme (Tekir, Siyah, Beyaz, Calico, Smokey)' : 'Virtual Pet Customization (Tabby, Black, White, Calico, Tuxedo)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-stone-900/95 border border-amber-500/40 rounded-2xl shadow-2xl shadow-amber-950/40 text-stone-100 flex flex-col custom-scrollbar">
        {/* Header Ribbon */}
        <div className="relative p-6 pb-4 border-b border-stone-800 bg-gradient-to-r from-amber-950/40 via-stone-900 to-amber-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl shadow-lg shadow-amber-500/20 text-stone-950">
              <Crown className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Cozy Room <span className="text-amber-400 font-extrabold">PRO</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                  {isTr ? 'Lüks Deneyim' : 'Premium Tier'}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                {isTr 
                  ? '50+ seçkin özellik, sınırsız ambiyans ve bilimsel odaklanma araçları' 
                  : '50+ elite features, unlimited soundscapes, and scientific focus tools'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Current Pro Status banner if already pro */}
          {isPro && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <div>
                  <div className="text-sm font-bold text-emerald-200">
                    {isTr ? 'PRO Üyeliğiniz Aktif!' : 'You have an Active PRO Membership!'}
                  </div>
                  <div className="text-xs text-emerald-400/80">
                    {isTr ? `Mevcut Plan: ${plan.toUpperCase()}` : `Current Plan: ${plan.toUpperCase()}`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  cancelPro();
                  showToast(isTr ? 'PRO aboneliğiniz iptal edildi.' : 'PRO subscription cancelled.', 2500);
                }}
                className="px-3 py-1.5 text-xs text-stone-400 hover:text-red-400 bg-stone-900 border border-stone-700 hover:border-red-500/40 rounded-lg transition-colors cursor-pointer"
              >
                {isTr ? 'Aboneliği İptal Et' : 'Cancel Subscription'}
              </button>
            </div>
          )}

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Monthly */}
            <div 
              onClick={() => setSelectedPlan('monthly')}
              className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                selectedPlan === 'monthly'
                  ? 'bg-amber-950/25 border-amber-500 shadow-lg shadow-amber-950/50'
                  : 'bg-stone-950/40 border-stone-800 hover:border-stone-700'
              }`}
            >
              <div>
                <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  {isTr ? 'Aylık Plan' : 'Monthly Plan'}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">₺29</span>
                  <span className="text-xs text-stone-400">{isTr ? '/ ay' : '/ month'}</span>
                </div>
                <p className="text-xs text-stone-400 mt-2">
                  {isTr ? 'Esnek çalışma, istediğin an tek tıkla iptal et.' : 'Flexible study, cancel anytime with one click.'}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-stone-800 text-xs text-stone-300">
                ✓ {isTr ? 'Tüm 50+ Pro özellik' : 'All 50+ Pro features'}
              </div>
            </div>

            {/* Yearly (Best Value) */}
            <div 
              onClick={() => setSelectedPlan('yearly')}
              className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                selectedPlan === 'yearly'
                  ? 'bg-gradient-to-b from-amber-950/40 to-stone-900 border-amber-400 shadow-xl shadow-amber-950/70 scale-[1.02]'
                  : 'bg-stone-950/40 border-stone-800 hover:border-stone-700'
              }`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 text-[10px] font-black rounded-full uppercase tracking-wider shadow">
                {isTr ? 'EN POPÜLER • %70 TASARRUF' : 'MOST POPULAR • 70% OFF'}
              </div>
              <div>
                <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                  {isTr ? 'Yıllık Plan' : 'Yearly Plan'}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">₺99</span>
                  <span className="text-xs text-stone-400">{isTr ? '/ yıl (~₺8/ay)' : '/ yr'}</span>
                </div>
                <p className="text-xs text-amber-200/80 mt-2">
                  {isTr ? 'En karlı seçenek. 3 adet Seri Kalkanı ve Pro profil hediyeli.' : 'Best value. Includes 3 free Streak Freezes.'}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-amber-500/20 text-xs font-semibold text-amber-300">
                ✓ {isTr ? 'Yıllık Sınırsız Erişim' : 'Unlimited Annual Access'}
              </div>
            </div>

            {/* Lifetime */}
            <div 
              onClick={() => setSelectedPlan('lifetime')}
              className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                selectedPlan === 'lifetime'
                  ? 'bg-amber-950/25 border-amber-500 shadow-lg shadow-amber-950/50'
                  : 'bg-stone-950/40 border-stone-800 hover:border-stone-700'
              }`}
            >
              <div>
                <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  {isTr ? 'Ömür Boyu Tek Sefer' : 'Lifetime Access'}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">₺199</span>
                  <span className="text-xs text-stone-400">{isTr ? 'tek seferlik' : 'one-time'}</span>
                </div>
                <p className="text-xs text-stone-400 mt-2">
                  {isTr ? 'Sonsuza kadar tüm gelecekteki oda ve özelliklere sınırsız erişim.' : 'Lifetime access to all current and future updates.'}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-stone-800 text-xs text-stone-300">
                ✓ {isTr ? 'Ömür Boyu VIP Rozeti' : 'Lifetime VIP Badge'}
              </div>
            </div>
          </div>

          {/* Pro Features Showcase */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isTr ? 'Gelecek PRO Sürüm Ayrıcalıkları (18 Özel Özellik)' : 'Upcoming PRO Privileges (18 Signature Features)'}</span>
                </h3>
                <p className="text-[11px] text-stone-400">
                  {isTr 
                    ? 'Çalışma alışkanlığını ve derin odağı güçlendiren bilimsel & psikolojik araçlar' 
                    : 'Scientifically backed tools designed to induce and protect flow state'}
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {[
                  { id: 'all', labelTr: 'Tümü', labelEn: 'All' },
                  { id: 'discipline', labelTr: '🎯 Disiplin', labelEn: '🎯 Discipline' },
                  { id: 'neuroscience', labelTr: '🧠 Nöro-Akustik', labelEn: '🧠 Neuro' },
                  { id: 'ambience', labelTr: '🌿 Ambiyans', labelEn: '🌿 Ambience' },
                  { id: 'analytics', labelTr: '📊 Karne', labelEn: '📊 Reports' },
                  { id: 'gamification', labelTr: '🎮 RPG', labelEn: '🎮 RPG' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeCategory === cat.id
                        ? 'bg-amber-500 text-stone-950 shadow-sm'
                        : 'bg-stone-800/80 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {isTr ? cat.labelTr : cat.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(activeCategory === 'all' 
                ? PRO_FEATURES_CATALOG 
                : PRO_FEATURES_CATALOG.filter((f) => f.category === activeCategory)
              ).map((f) => (
                <div 
                  key={f.id} 
                  className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800/80 hover:border-amber-500/40 transition-all flex flex-col justify-between group shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {renderIcon(f.icon)}
                        <span className="text-xs font-bold text-amber-200 truncate">
                          {isTr ? f.titleTr : f.titleEn}
                        </span>
                      </div>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                        f.badge === 'BİLİMSEL'
                          ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                          : f.badge === 'DİSİPLİN'
                          ? 'bg-red-500/15 text-red-300 border-red-500/30'
                          : f.badge === 'LÜKS'
                          ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}>
                        {f.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      {isTr ? f.descTr : f.descEn}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-stone-800/60 text-[10px] bg-stone-900/50 -mx-1 -mb-1 p-2 rounded-lg">
                    <span className="text-amber-400 font-semibold">{isTr ? '💡 Neden Çalışmaya Sevk Eder? ' : '💡 Why it Drives Focus: '}</span>
                    <span className="italic text-stone-300">{isTr ? f.motivationTr : f.motivationEn}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action CTA */}
          <div className="pt-2 flex flex-col items-center gap-3">
            <button
              onClick={handleSubscribe}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 shadow-xl shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 transform active:scale-[0.99]"
            >
              <Crown className="w-4 h-4 fill-stone-950" />
              <span>
                {isTr 
                  ? `${selectedPlan === 'yearly' ? 'Yıllık Planla Başla (7 Gün Ücretsiz)' : 'Güvenli Ödemeye Geç'}` 
                  : 'Proceed to Secure Checkout'}
              </span>
            </button>
            <div className="flex items-center gap-4 text-[11px] text-stone-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {isTr ? '256-Bit SSL Güvenli Ödeme' : '256-Bit SSL Secure'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <HeartHandshake className="w-3.5 h-3.5 text-amber-400" />
                {isTr ? '14 Gün Koşulsuz İade Garantisi' : '14-Day Money Back Guarantee'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Realistic Checkout & Multi-step Payment Modal */}
      {showCheckout && (
        <CheckoutModal
          isOpen={showCheckout}
          selectedPlan={selectedPlan}
          onClose={() => {
            setShowCheckout(false);
            handleClose();
          }}
        />
      )}
    </div>
  );
};

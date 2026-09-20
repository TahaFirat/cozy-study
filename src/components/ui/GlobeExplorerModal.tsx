import React, { useState } from 'react';
import { Globe, X, RotateCw, BookOpen, MapPin, Award } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useGamificationStore } from '../../store/useGamificationStore';
import { webAudioEngine } from '../../audio/WebAudioEngine';

interface DiscoveryItem {
  region: string;
  title: string;
  quote: string;
  author: string;
  fact: string;
}

const DISCOVERIES_TR: DiscoveryItem[] = [
  {
    region: 'Antik İpek Yolu',
    title: 'Semerkant ve Çöl Kervanları',
    quote: 'Yolculuk sadece yeni manzaralar görmek değil, yeni gözlerle bakabilmektir.',
    author: 'Marcel Proust',
    fact: 'Tarihi kütüphanelerdeki yer küreler, 16. yüzyılda pirinç ve elle boyanmış parşömenlerle denizcilerin rotalarını çizmek için tasarlanırdı.',
  },
  {
    region: 'Büyük Okyanus & Polinezya',
    title: 'Yıldız Pusulaları ve Pasifik Kaşifleri',
    quote: 'Deniz sakin olduğunda herkes dümenci olabilir; fırtınalarda ise sadece kararlı olanlar yol bulur.',
    author: 'Antik Denizci Atasözü',
    fact: 'Eski denizciler hiçbir alet olmadan, yalnızca okyanus dalgalarının kırılma yönü ve yıldızların pozisyonuyla binlerce mil yol katetti.',
  },
  {
    region: 'İskenderiye Kütüphanesi',
    title: 'Eratosthenes ve Dünyanın Çevresi',
    quote: 'Bilgiye aç bir zihin, en geniş okyanuslardan daha derindir.',
    author: 'Eratosthenes (M.Ö. 240)',
    fact: 'Eratosthenes, yalnızca bir çubuğun gölge boyunu ve kuyudaki güneş ışığını ölçerek Dünya\'nın çevresini %98 doğrulukla hesaplamıştır.',
  },
  {
    region: 'Kyoto & Fuji Dağı',
    title: 'Sisli Çam Ormanları ve Zen Felsefesi',
    quote: 'Zihnin berraklığı, sakin bir gölün yüzeyi gibidir. Dalgalanma durduğunda derinlikler görünür.',
    author: 'Zen Öğretisi',
    fact: 'Antik Japon haritacıları, haritaları sadece coğrafya için değil, gezginin ruhsal dinginliği için de bir sanat eseri olarak çizerlerdi.',
  },
  {
    region: 'Alp Dağları & Buzullar',
    title: 'Yüksek Zirveler ve Dağ Sığınakları',
    quote: 'Dağlar çağırdığında gitmelisin; çünkü yükseklerde yalnızca rüzgarın ve kendi düşüncelerinin sesi kalır.',
    author: 'John Muir',
    fact: 'Dağlardaki eski ahşap kulübeler, gezginlerin ateş başında kitap okuyup dinlenmesi için yüzyıllardır sığınak olmuştur.',
  },
];

const DISCOVERIES_EN: DiscoveryItem[] = [
  {
    region: 'Ancient Silk Road',
    title: 'Samarkand & Caravans of the Dunes',
    quote: 'The real voyage of discovery consists not in seeking new landscapes, but in having new eyes.',
    author: 'Marcel Proust',
    fact: 'Antique terrestrial globes in 16th-century grand libraries were hand-engraved on brass to chart uncharted trade winds.',
  },
  {
    region: 'Pacific Ocean & Polynesia',
    title: 'Wayfinders & Star Compasses',
    quote: 'Anyone can hold the helm when the sea is calm; only perseverance guides ships through storms.',
    author: 'Ancient Maritime Proverb',
    fact: 'Polynesian navigators crossed thousands of open ocean miles using only wave swells, flight patterns of birds, and star paths.',
  },
  {
    region: 'Library of Alexandria',
    title: 'Eratosthenes & The Earth\'s Measure',
    quote: 'A mind hungry for wisdom is deeper than the broadest seas.',
    author: 'Eratosthenes (240 BC)',
    fact: 'Using just the shadow of a stick and sunlight in a well, Eratosthenes calculated the circumference of the Earth with 98% accuracy.',
  },
  {
    region: 'Kyoto & Mount Fuji',
    title: 'Mist-Covered Pines & Zen Stillness',
    quote: 'Clarity of mind is like the surface of a quiet lake; when the ripples settle, the depths become visible.',
    author: 'Zen Wisdom',
    fact: 'Classical Japanese cartographers crafted maps not only as guides through territory, but as meditative artworks of reflection.',
  },
  {
    region: 'The Swiss Alps',
    title: 'High Peaks & Alpine Sanctuaries',
    quote: 'The mountains are calling and I must go; in the quiet altitudes, clarity returns.',
    author: 'John Muir',
    fact: 'Timber mountain retreats have served as scholarly sanctuaries for centuries, sheltering thinkers beside roaring fireplaces.',
  },
];

export const GlobeExplorerModal: React.FC = () => {
  const { activeModal, setActiveModal, language, showToast } = useAppStore();
  const { addXp } = useGamificationStore();
  const [index, setIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasClaimedXp, setHasClaimedXp] = useState(false);

  if (activeModal !== 'globe_explorer') return null;

  const isTr = language === 'tr';
  const list = isTr ? DISCOVERIES_TR : DISCOVERIES_EN;
  const current = list[index % list.length];

  const handleSpin = () => {
    webAudioEngine.init();
    webAudioEngine.playChime('wood_block');
    setIsSpinning(true);
    setTimeout(() => {
      setIndex((prev) => prev + 1);
      setIsSpinning(false);
      showToast(isTr ? '🌍 Küre döndürüldü! Yeni bir keşif açıldı.' : '🌍 Globe spun! New discovery revealed.', 2000);
    }, 600);
  };

  const handleClaimXp = () => {
    if (hasClaimedXp) return;
    addXp(15);
    setHasClaimedXp(true);
    webAudioEngine.playChime('singing_bowl');
    showToast(isTr ? '✨ +15 Odaklanma XP ve Bilgelik kazanıldı!' : '✨ +15 Focus XP & Wisdom earned!', 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
      <div className="relative w-full max-w-lg bg-stone-900 border border-amber-600/50 rounded-2xl shadow-2xl p-6 text-stone-100 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Globe className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-200 flex items-center gap-2">
                <span>{isTr ? 'Antika Yer Küresi' : 'Antique Terrestrial Globe'}</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-500/40">
                  {isTr ? 'Keşif & İlham' : 'Discovery & Inspiration'}
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                {isTr ? 'Kütüphanenin asırlık pirinç küresiyle dünyayı dolaş' : 'Traverse continents with the library\'s centuries-old globe'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Discovery Card */}
        <div className="p-4 rounded-xl bg-stone-950/60 border border-amber-900/40 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold tracking-wide">
              <MapPin className="w-3.5 h-3.5" />
              {current.region}
            </span>
            <span className="text-[10px] text-stone-500 font-mono">
              #{index + 1} / {list.length}
            </span>
          </div>

          <h4 className="text-sm font-bold text-stone-100">{current.title}</h4>

          {/* Inspirational Quote */}
          <blockquote className="italic text-xs text-amber-200/90 border-l-2 border-amber-500/60 pl-3 py-1 bg-amber-950/20 rounded-r-lg">
            "{current.quote}"
            <div className="text-[10px] text-stone-400 font-sans not-italic text-right mt-1 font-semibold">
              — {current.author}
            </div>
          </blockquote>

          {/* Historical Fact */}
          <div className="text-xs text-stone-300 leading-relaxed flex items-start gap-2 pt-1 border-t border-stone-800/60">
            <BookOpen className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>{current.fact}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{isTr ? 'Küreye Dokun ve Çevir' : 'Spin the Globe'}</span>
          </button>

          <button
            onClick={handleClaimXp}
            disabled={hasClaimedXp}
            className={`flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
              hasClaimedXp
                ? 'bg-stone-800/60 border-stone-700 text-stone-400 cursor-default'
                : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-700/60 cursor-pointer'
            }`}
          >
            <Award className="w-4 h-4 text-emerald-400" />
            <span>{hasClaimedXp ? (isTr ? 'XP Alındı' : 'Claimed') : '+15 XP'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

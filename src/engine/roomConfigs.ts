import { RoomId, InteractiveObjectId } from '../types';
import { Hotspot } from './types';

export interface CozySpot {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  facing: 1 | -1;
}

export interface InpaintingPatch {
  x: number;
  y: number;
  w: number;
  h: number;
  imageSrc: string;
}

export interface RoomConfig {
  id: RoomId;
  imageSrc: string;
  windowBounds: { x: number; y: number; w: number; h: number };
  windowPolygon?: { x: number; y: number }[];
  windowPanes?: { x: number; y: number; w: number; h: number }[];
  hearth?: { x: number; y: number; w: number; h: number };
  lamp: { x: number; y: number; radius: number; color: string };
  mug?: { x: number; y: number };
  cat: { x: number; y: number; w: number; h: number };
  catBreed?: 'calico' | 'tabby';
  cozySpots?: CozySpot[];
  inpaintingPatch?: InpaintingPatch;
  stickyNote?: { x: number; y: number; w: number; h: number; rot?: number };
  trophyShelf?: { x: number; y: number };
  trophyDesk?: { x: number; y: number };
  hotspots: Hotspot[];
}

export const ROOM_CONFIGS: Record<RoomId, RoomConfig> = {
  bedroom: {
    id: 'bedroom',
    imageSrc: '/rooms/bedroom.jpg',
    // Strict balcony window: begins at x: 152 (right of the bookshelf/pillar) down to sill at y: 360
    windowBounds: { x: 152, y: 0, w: 193, h: 360 },
    windowPanes: [
      { x: 152, y: 0, w: 70, h: 360 },   // Left sliding balcony glass (x: 152..222)
      { x: 230, y: 0, w: 115, h: 360 },  // Right sliding balcony glass (x: 230..345)
    ],
    windowPolygon: [
      { x: 152, y: 0 },
      { x: 345, y: 0 },
      { x: 345, y: 360 },
      { x: 152, y: 360 },
    ],
    hearth: { x: 840, y: 290, w: 105, h: 100 },
    lamp: { x: 410, y: 250, radius: 150, color: 'rgba(253, 224, 71, 0.25)' },
    mug: { x: 598, y: 375 },
    cat: { x: 845, y: 465, w: 100, h: 60 },
    catBreed: 'tabby',
    inpaintingPatch: { x: 719, y: 387, w: 188, h: 120, imageSrc: '/rooms/patches/bedroom_rug.png' },
    cozySpots: [
      { id: 'rug_hearth', name: 'Hearth Persian Rug', x: 845, y: 465, w: 90, h: 55, facing: -1 },
      { id: 'bed_foot', name: 'Foot of the Bed', x: 230, y: 440, w: 90, h: 55, facing: 1 },
      { id: 'desk_mat', name: 'Study Desk Rug', x: 500, y: 440, w: 90, h: 55, facing: 1 },
    ],
    hotspots: [
      { id: 'window', name: 'Rainy City Window', nameTr: 'Yağmurlu Şehir Balkon Penceresi', hint: 'Change weather & time of day', hintTr: 'Hava durumu ve saat ayarını aç', x: 152, y: 0, w: 193, h: 360 },
      { id: 'lamp', name: 'Brass Desk Lamp', nameTr: 'Pirinç Çalışma Lambası', hint: 'Toggle light (L)', hintTr: 'Işığı aç/kapat (L)', x: 375, y: 220, w: 100, h: 160 },
      { id: 'mug', name: 'Hot Coffee Mug', nameTr: 'Sıcak Kahve Kupası', hint: 'Take a warm sip', hintTr: 'Sıcak bir yudum al', x: 575, y: 360, w: 50, h: 55 },
      { id: 'notebook', name: 'Study Notebook', nameTr: 'Çalışma Not Defteri & Günlük', hint: 'Open study journal', hintTr: 'Çalışma günlüğünü aç', x: 420, y: 395, w: 130, h: 50 },
      { id: 'radio', name: 'Cassette Player', nameTr: 'Nostaljik Kasetçalar', hint: 'Play/pause lo-fi (P)', hintTr: 'Lo-Fi müziği çal/duraklat (P)', x: 625, y: 345, w: 100, h: 60 },
      { id: 'fireplace', name: 'Stone Fireplace', nameTr: 'Taş Şömine', hint: 'Stoke hearth flames (F)', hintTr: 'Şömine ateşini canlandır (F)', x: 800, y: 230, w: 155, h: 180 },
      { id: 'clock', name: 'Mantel Clock', nameTr: 'Şömine Üstü Antika Saat', hint: 'Open focus timer', hintTr: 'Odak sayacını aç', x: 885, y: 175, w: 50, h: 45 },
      { id: 'bookshelf', name: 'Mahogany Bookshelf', nameTr: 'Mahun Kitaplık', hint: 'View study statistics', hintTr: 'Çalışma istatistiklerini gör', x: 430, y: 40, w: 390, h: 310 },
      { id: 'cat', name: 'Sleeping Tabby Cat', nameTr: 'Uyuyan Tekir Kedi', hint: 'Pet your companion', hintTr: 'Dostunu sev 🐾', x: 800, y: 435, w: 100, h: 65 },
      { id: 'plant', name: 'Window Ivy Plant', nameTr: 'Pencere Önü Sarmaşığı', hint: 'Room growth & unlocks', hintTr: 'Oda gelişimini ve kilitleri gör', x: 135, y: 370, w: 75, h: 150 },
    ]
  },
  apartment: {
    id: 'apartment',
    imageSrc: '/rooms/apartment.jpg',
    // Full panoramic Tokyo city window: strictly outside, stopping above manga shelf & desk
    windowBounds: { x: 104, y: 0, w: 401, h: 380 },
    windowPanes: [
      { x: 104, y: 0, w: 241, h: 380 },  // Main panoramic window (x: 104..345)
      { x: 360, y: 0, w: 145, h: 220 },  // Right upper window above desk (x: 360..505, y: 0..220)
    ],
    windowPolygon: [
      { x: 104, y: 0 },
      { x: 505, y: 0 },
      { x: 505, y: 380 },
      { x: 104, y: 380 },
    ],
    lamp: { x: 590, y: 140, radius: 140, color: 'rgba(254, 240, 138, 0.25)' },
    mug: { x: 775, y: 275 },
    cat: { x: 210, y: 445, w: 100, h: 60 },
    catBreed: 'calico',
    inpaintingPatch: { x: 160, y: 408, w: 181, h: 127, imageSrc: '/rooms/patches/apartment_cushion.png' },
    cozySpots: [
      { id: 'tatami_cushion', name: 'Floor Cushion', x: 210, y: 445, w: 95, h: 55, facing: 1 },
      { id: 'desk_side', name: 'Desk Mat', x: 530, y: 445, w: 95, h: 55, facing: -1 },
      { id: 'window_edge', name: 'Tokyo Skyline Window', x: 270, y: 355, w: 90, h: 55, facing: 1 },
    ],
    hotspots: [
      { id: 'window', name: 'Shinjuku Rainy Window', nameTr: 'Shinjuku Yağmurlu Şehir Penceresi', hint: 'Change weather & time of day', hintTr: 'Hava durumu ve saat ayarını aç', x: 104, y: 0, w: 401, h: 380 },
      { id: 'lamp', name: 'Gooseneck Desk Lamp', nameTr: 'Akrobat Masa Lambası', hint: 'Toggle light (L)', hintTr: 'Işığı aç/kapat (L)', x: 550, y: 100, w: 80, h: 130 },
      { id: 'mug', name: 'Green Tea Mug', nameTr: 'Sıcak Yeşil Çay', hint: 'Take a warm sip', hintTr: 'Sıcak bir yudum al', x: 755, y: 260, w: 45, h: 45 },
      { id: 'notebook', name: 'Lofi Code Journal', nameTr: 'Kodlama Günlüğü & Notlar', hint: 'Open study journal', hintTr: 'Çalışma günlüğünü aç', x: 520, y: 235, w: 75, h: 35 },
      { id: 'clock', name: 'Workstation Code Screen', nameTr: 'Kodlama Monitörü (Odak Sayacı)', hint: 'Open focus timer', hintTr: 'Odak sayacını / Pomodoro\'yu aç', x: 650, y: 125, w: 110, h: 80 },
      { id: 'bookshelf', name: 'Manga Bookshelf', nameTr: 'Manga ve Figür Kitaplığı', hint: 'View study statistics', hintTr: 'Çalışma istatistiklerini gör', x: 0, y: 230, w: 155, h: 310 },
      { id: 'cat', name: 'Sleeping Calico Cat', nameTr: 'Minderdeki Kaliko Kedi', hint: 'Pet your companion', hintTr: 'Dostunu sev 🐾', x: 160, y: 415, w: 100, h: 65 },
      { id: 'plant', name: 'Potted Monstera Plant', nameTr: 'Saksıda Monstera Bitkisi', hint: 'Room growth & unlocks', hintTr: 'Oda gelişimini ve kilitleri gör', x: 805, y: 240, w: 155, h: 290 },
    ]
  },
  cabin: {
    id: 'cabin',
    imageSrc: '/rooms/cabin.jpg',
    // Natural window boundaries wrapping the glass panes cleanly above desk/laptop (x: 68..388, y: 96..345)
    windowBounds: { x: 68, y: 96, w: 320, h: 249 },
    // Strictly calibrated glass panes ending precisely before the timber frame at x = 388
    // Note: The right pane starts at y: 185 because above y: 185 is the solid wooden log header!
    windowPanes: [
      { x: 68, y: 96, w: 68, h: 249 },    // Left pane (x: 68..136, y: 96..345)
      { x: 146, y: 96, w: 190, h: 249 },  // Center mountain pane (x: 146..336, y: 96..345)
      { x: 352, y: 185, w: 36, h: 160 },  // Right pane (x: 352..388, y: 185..345)
    ],
    windowPolygon: [
      { x: 68, y: 96 },
      { x: 338, y: 96 },
      { x: 338, y: 185 },
      { x: 388, y: 185 },
      { x: 388, y: 345 },
      { x: 68, y: 345 },
    ],
    // Calibrated glowing hearth flame bounds based on pixel luminosity scan
    hearth: { x: 695, y: 265, w: 140, h: 145 },
    lamp: { x: 505, y: 245, radius: 140, color: 'rgba(251, 191, 36, 0.25)' },
    mug: { x: 445, y: 380 },
    cat: { x: 700, y: 415, w: 100, h: 65 },
    catBreed: 'tabby',
    inpaintingPatch: { x: 642, y: 373, w: 251, h: 162, imageSrc: '/rooms/patches/cabin_rug.png' },
    cozySpots: [
      { id: 'hearth_rug', name: 'Fireside Braided Rug', x: 770, y: 465, w: 95, h: 55, facing: -1 },
      { id: 'timber_armchair', name: 'Cabin Armchair Cushion', x: 90, y: 452, w: 95, h: 55, facing: 1 },
      { id: 'center_plank', name: 'Cozy Floor Planks', x: 410, y: 475, w: 95, h: 55, facing: 1 },
    ],
    hotspots: [
      { id: 'window', name: 'Snowy Alpine Window', nameTr: 'Karlı Dağ Manzaralı Ahşap Pencere', hint: 'Change weather & time of day', hintTr: 'Hava durumu ve saat ayarını aç', x: 68, y: 96, w: 320, h: 249 },
      { id: 'lamp', name: 'Kerosene Lantern', nameTr: 'Klasik Gaz Lambası', hint: 'Toggle light (L)', hintTr: 'Işığı aç/kapat (L)', x: 490, y: 350, w: 50, h: 90 },
      { id: 'mug', name: 'Hot Cocoa Mug', nameTr: 'Sıcak Çikolata Kupası', hint: 'Take a warm sip', hintTr: 'Sıcak bir yudum al', x: 420, y: 360, w: 55, h: 65 },
      { id: 'notebook', name: 'Cabin Journal', nameTr: 'Kütük Ev Günlüğü', hint: 'Open study journal', hintTr: 'Çalışma günlüğünü aç', x: 340, y: 410, w: 75, h: 45 },
      { id: 'clock', name: 'Alpine Laptop Screen', nameTr: 'Dağ Evi Dizüstü Bilgisayarı (Odak Sayacı)', hint: 'Open focus timer', hintTr: 'Odak sayacını / Pomodoro\'yu aç', x: 275, y: 335, w: 110, h: 70 },
      { id: 'fireplace', name: 'Stone Cabin Hearth', nameTr: 'Taş Dağ Şöminesi', hint: 'Stoke hearth flames (F)', hintTr: 'Şömine ateşini canlandır (F)', x: 670, y: 200, w: 250, h: 220 },
      { id: 'cat', name: 'Hearthside Sleeping Cat', nameTr: 'Şömine Başında Uyuyan Kedi', hint: 'Pet your companion', hintTr: 'Dostunu sev 🐾', x: 700, y: 415, w: 100, h: 65 },
      { id: 'bookshelf', name: 'Timber Shelves', nameTr: 'Ahşap Raf Kitaplık', hint: 'View study statistics', hintTr: 'Çalışma istatistiklerini gör', x: 435, y: 275, w: 110, h: 110 },
      { id: 'chair', name: 'Handcrafted Cabin Armchair', nameTr: 'Ahşap Dağ Koltuğu', hint: 'Cozy study seat & progression', hintTr: 'Oda gelişimini ve kilitleri gör', x: 10, y: 340, w: 130, h: 190 },
      { id: 'plant', name: 'Pine Needle Garland', nameTr: 'Çam İğnesi Çelengi', hint: 'Room growth & unlocks', hintTr: 'Oda gelişimini gör', x: 100, y: 70, w: 230, h: 48 },
    ]
  },
  library: {
    id: 'library',
    imageSrc: '/rooms/library.jpg',
    // Strict gothic arched glass window (full arch width x: 92..260 down to sill at y: 400)
    windowBounds: { x: 92, y: 50, w: 168, h: 350 },
    windowPanes: [
      { x: 94, y: 140, w: 74, h: 260 },   // Left clear pane (x: 94..168, y: 140..400)
      { x: 178, y: 140, w: 74, h: 260 },  // Right clear pane (x: 178..252, y: 140..400)
    ],
    windowPolygon: [
      { x: 92, y: 140 },
      { x: 175, y: 50 },
      { x: 260, y: 140 },
      { x: 260, y: 400 },
      { x: 92, y: 400 },
    ],
    hearth: { x: 905, y: 350, w: 50, h: 65 },
    lamp: { x: 550, y: 300, radius: 140, color: 'rgba(74, 222, 128, 0.25)' },
    cat: { x: 710, y: 410, w: 110, h: 70 },
    catBreed: 'tabby',
    stickyNote: { x: 365, y: 355, w: 42, h: 36, rot: 3 },
    trophyShelf: { x: 865, y: 180 },
    trophyDesk: { x: 480, y: 355 },
    cozySpots: [
      { id: 'armchair', name: 'Mahogany Armchair', x: 710, y: 410, w: 90, h: 55, facing: -1 },
      { id: 'stacks_rug', name: 'Book Stacks Rug', x: 460, y: 440, w: 90, h: 55, facing: 1 },
      { id: 'globe_corner', name: 'Brass Globe Corner', x: 280, y: 430, w: 90, h: 55, facing: 1 },
    ],
    hotspots: [
      { id: 'window', name: 'Gothic Stained Window', nameTr: 'Gotik Kemerli Vitray Pencere', hint: 'Change weather & time of day', hintTr: 'Hava durumu ve saat ayarını aç', x: 92, y: 50, w: 168, h: 350 },
      { id: 'lamp', name: 'Banker\'s Green Lamp', nameTr: 'Yeşil Banker Çalışma Lambası', hint: 'Toggle light (L)', hintTr: 'Işığı aç/kapat (L)', x: 535, y: 305, w: 85, h: 95 },
      { id: 'notebook', name: 'Scholarly Folio & Inkwell', nameTr: 'Akademik Notlar & Mürekkep Hokkası', hint: 'Open study journal', hintTr: 'Çalışma günlüğünü aç', x: 435, y: 385, w: 175, h: 75 },
      { id: 'clock', name: 'Antique Mantel Clock', nameTr: 'Şömine Üstü Antika Saat', hint: 'Open focus timer', hintTr: 'Odak sayacını aç', x: 870, y: 220, w: 40, h: 40 },
      { id: 'bookshelf', name: 'Mahogany Book Stacks', nameTr: 'Dev Mahun Kitap Dolapları', hint: 'View study statistics', hintTr: 'Çalışma istatistiklerini gör', x: 350, y: 100, w: 460, h: 230 },
      { id: 'cat', name: 'Armchair Sleeping Cat', nameTr: 'Kadife Koltukta Uyuyan Kedi', hint: 'Pet your companion', hintTr: 'Dostunu sev 🐾', x: 740, y: 440, w: 100, h: 65 },
      { id: 'globe', name: 'Antique Brass Globe', nameTr: 'Tarihi Pirinç Yer Küresi', hint: 'Explore world & get inspired', hintTr: 'Dünyayı keşfet & ilham al 🌍', x: 270, y: 350, w: 100, h: 120 },
      { id: 'fireplace', name: 'Gothic Hearth Fireplace', nameTr: 'Gotik Taş Şömine', hint: 'Stoke hearth flames (F)', hintTr: 'Şömine ateşini canlandır (F)', x: 890, y: 330, w: 70, h: 100 },
    ]
  },
  cafe: {
    id: 'cafe',
    imageSrc: '/rooms/cafe.jpg',
    // Floor-to-ceiling streetfront window + booth window
    windowBounds: { x: 0, y: 0, w: 417, h: 540 },
    windowPanes: [
      { x: 0, y: 0, w: 212, h: 540 },    // Giant streetlamp storefront window (stops at door frame x: 212)
      { x: 252, y: 0, w: 165, h: 260 },  // Booth window above leather bench (x: 252..417, y: 0..260)
    ],
    windowPolygon: [
      { x: 0, y: 0 },
      { x: 417, y: 0 },
      { x: 417, y: 540 },
      { x: 0, y: 540 },
    ],
    lamp: { x: 430, y: 190, radius: 150, color: 'rgba(251, 191, 36, 0.3)' },
    mug: { x: 645, y: 365 },
    cat: { x: 450, y: 395, w: 115, h: 70 },
    catBreed: 'tabby',
    cozySpots: [
      { id: 'leather_bench', name: 'Leather Bench', x: 450, y: 395, w: 90, h: 55, facing: 1 },
      { id: 'counter_rug', name: 'Sunlit Counter Rug', x: 310, y: 440, w: 90, h: 55, facing: 1 },
      { id: 'turntable_area', name: 'Turntable Rug', x: 630, y: 440, w: 90, h: 55, facing: -1 },
    ],
    hotspots: [
      { id: 'window', name: 'Street Rain Window', nameTr: 'Cadde Yağmur Vitrini', hint: 'Change weather & time of day', hintTr: 'Hava durumu ve saat ayarını aç', x: 0, y: 0, w: 417, h: 540 },
      { id: 'lamp', name: 'Edison Filament Bulb', nameTr: 'Sallanan Edison Flaman Ampulü', hint: 'Toggle light (L)', hintTr: 'Işığı aç/kapat (L)', x: 395, y: 130, w: 70, h: 120 },
      { id: 'mug', name: 'Espresso Cup', nameTr: 'Sıcak Espresso Fincanı', hint: 'Take a warm sip', hintTr: 'Sıcak bir yudum al', x: 625, y: 350, w: 45, h: 45 },
      { id: 'radio', name: 'Vinyl Turntable', nameTr: 'Pikap & Plak Çalar', hint: 'Play/pause lo-fi (P)', hintTr: 'Lo-Fi cazı çal/duraklat (P)', x: 645, y: 190, w: 115, h: 90 },
      { id: 'notebook', name: 'Cafe Laptop Journal', nameTr: 'Kafe Dizüstü Bilgisayarı & Günlük', hint: 'Open study journal', hintTr: 'Çalışma günlüğünü aç', x: 705, y: 315, w: 80, h: 80 },
      { id: 'clock', name: 'Chalkboard Specials Menu', nameTr: 'Caz Kafe Günün Menüsü Panosu (Odak Sayacı)', hint: 'Open focus timer', hintTr: 'Odak sayacını / Pomodoro\'yu aç', x: 650, y: 65, w: 170, h: 115 },
      { id: 'cat', name: 'Leather Bench Cat', nameTr: 'Deri Koltukta Uyuyan Kedi', hint: 'Pet your companion', hintTr: 'Dostunu sev 🐾', x: 450, y: 395, w: 115, h: 70 },
      { id: 'bookshelf', name: 'Vinyl Records Shelf', nameTr: 'Nostaljik Plak ve Kitap Rafı', hint: 'View study statistics', hintTr: 'Çalışma istatistiklerini gör', x: 485, y: 155, w: 100, h: 120 },
    ]
  },
  kyoto_zen: {
    id: 'kyoto_zen',
    imageSrc: '/rooms/kyoto_zen.jpg',
    windowBounds: { x: 624, y: 70, w: 288, h: 300 },
    windowPanes: [
      { x: 624, y: 70, w: 288, h: 300 },
    ],
    windowPolygon: [
      { x: 624, y: 70 },
      { x: 912, y: 70 },
      { x: 912, y: 370 },
      { x: 624, y: 370 },
    ],
    lamp: { x: 215, y: 190, radius: 150, color: 'rgba(253, 224, 71, 0.35)' },
    mug: { x: 180, y: 345 },
    cat: { x: 350, y: 445, w: 100, h: 60 },
    catBreed: 'calico',
    inpaintingPatch: { x: 255, y: 373, w: 192, h: 130, imageSrc: '/rooms/patches/kyoto_cushion.png' },
    cozySpots: [
      { id: 'indigo_cushion', name: 'Indigo Zabuton Cushion', x: 350, y: 445, w: 95, h: 55, facing: 1 },
      { id: 'engawa_porch', name: 'Engawa Veranda Planks', x: 570, y: 430, w: 95, h: 55, facing: 1 },
      { id: 'garden_edge', name: 'Zen Garden Border', x: 740, y: 420, w: 95, h: 55, facing: -1 },
    ],
    hotspots: [
      { id: 'window', name: 'Bamboo Rain Garden', nameTr: 'Bambu Yağmur Bahçesi', hint: 'Change weather & time of day', hintTr: 'Hava durumu ve saat ayarını aç', x: 624, y: 70, w: 288, h: 300 },
      { id: 'lamp', name: 'Washi Paper Lantern', nameTr: 'Geleneksel Washi Kağıt Feneri', hint: 'Toggle light (L)', hintTr: 'Işığı aç/kapat (L)', x: 165, y: 80, w: 100, h: 180 },
      { id: 'mug', name: 'Matcha Tea Bowl', nameTr: 'Sıcak Matcha Çayı', hint: 'Take a warm sip', hintTr: 'Sıcak bir yudum al', x: 155, y: 325, w: 55, h: 55 },
      { id: 'notebook', name: 'Calligraphy Folio', nameTr: 'Kaligrafi Çalışma Defteri', hint: 'Open study journal', hintTr: 'Çalışma günlüğünü aç', x: 215, y: 330, w: 130, h: 55 },
      { id: 'cat', name: 'Cushion Calico Cat', nameTr: 'İpek Minder Kedisi', hint: 'Pet your companion', hintTr: 'Dostunu sev 🐾', x: 300, y: 415, w: 100, h: 65 },
      { id: 'plant', name: 'Zen Rock & Bamboo', nameTr: 'Zen Kayası ve Bambu', hint: 'Room growth & progression', hintTr: 'Oda gelişimini ve kilitleri gör', x: 650, y: 100, w: 200, h: 250 },
    ]
  },
  cyberpunk_loft: {
    id: 'cyberpunk_loft',
    imageSrc: '/rooms/cyberpunk_loft.jpg',
    // Floor-to-ceiling balcony glass (stops at interior floor y: 445 and desk x: 512)
    windowBounds: { x: 418, y: 40, w: 542, h: 405 },
    windowPanes: [
      { x: 512, y: 40, w: 448, h: 405 },  // Main floor-to-ceiling glass (x: 512..960, y: 40..445)
      { x: 418, y: 110, w: 94, h: 140 },  // Upper window above desk (x: 418..512, y: 110..250)
    ],
    windowPolygon: [
      { x: 418, y: 40 },
      { x: 960, y: 40 },
      { x: 960, y: 445 },
      { x: 418, y: 445 },
    ],
    lamp: { x: 145, y: 270, radius: 160, color: 'rgba(244, 114, 182, 0.3)' },
    mug: { x: 245, y: 355 },
    cat: { x: 65, y: 395, w: 130, h: 80 },
    catBreed: 'tabby',
    cozySpots: [
      { id: 'neon_chair', name: 'Armchair', x: 65, y: 395, w: 90, h: 55, facing: 1 },
      { id: 'terminal_floor', name: 'Terminal Mat', x: 290, y: 450, w: 90, h: 55, facing: 1 },
      { id: 'balcony_floor', name: 'Skyline Balcony Edge', x: 530, y: 450, w: 90, h: 55, facing: -1 },
    ],
    hotspots: [
      { id: 'window', name: 'Neo-Tokyo Rainy Skyline', nameTr: 'Neo-Tokyo Yağmurlu Gökdelen Manzarası', hint: 'Change weather & time of day', hintTr: 'Hava durumu ve saat ayarını aç', x: 418, y: 40, w: 542, h: 405 },
      { id: 'lamp', name: 'Warm Floor Lamp', nameTr: 'Neon Zemin Lambası', hint: 'Toggle light (L)', hintTr: 'Işığı aç/kapat (L)', x: 120, y: 230, w: 55, h: 140 },
      { id: 'clock', name: 'Code Terminal HUD', nameTr: 'Siber Kodlama Terminali (Odak Sayacı)', hint: 'Open focus timer', hintTr: 'Odak sayacını / Pomodoro\'yu aç', x: 215, y: 240, w: 130, h: 90 },
      { id: 'notebook', name: 'Holographic Monitor', nameTr: 'Holografik Çalışma Ekranı', hint: 'Open study journal', hintTr: 'Çalışma günlüğünü aç', x: 345, y: 240, w: 130, h: 90 },
      { id: 'mug', name: 'Synth-Coffee Mug', nameTr: 'Sentetik Kahve Kupası', hint: 'Take a warm sip', hintTr: 'Sıcak bir yudum al', x: 225, y: 340, w: 45, h: 45 },
      { id: 'cat', name: 'Armchair Ginger Cat', nameTr: 'Fütüristik Koltuk Kedisi', hint: 'Pet your companion', hintTr: 'Dostunu sev 🐾', x: 65, y: 395, w: 130, h: 80 },
      { id: 'plant', name: 'Cyber Bonsai Shelf', nameTr: 'Sibernetik Bonsai Rafı', hint: 'Room growth & progression', hintTr: 'Oda gelişimini ve kilitleri gör', x: 165, y: 80, w: 75, h: 90 },
    ]
  }
};

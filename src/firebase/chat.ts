// src/firebase/chat.ts
// Real-time Community Chat with Firestore & 24-Hour Auto Expiration

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { AuthUser } from './auth';

export interface FirebaseChatMessage {
  id: string;
  userId: string;
  senderName: string;
  avatar: string;
  flag: string;
  text: string;
  timestamp: number;
  tag?: string;
  isReaction?: boolean;
}

const CHAT_COLLECTION = 'community_chat';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const MIN_SEND_INTERVAL_MS = 1200; // Anti-spam spam koruması (en az 1.2 sn aralık)
let lastSendTimestamp = 0;

/**
 * Mesaj gönder (Sadece giriş yapmış kullanıcılar gönderebilir, sanitize & rate-limited)
 */
export async function sendFirebaseMessage(
  user: AuthUser,
  text: string,
  tag = 'Çalışma Odası',
  isReaction = false
): Promise<string> {
  if (!db || !isFirebaseConfigured || !user) {
    throw new Error('Firebase veritabanı veya kullanıcı oturumu bulunamadı.');
  }

  // 1. Anti-Spam Hız Sınırı (Rate Limiting)
  const now = Date.now();
  if (!isReaction && now - lastSendTimestamp < MIN_SEND_INTERVAL_MS) {
    throw new Error('Lütfen ardışık mesaj göndermeden önce biraz bekleyin (Spam koruması).');
  }

  // 2. Metin Temizleme ve Boyut Koruması (Payload Clamping)
  const cleanText = text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Görünmeyen kontrol karakterlerini temizle
    .trim()
    .slice(0, 300);

  if (!cleanText) {
    throw new Error('Mesaj boş olamaz.');
  }

  // 3. Güvenli Gönderici Adı ve Güvenli Avatar
  const rawName = user.displayName || user.email?.split('@')[0] || 'Çalışmacı';
  const senderName = rawName.replace(/[<>{}]/g, '').trim().slice(0, 35) || 'Çalışmacı';

  let avatar = '🧑‍💻';
  if (user.photoURL && user.photoURL.startsWith('https://')) {
    avatar = user.photoURL;
  }

  const cleanTag = (tag || 'Çalışma Odası').replace(/[<>{}]/g, '').trim().slice(0, 30);

  lastSendTimestamp = now;

  const docRef = await addDoc(collection(db, CHAT_COLLECTION), {
    userId: user.uid,
    senderName,
    avatar,
    flag: '🇹🇷',
    text: cleanText,
    timestamp: now,
    tag: cleanTag,
    isReaction,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * 24 saat içindeki mesajları canlı dinler (onSnapshot)
 * 24 saatten eski mesajlar otomatik olarak filtrelenir ve gösterilmez.
 */
export function subscribeToFirebaseChat(
  onMessagesUpdate: (messages: FirebaseChatMessage[]) => void,
  onError?: (error: any) => void
): Unsubscribe | null {
  if (!db || !isFirebaseConfigured) {
    return null;
  }

  // Fetch latest 100 messages ordered by timestamp desc
  const q = query(
    collection(db, CHAT_COLLECTION),
    orderBy('timestamp', 'desc'),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      console.log('[Firestore Chat] onSnapshot received, docs count:', snapshot.docs.length);
      const messages: FirebaseChatMessage[] = [];
      const currentCutoff = Date.now() - TWENTY_FOUR_HOURS_MS;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const msgTimestamp = typeof data.timestamp === 'number' ? data.timestamp : Date.now();

        // 24 saat kontrolü: 24 saatten eski mesajları filtrele
        if (msgTimestamp >= currentCutoff) {
          messages.push({
            id: doc.id,
            userId: data.userId || 'anon',
            senderName: data.senderName || 'Çalışmacı',
            avatar: data.avatar || '🧑‍💻',
            flag: data.flag || '🇹🇷',
            text: data.text || '',
            timestamp: msgTimestamp,
            tag: data.tag || 'Çalışma Odası',
            isReaction: Boolean(data.isReaction),
          });
        }
      });

      // Mesajları kronolojik sıraya (eskiden yeniye) çevir
      messages.reverse();
      console.log('[Firestore Chat] Passing valid 24h messages to store:', messages.length);
      onMessagesUpdate(messages);
    },
    (error) => {
      console.error('[Firebase Chat Error]', error);
      if (onError) onError(error);
    }
  );
}

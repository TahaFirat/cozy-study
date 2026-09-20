import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { webAudioEngine } from '../audio/WebAudioEngine';
import { useAppStore } from './useAppStore';
import { useAuthStore } from './useAuthStore';
import { sendFirebaseMessage, subscribeToFirebaseChat, FirebaseChatMessage } from '../firebase/chat';
import { Unsubscribe } from 'firebase/firestore';

export interface StudyBuddy {
  id: string;
  name: string;
  avatar: string;
  country: string;
  flag: string;
  task: string;
  roomName: string;
  minutesFocused: number;
  streakDays: number;
  status: 'focusing' | 'break' | 'just_started';
}

export interface ChatMessage {
  id: string;
  userId?: string;
  senderName: string;
  avatar: string;
  flag: string;
  text: string;
  timestamp: number;
  isUser: boolean;
  tag?: string;
  isReaction?: boolean;
}

interface CommunityState {
  isChatOpen: boolean;
  activeTab: 'chat' | 'buddies';
  onlineCount: number;
  unreadCount: number;
  studyBuddies: StudyBuddy[];
  messages: ChatMessage[];
  isSubscribed: boolean;
  firestoreError: string | null;

  // Actions
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;
  setActiveTab: (tab: 'chat' | 'buddies') => void;
  sendMessage: (text: string) => Promise<boolean>;
  sendReaction: (reaction: 'coffee' | 'cheer' | 'fire') => Promise<boolean>;
  initChatSubscription: () => Unsubscribe | null;
}

const INITIAL_BUDDIES: StudyBuddy[] = [
  {
    id: 'buddy-1',
    name: 'Deniz Yılmaz',
    avatar: '👨‍💻',
    country: 'Türkiye',
    flag: '🇹🇷',
    task: 'Python Makine Öğrenimi & Veri',
    roomName: 'Sıcak Yatak Odası',
    minutesFocused: 45,
    streakDays: 6,
    status: 'focusing',
  },
  {
    id: 'buddy-2',
    name: 'Yuki Tanaka',
    avatar: '👩‍🎨',
    country: 'Japonya',
    flag: '🇯🇵',
    task: 'Mimari Çizim & 3D Modelleme',
    roomName: 'Tokyo Yağmurlu Daire',
    minutesFocused: 65,
    streakDays: 14,
    status: 'focusing',
  },
  {
    id: 'buddy-3',
    name: 'Maya Lin',
    avatar: '👩‍⚕️',
    country: 'Kanada',
    flag: '🇨🇦',
    task: 'Nöroloji Tıp Fakültesi Notları',
    roomName: 'Antika Kütüphane',
    minutesFocused: 30,
    streakDays: 9,
    status: 'focusing',
  },
  {
    id: 'buddy-4',
    name: 'Emre Kaya',
    avatar: '📚',
    country: 'Türkiye',
    flag: '🇹🇷',
    task: 'Yüksek Lisans Tez Yazımı',
    roomName: 'Çam Dağı Kütük Evi',
    minutesFocused: 85,
    streakDays: 12,
    status: 'focusing',
  },
  {
    id: 'buddy-5',
    name: 'Lucas Weber',
    avatar: '⚡',
    country: 'Almanya',
    flag: '🇩🇪',
    task: 'Rust ile Dağıtık Sistemler',
    roomName: 'Gece Yarısı Caz Kafe',
    minutesFocused: 25,
    streakDays: 4,
    status: 'break',
  },
  {
    id: 'buddy-6',
    name: 'Zeynep Demir',
    avatar: '✍️',
    country: 'Türkiye',
    flag: '🇹🇷',
    task: 'YKS Matematik Soru Çözümü',
    roomName: 'Sıcak Yatak Odası',
    minutesFocused: 55,
    streakDays: 8,
    status: 'focusing',
  },
  {
    id: 'buddy-7',
    name: 'Sora Sato',
    avatar: '🎹',
    country: 'Japonya',
    flag: '🇯🇵',
    task: 'Müzik Prodüksiyonu & Armoni',
    roomName: 'Tokyo Yağmurlu Daire',
    minutesFocused: 40,
    streakDays: 5,
    status: 'focusing',
  },
  {
    id: 'buddy-8',
    name: 'Aylin Çelik',
    avatar: '🎨',
    country: 'Türkiye',
    flag: '🇹🇷',
    task: 'Arayüz Tasarımı & İllüstrasyon',
    roomName: 'Gece Yarısı Caz Kafe',
    minutesFocused: 20,
    streakDays: 3,
    status: 'just_started',
  },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    senderName: 'Yuki Tanaka',
    avatar: '👩‍🎨',
    flag: '🇯🇵',
    text: 'Cama vuran yağmurun sesi muhteşem, çizimler çok huzurlu ilerliyor 🌧️',
    timestamp: Date.now() - 1000 * 60 * 18,
    isUser: false,
    tag: 'Tokyo',
  },
  {
    id: 'msg-2',
    senderName: 'Deniz Yılmaz',
    avatar: '👨‍💻',
    flag: '🇹🇷',
    text: 'Selamlar herkese! Bugün 3. odak seansıma başladım, kahveler taze ☕',
    timestamp: Date.now() - 1000 * 60 * 11,
    isUser: false,
    tag: 'İstanbul',
  },
  {
    id: 'msg-3',
    senderName: 'Maya Lin',
    avatar: '👩‍⚕️',
    flag: '🇨🇦',
    text: 'Kütüphane odasında çalışan var mı? Ortam sessiz ve derin odak için kusursuz ✨',
    timestamp: Date.now() - 1000 * 60 * 5,
    isUser: false,
    tag: 'Vancouver',
  },
  {
    id: 'msg-4',
    senderName: 'Emre Kaya',
    avatar: '📚',
    flag: '🇹🇷',
    text: 'Tezin son bölümü bitmek üzere. Birlikte odaklanan herkese kolay gelsin! 🙌',
    timestamp: Date.now() - 1000 * 60 * 2,
    isUser: false,
    tag: 'Ankara',
  },
];

const BOT_RESPONSES = [
  { name: 'Deniz Yılmaz', flag: '🇹🇷', avatar: '👨‍💻', text: 'Harika odaklanmalar! Beraber bitireceğiz bu seansı 💪' },
  { name: 'Maya Lin', flag: '🇨🇦', avatar: '👩‍⚕️', text: 'Kolay gelsin! Ben de 40 dakikalık seanstayım, iyi çalışmalar ☕' },
  { name: 'Yuki Tanaka', flag: '🇯🇵', avatar: '👩‍🎨', text: 'Hoş geldin! Yağmurlu odada müzik çok iyi gidiyor, verimli saatler ✨' },
  { name: 'Zeynep Demir', flag: '🇹🇷', avatar: '✍️', text: 'Süper, ben de soru çözümündeyim. Sessiz ve derin odaklanmalar! 📚' },
  { name: 'Emre Kaya', flag: '🇹🇷', avatar: '📚', text: 'Tebrikler! Kahveni tazelemeyi unutma, sonuna kadar odaklanıyoruz 🔥' },
];

let chatUnsubscribe: Unsubscribe | null = null;
let subscribersCount = 0;
const chatChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('cozypixel_chat_sync')
  : null;

export const useCommunityStore = create<CommunityState>()(
  persist(
    (set, get) => ({
      isChatOpen: false,
      activeTab: 'chat',
      onlineCount: 15,
      unreadCount: 0,
      studyBuddies: INITIAL_BUDDIES,
      messages: INITIAL_MESSAGES,
      firestoreError: null,

      toggleChat: () => {
        const nextState = !get().isChatOpen;
        set({ isChatOpen: nextState });
        if (nextState) {
          set({ unreadCount: 0 });
        }
      },

      setChatOpen: (isChatOpen) => {
        set({ isChatOpen });
        if (isChatOpen) {
          set({ unreadCount: 0 });
        }
      },

      setActiveTab: (activeTab) => set({ activeTab }),

      isSubscribed: false,

      initChatSubscription: () => {
        subscribersCount++;

        if (chatUnsubscribe) {
          return () => {
            subscribersCount = Math.max(0, subscribersCount - 1);
            if (subscribersCount === 0 && chatUnsubscribe) {
              chatUnsubscribe();
              chatUnsubscribe = null;
            }
          };
        }

        const unsub = subscribeToFirebaseChat(
          (fbMsgs) => {
            const currentUserId = useAuthStore.getState().user?.uid;
            const mapped: ChatMessage[] = fbMsgs.map((m) => {
              const isMe = Boolean(currentUserId && m.userId === currentUserId);
              return {
                id: m.id,
                userId: m.userId,
                senderName: m.senderName,
                avatar: m.avatar,
                flag: m.flag,
                text: m.text,
                timestamp: m.timestamp,
                isUser: isMe,
                tag: m.tag,
                isReaction: m.isReaction,
              };
            });

            const prevMsgs = get().messages;
            const isFirstLoad = prevMsgs === INITIAL_MESSAGES;

            set({
              isSubscribed: true,
              firestoreError: null,
              messages: mapped.length > 0 ? mapped : INITIAL_MESSAGES,
              unreadCount: get().isChatOpen ? 0 : (isFirstLoad ? 0 : Math.max(0, mapped.length - prevMsgs.length)),
            });

            // Yeni başkasından mesaj geldiyse bildirim sesi çal
            if (!isFirstLoad && mapped.length > prevMsgs.length) {
              const lastMsg = mapped[mapped.length - 1];
              if (lastMsg && !lastMsg.isUser && useAppStore.getState().soundFxEnabled) {
                webAudioEngine.playChatPing();
              }
            }
          },
          (error: any) => {
            const isPermission = error?.code === 'permission-denied' || error?.message?.includes('permission') || error?.message?.includes('insufficient permissions');
            if (isPermission) {
              set({ firestoreError: 'permission-denied' });
            }
          }
        );

        chatUnsubscribe = unsub;

        return () => {
          subscribersCount = Math.max(0, subscribersCount - 1);
          if (subscribersCount === 0 && chatUnsubscribe) {
            chatUnsubscribe();
            chatUnsubscribe = null;
          }
        };
      },

      sendMessage: async (text: string) => {
        if (!text.trim()) return false;
        const currentUser = useAuthStore.getState().user;
        const lang = useAppStore.getState().language;

        if (!currentUser) {
          useAppStore.getState().showToast(
            lang === 'tr' ? '🔒 Mesaj göndermek için lütfen giriş yapın.' : '🔒 Please sign in to send messages.',
            3500
          );
          useAppStore.getState().setActiveModal('auth');
          return false;
        }

        const now = Date.now();
        const avatar = currentUser.photoURL || '🧑‍💻';
        const senderName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Çalışmacı';
        const tag = lang === 'tr' ? 'Çalışma Odası' : 'Study Room';

        const optimisticMsg: ChatMessage = {
          id: `local-${now}-${Math.random().toString(36).slice(2, 6)}`,
          userId: currentUser.uid,
          senderName,
          avatar,
          flag: '🇹🇷',
          text: text.trim(),
          timestamp: now,
          isUser: true,
          tag,
          isReaction: false,
        };

        // 1. Yerel olarak anında göster
        set((state) => ({
          messages: [...state.messages.filter((m) => m.id !== optimisticMsg.id), optimisticMsg],
        }));

        // 2. Diğer açık sekmelere yayınla
        chatChannel?.postMessage(optimisticMsg);
        webAudioEngine.playChatPing();

        // 3. Bulut veritabanına yaz
        try {
          await sendFirebaseMessage(currentUser, text, tag, false);
          set({ firestoreError: null });
          return true;
        } catch (err: any) {
          console.error('[Send Message Error]', err);
          const isPermission = err?.code === 'permission-denied' || err?.message?.includes('permission') || err?.message?.includes('insufficient permissions');
          if (isPermission) {
            set({ firestoreError: 'permission-denied' });
            useAppStore.getState().showToast(
              lang === 'tr' 
                ? '⚠️ Firebase İzin Uyarısı: Firestore kuralları (Rules) aktif edilmeli.' 
                : '⚠️ Firebase Permission Notice: Please configure Firestore Rules.',
              6000
            );
          }
          return true; // Yerel olarak eklendi
        }
      },

      sendReaction: async (reaction: 'coffee' | 'cheer' | 'fire') => {
        const currentUser = useAuthStore.getState().user;
        const lang = useAppStore.getState().language;

        if (!currentUser) {
          useAppStore.getState().showToast(
            lang === 'tr' ? '🔒 Etkileşim göndermek için lütfen giriş yapın.' : '🔒 Please sign in to send reactions.',
            3500
          );
          useAppStore.getState().setActiveModal('auth');
          return false;
        }

        let actionText = '';
        let toastText = '';

        if (reaction === 'coffee') {
          actionText = lang === 'tr' 
            ? '☕ Tüm odaya sıcak kahve ikram etti! (+1 Mola Enerjisi)' 
            : '☕ Poured hot coffee for everyone in the room!';
          toastText = lang === 'tr' ? 'Odadaki herkese sıcak kahve gönderildi! ☕' : 'Coffee shared with everyone! ☕';
          webAudioEngine.playCoffeeCheers();
        } else if (reaction === 'cheer') {
          actionText = lang === 'tr' 
            ? '👏 Odaktaki tüm çalışma arkadaşlarını alkışladı! "Harikasınız!"' 
            : '👏 Cheered on all study buddies! "Keep it up!"';
          toastText = lang === 'tr' ? 'Çalışma arkadaşlarına tebrik gönderildi! 👏' : 'Cheered your study buddies! 👏';
          webAudioEngine.playZenChime('start');
        } else {
          actionText = lang === 'tr' 
            ? '🔥 Odaya yüksek odaklanma ve motivasyon enerjisi gönderdi!' 
            : '🔥 Sent deep focus motivation sparks to the room!';
          toastText = lang === 'tr' ? 'Motivasyon ateşi paylaşıldı! 🔥' : 'Focus motivation sparks sent! 🔥';
          webAudioEngine.playFireplaceStoke();
        }

        const now = Date.now();
        const avatar = currentUser.photoURL || '🧑‍💻';
        const senderName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Çalışmacı';

        const optimisticMsg: ChatMessage = {
          id: `local-${now}-${Math.random().toString(36).slice(2, 6)}`,
          userId: currentUser.uid,
          senderName,
          avatar,
          flag: '🇹🇷',
          text: actionText,
          timestamp: now,
          isUser: true,
          tag: 'Topluluk',
          isReaction: true,
        };

        set((state) => ({
          messages: [...state.messages.filter((m) => m.id !== optimisticMsg.id), optimisticMsg],
        }));

        chatChannel?.postMessage(optimisticMsg);
        useAppStore.getState().showToast(toastText, 3000);

        try {
          await sendFirebaseMessage(currentUser, actionText, 'Topluluk', true);
          set({ firestoreError: null });
          return true;
        } catch (err: any) {
          console.error('[Send Reaction Error]', err);
          const isPermission = err?.code === 'permission-denied' || err?.message?.includes('permission') || err?.message?.includes('insufficient permissions');
          if (isPermission) {
            set({ firestoreError: 'permission-denied' });
          }
          return true;
        }
      },
    }),
    {
      name: 'cozy_community_store',
      partialize: (state) => ({
        messages: state.messages.filter((m) => m.isUser).slice(-15),
      }),
    }
  )
);

if (typeof window !== 'undefined' && chatChannel) {
  chatChannel.onmessage = (event) => {
    const msg = event.data as ChatMessage;
    if (!msg || !msg.id) return;
    const store = useCommunityStore.getState();
    const currentUserId = useAuthStore.getState().user?.uid;
    if (store.messages.some((m) => m.id === msg.id || (m.timestamp === msg.timestamp && m.text === msg.text))) return;
    const isMe = Boolean(currentUserId && msg.userId === currentUserId);
    useCommunityStore.setState((state) => ({
      messages: [...state.messages, { ...msg, isUser: isMe }],
      unreadCount: state.isChatOpen ? 0 : state.unreadCount + 1,
    }));
    if (!isMe && useAppStore.getState().soundFxEnabled) {
      webAudioEngine.playChatPing();
    }
  };
}

// Ambient simulation events for realistic, living room feel
const AMBIENT_BUDDY_UPDATES = [
  {
    senderName: 'Yuki Tanaka',
    avatar: '👩‍🎨',
    flag: '🇯🇵',
    textTr: '25 dakikalık çizim seansı tamamlandı, kısa bir yeşil çay molası 🍵',
    textEn: 'Completed a 25-minute drawing session, taking a green tea break 🍵',
  },
  {
    senderName: 'Deniz Yılmaz',
    avatar: '👨‍💻',
    flag: '🇹🇷',
    textTr: 'Algoritma testi başarıyla geçti, şimdi 45 dakikalık derin odak zamanı 🚀',
    textEn: 'Algorithm test passed! Diving into a 45-minute deep focus block now 🚀',
  },
  {
    senderName: 'Lucas Müller',
    avatar: '🎧',
    flag: '🇩🇪',
    textTr: 'Plak çıtırtısı ve arka plan yağmuru harika bir ambiyans yarattı 🌧️🎶',
    textEn: 'Vinyl crackle and rain in the background make the coziest atmosphere 🌧️🎶',
  },
  {
    senderName: 'Maya Lin',
    avatar: '👩‍⚕️',
    flag: '🇨🇦',
    textTr: 'Kütüphanedeki sessiz odak enerjisi bana çok iyi geldi, herkese kolay gelsin 📖',
    textEn: 'The quiet focus energy here is so grounding, happy studying everyone 📖',
  },
  {
    senderName: 'Emre Kaya',
    avatar: '📚',
    flag: '🇹🇷',
    textTr: 'Hedeflenen 2 saatin 1.5 saatini tamamladım, son seansa başlıyorum ☕',
    textEn: 'Finished 1.5 hours out of my 2-hour daily goal, jumping into the final stretch ☕',
  },
  {
    senderName: 'Zeynep Demir',
    avatar: '✍️',
    flag: '🇹🇷',
    textTr: 'Önemli notları çıkardım, bu oda gerçekten derin odak katıyor ✨',
    textEn: 'Summarized the key lecture notes, this room is such a focus booster ✨',
  },
];

if (typeof window !== 'undefined') {
  setInterval(() => {
    const store = useCommunityStore.getState();
    const lang = useAppStore.getState().language;

    // 1. Subtle online count drift (14 - 19)
    const newCount = 14 + Math.floor(Math.random() * 6);

    // 2. Slightly advance minutes on random buddy
    const randomBuddyIdx = Math.floor(Math.random() * store.studyBuddies.length);
    const updatedBuddies = [...store.studyBuddies];
    const b = updatedBuddies[randomBuddyIdx];
    if (b) {
      updatedBuddies[randomBuddyIdx] = {
        ...b,
        minutesFocused: b.minutesFocused + 1,
      };
    }

    useCommunityStore.setState({
      onlineCount: newCount,
      studyBuddies: updatedBuddies,
    });
  }, 45000);
}

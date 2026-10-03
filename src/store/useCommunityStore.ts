import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { webAudioEngine } from '../audio/WebAudioEngine';
import { useAppStore } from './useAppStore';
import { useAuthStore } from './useAuthStore';
import { useTimerStore } from './useTimerStore';
import { useStatsStore } from './useStatsStore';
import { TRANSLATIONS } from '../i18n/translations';
import { sendFirebaseMessage, subscribeToFirebaseChat } from '../firebase/chat';
import { sendFirebasePresencePing, removeFirebasePresence, subscribeToFirebasePresence } from '../firebase/presence';
import { Unsubscribe } from 'firebase/firestore';
import { useBossRaidStore } from './useBossRaidStore';

export interface StudyBuddy {
  id: string;
  sessionId?: string;
  name: string;
  avatar: string;
  country: string;
  flag: string;
  task: string;
  roomName: string;
  minutesFocused: number;
  streakDays: number;
  status: 'focusing' | 'break' | 'just_started';
  isSelf?: boolean;
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
  refreshStudyBuddies: () => void;
}

let chatUnsubscribe: Unsubscribe | null = null;
let subscribersCount = 0;
const chatChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('cozypixel_chat_sync')
  : null;

export const clientSessionId = (() => {
  if (typeof window === 'undefined') return 'peer-1';
  try {
    let sid = localStorage.getItem('cozypixel_session_id');
    if (!sid) {
      sid = `peer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem('cozypixel_session_id', sid);
    }
    return sid;
  } catch {
    return `peer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }
})();

export function getLocalBuddyInfo(): StudyBuddy {
  const user = useAuthStore.getState().user;
  const lang = useAppStore.getState().language;
  const activeRoom = useAppStore.getState().activeRoom;
  const roomConfig = TRANSLATIONS[lang]?.rooms?.[activeRoom];
  const roomName = roomConfig?.name || (lang === 'tr' ? 'Sıcak Yatak Odası' : 'Cozy Bedroom');
  const timer = useTimerStore.getState();
  const stats = useStatsStore.getState();

  const isFocusing = timer.timerState === 'running';
  const status: 'focusing' | 'break' | 'just_started' = isFocusing 
    ? 'focusing' 
    : (timer.lastCompletedMinutes > 0 ? 'break' : 'just_started');

  const defaultGuestName = lang === 'tr' ? 'Misafir Çalışmacı' : 'Guest Studier';
  const name = user?.displayName || defaultGuestName;
  const avatar = user?.photoURL || '🧑‍💻';
  const task = timer.currentGoal || (lang === 'tr' ? 'Derin Odak Seansı' : 'Deep Focus Session');
  const minutesFocused = typeof stats.getTodayMinutes === 'function' ? stats.getTodayMinutes() : 0;
  const streakDays = stats.streakDays || 1;

  return {
    id: user?.uid || clientSessionId,
    sessionId: clientSessionId,
    name,
    avatar,
    country: 'Türkiye',
    flag: '🇹🇷',
    task,
    roomName,
    minutesFocused,
    streakDays,
    status,
    isSelf: true,
  };
}

const activePeers = new Map<string, { buddy: StudyBuddy; lastSeen: number }>();

let hasReceivedFirestorePresence = false;

function updateBuddiesState() {
  // If Firestore real-time cloud presence is active, never overwrite with local-only BroadcastChannel peers!
  if (hasReceivedFirestorePresence) return;

  const threshold = Date.now() - 20000;
  for (const [id, peer] of activePeers.entries()) {
    if (peer.lastSeen < threshold) activePeers.delete(id);
  }
  const self = getLocalBuddyInfo();
  const currentUserId = useAuthStore.getState().user?.uid;
  const uniquePeers = new Map<string, StudyBuddy>();

  for (const peer of activePeers.values()) {
    const b = peer.buddy;
    const isSelf = 
      (b.sessionId && b.sessionId === clientSessionId) ||
      b.id === clientSessionId ||
      Boolean(currentUserId && (b.id === currentUserId || (b as any).userId === currentUserId));

    if (!isSelf) {
      const key = b.id || b.sessionId;
      if (key && !uniquePeers.has(key)) {
        uniquePeers.set(key, { ...b, isSelf: false });
      }
    }
  }

  const otherBuddies = Array.from(uniquePeers.values());
  useCommunityStore.setState({
    onlineCount: Math.max(1, otherBuddies.length + 1),
    studyBuddies: [self, ...otherBuddies],
  });
}

export async function sendPresencePingHttp() {
  // No-op: Presence is handled directly and cleanly via Firestore and BroadcastChannel
}

export const useCommunityStore = create<CommunityState>()(
  persist(
    (set, get) => ({
      isChatOpen: false,
      activeTab: 'chat',
      onlineCount: 1,
      unreadCount: 0,
      studyBuddies: [getLocalBuddyInfo()],
      messages: [],
      firestoreError: null,
      isSubscribed: false,

      toggleChat: () => {
        const nextState = !get().isChatOpen;
        set({ isChatOpen: nextState });
        if (nextState) {
          set({ unreadCount: 0 });
          updateBuddiesState();
        }
      },

      setChatOpen: (isChatOpen) => {
        set({ isChatOpen });
        if (isChatOpen) {
          set({ unreadCount: 0 });
          updateBuddiesState();
        }
      },

      setActiveTab: (activeTab) => {
        set({ activeTab });
        if (activeTab === 'buddies') {
          updateBuddiesState();
        }
      },

      refreshStudyBuddies: () => {
        updateBuddiesState();
      },

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
            const isFirstLoad = !get().isSubscribed;

            set({
              isSubscribed: true,
              firestoreError: null,
              messages: mapped,
              unreadCount: get().isChatOpen ? 0 : (isFirstLoad ? 0 : Math.max(0, mapped.length - prevMsgs.length)),
            });

            // Yeni başkasından mesaj geldiyse bildirim sesi çal (etkileşim ayarına uygun olarak)
            if (!isFirstLoad && mapped.length > prevMsgs.length) {
              const lastMsg = mapped[mapped.length - 1];
              const reactionsAllowed = useAppStore.getState().communityReactionsEnabled;
              if (lastMsg && !lastMsg.isUser && useAppStore.getState().soundFxEnabled) {
                if (!lastMsg.isReaction || reactionsAllowed) {
                  webAudioEngine.playChatPing();
                }
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

        // 2. Diğer açık sekmelere ve sunucu aktarıcısına yayınla
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
      version: 5,
      migrate: (persistedState: any) => {
        if (!persistedState) return persistedState;
        const botNames = [
          'Yuki Tanaka', 'Deniz Yılmaz', 'Maya Lin', 'Emre Kaya',
          'Lucas Weber', 'Zeynep Demir', 'Sora Sato', 'Aylin Çelik',
          'Lucas Müller', 'Elena Voronina', 'Mert Yılmaz'
        ];
        if (Array.isArray(persistedState.messages)) {
          persistedState.messages = persistedState.messages.filter(
            (m: any) => m.isUser || !botNames.includes(m.senderName)
          );
        }
        persistedState.studyBuddies = [getLocalBuddyInfo()];
        persistedState.onlineCount = 1;
        return persistedState;
      },
      partialize: (state) => ({
        messages: state.messages.filter((m) => m.isUser).slice(-15),
      }),
    }
  )
);

// Cross-tab message listener (BroadcastChannel for same-origin tabs)
if (typeof window !== 'undefined' && chatChannel) {
  chatChannel.addEventListener('message', (event) => {
    // 1. Chat Message Sync
    if (event.data && event.data.id && event.data.text) {
      const msg = event.data as ChatMessage;
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
    }

    // 2. Real Presence & Study Buddy Ping Sync
    if (event.data?.type === 'PRESENCE_PING' && event.data.clientId && event.data.clientId !== clientSessionId) {
      if (event.data.buddy) {
        const currentUserId = useAuthStore.getState().user?.uid;
        const b = event.data.buddy;
        const isSelf = Boolean(
          (b.sessionId && b.sessionId === clientSessionId) ||
          b.id === clientSessionId ||
          (currentUserId && (b.id === currentUserId || b.userId === currentUserId))
        );
        if (!isSelf) {
          activePeers.set(event.data.clientId, {
            buddy: { ...b, isSelf: false },
            lastSeen: Date.now(),
          });
        }
      }
      updateBuddiesState();
    }

    // 3. Presence Leave Sync
    if (event.data?.type === 'PRESENCE_LEAVE' && event.data.clientId) {
      activePeers.delete(event.data.clientId);
      updateBuddiesState();
    }
  });

  // Clear previous BC interval if present (prevents HMR timer leak)
  if ((window as any).__cozy_bc_interval) {
    clearInterval((window as any).__cozy_bc_interval);
  }

  // Heartbeat ping every 8s over BroadcastChannel
  (window as any).__cozy_bc_interval = setInterval(() => {
    try {
      chatChannel.postMessage({
        type: 'PRESENCE_PING',
        clientId: clientSessionId,
        buddy: getLocalBuddyInfo(),
      });
      updateBuddiesState();
    } catch {}
  }, 8000);
}

// Real-Time Global Firestore Presence & Cross-Platform Synchronization
if (typeof window !== 'undefined') {
  // 1. Real-time Firebase Presence across all mobile, tablet, and web devices worldwide
  let firestorePresenceUnsub: Unsubscribe | null = null;
  try {
    firestorePresenceUnsub = subscribeToFirebasePresence(clientSessionId, (remoteBuddies, totalCount) => {
      const selfBuddy = getLocalBuddyInfo();
      const mappedBuddies: StudyBuddy[] = remoteBuddies.map((rb) => ({
        id: rb.id,
        sessionId: rb.sessionId || rb.id,
        name: rb.name || 'Çalışma Arkadaşı',
        avatar: rb.avatar || '🧑‍💻',
        country: rb.country || 'Türkiye',
        flag: rb.flag || '🇹🇷',
        task: rb.task || 'Derin Odak Seansı',
        roomName: rb.roomName || 'Sıcak Yatak Odası',
        minutesFocused: rb.minutesFocused || 0,
        streakDays: rb.streakDays || 1,
        status: rb.status || 'focusing',
        isSelf: false,
      }));

      hasReceivedFirestorePresence = true;
      useCommunityStore.setState({
        onlineCount: totalCount,
        studyBuddies: [selfBuddy, ...mappedBuddies],
      });
    });
  } catch (err) {
    console.warn('[CommunityStore] Firestore presence sync init note:', err);
  }

  // Clear previous presence interval if present
  if ((window as any).__cozy_presence_interval) {
    clearInterval((window as any).__cozy_presence_interval);
  }

  const sendRealPresence = () => {
    const buddy = getLocalBuddyInfo();
    sendFirebasePresencePing(clientSessionId, buddy);
  };

  // Send periodic cloud heartbeat every 14s (lightweight & saves battery)
  (window as any).__cozy_presence_interval = setInterval(sendRealPresence, 14000);
  setTimeout(sendRealPresence, 400);

  const handlePresenceLeave = () => {
    try {
      removeFirebasePresence(clientSessionId);
      if (firestorePresenceUnsub) firestorePresenceUnsub();
      chatChannel?.postMessage({
        type: 'PRESENCE_LEAVE',
        clientId: clientSessionId,
      });
    } catch {}
  };

  window.addEventListener('beforeunload', handlePresenceLeave);
  window.addEventListener('pagehide', handlePresenceLeave);

  // Clean up timers on Vite HMR
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      if ((window as any).__cozy_presence_interval) {
        clearInterval((window as any).__cozy_presence_interval);
      }
      if ((window as any).__cozy_bc_interval) {
        clearInterval((window as any).__cozy_bc_interval);
      }
      if (firestorePresenceUnsub) {
        firestorePresenceUnsub();
      }
    });
  }
}

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  MessageCircle, 
  Users, 
  Send, 
  Coffee, 
  Flame, 
  Sparkles, 
  Smile, 
  Volume2, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  Heart,
  AlertTriangle
} from 'lucide-react';
import { useCommunityStore } from '../../store/useCommunityStore';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { webAudioEngine } from '../../audio/WebAudioEngine';

function formatMsgTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const CommunityChatDrawer: React.FC = () => {
  const { 
    isChatOpen, 
    setChatOpen, 
    activeTab, 
    setActiveTab, 
    onlineCount, 
    studyBuddies, 
    messages, 
    sendMessage, 
    sendReaction,
    firestoreError
  } = useCommunityStore();

  const { language, setActiveModal } = useAppStore();
  const { user } = useAuthStore();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const unsub = useCommunityStore.getState().initChatSubscription();
    return () => {
      unsub?.();
    };
  }, []);

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [messages, isChatOpen, scrollToBottom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    const success = await sendMessage(text);
    if (!success) {
      setInputText(text);
    }
  };

  if (!isChatOpen) return null;

  return (
    <div className="fixed inset-y-4 right-4 z-40 w-84 sm:w-96 max-w-[calc(100vw-2rem)] flex flex-col bg-stone-900/95 text-stone-100 border border-stone-800/90 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden animate-in slide-in-from-right-10 duration-200 pointer-events-auto">
      
      {/* Top Header */}
      <div className="p-3.5 border-b border-stone-800/90 bg-stone-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-amber-200">
              {language === 'tr' ? 'Birlikte Çalışma Odası' : 'Co-Study Room'}
            </h3>
            <span className="text-xs font-mono font-semibold text-stone-400 bg-stone-800 px-2 py-0.5 rounded-full">
              {onlineCount} {language === 'tr' ? 'aktif' : 'online'}
            </span>
          </div>
        </div>

        <button
          onClick={() => setChatOpen(false)}
          className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          title={language === 'tr' ? 'Kapat (Esc veya C)' : 'Close (Esc or C)'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Firestore Permissions Alert Banner */}
      {firestoreError === 'permission-denied' && (
        <div className="px-3 py-2 bg-amber-500/15 border-b border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">
            <span className="font-bold">{language === 'tr' ? 'Firebase Firestore İzin Uyarısı: ' : 'Firestore Permission Notice: '}</span>
            <span>
              {language === 'tr' 
                ? 'Mesajların diğer kullanıcılara ulaşması için Firebase Console > Firestore Database > Rules sekmesinde izinleri açmalısınız.'
                : 'Please configure Firestore Rules in Firebase Console to enable global sync.'}
            </span>
          </div>
        </div>
      )}

      {/* Tabs Switcher: Sohbet & Çalışma Arkadaşları */}
      <div className="flex items-center border-b border-stone-800/80 bg-stone-950/20 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'chat'
              ? 'border-amber-400 text-amber-300 bg-amber-500/10'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>{language === 'tr' ? 'Sohbet & Akış' : 'Chat & Stream'}</span>
        </button>

        <button
          onClick={() => setActiveTab('buddies')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'buddies'
              ? 'border-amber-400 text-amber-300 bg-amber-500/10'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{language === 'tr' ? 'Çalışanlar' : 'Study Buddies'}</span>
          <span className="text-[10px] bg-stone-800 text-stone-300 px-1.5 py-0.2 rounded-full font-mono">
            {studyBuddies.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Chat Stream */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Quick Cheer / Reaction bar */}
          <div className="px-3 py-2 bg-stone-950/50 border-b border-stone-800/70 flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => sendReaction('coffee')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800/90 hover:bg-amber-950/40 text-amber-200 text-xs font-medium border border-stone-700/80 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
              title={language === 'tr' ? 'Tüm odaya sıcak kahve ikram et' : 'Share coffee with the room'}
            >
              <Coffee className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'tr' ? 'Kahve Gönder' : 'Coffee Cheer'}</span>
            </button>

            <button
              onClick={() => sendReaction('cheer')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800/90 hover:bg-amber-950/40 text-amber-200 text-xs font-medium border border-stone-700/80 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
              title={language === 'tr' ? 'Herkesi alkışla ve tebrik et' : 'Cheer everyone on'}
            >
              <span>👏</span>
              <span>{language === 'tr' ? 'Tebrik Et' : 'Cheer'}</span>
            </button>

            <button
              onClick={() => sendReaction('fire')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800/90 hover:bg-amber-950/40 text-amber-200 text-xs font-medium border border-stone-700/80 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
              title={language === 'tr' ? 'Derin odak motivasyon ateşi gönder' : 'Send focus energy'}
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>{language === 'tr' ? 'Odak Ateşi' : 'Focus Spark'}</span>
            </button>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 pr-1.5">
            <div className="text-center py-2">
              <span className="text-[11px] text-stone-500 bg-stone-950/60 px-2.5 py-1 rounded-full border border-stone-800">
                {language === 'tr' 
                  ? '🌿 Birlikte sessiz ve derin odaklanma alanı' 
                  : '🌿 Quiet and gentle co-study sanctuary'}
              </span>
            </div>

            {messages.map((m) => {
              const isMe = Boolean(user && m.userId && m.userId === user.uid);
              const displayName = isMe ? (language === 'tr' ? 'Sen' : 'You') : m.senderName;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    {m.avatar?.startsWith('https://') ? (
                      <img 
                        src={m.avatar} 
                        alt={m.senderName} 
                        className="w-4 h-4 rounded-full object-cover inline-block" 
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-xs">{m.avatar || '🧑‍💻'}</span>
                    )}
                    <span className="text-[11px] font-semibold text-stone-300">
                      {displayName} {m.flag}
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      {formatMsgTime(m.timestamp)}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                      m.isReaction
                        ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30 font-medium italic'
                        : isMe
                        ? 'bg-amber-500/25 text-amber-100 border border-amber-500/40 rounded-tr-xs'
                        : 'bg-stone-800/80 text-stone-200 border border-stone-700/60 rounded-tl-xs'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Form or Guest Login CTA */}
          {user ? (
            <form onSubmit={handleSend} className="p-3 border-t border-stone-800/80 bg-stone-950/50 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={language === 'tr' ? 'Mesaj yaz veya hedefini paylaş...' : 'Share what you are focusing on...'}
                className="flex-1 bg-stone-900 border border-stone-700/80 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                maxLength={250}
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`p-2 rounded-xl text-stone-950 font-bold transition-all ${
                  inputText.trim()
                    ? 'bg-amber-500 hover:bg-amber-400 cursor-pointer shadow-md'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
                title="Gönder"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="p-3 border-t border-stone-800/80 bg-stone-950/90 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-stone-300 text-xs min-w-0">
                <span className="text-sm">🔒</span>
                <span className="truncate">
                  {language === 'tr' 
                    ? 'Mesaj göndermek için giriş yapmalısınız' 
                    : 'Sign in to send messages'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('auth')}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs whitespace-nowrap shadow-md hover:shadow-amber-500/20 transition-all cursor-pointer"
              >
                {language === 'tr' ? 'Giriş Yap' : 'Sign In'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Active Study Buddies List */}
      {activeTab === 'buddies' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 pr-1.5">
          <div className="text-xs text-stone-400 pb-1 flex items-center justify-between font-medium">
            <span>{language === 'tr' ? 'Şu Anda Odada Çalışanlar' : 'Studying Right Now'}</span>
            <span className="text-amber-300 font-mono">{studyBuddies.length} {language === 'tr' ? 'kişi' : 'active'}</span>
          </div>

          {studyBuddies.map((buddy) => (
            <div
              key={buddy.id}
              className="p-3 rounded-xl bg-stone-950/40 border border-stone-800/80 hover:border-stone-700 transition-colors flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-lg flex-shrink-0 shadow-inner">
                {buddy.avatar}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-amber-200 truncate">{buddy.name}</span>
                    <span className="text-xs">{buddy.flag}</span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    buddy.status === 'focusing'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : buddy.status === 'break'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  }`}>
                    {buddy.status === 'focusing' 
                      ? (language === 'tr' ? 'Odakta' : 'Focusing')
                      : buddy.status === 'break'
                      ? (language === 'tr' ? 'Molada' : 'On Break')
                      : (language === 'tr' ? 'Yeni Başladı' : 'Started')}
                  </span>
                </div>

                <p className="text-xs text-stone-300 mt-1 truncate">
                  {buddy.task}
                </p>

                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-stone-400">
                  <span className="flex items-center gap-1 text-amber-400/90 font-mono font-semibold">
                    <Clock className="w-3 h-3" />
                    {buddy.minutesFocused} {language === 'tr' ? 'dk' : 'm'}
                  </span>
                  <span>•</span>
                  <span className="text-stone-400 truncate">{buddy.roomName}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

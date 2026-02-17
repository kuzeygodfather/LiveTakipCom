import { useEffect, useState } from 'react';
import { X, MessageSquare, User, Calendar, ChevronLeft, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { maskName } from '../lib/utils';

interface ChatItem {
  id: string;
  chat_id: string;
  agent_name: string;
  customer_name: string;
  created_at: string;
  message_count: number;
  overall_score: number | null;
}

interface ChatMessage {
  message_id: string;
  author_type: string;
  text: string;
  created_at: string;
  is_system: boolean;
}

interface SentimentChatsModalProps {
  sentiment: 'negative' | 'neutral' | 'positive' | null;
  onClose: () => void;
}

const SENTIMENT_CONFIG = {
  negative: {
    label: 'Negatif',
    borderColor: 'border-rose-500',
    headerBg: 'from-rose-900/60 to-red-900/40',
    badgeBg: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
    dot: 'bg-rose-500',
  },
  neutral: {
    label: 'Nötr',
    borderColor: 'border-amber-500',
    headerBg: 'from-amber-900/60 to-orange-900/40',
    badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    dot: 'bg-amber-500',
  },
  positive: {
    label: 'Pozitif',
    borderColor: 'border-emerald-500',
    headerBg: 'from-emerald-900/60 to-green-900/40',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    dot: 'bg-emerald-500',
  },
};

export default function SentimentChatsModal({ sentiment, onClose }: SentimentChatsModalProps) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (!sentiment) return;
    loadChats();
  }, [sentiment]);

  const loadChats = async () => {
    if (!sentiment) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_analysis')
        .select('chat_id, overall_score')
        .eq('sentiment', sentiment)
        .order('overall_score', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setChats([]);
        return;
      }

      const chatIds = data.map(d => d.chat_id);
      const scoreMap: Record<string, number> = {};
      data.forEach(d => { scoreMap[d.chat_id] = d.overall_score; });

      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('id, chat_id, agent_name, customer_name, created_at, message_count')
        .in('id', chatIds);

      if (chatError) throw chatError;

      const merged = (chatData || []).map(c => ({
        ...c,
        overall_score: scoreMap[c.id] ?? null,
      }));

      merged.sort((a, b) => (a.overall_score ?? 100) - (b.overall_score ?? 100));
      setChats(merged);
    } catch (err) {
      console.error('Error loading sentiment chats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleChatClick = async (chat: ChatItem) => {
    setSelectedChat(chat);
    await loadMessages(chat.id);
  };

  if (!sentiment) return null;

  const config = SENTIMENT_CONFIG[sentiment];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative bg-slate-900 border ${config.borderColor} rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 bg-gradient-to-r ${config.headerBg} border-b border-slate-700/60`}>
          <div className="flex items-center gap-3">
            {selectedChat ? (
              <button
                onClick={() => { setSelectedChat(null); setMessages([]); }}
                className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Geri
              </button>
            ) : (
              <>
                <div className={`w-3 h-3 rounded-full ${config.dot}`} />
                <h2 className="text-lg font-bold text-white">{config.label} Chatler</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${config.badgeBg}`}>
                  {chats.length} chat
                </span>
              </>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {!selectedChat ? (
            /* Chat List */
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : chats.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-slate-400">
                  Chat bulunamadı
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {chats.map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => handleChatClick(chat)}
                      className="text-left p-4 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-800/60 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                          <span className="text-xs font-mono text-slate-400 group-hover:text-slate-200 transition-colors">
                            #{chat.id.slice(0, 10)}
                          </span>
                        </div>
                        {chat.overall_score !== null && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            chat.overall_score >= 7 ? 'bg-emerald-500/20 text-emerald-300' :
                            chat.overall_score >= 4 ? 'bg-amber-500/20 text-amber-300' :
                            'bg-rose-500/20 text-rose-300'
                          }`}>
                            {chat.overall_score}/10
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-white font-medium">{maskName(chat.customer_name)}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-slate-300">{chat.agent_name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(chat.created_at).toLocaleString('tr-TR', {
                            timeZone: 'Europe/Istanbul',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {chat.message_count} mesaj
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Message View */
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-white font-medium">{maskName(selectedChat.customer_name)}</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-slate-300">{selectedChat.agent_name}</span>
                  <span className="ml-auto text-xs text-slate-500 font-mono">#{selectedChat.id.slice(0, 10)}</span>
                </div>
              </div>

              {loadingMessages ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-slate-400">
                  Mesaj bulunamadı
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map(msg => (
                    <div
                      key={msg.message_id}
                      className={`p-3 rounded-lg text-sm ${
                        msg.is_system
                          ? 'bg-slate-700/30 border border-slate-600/50 text-slate-400 text-xs text-center'
                          : msg.author_type === 'agent'
                          ? 'bg-blue-900/30 border border-blue-700/40 ml-6'
                          : 'bg-emerald-900/30 border border-emerald-700/40 mr-6'
                      }`}
                    >
                      {!msg.is_system && (
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${
                            msg.author_type === 'agent' ? 'text-blue-300' : 'text-emerald-300'
                          }`}>
                            {msg.author_type === 'agent' ? 'Temsilci' : 'Müşteri'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(msg.created_at).toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                          </span>
                        </div>
                      )}
                      <p className="text-white whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

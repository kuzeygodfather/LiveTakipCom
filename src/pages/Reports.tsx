import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MessageCircle, Lightbulb, AlertCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface ChatMessage {
  author: { name: string };
  text: string;
}

interface NegativeChat {
  id: string;
  thread_id: string;
  agent_name: string;
  started_at: string;
  ended_at: string;
  sentiment: string;
  score: number;
  issues: string[];
  summary: string;
  messages: ChatMessage[];
  coaching?: string;
  loadingCoaching?: boolean;
}

export default function Reports() {
  const [negativeChats, setNegativeChats] = useState<NegativeChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChat, setExpandedChat] = useState<string | null>(null);

  useEffect(() => {
    loadNegativeChats();
  }, []);

  const loadNegativeChats = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('chat_analyses')
        .select('*')
        .or('sentiment.eq.negative,score.lt.50')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading negative chats:', error);
        return;
      }

      setNegativeChats(data || []);
    } catch (error) {
      console.error('Error loading negative chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCoachingSuggestion = async (chat: NegativeChat) => {
    try {
      setNegativeChats(prev =>
        prev.map(c => c.id === chat.id ? { ...c, loadingCoaching: true } : c)
      );

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-coaching`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          chatId: chat.id,
          messages: chat.messages,
          analysis: {
            sentiment: chat.sentiment,
            score: chat.score,
            issues: chat.issues,
            summary: chat.summary,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get coaching suggestion');
      }

      const result = await response.json();

      setNegativeChats(prev =>
        prev.map(c =>
          c.id === chat.id
            ? { ...c, coaching: result.suggestion, loadingCoaching: false }
            : c
        )
      );
    } catch (error) {
      console.error('Error getting coaching suggestion:', error);
      setNegativeChats(prev =>
        prev.map(c =>
          c.id === chat.id
            ? { ...c, coaching: 'Öneri alınırken bir hata oluştu.', loadingCoaching: false }
            : c
        )
      );
    }
  };

  const toggleChat = async (chatId: string) => {
    if (expandedChat === chatId) {
      setExpandedChat(null);
    } else {
      setExpandedChat(chatId);
      const chat = negativeChats.find(c => c.id === chatId);
      if (chat && !chat.coaching && !chat.loadingCoaching) {
        await getCoachingSuggestion(chat);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('tr-TR', {
      timeZone: 'Europe/Istanbul',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSentimentColor = (sentiment: string, score: number) => {
    if (sentiment === 'negative' || score < 40) return 'text-red-600 bg-red-50 border-red-200';
    if (score < 60) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  const getSentimentLabel = (sentiment: string) => {
    if (sentiment === 'negative') return 'Olumsuz';
    if (sentiment === 'neutral') return 'Nötr';
    return 'Olumlu';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Koçluk & İyileştirme Önerileri</h1>
        <p className="text-sm sm:text-base text-slate-600 mt-1">
          Olumsuz değerlendirilen chat'ler ve AI destekli iyileştirme önerileri
        </p>
      </div>

      {negativeChats.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
          <div className="text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Harika İş Çıkarıyorsunuz!</h3>
            <p className="text-slate-600">Son 30 günde olumsuz değerlendirilen chat bulunamadı.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <strong>Not:</strong> Bu bölüm, müşteri memnuniyetsizliği yaşanan chat'leri gösterir.
                Her chat için AI destekli iyileştirme önerileri sunulur. Chat'e tıklayarak detayları görün.
              </div>
            </div>
          </div>

          {negativeChats.map((chat) => {
            const isExpanded = expandedChat === chat.id;
            return (
              <div
                key={chat.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              >
                <button
                  onClick={() => toggleChat(chat.id)}
                  className="w-full p-4 sm:p-6 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-semibold text-slate-900">{chat.agent_name}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getSentimentColor(chat.sentiment, chat.score)}`}>
                          {getSentimentLabel(chat.sentiment)} • {chat.score}/100
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDate(chat.started_at)}
                        </span>
                      </div>

                      {chat.summary && (
                        <p className="text-sm text-slate-700 line-clamp-2 mb-2">{chat.summary}</p>
                      )}

                      {chat.issues && chat.issues.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {chat.issues.slice(0, 3).map((issue, idx) => (
                            <span key={idx} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                              {issue}
                            </span>
                          ))}
                          {chat.issues.length > 3 && (
                            <span className="text-xs text-slate-500">+{chat.issues.length - 3} daha</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-200 p-4 sm:p-6 bg-slate-50 space-y-4">
                    {chat.messages && chat.messages.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <MessageCircle className="w-4 h-4" />
                          Chat Görüşmesi
                        </h4>
                        <div className="bg-white rounded-lg border border-slate-200 p-4 max-h-60 overflow-y-auto space-y-2">
                          {chat.messages.map((msg, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="font-medium text-slate-900">{msg.author.name}:</span>
                              <span className="text-slate-700 ml-2">{msg.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
                      <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-blue-600" />
                        AI Koçluk Önerileri
                      </h4>

                      {chat.loadingCoaching ? (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">AI öneri hazırlıyor...</span>
                        </div>
                      ) : chat.coaching ? (
                        <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                          {chat.coaching}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500">Öneri yükleniyor...</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

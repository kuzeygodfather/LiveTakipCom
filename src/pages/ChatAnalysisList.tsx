import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { maskName } from '../lib/utils';
import { Search, Filter, Eye, AlertCircle, MessageCircle, Calendar, BarChart3, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import type { Chat, ChatAnalysis, ChatMessage } from '../types';

interface ChatWithAnalysis extends Chat {
  analysis?: ChatAnalysis;
  messages?: ChatMessage[];
}

export default function ChatAnalysisList() {
  const [chats, setChats] = useState<ChatWithAnalysis[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'analyzed' | 'pending'>('all');
  const [filterSentiment, setFilterSentiment] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedChat, setSelectedChat] = useState<ChatWithAnalysis | null>(null);
  const [totalChatsCount, setTotalChatsCount] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState<string>('');
  const [matchingChatIds, setMatchingChatIds] = useState<string[]>([]);

  const getIstanbulDateBoundaries = (dateStr: string): { start: Date, end: Date } => {
    const istanbulDate = new Date(dateStr + 'T00:00:00+03:00');
    const istanbulDateEnd = new Date(dateStr + 'T23:59:59.999+03:00');
    return { start: istanbulDate, end: istanbulDateEnd };
  };

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      searchInMessages(searchTerm);
    } else {
      setMatchingChatIds([]);
    }
  }, [searchTerm]);

  useEffect(() => {
    filterChats();
  }, [chats, searchTerm, filterStatus, filterSentiment, dateFrom, dateTo, matchingChatIds]);

  const searchInMessages = async (term: string) => {
    try {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('chat_id')
        .ilike('text', `%${term}%`);

      if (messages) {
        const uniqueChatIds = [...new Set(messages.map(m => m.chat_id))];
        setMatchingChatIds(uniqueChatIds);
      }
    } catch (error) {
      console.error('Error searching in messages:', error);
      setMatchingChatIds([]);
    }
  };

  const loadChats = async () => {
    try {
      const { count: totalCount } = await supabase
        .from('chats')
        .select('*', { count: 'exact', head: true });

      setTotalChatsCount(totalCount || 0);

      // Load all chats in batches
      let allChatsData: any[] = [];
      let from = 0;
      const chatBatchSize = 1000;

      while (true) {
        const { data: batch, error: batchError } = await supabase
          .from('chats')
          .select('id, chat_id, agent_name, customer_name, created_at, analyzed')
          .order('created_at', { ascending: false })
          .range(from, from + chatBatchSize - 1);

        if (batchError) {
          console.error('Chat batch fetch error:', batchError);
          break;
        }

        if (!batch || batch.length === 0) break;
        allChatsData = [...allChatsData, ...batch];
        if (batch.length < chatBatchSize) break;
        from += chatBatchSize;
      }

      console.log('Total chats loaded:', allChatsData.length);

      // Load all chat_analysis data in batches
      let allAnalysisData: any[] = [];
      from = 0;
      const analysisBatchSize = 1000;

      while (true) {
        const { data: batch, error: batchError } = await supabase
          .from('chat_analysis')
          .select('*')
          .range(from, from + analysisBatchSize - 1);

        if (batchError) {
          console.error('Analysis batch fetch error:', batchError);
          break;
        }

        if (!batch || batch.length === 0) break;
        allAnalysisData = [...allAnalysisData, ...batch];
        if (batch.length < analysisBatchSize) break;
        from += analysisBatchSize;
      }

      console.log('Total analysis loaded:', allAnalysisData.length);

      // Create a map for quick lookup
      const analysisMap: Record<string, ChatAnalysis> = {};
      allAnalysisData.forEach((analysis) => {
        analysisMap[analysis.chat_id] = analysis;
      });

      // Combine chats with their analysis
      const chatsWithAnalysis = allChatsData.map((chat) => ({
        ...chat,
        analysis: analysisMap[chat.id] || undefined,
      }));

      console.log('=== ChatAnalysisList Debug ===');
      console.log('Chats with analysis:', chatsWithAnalysis.filter(c => c.analysis).length);
      console.log('Sample chat with analysis:', chatsWithAnalysis.find(c => c.analysis));

      setChats(chatsWithAnalysis);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterChats = () => {
    let filtered = [...chats];

    console.log('=== Filter Debug ===');
    console.log('Initial chats count:', chats.length);
    console.log('Chats with analysis:', chats.filter(c => c.analysis).length);

    filtered = filtered.filter((chat) => {
      if (!chat.analysis) return true;
      const score = parseScore(chat.analysis.overall_score);
      if (score === 0 && chat.analysis.ai_summary?.includes('Empty chat') && chat.analysis.issues_detected?.critical_errors?.includes('No messages in chat')) {
        return false;
      }
      return true;
    });

    console.log('After empty filter:', filtered.length);

    if (searchTerm) {
      filtered = filtered.filter(
        (chat) =>
          chat.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          chat.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          chat.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          matchingChatIds.includes(chat.id)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((chat) =>
        filterStatus === 'analyzed' ? chat.analyzed : !chat.analyzed
      );
    }

    if (dateFrom) {
      const { start } = getIstanbulDateBoundaries(dateFrom);
      filtered = filtered.filter((chat) => new Date(chat.created_at) >= start);
    }

    if (dateTo) {
      const { end } = getIstanbulDateBoundaries(dateTo);
      filtered = filtered.filter((chat) => new Date(chat.created_at) <= end);
    }

    console.log('Filter sentiment:', filterSentiment);
    if (filterSentiment !== 'all') {
      filtered = filtered.filter((chat) => {
        if (!chat.analysis) return false;
        const score = parseScore(chat.analysis.overall_score);
        if (filterSentiment === 'positive') return score >= 80;
        if (filterSentiment === 'neutral') return score >= 50 && score < 80;
        if (filterSentiment === 'negative') return score < 50;
        return true;
      });
    }

    console.log('Final filtered count:', filtered.length);
    setFilteredChats(filtered);
  };

  const parseScore = (score: number | string | undefined): number => {
    if (!score) return 0;
    return typeof score === 'string' ? parseInt(score) : score;
  };

  const getScoreColor = (score: number | string) => {
    const numScore = parseScore(score);
    if (numScore >= 80) return 'text-green-600 bg-green-50';
    if (numScore >= 50) return 'text-slate-600 bg-slate-50';
    return 'text-red-600 bg-red-50';
  };

  const getSentimentIcon = (sentiment?: string) => {
    if (!sentiment) return '😐';
    switch (sentiment.toLowerCase()) {
      case 'positive':
      case 'olumlu':
        return '😊';
      case 'negative':
      case 'olumsuz':
        return '😟';
      default:
        return '😐';
    }
  };

  const loadChatMessages = async (chat: ChatWithAnalysis) => {
    try {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: true });

      setSelectedChat({ ...chat, messages: messages || [] });
    } catch (error) {
      console.error('Error loading messages:', error);
      setSelectedChat(chat);
    }
  };

  const startAnalysis = async () => {
    setAnalyzing(true);
    setAnalyzeStatus('Analiz başlatılıyor...');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-chat`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setAnalyzeStatus(`Tamamlandı! ${result.analyzed || 0} chat analiz edildi.`);
        setTimeout(() => {
          loadChats();
          setAnalyzeStatus('');
        }, 3000);
      } else {
        setAnalyzeStatus('Analiz başlatıldı. Tamamlanması birkaç dakika sürebilir.');
        setTimeout(() => {
          loadChats();
          setAnalyzeStatus('');
        }, 5000);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalyzeStatus('Analiz başlatıldı. Tamamlanması birkaç dakika sürebilir.');
      setTimeout(() => {
        loadChats();
        setAnalyzeStatus('');
      }, 5000);
    } finally {
      setAnalyzing(false);
    }
  };

  const summaryStats = useMemo(() => {
    const analyzed = filteredChats.filter(c => c.analysis);
    const positive = analyzed.filter(c => parseScore(c.analysis?.overall_score) >= 80);
    const neutral = analyzed.filter(c => {
      const s = parseScore(c.analysis?.overall_score);
      return s >= 50 && s < 80;
    });
    const negative = analyzed.filter(c => parseScore(c.analysis?.overall_score) < 50);
    const avgScore = analyzed.length > 0
      ? Math.round(analyzed.reduce((sum, c) => sum + parseScore(c.analysis?.overall_score), 0) / analyzed.length)
      : 0;
    return { total: analyzed.length, positive: positive.length, neutral: neutral.length, negative: negative.length, avgScore };
  }, [filteredChats]);

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
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Chat Analizleri</h1>
        <p className="text-sm sm:text-base text-slate-600 mt-1">Tum chat kayitlari ve kalite analizleri</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <button
          onClick={() => setFilterSentiment('all')}
          className={`glass-effect rounded-xl shadow-lg border-2 p-4 sm:p-5 hover:shadow-md transition-all text-left ${
            filterSentiment === 'all' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-100 truncate">Toplam Chat</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{totalChatsCount}</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilterSentiment('positive')}
          className={`glass-effect rounded-xl shadow-lg border-2 p-4 sm:p-5 hover:shadow-md transition-all text-left ${
            filterSentiment === 'positive' ? 'border-green-500 ring-2 ring-green-200' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <ThumbsUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-100 truncate">Olumlu</p>
              <p className="text-xl sm:text-2xl font-bold text-green-700">{summaryStats.positive}</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilterSentiment('neutral')}
          className={`glass-effect rounded-xl shadow-lg border-2 p-4 sm:p-5 hover:shadow-md transition-all text-left ${
            filterSentiment === 'neutral' ? 'border-slate-500 ring-2 ring-slate-200' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Minus className="w-5 h-5 text-slate-100" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-100 truncate">Notr</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-200">{summaryStats.neutral}</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilterSentiment('negative')}
          className={`glass-effect rounded-xl shadow-lg border-2 p-4 sm:p-5 hover:shadow-md transition-all text-left ${
            filterSentiment === 'negative' ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <ThumbsDown className="w-5 h-5 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-100 truncate">Olumsuz</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">{summaryStats.negative}</p>
            </div>
          </div>
        </button>

        <div className="col-span-2 lg:col-span-1 glass-effect rounded-xl shadow-lg p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-100 truncate">Ort. Puan</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{summaryStats.avgScore}<span className="text-sm font-normal text-slate-200">/100</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-effect rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-200 w-5 h-5" />
            <input
              type="text"
              placeholder="Chat ID, temsilci, müşteri adı veya mesaj içeriği ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
              <Calendar className="w-4 h-4 text-slate-200 flex-shrink-0" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Baslangic"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
              <Calendar className="w-4 h-4 text-slate-200 flex-shrink-0" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Bitis"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="flex-1 min-w-[140px] px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">Tum Durumlar</option>
              <option value="analyzed">Analiz Edildi</option>
              <option value="pending">Analiz Bekliyor</option>
            </select>

            <select
              value={filterSentiment}
              onChange={(e) => setFilterSentiment(e.target.value as any)}
              className="flex-1 min-w-[140px] px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">Tum Duygular</option>
              <option value="positive">Olumlu</option>
              <option value="neutral">Notr</option>
              <option value="negative">Olumsuz</option>
            </select>

            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setFilterStatus('all'); setFilterSentiment('all'); setSearchTerm(''); }}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              Temizle
            </button>

            <button
              onClick={loadChats}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Yenile
            </button>

            <button
              onClick={startAnalysis}
              disabled={analyzing}
              className={`px-4 py-2 text-white rounded-lg transition-colors text-sm ${
                analyzing
                  ? 'bg-amber-400 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {analyzing ? 'Analiz Ediliyor...' : 'Analiz Başlat'}
            </button>
          </div>

          {analyzeStatus && (
            <div className="mt-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
              {analyzeStatus}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {filteredChats.length === 0 ? (
            <div className="text-center py-12 text-slate-100">
              <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Hiç chat bulunamadı</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => loadChatMessages(chat)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-mono text-xs text-slate-100 bg-slate-100 px-2 py-1 rounded truncate max-w-[120px] sm:max-w-none">
                        {chat.id}
                      </span>
                      <span className="font-semibold text-sm text-white">
                        {chat.agent_name}
                      </span>
                      <span className="text-slate-600 hidden sm:inline">-</span>
                      <span className="text-sm text-slate-200">{maskName(chat.customer_name)}</span>
                      {chat.analysis && (
                        <span className="text-lg">{getSentimentIcon(chat.analysis.sentiment)}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600">
                      <span>{new Date(chat.created_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</span>
                      <span>{chat.message_count} mesaj</span>
                      {chat.first_response_time && (
                        <span>Ilk yanit: {chat.first_response_time}s</span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-xs ${chat.analyzed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-white'}`}>
                        {chat.analyzed ? 'Analiz Edildi' : 'Bekliyor'}
                      </span>
                    </div>
                    {chat.analysis && (
                      <div className="mt-2 text-xs sm:text-sm text-slate-600 line-clamp-2">
                        {chat.analysis.ai_summary}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    {chat.analysis && (
                      <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-sm ${getScoreColor(chat.analysis.overall_score)}`}>
                        {parseScore(chat.analysis.overall_score)}/100
                      </div>
                    )}
                    {chat.analysis && parseScore(chat.analysis.overall_score) < 50 && (
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <Eye className="w-5 h-5 text-slate-200 flex-shrink-0 hidden sm:block" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center sm:p-4 z-50" onClick={() => setSelectedChat(null)}>
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-white">Chat Detayi</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {selectedChat.agent_name} - {maskName(selectedChat.customer_name)}
                  </p>
                  <p className="text-xs text-slate-100 mt-1 font-mono truncate">
                    {selectedChat.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedChat(null)}
                  className="text-slate-200 hover:text-slate-600 p-1 flex-shrink-0"
                >
                  X
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {selectedChat.messages && selectedChat.messages.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className="w-5 h-5 text-slate-600" />
                    <h3 className="font-semibold text-white">Konuşma Geçmişi ({selectedChat.messages.length} mesaj)</h3>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedChat.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg ${
                          message.author_type === 'agent'
                            ? 'bg-blue-100 ml-4 sm:ml-8'
                            : message.author_type === 'client'
                            ? 'bg-white mr-4 sm:mr-8'
                            : 'bg-gray-100'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-200">
                            {message.author_type === 'agent' ? '🎧 Temsilci' : message.author_type === 'client' ? '👤 Müşteri' : '🤖 Sistem'}
                          </span>
                          <span className="text-xs text-slate-100">
                            {new Date(message.created_at).toLocaleTimeString('tr-TR')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 whitespace-pre-wrap">{message.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {selectedChat.analysis ? (
                <>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
                      <div className="text-xs sm:text-sm text-slate-600 mb-1">Genel Skor</div>
                      <div className="text-xl sm:text-3xl font-bold text-white">
                        {parseScore(selectedChat.analysis.overall_score)}/100
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
                      <div className="text-xs sm:text-sm text-slate-600 mb-1">Duygu</div>
                      <div className="text-base sm:text-xl font-semibold text-white capitalize">
                        {getSentimentIcon(selectedChat.analysis.sentiment)} {selectedChat.analysis.sentiment}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
                      <div className="text-xs sm:text-sm text-slate-600 mb-1">Ilk Yanit</div>
                      <div className="text-xl sm:text-3xl font-bold text-white">
                        {selectedChat.first_response_time ? `${selectedChat.first_response_time}s` : '-'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-white mb-2">AI Özeti</h3>
                    <p className="text-slate-200">{selectedChat.analysis.ai_summary}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-white mb-2">Tespit Edilen Sorunlar</h3>
                    {selectedChat.analysis.issues_detected.critical_errors?.length > 0 && (
                      <div className="mb-2">
                        <div className="text-sm font-medium text-red-700 mb-1">Kritik Hatalar:</div>
                        <ul className="list-disc list-inside text-sm text-slate-200">
                          {selectedChat.analysis.issues_detected.critical_errors.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedChat.analysis.issues_detected.improvement_areas?.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-orange-700 mb-1">Geliştirilmesi Gerekenler:</div>
                        <ul className="list-disc list-inside text-sm text-slate-200">
                          {selectedChat.analysis.issues_detected.improvement_areas.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {selectedChat.analysis.positive_aspects.strengths?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-white mb-2">Güçlü Yönler</h3>
                      <ul className="list-disc list-inside text-sm text-slate-200">
                        {selectedChat.analysis.positive_aspects.strengths.map((strength, i) => (
                          <li key={i}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-white mb-2">Öneriler</h3>
                    <p className="text-slate-200 text-sm">{selectedChat.analysis.recommendations}</p>
                  </div>
                </>
              ) : (
                <div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
                    <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
                      <div className="text-xs sm:text-sm text-slate-600 mb-1">Mesaj</div>
                      <div className="text-xl sm:text-3xl font-bold text-white">
                        {selectedChat.message_count}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
                      <div className="text-xs sm:text-sm text-slate-600 mb-1">Ilk Yanit</div>
                      <div className="text-xl sm:text-3xl font-bold text-white">
                        {selectedChat.first_response_time ? `${selectedChat.first_response_time}s` : '-'}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
                      <div className="text-xs sm:text-sm text-slate-600 mb-1">Durum</div>
                      <div className="text-base sm:text-xl font-semibold text-white capitalize">
                        {selectedChat.status}
                      </div>
                    </div>
                  </div>
                  <div className="text-center py-8 text-slate-100">
                    Bu chat henüz analiz edilmedi
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { maskName } from '../lib/utils';
import { MessageSquare, User, Calendar, Clock, Filter, Search, AlertCircle, CheckCircle, X, ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';

interface Chat {
  id: string;
  agent_name: string;
  customer_name: string;
  created_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  message_count: number;
  status: string;
  analyzed: boolean;
  first_response_time: number | null;
  rating_score: number | null;
  rating_status: string | null;
  rating_comment: string | null;
  has_rating_comment: boolean | null;
  complaint_flag: boolean | null;
}

interface ChatMessage {
  message_id: string;
  author_type: string;
  text: string;
  created_at: string;
  is_system: boolean;
}

export default function ChatList() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('');
  const [analyzedFilter, setAnalyzedFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [missedFilter, setMissedFilter] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const [agents, setAgents] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);

  // Helper: Convert UTC date to Istanbul timezone date string
  const getIstanbulDateString = (date: Date): string => {
    return date.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' })
      .split('.').reverse().join('-');
  };

  // Helper: Get Istanbul timezone date range boundaries
  const getIstanbulDateBoundaries = (dateStr: string): { start: Date, end: Date } => {
    const istanbulDate = new Date(dateStr + 'T00:00:00+03:00');
    const istanbulDateEnd = new Date(dateStr + 'T23:59:59.999+03:00');
    return { start: istanbulDate, end: istanbulDateEnd };
  };

  // Quick date filters
  const setQuickDateFilter = (filter: 'today' | 'yesterday' | 'last7days') => {
    const now = new Date();
    const istanbulNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));

    switch (filter) {
      case 'today':
        const today = getIstanbulDateString(istanbulNow);
        setDateFrom(today);
        setDateTo(today);
        break;
      case 'yesterday':
        const yesterday = new Date(istanbulNow);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getIstanbulDateString(yesterday);
        setDateFrom(yesterdayStr);
        setDateTo(yesterdayStr);
        break;
      case 'last7days':
        const last7days = new Date(istanbulNow);
        last7days.setDate(last7days.getDate() - 7);
        setDateFrom(getIstanbulDateString(last7days));
        setDateTo(getIstanbulDateString(istanbulNow));
        break;
    }
  };

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [chats, statusFilter, agentFilter, analyzedFilter, ratingFilter, missedFilter, searchQuery, dateFrom, dateTo]);

  const loadChats = async () => {
    try {
      setLoading(true);
      let allChats: Chat[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('chats')
          .select('id, chat_id, agent_name, customer_name, created_at, ended_at, duration_seconds, message_count, status, analyzed, first_response_time, rating_score, rating_status, rating_comment, has_rating_comment, complaint_flag')
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allChats = [...allChats, ...data];
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      setChats(allChats);

      // Extract unique agents
      const uniqueAgents = [...new Set(allChats.map(c => c.agent_name))].filter(Boolean);
      setAgents(uniqueAgents);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...chats];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(chat => chat.status === statusFilter);
    }

    // Agent filter
    if (agentFilter) {
      filtered = filtered.filter(chat => chat.agent_name === agentFilter);
    }

    // Analyzed filter
    if (analyzedFilter === 'analyzed') {
      filtered = filtered.filter(chat => chat.analyzed);
    } else if (analyzedFilter === 'not_analyzed') {
      filtered = filtered.filter(chat => !chat.analyzed);
    }

    // Rating filter (LiveChat uses 1-5 scale: 1-2 = dislike, 4-5 = like)
    if (ratingFilter !== 'all') {
      filtered = filtered.filter(chat => {
        const rawScore = chat.rating_score;
        const ratingScore = Number(rawScore);
        const ratingComment = chat.rating_comment;

        switch (ratingFilter) {
          case 'like':
            return !isNaN(ratingScore) && ratingScore >= 4;
          case 'dislike':
            return !isNaN(ratingScore) && ratingScore >= 1 && ratingScore <= 2;
          case 'with_comment':
            return ratingComment !== null && ratingComment !== undefined && ratingComment !== '';
          case 'not_rated':
            return rawScore === null || rawScore === undefined;
          default:
            return true;
        }
      });
    }

    // Missed chat filter (customer messages > 0, agent messages = 0)
    if (missedFilter) {
      filtered = filtered.filter(async chat => {
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('author_type')
          .eq('chat_id', chat.id)
          .eq('is_system', false);

        const agentMsgs = messages?.filter(m => m.author_type === 'agent').length || 0;
        const customerMsgs = messages?.filter(m => m.author_type === 'customer').length || 0;
        return customerMsgs > 0 && agentMsgs === 0;
      });
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(chat =>
        chat.customer_name.toLowerCase().includes(query) ||
        chat.agent_name.toLowerCase().includes(query) ||
        chat.id.toLowerCase().includes(query)
      );
    }

    // Date range filter using Istanbul timezone
    if (dateFrom) {
      const { start } = getIstanbulDateBoundaries(dateFrom);
      filtered = filtered.filter(chat => new Date(chat.created_at) >= start);
    }
    if (dateTo) {
      const { end } = getIstanbulDateBoundaries(dateTo);
      filtered = filtered.filter(chat => new Date(chat.created_at) <= end);
    }

    setFilteredChats(filtered);
  };

  const loadMessages = async (chatId: string) => {
    try {
      setLoadingMessages(true);

      let allMessages: any[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data: batch, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true })
          .range(from, from + batchSize - 1);

        if (error) throw error;
        if (!batch || batch.length === 0) break;
        allMessages = [...allMessages, ...batch];
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      setMessages(allMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleChatClick = async (chat: Chat) => {
    setSelectedChat(chat);
    await loadMessages(chat.id);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setAgentFilter('');
    setAnalyzedFilter('all');
    setRatingFilter('all');
    setMissedFilter(false);
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Aktif</span>;
      case 'archived':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Arşiv</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{status}</span>;
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Tum Chatler</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">LiveChat'ten gelen tum sohbetler</p>
        </div>
        <button
          onClick={loadChats}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex-shrink-0 self-start"
        >
          Yenile
        </button>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Filtreler</h2>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showFilters ? 'Gizle' : 'Göster'}
          </button>
        </div>

        {showFilters && (
          <div className="space-y-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Ara</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Chat ID, müşteri veya temsilci adı..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Durum</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tümü</option>
                  <option value="active">Aktif</option>
                  <option value="archived">Arşiv</option>
                </select>
              </div>

              {/* Agent Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Temsilci</label>
                <select
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tümü</option>
                  {agents.map(agent => (
                    <option key={agent} value={agent}>{agent}</option>
                  ))}
                </select>
              </div>

              {/* Analyzed Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Analiz Durumu</label>
                <select
                  value={analyzedFilter}
                  onChange={(e) => setAnalyzedFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tümü</option>
                  <option value="analyzed">Analiz Edildi</option>
                  <option value="not_analyzed">Analiz Edilmedi</option>
                </select>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Müşteri Değerlendirmesi</label>
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tümü</option>
                  <option value="like">👍 Beğenilen</option>
                  <option value="dislike">👎 Beğenilmeyen</option>
                  <option value="with_comment">💬 Yorumlu</option>
                  <option value="not_rated">⚪ Değerlendirilmemiş</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-slate-700">Tarih Araligi</label>
                <span className="text-xs text-slate-500">Hizli Filtre:</span>
                <button
                  onClick={() => setQuickDateFilter('today')}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Bugün
                </button>
                <button
                  onClick={() => setQuickDateFilter('yesterday')}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Dün
                </button>
                <button
                  onClick={() => setQuickDateFilter('last7days')}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Son 7 Gün
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date From */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              {(dateFrom || dateTo) && (
                <p className="text-xs text-slate-600">
                  Seçilen aralık: {dateFrom || '...'} ~ {dateTo || '...'} (00:00-23:59 İstanbul Saati)
                </p>
              )}
            </div>

            {/* Missed Chat Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="missedFilter"
                checked={missedFilter}
                onChange={(e) => setMissedFilter(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="missedFilter" className="text-sm font-medium text-slate-700">
                Sadece kaçırılmış chatleri göster
              </label>
            </div>

            <button
              onClick={clearFilters}
              className="text-sm text-slate-600 hover:text-slate-800 font-medium"
            >
              Filtreleri Temizle
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-slate-600">Toplam Chat</p>
          <p className="text-lg sm:text-2xl font-bold text-slate-900">{filteredChats.length}</p>
        </div>

        <div
          className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 relative cursor-help hover:border-green-400 transition-colors"
          onMouseEnter={() => setHoveredStat('analyzed')}
          onMouseLeave={() => setHoveredStat(null)}
        >
          <p className="text-xs sm:text-sm text-slate-600">Analiz Edildi</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">
            {filteredChats.filter(c => c.analyzed).length}
          </p>
          {hoveredStat === 'analyzed' && (
            <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 max-h-96 overflow-y-auto bg-slate-900 text-white text-xs rounded-lg shadow-xl p-3">
              <div className="font-semibold mb-2 pb-2 border-b border-slate-700">Analiz Edilmiş Chatler</div>
              <div className="space-y-1">
                {filteredChats.filter(c => c.analyzed).slice(0, 50).map(c => (
                  <div key={c.id} className="flex items-center justify-between py-1 hover:bg-slate-800 px-2 rounded">
                    <span className="font-mono">#{c.id.slice(0, 10)}</span>
                    <span className="text-slate-400">{c.agent_name}</span>
                  </div>
                ))}
                {filteredChats.filter(c => c.analyzed).length > 50 && (
                  <div className="text-slate-400 text-center pt-2">+{filteredChats.filter(c => c.analyzed).length - 50} daha...</div>
                )}
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="border-8 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          )}
        </div>

        <div
          className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 relative cursor-help hover:border-green-400 transition-colors"
          onMouseEnter={() => setHoveredStat('liked')}
          onMouseLeave={() => setHoveredStat(null)}
        >
          <p className="text-xs sm:text-sm text-slate-600">Begenilen</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">
            {filteredChats.filter(c => Number(c.rating_score) >= 4).length}
          </p>
          {hoveredStat === 'liked' && (
            <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 max-h-96 overflow-y-auto bg-slate-900 text-white text-xs rounded-lg shadow-xl p-3">
              <div className="font-semibold mb-2 pb-2 border-b border-slate-700">Beğenilen Chatler</div>
              <div className="space-y-1">
                {filteredChats.filter(c => Number(c.rating_score) >= 4).slice(0, 50).map(c => (
                  <div key={c.id} className="flex items-center justify-between py-1 hover:bg-slate-800 px-2 rounded">
                    <span className="font-mono">#{c.id.slice(0, 10)}</span>
                    <span className="text-slate-400">{c.agent_name}</span>
                  </div>
                ))}
                {filteredChats.filter(c => Number(c.rating_score) >= 4).length > 50 && (
                  <div className="text-slate-400 text-center pt-2">+{filteredChats.filter(c => Number(c.rating_score) >= 4).length - 50} daha...</div>
                )}
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="border-8 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          )}
        </div>

        <div
          className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 relative cursor-help hover:border-red-400 transition-colors"
          onMouseEnter={() => setHoveredStat('disliked')}
          onMouseLeave={() => setHoveredStat(null)}
        >
          <p className="text-xs sm:text-sm text-slate-600">Begenilmeyen</p>
          <p className="text-lg sm:text-2xl font-bold text-red-600">
            {filteredChats.filter(c => {
              const s = Number(c.rating_score);
              return !isNaN(s) && s >= 1 && s <= 2;
            }).length}
          </p>
          {hoveredStat === 'disliked' && (
            <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 max-h-96 overflow-y-auto bg-slate-900 text-white text-xs rounded-lg shadow-xl p-3">
              <div className="font-semibold mb-2 pb-2 border-b border-slate-700">Beğenilmeyen Chatler</div>
              <div className="space-y-1">
                {filteredChats.filter(c => {
                  const s = Number(c.rating_score);
                  return !isNaN(s) && s >= 1 && s <= 2;
                }).slice(0, 50).map(c => (
                  <div key={c.id} className="flex items-center justify-between py-1 hover:bg-slate-800 px-2 rounded">
                    <span className="font-mono">#{c.id.slice(0, 10)}</span>
                    <span className="text-slate-400">{c.agent_name}</span>
                  </div>
                ))}
                {filteredChats.filter(c => {
                  const s = Number(c.rating_score);
                  return !isNaN(s) && s >= 1 && s <= 2;
                }).length > 50 && (
                  <div className="text-slate-400 text-center pt-2">+{filteredChats.filter(c => {
                    const s = Number(c.rating_score);
                    return !isNaN(s) && s >= 1 && s <= 2;
                  }).length - 50} daha...</div>
                )}
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="border-8 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          )}
        </div>

        <div
          className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 relative cursor-help hover:border-blue-400 transition-colors"
          onMouseEnter={() => setHoveredStat('commented')}
          onMouseLeave={() => setHoveredStat(null)}
        >
          <p className="text-xs sm:text-sm text-slate-600">Yorumlu</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-600">
            {filteredChats.filter(c => c.rating_comment).length}
          </p>
          {hoveredStat === 'commented' && (
            <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 max-h-96 overflow-y-auto bg-slate-900 text-white text-xs rounded-lg shadow-xl p-3">
              <div className="font-semibold mb-2 pb-2 border-b border-slate-700">Yorumlu Chatler</div>
              <div className="space-y-1">
                {filteredChats.filter(c => c.rating_comment).slice(0, 50).map(c => (
                  <div key={c.id} className="flex items-center justify-between py-1 hover:bg-slate-800 px-2 rounded">
                    <span className="font-mono">#{c.id.slice(0, 10)}</span>
                    <span className="text-slate-400">{c.agent_name}</span>
                  </div>
                ))}
                {filteredChats.filter(c => c.rating_comment).length > 50 && (
                  <div className="text-slate-400 text-center pt-2">+{filteredChats.filter(c => c.rating_comment).length - 50} daha...</div>
                )}
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="border-8 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          )}
        </div>

        <div
          className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 relative cursor-help hover:border-slate-400 transition-colors"
          onMouseEnter={() => setHoveredStat('not_rated')}
          onMouseLeave={() => setHoveredStat(null)}
        >
          <p className="text-xs sm:text-sm text-slate-600 truncate">Degerlendirilmemis</p>
          <p className="text-lg sm:text-2xl font-bold text-slate-400">
            {filteredChats.filter(c => {
              const score = c.rating_score;
              return score === null || score === undefined;
            }).length}
          </p>
          {hoveredStat === 'not_rated' && (
            <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 max-h-96 overflow-y-auto bg-slate-900 text-white text-xs rounded-lg shadow-xl p-3">
              <div className="font-semibold mb-2 pb-2 border-b border-slate-700">Değerlendirilmemiş Chatler</div>
              <div className="space-y-1">
                {filteredChats.filter(c => {
                  const score = c.rating_score;
                  return score === null || score === undefined;
                }).slice(0, 50).map(c => (
                  <div key={c.id} className="flex items-center justify-between py-1 hover:bg-slate-800 px-2 rounded">
                    <span className="font-mono">#{c.id.slice(0, 10)}</span>
                    <span className="text-slate-400">{c.agent_name}</span>
                  </div>
                ))}
                {filteredChats.filter(c => {
                  const score = c.rating_score;
                  return score === null || score === undefined;
                }).length > 50 && (
                  <div className="text-slate-400 text-center pt-2">+{filteredChats.filter(c => {
                    const score = c.rating_score;
                    return score === null || score === undefined;
                  }).length - 50} daha...</div>
                )}
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="border-8 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: Chat List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 max-h-[600px] lg:max-h-[800px] overflow-y-auto">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Chatler ({filteredChats.length})
          </h2>

          {filteredChats.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Chat bulunamadı
            </div>
          ) : (
            <div className="space-y-3">
              {filteredChats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => handleChatClick(chat)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedChat?.id === chat.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-mono text-slate-600">#{chat.id.slice(0, 8)}</span>
                    </div>
                    {getStatusBadge(chat.status)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{maskName(chat.customer_name)}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-slate-700">{chat.agent_name}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(chat.created_at).toLocaleString('tr-TR', {
                          timeZone: 'Europe/Istanbul',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {chat.message_count} mesaj
                      </div>
                      {chat.first_response_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {chat.first_response_time}s
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {chat.analyzed ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          Analiz Edildi
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-orange-600">
                          <AlertCircle className="w-3 h-3" />
                          Analiz Bekliyor
                        </span>
                      )}
                      {(() => {
                        const rawScore = chat.rating_score;
                        const ratingScore = Number(rawScore);
                        const ratingComment = chat.rating_comment;

                        if (!isNaN(ratingScore) && rawScore !== null && rawScore !== undefined) {
                          if (ratingScore >= 4) {
                            return (
                              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                <ThumbsUp className="w-3 h-3" />
                                Beğenildi
                              </span>
                            );
                          } else if (ratingScore <= 2) {
                            return (
                              <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                <ThumbsDown className="w-3 h-3" />
                                Beğenilmedi
                              </span>
                            );
                          }
                        }

                        if (ratingComment) {
                          return (
                            <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              <MessageCircle className="w-3 h-3" />
                              Yorumlu
                            </span>
                          );
                        }

                        return null;
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Chat Details */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 max-h-[600px] lg:max-h-[800px] overflow-y-auto">
          {!selectedChat ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
              <p>Detayları görmek için bir chat seçin</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Chat Detayları</h2>
                <button
                  onClick={() => setSelectedChat(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Info */}
              <div className="space-y-3 mb-6 pb-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Chat ID:</span>
                  <span className="text-sm font-mono text-slate-900">{selectedChat.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Müşteri:</span>
                  <span className="text-sm font-medium text-slate-900">{maskName(selectedChat.customer_name)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Temsilci:</span>
                  <span className="text-sm font-medium text-slate-900">{selectedChat.agent_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Durum:</span>
                  {getStatusBadge(selectedChat.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Başlangıç:</span>
                  <span className="text-sm text-slate-900">
                    {new Date(selectedChat.created_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                  </span>
                </div>
                {selectedChat.ended_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Bitiş:</span>
                    <span className="text-sm text-slate-900">
                      {new Date(selectedChat.ended_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                    </span>
                  </div>
                )}
                {selectedChat.duration_seconds && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Süre:</span>
                    <span className="text-sm text-slate-900">
                      {Math.floor(selectedChat.duration_seconds / 60)}d {selectedChat.duration_seconds % 60}s
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Mesaj Sayısı:</span>
                  <span className="text-sm font-medium text-slate-900">{selectedChat.message_count}</span>
                </div>
                {(() => {
                  const rawScore = selectedChat.rating_score;
                  const ratingScore = Number(rawScore);
                  const ratingComment = selectedChat.rating_comment;
                  const isLike = !isNaN(ratingScore) && ratingScore >= 4;
                  const isDislike = !isNaN(ratingScore) && ratingScore >= 1 && ratingScore <= 2;

                  if (rawScore !== null && rawScore !== undefined && (isLike || isDislike)) {
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Değerlendirme:</span>
                          <span className={`flex items-center gap-1 text-sm font-medium ${isLike ? 'text-green-600' : 'text-red-600'}`}>
                            {isLike ? <ThumbsUp className="w-4 h-4" /> : <ThumbsDown className="w-4 h-4" />}
                            {isLike ? 'Beğenildi' : 'Beğenilmedi'} ({ratingScore}/5)
                          </span>
                        </div>
                        {ratingComment && (
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-slate-600">Müşteri Yorumu:</span>
                            <div className="text-sm bg-slate-50 p-3 rounded border border-slate-200">
                              {ratingComment}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  }

                  return null;
                })()}
              </div>

              {/* Messages */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Mesajlar</h3>
                {loadingMessages ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    Mesaj bulunamadı
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <div
                        key={msg.message_id}
                        className={`p-3 rounded-lg ${
                          msg.is_system
                            ? 'bg-slate-100 border border-slate-200'
                            : msg.author_type === 'agent'
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-green-50 border border-green-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold">
                            {msg.is_system
                              ? 'Sistem'
                              : msg.author_type === 'agent'
                              ? 'Temsilci'
                              : 'Müşteri'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(msg.created_at).toLocaleTimeString('tr-TR')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-900 whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { maskName, SCORE_TIERS, ScoreTierKey } from '../lib/utils';
import { Search, Filter, Eye, AlertCircle, MessageCircle, Calendar, BarChart3, X, RefreshCw, PlayCircle, Lightbulb, Sparkles, User, Headphones, RotateCcw, AlertTriangle } from 'lucide-react';
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
  const [filterSentiment, setFilterSentiment] = useState<'all' | ScoreTierKey>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedChat, setSelectedChat] = useState<ChatWithAnalysis | null>(null);
  const [totalChatsCount, setTotalChatsCount] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState<string>('');
  const [matchingChatIds, setMatchingChatIds] = useState<string[]>([]);
  const [loadingCoaching, setLoadingCoaching] = useState(false);
  const [coachingError, setCoachingError] = useState<string>('');
  const [reanalyzing, setReanalyzing] = useState(false);
  const [showReanalyzeConfirm, setShowReanalyzeConfirm] = useState(false);

  const getIstanbulDateBoundaries = (dateStr: string): { start: Date, end: Date } => {
    const istanbulDate = new Date(dateStr + 'T00:00:00+03:00');
    const istanbulDateEnd = new Date(dateStr + 'T23:59:59.999+03:00');
    return { start: istanbulDate, end: istanbulDateEnd };
  };

  useEffect(() => { loadChats(); }, []);

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
        setMatchingChatIds([...new Set(messages.map(m => m.chat_id))]);
      }
    } catch {
      setMatchingChatIds([]);
    }
  };

  const loadChats = async () => {
    try {
      const { count: totalCount } = await supabase
        .from('chats')
        .select('*', { count: 'exact', head: true });
      setTotalChatsCount(totalCount || 0);

      let allChatsData: any[] = [];
      let from = 0;
      while (true) {
        const { data: batch, error } = await supabase
          .from('chats')
          .select('id, chat_id, agent_name, customer_name, created_at, analyzed, first_response_time, message_count, status')
          .order('created_at', { ascending: false })
          .range(from, from + 999);
        if (error || !batch || batch.length === 0) break;
        allChatsData = [...allChatsData, ...batch];
        if (batch.length < 1000) break;
        from += 1000;
      }

      let allAnalysisData: any[] = [];
      from = 0;
      while (true) {
        const { data: batch, error } = await supabase
          .from('chat_analysis')
          .select('*')
          .range(from, from + 999);
        if (error || !batch || batch.length === 0) break;
        allAnalysisData = [...allAnalysisData, ...batch];
        if (batch.length < 1000) break;
        from += 1000;
      }

      const analysisMap: Record<string, ChatAnalysis> = {};
      allAnalysisData.forEach(a => { analysisMap[a.chat_id] = a; });

      setChats(allChatsData.map(chat => ({ ...chat, analysis: analysisMap[chat.id] })));
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterChats = () => {
    let filtered = chats.filter(chat => {
      if (!chat.analysis) return true;
      const score = parseScore(chat.analysis.overall_score);
      if (score === 0 && chat.analysis.ai_summary?.includes('Empty chat')) return false;
      return true;
    });

    if (searchTerm) {
      filtered = filtered.filter(chat =>
        chat.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        matchingChatIds.includes(chat.id)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(chat => filterStatus === 'analyzed' ? chat.analyzed : !chat.analyzed);
    }

    if (dateFrom) {
      const { start } = getIstanbulDateBoundaries(dateFrom);
      filtered = filtered.filter(chat => new Date(chat.created_at) >= start);
    }

    if (dateTo) {
      const { end } = getIstanbulDateBoundaries(dateTo);
      filtered = filtered.filter(chat => new Date(chat.created_at) <= end);
    }

    if (filterSentiment !== 'all') {
      const tier = SCORE_TIERS.find(t => t.key === filterSentiment);
      if (tier) {
        filtered = filtered.filter(chat => {
          if (!chat.analysis) return false;
          const score = parseScore(chat.analysis.overall_score);
          return score >= tier.min && score <= tier.max;
        });
      }
    }

    setFilteredChats(filtered);
  };

  const parseScore = (score: number | string | undefined): number => {
    if (!score) return 0;
    return typeof score === 'string' ? parseInt(score) : score;
  };

  const formatResponseTime = (seconds: number | null | undefined): string => {
    if (!seconds && seconds !== 0) return '-';
    if (seconds < 60) return `${seconds} Sn`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins} Dk ${secs} Sn` : `${mins} Dk`;
  };

  const getScoreStyle = (score: number | string) => {
    const n = parseScore(score);
    if (n >= 90) return 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/30';
    if (n >= 70) return 'text-cyan-400 bg-cyan-400/10 border border-cyan-400/30';
    if (n >= 60) return 'text-blue-400 bg-blue-400/10 border border-blue-400/30';
    if (n >= 40) return 'text-amber-400 bg-amber-400/10 border border-amber-400/30';
    if (n >= 30) return 'text-orange-400 bg-orange-400/10 border border-orange-400/30';
    return 'text-rose-400 bg-rose-400/10 border border-rose-400/30';
  };

  const getSentimentIcon = (sentiment?: string) => {
    if (!sentiment) return '😐';
    switch (sentiment.toLowerCase()) {
      case 'positive': case 'olumlu': return '😊';
      case 'negative': case 'olumsuz': return '😟';
      default: return '😐';
    }
  };

  const loadChatMessages = async (chat: ChatWithAnalysis) => {
    setCoachingError('');
    try {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: true });
      setSelectedChat({ ...chat, messages: messages || [] });
    } catch {
      setSelectedChat(chat);
    }
  };

  const parseDialogue = (suggestion: string): Array<{ speaker: 'agent' | 'customer'; text: string }> => {
    const match = suggestion.match(/DIYALOG_BASLANGIC([\s\S]*?)DIYALOG_BITIS/);
    if (!match) return [];
    return match[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('Üye:') || line.startsWith('Temsilci:'))
      .map(line => {
        if (line.startsWith('Temsilci:')) return { speaker: 'agent' as const, text: line.replace('Temsilci:', '').trim() };
        return { speaker: 'customer' as const, text: line.replace('Üye:', '').trim() };
      });
  };

  const fetchCoaching = async () => {
    if (!selectedChat || !selectedChat.analysis) return;
    setLoadingCoaching(true);
    setCoachingError('');
    try {
      const messages = (selectedChat.messages || []).map(m => ({
        author: { name: m.author_name || (m.author_type === 'agent' ? 'Temsilci' : 'Üye') },
        text: m.text,
      }));

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || supabaseKey;

      const res = await fetch(`${supabaseUrl}/functions/v1/get-coaching`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          chatId: selectedChat.id,
          chatAnalysisId: selectedChat.analysis.id,
          messages,
          analysis: {
            sentiment: selectedChat.analysis.sentiment,
            score: selectedChat.analysis.overall_score,
            issues: [
              ...(selectedChat.analysis.issues_detected?.critical_errors || []),
              ...(selectedChat.analysis.issues_detected?.improvement_areas || []),
            ],
          },
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.suggestion) {
          setSelectedChat(prev => prev ? {
            ...prev,
            analysis: prev.analysis ? { ...prev.analysis, coaching_suggestion: result.suggestion } : prev.analysis,
          } : prev);
          setChats(prev => prev.map(c =>
            c.id === selectedChat.id && c.analysis
              ? { ...c, analysis: { ...c.analysis, coaching_suggestion: result.suggestion } }
              : c
          ));
        } else {
          setCoachingError(result.error || 'Koçluk önerisi oluşturulamadı.');
        }
      } else {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setCoachingError(errData.error || errData.details || `Hata: HTTP ${res.status}`);
      }
    } catch (err) {
      console.error('Coaching fetch error:', err);
      setCoachingError(err instanceof Error ? err.message : 'Bağlantı hatası oluştu.');
    } finally {
      setLoadingCoaching(false);
    }
  };

  const callResetFunction = async (chatId?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
    const resetUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-analyses`;
    const res = await fetch(resetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(chatId ? { chatId } : {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Bilinmeyen hata' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
  };

  const reanalyzeSingleChat = async () => {
    if (!selectedChat) return;
    setReanalyzing(true);
    const chatId = selectedChat.id;
    try {
      await callResetFunction(chatId);
      setChats(prev => prev.map(c =>
        c.id === chatId ? { ...c, analyzed: false, analysis: undefined } : c
      ));
      setSelectedChat(prev => prev ? { ...prev, analyzed: false, analysis: undefined } : null);
      setAnalyzeStatus('Chat sıfırlandı, analiz kuyruğa alındı. Birkaç dakika içinde güncellenir.');
      const analyzeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-chat`;
      await fetch(analyzeUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      });
      setTimeout(() => { loadChats(); setAnalyzeStatus(''); }, 8000);
    } catch (err) {
      console.error('Reanalyze error:', err);
      setAnalyzeStatus('Hata oluştu: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    } finally {
      setReanalyzing(false);
    }
  };

  const reanalyzeAll = async () => {
    setShowReanalyzeConfirm(false);
    setReanalyzing(true);
    setAnalyzeStatus('Tüm analizler sıfırlanıyor...');
    try {
      await callResetFunction();
      setChats(prev => prev.map(c => ({ ...c, analyzed: false, analysis: undefined })));
      setAnalyzeStatus('Tüm analizler sıfırlandı. Analiz başlatılıyor... (Her çalışmada 10 chat işlenir)');
      const analyzeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-chat`;
      await fetch(analyzeUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      });
      setTimeout(() => { loadChats(); setAnalyzeStatus(''); }, 8000);
    } catch (err) {
      console.error('Reanalyze all error:', err);
      setAnalyzeStatus('Hata oluştu, tekrar deneyin.');
    } finally {
      setReanalyzing(false);
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
      } else {
        setAnalyzeStatus('Analiz başlatıldı. Tamamlanması birkaç dakika sürebilir.');
      }
    } catch {
      setAnalyzeStatus('Analiz başlatıldı. Tamamlanması birkaç dakika sürebilir.');
    } finally {
      setAnalyzing(false);
      setTimeout(() => { loadChats(); setAnalyzeStatus(''); }, 5000);
    }
  };

  const summaryStats = useMemo(() => {
    const analyzed = filteredChats.filter(c => c.analysis);
    const tierCounts: Record<ScoreTierKey, number> = { mukemmel: 0, iyi: 0, orta: 0, olumsuz: 0, dikkat: 0, kritik: 0 };
    analyzed.forEach(c => {
      const score = parseScore(c.analysis?.overall_score);
      const tier = SCORE_TIERS.find(t => score >= t.min) || SCORE_TIERS[SCORE_TIERS.length - 1];
      tierCounts[tier.key as ScoreTierKey]++;
    });
    const avgScore = analyzed.length > 0
      ? Math.round(analyzed.reduce((sum, c) => sum + parseScore(c.analysis?.overall_score), 0) / analyzed.length)
      : 0;
    return { total: analyzed.length, tierCounts, avgScore };
  }, [filteredChats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Chat Analizleri</h1>
        <p className="text-sm text-slate-400 mt-1">Tüm chat kayıtları ve kalite analizleri</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
        <button
          onClick={() => setFilterSentiment('all')}
          className={`glass-effect rounded-xl p-3 sm:p-4 text-left transition-all border ${
            filterSentiment === 'all'
              ? 'border-blue-500 ring-1 ring-blue-500/50'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex flex-col gap-1">
            <p className="text-xs text-slate-400">Toplam</p>
            <p className="text-xl font-bold text-white">{totalChatsCount}</p>
            <div className="w-6 h-1 rounded bg-blue-500/50" />
          </div>
        </button>

        {SCORE_TIERS.map(tier => (
          <button
            key={tier.key}
            onClick={() => setFilterSentiment(tier.key)}
            className={`glass-effect rounded-xl p-3 sm:p-4 text-left transition-all border ${
              filterSentiment === tier.key ? `${tier.ringColor} ring-1` : 'border-white/10 hover:border-white/20'
            }`}
            style={filterSentiment === tier.key ? { borderColor: tier.color } : undefined}
          >
            <div className="flex flex-col gap-1">
              <p className="text-xs" style={{ color: tier.color }}>{tier.label}</p>
              <p className="text-xl font-bold" style={{ color: tier.color }}>
                {summaryStats.tierCounts[tier.key as ScoreTierKey] ?? 0}
              </p>
              <div className="text-xs text-slate-600">{tier.min}–{tier.max}</div>
            </div>
          </button>
        ))}

        <div className="glass-effect rounded-xl p-3 sm:p-4 border border-white/10">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-slate-400">Ort. Puan</p>
            <p className="text-xl font-bold text-white">
              {summaryStats.avgScore}<span className="text-xs font-normal text-slate-400">/100</span>
            </p>
            <div className="w-6 h-1 rounded bg-cyan-500/50" />
          </div>
        </div>
      </div>

      {/* Filters & List */}
      <div className="glass-effect rounded-xl border border-white/10 p-4 sm:p-6">
        <div className="flex flex-col gap-3 mb-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Chat ID, temsilci, müşteri adı veya mesaj içeriği ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors"
            />
          </div>

          {/* Date range */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
              <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors [color-scheme:dark]"
              />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
              <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Status, sentiment, actions */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="flex-1 min-w-[140px] px-3 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors [color-scheme:dark]"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="analyzed">Analiz Edildi</option>
              <option value="pending">Analiz Bekliyor</option>
            </select>

            <select
              value={filterSentiment}
              onChange={(e) => setFilterSentiment(e.target.value as any)}
              className="flex-1 min-w-[140px] px-3 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors [color-scheme:dark]"
            >
              <option value="all">Tüm Kategoriler</option>
              {SCORE_TIERS.map(tier => (
                <option key={tier.key} value={tier.key}>{tier.label} ({tier.min}–{tier.max})</option>
              ))}
            </select>

            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setFilterStatus('all'); setFilterSentiment('all'); setSearchTerm(''); }}
              className="px-4 py-2.5 bg-white/5 border border-white/10 text-slate-300 rounded-lg hover:bg-white/10 transition-colors text-sm"
            >
              Temizle
            </button>

            <button
              onClick={loadChats}
              className="px-4 py-2.5 bg-blue-600/80 border border-blue-500/50 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Yenile
            </button>

            <button
              onClick={startAnalysis}
              disabled={analyzing || reanalyzing}
              className={`px-4 py-2.5 rounded-lg text-sm flex items-center gap-1.5 border transition-colors ${
                analyzing
                  ? 'bg-slate-700 border-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-cyan-600/80 border-cyan-500/50 text-white hover:bg-cyan-600'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              {analyzing ? 'Analiz Ediliyor...' : 'Analiz Başlat'}
            </button>

            <button
              onClick={() => setShowReanalyzeConfirm(true)}
              disabled={analyzing || reanalyzing}
              className="px-4 py-2.5 rounded-lg text-sm flex items-center gap-1.5 border transition-colors bg-amber-600/20 border-amber-500/40 text-amber-300 hover:bg-amber-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Tümünü Yeniden Analiz Et
            </button>
          </div>

          {showReanalyzeConfirm && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-300 mb-1">Tüm analizler sıfırlanacak</p>
                <p className="text-xs text-slate-400">Mevcut tüm chat analizleri silinecek ve güncel AI modeliyle yeniden analiz edilecek. Her seferinde 10 chat işlenir. Devam etmek istiyor musunuz?</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={reanalyzeAll} className="px-3 py-1.5 bg-amber-500/30 border border-amber-500/50 text-amber-200 rounded-lg text-xs font-medium hover:bg-amber-500/40 transition-colors">
                    Evet, Sıfırla ve Yeniden Analiz Et
                  </button>
                  <button onClick={() => setShowReanalyzeConfirm(false)} className="px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 rounded-lg text-xs hover:bg-white/10 transition-colors">
                    İptal
                  </button>
                </div>
              </div>
            </div>
          )}

          {analyzeStatus && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-lg text-sm">
              {analyzeStatus}
            </div>
          )}
        </div>

        {/* Chat list */}
        <div className="space-y-2">
          {filteredChats.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Filter className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Hiç chat bulunamadı</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                className="p-4 bg-white/3 border border-white/8 rounded-lg hover:bg-white/6 hover:border-white/15 transition-all cursor-pointer"
                onClick={() => loadChatMessages(chat)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-mono text-xs text-slate-500 bg-white/5 border border-white/8 px-2 py-0.5 rounded truncate max-w-[120px] sm:max-w-none">
                        {chat.id}
                      </span>
                      <span className="font-semibold text-sm text-white">{chat.agent_name}</span>
                      <span className="text-slate-600 hidden sm:inline">—</span>
                      <span className="text-sm text-slate-400">{maskName(chat.customer_name)}</span>
                      {chat.analysis && (
                        <span className="text-base">{getSentimentIcon(chat.analysis.sentiment)}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 mb-1.5">
                      <span>{new Date(chat.created_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</span>
                      <span>{chat.message_count} mesaj</span>
                      {chat.first_response_time && <span>İlk yanıt: {formatResponseTime(chat.first_response_time)}</span>}
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        chat.analyzed
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          : 'bg-slate-500/10 border border-slate-500/20 text-slate-400'
                      }`}>
                        {chat.analyzed ? 'Analiz Edildi' : 'Bekliyor'}
                      </span>
                    </div>
                    {chat.analysis && (
                      <p className="text-xs text-slate-500 line-clamp-2">{chat.analysis.ai_summary}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {chat.analysis && (
                      <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${getScoreStyle(chat.analysis.overall_score)}`}>
                        {parseScore(chat.analysis.overall_score)}/100
                      </div>
                    )}
                    {chat.analysis && parseScore(chat.analysis.overall_score) < 60 && (
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    )}
                    <Eye className="w-4 h-4 text-slate-600 flex-shrink-0 hidden sm:block" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedChat && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50"
          onClick={() => setSelectedChat(null)}
        >
          <div
            className="bg-[#0f1623] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[#0f1623] z-10">
              <div className="p-4 sm:p-6 border-b border-white/10 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white">Chat Detayı</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  {selectedChat.agent_name} — {maskName(selectedChat.customer_name)}
                </p>
                <p className="text-xs text-slate-600 mt-0.5 font-mono truncate">{selectedChat.id}</p>
              </div>
              {selectedChat?.analysis && (
                <button
                  onClick={reanalyzeSingleChat}
                  disabled={reanalyzing}
                  title="Bu chati yeniden analiz et"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${reanalyzing ? 'animate-spin' : ''}`} />
                  Yeniden Analiz Et
                </button>
              )}
              <button
                onClick={() => setSelectedChat(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
              </div>
              {analyzeStatus && (
                <div className="px-4 sm:px-6 pb-3">
                  <div className={`p-3 border rounded-lg text-sm flex items-center gap-2 ${analyzeStatus.startsWith('Hata') ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'}`}>
                    <RefreshCw className={`w-3.5 h-3.5 flex-shrink-0 ${reanalyzing ? 'animate-spin' : ''}`} />
                    {analyzeStatus}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {selectedChat.messages && selectedChat.messages.length > 0 && (
                <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className="w-4 h-4 text-slate-400" />
                    <h3 className="font-semibold text-white text-sm">
                      Konuşma Geçmişi ({selectedChat.messages.length} mesaj)
                    </h3>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {selectedChat.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg ${
                          message.author_type === 'agent'
                            ? 'bg-blue-500/10 border border-blue-500/15 ml-6 sm:ml-12'
                            : message.author_type === 'client'
                            ? 'bg-white/5 border border-white/8 mr-6 sm:mr-12'
                            : 'bg-slate-500/10 border border-slate-500/15'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1 gap-2">
                          <span className="text-xs font-medium text-slate-400">
                            {message.author_type === 'agent' ? 'Temsilci' : message.author_type === 'client' ? 'Müşteri' : 'Sistem'}
                          </span>
                          <span className="text-xs text-slate-600 flex-shrink-0">
                            {new Date(message.created_at).toLocaleTimeString('tr-TR')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">{message.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedChat.analysis ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Genel Skor', value: `${parseScore(selectedChat.analysis.overall_score)}/100` },
                      { label: 'Duygu', value: `${getSentimentIcon(selectedChat.analysis.sentiment)} ${selectedChat.analysis.sentiment}` },
                      { label: 'İlk Yanıt', value: formatResponseTime(selectedChat.first_response_time) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white/3 border border-white/8 rounded-xl p-3 sm:p-4">
                        <div className="text-xs text-slate-500 mb-1">{label}</div>
                        <div className="text-lg sm:text-2xl font-bold text-white">{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Category Breakdown */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-white text-sm">Kategori Kırılımı</h3>

                    {/* DİL & ÜSLUP */}
                    {selectedChat.analysis.language_compliance && (
                      <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Dil & Üslup</span>
                          <div className="flex gap-1.5">
                            {selectedChat.analysis.language_compliance.copy_paste_detected && (
                              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400">Kopyala-Yapıştır</span>
                            )}
                            {selectedChat.analysis.language_compliance.forbidden_words?.length > 0 && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400">
                                Yasaklı: {selectedChat.analysis.language_compliance.forbidden_words.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2.5">
                          {[
                            { label: 'Profesyonel Dil', value: selectedChat.analysis.language_compliance.professional_language },
                            { label: 'Kibar Üslup', value: selectedChat.analysis.language_compliance.polite_tone },
                          ].map(({ label, value }) => {
                            const v = typeof value === 'number' ? value : 0;
                            const color = v >= 90 ? 'bg-emerald-500' : v >= 70 ? 'bg-cyan-500' : v >= 60 ? 'bg-blue-500' : v >= 40 ? 'bg-amber-500' : v >= 30 ? 'bg-orange-500' : 'bg-rose-500';
                            const textColor = v >= 90 ? 'text-emerald-400' : v >= 70 ? 'text-cyan-400' : v >= 60 ? 'text-blue-400' : v >= 40 ? 'text-amber-400' : v >= 30 ? 'text-orange-400' : 'text-rose-400';
                            return (
                              <div key={label}>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs text-slate-400">{label}</span>
                                  <span className={`text-xs font-semibold ${textColor}`}>{v}</span>
                                </div>
                                <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${v}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* KALİTE */}
                    {selectedChat.analysis.quality_metrics && (
                      <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-3">Kalite</span>
                        <div className="space-y-3">
                          {(() => {
                            const qm = selectedChat.analysis.quality_metrics;
                            const ar = typeof qm.answer_relevance === 'number' ? qm.answer_relevance : 0;
                            const arColor = ar >= 90 ? 'bg-emerald-500' : ar >= 70 ? 'bg-cyan-500' : ar >= 60 ? 'bg-blue-500' : ar >= 40 ? 'bg-amber-500' : ar >= 30 ? 'bg-orange-500' : 'bg-rose-500';
                            const arText = ar >= 90 ? 'text-emerald-400' : ar >= 70 ? 'text-cyan-400' : ar >= 60 ? 'text-blue-400' : ar >= 40 ? 'text-amber-400' : ar >= 30 ? 'text-orange-400' : 'text-rose-400';
                            const satColor = qm.customer_satisfaction === 'positive' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                              : qm.customer_satisfaction === 'negative' ? 'bg-red-500/15 border-red-500/30 text-red-400'
                              : 'bg-slate-500/15 border-slate-500/30 text-slate-400';
                            const satLabel = qm.customer_satisfaction === 'positive' ? 'Olumlu'
                              : qm.customer_satisfaction === 'negative' ? 'Olumsuz' : 'Nötr';
                            return (
                              <>
                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-slate-400">Cevap Kalitesi</span>
                                    <span className={`text-xs font-semibold ${arText}`}>{ar}</span>
                                  </div>
                                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${arColor}`} style={{ width: `${ar}%` }} />
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${qm.stalling_detected ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                    Oyalama: {qm.stalling_detected ? 'Var' : 'Yok'}
                                  </div>
                                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${qm.unnecessary_length ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                    Uzatma: {qm.unnecessary_length ? 'Var' : 'Yok'}
                                  </div>
                                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${satColor}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                    Memnuniyet: {satLabel}
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* PERFORMANS */}
                    {selectedChat.analysis.performance_metrics && (
                      <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-3">Performans</span>
                        <div className="space-y-2.5">
                          {[
                            { label: 'İlk Yanıt Kalitesi', value: selectedChat.analysis.performance_metrics.first_response_quality },
                            { label: 'Çözüm Odaklılık', value: selectedChat.analysis.performance_metrics.solution_focused },
                            { label: 'İletişim Etkinliği', value: selectedChat.analysis.performance_metrics.communication_effectiveness },
                          ].map(({ label, value }) => {
                            const v = typeof value === 'number' ? value : 0;
                            const color = v >= 90 ? 'bg-emerald-500' : v >= 70 ? 'bg-cyan-500' : v >= 60 ? 'bg-blue-500' : v >= 40 ? 'bg-amber-500' : v >= 30 ? 'bg-orange-500' : 'bg-rose-500';
                            const textColor = v >= 90 ? 'text-emerald-400' : v >= 70 ? 'text-cyan-400' : v >= 60 ? 'text-blue-400' : v >= 40 ? 'text-amber-400' : v >= 30 ? 'text-orange-400' : 'text-rose-400';
                            return (
                              <div key={label}>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs text-slate-400">{label}</span>
                                  <span className={`text-xs font-semibold ${textColor}`}>{v}</span>
                                </div>
                                <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${v}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-white text-sm mb-2">AI Özeti</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{selectedChat.analysis.ai_summary}</p>
                  </div>

                  {(selectedChat.analysis.issues_detected.critical_errors?.length > 0 ||
                    selectedChat.analysis.issues_detected.improvement_areas?.length > 0) && (
                    <div>
                      <h3 className="font-semibold text-white text-sm mb-2">Tespit Edilen Sorunlar</h3>
                      {selectedChat.analysis.issues_detected.critical_errors?.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs font-medium text-red-400 mb-1.5">Kritik Hatalar</div>
                          <ul className="space-y-1">
                            {selectedChat.analysis.issues_detected.critical_errors.map((issue, i) => (
                              <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">•</span>{issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedChat.analysis.issues_detected.improvement_areas?.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-amber-400 mb-1.5">Geliştirilmesi Gerekenler</div>
                          <ul className="space-y-1">
                            {selectedChat.analysis.issues_detected.improvement_areas.map((issue, i) => (
                              <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                <span className="text-amber-400 mt-0.5">•</span>{issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedChat.analysis.positive_aspects.strengths?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-white text-sm mb-2">Güçlü Yönler</h3>
                      <ul className="space-y-1">
                        {selectedChat.analysis.positive_aspects.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                            <span className="text-emerald-400 mt-0.5">•</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Öneriler */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-white text-sm">Öneriler</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{selectedChat.analysis.recommendations}</p>
                  </div>

                  {/* AI Koçluk & Örnek Diyalog */}
                  <div className="border border-blue-500/20 rounded-xl overflow-hidden">
                    <div className="bg-blue-500/10 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-semibold text-blue-300">AI Koçluk & Örnek Konuşma</span>
                      </div>
                      {!selectedChat.analysis.coaching_suggestion && (
                        <button
                          onClick={() => { setCoachingError(''); fetchCoaching(); }}
                          disabled={loadingCoaching}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {loadingCoaching ? (
                            <span className="w-3.5 h-3.5 border-2 border-blue-400/40 border-t-blue-400 rounded-full animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          {loadingCoaching ? 'Oluşturuluyor...' : coachingError ? 'Tekrar Dene' : 'Oluştur'}
                        </button>
                      )}
                    </div>

                    {selectedChat.analysis.coaching_suggestion ? (() => {
                      const suggestion = selectedChat.analysis.coaching_suggestion;
                      const dialogue = parseDialogue(suggestion);

                      const anaSorunMatch = suggestion.match(/(?:\*\*)?Ana Sorun(?:\*\*)?\s*:?\s*([\s\S]*?)(?=(?:\d+\.\s*)?(?:\*\*)?Yapılması|$)/i);
                      const anaSorun = anaSorunMatch ? anaSorunMatch[1].replace(/\*\*/g, '').replace(/\s+/g, ' ').trim() : '';

                      const yapMatch = suggestion.match(/(?:\*\*)?Yapılması Gerekenler?(?:\*\*)?\s*:?\s*([\s\S]*?)(?=(?:\d+\.\s*)?(?:\*\*)?Örnek|$)/i);
                      const bullets = yapMatch
                        ? yapMatch[1].split(/\n|-(?=\s)/).map(s => s.replace(/\*\*/g, '').trim()).filter(s => s.length > 5)
                        : [];

                      return (
                        <div className="p-4 space-y-4">
                          {anaSorun && (
                            <div>
                              <p className="text-xs font-semibold text-rose-400 uppercase tracking-wide mb-1.5">Ana Sorun</p>
                              <p className="text-sm text-slate-300 leading-relaxed">{anaSorun}</p>
                            </div>
                          )}

                          {bullets.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2">Yapılması Gerekenler</p>
                              <ul className="space-y-1.5">
                                {bullets.map((b, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                    {b}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {dialogue.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                <MessageCircle className="w-3.5 h-3.5" />
                                Doğru Konuşma Örneği
                              </p>
                              <div className="bg-slate-900/60 rounded-xl p-3 space-y-2.5 border border-white/5">
                                {dialogue.map((line, i) => (
                                  <div key={i} className={`flex items-end gap-2 ${line.speaker === 'agent' ? 'justify-end' : 'justify-start'}`}>
                                    {line.speaker === 'customer' && (
                                      <div className="w-7 h-7 rounded-full bg-slate-600/70 border border-white/10 flex items-center justify-center flex-shrink-0">
                                        <User className="w-3.5 h-3.5 text-slate-300" />
                                      </div>
                                    )}
                                    <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                                      line.speaker === 'agent'
                                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm'
                                        : 'bg-slate-700/70 border border-white/8 text-slate-200 rounded-bl-sm'
                                    }`}>
                                      {line.text}
                                    </div>
                                    {line.speaker === 'agent' && (
                                      <div className="w-7 h-7 rounded-full bg-blue-600/50 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                                        <Headphones className="w-3.5 h-3.5 text-blue-300" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-slate-500 mt-2 text-center">Bu örnek, tespit edilen sorunlara göre AI tarafından oluşturulmuştur.</p>
                            </div>
                          )}
                        </div>
                      );
                    })() : (
                      <div className="p-5 space-y-3">
                        {coachingError && (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg text-sm text-rose-300 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{coachingError}</span>
                          </div>
                        )}
                        <div className="text-center text-slate-500 text-sm py-4">
                          {loadingCoaching
                            ? 'AI koçluk önerisi ve örnek konuşma oluşturuluyor...'
                            : coachingError
                            ? 'Oluşturma sırasında hata oluştu. Yukarıdaki butona tıklayarak tekrar deneyebilirsiniz.'
                            : 'Koçluk önerisi ve örnek konuşma oluşturmak için butona tıklayın.'}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { label: 'Mesaj', value: selectedChat.message_count },
                      { label: 'İlk Yanıt', value: formatResponseTime(selectedChat.first_response_time) },
                      { label: 'Durum', value: selectedChat.status },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white/3 border border-white/8 rounded-xl p-3 sm:p-4">
                        <div className="text-xs text-slate-500 mb-1">{label}</div>
                        <div className="text-xl sm:text-2xl font-bold text-white capitalize">{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-center py-8 text-slate-500 text-sm">
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

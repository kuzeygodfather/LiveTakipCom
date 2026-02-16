import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, BarChart, MessageCircle, Lightbulb, AlertCircle, ChevronDown, ChevronUp, Loader2, Filter } from 'lucide-react';

interface ReportData {
  daily: any[];
  weekly: any[];
  monthly: any[];
}

interface ChatMessage {
  author_id: string;
  text: string;
  created_at: string;
}

interface NegativeChat {
  id: string;
  chat_id: string;
  agent_name: string;
  started_at: string;
  ended_at: string;
  sentiment: string;
  overall_score: number;
  issues_detected: { improvement_areas?: string[] };
  ai_summary: string;
  chat_data: { all_messages?: ChatMessage[] };
  messages?: Array<{ author: { name: string }; text: string }>;
  coaching?: string;
  loadingCoaching?: boolean;
}

export default function Reports() {
  const [reportData, setReportData] = useState<ReportData>({
    daily: [],
    weekly: [],
    monthly: [],
  });
  const [negativeChats, setNegativeChats] = useState<NegativeChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [expandedChat, setExpandedChat] = useState<string | null>(null);

  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');
  const [selectedIssue, setSelectedIssue] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const parseScore = (score: number | string): number => {
    if (typeof score === 'string') {
      const parsed = parseFloat(score);
      return isNaN(parsed) ? 0 : parsed;
    }
    return score;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    if (remainingSeconds === 0) {
      return `${minutes}dk`;
    }
    return `${minutes}dk ${remainingSeconds}s`;
  };

  const loadData = async () => {
    try {
      let allData: any[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data: batch } = await supabase
          .from('personnel_daily_stats')
          .select('*')
          .order('date', { ascending: false })
          .range(from, from + batchSize - 1);

        if (!batch || batch.length === 0) break;
        allData = [...allData, ...batch];
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      setReportData({
        daily: allData || [],
        weekly: allData || [],
        monthly: allData || [],
      });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: chatsData } = await supabase
        .from('chat_analysis')
        .select(`
          id,
          chat_id,
          overall_score,
          sentiment,
          issues_detected,
          ai_summary,
          analysis_date,
          chats!inner (
            agent_name,
            created_at,
            ended_at,
            chat_data
          )
        `)
        .or('sentiment.eq.negative,overall_score.lt.50')
        .gte('analysis_date', thirtyDaysAgo.toISOString())
        .order('analysis_date', { ascending: false })
        .limit(50);

      const processedChats = (chatsData || []).map((item: any) => ({
        id: item.id,
        chat_id: item.chat_id,
        overall_score: parseFloat(item.overall_score || 0),
        sentiment: item.sentiment,
        issues_detected: item.issues_detected || {},
        ai_summary: item.ai_summary,
        agent_name: item.chats?.agent_name || 'Unknown',
        started_at: item.chats?.created_at,
        ended_at: item.chats?.ended_at,
        chat_data: item.chats?.chat_data || {},
      }));

      setNegativeChats(processedChats);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekNumber = (date: Date): string => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${weekNumber}`;
  };

  const getMonthKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const getTrendData = () => {
    const data = timeRange === 'daily' ? reportData.daily :
                 timeRange === 'weekly' ? reportData.weekly :
                 reportData.monthly;

    const grouped = data.reduce((acc: any, curr: any) => {
      let groupKey: string;
      const dateObj = new Date(curr.date);

      if (timeRange === 'daily') {
        groupKey = curr.date;
      } else if (timeRange === 'weekly') {
        groupKey = getWeekNumber(dateObj);
      } else {
        groupKey = getMonthKey(dateObj);
      }

      if (!acc[groupKey]) {
        acc[groupKey] = {
          date: groupKey,
          totalAnalysisScore: 0,
          analysisCount: 0,
          totalPersonnelScore: 0,
          personnelCount: 0,
          totalResponseTime: 0,
          responseTimeCount: 0,
          totalResolutionTime: 0,
          resolutionTimeCount: 0,
        };
      }

      if (curr.total_analysis_score > 0 && curr.analysis_count > 0) {
        acc[groupKey].totalAnalysisScore += curr.total_analysis_score;
        acc[groupKey].analysisCount += curr.analysis_count;
      }

      if (curr.average_score > 0 && curr.total_chats > 0) {
        acc[groupKey].totalPersonnelScore += parseScore(curr.average_score) * curr.total_chats;
        acc[groupKey].personnelCount += curr.total_chats;
      }

      if (curr.average_response_time > 0) {
        acc[groupKey].totalResponseTime += curr.average_response_time;
        acc[groupKey].responseTimeCount++;
      }

      if (curr.average_resolution_time > 0) {
        acc[groupKey].totalResolutionTime += curr.average_resolution_time;
        acc[groupKey].resolutionTimeCount++;
      }

      return acc;
    }, {});

    return Object.values(grouped).map((item: any) => ({
      date: item.date,
      analysisScore: item.analysisCount > 0 ? Math.round(item.totalAnalysisScore / item.analysisCount) : 0,
      personnelScore: item.personnelCount > 0 ? Math.round(item.totalPersonnelScore / item.personnelCount) : 0,
      responseTime: item.responseTimeCount > 0 ? Math.round(item.totalResponseTime / item.responseTimeCount) : 0,
      resolutionTime: item.resolutionTimeCount > 0 ? Math.round(item.totalResolutionTime / item.resolutionTimeCount) : 0,
    })).sort((a: any, b: any) => b.date.localeCompare(a.date));
  };

  const getCoachingSuggestion = async (chat: NegativeChat) => {
    try {
      setNegativeChats(prev =>
        prev.map(c => c.id === chat.id ? { ...c, loadingCoaching: true } : c)
      );

      const chatData: any = chat.chat_data || {};
      const fullChatData = chatData.properties?.full_chat_data || chatData;
      const allMessages = fullChatData.all_messages || [];

      const formattedMessages = allMessages
        .filter((msg: any) => msg.text && msg.type === 'message')
        .map((msg: any) => ({
          author: { name: msg.author_id.includes('@') ? chat.agent_name : 'Müşteri' },
          text: msg.text
        }));

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
          messages: formattedMessages,
          analysis: {
            sentiment: chat.sentiment,
            score: chat.overall_score,
            issues: chat.issues_detected?.improvement_areas || [],
            summary: chat.ai_summary,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API hatası: ${response.status}`);
      }

      const result = await response.json();

      setNegativeChats(prev =>
        prev.map(c =>
          c.id === chat.id
            ? { ...c, coaching: result.suggestion, loadingCoaching: false, messages: formattedMessages }
            : c
        )
      );
    } catch (error) {
      console.error('Error getting coaching suggestion:', error);
      setNegativeChats(prev =>
        prev.map(c =>
          c.id === chat.id
            ? { ...c, coaching: 'Öneri alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.', loadingCoaching: false }
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

  const getIssues = (chat: NegativeChat): string[] => {
    return chat.issues_detected?.improvement_areas || [];
  };

  const uniqueAgents = useMemo(() => {
    const agents = new Set(negativeChats.map(chat => chat.agent_name));
    return Array.from(agents).sort();
  }, [negativeChats]);

  const allIssues = useMemo(() => {
    const issues = new Set<string>();
    negativeChats.forEach(chat => {
      getIssues(chat).forEach(issue => issues.add(issue));
    });
    return Array.from(issues).sort();
  }, [negativeChats]);

  const filteredChats = useMemo(() => {
    return negativeChats.filter(chat => {
      if (selectedAgent !== 'all' && chat.agent_name !== selectedAgent) {
        return false;
      }

      if (selectedDateRange !== 'all') {
        const chatDate = new Date(chat.started_at);
        const now = new Date();
        const daysAgo = Math.floor((now.getTime() - chatDate.getTime()) / (1000 * 60 * 60 * 24));

        if (selectedDateRange === '7' && daysAgo > 7) return false;
        if (selectedDateRange === '14' && daysAgo > 14) return false;
        if (selectedDateRange === '30' && daysAgo > 30) return false;
      }

      if (selectedIssue !== 'all') {
        const issues = getIssues(chat);
        if (!issues.includes(selectedIssue)) return false;
      }

      return true;
    });
  }, [negativeChats, selectedAgent, selectedDateRange, selectedIssue]);

  const trendData = getTrendData();

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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Raporlar & Trendler</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Performans trendleri ve istatistiksel analizler</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('daily')}
            className={`px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm ${
              timeRange === 'daily'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300'
            }`}
          >
            Gunluk
          </button>
          <button
            onClick={() => setTimeRange('weekly')}
            className={`px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm ${
              timeRange === 'weekly'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300'
            }`}
          >
            Haftalik
          </button>
          <button
            onClick={() => setTimeRange('monthly')}
            className={`px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm ${
              timeRange === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300'
            }`}
          >
            Aylik
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <BarChart className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
          <h2 className="text-xl font-bold text-slate-900">Trend Analizi</h2>
        </div>

        {trendData.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Bu dönem için veri bulunamadı</p>
          </div>
        ) : (
          <div className="space-y-4">
            {trendData.map((item: any) => {
              let displayDate = item.date;
              if (timeRange === 'daily') {
                displayDate = new Date(item.date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' });
              } else if (timeRange === 'weekly') {
                displayDate = `Hafta ${item.date}`;
              } else {
                const [year, month] = item.date.split('-');
                const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                                    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                displayDate = `${monthNames[parseInt(month) - 1]} ${year}`;
              }

              return (
                <div key={item.date} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-slate-50 rounded-lg">
                  <div className="sm:w-32">
                    <div className="text-sm font-medium text-slate-900">
                      {displayDate}
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                    <div>
                      <div className="text-xs text-slate-600 mb-0.5">Analiz Skor</div>
                      <div className={`text-base sm:text-lg font-bold ${
                        item.analysisScore >= 80 ? 'text-green-600' :
                        item.analysisScore >= 50 ? 'text-slate-600' : 'text-red-600'
                      }`}>
                        {item.analysisScore}/100
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-600 mb-0.5">Personel Skor</div>
                      <div className={`text-base sm:text-lg font-bold ${
                        item.personnelScore >= 80 ? 'text-green-600' :
                        item.personnelScore >= 50 ? 'text-slate-600' : 'text-red-600'
                      }`}>
                        {item.personnelScore}/100
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-600 mb-0.5">Ort. Yanıt</div>
                      <div className="text-base sm:text-lg font-bold text-slate-900">{formatTime(item.responseTime)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-600 mb-0.5">Ort. Çözüm</div>
                      <div className="text-base sm:text-lg font-bold text-slate-900">{formatTime(item.resolutionTime)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-slate-900">Koçluk & İyileştirme Önerileri</h2>
        </div>

        {negativeChats.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Harika İş Çıkarıyorsunuz!</h3>
            <p className="text-sm text-slate-600">Son 30 günde olumsuz değerlendirilen chat bulunamadı.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-slate-600" />
                <h3 className="font-semibold text-slate-900">Filtreler</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Agent</label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tümü ({negativeChats.length})</option>
                    {uniqueAgents.map(agent => (
                      <option key={agent} value={agent}>
                        {agent} ({negativeChats.filter(c => c.agent_name === agent).length})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tarih Aralığı</label>
                  <select
                    value={selectedDateRange}
                    onChange={(e) => setSelectedDateRange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tüm Zamanlar</option>
                    <option value="7">Son 7 Gün</option>
                    <option value="14">Son 14 Gün</option>
                    <option value="30">Son 30 Gün</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Sorun Tipi</label>
                  <select
                    value={selectedIssue}
                    onChange={(e) => setSelectedIssue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tüm Sorunlar</option>
                    {allIssues.map(issue => (
                      <option key={issue} value={issue}>
                        {issue}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(selectedAgent !== 'all' || selectedDateRange !== 'all' || selectedIssue !== 'all') && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    {filteredChats.length} chat gösteriliyor
                  </span>
                  <button
                    onClick={() => {
                      setSelectedAgent('all');
                      setSelectedDateRange('all');
                      setSelectedIssue('all');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <strong>Not:</strong> Bu bölüm, müşteri memnuniyetsizliği yaşanan chat'leri gösterir.
                  Her chat için AI destekli iyileştirme önerileri sunulur. Chat'e tıklayarak detayları görün.
                </div>
              </div>
            </div>

            {filteredChats.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Filtrelere uygun chat bulunamadı</p>
                <button
                  onClick={() => {
                    setSelectedAgent('all');
                    setSelectedDateRange('all');
                    setSelectedIssue('all');
                  }}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Filtreleri temizle
                </button>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isExpanded = expandedChat === chat.id;
                return (
                  <div
                    key={chat.id}
                    className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleChat(chat.id)}
                      className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="font-semibold text-slate-900">{chat.agent_name}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getSentimentColor(chat.sentiment, chat.overall_score)}`}>
                              {getSentimentLabel(chat.sentiment)} • {Math.round(chat.overall_score)}/100
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatDate(chat.started_at)}
                            </span>
                          </div>

                          {chat.ai_summary && (
                            <p className="text-sm text-slate-700 line-clamp-2 mb-2">{chat.ai_summary}</p>
                          )}

                          {getIssues(chat).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {getIssues(chat).slice(0, 3).map((issue, idx) => (
                                <span key={idx} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                  {issue}
                                </span>
                              ))}
                              {getIssues(chat).length > 3 && (
                                <span className="text-xs text-slate-500">+{getIssues(chat).length - 3} daha</span>
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
                      <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-4">
                        {chat.messages && chat.messages.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                              <MessageCircle className="w-4 h-4" />
                              Chat Görüşmesi
                            </h4>
                            <div className="bg-white rounded-lg border border-slate-200 p-3 max-h-60 overflow-y-auto space-y-2">
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
                          <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-blue-600" />
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
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

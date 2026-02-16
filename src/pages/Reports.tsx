import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, BarChart, MessageCircle, Lightbulb, AlertCircle, ChevronDown, ChevronUp, Loader2, Filter, Send, CheckCircle } from 'lucide-react';

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
  agent_email?: string;
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
  sent_feedback?: boolean;
  sending_feedback?: boolean;
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
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const [improvementReports, setImprovementReports] = useState<any[]>([]);
  const [loadingImprovements, setLoadingImprovements] = useState(false);
  const [selectedImprovementAgent, setSelectedImprovementAgent] = useState<string>('');

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

      const { data: sentFeedbacks } = await supabase
        .from('coaching_feedbacks')
        .select('chat_id');

      const sentChatIds = new Set((sentFeedbacks || []).map(f => f.chat_id));

      const generateAgentEmail = (agentName: string): string => {
        return agentName.toLowerCase().replace(/\s+/g, '.') + '@company.com';
      };

      const processedChats = (chatsData || []).map((item: any) => {
        const agentName = item.chats?.agent_name || 'Unknown';
        return {
          id: item.id,
          chat_id: item.chat_id,
          overall_score: parseFloat(item.overall_score || 0),
          sentiment: item.sentiment,
          issues_detected: item.issues_detected || {},
          ai_summary: item.ai_summary,
          agent_name: agentName,
          agent_email: generateAgentEmail(agentName),
          started_at: item.chats?.created_at,
          ended_at: item.chats?.ended_at,
          chat_data: item.chats?.chat_data || {},
          sent_feedback: sentChatIds.has(item.id),
        };
      });

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
          totalChats: 0,
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

      if (curr.total_chats > 0) {
        acc[groupKey].totalChats += curr.total_chats;
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
      totalChats: item.totalChats,
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

  const sendCoachingFeedback = async (chat: NegativeChat) => {
    if (!chat.coaching || !chat.agent_email) return;

    try {
      setNegativeChats(prev =>
        prev.map(c => c.id === chat.id ? { ...c, sending_feedback: true } : c)
      );

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('coaching_feedbacks')
        .insert({
          chat_id: chat.id,
          agent_name: chat.agent_name,
          agent_email: chat.agent_email,
          coaching_suggestion: chat.coaching,
          sent_by: user?.id,
        });

      if (error) throw error;

      setNegativeChats(prev =>
        prev.map(c => c.id === chat.id
          ? { ...c, sent_feedback: true, sending_feedback: false }
          : c
        )
      );
    } catch (error) {
      console.error('Error sending coaching feedback:', error);
      setNegativeChats(prev =>
        prev.map(c => c.id === chat.id ? { ...c, sending_feedback: false } : c)
      );
      alert('Koçluk önerisi gönderilirken bir hata oluştu.');
    }
  };

  const loadImprovementReport = async (agentEmail: string) => {
    if (!agentEmail) return;

    setLoadingImprovements(true);
    try {
      const { data, error } = await supabase.rpc('get_personnel_improvement_report', {
        p_agent_email: agentEmail,
        p_days_before: 30,
        p_days_after: 30
      });

      if (error) throw error;

      if (data && data.has_data) {
        setImprovementReports([data]);
      } else {
        setImprovementReports([]);
      }
    } catch (error) {
      console.error('Error loading improvement report:', error);
      setImprovementReports([]);
    } finally {
      setLoadingImprovements(false);
    }
  };

  useEffect(() => {
    if (selectedImprovementAgent) {
      loadImprovementReport(selectedImprovementAgent);
    }
  }, [selectedImprovementAgent]);

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

  const agentsWithCoaching = useMemo(() => {
    const agents = new Map<string, string>();
    negativeChats.forEach(chat => {
      if (chat.agent_email && chat.sent_feedback) {
        agents.set(chat.agent_email, chat.agent_name);
      }
    });
    return Array.from(agents.entries()).map(([email, name]) => ({ email, name })).sort((a, b) => a.name.localeCompare(b.name));
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

      if (selectedDateRange === 'custom') {
        const chatDate = new Date(chat.started_at);

        if (customStartDate) {
          const startDate = new Date(customStartDate);
          startDate.setHours(0, 0, 0, 0);
          if (chatDate < startDate) return false;
        }

        if (customEndDate) {
          const endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
          if (chatDate > endDate) return false;
        }
      } else if (selectedDateRange !== 'all') {
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
  }, [negativeChats, selectedAgent, selectedDateRange, selectedIssue, customStartDate, customEndDate]);

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
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4">
                    <div>
                      <div className="text-xs text-slate-600 mb-0.5">Toplam Chat</div>
                      <div className="text-base sm:text-lg font-bold text-blue-600">
                        {item.totalChats}
                      </div>
                    </div>
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

      {agentsWithCoaching.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <BarChart className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            <h2 className="text-xl font-bold text-slate-900">Personel Gelişim Takibi</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <strong>Nasıl Çalışır:</strong> Koçluk önerisi iletilen personellerin, öneri öncesi ve sonrası performans değişimini görebilirsiniz.
                  Bir personel seçin ve gelişim raporunu inceleyin.
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Personel Seçin</label>
              <select
                value={selectedImprovementAgent}
                onChange={(e) => setSelectedImprovementAgent(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Bir personel seçin...</option>
                {agentsWithCoaching.map(agent => (
                  <option key={agent.email} value={agent.email}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>

            {loadingImprovements && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                <span className="ml-2 text-slate-600">Gelişim raporu yükleniyor...</span>
              </div>
            )}

            {!loadingImprovements && improvementReports.length > 0 && improvementReports[0].has_data && (
              <div className="space-y-4">
                {improvementReports.map((report, idx) => {
                  const beforeAvgScore = Math.round(report.before_coaching?.average_score || 0);
                  const afterAvgScore = Math.round(report.after_coaching?.average_score || 0);
                  const scoreDiff = afterAvgScore - beforeAvgScore;

                  const beforeAnalysisScore = Math.round(report.before_coaching?.total_analysis_score || 0);
                  const afterAnalysisScore = Math.round(report.after_coaching?.total_analysis_score || 0);
                  const analysisDiff = afterAnalysisScore - beforeAnalysisScore;

                  return (
                    <div key={idx} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {agentsWithCoaching.find(a => a.email === report.agent_email)?.name}
                          </h3>
                          <p className="text-xs text-slate-600">
                            İlk Koçluk Tarihi: {new Date(report.first_coaching_date).toLocaleDateString('tr-TR')}
                          </p>
                          <p className="text-xs text-green-700 font-medium">
                            Toplam {report.total_coaching_sent} koçluk önerisi iletildi
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          <h4 className="text-sm font-semibold text-slate-700 mb-3">Öneri Öncesi (30 Gün)</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-600">Personel Skoru:</span>
                              <span className="font-semibold text-slate-900">{beforeAvgScore}/100</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-600">Analiz Skoru:</span>
                              <span className="font-semibold text-slate-900">{beforeAnalysisScore}/100</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-600">Toplam Chat:</span>
                              <span className="font-semibold text-slate-900">{report.before_coaching?.total_chats || 0}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          <h4 className="text-sm font-semibold text-slate-700 mb-3">Öneri Sonrası (30 Gün)</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-600">Personel Skoru:</span>
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-slate-900">{afterAvgScore}/100</span>
                                <span className={`text-xs font-medium ${scoreDiff > 0 ? 'text-green-600' : scoreDiff < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                                  {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-600">Analiz Skoru:</span>
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-slate-900">{afterAnalysisScore}/100</span>
                                <span className={`text-xs font-medium ${analysisDiff > 0 ? 'text-green-600' : analysisDiff < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                                  {analysisDiff > 0 ? `+${analysisDiff}` : analysisDiff}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-600">Toplam Chat:</span>
                              <span className="font-semibold text-slate-900">{report.after_coaching?.total_chats || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-green-200">
                        <div className="text-sm">
                          {scoreDiff > 5 && analysisDiff > 5 && (
                            <div className="flex items-center gap-2 text-green-700">
                              <CheckCircle className="w-4 h-4" />
                              <span className="font-medium">Harika gelişme! Koçluk önerileri olumlu etki gösterdi.</span>
                            </div>
                          )}
                          {scoreDiff <= 0 && analysisDiff <= 0 && (
                            <div className="flex items-center gap-2 text-amber-700">
                              <AlertCircle className="w-4 h-4" />
                              <span className="font-medium">Gelişme görülmedi. Ek koçluk veya farklı yaklaşımlar gerekebilir.</span>
                            </div>
                          )}
                          {(scoreDiff > 0 || analysisDiff > 0) && scoreDiff <= 5 && analysisDiff <= 5 && (
                            <div className="flex items-center gap-2 text-blue-700">
                              <AlertCircle className="w-4 h-4" />
                              <span className="font-medium">Küçük gelişmeler var. Süreci takip etmeye devam edin.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loadingImprovements && selectedImprovementAgent && improvementReports.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Bu personel için henüz gelişim verisi bulunamadı.</p>
              </div>
            )}
          </div>
        </div>
      )}

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
                    <option value="custom">Özel Tarih Aralığı</option>
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

              {selectedDateRange === 'custom' && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Başlangıç Tarihi</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Bitiş Tarihi</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

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
                      setCustomStartDate('');
                      setCustomEndDate('');
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
                    setCustomStartDate('');
                    setCustomEndDate('');
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

                        <div className={`rounded-lg border p-4 ${
                          chat.sent_feedback
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                              {chat.sent_feedback ? (
                                <>
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  AI Koçluk Önerileri (İletildi)
                                </>
                              ) : (
                                <>
                                  <Lightbulb className="w-4 h-4 text-blue-600" />
                                  AI Koçluk Önerileri
                                </>
                              )}
                            </h4>

                            {chat.coaching && !chat.sent_feedback && (
                              <button
                                onClick={() => sendCoachingFeedback(chat)}
                                disabled={chat.sending_feedback}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded-lg transition-colors"
                              >
                                {chat.sending_feedback ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Gönderiliyor...
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-4 h-4" />
                                    Önerileri İlet
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {chat.loadingCoaching ? (
                            <div className="flex items-center gap-2 text-blue-600">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">AI öneri hazırlıyor...</span>
                            </div>
                          ) : chat.coaching ? (
                            <>
                              <div className={`prose prose-sm max-w-none whitespace-pre-wrap ${
                                chat.sent_feedback ? 'text-slate-600' : 'text-slate-700'
                              }`}>
                                {chat.coaching}
                              </div>
                              {chat.sent_feedback && (
                                <div className="mt-3 pt-3 border-t border-green-200">
                                  <p className="text-xs text-green-700 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Bu öneriler personele iletildi ve gelişim takibi başlatıldı.
                                  </p>
                                </div>
                              )}
                            </>
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

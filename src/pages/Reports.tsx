import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, BarChart, MessageCircle, Lightbulb, AlertCircle, ChevronDown, ChevronUp, Loader2, Filter, Send, CheckCircle, TrendingUp, Users, Target } from 'lucide-react';

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

type TabType = 'trends' | 'coaching' | 'improvement';

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
  const [activeTab, setActiveTab] = useState<TabType>('trends');

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
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: chatsRaw, error: chatsError } = await supabase
        .from('chats')
        .select(`
          id,
          chat_id,
          agent_name,
          created_at,
          ended_at,
          rating_score,
          first_response_time
        `)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (chatsError) {
        console.error('Error loading chats:', chatsError);
        throw chatsError;
      }

      console.log('Chats loaded:', chatsRaw?.length || 0);

      const { data: analysisData, error: analysisError } = await supabase
        .from('chat_analysis')
        .select('chat_id, overall_score')
        .gte('analysis_date', thirtyDaysAgo.toISOString());

      if (analysisError) {
        console.error('Error loading analysis:', analysisError);
        throw analysisError;
      }

      console.log('Analysis data loaded:', analysisData?.length || 0);

      const analysisMap = new Map();
      (analysisData || []).forEach((item: any) => {
        analysisMap.set(item.chat_id, {
          overall_score: parseFloat(item.overall_score || 0),
        });
      });

      const dailyStats: any = {};

      (chatsRaw || []).forEach((chat: any) => {
        const dateStr = new Date(chat.created_at).toISOString().split('T')[0];

        if (!dailyStats[dateStr]) {
          dailyStats[dateStr] = {
            date: dateStr,
            total_chats: 0,
            total_personnel_score: 0,
            personnel_count: 0,
            total_response_time: 0,
            response_time_count: 0,
            total_resolution_time: 0,
            resolution_time_count: 0,
          };
        }

        dailyStats[dateStr].total_chats++;

        const analysis = analysisMap.get(chat.id);
        if (analysis && analysis.overall_score > 0) {
          dailyStats[dateStr].total_personnel_score += analysis.overall_score;
          dailyStats[dateStr].personnel_count++;
        }

        if (chat.first_response_time && chat.first_response_time > 0) {
          dailyStats[dateStr].total_response_time += chat.first_response_time;
          dailyStats[dateStr].response_time_count++;
        }

        if (chat.created_at && chat.ended_at) {
          const duration = (new Date(chat.ended_at).getTime() - new Date(chat.created_at).getTime()) / 1000;
          if (duration > 0) {
            dailyStats[dateStr].total_resolution_time += duration;
            dailyStats[dateStr].resolution_time_count++;
          }
        }
      });

      const dailyArray = Object.values(dailyStats).map((day: any) => ({
        date: day.date,
        total_chats: day.total_chats,
        average_score: day.personnel_count > 0 ? day.total_personnel_score / day.personnel_count : 0,
        average_response_time: day.response_time_count > 0 ? day.total_response_time / day.response_time_count : 0,
        average_resolution_time: day.resolution_time_count > 0 ? day.total_resolution_time / day.resolution_time_count : 0,
      }));

      console.log('=== REPORTS DEBUG ===');
      console.log('Total chats loaded:', (chatsRaw || []).length);
      console.log('Daily Stats Loaded:', dailyArray.length, 'days');
      console.log('Sample daily data:', dailyArray.slice(0, 5));
      console.log('Total analysis matches:', (chatsRaw || []).filter((chat: any) => analysisMap.has(chat.id)).length, '/', (chatsRaw || []).length);

      setReportData({
        daily: dailyArray || [],
        weekly: dailyArray || [],
        monthly: dailyArray || [],
      });

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

    console.log(`=== GET TREND DATA (${timeRange}) ===`);
    console.log('Input data length:', data.length);

    if (timeRange === 'daily') {
      const result = data.map((item: any) => ({
        date: item.date,
        analysisScore: Math.round(item.average_score || 0),
        personnelScore: Math.round(item.average_score || 0),
        responseTime: Math.round(item.average_response_time || 0),
        resolutionTime: Math.round(item.average_resolution_time || 0),
        totalChats: item.total_chats || 0,
      })).sort((a: any, b: any) => b.date.localeCompare(a.date));
      console.log('Daily result (first 5):', result.slice(0, 5));
      return result;
    }

    const grouped = data.reduce((acc: any, curr: any) => {
      let groupKey: string;
      const dateObj = new Date(curr.date);

      if (timeRange === 'weekly') {
        groupKey = getWeekNumber(dateObj);
      } else {
        groupKey = getMonthKey(dateObj);
      }

      if (!acc[groupKey]) {
        acc[groupKey] = {
          date: groupKey,
          totalPersonnelScore: 0,
          personnelCount: 0,
          totalResponseTime: 0,
          responseTimeCount: 0,
          totalResolutionTime: 0,
          resolutionTimeCount: 0,
          totalChats: 0,
        };
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

    const result = Object.values(grouped).map((item: any) => {
      const personnelScore = item.personnelCount > 0 ? Math.round(item.totalPersonnelScore / item.personnelCount) : 0;
      return {
        date: item.date,
        analysisScore: personnelScore,
        personnelScore: personnelScore,
        responseTime: item.responseTimeCount > 0 ? Math.round(item.totalResponseTime / item.responseTimeCount) : 0,
        resolutionTime: item.resolutionTimeCount > 0 ? Math.round(item.totalResolutionTime / item.resolutionTimeCount) : 0,
        totalChats: item.totalChats,
      };
    }).sort((a: any, b: any) => b.date.localeCompare(a.date));
    console.log(`Grouped ${timeRange} result (first 5):`, result.slice(0, 5));
    return result;
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 50) return 'text-blue-600 bg-blue-50';
    return 'text-red-600 bg-red-50';
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

  const trendData = useMemo(() => {
    const data = getTrendData();
    console.log('Trend Data:', data);
    console.log('Report Data Daily:', reportData.daily);
    return data;
  }, [reportData, timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Raporlar & Analizler</h1>
          <p className="text-slate-600 mt-1">Performans takibi, trend analizi ve gelişim raporları</p>
        </div>

        <div className="border-b border-slate-200">
          <nav className="-mb-px flex gap-2">
            <button
              onClick={() => setActiveTab('trends')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'trends'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Trend Analizi
              </div>
            </button>
            <button
              onClick={() => setActiveTab('coaching')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'coaching'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Koçluk Önerileri
                {negativeChats.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                    {negativeChats.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('improvement')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'improvement'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Gelişim Takibi
                {agentsWithCoaching.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                    {agentsWithCoaching.length}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <div className="flex gap-2">
              <button
                onClick={() => setTimeRange('daily')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  timeRange === 'daily'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-300 hover:border-blue-300'
                }`}
              >
                Günlük
              </button>
              <button
                onClick={() => setTimeRange('weekly')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  timeRange === 'weekly'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-300 hover:border-blue-300'
                }`}
              >
                Haftalık
              </button>
              <button
                onClick={() => setTimeRange('monthly')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  timeRange === 'monthly'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-300 hover:border-blue-300'
                }`}
              >
                Aylık
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
            {trendData.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Veri Bulunamadı</h3>
                <p className="text-slate-600">Bu dönem için henüz analiz verisi bulunmuyor.</p>
              </div>
            ) : (
              <div className="space-y-3">
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
                    <div key={item.date} className="bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-xl p-5 border border-slate-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Calendar className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-lg font-bold text-slate-900">{displayDate}</div>
                            <div className="text-sm text-slate-600">{item.totalChats} toplam görüşme</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className={`p-4 rounded-lg ${getScoreColor(item.analysisScore)}`}>
                          <div className="text-xs font-medium mb-1 opacity-75">Analiz Skoru</div>
                          <div className="text-2xl font-bold">
                            {item.analysisScore}
                          </div>
                          <div className="text-xs opacity-75 mt-1">/ 100</div>
                        </div>

                        <div className={`p-4 rounded-lg ${getScoreColor(item.personnelScore)}`}>
                          <div className="text-xs font-medium mb-1 opacity-75">Personel Skoru</div>
                          <div className="text-2xl font-bold">
                            {item.personnelScore}
                          </div>
                          <div className="text-xs opacity-75 mt-1">/ 100</div>
                        </div>

                        <div className="p-4 rounded-lg bg-slate-100 text-slate-700">
                          <div className="text-xs font-medium mb-1 opacity-75">Ort. Yanıt Süresi</div>
                          <div className="text-2xl font-bold">
                            {formatTime(item.responseTime)}
                          </div>
                        </div>

                        <div className="p-4 rounded-lg bg-slate-100 text-slate-700">
                          <div className="text-xs font-medium mb-1 opacity-75">Ort. Çözüm Süresi</div>
                          <div className="text-2xl font-bold">
                            {formatTime(item.resolutionTime)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'coaching' && (
        <div className="space-y-6">
          {negativeChats.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Mükemmel Performans!</h3>
                <p className="text-slate-600">Son 30 günde olumsuz değerlendirilen chat bulunamadı.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Filter className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Filtreler</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Personel</label>
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tarih Aralığı</label>
                    <select
                      value={selectedDateRange}
                      onChange={(e) => setSelectedDateRange(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">Tüm Zamanlar</option>
                      <option value="7">Son 7 Gün</option>
                      <option value="14">Son 14 Gün</option>
                      <option value="30">Son 30 Gün</option>
                      <option value="custom">Özel Tarih Aralığı</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Sorun Tipi</label>
                    <select
                      value={selectedIssue}
                      onChange={(e) => setSelectedIssue(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Başlangıç Tarihi</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Bitiş Tarihi</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {(selectedAgent !== 'all' || selectedDateRange !== 'all' || selectedIssue !== 'all') && (
                  <div className="mt-4 flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">
                      {filteredChats.length} sonuç gösteriliyor
                    </span>
                    <button
                      onClick={() => {
                        setSelectedAgent('all');
                        setSelectedDateRange('all');
                        setSelectedIssue('all');
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Filtreleri Temizle
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <strong className="font-semibold">Nasıl Kullanılır:</strong> Bu bölüm, müşteri memnuniyetsizliği yaşanan görüşmeleri listeler.
                    Her görüşme için AI destekli iyileştirme önerileri oluşturabilir ve personele gönderebilirsiniz.
                  </div>
                </div>
              </div>

              {filteredChats.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-12">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Sonuç Bulunamadı</h3>
                    <p className="text-slate-600 mb-4">Seçtiğiniz filtrelere uygun chat bulunamadı.</p>
                    <button
                      onClick={() => {
                        setSelectedAgent('all');
                        setSelectedDateRange('all');
                        setSelectedIssue('all');
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Filtreleri Temizle
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredChats.map((chat) => {
                    const isExpanded = expandedChat === chat.id;
                    return (
                      <div
                        key={chat.id}
                        className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <button
                          onClick={() => toggleChat(chat.id)}
                          className="w-full p-5 text-left hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-slate-600" />
                                  <span className="font-bold text-slate-900">{chat.agent_name}</span>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getSentimentColor(chat.sentiment, chat.overall_score)}`}>
                                  {getSentimentLabel(chat.sentiment)} • {Math.round(chat.overall_score)}/100
                                </span>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(chat.started_at)}
                                </span>
                              </div>

                              {chat.ai_summary && (
                                <p className="text-sm text-slate-700 mb-3 leading-relaxed">{chat.ai_summary}</p>
                              )}

                              {getIssues(chat).length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {getIssues(chat).slice(0, 4).map((issue, idx) => (
                                    <span key={idx} className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
                                      {issue}
                                    </span>
                                  ))}
                                  {getIssues(chat).length > 4 && (
                                    <span className="text-xs text-slate-500 font-medium">+{getIssues(chat).length - 4} daha</span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex-shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="w-6 h-6 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-6 h-6 text-slate-400" />
                              )}
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-slate-200 p-5 bg-gradient-to-br from-slate-50 to-blue-50/30 space-y-5">
                            {chat.messages && chat.messages.length > 0 && (
                              <div>
                                <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                                  <MessageCircle className="w-5 h-5 text-blue-600" />
                                  Chat Görüşmesi
                                </h4>
                                <div className="bg-white rounded-lg border border-slate-200 p-4 max-h-72 overflow-y-auto space-y-3">
                                  {chat.messages.map((msg, idx) => (
                                    <div key={idx} className="text-sm">
                                      <span className="font-semibold text-slate-900">{msg.author.name}:</span>
                                      <span className="text-slate-700 ml-2">{msg.text}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className={`rounded-xl border p-5 ${
                              chat.sent_feedback
                                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
                                : 'bg-gradient-to-br from-blue-50 to-sky-50 border-blue-300'
                            }`}>
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                                  {chat.sent_feedback ? (
                                    <>
                                      <div className="p-2 bg-green-100 rounded-lg">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                      </div>
                                      AI Koçluk Önerileri
                                      <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">İletildi</span>
                                    </>
                                  ) : (
                                    <>
                                      <div className="p-2 bg-blue-100 rounded-lg">
                                        <Lightbulb className="w-5 h-5 text-blue-600" />
                                      </div>
                                      AI Koçluk Önerileri
                                    </>
                                  )}
                                </h4>

                                {chat.coaching && !chat.sent_feedback && (
                                  <button
                                    onClick={() => sendCoachingFeedback(chat)}
                                    disabled={chat.sending_feedback}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
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
                                <div className="flex items-center gap-3 text-blue-600 py-4">
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  <span className="text-sm font-medium">AI analiz yapıyor ve öneri hazırlıyor...</span>
                                </div>
                              ) : chat.coaching ? (
                                <>
                                  <div className={`prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed ${
                                    chat.sent_feedback ? 'text-slate-700' : 'text-slate-800'
                                  }`}>
                                    {chat.coaching}
                                  </div>
                                  {chat.sent_feedback && (
                                    <div className="mt-4 pt-4 border-t border-green-300">
                                      <p className="text-sm text-green-800 flex items-center gap-2 font-medium">
                                        <CheckCircle className="w-4 h-4" />
                                        Bu öneriler personele iletildi. Gelişim takibi "Gelişim Takibi" sekmesinden yapılabilir.
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
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'improvement' && (
        <div className="space-y-6">
          {agentsWithCoaching.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-4">
                  <Target className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Henüz Gelişim Verisi Yok</h3>
                <p className="text-slate-600 mb-4">Personel gelişimini takip etmek için öncelikle koçluk önerileri göndermelisiniz.</p>
                <button
                  onClick={() => setActiveTab('coaching')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Koçluk Önerileri Sekmesine Git
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <div className="flex gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-sm text-blue-900">
                    <strong className="font-semibold text-base">Nasıl Çalışır:</strong>
                    <p className="mt-2 leading-relaxed">
                      Koçluk önerisi gönderilen personellerin, öneri öncesi 30 gün ve sonrası 30 günlük performans değişimini görebilirsiniz.
                      Bu sayede koçluk önerilerinin etkisini ölçebilir ve personel gelişimini takip edebilirsiniz.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Personel Seçin</label>
                <select
                  value={selectedImprovementAgent}
                  onChange={(e) => setSelectedImprovementAgent(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-12">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-green-600 mb-4" />
                    <span className="text-slate-700 font-medium">Gelişim raporu hazırlanıyor...</span>
                  </div>
                </div>
              )}

              {!loadingImprovements && improvementReports.length > 0 && improvementReports[0].has_data && (
                <div className="space-y-6">
                  {improvementReports.map((report, idx) => {
                    const beforeAvgScore = Math.round(report.before_coaching?.average_score || 0);
                    const afterAvgScore = Math.round(report.after_coaching?.average_score || 0);
                    const scoreDiff = afterAvgScore - beforeAvgScore;

                    const beforeAnalysisScore = Math.round(report.before_coaching?.total_analysis_score || 0);
                    const afterAnalysisScore = Math.round(report.after_coaching?.total_analysis_score || 0);
                    const analysisDiff = afterAnalysisScore - beforeAnalysisScore;

                    const isImproved = scoreDiff > 5 && analysisDiff > 5;
                    const isSlightImproved = (scoreDiff > 0 || analysisDiff > 0) && scoreDiff <= 5 && analysisDiff <= 5;

                    return (
                      <div key={idx} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6 shadow-md">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-xl">
                              <Target className="w-8 h-8 text-green-600" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-slate-900">
                                {agentsWithCoaching.find(a => a.email === report.agent_email)?.name}
                              </h3>
                              <p className="text-sm text-slate-600 mt-1">
                                İlk Koçluk: {new Date(report.first_coaching_date).toLocaleDateString('tr-TR')}
                              </p>
                              <p className="text-sm text-green-700 font-semibold mt-1">
                                {report.total_coaching_sent} koçluk önerisi gönderildi
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                          <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-sm">
                            <h4 className="text-base font-bold text-slate-700 mb-4 flex items-center gap-2">
                              <Calendar className="w-5 h-5 text-slate-600" />
                              Öneri Öncesi (30 Gün)
                            </h4>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                <span className="text-sm font-medium text-slate-600">Personel Skoru</span>
                                <span className="text-xl font-bold text-slate-900">{beforeAvgScore}/100</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                <span className="text-sm font-medium text-slate-600">Analiz Skoru</span>
                                <span className="text-xl font-bold text-slate-900">{beforeAnalysisScore}/100</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                <span className="text-sm font-medium text-slate-600">Toplam Chat</span>
                                <span className="text-xl font-bold text-slate-900">{report.before_coaching?.total_chats || 0}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white rounded-xl border-2 border-green-200 p-5 shadow-sm">
                            <h4 className="text-base font-bold text-slate-700 mb-4 flex items-center gap-2">
                              <TrendingUp className="w-5 h-5 text-green-600" />
                              Öneri Sonrası (30 Gün)
                            </h4>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                <span className="text-sm font-medium text-slate-600">Personel Skoru</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xl font-bold text-slate-900">{afterAvgScore}/100</span>
                                  <span className={`text-sm font-bold px-2 py-1 rounded-full ${
                                    scoreDiff > 0 ? 'bg-green-200 text-green-800' :
                                    scoreDiff < 0 ? 'bg-red-200 text-red-800' :
                                    'bg-slate-200 text-slate-600'
                                  }`}>
                                    {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                <span className="text-sm font-medium text-slate-600">Analiz Skoru</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xl font-bold text-slate-900">{afterAnalysisScore}/100</span>
                                  <span className={`text-sm font-bold px-2 py-1 rounded-full ${
                                    analysisDiff > 0 ? 'bg-green-200 text-green-800' :
                                    analysisDiff < 0 ? 'bg-red-200 text-red-800' :
                                    'bg-slate-200 text-slate-600'
                                  }`}>
                                    {analysisDiff > 0 ? `+${analysisDiff}` : analysisDiff}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                <span className="text-sm font-medium text-slate-600">Toplam Chat</span>
                                <span className="text-xl font-bold text-slate-900">{report.after_coaching?.total_chats || 0}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className={`p-5 rounded-xl ${
                          isImproved ? 'bg-green-100 border-2 border-green-300' :
                          isSlightImproved ? 'bg-blue-100 border-2 border-blue-300' :
                          'bg-amber-100 border-2 border-amber-300'
                        }`}>
                          <div className="flex items-start gap-3">
                            {isImproved ? (
                              <>
                                <CheckCircle className="w-6 h-6 text-green-700 flex-shrink-0 mt-0.5" />
                                <div>
                                  <h5 className="font-bold text-green-900 mb-1">Mükemmel Gelişme!</h5>
                                  <p className="text-sm text-green-800">
                                    Koçluk önerileri belirgin şekilde olumlu etki gösterdi. Personel performansında kayda değer iyileşme gözlemlendi.
                                  </p>
                                </div>
                              </>
                            ) : isSlightImproved ? (
                              <>
                                <AlertCircle className="w-6 h-6 text-blue-700 flex-shrink-0 mt-0.5" />
                                <div>
                                  <h5 className="font-bold text-blue-900 mb-1">Küçük Gelişmeler Var</h5>
                                  <p className="text-sm text-blue-800">
                                    Performansta hafif iyileşme görülüyor. Süreci takip etmeye devam edin ve gerekirse ek koçluk desteği sağlayın.
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
                                <div>
                                  <h5 className="font-bold text-amber-900 mb-1">Gelişme Görülmedi</h5>
                                  <p className="text-sm text-amber-800">
                                    Beklenen gelişme henüz gözlemlenmedi. Farklı koçluk yaklaşımları veya ek destek gerekebilir. Personelle birebir görüşme düşünülebilir.
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!loadingImprovements && selectedImprovementAgent && improvementReports.length === 0 && (
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-12">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Gelişim Verisi Bulunamadı</h3>
                    <p className="text-slate-600">
                      Bu personel için henüz yeterli gelişim verisi bulunmuyor.
                      Koçluk önerisinden sonra 30 gün geçmesi gerekiyor.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

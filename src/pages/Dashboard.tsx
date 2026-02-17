import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, Users, AlertTriangle, TrendingUp, Clock, CheckCircle, ThumbsUp, ThumbsDown, PhoneOff, UserCircle, Frown, Meh, Smile } from 'lucide-react';
import TrendChart from '../components/TrendChart';
import BarChart from '../components/BarChart';
import DonutChart from '../components/DonutChart';
import HeatMap from '../components/HeatMap';
import Leaderboard from '../components/Leaderboard';
import { extractComplaintTopics } from '../lib/complaintCategories';
import { getIstanbulDateStartUTC } from '../lib/utils';

interface DashboardStats {
  totalChats: number;
  uniqueChats: number;
  totalThreads: number;
  analyzedChats: number;
  totalPersonnel: number;
  pendingAlerts: number;
  averageScore: number;
  averageResponseTime: number;
  totalLikes: number;
  totalDislikes: number;
  missedChats: number;
}

interface PersonnelTrend {
  agent_name: string;
  daily_scores: { date: string; score: number }[];
  weekly_change: number;
}

interface ComplaintData {
  date: string;
  negative: number;
  neutral: number;
  totalChats: number;
  analyzedChats: number;
}

interface CategoryComplaint {
  category: string;
  count: number;
  percentage: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalChats: 0,
    uniqueChats: 0,
    totalThreads: 0,
    analyzedChats: 0,
    totalPersonnel: 0,
    pendingAlerts: 0,
    averageScore: 0,
    averageResponseTime: 0,
    totalLikes: 0,
    totalDislikes: 0,
    missedChats: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [personnelTrends, setPersonnelTrends] = useState<PersonnelTrend[]>([]);
  const [complaintData, setComplaintData] = useState<ComplaintData[]>([]);
  const [categoryComplaints, setCategoryComplaints] = useState<CategoryComplaint[]>([]);
  const [hourlyDistribution, setHourlyDistribution] = useState<{ hour: number; count: number }[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [bottomPerformers, setBottomPerformers] = useState<any[]>([]);
  const [sentimentDistribution, setSentimentDistribution] = useState<{ label: string; value: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();

    const statsInterval = setInterval(loadDashboardData, 30000);

    return () => {
      clearInterval(statsInterval);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      const [
        { count: totalChats },
        { count: analyzedChats },
        { count: totalPersonnel },
        { count: pendingAlerts },
        { count: missedChats },
        { data: alerts },
      ] = await Promise.all([
        supabase.from('chats').select('*', { count: 'exact', head: true }),
        supabase.from('chat_analysis').select('*', { count: 'exact', head: true }).gt('overall_score', 0),
        supabase.from('personnel').select('*', { count: 'exact', head: true }),
        supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('sent_to_telegram', false),
        supabase.from('chats').select('*', { count: 'exact', head: true }).eq('status', 'missed'),
        supabase.from('alerts').select('*, chats(agent_name, customer_name)').order('created_at', { ascending: false }).limit(5),
      ]);

      let analysisData: any[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data: batch } = await supabase
          .from('chat_analysis')
          .select('overall_score')
          .not('overall_score', 'is', null)
          .gt('overall_score', 0)
          .range(from, from + batchSize - 1);

        if (!batch || batch.length === 0) break;
        analysisData = [...analysisData, ...batch];
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      const avgScore = analysisData.length > 0
        ? analysisData.reduce((sum, a) => sum + (a.overall_score || 0), 0) / analysisData.length
        : 0;

      let chatsWithResponse: any[] = [];
      from = 0;

      while (true) {
        const { data: batch } = await supabase
          .from('chats')
          .select('first_response_time')
          .not('first_response_time', 'is', null)
          .range(from, from + batchSize - 1);

        if (!batch || batch.length === 0) break;
        chatsWithResponse = [...chatsWithResponse, ...batch];
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      const avgResponseTime = chatsWithResponse.length > 0
        ? chatsWithResponse.reduce((acc, curr) => acc + (curr.first_response_time || 0), 0) / chatsWithResponse.length
        : 0;

      let allChats: any[] = [];
      from = 0;

      while (true) {
        const { data: batch } = await supabase
          .from('chats')
          .select('chat_data')
          .range(from, from + batchSize - 1);

        if (!batch || batch.length === 0) break;
        allChats = [...allChats, ...batch];
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      let uniqueChatData: any[] = [];
      from = 0;

      while (true) {
        const { data: batch } = await supabase
          .from('chats')
          .select('chat_id')
          .range(from, from + batchSize - 1);

        if (!batch || batch.length === 0) break;
        uniqueChatData = [...uniqueChatData, ...batch];
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      let totalLikes = 0;
      let totalDislikes = 0;

      if (allChats) {
        for (const chat of allChats) {
          const score = Number(chat.chat_data?.properties?.raw_chat_data?.rating_score);
          if (!isNaN(score) && score > 0) {
            if (score >= 4) totalLikes++;
            else if (score <= 2) totalDislikes++;
          }
        }
      }

      const uniqueChatsCount = uniqueChatData ? new Set(uniqueChatData.map((c: any) => c.chat_id)).size : 0;

      setStats({
        totalChats: totalChats || 0,
        uniqueChats: uniqueChatsCount,
        totalThreads: totalChats || 0,
        analyzedChats: analyzedChats || 0,
        totalPersonnel: totalPersonnel || 0,
        pendingAlerts: pendingAlerts || 0,
        averageScore: Math.round(avgScore),
        averageResponseTime: Math.round(avgResponseTime),
        totalLikes,
        totalDislikes,
        missedChats: missedChats || 0,
      });

      setRecentAlerts(alerts || []);

      await Promise.all([
        loadPersonnelTrends(),
        loadComplaintData(),
        loadCategoryComplaints(),
        loadHourlyDistribution(),
        loadPerformersRanking(),
        loadSentimentDistribution(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPersonnelTrends = async () => {
    try {
      const thirtyDaysAgoUTC = getIstanbulDateStartUTC(30);

      let allChatsForAgents: any[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data: batch } = await supabase
          .from('chats')
          .select('agent_name')
          .not('agent_name', 'is', null)
          .range(from, from + batchSize - 1);

        if (!batch || batch.length === 0) break;
        allChatsForAgents = [...allChatsForAgents, ...batch];
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      if (allChatsForAgents.length === 0) return;

      const uniqueAgents = [...new Set(allChatsForAgents.map(c => c.agent_name))].slice(0, 5);

      const trends: PersonnelTrend[] = [];

      for (const agentName of uniqueAgents) {
        let allAnalysisData: any[] = [];
        from = 0;

        while (true) {
          const { data: batch } = await supabase
            .from('chat_analysis')
            .select('analysis_date, overall_score, chat_id')
            .gte('analysis_date', thirtyDaysAgoUTC)
            .gt('overall_score', 0)
            .order('analysis_date', { ascending: true })
            .range(from, from + batchSize - 1);

          if (!batch || batch.length === 0) break;
          allAnalysisData = [...allAnalysisData, ...batch];
          if (batch.length < batchSize) break;
          from += batchSize;
        }

        if (allAnalysisData.length === 0) continue;

        let allAgentChats: any[] = [];
        from = 0;

        while (true) {
          const { data: batch } = await supabase
            .from('chats')
            .select('id, agent_name')
            .eq('agent_name', agentName)
            .range(from, from + batchSize - 1);

          if (!batch || batch.length === 0) break;
          allAgentChats = [...allAgentChats, ...batch];
          if (batch.length < batchSize) break;
          from += batchSize;
        }

        if (allAgentChats.length === 0) continue;

        const agentChatIds = new Set(allAgentChats.map(c => c.id));
        const agentAnalysis = allAnalysisData.filter(a => agentChatIds.has(a.chat_id));

        if (agentAnalysis && agentAnalysis.length > 0) {
          const dailyScores: { [key: string]: number[] } = {};

          agentAnalysis.forEach(stat => {
            const date = new Date(stat.analysis_date).toLocaleDateString('tr-TR', {
              timeZone: 'Europe/Istanbul',
              day: '2-digit',
              month: '2-digit'
            });
            if (!dailyScores[date]) dailyScores[date] = [];
            dailyScores[date].push(stat.overall_score || 0);
          });

          const scores = Object.entries(dailyScores).map(([date, scores]) => ({
            date,
            score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          }));

          if (scores.length >= 2) {
            const firstScore = scores[0].score;
            const lastScore = scores[scores.length - 1].score;
            const weeklyChange = firstScore > 0 ? ((lastScore - firstScore) / firstScore) * 100 : 0;

            trends.push({
              agent_name: agentName,
              daily_scores: scores,
              weekly_change: weeklyChange,
            });
          }
        }
      }

      setPersonnelTrends(trends);
    } catch (error) {
      console.error('Error loading personnel trends:', error);
    }
  };

  const loadComplaintData = async () => {
    try {
      const thirtyDaysAgoUTC = getIstanbulDateStartUTC(30);

      let allAnalysis: any[] = [];
      let allChats: any[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data: batch } = await supabase
          .from('chat_analysis')
          .select('analysis_date, sentiment, chat_id, overall_score')
          .gte('analysis_date', thirtyDaysAgoUTC)
          .gt('overall_score', 0)
          .order('analysis_date', { ascending: true })
          .range(from, from + batchSize - 1);

        if (!batch || batch.length === 0) break;
        allAnalysis = [...allAnalysis, ...batch];
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      from = 0;
      while (true) {
        const { data: batch } = await supabase
          .from('chats')
          .select('created_at, id')
          .gte('created_at', thirtyDaysAgoUTC)
          .order('created_at', { ascending: true })
          .range(from, from + batchSize - 1);

        if (!batch || batch.length === 0) break;
        allChats = [...allChats, ...batch];
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      const dailyComplaints: { [key: string]: { negative: number; neutral: number; totalChats: number; analyzedChats: number } } = {};

      const now = new Date();
      const istanbulNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));

      for (let i = 0; i < 30; i++) {
        const date = new Date(istanbulNow);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('tr-TR', {
          day: '2-digit',
          month: '2-digit'
        });
        dailyComplaints[dateStr] = { negative: 0, neutral: 0, totalChats: 0, analyzedChats: 0 };
      }

      allChats.forEach(chat => {
        const date = new Date(chat.created_at).toLocaleDateString('tr-TR', {
          timeZone: 'Europe/Istanbul',
          day: '2-digit',
          month: '2-digit'
        });
        if (dailyComplaints[date]) {
          dailyComplaints[date].totalChats++;
        }
      });

      allAnalysis.forEach(item => {
        const date = new Date(item.analysis_date).toLocaleDateString('tr-TR', {
          timeZone: 'Europe/Istanbul',
          day: '2-digit',
          month: '2-digit'
        });
        if (dailyComplaints[date]) {
          dailyComplaints[date].analyzedChats++;
          if (item.sentiment === 'negative') dailyComplaints[date].negative++;
          if (item.sentiment === 'neutral') dailyComplaints[date].neutral++;
        }
      });

      const complaintArray = Object.entries(dailyComplaints)
        .map(([date, data]) => ({
          date,
          ...data,
        }))
        .sort((a, b) => {
          const [dayA, monthA] = a.date.split('.');
          const [dayB, monthB] = b.date.split('.');
          const dateA = new Date(istanbulNow.getFullYear(), parseInt(monthA) - 1, parseInt(dayA));
          const dateB = new Date(istanbulNow.getFullYear(), parseInt(monthB) - 1, parseInt(dayB));
          return dateA.getTime() - dateB.getTime();
        });

      setComplaintData(complaintArray);
    } catch (error) {
      console.error('Error loading complaint data:', error);
    }
  };

  const loadCategoryComplaints = async () => {
    try {
      let allAnalysis: any[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data: batch } = await supabase
          .from('chat_analysis')
          .select('ai_summary, sentiment, overall_score')
          .eq('sentiment', 'negative')
          .not('ai_summary', 'is', null)
          .gt('overall_score', 0)
          .range(from, from + batchSize - 1);

        if (!batch || batch.length === 0) break;
        allAnalysis = [...allAnalysis, ...batch];
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      if (allAnalysis.length === 0) return;

      const categories: { [key: string]: number } = {};
      let totalComplaints = 0;

      allAnalysis.forEach(item => {
        if (item.ai_summary) {
          const topics = extractComplaintTopics(item.ai_summary);
          topics.forEach(topic => {
            categories[topic] = (categories[topic] || 0) + 1;
            totalComplaints++;
          });
        }
      });

      const categoryArray = Object.entries(categories)
        .map(([category, count]) => ({
          category,
          count,
          percentage: totalComplaints > 0 ? (count / totalComplaints) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setCategoryComplaints(categoryArray);
    } catch (error) {
      console.error('Error loading category complaints:', error);
    }
  };

  const loadHourlyDistribution = async () => {
    try {
      const thirtyDaysAgoUTC = getIstanbulDateStartUTC(30);

      let allChats: any[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data: batch } = await supabase
          .from('chats')
          .select('created_at')
          .gte('created_at', thirtyDaysAgoUTC)
          .range(from, from + batchSize - 1);

        if (!batch || batch.length === 0) break;
        allChats = [...allChats, ...batch];
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      if (allChats.length === 0) return;

      const hourCounts = Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 }));

      allChats.forEach(chat => {
        const date = new Date(chat.created_at);
        const istanbulTimeStr = date.toLocaleString('en-US', {
          timeZone: 'Europe/Istanbul',
          hour12: false,
        });
        const timePart = istanbulTimeStr.split(',')[1]?.trim();
        const hour = timePart ? parseInt(timePart.split(':')[0]) : 0;
        hourCounts[hour].count++;
      });

      setHourlyDistribution(hourCounts);
    } catch (error) {
      console.error('Error loading hourly distribution:', error);
    }
  };

  const loadPerformersRanking = async () => {
    try {
      const thirtyDaysAgoUTC = getIstanbulDateStartUTC(30);

      let allChatsForRanking: any[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data: batch } = await supabase
          .from('chats')
          .select('agent_name, rating_score')
          .not('agent_name', 'is', null)
          .range(from, from + batchSize - 1);

        if (!batch || batch.length === 0) break;
        allChatsForRanking = [...allChatsForRanking, ...batch];
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      if (allChatsForRanking.length === 0) return;

      const uniqueAgents = [...new Set(allChatsForRanking.map(c => c.agent_name))];

      const rankings = await Promise.all(
        uniqueAgents.map(async (agentName) => {
          let allAgentChats: any[] = [];
          let from = 0;

          while (true) {
            const { data: batch } = await supabase
              .from('chats')
              .select('id, rating_score')
              .eq('agent_name', agentName)
              .gte('created_at', thirtyDaysAgoUTC)
              .range(from, from + batchSize - 1);

            if (!batch || batch.length === 0) break;
            allAgentChats = [...allAgentChats, ...batch];
            if (batch.length < batchSize) break;
            from += batchSize;
          }

          if (allAgentChats.length === 0) {
            return { name: agentName, score: 0, chatCount: 0, avgSatisfaction: 0 };
          }

          const chatIds = allAgentChats.map(c => c.id);

          let allAnalysisData: any[] = [];
          let analysisFrom = 0;

          if (chatIds.length > 0) {
            const batchSize = 1000;
            for (let i = 0; i < chatIds.length; i += batchSize) {
              const batchIds = chatIds.slice(i, i + batchSize);
              const { data: batch } = await supabase
                .from('chat_analysis')
                .select('overall_score')
                .in('chat_id', batchIds)
                .not('overall_score', 'is', null)
                .gt('overall_score', 0);

              if (batch) {
                allAnalysisData = [...allAnalysisData, ...batch];
              }
            }
          }

          if (allAnalysisData.length === 0) {
            return { name: agentName, score: 0, chatCount: 0, avgSatisfaction: 0 };
          }

          const avgScore = allAnalysisData.reduce((sum, a) => sum + (a.overall_score || 0), 0) / allAnalysisData.length;

          const ratedChats = allAgentChats.filter(c => c.rating_score !== null && c.rating_score > 0);
          const avgSatisfaction = ratedChats.length > 0
            ? ratedChats.reduce((sum, c) => sum + (c.rating_score || 0), 0) / ratedChats.length
            : 0;

          return {
            name: agentName,
            score: Math.round(avgScore),
            details: `${allAgentChats.length} chat, ⭐${avgSatisfaction.toFixed(1)}`,
          };
        })
      );

      const sortedRankings = rankings
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score);

      setTopPerformers(sortedRankings.slice(0, 5));
      setBottomPerformers(sortedRankings.slice(-5).reverse());
    } catch (error) {
      console.error('Error loading performers ranking:', error);
    }
  };

  const loadSentimentDistribution = async () => {
    try {
      let allAnalysis: any[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data: analysis } = await supabase
          .from('chat_analysis')
          .select('overall_score')
          .not('overall_score', 'is', null)
          .gt('overall_score', 0)
          .range(from, from + batchSize - 1);

        if (!analysis || analysis.length === 0) break;

        allAnalysis = [...allAnalysis, ...analysis];

        if (analysis.length < batchSize) break;
        from += batchSize;
      }

      const sentiments = { positive: 0, neutral: 0, negative: 0 };
      allAnalysis.forEach(item => {
        const score = typeof item.overall_score === 'string' ? parseInt(item.overall_score) : item.overall_score;
        if (score >= 80) {
          sentiments.positive++;
        } else if (score >= 50) {
          sentiments.neutral++;
        } else {
          sentiments.negative++;
        }
      });

      setSentimentDistribution([
        { label: 'Pozitif', value: sentiments.positive, color: '#10b981' },
        { label: 'Nötr', value: sentiments.neutral, color: '#f59e0b' },
        { label: 'Negatif', value: sentiments.negative, color: '#ef4444' },
      ]);
    } catch (error) {
      console.error('Error loading sentiment distribution:', error);
    }
  };

  const statCards = [
    {
      title: 'Unique Chat',
      value: stats.uniqueChats,
      icon: Users,
      color: 'bg-blue-500',
      change: 'Müşteri Oturumları',
    },
    {
      title: 'Total Thread',
      value: stats.totalThreads,
      icon: MessageSquare,
      color: 'bg-cyan-500',
      change: `${stats.totalThreads - stats.uniqueChats} Tekrar`,
    },
    {
      title: 'Analiz Edilen',
      value: stats.analyzedChats,
      icon: CheckCircle,
      color: 'bg-green-500',
      change: `${stats.totalChats > 0 ? Math.round((stats.analyzedChats / stats.totalChats) * 100) : 0}%`,
    },
    {
      title: 'Personel Sayısı',
      value: stats.totalPersonnel,
      icon: UserCircle,
      color: 'bg-purple-500',
      change: 'Aktif',
    },
    {
      title: 'Bekleyen Uyarı',
      value: stats.pendingAlerts,
      icon: AlertTriangle,
      color: 'bg-red-500',
      change: stats.pendingAlerts > 0 ? 'Dikkat!' : 'Normal',
    },
    {
      title: 'Ortalama Skor',
      value: `${stats.averageScore}/100`,
      icon: TrendingUp,
      color: 'bg-emerald-500',
      change: stats.averageScore >= 80 ? 'Olumlu' : stats.averageScore >= 50 ? 'Notr' : 'Olumsuz',
    },
    {
      title: 'Ort. Yanıt Süresi',
      value: `${stats.averageResponseTime}s`,
      icon: Clock,
      color: 'bg-orange-500',
      change: stats.averageResponseTime < 60 ? 'Hızlı' : 'Yavaş',
    },
    {
      title: 'Toplam Beğeni',
      value: stats.totalLikes,
      icon: ThumbsUp,
      color: 'bg-green-600',
      change: `${stats.totalChats > 0 ? Math.round((stats.totalLikes / stats.totalChats) * 100) : 0}%`,
    },
    {
      title: 'Toplam Beğenilmeyen',
      value: stats.totalDislikes,
      icon: ThumbsDown,
      color: 'bg-red-600',
      change: `${stats.totalChats > 0 ? Math.round((stats.totalDislikes / stats.totalChats) * 100) : 0}%`,
    },
    {
      title: 'Kaçan Chat',
      value: stats.missedChats,
      icon: PhoneOff,
      color: 'bg-orange-600',
      change: stats.missedChats > 0 ? 'Dikkat!' : 'Normal',
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
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
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">LiveChat kalite kontrol ve analiz ozeti</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium self-start"
        >
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-lg transition-all hover:scale-105">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-600 truncate">{card.title}</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">{card.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{card.change}</p>
                </div>
                <div className={`${card.color} p-2 rounded-lg flex-shrink-0 ml-2`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <DonutChart
            data={sentimentDistribution}
            title="Genel Sentiment Dağılımı"
            centerText={sentimentDistribution.reduce((sum, item) => sum + item.value, 0).toString()}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 flex-1 p-3 bg-green-50 rounded-lg border border-green-200">
              <Smile className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-xs text-green-600 font-medium">Pozitif</div>
                <div className="text-lg font-bold text-green-900">{sentimentDistribution[0]?.value || 0}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 flex-1 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <Meh className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-xs text-orange-600 font-medium">Nötr</div>
                <div className="text-lg font-bold text-orange-900">{sentimentDistribution[1]?.value || 0}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 p-3 bg-red-50 rounded-lg border border-red-200">
              <Frown className="w-5 h-5 text-red-600" />
              <div>
                <div className="text-xs text-red-600 font-medium">Negatif</div>
                <div className="text-lg font-bold text-red-900">{sentimentDistribution[2]?.value || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Leaderboard
            data={topPerformers}
            title="🏆 Ayın En İyi Performansları"
            type="top"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Leaderboard
            data={bottomPerformers}
            title="⚠️ Gelişim Gereken Personel"
            type="bottom"
          />
        </div>
      </div>

      {personnelTrends.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">📈 Personel Performans Trendleri (Son 30 Gün)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {personnelTrends.map((trend, index) => (
              <div key={index} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">{trend.agent_name}</h3>
                  <span className={`text-sm font-semibold ${trend.weekly_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trend.weekly_change >= 0 ? '+' : ''}{trend.weekly_change.toFixed(1)}%
                  </span>
                </div>
                <TrendChart
                  data={trend.daily_scores.map(s => ({ label: s.date, value: s.score }))}
                  title=""
                  color={trend.weekly_change >= 0 ? '#10b981' : '#ef4444'}
                  height={150}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <BarChart
            data={complaintData.map(d => ({
              label: d.date,
              value: d.negative + d.neutral,
              color: '#ef4444',
            }))}
            title="📊 Günlük Şikayet Trendi (Son 30 Gün)"
            height={250}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <BarChart
            data={categoryComplaints.map(c => ({
              label: c.category,
              value: c.count,
              color: '#ef4444',
            }))}
            title="🔥 En Çok Şikayet Edilen Konular (Top 10)"
            height={250}
          />
        </div>
      </div>

      {complaintData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">📉 Günlük Şikayet Detayları</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Toplam Chat</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Analiz Edilen</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Negatif</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nötr</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Negatif %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nötr %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {complaintData.map((data, index) => {
                  const negativePercent = data.analyzedChats > 0 ? (data.negative / data.analyzedChats) * 100 : 0;
                  const neutralPercent = data.analyzedChats > 0 ? (data.neutral / data.analyzedChats) * 100 : 0;
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{data.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{data.totalChats}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{data.analyzedChats}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full font-semibold">
                          {data.negative}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full font-semibold">
                          {data.neutral}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500 rounded-full"
                              style={{ width: `${negativePercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-red-600 w-12 text-right">
                            {negativePercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{ width: `${neutralPercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-orange-600 w-12 text-right">
                            {neutralPercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <HeatMap
          data={hourlyDistribution}
          title="🕐 Saatlik Chat Yoğunluğu Analizi (Son 30 Gün)"
          description="Son 30 gün boyunca her saat diliminde toplam kaç chat alındığını gösterir. En yoğun saatleri tespit ederek personel planlaması yapabilirsiniz."
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">⚠️ Son Uyarılar</h2>
        </div>

        {recentAlerts.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Henüz uyarı bulunmuyor
          </div>
        ) : (
          <div className="space-y-4">
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-semibold text-sm">{alert.severity.toUpperCase()}</span>
                      <span className="text-xs sm:text-sm opacity-75">
                        {new Date(alert.created_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm whitespace-pre-line">{alert.message}</p>
                  </div>
                  {alert.sent_to_telegram ? (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded flex-shrink-0 self-start">
                      Gonderildi
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded flex-shrink-0 self-start">
                      Bekliyor
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

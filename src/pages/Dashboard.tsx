import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, Users, AlertTriangle, TrendingUp, Clock, CheckCircle, ThumbsUp, ThumbsDown, PhoneOff, UserCircle, Frown, Meh, Smile, Filter, ChevronDown } from 'lucide-react';
import TrendChart from '../components/TrendChart';
import BarChart from '../components/BarChart';
import DonutChart from '../components/DonutChart';
import HeatMap from '../components/HeatMap';
import Leaderboard from '../components/Leaderboard';
import { Tooltip } from '../components/Tooltip';
import SentimentChatsModal from '../components/SentimentChatsModal';
import { extractComplaintTopics } from '../lib/complaintCategories';
import { getIstanbulDateStartUTC, convertIstanbulDateToUTC } from '../lib/utils';

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
  daily_scores: { date: string; score: number; count: number; sortKey: number }[];
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
  const [sentimentModal, setSentimentModal] = useState<{ type: 'negative' | 'neutral' | 'positive'; date?: string } | null>(null);
  const [trendModal, setTrendModal] = useState<PersonnelTrend | null>(null);

  const [complaintTrendDays, setComplaintTrendDays] = useState(30);
  const [topComplaintsFilter, setTopComplaintsFilter] = useState(30);
  const [detailsTableDays, setDetailsTableDays] = useState(30);
  const [showComplaintTrendFilter, setShowComplaintTrendFilter] = useState(false);
  const [showTopComplaintsFilter, setShowTopComplaintsFilter] = useState(false);
  const [showDetailsTableFilter, setShowDetailsTableFilter] = useState(false);

  const [isCustomTrendRange, setIsCustomTrendRange] = useState(false);
  const [trendStartDate, setTrendStartDate] = useState('');
  const [trendEndDate, setTrendEndDate] = useState('');

  const [isCustomTopComplaintsRange, setIsCustomTopComplaintsRange] = useState(false);
  const [topComplaintsStartDate, setTopComplaintsStartDate] = useState('');
  const [topComplaintsEndDate, setTopComplaintsEndDate] = useState('');

  const [isCustomDetailsRange, setIsCustomDetailsRange] = useState(false);
  const [detailsStartDate, setDetailsStartDate] = useState('');
  const [detailsEndDate, setDetailsEndDate] = useState('');

  useEffect(() => {
    loadDashboardData();

    const statsInterval = setInterval(loadDashboardData, 30000);

    return () => {
      clearInterval(statsInterval);
    };
  }, []);

  useEffect(() => {
    loadComplaintData();
  }, [complaintTrendDays, isCustomTrendRange, trendStartDate, trendEndDate]);

  useEffect(() => {
    loadCategoryComplaints();
  }, [topComplaintsFilter, isCustomTopComplaintsRange, topComplaintsStartDate, topComplaintsEndDate]);

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
      const batchSize = 1000;

      let allAgentChats: any[] = [];
      let from = 0;

      while (true) {
        const { data: batch } = await supabase
          .from('chats')
          .select('id, agent_name, created_at')
          .not('agent_name', 'is', null)
          .gte('created_at', thirtyDaysAgoUTC)
          .range(from, from + batchSize - 1);

        if (!batch || batch.length === 0) break;
        allAgentChats = [...allAgentChats, ...batch];
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      if (allAgentChats.length === 0) return;

      const chatIdToDate = new Map<string, string>();
      const chatIdToAgent = new Map<string, string>();
      allAgentChats.forEach(c => {
        chatIdToDate.set(c.id, c.created_at);
        chatIdToAgent.set(c.id, c.agent_name);
      });

      const allChatIds = allAgentChats.map(c => c.id);
      let allAnalysisData: any[] = [];

      for (let i = 0; i < allChatIds.length; i += batchSize) {
        const batchIds = allChatIds.slice(i, i + batchSize);
        const { data: batch } = await supabase
          .from('chat_analysis')
          .select('overall_score, chat_id')
          .in('chat_id', batchIds)
          .gt('overall_score', 0);

        if (batch) allAnalysisData = [...allAnalysisData, ...batch];
      }

      if (allAnalysisData.length === 0) return;

      const agentDailyMap: { [agent: string]: { [dayKey: string]: { scores: number[]; label: string; ts: number } } } = {};

      allAnalysisData.forEach(item => {
        const agent = chatIdToAgent.get(item.chat_id);
        const createdAt = chatIdToDate.get(item.chat_id);
        if (!agent || !createdAt) return;

        const d = new Date(createdAt);
        const istanbul = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
        const year = istanbul.getFullYear();
        const month = istanbul.getMonth();
        const day = istanbul.getDate();
        const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const label = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`;
        const ts = new Date(year, month, day).getTime();

        if (!agentDailyMap[agent]) agentDailyMap[agent] = {};
        if (!agentDailyMap[agent][dayKey]) agentDailyMap[agent][dayKey] = { scores: [], label, ts };
        agentDailyMap[agent][dayKey].scores.push(item.overall_score || 0);
      });

      const trends: PersonnelTrend[] = [];

      for (const [agentName, dailyMap] of Object.entries(agentDailyMap)) {
        const scores = Object.values(dailyMap)
          .sort((a, b) => a.ts - b.ts)
          .map(entry => ({
            date: entry.label,
            score: Math.round(entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length),
            count: entry.scores.length,
            sortKey: entry.ts,
          }));

        if (scores.length >= 1) {
          const firstScore = scores[0].score;
          const lastScore = scores[scores.length - 1].score;
          const weeklyChange = scores.length >= 2 && firstScore > 0 ? ((lastScore - firstScore) / firstScore) * 100 : 0;

          trends.push({
            agent_name: agentName,
            daily_scores: scores,
            weekly_change: weeklyChange,
          });
        }
      }

      setPersonnelTrends(trends);
    } catch (error) {
      console.error('Error loading personnel trends:', error);
    }
  };

  const loadComplaintData = async () => {
    try {
      let startDateUTC: string;
      let endDateUTC: string | undefined;
      let daysDiff: number;

      if (isCustomTrendRange && trendStartDate && trendEndDate) {
        startDateUTC = convertIstanbulDateToUTC(trendStartDate, false);
        endDateUTC = convertIstanbulDateToUTC(trendEndDate, true);
        const start = new Date(trendStartDate);
        const end = new Date(trendEndDate);
        daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      } else {
        startDateUTC = getIstanbulDateStartUTC(complaintTrendDays);
        daysDiff = complaintTrendDays;
      }

      let allAnalysis: any[] = [];
      let allChats: any[] = [];
      let from = 0;
      const batchSize = 1000;

      from = 0;
      while (true) {
        let query = supabase
          .from('chats')
          .select('created_at, id')
          .gte('created_at', startDateUTC)
          .order('created_at', { ascending: true })
          .range(from, from + batchSize - 1);

        if (endDateUTC) {
          query = query.lte('created_at', endDateUTC);
        }

        const { data: batch } = await query;

        if (!batch || batch.length === 0) break;
        allChats = [...allChats, ...batch];
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      // Then get all chat_analysis records that have corresponding chats
      const chatIds = allChats.map(c => c.id);
      if (chatIds.length === 0) {
        setComplaintData([]);
        return;
      }

      // Supabase has a limit on IN queries, so we need to batch
      const IN_BATCH_SIZE = 1000;
      for (let i = 0; i < chatIds.length; i += IN_BATCH_SIZE) {
        const batchIds = chatIds.slice(i, i + IN_BATCH_SIZE);
        const { data: analysisBatch } = await supabase
          .from('chat_analysis')
          .select('sentiment, chat_id, overall_score')
          .in('chat_id', batchIds)
          .gt('overall_score', 0);

        if (analysisBatch) {
          allAnalysis = [...allAnalysis, ...analysisBatch];
        }
      }

      // Create a map of chat_id -> created_at for quick lookup
      const chatDateMap = new Map<string, string>();
      allChats.forEach(chat => {
        chatDateMap.set(chat.id, chat.created_at);
      });

      const dailyComplaints: { [key: string]: { negative: number; neutral: number; totalChats: number; analyzedChats: number } } = {};

      const now = new Date();
      const istanbulNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));

      for (let i = 0; i < daysDiff; i++) {
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
        const chatCreatedAt = chatDateMap.get(item.chat_id);
        if (!chatCreatedAt) return;

        const date = new Date(chatCreatedAt).toLocaleDateString('tr-TR', {
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
      let startDateUTC: string;
      let endDateUTC: string | undefined;

      if (isCustomTopComplaintsRange && topComplaintsStartDate && topComplaintsEndDate) {
        startDateUTC = convertIstanbulDateToUTC(topComplaintsStartDate, false);
        endDateUTC = convertIstanbulDateToUTC(topComplaintsEndDate, true);
      } else {
        startDateUTC = getIstanbulDateStartUTC(topComplaintsFilter);
      }

      let allAnalysis: any[] = [];
      let from = 0;
      const batchSize = 1000;

      let allChatsInRange: any[] = [];
      let chatFrom = 0;
      while (true) {
        let query = supabase
          .from('chats')
          .select('id')
          .gte('created_at', startDateUTC)
          .range(chatFrom, chatFrom + batchSize - 1);

        if (endDateUTC) {
          query = query.lte('created_at', endDateUTC);
        }

        const { data: batch } = await query;

        if (!batch || batch.length === 0) break;
        allChatsInRange = [...allChatsInRange, ...batch];
        if (batch.length < batchSize) break;
        chatFrom += batchSize;
      }

      if (allChatsInRange.length === 0) {
        setCategoryComplaints([]);
        return;
      }

      const chatIds = allChatsInRange.map(c => c.id);

      // Get analysis records for those chats
      const IN_BATCH_SIZE = 1000;
      for (let i = 0; i < chatIds.length; i += IN_BATCH_SIZE) {
        const batchIds = chatIds.slice(i, i + IN_BATCH_SIZE);
        const { data: batch } = await supabase
          .from('chat_analysis')
          .select('ai_summary, sentiment, overall_score')
          .in('chat_id', batchIds)
          .eq('sentiment', 'negative')
          .not('ai_summary', 'is', null)
          .gt('overall_score', 0);

        if (batch) {
          allAnalysis = [...allAnalysis, ...batch];
        }
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
      tooltip: 'Farklı müşterilerle yapılan chat sayısı',
    },
    {
      title: 'Total Thread',
      value: stats.totalThreads,
      icon: MessageSquare,
      color: 'bg-cyan-500',
      change: `${stats.totalThreads - stats.uniqueChats} Tekrar`,
      tooltip: 'Tekrar eden müşteriler dahil toplam chat sayısı',
    },
    {
      title: 'Analiz Edilen',
      value: stats.analyzedChats,
      icon: CheckCircle,
      color: 'bg-green-500',
      change: `${stats.totalChats > 0 ? Math.round((stats.analyzedChats / stats.totalChats) * 100) : 0}%`,
      tooltip: 'AI tarafından analiz edilen chat sayısı',
    },
    {
      title: 'Personel Sayısı',
      value: stats.totalPersonnel,
      icon: UserCircle,
      color: 'bg-purple-500',
      change: 'Aktif',
      tooltip: 'Sistemdeki toplam aktif personel sayısı',
    },
    {
      title: 'Bekleyen Uyarı',
      value: stats.pendingAlerts,
      icon: AlertTriangle,
      color: 'bg-red-500',
      change: stats.pendingAlerts > 0 ? 'Dikkat!' : 'Normal',
      tooltip: 'İncelenmesi gereken düşük skorlu chat sayısı',
    },
    {
      title: 'Ortalama Skor',
      value: `${stats.averageScore}/100`,
      icon: TrendingUp,
      color: 'bg-emerald-500',
      change: stats.averageScore >= 80 ? 'Olumlu' : stats.averageScore >= 50 ? 'Notr' : 'Olumsuz',
      tooltip: 'AI tarafından hesaplanan ortalama kalite skoru',
    },
    {
      title: 'Ort. Yanıt Süresi',
      value: `${stats.averageResponseTime}s`,
      icon: Clock,
      color: 'bg-orange-500',
      change: stats.averageResponseTime < 60 ? 'Hızlı' : 'Yavaş',
      tooltip: 'Personelin müşterilere ortalama yanıt süresi',
    },
    {
      title: 'Toplam Beğeni',
      value: stats.totalLikes,
      icon: ThumbsUp,
      color: 'bg-green-600',
      change: `${stats.totalChats > 0 ? Math.round((stats.totalLikes / stats.totalChats) * 100) : 0}%`,
      tooltip: 'Müşteri tarafından beğenilen chat sayısı',
    },
    {
      title: 'Toplam Beğenilmeyen',
      value: stats.totalDislikes,
      icon: ThumbsDown,
      color: 'bg-red-600',
      change: `${stats.totalChats > 0 ? Math.round((stats.totalDislikes / stats.totalChats) * 100) : 0}%`,
      tooltip: 'Müşteri tarafından beğenilmeyen chat sayısı',
    },
    {
      title: 'Kaçan Chat',
      value: stats.missedChats,
      icon: PhoneOff,
      color: 'bg-orange-600',
      change: stats.missedChats > 0 ? 'Dikkat!' : 'Normal',
      tooltip: 'Personel tarafından cevaplanmayan chat sayısı',
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/15 text-red-300 border-red-500/30';
      case 'high':
        return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin shadow-xl shadow-cyan-500/30" />
          <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-b-emerald-400 rounded-full animate-spin shadow-xl shadow-emerald-500/30" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-slate-200 mt-1">LiveChat kalite kontrol ve analiz ozeti</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white rounded-xl transition-all text-sm font-semibold self-start shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105"
        >
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Tooltip key={card.title} content={card.tooltip} position="bottom">
              <div className="glass-effect rounded-xl shadow-lg p-4 hover:shadow-2xl hover:shadow-cyan-500/20 transition-all hover:scale-105 cursor-help group">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-200 truncate">{card.title}</p>
                    <p className="text-xl sm:text-2xl font-bold text-white mt-2">{card.value}</p>
                    <p className="text-xs text-cyan-400 mt-1">{card.change}</p>
                  </div>
                  <div className={`${card.color} p-2 rounded-lg flex-shrink-0 ml-2 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </Tooltip>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-effect rounded-xl shadow-lg p-6">
          <DonutChart
            data={sentimentDistribution}
            title="Genel Sentiment Dağılımı"
            centerText={sentimentDistribution.reduce((sum, item) => sum + item.value, 0).toString()}
          />
        </div>

        <div className="glass-effect rounded-xl shadow-lg p-6">
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setSentimentModal({ type: 'positive' })}
              className="flex items-center gap-2 flex-1 p-3 bg-gradient-to-br from-emerald-500/30 to-green-500/30 rounded-xl border-2 border-emerald-400/50 shadow-lg shadow-emerald-500/30 hover:scale-105 hover:border-emerald-300 transition-all cursor-pointer text-left w-full"
            >
              <Smile className="w-5 h-5 text-emerald-300" />
              <div>
                <div className="text-xs text-emerald-200 font-medium">Pozitif</div>
                <div className="text-lg font-bold text-white">{sentimentDistribution[0]?.value || 0}</div>
              </div>
            </button>
            <button
              onClick={() => setSentimentModal({ type: 'neutral' })}
              className="flex items-center gap-2 flex-1 p-3 bg-gradient-to-br from-amber-500/30 to-orange-500/30 rounded-xl border-2 border-amber-400/50 shadow-lg shadow-amber-500/30 hover:scale-105 hover:border-amber-300 transition-all cursor-pointer text-left w-full"
            >
              <Meh className="w-5 h-5 text-amber-300" />
              <div>
                <div className="text-xs text-amber-200 font-medium">Nötr</div>
                <div className="text-lg font-bold text-white">{sentimentDistribution[1]?.value || 0}</div>
              </div>
            </button>
            <button
              onClick={() => setSentimentModal({ type: 'negative' })}
              className="flex items-center gap-2 flex-1 p-3 bg-gradient-to-br from-rose-500/30 to-red-500/30 rounded-xl border-2 border-rose-400/50 shadow-lg shadow-rose-500/30 hover:scale-105 hover:border-rose-300 transition-all cursor-pointer text-left w-full"
            >
              <Frown className="w-5 h-5 text-rose-300" />
              <div>
                <div className="text-xs text-rose-200 font-medium">Negatif</div>
                <div className="text-lg font-bold text-white">{sentimentDistribution[2]?.value || 0}</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-effect rounded-xl shadow-lg p-6">
          <Leaderboard
            data={topPerformers}
            title="🏆 Ayın En İyi Performansları"
            type="top"
          />
        </div>

        <div className="glass-effect rounded-xl shadow-lg p-6">
          <Leaderboard
            data={bottomPerformers}
            title="⚠️ Gelişim Gereken Personel"
            type="bottom"
          />
        </div>
      </div>

      {personnelTrends.length > 0 && (
        <div className="glass-effect rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-white mb-5">📈 Personel Performans Trendleri (Son 30 Gün)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {personnelTrends.map((trend, index) => {
              const lastScore = trend.daily_scores[trend.daily_scores.length - 1]?.score ?? 0;
              const isPositive = trend.weekly_change >= 0;
              const color = isPositive ? '#10b981' : '#ef4444';
              const sparkPoints = trend.daily_scores.map((s, i) => {
                const max = Math.max(...trend.daily_scores.map(d => d.score), 1);
                const min = Math.min(...trend.daily_scores.map(d => d.score), 0);
                const range = max - min || 1;
                const x = (i / (trend.daily_scores.length - 1 || 1)) * 100;
                const y = ((max - s.score) / range) * 100;
                return `${x},${y}`;
              }).join(' ');
              return (
                <button
                  key={index}
                  onClick={() => setTrendModal(trend)}
                  className="group flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white" style={{ background: `${color}33`, border: `2px solid ${color}66` }}>
                    {trend.agent_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-white text-sm truncate">{trend.agent_name}</span>
                      <span className={`text-xs font-bold flex-shrink-0 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{trend.weekly_change.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-8">
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id={`spark-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.25 }} />
                              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.02 }} />
                            </linearGradient>
                          </defs>
                          <polyline fill={`url(#spark-${index})`} stroke="none" points={`0,100 ${sparkPoints} 100,100`} />
                          <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={sparkPoints} />
                        </svg>
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0">Skor: <span className="text-white font-bold">{lastScore}</span></span>
                    </div>
                  </div>
                  <TrendingUp className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors flex-shrink-0" />
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-4">Grafik görmek için isme tıklayın</p>
        </div>
      )}

      {trendModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setTrendModal(null)}>
          <div className="bg-[#0f1623] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                  style={{ background: `${trendModal.weekly_change >= 0 ? '#10b981' : '#ef4444'}33`, border: `2px solid ${trendModal.weekly_change >= 0 ? '#10b981' : '#ef4444'}66` }}
                >
                  {trendModal.agent_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{trendModal.agent_name}</h3>
                  <p className="text-sm text-slate-400">Son 30 Gün Performans Trendi</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${trendModal.weekly_change >= 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'}`}>
                  {trendModal.weekly_change >= 0 ? '+' : ''}{trendModal.weekly_change.toFixed(1)}%
                </div>
                <button onClick={() => setTrendModal(null)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Başlangıç Skoru', value: trendModal.daily_scores[0]?.score ?? 0 },
                { label: 'Son Skor', value: trendModal.daily_scores[trendModal.daily_scores.length - 1]?.score ?? 0 },
                { label: 'Veri Noktası', value: trendModal.daily_scores.length },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">{stat.label}</div>
                  <div className="text-xl font-bold text-white">{stat.value}</div>
                </div>
              ))}
            </div>

            <TrendChart
              data={trendModal.daily_scores.map(s => ({ label: s.date, value: s.score, count: s.count }))}
              title=""
              color={trendModal.weekly_change >= 0 ? '#10b981' : '#ef4444'}
              height={220}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-effect rounded-xl shadow-lg p-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">📊 Günlük Şikayet Trendi</h3>
              <div className="relative">
                <button
                  onClick={() => setShowComplaintTrendFilter(!showComplaintTrendFilter)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/15 text-slate-300 rounded-lg transition-colors border border-white/10"
                >
                  <Filter className="w-4 h-4" />
                  {isCustomTrendRange ? 'Özel Aralık' : `Son ${complaintTrendDays} Gün`}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showComplaintTrendFilter && (
                  <div className="absolute right-0 mt-2 w-36 bg-[#1a2236] rounded-lg shadow-xl border border-white/10 z-10">
                    <button
                      onClick={() => { setComplaintTrendDays(7); setIsCustomTrendRange(false); setShowComplaintTrendFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 ${!isCustomTrendRange && complaintTrendDays === 7 ? 'bg-white/5 font-semibold text-white' : ''}`}
                    >
                      Son 7 Gün
                    </button>
                    <button
                      onClick={() => { setComplaintTrendDays(30); setIsCustomTrendRange(false); setShowComplaintTrendFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 ${!isCustomTrendRange && complaintTrendDays === 30 ? 'bg-white/5 font-semibold text-white' : ''}`}
                    >
                      Son 30 Gün
                    </button>
                    <button
                      onClick={() => { setComplaintTrendDays(90); setIsCustomTrendRange(false); setShowComplaintTrendFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white ${!isCustomTrendRange && complaintTrendDays === 90 ? 'bg-white/5 font-semibold text-white' : ''}`}
                    >
                      Son 90 Gün
                    </button>
                    <button
                      onClick={() => { setIsCustomTrendRange(true); setShowComplaintTrendFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 rounded-b-lg ${isCustomTrendRange ? 'bg-white/5 font-semibold text-white' : ''}`}
                    >
                      Özel Aralık
                    </button>
                  </div>
                )}
              </div>
            </div>
            {isCustomTrendRange && (
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="date"
                  value={trendStartDate}
                  onChange={(e) => setTrendStartDate(e.target.value)}
                  className="px-2 py-1 bg-white/5 border border-white/15 text-white rounded text-sm"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={trendEndDate}
                  onChange={(e) => setTrendEndDate(e.target.value)}
                  className="px-2 py-1 bg-white/5 border border-white/15 text-white rounded text-sm"
                />
              </div>
            )}
          </div>
          <BarChart
            data={complaintData.map(d => ({
              label: d.date,
              value: d.negative + d.neutral,
              color: '#ef4444',
            }))}
            title=""
            height={250}
          />
        </div>

        <div className="glass-effect rounded-xl shadow-lg p-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">🔥 En Çok Şikayet Edilen Konular</h3>
              <div className="relative">
                <button
                  onClick={() => setShowTopComplaintsFilter(!showTopComplaintsFilter)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/15 text-slate-300 rounded-lg transition-colors border border-white/10"
                >
                  <Filter className="w-4 h-4" />
                  {isCustomTopComplaintsRange ? 'Özel Aralık' : `Son ${topComplaintsFilter} Gün`}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showTopComplaintsFilter && (
                  <div className="absolute right-0 mt-2 w-36 bg-[#1a2236] rounded-lg shadow-xl border border-white/10 z-10">
                    <button
                      onClick={() => { setTopComplaintsFilter(7); setIsCustomTopComplaintsRange(false); setShowTopComplaintsFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white ${!isCustomTopComplaintsRange && topComplaintsFilter === 7 ? 'bg-white/5 font-semibold text-white' : ''}`}
                    >
                      Son 7 Gün
                    </button>
                    <button
                      onClick={() => { setTopComplaintsFilter(30); setIsCustomTopComplaintsRange(false); setShowTopComplaintsFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white ${!isCustomTopComplaintsRange && topComplaintsFilter === 30 ? 'bg-white/5 font-semibold text-white' : ''}`}
                    >
                      Son 30 Gün
                    </button>
                    <button
                      onClick={() => { setTopComplaintsFilter(90); setIsCustomTopComplaintsRange(false); setShowTopComplaintsFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white ${!isCustomTopComplaintsRange && topComplaintsFilter === 90 ? 'bg-white/5 font-semibold text-white' : ''}`}
                    >
                      Son 90 Gün
                    </button>
                    <button
                      onClick={() => { setIsCustomTopComplaintsRange(true); setShowTopComplaintsFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 rounded-b-lg ${isCustomTopComplaintsRange ? 'bg-white/5 font-semibold text-white' : ''}`}
                    >
                      Özel Aralık
                    </button>
                  </div>
                )}
              </div>
            </div>
            {isCustomTopComplaintsRange && (
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="date"
                  value={topComplaintsStartDate}
                  onChange={(e) => setTopComplaintsStartDate(e.target.value)}
                  className="px-2 py-1 bg-white/5 border border-white/15 text-white rounded text-sm"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={topComplaintsEndDate}
                  onChange={(e) => setTopComplaintsEndDate(e.target.value)}
                  className="px-2 py-1 bg-white/5 border border-white/15 text-white rounded text-sm"
                />
              </div>
            )}
          </div>
          <BarChart
            data={categoryComplaints.map(c => ({
              label: c.category,
              value: c.count,
              color: '#ef4444',
            }))}
            title=""
            height={250}
          />
        </div>
      </div>

      {complaintData.length > 0 && (
        <div className="glass-effect rounded-xl shadow-lg p-6">
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">📉 Günlük Şikayet Detayları</h2>
              <div className="relative">
                <button
                  onClick={() => setShowDetailsTableFilter(!showDetailsTableFilter)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/15 text-slate-300 rounded-lg transition-colors border border-white/10"
                >
                  <Filter className="w-4 h-4" />
                  {isCustomDetailsRange ? 'Özel Aralık' : `Son ${detailsTableDays} Gün`}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showDetailsTableFilter && (
                  <div className="absolute right-0 mt-2 w-36 bg-[#1a2236] rounded-lg shadow-xl border border-white/10 z-10">
                    <button
                      onClick={() => { setDetailsTableDays(7); setIsCustomDetailsRange(false); setShowDetailsTableFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white ${!isCustomDetailsRange && detailsTableDays === 7 ? 'bg-white/5 font-semibold text-white' : ''}`}
                    >
                      Son 7 Gün
                    </button>
                    <button
                      onClick={() => { setDetailsTableDays(30); setIsCustomDetailsRange(false); setShowDetailsTableFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white ${!isCustomDetailsRange && detailsTableDays === 30 ? 'bg-white/5 font-semibold text-white' : ''}`}
                    >
                      Son 30 Gün
                    </button>
                    <button
                      onClick={() => { setDetailsTableDays(90); setIsCustomDetailsRange(false); setShowDetailsTableFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white ${!isCustomDetailsRange && detailsTableDays === 90 ? 'bg-white/5 font-semibold text-white' : ''}`}
                    >
                      Son 90 Gün
                    </button>
                    <button
                      onClick={() => { setIsCustomDetailsRange(true); setShowDetailsTableFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 rounded-b-lg ${isCustomDetailsRange ? 'bg-white/5 font-semibold text-white' : ''}`}
                    >
                      Özel Aralık
                    </button>
                  </div>
                )}
              </div>
            </div>
            {isCustomDetailsRange && (
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="date"
                  value={detailsStartDate}
                  onChange={(e) => setDetailsStartDate(e.target.value)}
                  className="px-2 py-1 bg-white/5 border border-white/15 text-white rounded text-sm"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={detailsEndDate}
                  onChange={(e) => setDetailsEndDate(e.target.value)}
                  className="px-2 py-1 bg-white/5 border border-white/15 text-white rounded text-sm"
                />
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-700/50 border-b-2 border-cyan-400/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-200 uppercase">Tarih</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-200 uppercase">Toplam Chat</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-200 uppercase">Analiz Edilen</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-200 uppercase">Negatif</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-200 uppercase">Nötr</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-200 uppercase">Negatif %</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-200 uppercase">Nötr %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-600/50">
                {(() => {
                  let filteredData = complaintData;

                  if (isCustomDetailsRange && detailsStartDate && detailsEndDate) {
                    const start = new Date(detailsStartDate);
                    const end = new Date(detailsEndDate);

                    filteredData = complaintData.filter(d => {
                      const [day, month] = d.date.split('.');
                      const year = new Date().getFullYear();
                      const itemDate = new Date(year, parseInt(month) - 1, parseInt(day));
                      return itemDate >= start && itemDate <= end;
                    });
                  } else {
                    filteredData = complaintData.slice(-detailsTableDays);
                  }

                  return filteredData.map((data, index) => {
                  const negativePercent = data.analyzedChats > 0 ? (data.negative / data.analyzedChats) * 100 : 0;
                  const neutralPercent = data.analyzedChats > 0 ? (data.neutral / data.analyzedChats) * 100 : 0;
                  const dateParts = data.date.split(/[./\-]/);
                  const day = dateParts[0] ?? '01';
                  const month = dateParts[1] ?? '01';
                  const year = new Date().getFullYear();
                  const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                  return (
                    <tr key={index} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-white">{data.date}</td>
                      <td className="px-4 py-3 text-sm text-white font-bold">{data.totalChats}</td>
                      <td className="px-4 py-3 text-sm text-slate-200 font-medium">{data.analyzedChats}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          disabled={data.negative === 0}
                          onClick={() => data.negative > 0 && setSentimentModal({ type: 'negative', date: isoDate })}
                          className={`px-2 py-1 bg-rose-500/30 text-rose-100 rounded-full font-bold border-2 border-rose-400/50 transition-all ${data.negative > 0 ? 'hover:bg-rose-500/50 hover:scale-110 cursor-pointer' : 'opacity-50 cursor-default'}`}
                        >
                          {data.negative}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          disabled={data.neutral === 0}
                          onClick={() => data.neutral > 0 && setSentimentModal({ type: 'neutral', date: isoDate })}
                          className={`px-2 py-1 bg-amber-500/30 text-amber-100 rounded-full font-bold border-2 border-amber-400/50 transition-all ${data.neutral > 0 ? 'hover:bg-amber-500/50 hover:scale-110 cursor-pointer' : 'opacity-50 cursor-default'}`}
                        >
                          {data.neutral}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2.5 bg-slate-700/70 rounded-full overflow-hidden border border-slate-600/50">
                            <div
                              className="h-full bg-gradient-to-r from-rose-500 to-red-500 rounded-full"
                              style={{ width: `${negativePercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-rose-300 w-12 text-right">
                            {negativePercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2.5 bg-slate-700/70 rounded-full overflow-hidden border border-slate-600/50">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                              style={{ width: `${neutralPercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-amber-300 w-12 text-right">
                            {neutralPercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="glass-effect rounded-xl shadow-lg p-6">
        <HeatMap
          data={hourlyDistribution}
          title="🕐 Saatlik Chat Yoğunluğu Analizi (Son 30 Gün)"
          description="Son 30 gün boyunca her saat diliminde toplam kaç chat alındığını gösterir. En yoğun saatleri tespit ederek personel planlaması yapabilirsiniz."
        />
      </div>

      <div className="glass-effect rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-white">⚠️ Son Uyarılar</h2>
        </div>

        {recentAlerts.length === 0 ? (
          <div className="text-center py-8 text-slate-100">
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
                    <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded flex-shrink-0 self-start">
                      Gonderildi
                    </span>
                  ) : (
                    <span className="text-xs bg-white/10 text-slate-400 border border-white/10 px-2 py-1 rounded flex-shrink-0 self-start">
                      Bekliyor
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SentimentChatsModal
        sentiment={sentimentModal?.type ?? null}
        date={sentimentModal?.date}
        onClose={() => setSentimentModal(null)}
      />
    </div>
  );
}

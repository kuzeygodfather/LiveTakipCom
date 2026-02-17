import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import {
  Users, AlertTriangle, CheckCircle, MessageSquare, ChevronDown, ChevronUp,
  RefreshCw, Send, Clock, TrendingDown, TrendingUp, Minus, Copy, Check,
  Calendar, BookOpen, Target, Repeat, Star
} from 'lucide-react';

type DateRange = '1' | '7' | '30';

interface AgentIssue {
  text: string;
  count: number;
  type: 'critical' | 'improvement';
}

interface AgentCoachingData {
  agentName: string;
  avgScore: number;
  totalChats: number;
  negativeSentimentCount: number;
  requiresAttentionCount: number;
  recurringIssues: AgentIssue[];
  recommendations: string[];
  coachingScript: string;
  lastActivityDate: string;
  trend: 'up' | 'down' | 'stable';
  urgency: 'high' | 'medium' | 'low';
}

interface SentFeedback {
  agent_name: string;
  sent_at: string;
  coaching_suggestion: string;
}

const URGENCY_LABELS: Record<string, string> = {
  high: 'Acil',
  medium: 'Orta',
  low: 'Dusuk',
};

const URGENCY_COLORS: Record<string, string> = {
  high: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

const SCORE_COLOR = (score: number) => {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 70) return 'text-amber-400';
  return 'text-rose-400';
};

function buildCoachingScript(agentName: string, issues: AgentIssue[], recommendations: string[], avgScore: number): string {
  const firstName = agentName.split(' ')[0];
  const criticalIssues = issues.filter(i => i.type === 'critical');
  const improvementIssues = issues.filter(i => i.type === 'improvement');

  let script = `Merhaba ${firstName},\n\n`;

  if (avgScore >= 85) {
    script += `Son performans analizlerimizde genel olarak cok iyi bir skor elde ettigini goruyoruz, bu harika! Bazi kucuk gelistirme noktalarimiz var, birlikte gozden gecirelim.\n\n`;
  } else if (avgScore >= 70) {
    script += `Son analizlerimize baktim ve bazi gelistirme alanlari tespit ettim. Seninle bunlari paylasmak ve destek olmak istedim.\n\n`;
  } else {
    script += `Son chatlerine dair birkac onemli konu hakkinda konusmam gerekiyor. Bu noktalar uzerinde birlikte calisarak performansini guclendirebiliriz.\n\n`;
  }

  if (criticalIssues.length > 0) {
    script += `Oncelikli olarak ele almamiz gereken konular:\n`;
    criticalIssues.slice(0, 3).forEach(issue => {
      script += `- ${issue.text}${issue.count > 1 ? ` (${issue.count} chatta tekrarladi)` : ''}\n`;
    });
    script += '\n';
  }

  if (improvementIssues.length > 0) {
    script += `Gelistirebilecegimiz alanlar:\n`;
    improvementIssues.slice(0, 3).forEach(issue => {
      script += `- ${issue.text}${issue.count > 1 ? ` (${issue.count} kez goruldu)` : ''}\n`;
    });
    script += '\n';
  }

  if (recommendations.length > 0) {
    script += `Oneri:\n${recommendations[0]}\n\n`;
  }

  script += `Bu konularda sana nasil yardimci olabilirim? Herhangi bir soru veya ihtiyacin olursa bana ulasabilirsin.`;

  return script;
}

function determineUrgency(data: { avgScore: number; requiresAttentionCount: number; criticalCount: number }): 'high' | 'medium' | 'low' {
  if (data.avgScore < 70 || data.requiresAttentionCount >= 3 || data.criticalCount >= 2) return 'high';
  if (data.avgScore < 82 || data.requiresAttentionCount >= 1 || data.criticalCount >= 1) return 'medium';
  return 'low';
}

export default function CoachingCenter() {
  const { session } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>('7');
  const [loading, setLoading] = useState(true);
  const [coachingData, setCoachingData] = useState<AgentCoachingData[]>([]);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [copiedAgent, setCopiedAgent] = useState<string | null>(null);
  const [sentFeedbacks, setSentFeedbacks] = useState<SentFeedback[]>([]);
  const [sendingFeedback, setSendingFeedback] = useState<string | null>(null);
  const [sentToday, setSentToday] = useState<Set<string>>(new Set());
  const [filterUrgency, setFilterUrgency] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    loadCoachingData();
    loadSentFeedbacks();
  }, [dateRange]);

  const loadSentFeedbacks = async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('coaching_feedbacks')
      .select('agent_name, sent_at, coaching_suggestion')
      .gte('sent_at', todayStart.toISOString())
      .order('sent_at', { ascending: false });

    if (data) {
      setSentFeedbacks(data);
      setSentToday(new Set(data.map((f: SentFeedback) => f.agent_name)));
    }
  };

  const loadCoachingData = async () => {
    setLoading(true);
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));
      daysAgo.setHours(0, 0, 0, 0);

      let allChats: any[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data: batch } = await supabase
          .from('chats')
          .select('id, agent_name, created_at')
          .not('agent_name', 'is', null)
          .gte('created_at', daysAgo.toISOString())
          .range(from, from + batchSize - 1);

        if (!batch || batch.length === 0) break;
        allChats = [...allChats, ...batch];
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      if (allChats.length === 0) {
        setCoachingData([]);
        setLoading(false);
        return;
      }

      const chatIds = allChats.map(c => c.id);
      const chatMap = new Map(allChats.map(c => [c.id, c]));

      let allAnalyses: any[] = [];
      for (let i = 0; i < chatIds.length; i += batchSize) {
        const batchIds = chatIds.slice(i, i + batchSize);
        const { data: batch } = await supabase
          .from('chat_analysis')
          .select('chat_id, overall_score, sentiment, requires_attention, issues_detected, recommendations, coaching_suggestion')
          .in('chat_id', batchIds)
          .gt('overall_score', 0);

        if (batch) allAnalyses = [...allAnalyses, ...batch];
      }

      const agentMap = new Map<string, {
        scores: number[];
        sentiments: string[];
        attentionCount: number;
        issueMap: Map<string, { count: number; type: 'critical' | 'improvement' }>;
        recommendations: string[];
        lastDate: string;
      }>();

      allAnalyses.forEach(analysis => {
        const chat = chatMap.get(analysis.chat_id);
        if (!chat) return;

        const agentName = chat.agent_name;
        if (!agentMap.has(agentName)) {
          agentMap.set(agentName, {
            scores: [],
            sentiments: [],
            attentionCount: 0,
            issueMap: new Map(),
            recommendations: [],
            lastDate: chat.created_at,
          });
        }

        const agent = agentMap.get(agentName)!;
        const score = parseFloat(String(analysis.overall_score)) || 0;
        agent.scores.push(score);
        agent.sentiments.push(analysis.sentiment || '');
        if (analysis.requires_attention) agent.attentionCount++;

        if (chat.created_at > agent.lastDate) agent.lastDate = chat.created_at;

        const issues = analysis.issues_detected || {};
        const criticalErrors: string[] = issues.critical_errors || [];
        const improvementAreas: string[] = issues.improvement_areas || [];

        criticalErrors.forEach(err => {
          const key = err.trim().toLowerCase();
          if (!key || key.length < 5) return;
          const existing = agent.issueMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            agent.issueMap.set(key, { count: 1, type: 'critical' });
          }
        });

        improvementAreas.forEach(area => {
          const key = area.trim().toLowerCase();
          if (!key || key.length < 5) return;
          const existing = agent.issueMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            agent.issueMap.set(key, { count: 1, type: 'improvement' });
          }
        });

        if (analysis.recommendations && analysis.recommendations.length > 10) {
          agent.recommendations.push(analysis.recommendations);
        }
        if (analysis.coaching_suggestion && analysis.coaching_suggestion.length > 10) {
          agent.recommendations.unshift(analysis.coaching_suggestion);
        }
      });

      const results: AgentCoachingData[] = [];

      agentMap.forEach((agent, agentName) => {
        const avgScore = agent.scores.length > 0
          ? Math.round(agent.scores.reduce((a, b) => a + b, 0) / agent.scores.length)
          : 0;
        const negativeSentimentCount = agent.sentiments.filter(s => s === 'negative').length;

        const recurringIssues: AgentIssue[] = Array.from(agent.issueMap.entries())
          .map(([text, data]) => ({
            text: text.charAt(0).toUpperCase() + text.slice(1),
            count: data.count,
            type: data.type,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        const criticalCount = recurringIssues.filter(i => i.type === 'critical').length;
        const urgency = determineUrgency({ avgScore, requiresAttentionCount: agent.attentionCount, criticalCount });

        const uniqueRecommendations = [...new Set(agent.recommendations)].slice(0, 5);

        const midIdx = Math.floor(agent.scores.length / 2);
        const firstHalfAvg = agent.scores.slice(0, midIdx).reduce((a, b) => a + b, 0) / (midIdx || 1);
        const secondHalfAvg = agent.scores.slice(midIdx).reduce((a, b) => a + b, 0) / (agent.scores.slice(midIdx).length || 1);
        const trend: 'up' | 'down' | 'stable' =
          secondHalfAvg - firstHalfAvg > 3 ? 'up' :
          firstHalfAvg - secondHalfAvg > 3 ? 'down' : 'stable';

        const coachingScript = buildCoachingScript(agentName, recurringIssues, uniqueRecommendations, avgScore);

        results.push({
          agentName,
          avgScore,
          totalChats: agent.scores.length,
          negativeSentimentCount,
          requiresAttentionCount: agent.attentionCount,
          recurringIssues,
          recommendations: uniqueRecommendations,
          coachingScript,
          lastActivityDate: agent.lastDate,
          trend,
          urgency,
        });
      });

      results.sort((a, b) => {
        const urgencyOrder = { high: 0, medium: 1, low: 2 };
        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        }
        return a.avgScore - b.avgScore;
      });

      setCoachingData(results);
    } catch (err) {
      console.error('Error loading coaching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (agentName: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(agentName)) next.delete(agentName);
      else next.add(agentName);
      return next;
    });
  };

  const copyScript = async (agentName: string, script: string) => {
    await navigator.clipboard.writeText(script);
    setCopiedAgent(agentName);
    setTimeout(() => setCopiedAgent(null), 2000);
  };

  const markFeedbackSent = async (agent: AgentCoachingData) => {
    if (!session?.user?.id) return;
    setSendingFeedback(agent.agentName);
    try {
      const summary = agent.recurringIssues.length > 0
        ? agent.recurringIssues.slice(0, 3).map(i => i.text).join('; ')
        : agent.recommendations[0] || 'Genel performans degerlendirmesi';

      const { error } = await supabase
        .from('coaching_feedbacks')
        .insert({
          chat_id: `manual_${Date.now()}`,
          agent_name: agent.agentName,
          agent_email: agent.agentName.toLowerCase().replace(' ', '.') + '@company.com',
          coaching_suggestion: summary,
          sent_by: session.user.id,
          sent_at: new Date().toISOString(),
        });

      if (!error) {
        setSentToday(prev => new Set([...prev, agent.agentName]));
        await loadSentFeedbacks();
      }
    } catch (err) {
      console.error('Error marking feedback:', err);
    } finally {
      setSendingFeedback(null);
    }
  };

  const filteredData = useMemo(() => {
    if (filterUrgency === 'all') return coachingData;
    return coachingData.filter(d => d.urgency === filterUrgency);
  }, [coachingData, filterUrgency]);

  const summaryStats = useMemo(() => ({
    high: coachingData.filter(d => d.urgency === 'high').length,
    medium: coachingData.filter(d => d.urgency === 'medium').length,
    low: coachingData.filter(d => d.urgency === 'low').length,
    sentTodayCount: sentToday.size,
    totalAgents: coachingData.length,
  }), [coachingData, sentToday]);

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-rose-400" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-cyan-400" />
            Koçluk Merkezi
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gunluk koordinator rehberi — hangi personelle ne hakkinda konusmaniz gerekiyor
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg border border-slate-700/50 p-1">
            {(['1', '7', '30'] as DateRange[]).map(d => (
              <button
                key={d}
                onClick={() => setDateRange(d)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  dateRange === d
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d === '1' ? 'Bugün' : `Son ${d} Gün`}
              </button>
            ))}
          </div>
          <button
            onClick={loadCoachingData}
            className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-effect rounded-xl p-4 border border-rose-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="text-xs text-slate-400">Acil Görüsme</span>
          </div>
          <div className="text-2xl font-bold text-rose-400">{summaryStats.high}</div>
          <div className="text-xs text-slate-500 mt-1">personel bekliyor</div>
        </div>

        <div className="glass-effect rounded-xl p-4 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400">Orta Öncelik</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">{summaryStats.medium}</div>
          <div className="text-xs text-slate-500 mt-1">personel</div>
        </div>

        <div className="glass-effect rounded-xl p-4 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">Geri Bildirim Verildi</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{summaryStats.sentTodayCount}</div>
          <div className="text-xs text-slate-500 mt-1">bugün</div>
        </div>

        <div className="glass-effect rounded-xl p-4 border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-400">Toplam Personel</span>
          </div>
          <div className="text-2xl font-bold text-cyan-400">{summaryStats.totalAgents}</div>
          <div className="text-xs text-slate-500 mt-1">analiz edildi</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">Filtre:</span>
        {(['all', 'high', 'medium', 'low'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterUrgency(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
              filterUrgency === f
                ? f === 'all'
                  ? 'bg-slate-600 text-white border-slate-500'
                  : f === 'high'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                  : f === 'medium'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                : 'text-slate-400 border-slate-700/50 hover:border-slate-600'
            }`}
          >
            {f === 'all' ? 'Tümü' : URGENCY_LABELS[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      ) : filteredData.length === 0 ? (
        <div className="glass-effect rounded-xl p-12 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">Bu periyotta veri bulunamadi</p>
          <p className="text-slate-500 text-sm mt-1">Farkli bir tarih araligini deneyin</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredData.map(agent => {
            const isExpanded = expandedAgents.has(agent.agentName);
            const isSentToday = sentToday.has(agent.agentName);
            const criticalIssues = agent.recurringIssues.filter(i => i.type === 'critical');
            const improvementIssues = agent.recurringIssues.filter(i => i.type === 'improvement');
            const initials = agent.agentName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

            return (
              <div
                key={agent.agentName}
                className={`glass-effect rounded-xl border transition-all duration-300 ${
                  agent.urgency === 'high' ? 'border-rose-500/30' :
                  agent.urgency === 'medium' ? 'border-amber-500/20' :
                  'border-slate-700/50'
                }`}
              >
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => toggleExpand(agent.agentName)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      agent.urgency === 'high' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      agent.urgency === 'medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}>
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">{agent.agentName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${URGENCY_COLORS[agent.urgency]}`}>
                          {URGENCY_LABELS[agent.urgency]}
                        </span>
                        {isSentToday && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Geri bildirim verildi
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                        <span className={`font-semibold ${SCORE_COLOR(agent.avgScore)}`}>
                          Ort. Skor: {agent.avgScore}
                        </span>
                        <span>{agent.totalChats} chat</span>
                        {agent.requiresAttentionCount > 0 && (
                          <span className="text-rose-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {agent.requiresAttentionCount} dikkat gerektiren
                          </span>
                        )}
                        {agent.negativeSentimentCount > 0 && (
                          <span className="text-amber-400">{agent.negativeSentimentCount} olumsuz sentiment</span>
                        )}
                        <TrendIcon trend={agent.trend} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {agent.recurringIssues.length > 0 && (
                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
                          <Repeat className="w-3.5 h-3.5" />
                          <span>{agent.recurringIssues.length} sorun tespit edildi</span>
                        </div>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 space-y-5 border-t border-slate-700/40 pt-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {criticalIssues.length > 0 && (
                        <div className="bg-rose-950/20 rounded-lg border border-rose-500/20 p-4">
                          <h4 className="text-sm font-semibold text-rose-300 flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4" />
                            Kritik Hatalar
                          </h4>
                          <div className="space-y-2">
                            {criticalIssues.map((issue, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <div className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-rose-400 text-xs font-bold">{issue.count}</span>
                                </div>
                                <span className="text-sm text-slate-300">{issue.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {improvementIssues.length > 0 && (
                        <div className="bg-amber-950/20 rounded-lg border border-amber-500/20 p-4">
                          <h4 className="text-sm font-semibold text-amber-300 flex items-center gap-2 mb-3">
                            <Target className="w-4 h-4" />
                            Gelistirme Alanlari
                          </h4>
                          <div className="space-y-2">
                            {improvementIssues.map((issue, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-amber-400 text-xs font-bold">{issue.count}</span>
                                </div>
                                <span className="text-sm text-slate-300">{issue.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {agent.recurringIssues.length === 0 && (
                        <div className="lg:col-span-2 bg-emerald-950/20 rounded-lg border border-emerald-500/20 p-4 flex items-center gap-3">
                          <Star className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-emerald-300">Hata Tespit Edilmedi</p>
                            <p className="text-xs text-slate-400 mt-0.5">Bu personel secili periyotta hata kaydetmedi.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {agent.recommendations.length > 0 && (
                      <div className="bg-slate-800/40 rounded-lg border border-slate-700/40 p-4">
                        <h4 className="text-sm font-semibold text-cyan-300 flex items-center gap-2 mb-3">
                          <MessageSquare className="w-4 h-4" />
                          AI Degerlendirme Ozeti
                        </h4>
                        <div className="space-y-2">
                          {agent.recommendations.slice(0, 3).map((rec, idx) => (
                            <p key={idx} className="text-sm text-slate-300 leading-relaxed pl-3 border-l-2 border-cyan-500/30">
                              {rec}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-slate-800/30 rounded-lg border border-slate-700/40 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-cyan-400" />
                          Önerilen Görüsme Metni
                        </h4>
                        <button
                          onClick={() => copyScript(agent.agentName, agent.coachingScript)}
                          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors duration-200 px-2 py-1 rounded-md hover:bg-cyan-500/10"
                        >
                          {copiedAgent === agent.agentName ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Kopyalandi</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Kopyala</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed bg-slate-900/40 rounded-lg p-4 border border-slate-700/30">
                        {agent.coachingScript}
                      </pre>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Son aktivite:{' '}
                          {new Date(agent.lastActivityDate).toLocaleDateString('tr-TR', {
                            timeZone: 'Europe/Istanbul',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <button
                        onClick={() => markFeedbackSent(agent)}
                        disabled={sendingFeedback === agent.agentName || isSentToday}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isSentToday
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 hover:text-white'
                        }`}
                      >
                        {sendingFeedback === agent.agentName ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : isSentToday ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        {isSentToday ? 'Bugün Verildi' : 'Geri Bildirim Verildi Olarak İsaretle'}
                      </button>
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

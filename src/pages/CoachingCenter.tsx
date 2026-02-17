import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import {
  Users, AlertTriangle, CheckCircle, MessageSquare, ChevronDown, ChevronUp,
  RefreshCw, Send, Clock, TrendingDown, TrendingUp, Minus, Copy, Check,
  BookOpen, Target, Repeat, Star, FileText, Hash, ExternalLink, Shield,
  ArrowRight, ListChecks, BarChart2, Lightbulb
} from 'lucide-react';

type DateRange = '1' | '7' | '30';

interface ChatEvidence {
  chatId: string;
  customerName: string;
  date: string;
  score: number;
  aiSummary: string;
  recommendation: string;
}

interface EvidencedIssue {
  text: string;
  type: 'critical' | 'improvement';
  count: number;
  evidences: ChatEvidence[];
  correctApproach: string;
}

interface AgentCoachingData {
  agentName: string;
  avgScore: number;
  totalChats: number;
  negativeSentimentCount: number;
  requiresAttentionCount: number;
  evidencedIssues: EvidencedIssue[];
  coachingScript: string;
  lastActivityDate: string;
  trend: 'up' | 'down' | 'stable';
  urgency: 'high' | 'medium' | 'low';
  lowestScoringChats: ChatEvidence[];
  actionItems: string[];
}

interface SentFeedback {
  agent_name: string;
  sent_at: string;
  coaching_suggestion: string;
}

const URGENCY_LABELS: Record<string, string> = {
  high: 'Acil',
  medium: 'Orta',
  low: 'Iyi',
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

const SCORE_BG = (score: number) => {
  if (score >= 85) return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
  if (score >= 70) return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
  return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortChatId(id: string) {
  return id.length > 12 ? id.slice(0, 8) + '...' : id;
}

function deriveCorrectApproach(issueText: string): string {
  const lower = issueText.toLowerCase();
  if (lower.includes('gecikme') || lower.includes('yavas') || lower.includes('yanit sures')) {
    return 'Musteri mesajlarina en gec 60 saniye icinde ilk yaniti ver. Uzun islemler icin "Simdi kontrol ediyorum, bir dakika" gibi ara yanit gonder.';
  }
  if (lower.includes('empa') || lower.includes('ilgisiz') || lower.includes('sogukkanlı')) {
    return 'Musterinin durumunu oncelikle kabul et. "Anliyorum, bu durum gercekten sinir bozucu olabilir" gibi ifadeler kullan. Cozum sunmadan once duyuldigini hissettir.';
  }
  if (lower.includes('bilgi') || lower.includes('yanlis') || lower.includes('yanlış') || lower.includes('hatali')) {
    return 'Emin olmadigın konularda kesin yanit verme. "Hemen kontrol edeyim" de ve dogrulayarak geri don. Yanlis bilgi vermek musterinin guvensizligine yol acar.';
  }
  if (lower.includes('kapatma') || lower.includes('sonlandirma') || lower.includes('cozum')) {
    return 'Chati kapatmadan once musteriye "Baska bir konuda yardimci olabilecegim bir sey var mi?" diye sor. Cozumun tam oldugunu dogrula.';
  }
  if (lower.includes('kopya') || lower.includes('sablonla') || lower.includes('standart')) {
    return 'Hazir metin kullanirken musterinin adini ve ozel durumunu mutlaka ekle. "Sayın [Musteri Adi], sizin durumunuzda..." gibi kisisellestirilmis bir yaklasim benimse.';
  }
  if (lower.includes('uzun') || lower.includes('gereksiz') || lower.includes('savurgan')) {
    return 'Yanitleri kisa ve oz tut. Musterinin sorusunu dogrudan cevapla, gereksiz aciklama ve tekrarlardan kacin.';
  }
  if (lower.includes('kibarca') || lower.includes('profesyonel') || lower.includes('dil')) {
    return 'Her zaman resmi ve nazik bir dil kullan. "Tabiki", "Elbet" gibi samimi ifadeler yanında "Sayın Musterimiz" gibi resmi hitaplari dengeli kullan.';
  }
  return 'Bu konuda standart prosedure uymaya ozen goster. Benzer durumlarda nasil davranman gerektigini amirinden teyit al ve gelecek chatlere not olarak ekle.';
}

function buildActionItems(issues: EvidencedIssue[], avgScore: number): string[] {
  const items: string[] = [];
  const criticals = issues.filter(i => i.type === 'critical').slice(0, 2);
  const improvements = issues.filter(i => i.type === 'improvement').slice(0, 2);

  criticals.forEach(issue => {
    items.push(`"${issue.text.slice(0, 60)}${issue.text.length > 60 ? '...' : ''}" sorununu bu hafta sonuna kadar coz`);
  });
  improvements.forEach(issue => {
    items.push(`${issue.text.slice(0, 50)}${issue.text.length > 50 ? '...' : ''} konusunda 2 gunluk pratik yap`);
  });

  if (avgScore < 75) {
    items.push('Gunde en az 3 onceki basarili chati inceleyerek iyi pratikleri not al');
  }
  items.push('3 gun icerisinde ilerlemeyi degerlendirmek uzere kisa bir takip gorusmesi yap');

  return items;
}

function buildDetailedScript(
  agentName: string,
  issues: EvidencedIssue[],
  avgScore: number,
  totalChats: number,
  dateRange: string,
  lowestChats: ChatEvidence[],
  actionItems: string[]
): string {
  const firstName = agentName.split(' ')[0];
  const today = new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric' });
  const criticals = issues.filter(i => i.type === 'critical');
  const improvements = issues.filter(i => i.type === 'improvement');

  let script = `KOÇLUK GÖRÜŞME NOTU\n`;
  script += `Tarih: ${today} | Personel: ${agentName} | Hazırlayan: Koordinatör\n`;
  script += `${'─'.repeat(60)}\n\n`;

  script += `Merhaba ${firstName},\n\n`;

  if (avgScore >= 88) {
    script += `Son ${dateRange} gunde yaptigin ${totalChats} chat analiz ettim. `;
    script += `Genel ortalaman ${avgScore}/100 — bu gercekten iyi bir performans. `;
    script += `Kucuk detaylari konusmak icin bu gorusmede bir aradayiz.\n\n`;
  } else if (avgScore >= 72) {
    script += `Son ${dateRange} gunde yaptigin ${totalChats} chati inceledim. `;
    script += `Ortalama skorun ${avgScore}/100. Iyi bir taban var ama birkac spesifik konuyu birlikte ele alacagiz. `;
    script += `Konusmak istedigim seyleri somut chatlerden ornekleyecegim.\n\n`;
  } else {
    script += `Son ${dateRange} gunde yaptigin ${totalChats} chati detayliyla inceledim. `;
    script += `Ortalama skorun ${avgScore}/100 — hedef esinin altinda. Bu gorusmede `;
    script += `somut ornekler uzerinden konusacagiz ve birlikte bir aksiyon plani cizecegiz.\n\n`;
  }

  if (criticals.length > 0) {
    script += `${'─'.repeat(60)}\n`;
    script += `BÖLÜM 1 — KRİTİK KONULAR (${criticals.length} baslik)\n`;
    script += `${'─'.repeat(60)}\n\n`;

    criticals.forEach((issue, issueIdx) => {
      script += `${issueIdx + 1}. ${issue.text.toUpperCase()}\n`;
      script += `   Bu durum ${issue.count} farkli chatta tespit edildi.\n\n`;

      issue.evidences.slice(0, 2).forEach((ev, evIdx) => {
        script += `   Ornek ${evIdx + 1}: Chat #${shortChatId(ev.chatId)} | ${formatDate(ev.date)} | Musteri: ${ev.customerName || 'Belirtilmemis'} | Skor: ${ev.score}/100\n`;
        if (ev.aiSummary) {
          const summary = ev.aiSummary.length > 180 ? ev.aiSummary.slice(0, 180) + '...' : ev.aiSummary;
          script += `   Sistem analizi: "${summary}"\n`;
        }
        if (ev.recommendation) {
          const rec = ev.recommendation.length > 150 ? ev.recommendation.slice(0, 150) + '...' : ev.recommendation;
          script += `   Spesifik oneri: ${rec}\n`;
        }
        script += '\n';
      });

      script += `   Dogru yaklasim: ${issue.correctApproach}\n\n`;
    });
  }

  if (improvements.length > 0) {
    script += `${'─'.repeat(60)}\n`;
    script += `BÖLÜM 2 — GELİŞTİRME ALANLARI (${improvements.length} baslik)\n`;
    script += `${'─'.repeat(60)}\n\n`;

    improvements.forEach((issue, issueIdx) => {
      script += `${criticals.length + issueIdx + 1}. ${issue.text}\n`;
      script += `   ${issue.count} chatta goruldu.\n\n`;

      if (issue.evidences.length > 0) {
        const ev = issue.evidences[0];
        script += `   Referans Chat: #${shortChatId(ev.chatId)} | ${formatDate(ev.date)} | ${ev.customerName || 'Belirtilmemis'} | Skor: ${ev.score}/100\n`;
        if (ev.aiSummary) {
          script += `   "${ev.aiSummary.slice(0, 140)}..."\n`;
        }
        script += '\n';
      }

      script += `   Onerim: ${issue.correctApproach}\n\n`;
    });
  }

  if (issues.length === 0) {
    script += `${'─'.repeat(60)}\n`;
    script += `GENEL DEĞERLENDİRME\n`;
    script += `${'─'.repeat(60)}\n\n`;
    script += `Analiz edilen ${totalChats} chatta spesifik bir hata tespit edilmedi. `;
    script += `Performansini koruman icin en iyi uygulamalari surdurmeni oneririm.\n\n`;
  }

  script += `${'─'.repeat(60)}\n`;
  script += `AKSİYON PLANI\n`;
  script += `${'─'.repeat(60)}\n\n`;

  actionItems.forEach((item, idx) => {
    script += `${idx + 1}. [ ] ${item}\n`;
  });

  script += `\n`;
  script += `Bu konular hakkinda sorularin var mi? Hangi kisimda daha fazla destege ihtiyac duyuyorsun?\n\n`;
  script += `─────────────────────────────────────────\n`;
  script += `Koordinator imzasi: ___________________\n`;
  script += `Personel imzasi:    ___________________\n`;
  script += `Gorussme tarihi:    ${today}`;

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
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [copiedAgent, setCopiedAgent] = useState<string | null>(null);
  const [sendingFeedback, setSendingFeedback] = useState<string | null>(null);
  const [sentToday, setSentToday] = useState<Set<string>>(new Set());
  const [filterUrgency, setFilterUrgency] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [activeTab, setActiveTab] = useState<Record<string, 'issues' | 'script' | 'actions'>>({});

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
    if (data) setSentToday(new Set(data.map((f: SentFeedback) => f.agent_name)));
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
          .select('id, agent_name, customer_name, created_at')
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
          .select('chat_id, overall_score, sentiment, requires_attention, issues_detected, recommendations, coaching_suggestion, ai_summary')
          .in('chat_id', batchIds)
          .gt('overall_score', 0);
        if (batch) allAnalyses = [...allAnalyses, ...batch];
      }

      const agentMap = new Map<string, {
        scores: { score: number; date: string }[];
        sentiments: string[];
        attentionCount: number;
        issueEvidenceMap: Map<string, { type: 'critical' | 'improvement'; evidences: ChatEvidence[] }>;
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
            issueEvidenceMap: new Map(),
            lastDate: chat.created_at,
          });
        }

        const agent = agentMap.get(agentName)!;
        const score = parseFloat(String(analysis.overall_score)) || 0;
        agent.scores.push({ score, date: chat.created_at });
        agent.sentiments.push(analysis.sentiment || '');
        if (analysis.requires_attention) agent.attentionCount++;
        if (chat.created_at > agent.lastDate) agent.lastDate = chat.created_at;

        const evidence: ChatEvidence = {
          chatId: chat.id,
          customerName: chat.customer_name || 'Belirtilmemis',
          date: chat.created_at,
          score,
          aiSummary: analysis.ai_summary || '',
          recommendation: analysis.recommendations || analysis.coaching_suggestion || '',
        };

        const issues = analysis.issues_detected || {};
        const criticalErrors: string[] = issues.critical_errors || [];
        const improvementAreas: string[] = issues.improvement_areas || [];

        criticalErrors.forEach(err => {
          const key = err.trim().toLowerCase();
          if (!key || key.length < 5) return;
          if (!agent.issueEvidenceMap.has(key)) {
            agent.issueEvidenceMap.set(key, { type: 'critical', evidences: [] });
          }
          const entry = agent.issueEvidenceMap.get(key)!;
          if (entry.evidences.length < 5) entry.evidences.push(evidence);
        });

        improvementAreas.forEach(area => {
          const key = area.trim().toLowerCase();
          if (!key || key.length < 5) return;
          if (!agent.issueEvidenceMap.has(key)) {
            agent.issueEvidenceMap.set(key, { type: 'improvement', evidences: [] });
          }
          const entry = agent.issueEvidenceMap.get(key)!;
          if (entry.evidences.length < 5) entry.evidences.push(evidence);
        });
      });

      const results: AgentCoachingData[] = [];

      agentMap.forEach((agent, agentName) => {
        const scoreValues = agent.scores.map(s => s.score);
        const avgScore = scoreValues.length > 0
          ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
          : 0;
        const negativeSentimentCount = agent.sentiments.filter(s => s === 'negative').length;

        const evidencedIssues: EvidencedIssue[] = Array.from(agent.issueEvidenceMap.entries())
          .map(([text, data]) => ({
            text: text.charAt(0).toUpperCase() + text.slice(1),
            type: data.type,
            count: data.evidences.length,
            evidences: data.evidences.sort((a, b) => a.score - b.score),
            correctApproach: deriveCorrectApproach(text),
          }))
          .sort((a, b) => {
            if (a.type !== b.type) return a.type === 'critical' ? -1 : 1;
            return b.count - a.count;
          })
          .slice(0, 10);

        const criticalCount = evidencedIssues.filter(i => i.type === 'critical').length;
        const urgency = determineUrgency({ avgScore, requiresAttentionCount: agent.attentionCount, criticalCount });

        const sortedByScore = [...agent.scores].sort((a, b) => a.score - b.score);
        const lowestScoringChats: ChatEvidence[] = sortedByScore.slice(0, 3).map(s => {
          const chat = chatMap.get(allAnalyses.find(a => a.chat_id && chatMap.get(a.chat_id)?.agent_name === agentName && parseFloat(String(a.overall_score)) === s.score)?.chat_id || '');
          const analysis = allAnalyses.find(a => parseFloat(String(a.overall_score)) === s.score && chatMap.get(a.chat_id)?.agent_name === agentName);
          return {
            chatId: chat?.id || '',
            customerName: chat?.customer_name || 'Belirtilmemis',
            date: s.date,
            score: s.score,
            aiSummary: analysis?.ai_summary || '',
            recommendation: analysis?.recommendations || '',
          };
        }).filter(c => c.chatId);

        const midIdx = Math.floor(scoreValues.length / 2);
        const firstHalfAvg = scoreValues.slice(0, midIdx).reduce((a, b) => a + b, 0) / (midIdx || 1);
        const secondHalfAvg = scoreValues.slice(midIdx).reduce((a, b) => a + b, 0) / (scoreValues.slice(midIdx).length || 1);
        const trend: 'up' | 'down' | 'stable' =
          secondHalfAvg - firstHalfAvg > 3 ? 'up' :
          firstHalfAvg - secondHalfAvg > 3 ? 'down' : 'stable';

        const actionItems = buildActionItems(evidencedIssues, avgScore);
        const coachingScript = buildDetailedScript(agentName, evidencedIssues, avgScore, agent.scores.length, dateRange, lowestScoringChats, actionItems);

        results.push({
          agentName,
          avgScore,
          totalChats: agent.scores.length,
          negativeSentimentCount,
          requiresAttentionCount: agent.attentionCount,
          evidencedIssues,
          coachingScript,
          lastActivityDate: agent.lastDate,
          trend,
          urgency,
          lowestScoringChats,
          actionItems,
        });
      });

      results.sort((a, b) => {
        const urgencyOrder = { high: 0, medium: 1, low: 2 };
        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
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

  const toggleIssue = (key: string) => {
    setExpandedIssues(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getTab = (agentName: string) => activeTab[agentName] || 'issues';
  const setTab = (agentName: string, tab: 'issues' | 'script' | 'actions') => {
    setActiveTab(prev => ({ ...prev, [agentName]: tab }));
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
      const summary = agent.evidencedIssues.length > 0
        ? agent.evidencedIssues.slice(0, 3).map(i => i.text).join('; ')
        : 'Genel performans degerlendirmesi';
      const { error } = await supabase.from('coaching_feedbacks').insert({
        chat_id: `manual_${Date.now()}`,
        agent_name: agent.agentName,
        agent_email: agent.agentName.toLowerCase().replace(' ', '.') + '@company.com',
        coaching_suggestion: summary,
        sent_by: session.user.id,
        sent_at: new Date().toISOString(),
      });
      if (!error) {
        setSentToday(prev => new Set([...prev, agent.agentName]));
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
    if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
    if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
    return <Minus className="w-3.5 h-3.5 text-slate-400" />;
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
            Somut chat kanıtlarıyla desteklenmiş koordinatör görüşme rehberi
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

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-400">Öncelik:</span>
        {(['all', 'high', 'medium', 'low'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterUrgency(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
              filterUrgency === f
                ? f === 'all' ? 'bg-slate-600 text-white border-slate-500'
                  : f === 'high' ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                  : f === 'medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                : 'text-slate-400 border-slate-700/50 hover:border-slate-600'
            }`}
          >
            {f === 'all' ? 'Tümü' : URGENCY_LABELS[f]}
            {f !== 'all' && <span className="ml-1.5 opacity-60">({summaryStats[f]})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-slate-400 text-sm">Chatler analiz ediliyor...</p>
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
            const initials = agent.agentName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
            const criticalCount = agent.evidencedIssues.filter(i => i.type === 'critical').length;
            const tab = getTab(agent.agentName);

            return (
              <div
                key={agent.agentName}
                className={`glass-effect rounded-xl border transition-all duration-300 ${
                  agent.urgency === 'high' ? 'border-rose-500/30 shadow-lg shadow-rose-500/5' :
                  agent.urgency === 'medium' ? 'border-amber-500/20' :
                  'border-slate-700/50'
                }`}
              >
                <div className="p-5 cursor-pointer select-none" onClick={() => toggleExpand(agent.agentName)}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      agent.urgency === 'high' ? 'bg-rose-500/20 text-rose-300 border-2 border-rose-500/40' :
                      agent.urgency === 'medium' ? 'bg-amber-500/20 text-amber-300 border-2 border-amber-500/40' :
                      'bg-cyan-500/20 text-cyan-300 border-2 border-cyan-500/30'
                    }`}>
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-base">{agent.agentName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${URGENCY_COLORS[agent.urgency]}`}>
                          {URGENCY_LABELS[agent.urgency]}
                        </span>
                        {isSentToday && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Görüsüldü
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
                        <span className={`font-bold text-sm ${SCORE_COLOR(agent.avgScore)}`}>
                          {agent.avgScore}
                          <span className="text-slate-500 font-normal">/100</span>
                        </span>
                        <span className="text-slate-600">|</span>
                        <span>{agent.totalChats} chat</span>
                        <TrendIcon trend={agent.trend} />
                        {criticalCount > 0 && (
                          <span className="text-rose-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {criticalCount} kritik hata
                          </span>
                        )}
                        {agent.requiresAttentionCount > 0 && (
                          <span className="text-amber-400 flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {agent.requiresAttentionCount} dikkat
                          </span>
                        )}
                        {agent.negativeSentimentCount > 0 && (
                          <span className="text-slate-400">{agent.negativeSentimentCount} olumsuz</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {agent.evidencedIssues.length > 0 && !isExpanded && (
                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/50 px-2.5 py-1 rounded-lg border border-slate-700/40">
                          <Repeat className="w-3 h-3" />
                          <span>{agent.evidencedIssues.length} sorun</span>
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
                  <div className="border-t border-slate-700/40">
                    <div className="flex border-b border-slate-700/40">
                      {([
                        { id: 'issues', label: 'Kanıtlı Sorunlar', icon: AlertTriangle, count: agent.evidencedIssues.length },
                        { id: 'script', label: 'Görüsme Metni', icon: FileText, count: null },
                        { id: 'actions', label: 'Aksiyon Planı', icon: ListChecks, count: agent.actionItems.length },
                      ] as const).map(t => (
                        <button
                          key={t.id}
                          onClick={() => setTab(agent.agentName, t.id)}
                          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all duration-200 ${
                            tab === t.id
                              ? 'border-cyan-500 text-cyan-300 bg-cyan-500/5'
                              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                          }`}
                        >
                          <t.icon className="w-3.5 h-3.5" />
                          {t.label}
                          {t.count !== null && t.count > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-400'}`}>
                              {t.count}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="p-5">
                      {tab === 'issues' && (
                        <div className="space-y-4">
                          {agent.evidencedIssues.length === 0 ? (
                            <div className="bg-emerald-950/20 rounded-lg border border-emerald-500/20 p-5 flex items-center gap-3">
                              <Star className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-emerald-300">Hata Tespit Edilmedi</p>
                                <p className="text-xs text-slate-400 mt-0.5">Bu personel seçili periyotta hata kaydetmedi. Performansını korumaya devam etmesi için teşvik edin.</p>
                              </div>
                            </div>
                          ) : (
                            <>
                              {agent.evidencedIssues.filter(i => i.type === 'critical').length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                                    <h4 className="text-sm font-semibold text-rose-300">Kritik Hatalar</h4>
                                    <div className="h-px flex-1 bg-rose-500/20" />
                                  </div>
                                  <div className="space-y-3">
                                    {agent.evidencedIssues.filter(i => i.type === 'critical').map((issue, idx) => {
                                      const issueKey = `${agent.agentName}-c-${idx}`;
                                      const isIssueExpanded = expandedIssues.has(issueKey);
                                      return (
                                        <div key={idx} className="bg-rose-950/20 rounded-lg border border-rose-500/20 overflow-hidden">
                                          <div
                                            className="p-4 cursor-pointer"
                                            onClick={() => toggleIssue(issueKey)}
                                          >
                                            <div className="flex items-start gap-3">
                                              <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <span className="text-rose-400 text-xs font-bold">{issue.count}</span>
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-rose-200">{issue.text}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{issue.count} chatta kanıtlandı</p>
                                              </div>
                                              <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-xs text-slate-500">{issue.evidences.length} kanıt</span>
                                                {isIssueExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                              </div>
                                            </div>
                                          </div>

                                          {isIssueExpanded && (
                                            <div className="border-t border-rose-500/20">
                                              <div className="p-4 space-y-3">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Kanıt Chatler</p>
                                                {issue.evidences.map((ev, evIdx) => (
                                                  <div key={evIdx} className="bg-slate-900/50 rounded-lg border border-slate-700/40 p-3">
                                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                                      <span className="flex items-center gap-1 text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                                                        <Hash className="w-3 h-3" />
                                                        {shortChatId(ev.chatId)}
                                                      </span>
                                                      <span className="text-xs text-slate-400">{formatDateTime(ev.date)}</span>
                                                      <span className="text-xs text-slate-400">Müsteri: {ev.customerName}</span>
                                                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${SCORE_BG(ev.score)}`}>
                                                        Skor: {ev.score}/100
                                                      </span>
                                                    </div>
                                                    {ev.aiSummary && (
                                                      <p className="text-xs text-slate-300 leading-relaxed mb-2 pl-2 border-l-2 border-slate-600">
                                                        "{ev.aiSummary.slice(0, 200)}{ev.aiSummary.length > 200 ? '...' : ''}"
                                                      </p>
                                                    )}
                                                    {ev.recommendation && (
                                                      <p className="text-xs text-amber-300/80 leading-relaxed">
                                                        <span className="font-medium text-amber-400">AI Önerisi:</span> {ev.recommendation.slice(0, 180)}{ev.recommendation.length > 180 ? '...' : ''}
                                                      </p>
                                                    )}
                                                  </div>
                                                ))}

                                                <div className="bg-cyan-950/30 rounded-lg border border-cyan-500/20 p-3">
                                                  <div className="flex items-start gap-2">
                                                    <Lightbulb className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                      <p className="text-xs font-semibold text-cyan-300 mb-1">Dogru Yaklasim</p>
                                                      <p className="text-xs text-slate-300 leading-relaxed">{issue.correctApproach}</p>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {agent.evidencedIssues.filter(i => i.type === 'improvement').length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <Target className="w-4 h-4 text-amber-400" />
                                    <h4 className="text-sm font-semibold text-amber-300">Gelistirme Alanlari</h4>
                                    <div className="h-px flex-1 bg-amber-500/20" />
                                  </div>
                                  <div className="space-y-3">
                                    {agent.evidencedIssues.filter(i => i.type === 'improvement').map((issue, idx) => {
                                      const issueKey = `${agent.agentName}-i-${idx}`;
                                      const isIssueExpanded = expandedIssues.has(issueKey);
                                      return (
                                        <div key={idx} className="bg-amber-950/10 rounded-lg border border-amber-500/15 overflow-hidden">
                                          <div className="p-4 cursor-pointer" onClick={() => toggleIssue(issueKey)}>
                                            <div className="flex items-start gap-3">
                                              <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <span className="text-amber-400 text-xs font-bold">{issue.count}</span>
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-amber-200">{issue.text}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{issue.count} chatta goruldu</p>
                                              </div>
                                              <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-xs text-slate-500">{issue.evidences.length} kanit</span>
                                                {isIssueExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                              </div>
                                            </div>
                                          </div>

                                          {isIssueExpanded && (
                                            <div className="border-t border-amber-500/15">
                                              <div className="p-4 space-y-3">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Örnek Chatler</p>
                                                {issue.evidences.slice(0, 3).map((ev, evIdx) => (
                                                  <div key={evIdx} className="bg-slate-900/50 rounded-lg border border-slate-700/40 p-3">
                                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                                      <span className="flex items-center gap-1 text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                                                        <Hash className="w-3 h-3" />
                                                        {shortChatId(ev.chatId)}
                                                      </span>
                                                      <span className="text-xs text-slate-400">{formatDateTime(ev.date)}</span>
                                                      <span className="text-xs text-slate-400">Müsteri: {ev.customerName}</span>
                                                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${SCORE_BG(ev.score)}`}>
                                                        {ev.score}/100
                                                      </span>
                                                    </div>
                                                    {ev.aiSummary && (
                                                      <p className="text-xs text-slate-400 leading-relaxed">
                                                        "{ev.aiSummary.slice(0, 160)}{ev.aiSummary.length > 160 ? '...' : ''}"
                                                      </p>
                                                    )}
                                                  </div>
                                                ))}
                                                <div className="bg-cyan-950/30 rounded-lg border border-cyan-500/20 p-3">
                                                  <div className="flex items-start gap-2">
                                                    <Lightbulb className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                      <p className="text-xs font-semibold text-cyan-300 mb-1">Onerim</p>
                                                      <p className="text-xs text-slate-300 leading-relaxed">{issue.correctApproach}</p>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {agent.lowestScoringChats.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <BarChart2 className="w-4 h-4 text-slate-400" />
                                    <h4 className="text-sm font-semibold text-slate-300">En Düşük Skorlu Chatler</h4>
                                    <div className="h-px flex-1 bg-slate-700/50" />
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {agent.lowestScoringChats.map((chat, idx) => (
                                      <div key={idx} className="bg-slate-800/40 rounded-lg border border-slate-700/40 p-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="flex items-center gap-1 text-xs font-mono text-cyan-400">
                                            <Hash className="w-3 h-3" />
                                            {shortChatId(chat.chatId)}
                                          </span>
                                          <span className={`text-sm font-bold ${SCORE_COLOR(chat.score)}`}>{chat.score}</span>
                                        </div>
                                        <p className="text-xs text-slate-400">{formatDate(chat.date)}</p>
                                        <p className="text-xs text-slate-500">Müsteri: {chat.customerName}</p>
                                        {chat.aiSummary && (
                                          <p className="text-xs text-slate-400 mt-2 leading-relaxed border-t border-slate-700/40 pt-2">
                                            {chat.aiSummary.slice(0, 100)}...
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {tab === 'script' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-slate-400">Kopyalayıp doğrudan görüşmede kullanabileceğiniz hazır metin</p>
                            <button
                              onClick={() => copyScript(agent.agentName, agent.coachingScript)}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200 border bg-slate-800/60 border-slate-700/50 hover:border-cyan-500/40 hover:text-cyan-300 text-slate-300"
                            >
                              {copiedAgent === agent.agentName ? (
                                <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Kopyalandi</span></>
                              ) : (
                                <><Copy className="w-3.5 h-3.5" /><span>Tümünü Kopyala</span></>
                              )}
                            </button>
                          </div>
                          <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed bg-slate-900/60 rounded-xl p-5 border border-slate-700/40 overflow-x-auto text-xs">
                            {agent.coachingScript}
                          </pre>
                        </div>
                      )}

                      {tab === 'actions' && (
                        <div className="space-y-4">
                          <p className="text-xs text-slate-400">Görüşme sonrası takip edilmesi gereken aksiyonlar</p>
                          <div className="space-y-2">
                            {agent.actionItems.map((item, idx) => (
                              <div key={idx} className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30 hover:border-cyan-500/20 transition-colors duration-200">
                                <div className="w-5 h-5 rounded border-2 border-slate-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm text-slate-200">{item}</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-slate-700/40">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Son aktivite: {formatDateTime(agent.lastActivityDate)}</span>
                            </div>
                            <button
                              onClick={() => markFeedbackSent(agent)}
                              disabled={sendingFeedback === agent.agentName || isSentToday}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                isSentToday
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30'
                              }`}
                            >
                              {sendingFeedback === agent.agentName ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : isSentToday ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                              {isSentToday ? 'Görüsme Yapildi Olarak Kaydedildi' : 'Görüsme Yapildi Olarak Kaydet'}
                            </button>
                          </div>
                        </div>
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

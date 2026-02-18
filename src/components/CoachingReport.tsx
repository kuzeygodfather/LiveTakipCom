import { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabase';
import {
  X, Download, Printer, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle, Star, Users, BarChart2, Target, Calendar, Clock,
  Award, MessageSquare, Repeat, Shield
} from 'lucide-react';
import BarChart from './BarChart';
import DonutChart from './DonutChart';
import TrendChart from './TrendChart';

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

interface ScoreBreakdown {
  kritik: number;
  dikkat: number;
  olumsuz: number;
  orta: number;
  iyi: number;
  mukemmel: number;
}

interface AgentCoachingData {
  agentName: string;
  avgScore: number;
  totalChats: number;
  negativeSentimentCount: number;
  requiresAttentionCount: number;
  scoreBreakdown: ScoreBreakdown;
  evidencedIssues: EvidencedIssue[];
  coachingScript: string;
  lastActivityDate: string;
  trend: 'up' | 'down' | 'stable';
  urgency: 'high' | 'medium' | 'low' | 'excellent';
  lowestScoringChats: ChatEvidence[];
  actionItems: string[];
}

interface CoachingFeedbackRecord {
  agent_name: string;
  sent_at: string;
  coaching_suggestion: string;
}

interface DailyStatRow {
  date: string;
  average_score: number;
  total_chats: number;
}

interface CoachingReportProps {
  coachingData: AgentCoachingData[];
  coachingHistory: Map<string, string>;
  dateRange: '1' | '7' | '30';
  onClose: () => void;
}

const URGENCY_COLORS: Record<string, string> = {
  high: '#f43f5e',
  medium: '#f59e0b',
  low: '#06b6d4',
  excellent: '#10b981',
};

const SCORE_COLOR = (s: number) => {
  if (s >= 90) return '#10b981';
  if (s >= 70) return '#06b6d4';
  if (s >= 60) return '#3b82f6';
  if (s >= 40) return '#f59e0b';
  if (s >= 30) return '#f97316';
  return '#f43f5e';
};

export default function CoachingReport({ coachingData, coachingHistory, dateRange, onClose }: CoachingReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [feedbackRecords, setFeedbackRecords] = useState<CoachingFeedbackRecord[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyStatRow[]>([]);
  const [exporting, setExporting] = useState(false);

  const reportDate = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  useEffect(() => {
    loadExtraData();
  }, []);

  const loadExtraData = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 29);

    const [feedbackRes, statsRes] = await Promise.all([
      supabase
        .from('coaching_feedbacks')
        .select('agent_name, sent_at, coaching_suggestion')
        .gte('sent_at', sevenDaysAgo.toISOString())
        .order('sent_at', { ascending: false })
        .limit(50),
      supabase
        .from('personnel_daily_stats')
        .select('date, average_score, total_chats')
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true }),
    ]);

    if (feedbackRes.data) setFeedbackRecords(feedbackRes.data);

    if (statsRes.data && statsRes.data.length > 0) {
      const byDate = new Map<string, { totalScore: number; count: number; chats: number }>();
      for (const row of statsRes.data) {
        const existing = byDate.get(row.date) || { totalScore: 0, count: 0, chats: 0 };
        existing.totalScore += Number(row.average_score);
        existing.count += 1;
        existing.chats += row.total_chats;
        byDate.set(row.date, existing);
      }
      const trend: DailyStatRow[] = [...byDate.entries()].map(([date, val]) => ({
        date,
        average_score: Math.round(val.totalScore / val.count),
        total_chats: val.chats,
      }));
      setDailyTrend(trend);
    }
  };

  const handlePrint = () => window.print();

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#0f172a',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      while (position + pageHeight < pdfHeight) {
        position += pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -position, pdfWidth, pdfHeight);
      }
      pdf.save(`koçluk-raporu-${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const totalChats = coachingData.reduce((s, a) => s + a.totalChats, 0);
  const avgScore = coachingData.length > 0
    ? Math.round(coachingData.reduce((s, a) => s + a.avgScore, 0) / coachingData.length)
    : 0;
  const todayStr = new Date().toDateString();
  const coachedToday = [...coachingHistory.values()].filter(d => new Date(d).toDateString() === todayStr).length;
  const urgentCount = coachingData.filter(a => a.urgency === 'high').length;
  const excellentCount = coachingData.filter(a => a.urgency === 'excellent').length;
  const improvingCount = coachingData.filter(a => a.trend === 'up').length;
  const decliningCount = coachingData.filter(a => a.trend === 'down').length;

  const scoreBreakdownTotal = coachingData.reduce(
    (acc, a) => {
      (Object.keys(a.scoreBreakdown) as (keyof ScoreBreakdown)[]).forEach(k => {
        acc[k] = (acc[k] || 0) + a.scoreBreakdown[k];
      });
      return acc;
    },
    {} as Record<keyof ScoreBreakdown, number>
  );

  const issueCounts = new Map<string, number>();
  coachingData.forEach(a => {
    a.evidencedIssues.forEach(issue => {
      issueCounts.set(issue.text, (issueCounts.get(issue.text) || 0) + issue.count);
    });
  });
  const topIssues = [...issueCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const agentScoreBarData = [...coachingData]
    .sort((a, b) => b.avgScore - a.avgScore)
    .map(a => ({
      label: a.agentName,
      value: a.avgScore,
      color: SCORE_COLOR(a.avgScore),
    }));

  const donutData = [
    { label: 'Mükemmel (90+)', value: scoreBreakdownTotal.mukemmel || 0, color: '#10b981' },
    { label: 'İyi (70-89)', value: scoreBreakdownTotal.iyi || 0, color: '#06b6d4' },
    { label: 'Orta (60-69)', value: scoreBreakdownTotal.orta || 0, color: '#3b82f6' },
    { label: 'Olumsuz (40-59)', value: scoreBreakdownTotal.olumsuz || 0, color: '#f59e0b' },
    { label: 'Dikkat (30-39)', value: scoreBreakdownTotal.dikkat || 0, color: '#f97316' },
    { label: 'Kritik (0-29)', value: scoreBreakdownTotal.kritik || 0, color: '#f43f5e' },
  ].filter(d => d.value > 0);

  const trendChartData = dailyTrend.slice(-14).map(row => ({
    label: new Date(row.date).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }),
    value: row.average_score,
  }));

  const attentionAgents = coachingData.filter(a => a.urgency === 'high');
  const coachingRepeatAgents = coachingData.filter(a => {
    const lastDate = coachingHistory.get(a.agentName);
    return lastDate && new Date(lastDate).toDateString() !== todayStr && a.evidencedIssues.length > 0;
  });

  const dateRangeLabel = dateRange === '1' ? 'Bugün' : `Son ${dateRange} Gün`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto print:static print:bg-white">
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-6 py-3 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Yönetici Koçluk Raporu</span>
          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{dateRangeLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            Yazdır
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-sm transition-all disabled:opacity-50"
          >
            {exporting ? (
              <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            PDF İndir
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={reportRef} className="max-w-5xl mx-auto px-6 py-8 space-y-8 print:px-8 print:py-6">
        <div className="text-center border-b border-slate-700/50 pb-6 print:border-slate-300">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-cyan-400 print:text-slate-600" />
            <h1 className="text-2xl font-bold text-white print:text-slate-900">Yönetici Koçluk Raporu</h1>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm text-slate-400 print:text-slate-500 mt-2">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{reportDate}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{dateRangeLabel} Verisi</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{coachingData.length} Personel</span>
          </div>
        </div>

        <section>
          <h2 className="text-base font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2 print:text-slate-700">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            Yönetici Özeti
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'Toplam Personel', value: coachingData.length, sub: `${totalChats} görüşme`, color: 'text-slate-300', border: 'border-slate-600/40' },
              { icon: Target, label: 'Ekip Ort. Puanı', value: avgScore, sub: avgScore >= 70 ? 'Hedef üzeri' : 'Hedef altı', color: avgScore >= 70 ? 'text-emerald-400' : 'text-amber-400', border: avgScore >= 70 ? 'border-emerald-500/30' : 'border-amber-500/30' },
              { icon: AlertTriangle, label: 'Acil Görüşme', value: urgentCount, sub: 'personel (ort.<60)', color: urgentCount > 0 ? 'text-rose-400' : 'text-slate-400', border: urgentCount > 0 ? 'border-rose-500/30' : 'border-slate-600/40' },
              { icon: CheckCircle, label: 'Bugün Görüşüldü', value: coachedToday, sub: `toplam ${coachingData.length} kişiden`, color: 'text-cyan-400', border: 'border-cyan-500/30' },
            ].map((item, i) => (
              <div key={i} className={`bg-slate-800/50 print:bg-slate-50 rounded-xl p-4 border ${item.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-xs text-slate-400 print:text-slate-600">{item.label}</span>
                </div>
                <div className={`text-3xl font-bold ${item.color}`}>{item.value}</div>
                <div className="text-xs text-slate-500 mt-1">{item.sub}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            {[
              { icon: TrendingUp, label: 'İyileşen', value: improvingCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { icon: TrendingDown, label: 'Gerileyen', value: decliningCount, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
              { icon: Star, label: 'Mükemmel Performans', value: excellentCount, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            ].map((item, i) => (
              <div key={i} className={`rounded-xl p-3 border ${item.bg} flex items-center gap-3`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
                <div>
                  <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                  <div className="text-xs text-slate-400 print:text-slate-600">{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800/40 print:bg-white print:shadow-sm rounded-xl p-5 border border-slate-700/40 print:border-slate-200">
            <BarChart
              data={agentScoreBarData}
              title="Personel Skor Sıralaması"
              height={Math.max(200, coachingData.length * 42)}
            />
          </div>
          <div className="bg-slate-800/40 print:bg-white print:shadow-sm rounded-xl p-5 border border-slate-700/40 print:border-slate-200">
            <DonutChart
              data={donutData}
              title="Görüşme Puan Dağılımı"
              centerText={String(totalChats)}
            />
          </div>
        </div>

        {trendChartData.length > 2 && (
          <div className="bg-slate-800/40 print:bg-white print:shadow-sm rounded-xl p-5 border border-slate-700/40 print:border-slate-200">
            <TrendChart
              data={trendChartData}
              title="Ekip Ortalama Skor Trendi (Son 30 Gün)"
              color="#06b6d4"
              height={180}
            />
          </div>
        )}

        <section>
          <h2 className="text-base font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2 print:text-slate-700">
            <Users className="w-4 h-4 text-cyan-400" />
            Personel Detay Tablosu
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-700/40 print:border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/80 print:bg-slate-100 text-slate-400 print:text-slate-600">
                  <th className="text-left px-4 py-3 font-medium">Personel</th>
                  <th className="text-center px-3 py-3 font-medium">Ort. Puan</th>
                  <th className="text-center px-3 py-3 font-medium">Görüşme</th>
                  <th className="text-center px-3 py-3 font-medium">Neg.</th>
                  <th className="text-center px-3 py-3 font-medium">Sorun</th>
                  <th className="text-center px-3 py-3 font-medium">Trend</th>
                  <th className="text-center px-3 py-3 font-medium">Öncelik</th>
                  <th className="text-center px-3 py-3 font-medium">Koçluk</th>
                </tr>
              </thead>
              <tbody>
                {coachingData.map((agent, i) => {
                  const lastDate = coachingHistory.get(agent.agentName);
                  const coached = lastDate ? new Date(lastDate).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) : '—';
                  const urgencyMap: Record<string, string> = { high: 'Acil', medium: 'Orta', low: 'İyi', excellent: 'Mükemmel' };
                  const urgencyColorClass: Record<string, string> = {
                    high: 'text-rose-400 bg-rose-500/10',
                    medium: 'text-amber-400 bg-amber-500/10',
                    low: 'text-cyan-400 bg-cyan-500/10',
                    excellent: 'text-emerald-400 bg-emerald-500/10',
                  };
                  return (
                    <tr key={agent.agentName} className={`border-t border-slate-700/30 print:border-slate-100 ${i % 2 === 0 ? 'bg-slate-800/20 print:bg-white' : 'bg-slate-800/40 print:bg-slate-50'}`}>
                      <td className="px-4 py-2.5 font-medium text-white print:text-slate-900">{agent.agentName}</td>
                      <td className="px-3 py-2.5 text-center font-bold" style={{ color: SCORE_COLOR(agent.avgScore) }}>{agent.avgScore}</td>
                      <td className="px-3 py-2.5 text-center text-slate-300 print:text-slate-600">{agent.totalChats}</td>
                      <td className="px-3 py-2.5 text-center text-rose-400">{agent.negativeSentimentCount}</td>
                      <td className="px-3 py-2.5 text-center text-amber-400">{agent.evidencedIssues.length}</td>
                      <td className="px-3 py-2.5 text-center">
                        {agent.trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-400 mx-auto" />}
                        {agent.trend === 'down' && <TrendingDown className="w-4 h-4 text-rose-400 mx-auto" />}
                        {agent.trend === 'stable' && <Minus className="w-4 h-4 text-slate-400 mx-auto" />}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgencyColorClass[agent.urgency]}`}>
                          {urgencyMap[agent.urgency]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs text-slate-400">{coached}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {attentionAgents.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2 print:text-slate-700">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Acil Görüşme Gereken Personel ({attentionAgents.length} kişi)
            </h2>
            <div className="space-y-3">
              {attentionAgents.map(agent => (
                <div key={agent.agentName} className="bg-rose-950/20 print:bg-red-50 rounded-xl p-4 border border-rose-500/20 print:border-red-200">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-white print:text-slate-900">{agent.agentName}</div>
                      <div className="text-xs text-slate-400 print:text-slate-500 mt-0.5">
                        Ort. Puan: <span className="text-rose-400 font-bold">{agent.avgScore}</span>
                        {' · '}{agent.totalChats} görüşme
                        {' · '}{agent.negativeSentimentCount} negatif
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-rose-400 font-medium">{agent.evidencedIssues.length} sorun tespit edildi</div>
                    </div>
                  </div>
                  {agent.evidencedIssues.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {agent.evidencedIssues.slice(0, 4).map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${issue.type === 'critical' ? 'bg-rose-400' : 'bg-amber-400'}`} />
                          <span className="text-slate-300 print:text-slate-600">{issue.text}</span>
                          <span className="text-slate-500 flex-shrink-0">{issue.count}x</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {coachingRepeatAgents.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2 print:text-slate-700">
              <Repeat className="w-4 h-4 text-amber-400" />
              Tekrarlayan Sorun — Önceden Görüşüldü, Sorunlar Devam Ediyor ({coachingRepeatAgents.length} kişi)
            </h2>
            <div className="overflow-x-auto rounded-xl border border-amber-500/20 print:border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-amber-950/20 print:bg-amber-50 text-amber-400 print:text-slate-600">
                    <th className="text-left px-4 py-3 font-medium">Personel</th>
                    <th className="text-center px-3 py-3 font-medium">Son Koçluk</th>
                    <th className="text-center px-3 py-3 font-medium">Güncel Puan</th>
                    <th className="text-left px-4 py-3 font-medium">Devam Eden Sorunlar</th>
                  </tr>
                </thead>
                <tbody>
                  {coachingRepeatAgents.map((agent, i) => {
                    const lastDate = coachingHistory.get(agent.agentName)!;
                    const diff = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={agent.agentName} className={`border-t border-amber-500/10 print:border-slate-100 ${i % 2 === 0 ? 'bg-slate-800/20' : 'bg-slate-800/40'}`}>
                        <td className="px-4 py-2.5 font-medium text-white print:text-slate-900">{agent.agentName}</td>
                        <td className="px-3 py-2.5 text-center text-amber-400">{diff === 0 ? 'Bugün' : diff === 1 ? 'Dün' : `${diff} gün önce`}</td>
                        <td className="px-3 py-2.5 text-center font-bold" style={{ color: SCORE_COLOR(agent.avgScore) }}>{agent.avgScore}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-300 print:text-slate-600">
                          {agent.evidencedIssues.slice(0, 2).map(i => i.text).join('; ')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {topIssues.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2 print:text-slate-700">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              En Sık Görülen Sorunlar
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-700/40 print:border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/80 print:bg-slate-100 text-slate-400 print:text-slate-600">
                    <th className="text-left px-4 py-3 font-medium">#</th>
                    <th className="text-left px-4 py-3 font-medium">Sorun</th>
                    <th className="text-center px-3 py-3 font-medium">Frekans</th>
                    <th className="text-left px-4 py-3 font-medium">Etkilenen Personel</th>
                  </tr>
                </thead>
                <tbody>
                  {topIssues.map(([issue, count], i) => {
                    const affected = coachingData.filter(a => a.evidencedIssues.some(ei => ei.text === issue)).map(a => a.agentName);
                    return (
                      <tr key={i} className={`border-t border-slate-700/30 print:border-slate-100 ${i % 2 === 0 ? 'bg-slate-800/20 print:bg-white' : 'bg-slate-800/40 print:bg-slate-50'}`}>
                        <td className="px-4 py-2.5 text-slate-500 font-mono">{i + 1}</td>
                        <td className="px-4 py-2.5 text-slate-200 print:text-slate-800">{issue}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-sm font-bold text-amber-400">{count}</span>
                          <span className="text-xs text-slate-500 ml-1">görünüm</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-400 print:text-slate-500">{affected.join(', ')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {feedbackRecords.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2 print:text-slate-700">
              <Award className="w-4 h-4 text-cyan-400" />
              Son Koçluk Aktiviteleri
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-700/40 print:border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/80 print:bg-slate-100 text-slate-400 print:text-slate-600">
                    <th className="text-left px-4 py-3 font-medium">Personel</th>
                    <th className="text-left px-3 py-3 font-medium">Tarih</th>
                    <th className="text-left px-4 py-3 font-medium">Konu</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbackRecords.slice(0, 15).map((fb, i) => (
                    <tr key={i} className={`border-t border-slate-700/30 print:border-slate-100 ${i % 2 === 0 ? 'bg-slate-800/20 print:bg-white' : 'bg-slate-800/40 print:bg-slate-50'}`}>
                      <td className="px-4 py-2.5 font-medium text-white print:text-slate-900">{fb.agent_name}</td>
                      <td className="px-3 py-2.5 text-slate-400 print:text-slate-500 whitespace-nowrap">
                        {new Date(fb.sent_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-300 print:text-slate-600 max-w-xs truncate">{fb.coaching_suggestion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-base font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2 print:text-slate-700">
            <Star className="w-4 h-4 text-emerald-400" />
            Yönetici Değerlendirmesi & Öneriler
          </h2>
          <div className="bg-slate-800/40 print:bg-slate-50 rounded-xl p-5 border border-slate-700/40 print:border-slate-200 space-y-4">
            <div>
              <div className="text-sm font-semibold text-white print:text-slate-900 mb-1">Genel Durum</div>
              <p className="text-sm text-slate-300 print:text-slate-600">
                {dateRangeLabel} itibarıyla {coachingData.length} personelin ekip ortalama puanı <strong className="text-white print:text-slate-900">{avgScore}</strong> olarak hesaplanmıştır.
                {avgScore >= 80 ? ' Ekip genel olarak hedef üzerinde performans göstermektedir.' :
                  avgScore >= 70 ? ' Ekip hedef seviyesindedir ancak iyileşme için alan mevcuttur.' :
                  ' Ekip performansı hedeflerin altında olup acil aksiyonlar gerekmektedir.'}
              </p>
            </div>
            {urgentCount > 0 && (
              <div>
                <div className="text-sm font-semibold text-rose-400 mb-1">Kritik Aksiyonlar</div>
                <p className="text-sm text-slate-300 print:text-slate-600">
                  {urgentCount} personel acil görüşme gerektirmektedir. Bu personellerle bireysel bire bir görüşme planlanması önerilmektedir.
                  {coachingRepeatAgents.length > 0 && ` ${coachingRepeatAgents.length} personelde önceki görüşmelere rağmen sorunlar devam etmektedir — daha yapılandırılmış bir koçluk planı değerlendirilebilir.`}
                </p>
              </div>
            )}
            {topIssues.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-amber-400 mb-1">Sistemik Sorunlar</div>
                <p className="text-sm text-slate-300 print:text-slate-600">
                  En sık görülen sorun "<strong className="text-white print:text-slate-900">{topIssues[0][0]}</strong>" ({topIssues[0][1]} görünüm) olup bu durum bireysel bir sorun değil, ekip genelinde yapısal bir eğitim ihtiyacına işaret etmektedir.
                  Ekip toplantısı veya grup eğitimi organize edilmesi tavsiye edilir.
                </p>
              </div>
            )}
            {excellentCount > 0 && (
              <div>
                <div className="text-sm font-semibold text-emerald-400 mb-1">Güçlü Yönler</div>
                <p className="text-sm text-slate-300 print:text-slate-600">
                  {excellentCount} personel mükemmel performans sergilemektedir.
                  {' '}{coachingData.filter(a => a.urgency === 'excellent').map(a => a.agentName).join(', ')} ekip içinde mentor olarak görevlendirilebilir.
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="text-center text-xs text-slate-600 print:text-slate-400 border-t border-slate-700/30 pt-4">
          Bu rapor {reportDate} tarihinde otomatik olarak oluşturulmuştur.
          Veriler {dateRangeLabel.toLowerCase()} dönemine ait chat analiz sonuçlarından derlenmiştir.
        </div>
      </div>
    </div>
  );
}

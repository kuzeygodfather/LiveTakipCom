import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, TrendingUp, TrendingDown, BarChart } from 'lucide-react';

interface ReportData {
  daily: any[];
  weekly: any[];
  monthly: any[];
  topPerformers: any[];
  needsImprovement: any[];
}

export default function Reports() {
  const [reportData, setReportData] = useState<ReportData>({
    daily: [],
    weekly: [],
    monthly: [],
    topPerformers: [],
    needsImprovement: [],
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    loadReportData();
  }, []);

  const parseScore = (score: number | string): number => {
    if (typeof score === 'string') {
      const parsed = parseFloat(score);
      return isNaN(parsed) ? 0 : parsed;
    }
    return score;
  };

  const getTierLabel = (tier: string) => {
    switch(tier) {
      case 'A': return 'En Güvenilir';
      case 'B': return 'Güvenilir';
      case 'C': return 'Orta Güvenilir';
      case 'D': return 'Düşük Güvenilir';
      default: return tier;
    }
  };

  const loadReportData = async () => {
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

      let personnelData: any[] = [];
      from = 0;

      while (true) {
        const { data: batch } = await supabase
          .from('personnel')
          .select('*')
          .neq('name', 'Unknown')
          .order('statistical_score', { ascending: false })
          .range(from, from + batchSize - 1);

        if (!batch || batch.length === 0) break;
        personnelData = [...personnelData, ...batch];
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      const topPerformers = personnelData?.slice(0, 5) || [];
      const needsImprovement = personnelData?.filter(p => parseScore(p.average_score) < 60) || [];

      setReportData({
        daily: allData || [],
        weekly: allData || [],
        monthly: allData || [],
        topPerformers,
        needsImprovement,
      });
    } catch (error) {
      console.error('Error loading report data:', error);
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
          totalChats: 0,
          totalScore: 0,
          count: 0,
          avgResponseTime: 0,
          responseTimeCount: 0,
        };
      }
      acc[groupKey].totalChats += curr.total_chats;
      acc[groupKey].totalScore += parseScore(curr.average_score) * curr.total_chats;
      acc[groupKey].count += curr.total_chats;
      if (curr.average_response_time > 0) {
        acc[groupKey].avgResponseTime += curr.average_response_time;
        acc[groupKey].responseTimeCount++;
      }
      return acc;
    }, {});

    return Object.values(grouped).map((item: any) => ({
      date: item.date,
      totalChats: item.totalChats,
      averageScore: item.count > 0 ? Math.round(item.totalScore / item.count) : 0,
      avgResponseTime: item.responseTimeCount > 0 ? Math.round(item.avgResponseTime / item.responseTimeCount) : 0,
    })).sort((a: any, b: any) => b.date.localeCompare(a.date));
  };

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
                  <div className="flex-1 grid grid-cols-3 gap-2 sm:gap-4">
                    <div>
                      <div className="text-xs text-slate-600 mb-0.5">Chat</div>
                      <div className="text-base sm:text-lg font-bold text-slate-900">{item.totalChats}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-600 mb-0.5">Skor</div>
                      <div className={`text-base sm:text-lg font-bold ${
                        item.averageScore >= 80 ? 'text-green-600' :
                        item.averageScore >= 50 ? 'text-slate-600' : 'text-red-600'
                      }`}>
                        {item.averageScore}/100
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-600 mb-0.5">Yanit</div>
                      <div className="text-base sm:text-lg font-bold text-slate-900">{item.avgResponseTime}s</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-slate-900">En İyi Performans</h2>
          </div>

          {reportData.topPerformers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Henüz veri yok</div>
          ) : (
            <div className="space-y-3">
              {reportData.topPerformers.map((person, index) => (
                <div key={person.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{person.name}</div>
                      <div className="text-sm text-slate-600">
                        {person.total_chats} chat • {getTierLabel(person.reliability_tier)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(parseScore(person.statistical_score || person.average_score))}
                    </div>
                    <div className="text-xs text-slate-500">
                      ham: {Math.round(parseScore(person.average_score))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingDown className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-slate-900">Gelişmesi Gerekenler</h2>
          </div>

          {reportData.needsImprovement.length === 0 ? (
            <div className="text-center py-8 text-green-600">
              Tüm personel iyi performans gösteriyor!
            </div>
          ) : (
            <div className="space-y-3">
              {reportData.needsImprovement.map((person) => (
                <div key={person.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <div className="font-semibold text-slate-900">{person.name}</div>
                    <div className="text-sm text-slate-600">
                      {person.total_chats} chat • {person.warning_count} uyarı • {getTierLabel(person.reliability_tier)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">
                      {Math.round(parseScore(person.statistical_score || person.average_score))}
                    </div>
                    <div className="text-xs text-slate-500">
                      ham: {Math.round(parseScore(person.average_score))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

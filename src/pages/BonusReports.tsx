import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calculator, Calendar, TrendingUp, Users, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

interface BonusCalculation {
  id: string;
  personnel_id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  total_bonus_amount: number;
  calculation_details: Array<{
    rule_id: string;
    rule_name: string;
    metric_type: string;
    metric_value: number;
    bonus_amount: number;
  }>;
  metrics_snapshot: {
    personnel_name: string;
    total_chats: number;
    avg_score: number;
    avg_satisfaction: number;
    avg_response_time: number;
    positive_chats_count: number;
    negative_chats_count: number;
    neutral_chats_count: number;
  };
  calculated_at: string;
}

export default function BonusReports() {
  const [calculations, setCalculations] = useState<BonusCalculation[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [periodType, setPeriodType] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDayDate = new Date(year, month + 1, 0);
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

    setStartDate(firstDay);
    setEndDate(lastDay);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchCalculations();
    }
  }, [periodType, startDate, endDate]);

  const fetchCalculations = async () => {
    setLoading(true);

    let allData: any[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      const { data: batch, error } = await supabase
        .from('bonus_calculations')
        .select('*')
        .eq('period_type', periodType)
        .gte('period_start', `${startDate}T00:00:00.000Z`)
        .lte('period_end', `${endDate}T23:59:59.999Z`)
        .order('calculated_at', { ascending: false })
        .range(from, from + batchSize - 1);

      if (error) break;
      if (!batch || batch.length === 0) break;
      allData = [...allData, ...batch];
      if (batch.length < batchSize) break;
      from += batchSize;
    }

    const latestByPersonnel = new Map<string, BonusCalculation>();
    for (const calc of allData) {
      if (!latestByPersonnel.has(calc.personnel_id)) {
        latestByPersonnel.set(calc.personnel_id, calc);
      }
    }

    const uniqueCalculations = Array.from(latestByPersonnel.values());
    uniqueCalculations.sort((a, b) => b.total_bonus_amount - a.total_bonus_amount);

    setCalculations(uniqueCalculations);
    setLoading(false);
  };

  const calculateBonuses = async () => {
    setCalculating(true);

    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-bonuses`;

    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period_type: periodType,
          period_start: `${startDate}T00:00:00.000Z`,
          period_end: `${endDate}T23:59:59.999Z`,
        }),
      });

      if (response.ok) {
        await fetchCalculations();
      } else {
        console.error('Bonus calculation failed');
      }
    } catch (error) {
      console.error('Error calculating bonuses:', error);
    } finally {
      setCalculating(false);
    }
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const totalBonuses = calculations.reduce((sum, calc) => sum + calc.total_bonus_amount, 0);
  const avgBonus = calculations.length > 0 ? totalBonuses / calculations.length : 0;

  const metricLabels: { [key: string]: string } = {
    total_chats: 'Toplam Chat',
    avg_score: 'Ortalama Skor',
    avg_satisfaction: 'Müşteri Memnuniyeti',
    avg_response_time: 'Yanıt Süresi',
    positive_chats_count: 'Pozitif Chat',
    negative_chats_count: 'Negatif Chat',
    neutral_chats_count: 'Nötr Chat',
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Prim Raporlari</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">Personel prim hesaplamalarini goruntuleyin ve yeni hesaplamalar yapin</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-green-100 text-xs sm:text-sm font-medium">Toplam Prim</p>
              <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2 truncate">{totalBonuses.toLocaleString('tr-TR')} TL</p>
            </div>
            <DollarSign className="w-8 h-8 sm:w-12 sm:h-12 text-green-200 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-blue-100 text-xs sm:text-sm font-medium">Ort. Prim</p>
              <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2 truncate">{avgBonus.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</p>
            </div>
            <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 text-blue-200 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg shadow-lg p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-slate-300 text-xs sm:text-sm font-medium">Personel</p>
              <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{calculations.length}</p>
            </div>
            <Users className="w-8 h-8 sm:w-12 sm:h-12 text-slate-400 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-orange-100 text-xs sm:text-sm font-medium">En Yuksek</p>
              <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2 truncate">
                {calculations.length > 0 ? calculations[0].total_bonus_amount.toLocaleString('tr-TR') : '0'} TL
              </p>
            </div>
            <Calculator className="w-8 h-8 sm:w-12 sm:h-12 text-orange-200 flex-shrink-0" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
        <h2 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Hesaplama Parametreleri
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Periyot Tipi
            </label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="daily">Günlük</option>
              <option value="weekly">Haftalık</option>
              <option value="monthly">Aylık</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={calculateBonuses}
              disabled={calculating || !startDate || !endDate}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Calculator className="w-5 h-5" />
              {calculating ? 'Hesaplanıyor...' : 'Primleri Hesapla'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Yükleniyor...</div>
          </div>
        ) : calculations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Calculator className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg">Bu dönem için hesaplanmış prim bulunamadı</p>
            <p className="text-sm mt-2">Yukarıdaki parametreleri ayarlayıp "Primleri Hesapla" butonuna tıklayın</p>
          </div>
        ) : (
          <>
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Prim</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kural</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chat</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {calculations.map((calc) => (
                  <React.Fragment key={calc.id}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRow(calc.id)}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button className="text-gray-400 hover:text-gray-600">
                          {expandedRows.has(calc.id) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {calc.metrics_snapshot?.personnel_name || 'Bilinmiyor'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-green-600 flex items-center">
                          {calc.total_bonus_amount.toLocaleString('tr-TR')} TL
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {calc.calculation_details?.length || 0} kural
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{calc.metrics_snapshot?.total_chats || 0}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{calc.metrics_snapshot?.avg_score?.toFixed(1) || '0.0'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(calc.calculated_at).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                      </td>
                    </tr>
                    {expandedRows.has(calc.id) && (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 bg-gray-50">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3">Uygulanan Kurallar:</h4>
                              {calc.calculation_details && calc.calculation_details.length > 0 ? (
                                <div className="space-y-2">
                                  {calc.calculation_details.map((detail, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                                      <div>
                                        <p className="font-medium text-gray-900 text-sm">{detail.rule_name}</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                          {metricLabels[detail.metric_type]}: {detail.metric_value.toFixed(2)}
                                        </p>
                                      </div>
                                      <p className={`text-base font-bold ${detail.bonus_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {detail.bonus_amount >= 0 ? '+' : ''}{detail.bonus_amount.toLocaleString('tr-TR')} TL
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-500 text-sm">Hicbir kural uygulanmadi</p>
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3">Performans Metrikleri:</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500">Toplam Chat</p>
                                  <p className="text-lg font-semibold text-gray-900">{calc.metrics_snapshot?.total_chats || 0}</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500">Ort. Skor</p>
                                  <p className="text-lg font-semibold text-gray-900">{calc.metrics_snapshot?.avg_score?.toFixed(1) || '0.0'}</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500">Memnuniyet</p>
                                  <p className="text-lg font-semibold text-gray-900">{calc.metrics_snapshot?.avg_satisfaction?.toFixed(1) || '0.0'}</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs text-gray-500">Yanit Suresi</p>
                                  <p className="text-lg font-semibold text-gray-900">{calc.metrics_snapshot?.avg_response_time?.toFixed(0) || '0'}s</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden space-y-3 p-4">
            {calculations.map((calc) => (
              <div key={calc.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleRow(calc.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">{calc.metrics_snapshot?.personnel_name || 'Bilinmiyor'}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-bold text-green-600">{calc.total_bonus_amount.toLocaleString('tr-TR')} TL</span>
                      <span className="text-xs text-gray-500">{calc.metrics_snapshot?.total_chats || 0} chat</span>
                      <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-800">{calc.calculation_details?.length || 0} kural</span>
                    </div>
                  </div>
                  {expandedRows.has(calc.id) ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                </div>
                {expandedRows.has(calc.id) && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
                    {calc.calculation_details && calc.calculation_details.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2 text-sm">Kurallar:</h4>
                        {calc.calculation_details.map((detail, idx) => (
                          <div key={idx} className="flex justify-between py-1 text-sm">
                            <span className="text-gray-700">{detail.rule_name}</span>
                            <span className={`font-bold ${detail.bonus_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {detail.bonus_amount >= 0 ? '+' : ''}{detail.bonus_amount.toLocaleString('tr-TR')} TL
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white p-2 rounded border border-gray-200">
                        <p className="text-xs text-gray-500">Skor</p>
                        <p className="text-sm font-semibold">{calc.metrics_snapshot?.avg_score?.toFixed(1) || '0.0'}</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-gray-200">
                        <p className="text-xs text-gray-500">Yanit</p>
                        <p className="text-sm font-semibold">{calc.metrics_snapshot?.avg_response_time?.toFixed(0) || '0'}s</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
}

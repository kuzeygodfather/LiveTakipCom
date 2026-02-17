import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Calculator, Calendar, TrendingUp, Users, DollarSign, ChevronDown, ChevronUp, Save, History, Download, X, FileText } from 'lucide-react';
import { useNotification } from '../lib/notifications';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  const { showSuccess, showError } = useNotification();
  const [calculations, setCalculations] = useState<BonusCalculation[]>([]);
  const [savedReports, setSavedReports] = useState<BonusCalculation[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [periodType, setPeriodType] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState<'preview' | 'saved'>('preview');
  const [selectedRecord, setSelectedRecord] = useState<BonusCalculation | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

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
      if (viewMode === 'preview') {
        fetchCalculations();
      } else {
        fetchSavedReports();
      }
    }
  }, [periodType, startDate, endDate, viewMode]);

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
          save_to_db: false,
        }),
      });

      if (response.ok) {
        await fetchCalculations();
        showSuccess('Primler başarıyla hesaplandı');
      } else {
        showError('Prim hesaplama başarısız oldu');
      }
    } catch (error) {
      console.error('Error calculating bonuses:', error);
      showError('Prim hesaplama sırasında hata oluştu');
    } finally {
      setCalculating(false);
    }
  };

  const saveBonusReport = async () => {
    if (calculations.length === 0) {
      showError('Kaydedilecek prim hesaplaması bulunamadı');
      return;
    }

    setSaving(true);

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
          save_to_db: true,
        }),
      });

      if (response.ok) {
        showSuccess('Prim raporu başarıyla kaydedildi');
        setViewMode('saved');
      } else {
        showError('Rapor kaydetme başarısız oldu');
      }
    } catch (error) {
      console.error('Error saving bonus report:', error);
      showError('Rapor kaydetme sırasında hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const fetchSavedReports = async () => {
    setLoading(true);

    let allData: any[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      const { data: batch, error } = await supabase
        .from('bonus_records')
        .select('*')
        .eq('period_type', periodType)
        .gte('period_start', `${startDate}T00:00:00.000Z`)
        .lte('period_end', `${endDate}T23:59:59.999Z`)
        .order('saved_at', { ascending: false })
        .range(from, from + batchSize - 1);

      if (error) break;
      if (!batch || batch.length === 0) break;
      allData = [...allData, ...batch];
      if (batch.length < batchSize) break;
      from += batchSize;
    }

    const latestByPersonnel = new Map<string, any>();
    for (const record of allData) {
      if (!latestByPersonnel.has(record.personnel_id)) {
        latestByPersonnel.set(record.personnel_id, {
          ...record,
          calculated_at: record.saved_at
        });
      }
    }

    const uniqueRecords = Array.from(latestByPersonnel.values());
    uniqueRecords.sort((a, b) => b.total_bonus_amount - a.total_bonus_amount);

    setSavedReports(uniqueRecords);
    setLoading(false);
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

  const handlePersonnelClick = (record: BonusCalculation, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRecord(record);
  };

  const closeModal = () => {
    setSelectedRecord(null);
  };

  const closePeriodView = () => {
    setSelectedPeriod(null);
  };

  const exportToPDF = async () => {
    if (!modalContentRef.current || !selectedRecord) return;

    setExportingPDF(true);
    try {
      const canvas = await html2canvas(modalContentRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Prim_Raporu_${selectedRecord.metrics_snapshot?.personnel_name}_${new Date(selectedRecord.calculated_at).toLocaleDateString('tr-TR')}.pdf`;
      pdf.save(fileName);
      showSuccess('PDF başarıyla indirildi');
    } catch (error) {
      console.error('PDF export error:', error);
      showError('PDF oluşturulurken hata oluştu');
    } finally {
      setExportingPDF(false);
    }
  };

  const displayData = viewMode === 'preview' ? calculations : savedReports;

  const groupByPeriod = (data: BonusCalculation[]) => {
    const grouped = new Map<string, BonusCalculation[]>();

    data.forEach(calc => {
      const date = new Date(calc.period_start);
      const periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!grouped.has(periodKey)) {
        grouped.set(periodKey, []);
      }
      grouped.get(periodKey)!.push(calc);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([period, records]) => ({
        period,
        records,
        totalBonus: records.reduce((sum, r) => sum + r.total_bonus_amount, 0),
        personnelCount: records.length,
        avgBonus: records.reduce((sum, r) => sum + r.total_bonus_amount, 0) / records.length,
      }));
  };

  const periodGroups = groupByPeriod(displayData);
  const totalBonuses = displayData.reduce((sum, calc) => sum + calc.total_bonus_amount, 0);
  const avgBonus = displayData.length > 0 ? totalBonuses / displayData.length : 0;

  const metricLabels: { [key: string]: string } = {
    total_chats: 'Toplam Chat',
    avg_score: 'Ortalama Skor',
    avg_satisfaction: 'Müşteri Memnuniyeti',
    avg_response_time: 'Yanıt Süresi',
    positive_chats_count: 'Pozitif Chat',
    negative_chats_count: 'Negatif Chat',
    neutral_chats_count: 'Nötr Chat',
  };

  const getPeriodLabel = (periodKey: string) => {
    const [year, month] = periodKey.split('-');
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const selectedPeriodData = selectedPeriod
    ? periodGroups.find(g => g.period === selectedPeriod)?.records || []
    : [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Prim Raporlari</h1>
        <p className="text-sm sm:text-base text-slate-200 mt-2">Personel prim hesaplamalarini goruntuleyin ve yeni hesaplamalar yapin</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-2 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('preview')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              viewMode === 'preview'
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Calculator className="w-5 h-5" />
            Prim Hesaplama (Önizleme)
          </button>
          <button
            onClick={() => setViewMode('saved')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              viewMode === 'saved'
                ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-md'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <History className="w-5 h-5" />
            Kayıtlı Raporlar
          </button>
        </div>
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
              <p className="text-slate-200 text-xs sm:text-sm font-medium">Personel</p>
              <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{displayData.length}</p>
            </div>
            <Users className="w-8 h-8 sm:w-12 sm:h-12 text-slate-200 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-orange-100 text-xs sm:text-sm font-medium">En Yuksek</p>
              <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2 truncate">
                {displayData.length > 0 ? displayData[0].total_bonus_amount.toLocaleString('tr-TR') : '0'} TL
              </p>
            </div>
            <Calculator className="w-8 h-8 sm:w-12 sm:h-12 text-orange-200 flex-shrink-0" />
          </div>
        </div>
      </div>

      {viewMode === 'preview' && (

      <div className="glass-effect rounded-lg shadow-lg p-4 sm:p-6 mb-6">
        <h2 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Hesaplama Parametreleri
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
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
            <label className="block text-sm font-medium text-slate-200 mb-2">
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
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-end gap-2 col-span-1 sm:col-span-2 md:col-span-1">
            <button
              onClick={calculateBonuses}
              disabled={calculating || !startDate || !endDate}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Calculator className="w-5 h-5" />
              {calculating ? 'Hesaplanıyor...' : 'Hesapla'}
            </button>
            <button
              onClick={saveBonusReport}
              disabled={saving || calculating || calculations.length === 0}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
      )}

      {!selectedPeriod ? (
        <div>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-600">Yükleniyor...</div>
            </div>
          ) : periodGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-white rounded-lg shadow-md">
              {viewMode === 'preview' ? <Calculator className="w-16 h-16 mb-4 text-slate-100" /> : <History className="w-16 h-16 mb-4 text-slate-100" />}
              <p className="text-lg">
                {viewMode === 'preview'
                  ? 'Bu dönem için hesaplanmış prim bulunamadı'
                  : 'Bu dönem için kayıtlı rapor bulunamadı'}
              </p>
              {viewMode === 'preview' && (
                <p className="text-sm mt-2">Yukarıdaki parametreleri ayarlayıp "Hesapla" butonuna tıklayın</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {periodGroups.map((group) => (
                <div
                  key={group.period}
                  onClick={() => setSelectedPeriod(group.period)}
                  className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-blue-500 p-6 transform hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {getPeriodLabel(group.period)}
                      </h3>
                      <p className="text-sm text-gray-500">{group.personnelCount} Personel</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                      <p className="text-xs font-medium text-green-700 mb-1">Toplam Prim</p>
                      <p className="text-2xl font-bold text-green-900">
                        {group.totalBonus.toLocaleString('tr-TR')} TL
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                      <p className="text-xs font-medium text-blue-700 mb-1">Ortalama Prim</p>
                      <p className="text-xl font-bold text-blue-900">
                        {group.avgBonus.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">Detayları Görüntüle</span>
                    <ChevronDown className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="glass-effect rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">{getPeriodLabel(selectedPeriod)}</h2>
                <p className="text-blue-100">
                  {selectedPeriodData.length} Personel - Toplam: {selectedPeriodData.reduce((sum, r) => sum + r.total_bonus_amount, 0).toLocaleString('tr-TR')} TL
                </p>
              </div>
              <button
                onClick={closePeriodView}
                className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors flex items-center gap-2"
              >
                <X className="w-5 h-5" />
                Kapat
              </button>
            </div>
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personel</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Prim</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chat</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skor</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kural</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedPeriodData.map((calc) => (
                  <tr key={calc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          {calc.metrics_snapshot?.personnel_name?.charAt(0) || '?'}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-white">{calc.metrics_snapshot?.personnel_name || 'Bilinmiyor'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-lg font-bold ${calc.total_bonus_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {calc.total_bonus_amount >= 0 ? '+' : ''}{calc.total_bonus_amount.toLocaleString('tr-TR')} TL
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {calc.metrics_snapshot?.total_chats || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                        {calc.metrics_snapshot?.avg_score?.toFixed(1) || '0.0'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-slate-200">
                        {calc.calculation_details?.length || 0} kural
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => handlePersonnelClick(calc, e)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Detay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden p-4 space-y-3">
            {selectedPeriodData.map((calc) => (
              <div
                key={calc.id}
                className="bg-gradient-to-r from-white to-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {calc.metrics_snapshot?.personnel_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-bold text-white">{calc.metrics_snapshot?.personnel_name || 'Bilinmiyor'}</p>
                      <p className="text-sm text-gray-500">{calc.metrics_snapshot?.total_chats || 0} chat</p>
                    </div>
                  </div>
                  <span className={`text-lg font-bold ${calc.total_bonus_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {calc.total_bonus_amount >= 0 ? '+' : ''}{calc.total_bonus_amount.toLocaleString('tr-TR')} TL
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                    Skor: {calc.metrics_snapshot?.avg_score?.toFixed(1) || '0.0'}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-slate-200">
                    {calc.calculation_details?.length || 0} kural
                  </span>
                </div>
                <button
                  onClick={(e) => handlePersonnelClick(calc, e)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Detayları Görüntüle
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div ref={modalContentRef} className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6 border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Prim Detay Raporu</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(selectedRecord.calculated_at).toLocaleDateString('tr-TR', {
                        timeZone: 'Europe/Istanbul',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="text-slate-200 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6 bg-gradient-to-r from-slate-50 to-slate-100 p-6 rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Personel</p>
                    <p className="text-xl font-bold text-white">{selectedRecord.metrics_snapshot?.personnel_name || 'Bilinmiyor'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Toplam Prim</p>
                    <p className={`text-2xl font-bold ${selectedRecord.total_bonus_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedRecord.total_bonus_amount >= 0 ? '+' : ''}{selectedRecord.total_bonus_amount.toLocaleString('tr-TR')} TL
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Dönem Tipi</p>
                    <p className="text-lg font-semibold text-white capitalize">{selectedRecord.period_type === 'monthly' ? 'Aylık' : selectedRecord.period_type === 'weekly' ? 'Haftalık' : 'Günlük'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Dönem</p>
                    <p className="text-sm font-medium text-white">
                      {new Date(selectedRecord.period_start).toLocaleDateString('tr-TR')} - {new Date(selectedRecord.period_end).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Performans Metrikleri
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <p className="text-xs font-medium text-blue-700 mb-1">Toplam Chat</p>
                    <p className="text-2xl font-bold text-blue-900">{selectedRecord.metrics_snapshot?.total_chats || 0}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                    <p className="text-xs font-medium text-green-700 mb-1">Ortalama Skor</p>
                    <p className="text-2xl font-bold text-green-900">{selectedRecord.metrics_snapshot?.avg_score?.toFixed(1) || '0.0'}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                    <p className="text-xs font-medium text-purple-700 mb-1">Memnuniyet</p>
                    <p className="text-2xl font-bold text-purple-900">{selectedRecord.metrics_snapshot?.avg_satisfaction?.toFixed(1) || '0.0'}%</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                    <p className="text-xs font-medium text-orange-700 mb-1">Yanıt Süresi</p>
                    <p className="text-2xl font-bold text-orange-900">{selectedRecord.metrics_snapshot?.avg_response_time?.toFixed(0) || '0'}s</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
                    <p className="text-xs font-medium text-emerald-700 mb-1">Pozitif Chat</p>
                    <p className="text-2xl font-bold text-emerald-900">{selectedRecord.metrics_snapshot?.positive_chats_count || 0}</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                    <p className="text-xs font-medium text-red-700 mb-1">Negatif Chat</p>
                    <p className="text-2xl font-bold text-red-900">{selectedRecord.metrics_snapshot?.negative_chats_count || 0}</p>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-slate-200 mb-1">Nötr Chat</p>
                    <p className="text-2xl font-bold text-white">{selectedRecord.metrics_snapshot?.neutral_chats_count || 0}</p>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-lg border border-cyan-200">
                    <p className="text-xs font-medium text-cyan-700 mb-1">Uygulanan Kural</p>
                    <p className="text-2xl font-bold text-cyan-900">{selectedRecord.calculation_details?.length || 0}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-green-600" />
                  Uygulanan Prim Kuralları
                </h3>
                {selectedRecord.calculation_details && selectedRecord.calculation_details.length > 0 ? (
                  <div className="space-y-3">
                    {selectedRecord.calculation_details.map((detail, idx) => (
                      <div key={idx} className="bg-gradient-to-r from-white to-gray-50 p-4 rounded-xl border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-white text-base mb-2">{detail.rule_name}</p>
                            <div className="flex flex-wrap gap-3 text-sm">
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                                {metricLabels[detail.metric_type]}
                              </span>
                              <span className="px-3 py-1 bg-gray-100 text-slate-200 rounded-full font-medium">
                                Değer: {detail.metric_value.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className={`text-2xl font-bold ${detail.bonus_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {detail.bonus_amount >= 0 ? '+' : ''}{detail.bonus_amount.toLocaleString('tr-TR')} TL
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <Calculator className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                    <p className="text-gray-500">Hiçbir prim kuralı uygulanmadı</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={exportToPDF}
                  disabled={exportingPDF}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                >
                  <Download className="w-5 h-5" />
                  {exportingPDF ? 'PDF Oluşturuluyor...' : 'PDF Olarak İndir'}
                </button>
                <button
                  onClick={closeModal}
                  className="px-6 py-3 bg-gray-200 text-slate-200 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

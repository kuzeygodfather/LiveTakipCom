import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, Play, RefreshCw, Send, CheckCircle, XCircle, Clock, Zap, ChevronDown } from 'lucide-react';

interface PipelineResult {
  success: boolean;
  synced?: number;
  new_chats?: number;
  analyzed?: number;
  alerts_sent?: number;
  skipped?: number;
  total_chats?: number;
  total_analyzed?: number;
  timestamp?: string;
  error?: string;
}

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export default function Monitoring() {
  const [running, setRunning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<PipelineResult | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoRunActive] = useState(true);
  const [autoAnalyzeActive] = useState(true);
  const [pendingAlerts, setPendingAlerts] = useState(0);
  const [stats, setStats] = useState({ total: 0, analyzed: 0, unanalyzed: 0 });
  const [syncDropdownOpen, setSyncDropdownOpen] = useState(false);

  const syncOptions = [
    { label: 'Bugun', days: 1, description: 'Son 24 saat' },
    { label: 'Bu Hafta', days: 7, description: 'Son 7 gun' },
    { label: 'Bu Ay', days: 30, description: 'Son 30 gun' },
    { label: 'Tum Zamanlar', days: 365, description: 'Son 1 yil' },
  ];

  const addLog = useCallback((message: string, type: LogEntry['type']) => {
    setLogs(prev => [
      { time: new Date().toISOString(), message, type },
      ...prev.slice(0, 99),
    ]);
  }, []);

  const loadStats = useCallback(async () => {
    const [
      { count: total },
      { count: analyzed },
      { count: pending },
    ] = await Promise.all([
      supabase.from('chats').select('*', { count: 'exact', head: true }),
      supabase.from('chats').select('*', { count: 'exact', head: true }).eq('analyzed', true),
      supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('sent_to_telegram', false),
    ]);

    setStats({
      total: total || 0,
      analyzed: analyzed || 0,
      unanalyzed: (total || 0) - (analyzed || 0),
    });
    setPendingAlerts(pending || 0);
  }, []);

  const analyzeChats = useCallback(async () => {
    if (stats.unanalyzed === 0) {
      addLog('Analiz edilecek chat yok', 'info');
      return;
    }

    setAnalyzing(true);
    addLog(`${stats.unanalyzed} bekleyen chat analiz ediliyor...`, 'info');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-chat`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        addLog(
          `Analiz tamamlandi: ${data.analyzed} chat analiz edildi, ${data.alerts_created || 0} uyari olusturuldu`,
          'success'
        );
      } else {
        const errorMsg = data.error || 'Bilinmeyen analiz hatasi olustu';
        console.error('Analysis error details:', data);
        addLog(`Analiz hatasi: ${errorMsg}`, 'error');
      }

      await loadStats();
    } catch (error: any) {
      console.error('Analysis Error:', error);
      addLog(`Analiz baglanti hatasi: ${error.message}`, 'error');
    } finally {
      setAnalyzing(false);
    }
  }, [addLog, loadStats, stats.unanalyzed]);

  const runPipeline = useCallback(async (days?: number) => {
    setRunning(true);
    const daysParam = days || 2;
    const label = syncOptions.find(o => o.days === daysParam)?.label || `${daysParam} gun`;
    addLog(`Senkronizasyon baslatildi (${label})...`, 'info');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-livechat?days=${daysParam}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      console.log('Sync Response Status:', response.status);

      // Check if response is ok first
      if (!response.ok) {
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = errorData.error || errorData.message || `HTTP ${response.status}`;
          console.error('HTTP Error Response:', errorData);
        } catch {
          errorText = await response.text();
          console.error('HTTP Error Text:', errorText);
        }
        addLog(`Pipeline hatasi: ${errorText}`, 'error');
        return;
      }

      const data: PipelineResult = await response.json();
      console.log('Sync Response Data:', data);
      setLastResult(data);

      if (data.success) {
        const skippedMsg = data.skipped ? `, ${data.skipped} atlandi (limit)` : '';
        addLog(
          `Pipeline tamamlandi: ${data.synced} chat senkronize, ${data.new_chats} yeni, ${data.analyzed} analiz edildi, ${data.alerts_sent} uyari gonderildi${skippedMsg}`,
          'success'
        );
      } else {
        const errorMsg = data.error || 'Bilinmeyen hata olustu';
        console.error('Pipeline error details:', {
          error: data.error,
          fullData: data,
          responseStatus: response.status
        });
        addLog(`Pipeline hatasi: ${errorMsg}`, 'error');
      }

      await loadStats();
    } catch (error: any) {
      console.error('Sync Error:', error);
      addLog(`Baglanti hatasi: ${error.message}`, 'error');
    } finally {
      setRunning(false);
    }
  }, [addLog, loadStats]);

  useEffect(() => {
    loadStats();
    addLog('Sistem baslatildi -- Sunucu tarafli otomatik senkronizasyon aktif (pg_cron)', 'info');

    const statsInterval = setInterval(loadStats, 15000);

    return () => {
      clearInterval(statsInterval);
    };
  }, [addLog, loadStats]);

  const sendPendingAlerts = async () => {
    addLog('Bekleyen Telegram uyarilari gonderiliyor...', 'info');
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-telegram-alerts`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        addLog(`${data.sent} Telegram uyarisi gonderildi`, 'success');
      } else {
        const errorMsg = data.error || 'Bilinmeyen Telegram hatasi olustu';
        console.error('Telegram error details:', data);
        addLog(`Telegram hatasi: ${errorMsg}`, 'error');
      }
      await loadStats();
    } catch (error: any) {
      addLog(`Telegram baglanti hatasi: ${error.message}`, 'error');
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-700 bg-green-50 border-green-200';
      case 'error': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Canli Izleme</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Sistem durumu ve otomatik islem yonetimi</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-green-100 text-green-800 text-xs sm:text-sm">
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="font-medium">Senk. (2dk - Sunucu)</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-blue-100 text-blue-800 text-xs sm:text-sm">
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="font-medium">Analiz (5dk - Sunucu)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <span className="text-xs sm:text-sm text-slate-600">Toplam Chat</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <span className="text-xs sm:text-sm text-slate-600">Analiz Edilen</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-green-600">{stats.analyzed}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
            </div>
            <span className="text-xs sm:text-sm text-slate-600">Bekleyen</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-orange-600">{stats.unanalyzed}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg">
              <Send className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </div>
            <span className="text-xs sm:text-sm text-slate-600">Uyari</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-red-600">{pendingAlerts}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="relative">
          <div className="flex rounded-xl overflow-hidden">
            <button
              onClick={() => runPipeline(30)}
              disabled={running}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white p-4 sm:p-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 sm:gap-4"
            >
              {running ? (
                <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 animate-spin flex-shrink-0" />
              ) : (
                <Zap className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
              )}
              <div className="text-left">
                <div className="font-bold text-sm sm:text-lg">
                  {running ? 'Calistiriliyor...' : 'Senkronizasyon'}
                </div>
                <div className="text-xs sm:text-sm opacity-80">Tarih araligi sec</div>
              </div>
            </button>
            <button
              onClick={() => setSyncDropdownOpen(!syncDropdownOpen)}
              disabled={running}
              className="bg-blue-700 hover:bg-blue-800 text-white px-3 sm:px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center border-l border-blue-500/30"
            >
              <ChevronDown className={`w-5 h-5 transition-transform ${syncDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {syncDropdownOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setSyncDropdownOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-40">
                {syncOptions.map((option) => (
                  <button
                    key={option.days}
                    onClick={() => {
                      setSyncDropdownOpen(false);
                      runPipeline(option.days);
                    }}
                    disabled={running}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">{option.label}</div>
                      <div className="text-xs text-slate-500">{option.description}</div>
                    </div>
                    <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">{option.days} gun</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={analyzeChats}
          disabled={analyzing || stats.unanalyzed === 0}
          className="bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 text-white rounded-xl p-4 sm:p-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 sm:gap-4"
        >
          {analyzing ? (
            <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 animate-spin flex-shrink-0" />
          ) : (
            <Activity className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
          )}
          <div className="text-left">
            <div className="font-bold text-sm sm:text-lg">
              {analyzing ? 'Analiz Ediliyor...' : 'Bekleyen Analizler'}
            </div>
            <div className="text-xs sm:text-sm opacity-80">{stats.unanalyzed} chat analiz edilecek</div>
          </div>
        </button>

        <button
          onClick={sendPendingAlerts}
          disabled={pendingAlerts === 0}
          className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl p-4 sm:p-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 sm:gap-4"
        >
          <Send className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
          <div className="text-left">
            <div className="font-bold text-sm sm:text-lg">Telegram Uyarilari</div>
            <div className="text-xs sm:text-sm opacity-80">{pendingAlerts} uyari gonderilecek</div>
          </div>
        </button>
      </div>

      {lastResult && (
        <div className={`rounded-xl border p-4 sm:p-6 ${lastResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <h3 className="font-bold text-base sm:text-lg mb-3 text-slate-900">Son Pipeline Sonucu</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            <div>
              <div className="text-xs text-slate-600 mb-1">Senkronize</div>
              <div className="text-xl font-bold text-slate-900">{lastResult.synced || 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-600 mb-1">Yeni Chat</div>
              <div className="text-xl font-bold text-slate-900">{lastResult.new_chats || 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-600 mb-1">Analiz Edilen</div>
              <div className="text-xl font-bold text-slate-900">{lastResult.analyzed || 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-600 mb-1">Uyari Gonderilen</div>
              <div className="text-xl font-bold text-slate-900">{lastResult.alerts_sent || 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-600 mb-1">Zaman (İstanbul)</div>
              <div className="text-sm font-medium text-slate-900">
                {lastResult.timestamp ? new Date(lastResult.timestamp).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '-'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">Sistem Loglari</h2>
          <button
            onClick={() => setLogs([])}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Temizle
          </button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Henuz log yok</div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border ${getLogColor(log.type)}`}
              >
                {log.type === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                {log.type === 'error' && <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                {log.type === 'info' && <Activity className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{log.message}</div>
                  <div className="text-xs opacity-60 mt-0.5">
                    {new Date(log.time).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Key, MessageSquare, Send } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    claude_api_key: '',
    livechat_api_key: '',
    telegram_bot_token: '',
    telegram_chat_id: '',
    polling_interval: 60,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data) {
        setSettings({
          claude_api_key: data.claude_api_key || '',
          livechat_api_key: data.livechat_api_key || '',
          telegram_bot_token: data.telegram_bot_token || '',
          telegram_chat_id: data.telegram_chat_id || '',
          polling_interval: data.polling_interval || 60,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-settings`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Ayarlar başarıyla kaydedildi' });
      } else {
        throw new Error(result.error || 'Kayıt başarısız');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ayarlar kaydedilemedi';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Ayarlar</h1>
        <p className="text-sm sm:text-base text-slate-300 mt-1">API anahtarlari ve sistem konfigurasyonu</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="glass-effect rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Key className="w-6 h-6 text-slate-700" />
          <h2 className="text-xl font-bold text-white">Claude AI API</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Claude API Key
            </label>
            <input
              type="password"
              value={settings.claude_api_key}
              onChange={(e) => setSettings({ ...settings, claude_api_key: e.target.value })}
              placeholder="sk-ant-..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-slate-500 mt-1">
              Chat analizleri için Claude AI API anahtarı
            </p>
          </div>
        </div>
      </div>

      <div className="glass-effect rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="w-6 h-6 text-slate-700" />
          <h2 className="text-xl font-bold text-white">LiveChat API</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              LiveChat API Key
            </label>
            <input
              type="password"
              value={settings.livechat_api_key}
              onChange={(e) => setSettings({ ...settings, livechat_api_key: e.target.value })}
              placeholder="API Key"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-slate-500 mt-1">
              LiveChat verilerine erişim için API anahtarı
            </p>
          </div>
        </div>
      </div>

      <div className="glass-effect rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Send className="w-6 h-6 text-slate-700" />
          <h2 className="text-xl font-bold text-white">Telegram Bot</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Telegram Bot Token
            </label>
            <input
              type="password"
              value={settings.telegram_bot_token}
              onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
              placeholder="123456:ABC-DEF..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-slate-500 mt-1">
              BotFather'dan alınan bot token
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Telegram Chat ID
            </label>
            <input
              type="text"
              value={settings.telegram_chat_id}
              onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
              placeholder="-1001234567890"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-slate-500 mt-1">
              Uyarıların gönderileceği grup ID
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Senkronizasyon Aralığı (saniye)
            </label>
            <input
              type="number"
              value={settings.polling_interval}
              onChange={(e) => setSettings({ ...settings, polling_interval: parseInt(e.target.value) || 60 })}
              min="30"
              max="3600"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-slate-500 mt-1">
              Otomatik senkronizasyon için bekleme süresi
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
}

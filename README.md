# LiveChat QA - Kalite Kontrol ve Analiz Sistemi

Modern, otomatik LiveChat kalite kontrol ve analiz platformu. ChatGPT destekli AI analizi ile canlı destek sohbetlerinizi anlık izleyin, değerlendirin ve Telegram üzerinden bildirim alın.

## 🎯 Özellikler

### Otomatik İzleme
- ✅ Her dakika LiveChat API'den otomatik chat çekimi
- ✅ Yeni mesajların anlık takibi
- ✅ Personel ve müşteri bilgilerinin kayıt altına alınması

### AI Destekli Analiz
- 🤖 ChatGPT ile akıllı sohbet analizi
- 📊 Dil ve üslup uyum denetimi
- 🎯 Chat kalite metrikleri
- ⚡ Performans ve süre ölçümü
- 🔍 Hata ve sorun tespiti

### Gerçek Zamanlı Bildirimler
- 📱 Telegram entegrasyonu
- 🚨 Düşük performans uyarıları
- 📈 Kritik durum bildirimleri

### Kapsamlı Raporlama
- 👥 Personel bazlı performans analizi
- 📉 Trend raporları (günlük, haftalık, aylık)
- 🏆 En iyi ve geliştirilmesi gereken temsilciler
- 📋 Güçlü ve zayıf konu haritalandırması

## 🚀 Hızlı Başlangıç

### Gereksinimler
- OpenAI API Key (ChatGPT analizi için)
- Sistem zaten kurulu ve yapılandırılmış ✅

### Başlatma
1. Ayarlar sayfasından ChatGPT API Key'inizi girin
2. Canlı İzleme sayfasından manuel test yapın
3. Sistem otomatik olarak çalışmaya başlayacak!

Detaylı adımlar için [`QUICK_START.md`](QUICK_START.md) dosyasına bakın.

## 📁 Proje Yapısı

```
.
├── src/
│   ├── pages/           # UI sayfaları
│   │   ├── Dashboard.tsx
│   │   ├── ChatAnalysisList.tsx
│   │   ├── PersonnelAnalytics.tsx
│   │   ├── Reports.tsx
│   │   ├── Monitoring.tsx
│   │   └── SettingsPage.tsx
│   ├── lib/
│   │   └── supabase.ts  # Supabase client
│   └── types/
│       └── index.ts     # TypeScript tipleri
│
├── supabase/
│   ├── migrations/      # Database migration dosyaları
│   └── functions/       # Edge Functions
│       ├── sync-livechat/     # Ana pipeline
│       ├── analyze-chat/      # ChatGPT analizi
│       └── send-telegram-alerts/  # Telegram bildirimleri
│
├── TEST_SCENARIOS.md    # Test senaryoları ve dokümanı
├── QUICK_START.md       # Hızlı başlangıç rehberi
└── README.md            # Bu dosya
```

## 🔄 Sistem Akışı

```
┌─────────────────┐
│   LiveChat API  │
└────────┬────────┘
         │ Her 1 dakika (pg_cron)
         ▼
┌─────────────────────────────────────┐
│   sync-livechat Edge Function       │
│  1. Chat'leri çek                   │
│  2. Mesajları kaydet                │
│  3. Yeni chat'leri analiz et        │
│  4. Alert oluştur                   │
│  5. Telegram'a gönder               │
└──────────┬──────────────────────────┘
           │
           ├──► Supabase Database
           │    ├── chats
           │    ├── chat_messages
           │    ├── chat_analysis
           │    ├── personnel
           │    └── alerts
           │
           └──► Telegram Group
                 (Düşük skorlu chat'ler için)
```

## 📊 Analiz Kriterleri

### Dil ve Üslup (0-100)
- Profesyonel dil kullanımı
- Saygılı ve kibar ton
- Yasaklı kelime kontrolü
- Kopyala-yapıştır mesaj tespiti

### Kalite Metrikleri (0-100)
- Soruya cevap verme kalitesi
- Oyalama / geçiştirme tespiti
- Gereksiz uzatma / kısa kesme
- Müşteri memnuniyeti

### Performans (0-100)
- İlk yanıt kalitesi
- Çözüm odaklılık
- İletişim etkinliği

### Genel Skor
- **0-59:** Kritik - Telegram bildirimi gönderilir
- **60-79:** Orta seviye
- **80-100:** İyi performans

## 🔧 Teknik Detaylar

### Teknoloji Stack
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **AI:** OpenAI GPT-4o-mini
- **Bildirim:** Telegram Bot API
- **Zamanlama:** pg_cron

### Edge Functions

#### 1. sync-livechat
Ana pipeline fonksiyonu. Her çalıştırıldığında:
- LiveChat API'den chat'leri çeker
- Veritabanına kaydeder
- Yeni archived chat'leri analiz eder
- Alert oluşturur ve Telegram'a gönderir

**Endpoint:** `/functions/v1/sync-livechat`

#### 2. analyze-chat
(Deprecated - artık sync-livechat içinde)
Chat'leri ChatGPT ile analiz eder.

#### 3. send-telegram-alerts
(Deprecated - artık sync-livechat içinde)
Bekleyen alert'leri Telegram'a gönderir.

### Database Schema

**Ana Tablolar:**
- `chats` - Chat kayıtları
- `chat_messages` - Mesajlar
- `chat_analysis` - AI analiz sonuçları
- `personnel` - Personel bilgileri ve istatistikler
- `alerts` - Oluşturulan uyarılar
- `settings` - Sistem ayarları

Detaylı schema için migration dosyalarına bakın.

### Otomatik Zamanlama

PostgreSQL `pg_cron` extension'ı kullanılarak her dakika otomatik çalışır:

```sql
SELECT cron.schedule(
  'livechat-pipeline',
  '* * * * *',
  'SELECT net.http_get(...)'
);
```

## 🧪 Test

Test senaryoları ve detaylı test dokümanı için [`TEST_SCENARIOS.md`](TEST_SCENARIOS.md) dosyasına bakın.

### Hızlı Test
```bash
# Manuel pipeline çalıştır
curl -X POST "https://your-project.supabase.co/functions/v1/sync-livechat" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## 🐛 Sorun Giderme

### Analiz Çalışmıyor
1. Ayarlar sayfasından ChatGPT API key'i kontrol edin
2. Canlı İzleme'den manuel test yapın
3. Logs'da hata mesajını inceleyin

### Telegram Bildirimi Gelmiyor
1. Bot token ve chat ID'yi kontrol edin
2. Düşük skorlu chat olup olmadığını kontrol edin
3. Alert tablosunu kontrol edin

Daha fazla sorun giderme için [`QUICK_START.md`](QUICK_START.md) dosyasına bakın.

## 📝 Lisans

Bu proje özel kullanım içindir.

## 🤝 Katkıda Bulunma

Sorunları Issues bölümünde bildirin veya pull request gönderin.

## 📞 İletişim

Sorularınız için issue açabilir veya doğrudan iletişime geçebilirsiniz.

---

**Not:** Sistem ChatGPT API key girildiğinde tam otomatik çalışmaya başlar. Hızlı başlangıç için `QUICK_START.md` dosyasını okuyun.

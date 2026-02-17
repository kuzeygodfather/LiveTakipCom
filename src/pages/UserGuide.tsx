import { BookOpen, BarChart3, MessageSquare, Users, Award, Settings, Eye, FileText, AlertTriangle, TrendingUp, Info } from 'lucide-react';

export default function UserGuide() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="w-10 h-10" />
          <h1 className="text-3xl font-bold">Sistem Kullanım Kılavuzu</h1>
        </div>
        <p className="text-blue-100 text-lg">
          LiveChat Kalite Kontrol ve Performans İzleme Sistemi Rehberi
        </p>
      </div>

      <div className="glass-effect rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Info className="w-6 h-6 text-blue-600" />
          Sistem Genel Bakış
        </h2>
        <div className="space-y-3 text-slate-200">
          <p>
            Bu sistem, LiveChat üzerinden yapılan müşteri görüşmelerini otomatik olarak analiz eder,
            personel performansını değerlendirir ve kalite kontrolü sağlar.
          </p>
          <p className="font-medium text-white">Temel Özellikler:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Otomatik chat senkronizasyonu (her 2 dakikada bir)</li>
            <li>AI destekli kalite analizi (Claude AI kullanarak)</li>
            <li>Personel performans takibi ve puanlama</li>
            <li>Bonus hesaplama sistemi</li>
            <li>Telegram ile anlık uyarılar</li>
            <li>Detaylı raporlama ve istatistikler</li>
          </ul>
        </div>
      </div>

      <div className="glass-effect rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          Dashboard (Ana Sayfa)
        </h2>
        <div className="space-y-4 text-slate-200">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3">Genel İstatistikler</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-medium">Unique Chat:</span>
                <span>Farklı müşterilerle yapılan toplam görüşme sayısı</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Thread:</span>
                <span>Tek bir chat içindeki mesaj thread sayısı</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Ortalama Skor:</span>
                <span>Tüm analizlerin genel skor ortalaması (0-100)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Ortalama Yanıt Süresi:</span>
                <span>Müşteriye ilk yanıt verme süresi (saniye)</span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3">Sentiment (Duygu) Dağılımı</h3>
            <p className="text-sm mb-3">AI her chat'i analiz ederek müşteri memnuniyetini 3 kategoride değerlendirir:</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="font-medium">Pozitif:</span>
                <span>Müşteri memnun, sorun çözüldü, iyi iletişim</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                <span className="font-medium">Nötr:</span>
                <span>Normal görüşme, özel bir sorun yok</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span className="font-medium">Negatif:</span>
                <span>Müşteri memnun değil, sorun çözülmedi, şikayet var</span>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3">Müşteri Değerlendirmeleri</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-medium">⭐ Rating Score:</span>
                <span>Müşterinin chat sonunda verdiği 1-5 yıldız puanı</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-medium">💬 Rating Comment:</span>
                <span>Müşterinin yazılı geri bildirimi</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-600 font-medium">🚩 Complaint Flag:</span>
                <span>Düşük puan (1-2 yıldız) otomatik şikayet olarak işaretlenir</span>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3">Personel Performans Karşılaştırması</h3>
            <div className="space-y-2 text-sm">
              <p className="mb-2"><strong>Haftanın En İyi Performansı:</strong> Son 7 günün en yüksek skorlu 5 personeli</p>
              <p className="mb-2"><strong>Gelişim Gereken Personel:</strong> En düşük skorlu 5 personel</p>
              <p className="text-xs text-slate-600 italic">
                Her personel kartında chat sayısı, ortalama skor ve müşteri memnuniyet ortalaması görünür.
              </p>
            </div>
          </div>

          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3">Personel Gelişim Trendleri</h3>
            <p className="text-sm mb-2">Son 7 günün günlük performans grafiği:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
              <li>Her gün için ortalama skor hesaplanır</li>
              <li>Haftalık değişim yüzdesi gösterilir (↑ veya ↓)</li>
              <li>En az 2 günlük veri olması gerekir</li>
            </ul>
          </div>

          <p className="text-sm italic text-slate-600">
            💡 İpucu: Dashboard her açıldığında otomatik güncellenir ve güncel verileri gösterir.
          </p>
        </div>
      </div>

      <div className="glass-effect rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-600" />
          Chat Listesi
        </h2>
        <div className="space-y-4 text-slate-200">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Filtreler ve Arama</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Tarih Seçimi:</strong> Belirli bir tarih aralığındaki chatleri görüntüleyin</li>
              <li><strong>Personel Filtresi:</strong> Belirli bir temsilcinin chatlerini filtreleyin</li>
              <li><strong>Müşteri Arama:</strong> Müşteri adına göre arama yapın</li>
            </ul>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Chat Detayları</h3>
            <p className="mb-2">Bir chat'e tıkladığınızda göreceğiniz bilgiler:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Tam mesaj geçmişi (müşteri ve temsilci mesajları)</li>
              <li>AI analiz sonuçları ve puanlar</li>
              <li>Tespit edilen sorunlar ve öneriler</li>
              <li>Performans metrikleri (yanıt süreleri, çözüm kalitesi)</li>
              <li>Dil ve üslup uyumu değerlendirmesi</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="glass-effect rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          Personel Performansı
        </h2>
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3">Puanlama Sistemi Nasıl Çalışır?</h3>
            <div className="space-y-3 text-slate-200">
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-medium text-white">Ham Skor (Average Score)</p>
                <p className="text-sm">Tüm chat analizlerinin basit ortalaması. Her chat'in aldığı puanların direkt ortalamasıdır.</p>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <p className="font-medium text-white">İstatistiksel Skor (Statistical Score)</p>
                <p className="text-sm">
                  Daha gelişmiş hesaplama ile bulunur. Chat sayısı, tutarlılık, güvenilirlik gibi faktörleri de hesaba katar.
                  Bu skor personel sıralama ve değerlendirmede kullanılır.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3">Güvenilirlik Seviyeleri</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded font-medium">A - En Güvenilir</span>
                <span className="text-slate-600">Yüksek performans, tutarlı kalite</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded font-medium">B - Güvenilir</span>
                <span className="text-slate-600">İyi performans, kabul edilebilir kalite</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded font-medium">C - Orta Güvenilir</span>
                <span className="text-slate-600">Geliştirilmesi gereken alanlar var</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded font-medium">D - Düşük Güvenilir</span>
                <span className="text-slate-600">Ciddi kalite sorunları, acil müdahale gerekli</span>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Uyarı Sistemi
            </h3>
            <p className="text-slate-200 mb-2">Uyarı alan chatler:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-slate-600">
              <li>Overall score 50'nin altında olan chatler otomatik uyarı alır</li>
              <li>30'un altında ise "kritik" olarak işaretlenir</li>
              <li>Bu chatler Telegram'a bildirim olarak gönderilir</li>
              <li>Personel kartlarında uyarı sayısı görünür (kırmızı üçgen simgesi)</li>
            </ul>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3">Metrikler ve Anlamları</h3>
            <div className="space-y-2 text-sm text-slate-200">
              <div className="flex justify-between items-start">
                <span className="font-medium w-48">Toplam Chat:</span>
                <span className="flex-1">Personelin yönettiği toplam görüşme sayısı</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="font-medium w-48">Ortalama İlk Yanıt:</span>
                <span className="flex-1">Müşterinin ilk mesajına ne kadar sürede yanıt verildiği</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="font-medium w-48">Çözüm Süresi:</span>
                <span className="flex-1">Chat'in başından bitişine kadar geçen ortalama süre</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="font-medium w-48">Beğeni/Beğenmeme:</span>
                <span className="flex-1">Müşteri tarafından verilen pozitif/negatif geri bildirimler</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="font-medium w-48">Kaçan Chat:</span>
                <span className="flex-1">Cevaplanmayan veya kaçırılan görüşmeler</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-effect rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          AI Analiz Kriterleri
        </h2>
        <div className="space-y-4">
          <p className="text-slate-200">
            Claude AI her chat'i aşağıdaki kriterlere göre 0-100 puan üzerinden değerlendirir:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">1. Dil ve Üslup Uyumu</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
                <li>Profesyonel dil kullanımı</li>
                <li>Saygılı ve kibar üslup</li>
                <li>Yasaklı kelime kontrolü</li>
                <li>Kopyala-yapıştır tespiti</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">2. Chat Kalitesi</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
                <li>Soruya gerçek cevap verildi mi?</li>
                <li>Oyalama/geçiştirme var mı?</li>
                <li>Gereksiz uzatma veya kısa kesme</li>
                <li>Müşteri memnuniyeti</li>
              </ul>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">3. Performans Metrikleri</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
                <li>İlk yanıt kalitesi</li>
                <li>Çözüm odaklılık</li>
                <li>İletişim etkinliği</li>
              </ul>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-semibold text-orange-900 mb-2">4. Sorun Tespiti</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
                <li>Kritik hatalar</li>
                <li>Geliştirilmesi gereken alanlar</li>
                <li>Eksik/yanlış bilgi</li>
              </ul>
            </div>
          </div>

          <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 mt-4">
            <h3 className="font-semibold text-white mb-2">Genel Puan Hesaplama</h3>
            <p className="text-sm text-slate-200">
              AI tüm bu kriterleri değerlendirerek 0-100 arası bir <strong>Overall Score</strong> verir.
              Bu skorun yanında detaylı bir analiz raporu, tespit edilen sorunlar ve geliştirme önerileri de sunulur.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-effect rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-blue-600" />
          Müşteri Şikayet Analizi
        </h2>
        <div className="space-y-4">
          <p className="text-slate-200">
            Sistem, negatif sentiment'e sahip chatleri analiz ederek müşterilerin gerçek şikayet konularını otomatik olarak kategorize eder.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3">En Çok Şikayet Edilen Konular (Top 10)</h3>
            <p className="text-sm text-slate-200 mb-3">
              AI, negatif chatlerdeki özet metinleri analiz ederek müşterilerin hangi konulardan şikayet ettiğini tespit eder.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                💰 Para Yatırma/Çekim
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
                <li>Yatırım işleminin gecikmesi</li>
                <li>Çekim talebinin onaylanmaması</li>
                <li>Para transferi sorunları</li>
                <li>Hesap yükleme problemleri</li>
              </ul>
            </div>

            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
              <h3 className="font-semibold text-pink-900 mb-2 flex items-center gap-2">
                🎁 Bonus/Promosyon
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
                <li>Bonus kodu kabul edilmiyor</li>
                <li>Kampanya tanımlanmadı</li>
                <li>Özel kod geçersiz</li>
                <li>Bonus hesaba yansımadı</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                🔐 Hesap Erişimi
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
                <li>Giriş yapamama sorunu</li>
                <li>Şifre sıfırlama problemi</li>
                <li>Hesap askıya alındı</li>
                <li>Oturum açma hatası</li>
              </ul>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                ⏱️ İşlem Gecikmeleri
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
                <li>Yavaş işlem süreleri</li>
                <li>Para transferi gecikmesi</li>
                <li>Onay bekleme süresi uzun</li>
              </ul>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h3 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                🛡️ Güvenlik/Lisans
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
                <li>Lisans bilgisi eksikliği</li>
                <li>Güvenlik şüphesi</li>
                <li>Yasal sorunlar</li>
              </ul>
            </div>

            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
              <h3 className="font-semibold text-cyan-900 mb-2 flex items-center gap-2">
                👤 Müşteri Hizmetleri
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
                <li>Otomatik yanıtlar/Bot</li>
                <li>Yetersiz destek</li>
                <li>Çözüm odaklı değil</li>
                <li>İlgisiz temsilci</li>
              </ul>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                🎮 Bahis/Oyun Sorunları
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
                <li>RTP oranları düşük</li>
                <li>Oyun donması</li>
                <li>Bahis kabul edilmedi</li>
                <li>Kazanç yansımadı</li>
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                ⚙️ Teknik Sorunlar
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
                <li>Site açılmıyor</li>
                <li>Mobil uygulama hatası</li>
                <li>Yavaş yüklenme</li>
                <li>Sayfa çökmesi</li>
              </ul>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                📄 Doğrulama/KYC
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
                <li>Kimlik doğrulama sorunu</li>
                <li>Belge kabul edilmedi</li>
                <li>KYC süreci uzun</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h3 className="font-semibold text-white mb-2">Nasıl Çalışır?</h3>
            <div className="space-y-2 text-sm text-slate-200">
              <p><strong>1. AI Özet Analizi:</strong> Her negatif chat için AI'ın yazdığı özet metin analiz edilir</p>
              <p><strong>2. Anahtar Kelime Tespiti:</strong> Önemli kelimeler ve ifadeler tespit edilir</p>
              <p><strong>3. Otomatik Kategorizasyon:</strong> Şikayet en uygun kategoriye otomatik atanır</p>
              <p><strong>4. İstatistiksel Analiz:</strong> En çok tekrar eden şikayet konuları Top 10'da gösterilir</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Dashboard'da Görüntüleme</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
              <li><strong>Günlük Şikayet Trendi:</strong> Son 7 günün günlük negatif ve nötr chat sayıları</li>
              <li><strong>Saatlik Dağılım:</strong> Hangi saatlerde daha fazla şikayet alındığı</li>
              <li><strong>Kategori Yüzdesi:</strong> Her şikayet kategorisinin toplam içindeki payı</li>
            </ul>
          </div>

          <p className="text-sm text-slate-600 italic">
            💡 İpucu: Bu analizler sayesinde müşterilerinizin gerçekte ne ile sorun yaşadığını anlayabilir ve
            önlem alabilirsiniz. Personelin hataları değil, müşterilerin şikayetleri gösterilir.
          </p>
        </div>
      </div>

      <div className="glass-effect rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Award className="w-6 h-6 text-blue-600" />
          Bonus Sistemi
        </h2>
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3">Nasıl Çalışır?</h3>
            <div className="space-y-2 text-slate-200 text-sm">
              <p>Bonus sistemi, belirlenen kurallara göre personele otomatik bonus hesaplar.</p>
              <p className="font-medium mt-3">Kural Türleri:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>greater_than:</strong> Metrik değeri eşik değerinden büyükse bonus verilir</li>
                <li><strong>less_than:</strong> Metrik değeri eşik değerinden küçükse bonus verilir</li>
                <li><strong>between:</strong> Metrik değeri belirlenen aralıkta ise bonus verilir</li>
                <li><strong>equals:</strong> Metrik değeri tam olarak eşitse bonus verilir</li>
              </ul>
            </div>
          </div>

          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3">Değerlendirilebilir Metrikler</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-200">
              <div className="flex items-start gap-2">
                <span className="text-cyan-600">•</span>
                <span><strong>total_chats:</strong> Toplam chat sayısı</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-cyan-600">•</span>
                <span><strong>avg_score:</strong> Ortalama puan</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-cyan-600">•</span>
                <span><strong>avg_satisfaction:</strong> Müşteri memnuniyeti</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-cyan-600">•</span>
                <span><strong>avg_response_time:</strong> Ortalama yanıt süresi</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-cyan-600">•</span>
                <span><strong>positive_chats_count:</strong> Pozitif chat sayısı</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-cyan-600">•</span>
                <span><strong>negative_chats_count:</strong> Negatif chat sayısı</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Periyod Türleri</h3>
            <div className="flex gap-4 text-sm">
              <span className="px-3 py-1 bg-white border border-amber-300 rounded">📅 Günlük (Daily)</span>
              <span className="px-3 py-1 bg-white border border-amber-300 rounded">📅 Haftalık (Weekly)</span>
              <span className="px-3 py-1 bg-white border border-amber-300 rounded">📅 Aylık (Monthly)</span>
            </div>
          </div>

          <p className="text-sm text-slate-600 italic">
            💡 İpucu: Bonus Ayarları sayfasından yeni kurallar ekleyebilir, mevcut kuralları düzenleyebilir
            ve bonus hesaplamaları yapabilirsiniz.
          </p>
        </div>
      </div>

      <div className="glass-effect rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Raporlar
        </h2>
        <div className="space-y-3 text-slate-200">
          <p>Raporlar sayfası, seçtiğiniz tarih aralığı için detaylı performans raporları sunar:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Genel İstatistikler:</strong> Toplam chat, ortalama skor, uyarı sayısı</li>
            <li><strong>Personel Karşılaştırması:</strong> Tüm personelin performansını yan yana görüntüleme</li>
            <li><strong>Trend Analizi:</strong> Zaman içindeki performans değişimlerini izleme</li>
            <li><strong>Top Performerlar:</strong> En yüksek performans gösteren temsilciler</li>
          </ul>
        </div>
      </div>

      <div className="glass-effect rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Award className="w-6 h-6 text-blue-600" />
          Prim Raporları - Detaylı Kullanım Kılavuzu
        </h2>
        <div className="space-y-4">
          <p className="text-slate-200">
            Prim Raporları sayfası, personel primlerini hesaplamak, görüntülemek ve PDF olarak indirmek için kullanılır.
            Sistem üç aşamalı bir yapıya sahiptir.
          </p>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 p-5 rounded-lg">
            <h3 className="font-bold text-blue-900 mb-3 text-lg flex items-center gap-2">
              📊 1. ADIM: Prim Hesaplama veya Kayıtlı Raporları Görüntüleme
            </h3>
            <div className="space-y-3 text-slate-200 text-sm">
              <p className="font-medium text-white">İki farklı görünüm modu vardır:</p>

              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">🧮 Prim Hesaplama (Önizleme) Modu</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Yeni prim hesaplamaları yapabilirsiniz</li>
                  <li>Sonuçları kaydetmeden önce önizleyebilirsiniz</li>
                  <li>Farklı tarih aralıkları ve periyotlarla test edebilirsiniz</li>
                </ul>
                <div className="mt-3 bg-blue-50 p-3 rounded">
                  <p className="font-medium text-blue-900 mb-2">Hesaplama Parametreleri:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li><strong>Periyot Tipi:</strong> Günlük, Haftalık veya Aylık seçin</li>
                    <li><strong>Başlangıç Tarihi:</strong> Hesaplama yapılacak dönemin başlangıcı</li>
                    <li><strong>Bitiş Tarihi:</strong> Hesaplama yapılacak dönemin sonu</li>
                    <li><strong>Hesapla Butonu:</strong> Seçilen parametrelere göre primleri hesaplar</li>
                    <li><strong>Kaydet Butonu:</strong> Hesaplanan primleri veritabanına kaydeder</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">📂 Kayıtlı Raporlar Modu</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Daha önce kaydedilmiş prim raporlarını görüntüleyin</li>
                  <li>Geçmiş dönemlerin prim hesaplamalarına erişin</li>
                  <li>Aylara göre organize edilmiş raporları inceleyin</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-300 p-3 rounded-lg mt-3">
                <p className="text-xs text-yellow-900">
                  <strong>💡 ÖNEMLİ:</strong> "Hesapla" butonu ile yapılan hesaplamalar geçicidir ve veritabanına kaydedilmez.
                  Kaydetmek için "Kaydet" butonuna tıklamanız gerekir!
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 p-5 rounded-lg">
            <h3 className="font-bold text-green-900 mb-3 text-lg flex items-center gap-2">
              📅 2. ADIM: Ay Kartları ile Dönem Seçimi
            </h3>
            <div className="space-y-3 text-slate-200 text-sm">
              <p>Hesaplamalar veya kayıtlı raporlar yüklendikten sonra <strong>aylara göre gruplandırılmış kartlar</strong> görünür.</p>

              <div className="bg-white p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-3">Ay Kartında Görünen Bilgiler:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">📆</span>
                    <div>
                      <p className="font-medium text-white">Ay ve Yıl</p>
                      <p className="text-xs text-slate-600">Örnek: Şubat 2026, Mart 2026</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">👥</span>
                    <div>
                      <p className="font-medium text-white">Personel Sayısı</p>
                      <p className="text-xs text-slate-600">O ayda prim alan personel sayısı</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">💰</span>
                    <div>
                      <p className="font-medium text-white">Toplam Prim</p>
                      <p className="text-xs text-slate-600">O ay için hesaplanan toplam prim tutarı</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">📊</span>
                    <div>
                      <p className="font-medium text-white">Ortalama Prim</p>
                      <p className="text-xs text-slate-600">Personel başına düşen ortalama prim</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-300 p-3 rounded-lg">
                <p className="text-sm font-medium text-green-900 mb-2">✨ Kart Özellikleri:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-200">
                  <li>Kartların üzerine geldiğinizde <strong>gölge efekti</strong> ve <strong>mavi border</strong> belirir</li>
                  <li>Kart <strong>hafifçe yukarı kalkar</strong> (hover animasyonu)</li>
                  <li>Herhangi bir ay kartına <strong>tıklayarak</strong> o ayın detaylarına geçersiniz</li>
                </ul>
              </div>

              <div className="bg-white border border-green-200 p-3 rounded-lg">
                <p className="text-xs text-slate-200">
                  <strong>Örnek:</strong> "Mart 2026" kartına tıkladığınızda, Mart ayında prim alan tüm personellerin
                  listesi ve detayları görünür.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-l-4 border-purple-500 p-5 rounded-lg">
            <h3 className="font-bold text-purple-900 mb-3 text-lg flex items-center gap-2">
              👤 3. ADIM: Personel Tablosu ve Detay Görünümü
            </h3>
            <div className="space-y-3 text-slate-200 text-sm">
              <p>Bir ay kartına tıkladıktan sonra <strong>o ayın personel tablosu</strong> açılır.</p>

              <div className="bg-white p-4 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-3">Tablo Başlığı (Mavi Header)</h4>
                <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                  <li><strong>Ay Adı:</strong> Şubat 2026, Mart 2026 vb.</li>
                  <li><strong>Özet Bilgi:</strong> "8 Personel - Toplam: 14.250 TL" gibi</li>
                  <li><strong>Kapat Butonu:</strong> Ay kartlarına geri dönmek için (X butonu)</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-3">Tabloda Görünen Bilgiler</h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        E
                      </span>
                      <div>
                        <p className="font-medium">Avatar</p>
                        <p className="text-slate-600">İsmin ilk harfi</p>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-white">Personel Adı</p>
                      <p className="text-slate-600">Tam isim görünür</p>
                    </div>
                    <div>
                      <p className="font-medium text-green-600">Toplam Prim</p>
                      <p className="text-slate-600">+1.000 TL formatında</p>
                    </div>
                    <div>
                      <p className="font-medium text-white">Chat Sayısı</p>
                      <p className="text-slate-600">Dönemdeki toplam chat</p>
                    </div>
                    <div>
                      <p className="font-medium text-blue-600">Skor</p>
                      <p className="text-slate-600">Ortalama performans skoru</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Kural Sayısı</p>
                      <p className="text-slate-600">Kaç kural uygulandı</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-300 p-3 rounded-lg">
                <p className="text-sm font-medium text-purple-900 mb-2">🔍 Detay Butonu</p>
                <p className="text-xs text-slate-200 mb-2">
                  Her personelin satırında <strong>"Detay"</strong> butonu vardır. Bu butona tıkladığınızda:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-200 ml-2">
                  <li>Detaylı performans metrikleri popup olarak açılır</li>
                  <li>Uygulanan tüm prim kuralları listelenir</li>
                  <li>PDF olarak indirme seçeneği sunulur</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-500 p-5 rounded-lg">
            <h3 className="font-bold text-orange-900 mb-3 text-lg flex items-center gap-2">
              📄 POPUP: Detaylı Prim Raporu ve PDF İndirme
            </h3>
            <div className="space-y-3 text-slate-200 text-sm">
              <p>"Detay" butonuna tıkladığınızda <strong>tam ekran popup modal</strong> açılır.</p>

              <div className="bg-white p-4 rounded-lg border border-orange-200">
                <h4 className="font-semibold text-orange-800 mb-3">Popup İçeriği (Üstten Alta)</h4>

                <div className="space-y-4">
                  <div className="border-l-4 border-blue-500 pl-3">
                    <p className="font-medium text-white">1️⃣ Başlık Bölümü</p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 ml-2 mt-1">
                      <li><strong>Prim Detay Raporu</strong> başlığı</li>
                      <li>Hesaplama tarihi (örn: 17 Şubat 2026)</li>
                      <li>Kapat butonu (X) - Sağ üst köşede</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-slate-500 pl-3">
                    <p className="font-medium text-white">2️⃣ Özet Bilgi Kartı (Gri Arka Plan)</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="bg-slate-50 p-2 rounded text-xs">
                        <p className="text-slate-600">Personel</p>
                        <p className="font-bold">Ela</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded text-xs">
                        <p className="text-slate-600">Toplam Prim</p>
                        <p className="font-bold text-green-600">+1.000 TL</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded text-xs">
                        <p className="text-slate-600">Dönem Tipi</p>
                        <p className="font-bold">Aylık</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded text-xs">
                        <p className="text-slate-600">Dönem</p>
                        <p className="font-bold">01.02.2026 - 28.02.2026</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-3">
                    <p className="font-medium text-white mb-2">3️⃣ Performans Metrikleri (8 Renkli Kart)</p>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-blue-50 border border-blue-200 p-2 rounded text-center">
                        <p className="text-[10px] text-blue-700">Toplam Chat</p>
                        <p className="text-sm font-bold text-blue-900">136</p>
                      </div>
                      <div className="bg-green-50 border border-green-200 p-2 rounded text-center">
                        <p className="text-[10px] text-green-700">Ort. Skor</p>
                        <p className="text-sm font-bold text-green-900">84.2</p>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 p-2 rounded text-center">
                        <p className="text-[10px] text-purple-700">Memnuniyet</p>
                        <p className="text-sm font-bold text-purple-900">95.5%</p>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 p-2 rounded text-center">
                        <p className="text-[10px] text-orange-700">Yanıt Süresi</p>
                        <p className="text-sm font-bold text-orange-900">45s</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">+ 4 kart daha (Pozitif/Negatif/Nötr Chat, Uygulanan Kural)</p>
                  </div>

                  <div className="border-l-4 border-green-500 pl-3">
                    <p className="font-medium text-white mb-2">4️⃣ Uygulanan Prim Kuralları</p>
                    <div className="bg-white border border-slate-200 p-3 rounded space-y-2">
                      <div className="flex items-center justify-between text-xs border-l-4 border-blue-500 pl-2">
                        <div>
                          <p className="font-bold text-white">Chat Sayısı Primi</p>
                          <div className="flex gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px]">Toplam Chat</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-slate-200 rounded-full text-[10px]">Değer: 136.00</span>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-green-600">+500 TL</p>
                      </div>
                      <div className="flex items-center justify-between text-xs border-l-4 border-blue-500 pl-2">
                        <div>
                          <p className="font-bold text-white">Yüksek Performans Primi</p>
                          <div className="flex gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px]">Ortalama Skor</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-slate-200 rounded-full text-[10px]">Değer: 84.20</span>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-green-600">+500 TL</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">Her kural için hangi metrik kullanıldı ve ne kadar prim kazandırıldı net bir şekilde gösterilir.</p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-300 p-4 rounded-lg">
                <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                  📥 PDF İndirme Özelliği
                </h4>
                <div className="space-y-2 text-xs text-slate-200">
                  <p className="font-medium text-white">Popup'ın en altında iki buton vardır:</p>
                  <div className="flex gap-2 mt-2">
                    <div className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2 rounded text-center text-xs font-medium">
                      📥 PDF Olarak İndir
                    </div>
                    <div className="bg-gray-200 text-slate-200 p-2 rounded text-center text-xs font-medium">
                      Kapat
                    </div>
                  </div>

                  <div className="bg-white border border-orange-200 p-3 rounded mt-3">
                    <p className="font-medium text-orange-900 mb-2">PDF İndirme Nasıl Çalışır?</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>"PDF Olarak İndir" butonuna tıklayın</li>
                      <li>Sistem popup'taki tüm içeriği otomatik olarak PDF'e dönüştürür</li>
                      <li>PDF dosyası şu formatta otomatik isimlendirilir:<br/>
                          <code className="bg-slate-100 px-2 py-1 rounded text-[10px]">Prim_Raporu_[PersonelAdı]_[Tarih].pdf</code>
                      </li>
                      <li>Örnek: <code className="bg-slate-100 px-1 rounded text-[10px]">Prim_Raporu_Ela_17.02.2026.pdf</code></li>
                      <li>Dosya otomatik olarak bilgisayarınıza indirilir</li>
                    </ol>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                    <p className="font-medium text-blue-900 mb-1">✨ PDF İçeriği:</p>
                    <ul className="list-disc list-inside space-y-1 text-[10px]">
                      <li>Personel adı ve genel bilgiler</li>
                      <li>Tüm performans metrikleri (8 kart)</li>
                      <li>Uygulanan tüm prim kuralları ve tutarları</li>
                      <li>Yüksek kaliteli (A4 boyutunda)</li>
                      <li>Çok sayfalı destek (uzun içerik otomatik sayfalara bölünür)</li>
                      <li>Yazdırılabilir ve paylaşılabilir format</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-300 p-3 rounded-lg">
                <p className="text-xs text-green-900">
                  <strong>💡 İPUCU:</strong> PDF'i indirdikten sonra personele e-posta ile gönderebilir,
                  yazdırıp fiziksel olarak teslim edebilir veya muhasebe kayıtlarınızda saklayabilirsiniz.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-cyan-50 to-cyan-100 border-l-4 border-cyan-500 p-5 rounded-lg">
            <h3 className="font-bold text-cyan-900 mb-3 text-lg flex items-center gap-2">
              🎯 Kullanım Senaryosu (Adım Adım Örnek)
            </h3>
            <div className="space-y-3 text-sm">
              <div className="bg-white p-3 rounded-lg border border-cyan-200">
                <p className="font-semibold text-cyan-900 mb-2">Senaryo: Şubat 2026 Aylık Prim Raporu Oluşturma</p>
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-200">
                  <li className="pl-2">
                    <strong>Sayfa Aç:</strong> "Prim Raporları" sayfasına gidin
                  </li>
                  <li className="pl-2">
                    <strong>Mod Seç:</strong> "Kayıtlı Raporlar" sekmesine tıklayın
                  </li>
                  <li className="pl-2">
                    <strong>Ay Seç:</strong> "Şubat 2026" kartına tıklayın
                    <div className="bg-slate-50 p-2 rounded mt-1 text-[10px]">
                      Kartta görecekleriniz: 8 Personel, Toplam: 14.250 TL, Ortalama: 1.781 TL
                    </div>
                  </li>
                  <li className="pl-2">
                    <strong>Personel Seç:</strong> Tabloda "Ela" personelinin satırındaki "Detay" butonuna tıklayın
                    <div className="bg-slate-50 p-2 rounded mt-1 text-[10px]">
                      Ela: +1.000 TL, 136 chat, Skor: 84.2
                    </div>
                  </li>
                  <li className="pl-2">
                    <strong>İncele:</strong> Açılan popup'ta tüm detayları inceleyin
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li>8 farklı performans metriği</li>
                      <li>2 adet prim kuralı (her biri +500 TL)</li>
                      <li>Toplam prim: 1.000 TL</li>
                    </ul>
                  </li>
                  <li className="pl-2">
                    <strong>PDF İndir:</strong> "PDF Olarak İndir" butonuna tıklayın
                    <div className="bg-green-50 p-2 rounded mt-1 text-[10px]">
                      Dosya adı: Prim_Raporu_Ela_17.02.2026.pdf
                    </div>
                  </li>
                  <li className="pl-2">
                    <strong>Kapat:</strong> "Kapat" butonuna basarak popup'ı kapatın
                  </li>
                  <li className="pl-2">
                    <strong>Devam Et:</strong> Aynı tabloda diğer personeller için de aynı işlemi tekrarlayın
                  </li>
                </ol>
              </div>
            </div>
          </div>

          <div className="bg-slate-100 border-l-4 border-slate-500 p-4 rounded-lg">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              ⚙️ Teknik Detaylar ve Notlar
            </h3>
            <div className="space-y-2 text-xs text-slate-200">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <p><strong>Otomatik Gruplama:</strong> Sistem tüm prim kayıtlarını otomatik olarak aya göre gruplar</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <p><strong>En Son Kayıt:</strong> Aynı dönem için birden fazla hesaplama varsa en son kayıt gösterilir</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <p><strong>Sıralama:</strong> Aylar en yeniden en eskiye, personeller prim miktarına göre büyükten küçüğe sıralanır</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <p><strong>Mobil Uyumlu:</strong> Tüm görünümler mobil cihazlarda da mükemmel çalışır</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <p><strong>PDF Kalitesi:</strong> PDF'ler 2x scale ile yüksek çözünürlükte oluşturulur (yazdırma kalitesi)</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <p><strong>Çoklu Sayfa:</strong> Uzun içerik otomatik olarak birden fazla sayfaya bölünür</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
              ⚠️ Önemli Hatırlatmalar
            </h3>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-200">
              <li>Prim hesaplamaları <strong>Bonus Ayarları</strong> sayfasında tanımlanan kurallara göre yapılır</li>
              <li>Kural yoksa veya personel hiçbir kuralı karşılamıyorsa prim 0 TL olabilir</li>
              <li>"Hesapla" ile yapılan önizlemeler <strong>geçicidir</strong>, "Kaydet" ile kalıcı hale gelir</li>
              <li>PDF indirme sırasında internet bağlantısı gerekir (görsel render için)</li>
              <li>Aynı dönem için birden fazla hesaplama yapabilirsiniz, ancak sadece en son kaydedilen gösterilir</li>
            </ul>
          </div>

          <p className="text-sm text-slate-600 italic bg-blue-50 border border-blue-200 p-3 rounded-lg">
            💡 <strong>Profesyonel İpucu:</strong> Her ay sonunda personel primlerini hesaplayın, PDF olarak indirin
            ve hem personele hem de muhasebe departmanına gönderin. Bu sayede şeffaf ve takip edilebilir bir prim
            sistemi oluşturmuş olursunuz.
          </p>
        </div>
      </div>

      <div className="glass-effect rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Eye className="w-6 h-6 text-blue-600" />
          İzleme (Monitoring)
        </h2>
        <div className="space-y-3 text-slate-200">
          <p>Gerçek zamanlı sistem izleme ve senkronizasyon kontrolleri:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Manuel Senkronizasyon:</strong> LiveChat'ten anında chat çekme</li>
            <li><strong>Manuel Analiz:</strong> Bekleyen chatleri hemen analiz etme</li>
            <li><strong>Uyarı Gönderimi:</strong> Bekleyen uyarıları Telegram'a gönderme</li>
            <li><strong>Sistem Durumu:</strong> Son senkronizasyon ve analiz zamanlarını görme</li>
          </ul>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
            <p className="text-sm text-blue-900">
              <strong>Not:</strong> Sistem arka planda otomatik çalışır (her 2 dakikada senkronizasyon,
              her 5 dakikada analiz). Manuel butonlar acil durumlar için kullanılabilir.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-effect rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          Ayarlar
        </h2>
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Önemli: API Anahtarları
            </h3>
            <p className="text-sm text-slate-200 mb-3">
              Sistemin çalışması için gerekli API anahtarları:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-200 ml-2">
              <li><strong>Claude API Key:</strong> Chat analizleri için (zorunlu)</li>
              <li><strong>LiveChat API Key:</strong> Chat senkronizasyonu için (zorunlu)</li>
              <li><strong>Telegram Bot Token:</strong> Uyarı bildirimleri için (opsiyonel)</li>
              <li><strong>Telegram Chat ID:</strong> Bildirimlerin gönderileceği grup ID (opsiyonel)</li>
            </ul>
          </div>
          <p className="text-sm text-slate-600">
            Ayarlar güvenli bir şekilde veritabanında saklanır ve sadece yetkili kullanıcılar tarafından görülebilir.
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl shadow-lg p-6 text-white">
        <h2 className="text-xl font-bold mb-3">Yardıma mı İhtiyacınız Var?</h2>
        <p className="text-slate-100 mb-4">
          Bu kılavuzda bulamadığınız bir konu varsa veya teknik destek gerekiyorsa lütfen sistem yöneticinizle iletişime geçin.
        </p>
        <div className="flex items-center gap-2 text-sm text-slate-200">
          <BookOpen className="w-4 h-4" />
          <span>Sistem Versiyonu: 3.0 - Gelişmiş Prim Raporlama ve PDF Export</span>
        </div>
      </div>
    </div>
  );
}

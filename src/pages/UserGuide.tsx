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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Info className="w-6 h-6 text-blue-600" />
          Sistem Genel Bakış
        </h2>
        <div className="space-y-3 text-slate-700">
          <p>
            Bu sistem, LiveChat üzerinden yapılan müşteri görüşmelerini otomatik olarak analiz eder,
            personel performansını değerlendirir ve kalite kontrolü sağlar.
          </p>
          <p className="font-medium text-slate-900">Temel Özellikler:</p>
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          Dashboard (Ana Sayfa)
        </h2>
        <div className="space-y-4 text-slate-700">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Genel İstatistikler</h3>
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
            <h3 className="font-semibold text-slate-900 mb-3">Sentiment (Duygu) Dağılımı</h3>
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
            <h3 className="font-semibold text-slate-900 mb-3">Müşteri Değerlendirmeleri</h3>
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
            <h3 className="font-semibold text-slate-900 mb-3">Personel Performans Karşılaştırması</h3>
            <div className="space-y-2 text-sm">
              <p className="mb-2"><strong>Haftanın En İyi Performansı:</strong> Son 7 günün en yüksek skorlu 5 personeli</p>
              <p className="mb-2"><strong>Gelişim Gereken Personel:</strong> En düşük skorlu 5 personel</p>
              <p className="text-xs text-slate-600 italic">
                Her personel kartında chat sayısı, ortalama skor ve müşteri memnuniyet ortalaması görünür.
              </p>
            </div>
          </div>

          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Personel Gelişim Trendleri</h3>
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-600" />
          Chat Listesi
        </h2>
        <div className="space-y-4 text-slate-700">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-2">Filtreler ve Arama</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Tarih Seçimi:</strong> Belirli bir tarih aralığındaki chatleri görüntüleyin</li>
              <li><strong>Personel Filtresi:</strong> Belirli bir temsilcinin chatlerini filtreleyin</li>
              <li><strong>Müşteri Arama:</strong> Müşteri adına göre arama yapın</li>
            </ul>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-2">Chat Detayları</h3>
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          Personel Performansı
        </h2>
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Puanlama Sistemi Nasıl Çalışır?</h3>
            <div className="space-y-3 text-slate-700">
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-medium text-slate-900">Ham Skor (Average Score)</p>
                <p className="text-sm">Tüm chat analizlerinin basit ortalaması. Her chat'in aldığı puanların direkt ortalamasıdır.</p>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <p className="font-medium text-slate-900">İstatistiksel Skor (Statistical Score)</p>
                <p className="text-sm">
                  Daha gelişmiş hesaplama ile bulunur. Chat sayısı, tutarlılık, güvenilirlik gibi faktörleri de hesaba katar.
                  Bu skor personel sıralama ve değerlendirmede kullanılır.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Güvenilirlik Seviyeleri</h3>
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
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Uyarı Sistemi
            </h3>
            <p className="text-slate-700 mb-2">Uyarı alan chatler:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-slate-600">
              <li>Overall score 50'nin altında olan chatler otomatik uyarı alır</li>
              <li>30'un altında ise "kritik" olarak işaretlenir</li>
              <li>Bu chatler Telegram'a bildirim olarak gönderilir</li>
              <li>Personel kartlarında uyarı sayısı görünür (kırmızı üçgen simgesi)</li>
            </ul>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Metrikler ve Anlamları</h3>
            <div className="space-y-2 text-sm text-slate-700">
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          AI Analiz Kriterleri
        </h2>
        <div className="space-y-4">
          <p className="text-slate-700">
            Claude AI her chat'i aşağıdaki kriterlere göre 0-100 puan üzerinden değerlendirir:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">1. Dil ve Üslup Uyumu</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                <li>Profesyonel dil kullanımı</li>
                <li>Saygılı ve kibar üslup</li>
                <li>Yasaklı kelime kontrolü</li>
                <li>Kopyala-yapıştır tespiti</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">2. Chat Kalitesi</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                <li>Soruya gerçek cevap verildi mi?</li>
                <li>Oyalama/geçiştirme var mı?</li>
                <li>Gereksiz uzatma veya kısa kesme</li>
                <li>Müşteri memnuniyeti</li>
              </ul>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">3. Performans Metrikleri</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                <li>İlk yanıt kalitesi</li>
                <li>Çözüm odaklılık</li>
                <li>İletişim etkinliği</li>
              </ul>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-semibold text-orange-900 mb-2">4. Sorun Tespiti</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                <li>Kritik hatalar</li>
                <li>Geliştirilmesi gereken alanlar</li>
                <li>Eksik/yanlış bilgi</li>
              </ul>
            </div>
          </div>

          <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 mt-4">
            <h3 className="font-semibold text-slate-900 mb-2">Genel Puan Hesaplama</h3>
            <p className="text-sm text-slate-700">
              AI tüm bu kriterleri değerlendirerek 0-100 arası bir <strong>Overall Score</strong> verir.
              Bu skorun yanında detaylı bir analiz raporu, tespit edilen sorunlar ve geliştirme önerileri de sunulur.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-blue-600" />
          Müşteri Şikayet Analizi
        </h2>
        <div className="space-y-4">
          <p className="text-slate-700">
            Sistem, negatif sentiment'e sahip chatleri analiz ederek müşterilerin gerçek şikayet konularını otomatik olarak kategorize eder.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-3">En Çok Şikayet Edilen Konular (Top 10)</h3>
            <p className="text-sm text-slate-700 mb-3">
              AI, negatif chatlerdeki özet metinleri analiz ederek müşterilerin hangi konulardan şikayet ettiğini tespit eder.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                💰 Para Yatırma/Çekim
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
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
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
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
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
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
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                <li>Yavaş işlem süreleri</li>
                <li>Para transferi gecikmesi</li>
                <li>Onay bekleme süresi uzun</li>
              </ul>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h3 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                🛡️ Güvenlik/Lisans
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                <li>Lisans bilgisi eksikliği</li>
                <li>Güvenlik şüphesi</li>
                <li>Yasal sorunlar</li>
              </ul>
            </div>

            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
              <h3 className="font-semibold text-cyan-900 mb-2 flex items-center gap-2">
                👤 Müşteri Hizmetleri
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
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
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                <li>RTP oranları düşük</li>
                <li>Oyun donması</li>
                <li>Bahis kabul edilmedi</li>
                <li>Kazanç yansımadı</li>
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                ⚙️ Teknik Sorunlar
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
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
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                <li>Kimlik doğrulama sorunu</li>
                <li>Belge kabul edilmedi</li>
                <li>KYC süreci uzun</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h3 className="font-semibold text-slate-900 mb-2">Nasıl Çalışır?</h3>
            <div className="space-y-2 text-sm text-slate-700">
              <p><strong>1. AI Özet Analizi:</strong> Her negatif chat için AI'ın yazdığı özet metin analiz edilir</p>
              <p><strong>2. Anahtar Kelime Tespiti:</strong> Önemli kelimeler ve ifadeler tespit edilir</p>
              <p><strong>3. Otomatik Kategorizasyon:</strong> Şikayet en uygun kategoriye otomatik atanır</p>
              <p><strong>4. İstatistiksel Analiz:</strong> En çok tekrar eden şikayet konuları Top 10'da gösterilir</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-2">Dashboard'da Görüntüleme</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Award className="w-6 h-6 text-blue-600" />
          Bonus Sistemi
        </h2>
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Nasıl Çalışır?</h3>
            <div className="space-y-2 text-slate-700 text-sm">
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
            <h3 className="font-semibold text-slate-900 mb-3">Değerlendirilebilir Metrikler</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
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
            <h3 className="font-semibold text-slate-900 mb-2">Periyod Türleri</h3>
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Raporlar
        </h2>
        <div className="space-y-3 text-slate-700">
          <p>Raporlar sayfası, seçtiğiniz tarih aralığı için detaylı performans raporları sunar:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Genel İstatistikler:</strong> Toplam chat, ortalama skor, uyarı sayısı</li>
            <li><strong>Personel Karşılaştırması:</strong> Tüm personelin performansını yan yana görüntüleme</li>
            <li><strong>Trend Analizi:</strong> Zaman içindeki performans değişimlerini izleme</li>
            <li><strong>Top Performerlar:</strong> En yüksek performans gösteren temsilciler</li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Eye className="w-6 h-6 text-blue-600" />
          İzleme (Monitoring)
        </h2>
        <div className="space-y-3 text-slate-700">
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          Ayarlar
        </h2>
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Önemli: API Anahtarları
            </h3>
            <p className="text-sm text-slate-700 mb-3">
              Sistemin çalışması için gerekli API anahtarları:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 ml-2">
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
        <p className="text-slate-300 mb-4">
          Bu kılavuzda bulamadığınız bir konu varsa veya teknik destek gerekiyorsa lütfen sistem yöneticinizle iletişime geçin.
        </p>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <BookOpen className="w-4 h-4" />
          <span>Sistem Versiyonu: 2.0 - Gelişmiş Şikayet Analizi</span>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { TrendingUp, TrendingDown, Award, Medal, X, Star, MessageSquare, Target, Zap, ThumbsUp, AlertTriangle, ChevronRight } from 'lucide-react';

interface LeaderboardItem {
  name: string;
  score: number;
  change?: number;
  details?: string;
  chatCount?: number;
  avgSatisfaction?: number;
}

interface LeaderboardProps {
  data: LeaderboardItem[];
  title: string;
  type?: 'top' | 'bottom';
  teamTopScore?: number;
}

function generateInsights(item: LeaderboardItem, type: 'top' | 'bottom', rank: number, teamTopScore: number) {
  const { score, chatCount = 0, avgSatisfaction = 0 } = item;
  const gap = teamTopScore - score;

  const motivations: string[] = [];
  const suggestions: string[] = [];
  let whyHere = '';
  let motivationMessage = '';

  if (type === 'bottom') {
    whyHere = `Bu liste, takım içinde görece en düşük ortalama performansa sahip personeli gösterir. ${item.name}'in puanı düşük değil — takımın genel seviyesi yüksek. ${gap > 0 ? `Lider performansçıdan yalnızca ${gap} puan geride.` : 'Aslında en yüksek skorla eşit seviyede!'}`;

    if (score >= 85) {
      motivationMessage = `Performansın gerçekten güçlü! Bu listede görünmen, takımın ne kadar yüksek bir çıtaya sahip olduğunu gösteriyor. Birkaç küçük adımla liderlik tablosuna geçebilirsin.`;
    } else if (score >= 80) {
      motivationMessage = `Sağlam bir performans sergiliyorsun. Odaklanman gereken birkaç alan var ama potansiyelinin farkındayız. Tutarlı bir çalışmayla önümüzdeki ay büyük fark yaratabilirsin.`;
    } else {
      motivationMessage = `Her uzmanlık bir süreç gerektirir. Şu an gelişim eğrisinin tam ortasındasın — doğru odaklanmayla hızla yükseleceksin. Takım sana inanıyor.`;
    }

    if (avgSatisfaction > 0 && avgSatisfaction < 3.5) {
      suggestions.push(`Müşteri memnuniyeti puanın ${avgSatisfaction}/5 — daha empatik ve kişiselleştirilmiş yanıtlarla bu puanı hızla artırabilirsin.`);
    } else if (avgSatisfaction >= 4.5) {
      suggestions.push(`Müşteri memnuniyetin ${avgSatisfaction}/5 ile mükemmel — bu güçlü yanını performans puanına da yansıtmaya çalış.`);
    }

    if (chatCount > 200) {
      suggestions.push(`${chatCount} chat yüksek bir yük — önceliklendirme ve hızlı şablon kullanımı kaliteni düşürmeden verimliliğini artırabilir.`);
    } else if (chatCount < 30) {
      suggestions.push(`Daha fazla chat deneyimi, performans puanını doğrudan etkiler. Aktif chat saatlerini artırmayı dene.`);
    }

    if (gap >= 5) {
      suggestions.push(`En iyi performansçıdan ${gap} puan geride. Bu farkı kapatmak için her chat'te analiz kalitesine ve çözüm hızına odaklan.`);
    } else if (gap > 0) {
      suggestions.push(`Lider performansçıdan sadece ${gap} puan geridsin — bu fark son derece küçük, bir haftalık odaklanmayla kapatılabilir.`);
    }

    if (score < 85) {
      suggestions.push(`Chat başına ortalama çözüm süreni kısaltmak ve müşteriyi doğru anladığını teyit etmek puanını artıracak temel iki adım.`);
    }

    motivations.push('Her chat bir öğrenme fırsatı — zorlu konuşmalar seni güçlendirir.');
    motivations.push('Takım içi en iyi uygulamaları gözlemle ve kendi stiline adapte et.');
    if (chatCount > 100) motivations.push('Yüksek hacimde çalışmak ciddi bir deneyim birikimi sağlıyor — bu değerli.');
  } else {
    whyHere = `${item.name}, son 30 günde takımın en yüksek performans puanlarından birine ulaştı. ${rank <= 2 ? 'Liderlik tablosunun zirvesinde yer almak büyük bir başarı.' : 'Top 5\'te yer almak güçlü ve tutarlı bir performansın göstergesi.'}`;

    if (score >= 90) {
      motivationMessage = `Olağanüstü bir performans! ${score} puanla takımın zirvesinde parlıyorsun. Bu seviyeyi korumak, ulaşmak kadar değerli — tebrikler!`;
    } else if (score >= 85) {
      motivationMessage = `Güçlü ve tutarlı bir performans sergiliyorsun. Takımın gurur kaynağısın. Şimdi hedef: ${score >= 88 ? '90+' : '88+'} puana ulaşmak!`;
    } else {
      motivationMessage = `Top 5'e girdin — bu takdir edilesi bir başarı. Momentum'unu kaybetme ve bir sonraki seviyeye tırman!`;
    }

    if (avgSatisfaction >= 4.5) {
      suggestions.push(`${avgSatisfaction}/5 müşteri memnuniyetiyle harika bir müşteri deneyimi sunuyorsun — bu standartı koru.`);
    } else if (avgSatisfaction > 0 && avgSatisfaction < 4.0) {
      suggestions.push(`Performans puanın yüksek ama müşteri memnuniyeti ${avgSatisfaction}/5 — bu iki puanı birlikte yükseltmek seni gerçek bir lider yapar.`);
    }

    if (chatCount > 150) {
      suggestions.push(`${chatCount} chati bu kaliteyle yönetmek etkileyici — yüksek hacim altında kaliteyi koruma becerisine sahipsin.`);
    }

    suggestions.push('Deneyimini takım arkadaşlarınla paylaş — en iyi uygulamalarını mentor olarak aktarabilirsin.');
    suggestions.push('Performansını belgele: hangi yaklaşımlar işe yarıyor? Bunu sistematikleştir.');

    motivations.push('Liderlik tablosunda kalmak, sürekli gelişime bağlıdır — hiçbir zaman rahat etme.');
    if (gap === 0 && rank === 0) motivations.push('Takımın en iyisisin — başkalarına ilham oluyorsun.');
  }

  return { whyHere, motivationMessage, suggestions, motivations };
}

export default function Leaderboard({ data, title, type = 'top', teamTopScore = 0 }: LeaderboardProps) {
  const [selectedItem, setSelectedItem] = useState<{ item: LeaderboardItem; rank: number } | null>(null);

  if (data.length === 0) {
    return (
      <div className="w-full">
        <h3 className="text-base font-semibold text-white mb-4">{title}</h3>
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-slate-700/40 rounded-lg border-2 border-dashed border-cyan-400/50">
          <div className="w-16 h-16 bg-slate-600/60 rounded-full flex items-center justify-center mb-4">
            {type === 'top' ? (
              <Award className="w-8 h-8 text-cyan-300" />
            ) : (
              <TrendingDown className="w-8 h-8 text-rose-300" />
            )}
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Henüz Performans Verisi Yok</h3>
          <p className="text-sm text-slate-200 text-center max-w-md">
            {type === 'top'
              ? 'Personel performans skorları hesaplandığında en iyi performanslar burada görünecek.'
              : 'Personel performans skorları hesaplandığında gelişim gereken personel burada görünecek.'}
          </p>
        </div>
      </div>
    );
  }

  const getMedalIcon = (index: number) => {
    if (type === 'bottom') return null;
    if (index === 0) return <Award className="w-5 h-5 text-amber-400" />;
    if (index === 1) return <Medal className="w-5 h-5 text-slate-300" />;
    if (index === 2) return <Medal className="w-5 h-5 text-orange-400" />;
    return null;
  };

  const getRankColor = (index: number) => {
    if (type === 'bottom') {
      if (index === 0) return 'bg-gradient-to-r from-rose-500/30 to-red-500/30 text-white border-rose-400/50 shadow-lg shadow-rose-500/30';
      return 'bg-gradient-to-r from-orange-500/25 to-amber-500/25 text-white border-orange-400/50 shadow-lg shadow-orange-500/20';
    }
    if (index === 0) return 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-white border-amber-400/60 shadow-lg shadow-amber-500/40';
    if (index === 1) return 'bg-gradient-to-r from-slate-600/40 to-slate-500/40 text-white border-slate-400/50 shadow-lg shadow-slate-500/30';
    if (index === 2) return 'bg-gradient-to-r from-orange-500/30 to-amber-600/30 text-white border-orange-400/50 shadow-lg shadow-orange-500/30';
    return 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-white border-cyan-400/50 shadow-lg shadow-cyan-500/20';
  };

  const getAvatarColor = (index: number, t: 'top' | 'bottom') => {
    if (t === 'bottom') {
      if (index === 0) return 'bg-rose-500/40 border-rose-400/60 text-rose-200';
      return 'bg-orange-500/40 border-orange-400/60 text-orange-200';
    }
    if (index === 0) return 'bg-amber-500/40 border-amber-400/60 text-amber-200';
    if (index === 1) return 'bg-slate-500/40 border-slate-400/60 text-slate-200';
    if (index === 2) return 'bg-orange-500/40 border-orange-400/60 text-orange-200';
    return 'bg-cyan-500/40 border-cyan-400/60 text-cyan-200';
  };

  const insights = selectedItem
    ? generateInsights(selectedItem.item, type, selectedItem.rank, teamTopScore)
    : null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <ChevronRight className="w-3 h-3" />
          Detay için tıkla
        </span>
      </div>

      <div className="space-y-2">
        {data.map((item, index) => (
          <button
            key={index}
            onClick={() => setSelectedItem({ item, rank: index })}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:shadow-2xl hover:scale-[1.02] backdrop-blur-sm cursor-pointer text-left ${getRankColor(index)}`}
          >
            <div className="flex items-center justify-center w-8 h-8 font-bold text-lg flex-shrink-0">
              {getMedalIcon(index) || `#${index + 1}`}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{item.name}</div>
              {item.details && (
                <div className="text-xs opacity-75 truncate">{item.details}</div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <div className="font-bold text-lg">{item.score}</div>
                {item.change !== undefined && (
                  <div className={`flex items-center gap-1 text-xs ${item.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{Math.abs(item.change).toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedItem && insights && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className={`px-6 py-5 flex items-center justify-between ${type === 'top' ? 'border-b border-amber-500/20' : 'border-b border-rose-500/20'}`}
              style={{ background: type === 'top' ? 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(234,179,8,0.08) 100%)' : 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(249,115,22,0.08) 100%)' }}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 ${getAvatarColor(selectedItem.rank, type)}`}>
                  {selectedItem.item.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedItem.item.name}</h2>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${type === 'top' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                      {type === 'top' ? `#${selectedItem.rank + 1} En İyi` : `#${selectedItem.rank + 1} Gelişim`}
                    </span>
                    <span className="text-xs text-slate-400">Son 30 gün</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 grid grid-cols-3 gap-3 border-b border-white/5">
              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="text-2xl font-bold text-white">{selectedItem.item.score}</div>
                <div className="text-xs text-slate-400 mt-0.5 flex items-center justify-center gap-1">
                  <Target className="w-3 h-3" /> Puan
                </div>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="text-2xl font-bold text-white">{selectedItem.item.chatCount ?? '—'}</div>
                <div className="text-xs text-slate-400 mt-0.5 flex items-center justify-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Chat
                </div>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="text-2xl font-bold text-white">
                  {selectedItem.item.avgSatisfaction ? selectedItem.item.avgSatisfaction.toFixed(1) : '—'}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 flex items-center justify-center gap-1">
                  <Star className="w-3 h-3" /> Memnuniyet
                </div>
              </div>
            </div>

            <div className="px-6 py-4 space-y-4 max-h-[50vh] overflow-y-auto">
              <div className="rounded-xl p-4" style={{ background: type === 'bottom' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${type === 'bottom' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                <div className="flex items-center gap-2 mb-2">
                  {type === 'bottom' ? <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" /> : <Award className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Neden bu listede?</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{insights.whyHere}</p>
              </div>

              <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Motivasyon</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{insights.motivationMessage}</p>
              </div>

              {insights.suggestions.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsUp className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      {type === 'bottom' ? 'Gelişim Önerileri' : 'Güçlü Yönler & Öneriler'}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {insights.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: type === 'bottom' ? '#60a5fa' : '#34d399' }} />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {insights.motivations.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.15)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Hatırlatmalar</span>
                  </div>
                  <ul className="space-y-2">
                    {insights.motivations.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

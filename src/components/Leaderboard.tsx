import { TrendingUp, TrendingDown, Award, Medal } from 'lucide-react';

interface LeaderboardProps {
  data: {
    name: string;
    score: number;
    change?: number;
    details?: string;
  }[];
  title: string;
  type?: 'top' | 'bottom';
}

export default function Leaderboard({ data, title, type = 'top' }: LeaderboardProps) {
  if (data.length === 0) {
    return (
      <div className="w-full">
        <h3 className="text-base font-semibold text-white mb-4">{title}</h3>
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-slate-800/30 rounded-lg border-2 border-dashed border-cyan-500/30">
          <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
            {type === 'top' ? (
              <Award className="w-8 h-8 text-cyan-400" />
            ) : (
              <TrendingDown className="w-8 h-8 text-rose-400" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {type === 'top' ? 'Henüz Performans Verisi Yok' : 'Henüz Performans Verisi Yok'}
          </h3>
          <p className="text-sm text-slate-400 text-center max-w-md mb-4">
            {type === 'top'
              ? 'Personel performans skorları hesaplandığında en iyi performanslar burada görünecek.'
              : 'Personel performans skorları hesaplandığında gelişim gereken personel burada görünecek.'}
          </p>
          <div className="flex items-center gap-2 text-xs text-cyan-300 bg-cyan-500/10 px-3 py-2 rounded-lg border border-cyan-500/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>İpucu: Chat'ler analiz edildikçe sıralamaları görebilirsiniz</span>
          </div>
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
      if (index === 0) return 'bg-gradient-to-r from-rose-500/20 to-red-500/20 text-rose-200 border-rose-500/30 shadow-lg shadow-rose-500/20';
      return 'bg-gradient-to-r from-orange-500/15 to-amber-500/15 text-orange-200 border-orange-500/30 shadow-lg shadow-orange-500/10';
    }

    if (index === 0) return 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-200 border-amber-500/40 shadow-lg shadow-amber-500/30';
    if (index === 1) return 'bg-gradient-to-r from-slate-600/30 to-slate-500/30 text-slate-200 border-slate-500/30 shadow-lg shadow-slate-500/20';
    if (index === 2) return 'bg-gradient-to-r from-orange-500/20 to-amber-600/20 text-orange-200 border-orange-500/30 shadow-lg shadow-orange-500/20';
    return 'bg-gradient-to-r from-cyan-500/15 to-blue-500/15 text-cyan-200 border-cyan-500/30 shadow-lg shadow-cyan-500/10';
  };

  return (
    <div className="w-full">
      <h3 className="text-base font-semibold text-white mb-4">{title}</h3>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:shadow-2xl hover:scale-[1.02] backdrop-blur-sm ${getRankColor(index)}`}
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
                    {item.change >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{Math.abs(item.change).toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

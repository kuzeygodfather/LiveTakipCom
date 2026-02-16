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
        <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            {type === 'top' ? (
              <Award className="w-8 h-8 text-gray-400" />
            ) : (
              <TrendingDown className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {type === 'top' ? 'Henüz Performans Verisi Yok' : 'Henüz Performans Verisi Yok'}
          </h3>
          <p className="text-sm text-gray-600 text-center max-w-md mb-4">
            {type === 'top'
              ? 'Personel performans skorları hesaplandığında en iyi performanslar burada görünecek.'
              : 'Personel performans skorları hesaplandığında gelişim gereken personel burada görünecek.'}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
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

    if (index === 0) return <Award className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-orange-600" />;
    return null;
  };

  const getRankColor = (index: number) => {
    if (type === 'bottom') {
      if (index === 0) return 'bg-red-100 text-red-800 border-red-200';
      return 'bg-orange-50 text-orange-700 border-orange-100';
    }

    if (index === 0) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (index === 1) return 'bg-gray-100 text-gray-800 border-gray-200';
    if (index === 2) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-blue-50 text-blue-700 border-blue-100';
  };

  return (
    <div className="w-full">
      <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all hover:shadow-md ${getRankColor(index)}`}
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
                  <div className={`flex items-center gap-1 text-xs ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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

interface TrendChartProps {
  data: { label: string; value: number; change?: number; count?: number }[];
  title: string;
  color?: string;
  height?: number;
}

export default function TrendChart({ data, title, color = '#3b82f6', height = 200 }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="w-full">
        <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz Trend Verisi Yok</h3>
          <p className="text-sm text-gray-600 text-center max-w-md mb-4">
            Günlük veriler biriktiğinde trend grafikleri burada görünecek. Yeterli veri oluşması için biraz bekleyin.
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>İpucu: Son 7 günün verilerini gösterir</span>
          </div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;

  const getYPosition = (value: number) => {
    return height - ((value - minValue) / range) * (height - 40);
  };

  const points = data.map((item, index) => {
    const x = (index / (data.length - 1 || 1)) * 100;
    const y = ((maxValue - item.value) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full">
      <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="relative" style={{ height: `${height}px` }}>
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.05 }} />
            </linearGradient>
          </defs>

          <polyline
            fill={`url(#gradient-${title})`}
            stroke="none"
            points={`0,100 ${points} 100,100`}
          />

          <polyline
            fill="none"
            stroke={color}
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {data.map((item, index) => {
            const x = (index / (data.length - 1 || 1)) * 100;
            const y = ((maxValue - item.value) / range) * 100;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="1.5"
                fill={color}
                className="hover:r-2 transition-all cursor-pointer"
              />
            );
          })}
        </svg>

        {data.map((item, index) => {
          const x = (index / (data.length - 1 || 1)) * 100;
          const y = getYPosition(item.value);
          const isNearTop = y < 28;
          return (
            <div
              key={index}
              className="absolute transform -translate-x-1/2"
              style={{ left: `${x}%`, top: `${y}px` }}
            >
              <div
                className="absolute whitespace-nowrap -translate-x-1/2 left-1/2 z-10 text-center"
                style={{ [isNearTop ? 'top' : 'bottom']: '8px' }}
              >
                <span
                  className="text-[11px] font-bold px-2 py-1 rounded-md shadow-lg"
                  style={{ color: '#ffffff', backgroundColor: '#0f172a', border: `1.5px solid ${color}`, display: 'inline-block', lineHeight: 1 }}
                >
                  {item.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-3 text-xs text-slate-400">
        {data.length <= 10
          ? data.map((item, index) => (
            <div key={index} className="text-center">
              <div className="font-medium">{item.label}</div>
            </div>
          ))
          : [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]].map((item, index) => (
            <div key={index} className={`text-center ${index === 1 ? 'absolute left-1/2 -translate-x-1/2' : ''}`}>
              <div className="font-medium">{item.label}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

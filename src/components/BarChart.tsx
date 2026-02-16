interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  title: string;
  height?: number;
}

export default function BarChart({ data, title, height = 300 }: BarChartProps) {
  if (data.length === 0) {
    return (
      <div className="w-full">
        <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz Şikayet Verisi Yok</h3>
          <p className="text-sm text-gray-600 text-center max-w-md mb-4">
            Negatif sentiment'e sahip chat'ler analiz edildikçe şikayet kategorileri burada görünecek.
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>İpucu: Müşteri şikayetleri otomatik olarak kategorize edilir</span>
          </div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="w-full">
      <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3" style={{ height: `${height}px`, overflowY: 'auto' }}>
        {data.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          const barColor = item.color || '#3b82f6';

          return (
            <div key={index} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 truncate">{item.label}</span>
                <span className="text-sm font-bold text-gray-900 ml-2">{item.value}</span>
              </div>
              <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500 ease-out group-hover:opacity-80"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: barColor,
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-end pr-2">
                    <span className="text-xs font-semibold text-white">
                      {percentage > 10 && `${percentage.toFixed(0)}%`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

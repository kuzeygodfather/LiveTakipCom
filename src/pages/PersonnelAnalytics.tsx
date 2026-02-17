import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { maskName } from '../lib/utils';
import { User, TrendingUp, TrendingDown, AlertTriangle, Award, RefreshCw, ThumbsUp, ThumbsDown, PhoneOff } from 'lucide-react';
import type { Personnel } from '../types';

interface RatingInfo {
  liked_chats: Array<{ id: string; customer_name: string }>;
  disliked_chats: Array<{ id: string; customer_name: string }>;
  warning_chats: Array<{ id: string; chat_id: string; customer_name: string; overall_score: number }>;
  like_count: number;
  dislike_count: number;
  missed_count: number;
  avg_first_response_time: number | null;
  avg_resolution_time: number | null;
  total_chats_with_data: number;
}

export default function PersonnelAnalytics() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [ratingInfo, setRatingInfo] = useState<Record<string, RatingInfo>>({});
  const [hoveredRating, setHoveredRating] = useState<{ personnel: string; type: string } | null>(null);

  useEffect(() => {
    loadPersonnel();
  }, []);

  useEffect(() => {
    if (selectedPersonnel) {
      console.log(`Selected personnel changed: ${selectedPersonnel.name}`);
      loadPersonnelDetails(selectedPersonnel.name);
    }
  }, [selectedPersonnel?.name]);

  const loadPersonnel = async () => {
    try {
      console.log('Loading personnel data...');
      let allPersonnel: any[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data: batch, error } = await supabase
          .from('personnel')
          .select('*')
          .neq('name', 'Unknown')
          .order('average_score', { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) {
          console.error('Error fetching personnel batch:', error);
          throw error;
        }

        if (!batch || batch.length === 0) break;
        allPersonnel = [...allPersonnel, ...batch];
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      console.log(`Loaded ${allPersonnel.length} personnel records`);

      if (allPersonnel.length > 0) {
        setPersonnel(allPersonnel);

        if (selectedPersonnel) {
          const updatedSelectedPersonnel = allPersonnel.find(p => p.name === selectedPersonnel.name);
          if (updatedSelectedPersonnel) {
            setSelectedPersonnel(updatedSelectedPersonnel);
          } else {
            setSelectedPersonnel(allPersonnel[0]);
          }
        } else {
          setSelectedPersonnel(allPersonnel[0]);
        }

        await loadRatingInfo(allPersonnel);
      }
    } catch (error) {
      console.error('Error loading personnel:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRatingInfo = async (personnelList: Personnel[]) => {
    try {
      const ratingData: Record<string, RatingInfo> = {};

      for (const person of personnelList) {
        let allChats: any[] = [];
        let from = 0;
        const batchSize = 1000;

        while (true) {
          const { data: batch } = await supabase
            .from('chats')
            .select('id, agent_name, customer_name, chat_data, status, rating_status, rating_score')
            .eq('agent_name', person.name)
            .range(from, from + batchSize - 1);

          if (!batch || batch.length === 0) break;
          allChats = [...allChats, ...batch];
          if (batch.length < batchSize) break;
          from += batchSize;
        }

        const chatIds = allChats.map(c => c.id);
        let allWarningAnalyses: any[] = [];

        if (chatIds.length > 0) {
          const analysisBatchSize = 1000;
          for (let i = 0; i < chatIds.length; i += analysisBatchSize) {
            const batchIds = chatIds.slice(i, i + analysisBatchSize);
            const { data: batch } = await supabase
              .from('chat_analysis')
              .select('id, chat_id, overall_score')
              .lt('overall_score', 50)
              .gt('overall_score', 0)
              .in('chat_id', batchIds);

            if (batch) {
              allWarningAnalyses = [...allWarningAnalyses, ...batch];
            }
          }
        }

        const liked: Array<{ id: string; customer_name: string }> = [];
        const disliked: Array<{ id: string; customer_name: string }> = [];
        let missedCount = 0;
        let totalFirstResponseTime = 0;
        let totalResolutionTime = 0;
        let firstResponseCount = 0;
        let resolutionCount = 0;

        if (allChats.length > 0) {
          for (const chat of allChats) {
            if (chat.status === 'missed') {
              missedCount++;
            }

            // Check rating from chats table (primary source)
            if (chat.rating_status === 'rated_good' || chat.rating_status === 'rated_commented') {
              liked.push({ id: chat.id, customer_name: chat.customer_name || 'Bilinmiyor' });
            } else if (chat.rating_status === 'rated_bad') {
              disliked.push({ id: chat.id, customer_name: chat.customer_name || 'Bilinmiyor' });
            }

            const firstResponseTime = chat.chat_data?.properties?.raw_chat_data?.first_response_time_seconds;
            if (firstResponseTime !== null && firstResponseTime !== undefined && !isNaN(firstResponseTime)) {
              totalFirstResponseTime += firstResponseTime;
              firstResponseCount++;
            }

            const chatDuration = chat.chat_data?.properties?.raw_chat_data?.chat_duration_seconds;
            if (chatDuration !== null && chatDuration !== undefined && !isNaN(chatDuration)) {
              totalResolutionTime += chatDuration;
              resolutionCount++;
            }
          }
        }

        const chatMap = new Map(allChats.map(c => [c.id, c.customer_name || 'Bilinmiyor']));
        const warningChatsList = allWarningAnalyses.map(wa => ({
          id: wa.id,
          chat_id: wa.chat_id,
          customer_name: chatMap.get(wa.chat_id) || 'Bilinmiyor',
          overall_score: wa.overall_score,
        }));

        ratingData[person.name] = {
          liked_chats: liked,
          disliked_chats: disliked,
          warning_chats: warningChatsList,
          like_count: liked.length,
          dislike_count: disliked.length,
          missed_count: missedCount,
          avg_first_response_time: firstResponseCount > 0 ? Math.round(totalFirstResponseTime / firstResponseCount) : null,
          avg_resolution_time: resolutionCount > 0 ? Math.round(totalResolutionTime / resolutionCount) : null,
          total_chats_with_data: Math.max(firstResponseCount, resolutionCount),
        };
      }

      setRatingInfo(ratingData);
    } catch (error) {
      console.error('Error loading rating info:', error);
    }
  };

  const recalculateStats = async () => {
    setRecalculating(true);
    try {
      console.log('Starting recalculation...');

      const { data, error } = await supabase.rpc('recalculate_personnel_stats');

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      console.log('RPC completed successfully:', data);
      console.log('Reloading personnel data...');

      await loadPersonnel();

      if (selectedPersonnel) {
        console.log('Reloading selected personnel details...');
        await loadPersonnelDetails(selectedPersonnel.name);
      }

      console.log('Stats recalculated successfully!');
    } catch (error: any) {
      console.error('Error recalculating stats:', error);
      alert(`Hata: ${error.message || 'Bilinmeyen hata'}`);
    } finally {
      setRecalculating(false);
    }
  };

  const loadPersonnelDetails = async (personnelName: string) => {
    try {
      console.log(`Loading daily stats for ${personnelName}...`);
      const { data, error } = await supabase
        .from('personnel_daily_stats')
        .select('*')
        .eq('personnel_name', personnelName)
        .order('date', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error loading personnel details:', error);
        throw error;
      }

      console.log(`Loaded ${data?.length || 0} daily stats records for ${personnelName}`);
      setDailyStats(data || []);
    } catch (error) {
      console.error('Error loading personnel details:', error);
    }
  };

  const parseScore = (score: number | string): number => {
    if (typeof score === 'string') {
      const parsed = parseFloat(score);
      return isNaN(parsed) ? 0 : parsed;
    }
    return score;
  };

  const getPerformanceLevel = (score: number | string) => {
    const numScore = parseScore(score);
    if (numScore >= 80) return { label: 'Olumlu', color: 'text-green-600 bg-green-50' };
    if (numScore >= 50) return { label: 'Notr', color: 'text-slate-600 bg-slate-50' };
    return { label: 'Olumsuz', color: 'text-red-600 bg-red-50' };
  };

  const getTierLabel = (tier: string) => {
    switch(tier) {
      case 'A': return 'En Güvenilir';
      case 'B': return 'Güvenilir';
      case 'C': return 'Orta Güvenilir';
      case 'D': return 'Düşük Güvenilir';
      default: return tier;
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
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Personel Performansi</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Temsilci bazli kalite analizi ve performans metrikleri</p>
        </div>
        <button
          onClick={recalculateStats}
          disabled={recalculating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex-shrink-0 self-start"
        >
          <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
          {recalculating ? 'Yenileniyor...' : 'Yenile'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 max-h-[60vh] lg:max-h-none overflow-y-auto">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Personel Listesi</h2>
          <div className="space-y-2">
            {personnel.map((person) => {
              const statScore = person.average_score;
              const performance = getPerformanceLevel(statScore);
              const ratings = ratingInfo[person.name] || {
                like_count: 0,
                dislike_count: 0,
                missed_count: 0,
                liked_chats: [],
                disliked_chats: [],
                warning_chats: [],
                avg_first_response_time: null,
                avg_resolution_time: null,
                total_chats_with_data: 0
              };
              return (
                <button
                  key={person.id}
                  onClick={() => setSelectedPersonnel(person)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedPersonnel?.id === person.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-slate-600" />
                      <span className="font-semibold text-slate-900">{person.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">
                        {getTierLabel(person.reliability_tier)}
                      </span>
                      {person.warning_count > 0 && (
                        <div
                          className="flex items-center gap-1 text-xs text-red-600 cursor-help relative"
                          onMouseEnter={() => setHoveredRating({ personnel: person.name, type: 'warning' })}
                          onMouseLeave={() => setHoveredRating(null)}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {person.warning_count}
                          {hoveredRating?.personnel === person.name && hoveredRating?.type === 'warning' && ratings.warning_chats.length > 0 && (
                            <div className="absolute z-50 bottom-full right-0 mb-2 w-72 max-h-64 overflow-y-auto bg-slate-900 text-white text-xs rounded-lg shadow-xl p-3">
                              <div className="font-semibold mb-2 pb-2 border-b border-slate-700">Uyari Alan Chatler ({ratings.warning_chats.length})</div>
                              <div className="space-y-1">
                                {ratings.warning_chats.map((chat) => (
                                  <div key={chat.id} className="flex items-center justify-between py-1 hover:bg-slate-800 px-2 rounded">
                                    <span className="font-mono">#{chat.chat_id.slice(0, 10)}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400 truncate ml-2">{maskName(chat.customer_name)}</span>
                                      <span className="text-red-400 font-medium whitespace-nowrap">{Math.round(chat.overall_score)}/100</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="absolute top-full right-4 -mt-1">
                                <div className="border-4 border-transparent border-t-slate-900"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600">{person.total_chats} chat</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${performance.color}`}>
                      {Math.round(parseScore(statScore))}/100
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-500">
                      İlk Yanıt: {ratings.avg_first_response_time !== null ? `${Math.floor(ratings.avg_first_response_time / 60)}dk` : 'N/A'}
                    </span>
                    <span className="text-slate-500">
                      Çözüm: {ratings.avg_resolution_time !== null ? `${Math.floor(ratings.avg_resolution_time / 60)}dk` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center gap-1 text-green-600 cursor-help relative"
                        onMouseEnter={() => setHoveredRating({ personnel: person.name, type: 'like' })}
                        onMouseLeave={() => setHoveredRating(null)}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{ratings.like_count}</span>
                      {hoveredRating?.personnel === person.name && hoveredRating?.type === 'like' && ratings.liked_chats.length > 0 && (
                        <div className="absolute z-50 bottom-full left-0 mb-2 w-64 max-h-64 overflow-y-auto bg-slate-900 text-white text-xs rounded-lg shadow-xl p-3">
                          <div className="font-semibold mb-2 pb-2 border-b border-slate-700">Beğenilen Chatler</div>
                          <div className="space-y-1">
                            {ratings.liked_chats.map((chat) => (
                              <div key={chat.id} className="flex items-center justify-between py-1 hover:bg-slate-800 px-2 rounded">
                                <span className="font-mono">#{chat.id.slice(0, 10)}</span>
                                <span className="text-slate-400 truncate ml-2">{maskName(chat.customer_name)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="absolute top-full left-4 -mt-1">
                            <div className="border-4 border-transparent border-t-slate-900"></div>
                          </div>
                        </div>
                      )}
                      </div>
                      <div
                        className="flex items-center gap-1 text-red-600 cursor-help relative"
                        onMouseEnter={() => setHoveredRating({ personnel: person.name, type: 'dislike' })}
                        onMouseLeave={() => setHoveredRating(null)}
                      >
                        <ThumbsDown className="w-3 h-3" />
                        <span>{ratings.dislike_count}</span>
                        {hoveredRating?.personnel === person.name && hoveredRating?.type === 'dislike' && ratings.disliked_chats.length > 0 && (
                          <div className="absolute z-50 bottom-full left-0 mb-2 w-64 max-h-64 overflow-y-auto bg-slate-900 text-white text-xs rounded-lg shadow-xl p-3">
                            <div className="font-semibold mb-2 pb-2 border-b border-slate-700">Beğenilmeyen Chatler</div>
                            <div className="space-y-1">
                              {ratings.disliked_chats.map((chat) => (
                                <div key={chat.id} className="flex items-center justify-between py-1 hover:bg-slate-800 px-2 rounded">
                                  <span className="font-mono">#{chat.id.slice(0, 10)}</span>
                                  <span className="text-slate-400 truncate ml-2">{maskName(chat.customer_name)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="absolute top-full left-4 -mt-1">
                              <div className="border-4 border-transparent border-t-slate-900"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {ratings.missed_count > 0 && (
                      <div className="flex items-center gap-1 text-orange-600">
                        <PhoneOff className="w-3 h-3" />
                        <span>{ratings.missed_count} kaçan</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedPersonnel ? (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{selectedPersonnel.name}</h2>
                    {selectedPersonnel.email && (
                      <p className="text-slate-600 mt-1">{selectedPersonnel.email}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm text-slate-600">
                        {getTierLabel(selectedPersonnel.reliability_tier)}
                      </span>
                      <span className="text-sm text-slate-600">
                        Güvenilirlik: {Math.round(parseScore(selectedPersonnel.confidence_level || 0))}%
                      </span>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-lg font-bold ${getPerformanceLevel(selectedPersonnel.average_score).color}`}>
                    {getPerformanceLevel(selectedPersonnel.average_score).label}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="text-sm text-slate-600 mb-1">Toplam Chat</div>
                    <div className="text-2xl font-bold text-slate-900">{selectedPersonnel.total_chats}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="text-sm text-slate-600 mb-1">İstatistiksel Skor</div>
                    <div className="text-2xl font-bold text-slate-900">
                      {Math.round(parseScore(selectedPersonnel.average_score))}/100
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="text-sm text-slate-600 mb-1">Ham Skor</div>
                    <div className="text-xl font-bold text-slate-600">
                      {Math.round(parseScore(selectedPersonnel.average_score))}/100
                    </div>
                  </div>
                  <div
                    className="bg-slate-50 p-4 rounded-lg relative cursor-help hover:bg-red-50 transition-colors"
                    onMouseEnter={() => setHoveredRating({ personnel: selectedPersonnel.name, type: 'warning_detail' })}
                    onMouseLeave={() => setHoveredRating(null)}
                  >
                    <div className="text-sm text-slate-600 mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Uyari Sayisi
                    </div>
                    <div className={`text-2xl font-bold ${selectedPersonnel.warning_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedPersonnel.warning_count}
                    </div>
                    {hoveredRating?.personnel === selectedPersonnel.name && hoveredRating?.type === 'warning_detail' &&
                     ratingInfo[selectedPersonnel.name]?.warning_chats.length > 0 && (
                      <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 max-h-96 overflow-y-auto bg-slate-900 text-white text-xs rounded-lg shadow-xl p-3">
                        <div className="font-semibold mb-2 pb-2 border-b border-slate-700">Uyari Alan Chatler ({ratingInfo[selectedPersonnel.name].warning_chats.length})</div>
                        <div className="space-y-1">
                          {ratingInfo[selectedPersonnel.name].warning_chats.map((chat) => (
                            <div key={chat.id} className="flex items-center justify-between py-1 hover:bg-slate-800 px-2 rounded">
                              <span className="font-mono">#{chat.chat_id.slice(0, 10)}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 truncate ml-2">{maskName(chat.customer_name)}</span>
                                <span className="text-red-400 font-medium whitespace-nowrap">{Math.round(chat.overall_score)}/100</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                          <div className="border-8 border-transparent border-t-slate-900"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div
                    className="bg-slate-50 p-4 rounded-lg relative cursor-help hover:bg-green-50 transition-colors"
                    onMouseEnter={() => setHoveredRating({ personnel: selectedPersonnel.name, type: 'like_detail' })}
                    onMouseLeave={() => setHoveredRating(null)}
                  >
                    <div className="text-sm text-slate-600 mb-1 flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      Beğeni
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {ratingInfo[selectedPersonnel.name]?.like_count || 0}
                    </div>
                    {hoveredRating?.personnel === selectedPersonnel.name && hoveredRating?.type === 'like_detail' &&
                     ratingInfo[selectedPersonnel.name]?.liked_chats.length > 0 && (
                      <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 max-h-96 overflow-y-auto bg-slate-900 text-white text-xs rounded-lg shadow-xl p-3">
                        <div className="font-semibold mb-2 pb-2 border-b border-slate-700">Beğenilen Chatler</div>
                        <div className="space-y-1">
                          {ratingInfo[selectedPersonnel.name].liked_chats.map((chat) => (
                            <div key={chat.id} className="flex items-center justify-between py-1 hover:bg-slate-800 px-2 rounded">
                              <span className="font-mono">#{chat.id.slice(0, 10)}</span>
                              <span className="text-slate-400 truncate ml-2">{maskName(chat.customer_name)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                          <div className="border-8 border-transparent border-t-slate-900"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div
                    className="bg-slate-50 p-4 rounded-lg relative cursor-help hover:bg-red-50 transition-colors"
                    onMouseEnter={() => setHoveredRating({ personnel: selectedPersonnel.name, type: 'dislike_detail' })}
                    onMouseLeave={() => setHoveredRating(null)}
                  >
                    <div className="text-sm text-slate-600 mb-1 flex items-center gap-1">
                      <ThumbsDown className="w-3 h-3" />
                      Beğenmeme
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {ratingInfo[selectedPersonnel.name]?.dislike_count || 0}
                    </div>
                    {hoveredRating?.personnel === selectedPersonnel.name && hoveredRating?.type === 'dislike_detail' &&
                     ratingInfo[selectedPersonnel.name]?.disliked_chats.length > 0 && (
                      <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 max-h-96 overflow-y-auto bg-slate-900 text-white text-xs rounded-lg shadow-xl p-3">
                        <div className="font-semibold mb-2 pb-2 border-b border-slate-700">Beğenilmeyen Chatler</div>
                        <div className="space-y-1">
                          {ratingInfo[selectedPersonnel.name].disliked_chats.map((chat) => (
                            <div key={chat.id} className="flex items-center justify-between py-1 hover:bg-slate-800 px-2 rounded">
                              <span className="font-mono">#{chat.id.slice(0, 10)}</span>
                              <span className="text-slate-400 truncate ml-2">{maskName(chat.customer_name)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                          <div className="border-8 border-transparent border-t-slate-900"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="text-sm text-slate-600 mb-1 flex items-center gap-1">
                      <PhoneOff className="w-3 h-3" />
                      Kaçan Chat
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      {ratingInfo[selectedPersonnel.name]?.missed_count || 0}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="text-sm text-slate-600 mb-1">Ort. İlk Yanıt</div>
                    <div className="text-xl font-bold text-blue-600">
                      {ratingInfo[selectedPersonnel.name]?.avg_first_response_time !== null && ratingInfo[selectedPersonnel.name]?.avg_first_response_time !== undefined
                        ? `${Math.floor(ratingInfo[selectedPersonnel.name].avg_first_response_time! / 60)}dk ${ratingInfo[selectedPersonnel.name].avg_first_response_time! % 60}s`
                        : 'Veri yok'}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="text-sm text-slate-600 mb-1">Ort. Çözüm Süresi</div>
                    <div className="text-xl font-bold text-purple-600">
                      {ratingInfo[selectedPersonnel.name]?.avg_resolution_time !== null && ratingInfo[selectedPersonnel.name]?.avg_resolution_time !== undefined
                        ? `${Math.floor(ratingInfo[selectedPersonnel.name].avg_resolution_time! / 60)}dk ${ratingInfo[selectedPersonnel.name].avg_resolution_time! % 60}s`
                        : 'Veri yok'}
                    </div>
                  </div>
                </div>
              </div>

              {dailyStats.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Son 30 Gün Performansı</h3>
                  <div className="space-y-2">
                    {dailyStats.slice(0, 10).map((stat) => (
                      <div key={stat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-slate-700">
                            {new Date(stat.date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                          </span>
                          <span className="text-sm text-slate-600">{stat.total_chats} chat</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-600">
                            Yanıt: {Math.round(stat.average_response_time)}s
                          </span>
                          <span className={`px-3 py-1 rounded font-medium ${getPerformanceLevel(stat.average_score).color}`}>
                            {Math.round(parseScore(stat.average_score))}/100
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {selectedPersonnel.strong_topics && selectedPersonnel.strong_topics.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="w-5 h-5 text-green-600" />
                      <h3 className="text-lg font-bold text-slate-900">Güçlü Konular</h3>
                    </div>
                    <ul className="space-y-2">
                      {selectedPersonnel.strong_topics.map((topic: any, i: number) => (
                        <li key={i} className="text-sm text-slate-700 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedPersonnel.weak_topics && selectedPersonnel.weak_topics.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <h3 className="text-lg font-bold text-slate-900">Gelişmeli Konular</h3>
                    </div>
                    <ul className="space-y-2">
                      {selectedPersonnel.weak_topics.map((topic: any, i: number) => (
                        <li key={i} className="text-sm text-slate-700 flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-orange-600" />
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <User className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600">Personel seçin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

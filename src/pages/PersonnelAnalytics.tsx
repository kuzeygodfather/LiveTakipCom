import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { maskName } from '../lib/utils';
import { User, TrendingUp, TrendingDown, AlertTriangle, Award, RefreshCw, ThumbsUp, ThumbsDown, PhoneOff } from 'lucide-react';
import type { Personnel } from '../types';
import { useNotification } from '../lib/notifications';
import { Modal } from '../components/Modal';

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
  const { showSuccess, showError } = useNotification();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [ratingInfo, setRatingInfo] = useState<Record<string, RatingInfo>>({});
  const [hoveredRating, setHoveredRating] = useState<{ personnel: string; type: string } | null>(null);
  const [chatModal, setChatModal] = useState<{ isOpen: boolean; type: string; chats: any[]; title: string }>({
    isOpen: false,
    type: '',
    chats: [],
    title: ''
  });
  const [messagesModal, setMessagesModal] = useState<{ isOpen: boolean; messages: any[]; chatId: string; customerName: string; loading: boolean }>({
    isOpen: false,
    messages: [],
    chatId: '',
    customerName: '',
    loading: false
  });

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
              .select('id, chat_id, overall_score, sentiment')
              .in('chat_id', batchIds);

            if (batch) {
              // Filter for negative chats only (overall_score < 50)
              const negativeChats = batch.filter(
                item => item.overall_score < 60
              );
              allWarningAnalyses = [...allWarningAnalyses, ...negativeChats];
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
      showSuccess('İstatistikler başarıyla yeniden hesaplandı!');
    } catch (error: any) {
      console.error('Error recalculating stats:', error);
      showError(`Hata: ${error.message || 'Bilinmeyen hata'}`);
    } finally {
      setRecalculating(false);
    }
  };

  const openChatModal = (type: string, chats: any[], title: string) => {
    setChatModal({
      isOpen: true,
      type,
      chats,
      title
    });
  };

  const closeChatModal = () => {
    setChatModal({
      isOpen: false,
      type: '',
      chats: [],
      title: ''
    });
  };

  const loadChatMessages = async (chatId: string, customerName: string) => {
    setMessagesModal({
      isOpen: true,
      messages: [],
      chatId,
      customerName,
      loading: true
    });

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessagesModal(prev => ({
        ...prev,
        messages: data || [],
        loading: false
      }));
    } catch (error) {
      console.error('Error loading chat messages:', error);
      showError('Chat mesajları yüklenirken hata oluştu');
      setMessagesModal(prev => ({
        ...prev,
        loading: false
      }));
    }
  };

  const closeChatMessagesModal = () => {
    setMessagesModal({
      isOpen: false,
      messages: [],
      chatId: '',
      customerName: '',
      loading: false
    });
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
    if (numScore >= 90) return { label: 'Mükemmel', color: 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/20' };
    if (numScore >= 70) return { label: 'İyi', color: 'text-cyan-400 bg-cyan-500/15 border border-cyan-500/20' };
    if (numScore >= 60) return { label: 'Orta', color: 'text-blue-400 bg-blue-500/15 border border-blue-500/20' };
    if (numScore >= 40) return { label: 'Olumsuz', color: 'text-amber-400 bg-amber-500/15 border border-amber-500/20' };
    if (numScore >= 30) return { label: 'Dikkat', color: 'text-orange-400 bg-orange-500/15 border border-orange-500/20' };
    return { label: 'Kritik', color: 'text-rose-400 bg-rose-500/15 border border-rose-500/20' };
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Personel Performansi</h1>
          <p className="text-sm sm:text-base text-slate-200 mt-1">Temsilci bazli kalite analizi ve performans metrikleri</p>
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
        <div className="lg:col-span-1 glass-effect rounded-xl shadow-lg p-4 sm:p-6 max-h-[60vh] lg:max-h-none overflow-y-auto">
          <h2 className="text-lg font-bold text-white mb-4">Personel Listesi</h2>
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
                      ? 'border-blue-500 bg-blue-500/15'
                      : 'border-white/10 hover:border-white/25 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-slate-400" />
                      <span className="font-semibold text-white">{person.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-100 font-medium">
                        {getTierLabel(person.reliability_tier)}
                      </span>
                      {person.warning_count > 0 && (
                        <button
                          onClick={() => openChatModal('warning', ratings.warning_chats, `${person.name} - Uyarı Alan Chatler`)}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/15 px-2 py-1 rounded transition-colors cursor-pointer"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {person.warning_count}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-400">{person.total_chats} chat</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${performance.color}`}>
                      {Math.round(parseScore(statScore))}/100
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-100">
                      İlk Yanıt: {ratings.avg_first_response_time !== null ? `${Math.floor(ratings.avg_first_response_time / 60)}dk` : 'N/A'}
                    </span>
                    <span className="text-slate-100">
                      Çözüm: {ratings.avg_resolution_time !== null ? `${Math.floor(ratings.avg_resolution_time / 60)}dk` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      {ratings.like_count > 0 && (
                        <button
                          onClick={() => openChatModal('like', ratings.liked_chats, `${person.name} - Beğenilen Chatler`)}
                          className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15 px-2 py-1 rounded transition-colors cursor-pointer"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>{ratings.like_count}</span>
                        </button>
                      )}
                      {ratings.dislike_count > 0 && (
                        <button
                          onClick={() => openChatModal('dislike', ratings.disliked_chats, `${person.name} - Beğenilmeyen Chatler`)}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/15 px-2 py-1 rounded transition-colors cursor-pointer"
                        >
                          <ThumbsDown className="w-3 h-3" />
                          <span>{ratings.dislike_count}</span>
                        </button>
                      )}
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
              <div className="glass-effect rounded-xl shadow-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">{selectedPersonnel.name}</h2>
                    {selectedPersonnel.email && (
                      <p className="text-slate-400 mt-1">{selectedPersonnel.email}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm text-slate-400">
                        {getTierLabel(selectedPersonnel.reliability_tier)}
                      </span>
                      <span className="text-sm text-slate-400">
                        Güvenilirlik: {Math.round(parseScore(selectedPersonnel.confidence_level || 0))}%
                      </span>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-lg font-bold ${getPerformanceLevel(selectedPersonnel.average_score).color}`}>
                    {getPerformanceLevel(selectedPersonnel.average_score).label}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-slate-800/30 p-4 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">Toplam Chat</div>
                    <div className="text-2xl font-bold text-white">{selectedPersonnel.total_chats}</div>
                  </div>
                  <div className="bg-slate-800/30 p-4 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">İstatistiksel Skor</div>
                    <div className="text-2xl font-bold text-white">
                      {Math.round(parseScore(selectedPersonnel.average_score))}/100
                    </div>
                  </div>
                  <div className="bg-slate-800/30 p-4 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">Ham Skor</div>
                    <div className="text-xl font-bold text-white">
                      {Math.round(parseScore(selectedPersonnel.average_score))}/100
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const ratings = ratingInfo[selectedPersonnel.name];
                      if (ratings?.warning_chats.length > 0) {
                        openChatModal('warning', ratings.warning_chats, `${selectedPersonnel.name} - Uyarı Alan Chatler`);
                      }
                    }}
                    className="bg-white/5 p-4 rounded-lg hover:bg-red-500/10 border border-white/10 transition-colors cursor-pointer w-full text-left disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!ratingInfo[selectedPersonnel.name]?.warning_chats.length}
                  >
                    <div className="text-sm text-slate-400 mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Uyari Sayisi
                    </div>
                    <div className={`text-2xl font-bold ${selectedPersonnel.warning_count > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {selectedPersonnel.warning_count}
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      const ratings = ratingInfo[selectedPersonnel.name];
                      if (ratings?.liked_chats.length > 0) {
                        openChatModal('like', ratings.liked_chats, `${selectedPersonnel.name} - Beğenilen Chatler`);
                      }
                    }}
                    className="bg-white/5 p-4 rounded-lg hover:bg-emerald-500/10 border border-white/10 transition-colors cursor-pointer w-full text-left disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!ratingInfo[selectedPersonnel.name]?.liked_chats.length}
                  >
                    <div className="text-sm text-slate-400 mb-1 flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      Beğeni
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">
                      {ratingInfo[selectedPersonnel.name]?.like_count || 0}
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      const ratings = ratingInfo[selectedPersonnel.name];
                      if (ratings?.disliked_chats.length > 0) {
                        openChatModal('dislike', ratings.disliked_chats, `${selectedPersonnel.name} - Beğenilmeyen Chatler`);
                      }
                    }}
                    className="bg-white/5 p-4 rounded-lg hover:bg-red-500/10 border border-white/10 transition-colors cursor-pointer w-full text-left disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!ratingInfo[selectedPersonnel.name]?.disliked_chats.length}
                  >
                    <div className="text-sm text-slate-400 mb-1 flex items-center gap-1">
                      <ThumbsDown className="w-3 h-3" />
                      Beğenmeme
                    </div>
                    <div className="text-2xl font-bold text-red-400">
                      {ratingInfo[selectedPersonnel.name]?.dislike_count || 0}
                    </div>
                  </button>
                  <div className="bg-slate-800/30 p-4 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1 flex items-center gap-1">
                      <PhoneOff className="w-3 h-3" />
                      Kaçan Chat
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      {ratingInfo[selectedPersonnel.name]?.missed_count || 0}
                    </div>
                  </div>
                  <div className="bg-slate-800/30 p-4 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">Ort. İlk Yanıt</div>
                    <div className="text-xl font-bold text-blue-600">
                      {ratingInfo[selectedPersonnel.name]?.avg_first_response_time !== null && ratingInfo[selectedPersonnel.name]?.avg_first_response_time !== undefined
                        ? `${Math.floor(ratingInfo[selectedPersonnel.name].avg_first_response_time! / 60)}dk ${ratingInfo[selectedPersonnel.name].avg_first_response_time! % 60}s`
                        : 'Veri yok'}
                    </div>
                  </div>
                  <div className="bg-slate-800/30 p-4 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">Ort. Çözüm Süresi</div>
                    <div className="text-xl font-bold text-purple-600">
                      {ratingInfo[selectedPersonnel.name]?.avg_resolution_time !== null && ratingInfo[selectedPersonnel.name]?.avg_resolution_time !== undefined
                        ? `${Math.floor(ratingInfo[selectedPersonnel.name].avg_resolution_time! / 60)}dk ${ratingInfo[selectedPersonnel.name].avg_resolution_time! % 60}s`
                        : 'Veri yok'}
                    </div>
                  </div>
                </div>
              </div>

              {dailyStats.length > 0 && (
                <div className="glass-effect rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Son 30 Gün Performansı</h3>
                  <div className="space-y-2">
                    {dailyStats.slice(0, 10).map((stat) => (
                      <div key={stat.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-slate-200">
                            {new Date(stat.date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                          </span>
                          <span className="text-sm text-slate-400">{stat.total_chats} chat</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-400">
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
                  <div className="glass-effect rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="w-5 h-5 text-green-600" />
                      <h3 className="text-lg font-bold text-white">Güçlü Konular</h3>
                    </div>
                    <ul className="space-y-2">
                      {selectedPersonnel.strong_topics.map((topic: any, i: number) => (
                        <li key={i} className="text-sm text-slate-200 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedPersonnel.weak_topics && selectedPersonnel.weak_topics.length > 0 && (
                  <div className="glass-effect rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <h3 className="text-lg font-bold text-white">Gelişmeli Konular</h3>
                    </div>
                    <ul className="space-y-2">
                      {selectedPersonnel.weak_topics.map((topic: any, i: number) => (
                        <li key={i} className="text-sm text-slate-200 flex items-center gap-2">
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
            <div className="glass-effect rounded-xl shadow-lg p-12 text-center">
              <User className="w-16 h-16 mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400">Personel seçin</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Details Modal */}
      {chatModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f1623] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-scale-in">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{chatModal.title}</h3>
              <button
                onClick={closeChatModal}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              {chatModal.chats.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Chat bulunamadı</p>
              ) : (
                <div className="space-y-3">
                  {chatModal.chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => loadChatMessages(chat.chat_id || chat.id, chat.customer_name)}
                      className="w-full text-left bg-white/5 border border-white/10 rounded-lg p-4 hover:shadow-lg hover:border-blue-500/40 hover:bg-white/8 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-semibold text-blue-400">
                            #{chat.chat_id?.slice(0, 12) || chat.id.slice(0, 12)}
                          </span>
                          <span className="text-slate-300 text-sm">
                            {maskName(chat.customer_name)}
                          </span>
                        </div>
                        {chatModal.type === 'warning' && chat.overall_score && (
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                            chat.overall_score < 30 ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' :
                            chat.overall_score < 40 ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20' :
                            chat.overall_score < 60 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                            chat.overall_score < 70 ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                            chat.overall_score < 90 ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' :
                            'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {Math.round(chat.overall_score)}/100
                          </span>
                        )}
                      </div>
                      {chat.created_at && (
                        <div className="text-xs text-slate-400 mt-2 flex items-center gap-2">
                          <span>{new Date(chat.created_at).toLocaleString('tr-TR')}</span>
                          <span className="text-blue-500">→ Mesajları görüntüle</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white/5 px-6 py-4 flex justify-end border-t border-white/10">
              <button
                onClick={closeChatModal}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-md hover:shadow-lg"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages Modal */}
      {messagesModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f1623] border border-white/10 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden animate-scale-in">
            <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Chat Konuşması</h3>
                <p className="text-sm text-blue-100 mt-0.5">
                  {maskName(messagesModal.customerName)} • #{messagesModal.chatId.slice(0, 12)}
                </p>
              </div>
              <button
                onClick={closeChatMessagesModal}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)] bg-black/20">
              {messagesModal.loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                  <p className="text-slate-400">Mesajlar yükleniyor...</p>
                </div>
              ) : messagesModal.messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">Bu chat için mesaj bulunamadı</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messagesModal.messages.map((message, index) => {
                    const isAgent = message.author_type === 'agent';
                    return (
                      <div
                        key={message.id || index}
                        className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] ${isAgent ? 'order-2' : 'order-1'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${
                              isAgent ? 'text-blue-400' : 'text-slate-400'
                            }`}>
                              {message.author_name || (isAgent ? 'Personel' : 'Müşteri')}
                            </span>
                            <span className="text-xs text-slate-200">
                              {new Date(message.created_at).toLocaleTimeString('tr-TR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                            isAgent
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm'
                              : 'bg-white/10 border border-white/15 text-white rounded-tl-sm'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white/5 px-6 py-4 flex items-center justify-between border-t border-white/10">
              <div className="text-sm text-slate-400">
                Toplam {messagesModal.messages.length} mesaj
              </div>
              <button
                onClick={closeChatMessagesModal}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-md hover:shadow-lg"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

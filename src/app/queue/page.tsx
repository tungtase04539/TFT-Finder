'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface QueuePlayer {
  id: string;
  user_id: string;
  joined_at: string;
  profiles: {
    riot_id: string;
    profile_icon_id: number;
    tft_tier: string;
    tft_rank: string;
    tft_lp: number;
    tft_wins: number;
    tft_losses: number;
  };
}

interface UserProfile {
  riot_id: string;
  tft_tier: string;
  tft_rank: string;
}

// Rank tier to color mapping
const tierColors: Record<string, string> = {
  'IRON': 'text-gray-400',
  'BRONZE': 'text-amber-600',
  'SILVER': 'text-gray-300',
  'GOLD': 'text-yellow-400',
  'PLATINUM': 'text-teal-400',
  'EMERALD': 'text-emerald-400',
  'DIAMOND': 'text-blue-400',
  'MASTER': 'text-purple-400',
  'GRANDMASTER': 'text-red-400',
  'CHALLENGER': 'text-yellow-300',
  'UNRANKED': 'text-gray-500',
};

const tierNames: Record<string, string> = {
  'IRON': 'Sắt',
  'BRONZE': 'Đồng',
  'SILVER': 'Bạc',
  'GOLD': 'Vàng',
  'PLATINUM': 'Bạch Kim',
  'EMERALD': 'Ngọc Bảo',
  'DIAMOND': 'Kim Cương',
  'MASTER': 'Cao Thủ',
  'GRANDMASTER': 'Đại Cao Thủ',
  'CHALLENGER': 'Thách Đấu',
  'UNRANKED': 'Chưa rank',
};

export default function QueuePage() {
  const [inQueue, setInQueue] = useState(false);
  const [queuePlayers, setQueuePlayers] = useState<QueuePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matchFound, setMatchFound] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<QueuePlayer | null>(null);
  const router = useRouter();

  // Smart background refresh - call once when page loads
  const triggerBackgroundRefresh = useCallback(async () => {
    try {
      await fetch('/api/refresh-rank', { method: 'POST' });
    } catch (error) {
      console.log('Background refresh skipped:', error);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    const supabase = createClient();
    
    const { data } = await supabase
      .from('queue')
      .select(`
        id,
        user_id,
        joined_at,
        profiles (
          riot_id,
          profile_icon_id,
          tft_tier,
          tft_rank,
          tft_lp,
          tft_wins,
          tft_losses
        )
      `)
      .eq('status', 'waiting')
      .order('joined_at', { ascending: true });

    if (data) {
      setQueuePlayers(data as unknown as QueuePlayer[]);
      
      if (user) {
        const isInQueue = data.some((p) => p.user_id === user.id);
        setInQueue(isInQueue);
      }

      if (data.length >= 8) {
        setMatchFound(true);
        setTimeout(() => {
          router.push('/room/demo');
        }, 2000);
      }
    }
  }, [user, router]);

  useEffect(() => {
    const initPage = async () => {
      const supabase = createClient();
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }
      setUser(authUser);

      // Get initial profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('verified, riot_id, tft_tier, tft_rank, tft_rank_updated_at')
        .eq('id', authUser.id)
        .single();

      if (!profileData?.verified) {
        router.push('/verify');
        return;
      }
      
      setProfile(profileData);
      setLoading(false);

      // Refresh current user's rank if outdated (> 24h or never updated)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const needsRefresh = !profileData.tft_rank_updated_at || 
        new Date(profileData.tft_rank_updated_at) < oneDayAgo;

      if (needsRefresh) {
        try {
          const response = await fetch('/api/refresh-rank', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              refreshCurrentUser: true,
              userId: authUser.id,
            }),
          });
          
          const result = await response.json();
          
          if (result.refreshed && result.newRank) {
            // Update local state with new rank
            setProfile(prev => prev ? {
              ...prev,
              tft_tier: result.newRank.tier,
              tft_rank: result.newRank.rank,
            } : null);
          }
        } catch (error) {
          console.log('Current user refresh skipped:', error);
        }
      }

      // Also trigger background refresh for other users
      triggerBackgroundRefresh();
    };

    initPage();
  }, [router, triggerBackgroundRefresh]);

  useEffect(() => {
    if (!user) return;

    fetchQueue();

    const supabase = createClient();
    const channel = supabase
      .channel('queue-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue' },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchQueue]);

  const joinQueue = async () => {
    if (!user) return;
    setJoining(true);

    const supabase = createClient();
    await supabase.from('queue').insert({
      user_id: user.id,
      status: 'waiting',
    });

    setJoining(false);
    setInQueue(true);
    fetchQueue();
  };

  const leaveQueue = async () => {
    if (!user) return;

    const supabase = createClient();
    await supabase
      .from('queue')
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'waiting');

    setInQueue(false);
    fetchQueue();
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await leaveQueue();
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleSwitchAccount = async () => {
    const supabase = createClient();
    await leaveQueue();
    
    // Reset verified status to force re-verification
    if (user) {
      await supabase
        .from('profiles')
        .update({
          verified: false,
          riot_id: null,
          puuid: null,
          summoner_id: null,
          tft_rank_updated_at: null,
        })
        .eq('id', user.id);
    }
    
    router.push('/verify');
  };

  const getIconUrl = (iconId: number) =>
    `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/profileicon/${iconId || 29}.png`;

  const formatRankDisplay = (tier: string, rank: string) => {
    if (!tier || tier === 'UNRANKED') return tierNames['UNRANKED'];
    if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier)) {
      return tierNames[tier] || tier;
    }
    return `${tierNames[tier] || tier} ${rank}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-tft-gold">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-tft-gold/20">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-tft-gold to-tft-gold-dark rounded-lg flex items-center justify-center">
            <span className="text-tft-dark font-bold text-xl">⬡</span>
          </div>
          <h1 className="text-xl font-bold text-tft-gold">TFT FINDER</h1>
        </Link>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-tft-teal text-sm block">{profile?.riot_id}</span>
            <span className={`text-xs ${tierColors[profile?.tft_tier || 'UNRANKED']}`}>
              {formatRankDisplay(profile?.tft_tier || 'UNRANKED', profile?.tft_rank || '')}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <button 
              onClick={handleSwitchAccount} 
              className="text-tft-teal hover:text-tft-teal/80 text-xs border border-tft-teal/30 px-2 py-1 rounded"
            >
              🔄 Đổi tài khoản
            </button>
            <button onClick={handleLogout} className="text-tft-gold/60 hover:text-tft-gold text-xs">
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {matchFound ? (
          <div className="text-center animate-pulse">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-3xl font-bold text-tft-gold mb-4">ĐÃ TÌM THẤY TRẬN!</h2>
            <p className="text-tft-teal">Đang chuyển đến phòng chờ...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-tft-gold-light mb-2">
                {inQueue ? '🔍 Đang Tìm Trận...' : 'Sẵn Sàng Chiến?'}
              </h2>
              <p className="text-tft-gold/60">
                {inQueue
                  ? 'Chờ đủ 8 người để bắt đầu'
                  : 'Nhấn nút bên dưới để vào hàng chờ'}
              </p>
            </div>

            {/* 8 Player Slots with Rank */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[...Array(8)].map((_, i) => {
                const player = queuePlayers[i];
                const isCurrentUser = player && user && player.user_id === user.id;
                
                return (
                  <div
                    key={i}
                    onClick={() => player && setSelectedPlayer(player)}
                    className={`
                      relative cursor-pointer transition-all duration-200
                      ${player ? 'hover:scale-105' : ''}
                    `}
                  >
                    <div className={`
                      hex-slot relative
                      ${player ? 'filled' : 'waiting'}
                      ${isCurrentUser ? 'gold-glow' : ''}
                    `}>
                      {player ? (
                        <div className="text-center">
                          <div className="w-10 h-10 mx-auto rounded-full overflow-hidden border border-tft-teal/50">
                            <Image
                              src={getIconUrl(player.profiles?.profile_icon_id || 29)}
                              alt="icon"
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-tft-gold/30 text-2xl">?</span>
                      )}
                    </div>
                    {/* Player info below hex */}
                    {player && (
                      <div className="text-center mt-2">
                        <p className="text-xs text-tft-gold-light truncate max-w-[70px]">
                          {player.profiles?.riot_id?.split('#')[0] || 'Player'}
                        </p>
                        <p className={`text-xs ${tierColors[player.profiles?.tft_tier || 'UNRANKED']}`}>
                          {formatRankDisplay(player.profiles?.tft_tier || 'UNRANKED', player.profiles?.tft_rank || '')}
                        </p>
                      </div>
                    )}
                    {isCurrentUser && (
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-tft-gold rounded-full flex items-center justify-center">
                        <span className="text-xs text-tft-dark">★</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Queue Counter */}
            <div className="queue-counter rounded-lg mb-8">
              <span className="text-2xl font-bold">{queuePlayers.length}</span>
              <span className="text-tft-teal/70">/8 người</span>
            </div>

            {/* Join/Leave Button */}
            {inQueue ? (
              <button onClick={leaveQueue} className="btn-tft-secondary text-lg px-10">
                ✕ Rời Hàng Chờ
              </button>
            ) : (
              <button
                onClick={joinQueue}
                disabled={joining}
                className="btn-tft-primary text-lg px-10 animate-glow-pulse"
              >
                {joining ? (
                  <span className="flex items-center gap-2">
                    <div className="loading-spinner w-5 h-5 border-2"></div>
                    Đang vào...
                  </span>
                ) : (
                  '🔍 VÀO HÀNG CHỜ'
                )}
              </button>
            )}

            {/* Create Custom Room Link */}
            <div className="mt-6 text-center">
              <Link 
                href="/create-room" 
                className="text-tft-teal hover:text-tft-teal/80 text-sm inline-flex items-center gap-2"
              >
                <span>🎮</span>
                <span>Hoặc tạo phòng Custom với luật riêng</span>
                <span>→</span>
              </Link>
            </div>
          </>
        )}
      </main>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setSelectedPlayer(null)}
        >
          <div 
            className="card-tft p-6 rounded-xl max-w-sm w-full mx-4 gold-glow"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-tft-gold/50">
                <Image
                  src={getIconUrl(selectedPlayer.profiles?.profile_icon_id || 29)}
                  alt="icon"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-xl font-bold text-tft-gold-light">
                  {selectedPlayer.profiles?.riot_id?.split('#')[0]}
                </h3>
                <p className="text-tft-gold/60 text-sm">
                  #{selectedPlayer.profiles?.riot_id?.split('#')[1]}
                </p>
              </div>
            </div>

            {/* Rank Details */}
            <div className="bg-tft-dark p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-tft-gold/70">Rank TFT</span>
                <span className={`font-bold ${tierColors[selectedPlayer.profiles?.tft_tier || 'UNRANKED']}`}>
                  {formatRankDisplay(
                    selectedPlayer.profiles?.tft_tier || 'UNRANKED',
                    selectedPlayer.profiles?.tft_rank || ''
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-tft-gold/70">LP</span>
                <span className="text-tft-gold-light">{selectedPlayer.profiles?.tft_lp || 0} LP</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-tft-gold/70">Thắng/Thua</span>
                <span className="text-tft-gold-light">
                  <span className="text-green-400">{selectedPlayer.profiles?.tft_wins || 0}W</span>
                  {' / '}
                  <span className="text-red-400">{selectedPlayer.profiles?.tft_losses || 0}L</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-tft-gold/70">Tỉ lệ thắng</span>
                <span className="text-tft-gold-light">
                  {selectedPlayer.profiles?.tft_wins && selectedPlayer.profiles?.tft_losses
                    ? Math.round(
                        (selectedPlayer.profiles.tft_wins /
                          (selectedPlayer.profiles.tft_wins + selectedPlayer.profiles.tft_losses)) *
                          100
                      )
                    : 0}%
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedPlayer(null)}
              className="btn-tft-secondary w-full mt-6"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      <footer className="px-6 py-4 border-t border-tft-gold/10 text-center text-tft-gold/40 text-sm">
        Real-time powered by Supabase
      </footer>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Profile {
  id: string;
  riot_id: string;
  puuid: string;
  profile_icon_id?: number;
  tft_tier?: string;
  tft_rank?: string;
}

interface Room {
  id: string;
  status: string;
  players: string[];
  players_agreed: string[];
  lobby_code: string | null;
  host_id: string;
  rules_text: string | null;
  created_at: string;
  started_at: string | null;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  
  // Per-rule agreement tracking
  const [checkedRules, setCheckedRules] = useState<Set<number>>(new Set());
  const [agreeing, setAgreeing] = useState(false);

  const isHost = currentUser?.id === room?.host_id;
  const hasAgreed = room?.players_agreed?.includes(currentUser?.id || '');
  const allAgreed = room?.players?.length === room?.players_agreed?.length && room?.players?.length === 8;

  // Parse rules from text
  const rules = room?.rules_text
    ? room.rules_text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    : [];

  const allRulesChecked = rules.length === 0 || checkedRules.size === rules.length;

  const fetchRoomData = useCallback(async () => {
    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    setCurrentUser(profile);

    // Get room data
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !roomData) {
      setError('Không tìm thấy phòng');
      setLoading(false);
      return;
    }

    setRoom(roomData);
    setLobbyCode(roomData.lobby_code || '');

    // Get all player profiles
    if (roomData.players?.length > 0) {
      const { data: playerProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', roomData.players);

      setPlayers(playerProfiles || []);
    }

    setLoading(false);
  }, [roomId, router]);

  useEffect(() => {
    fetchRoomData();

    // Subscribe to room changes
    const supabase = createClient();
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => {
          fetchRoomData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchRoomData]);

  const toggleRuleCheck = (index: number) => {
    const newChecked = new Set(checkedRules);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedRules(newChecked);
  };

  const handleAgreeRules = async () => {
    if (!currentUser || !room || !allRulesChecked) return;

    setAgreeing(true);
    
    const supabase = createClient();
    const newAgreed = [...(room.players_agreed || []), currentUser.id];

    await supabase
      .from('rooms')
      .update({ 
        players_agreed: newAgreed,
        ...(newAgreed.length === 8 ? { status: 'ready', started_at: new Date().toISOString() } : {})
      })
      .eq('id', roomId);

    setAgreeing(false);
  };

  const handleUpdateLobbyCode = async () => {
    if (!isHost || !lobbyCode.trim()) return;

    const supabase = createClient();
    await supabase
      .from('rooms')
      .update({ lobby_code: lobbyCode.trim() })
      .eq('id', roomId);
  };

  const handleStartPlaying = async () => {
    if (!isHost) return;

    const supabase = createClient();
    await supabase
      .from('rooms')
      .update({ status: 'playing' })
      .eq('id', roomId);
  };

  const getIconUrl = (iconId: number) =>
    `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/profileicon/${iconId || 29}.png`;

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Đã copy link phòng!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-tft-gold">Đang tải phòng...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error || 'Không tìm thấy phòng'}</p>
          <Link href="/queue" className="btn-primary">
            Quay lại hàng chờ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-tft-gold/20">
        <Link href="/queue" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-tft-gold to-tft-gold-dark rounded-lg flex items-center justify-center">
            <span className="text-tft-dark font-bold text-xl">⬡</span>
          </div>
          <h1 className="text-xl font-bold text-tft-gold">TFT FINDER</h1>
        </Link>
        <div className="flex items-center gap-4">
          <button 
            onClick={copyRoomLink}
            className="text-tft-teal hover:text-tft-teal/80 text-sm border border-tft-teal/30 px-3 py-1 rounded"
          >
            📋 Copy Link
          </button>
          <div className="text-right">
            <span className="text-tft-teal text-sm block">{currentUser?.riot_id}</span>
            <span className="text-xs text-tft-gold/60">
              {isHost ? '👑 Host' : 'Player'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8 max-w-4xl">
        {/* Room Status Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-tft-gold mb-2">
            Phòng Custom Game
          </h2>
          <div className={`inline-block px-4 py-1 rounded-full text-sm ${
            room.status === 'forming' ? 'bg-yellow-500/20 text-yellow-400' :
            room.status === 'ready' ? 'bg-green-500/20 text-green-400' :
            room.status === 'playing' ? 'bg-blue-500/20 text-blue-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {room.status === 'forming' && `⏳ Đang chờ đồng ý (${room.players_agreed?.length || 0}/${room.players?.length || 0})`}
            {room.status === 'ready' && '✅ Sẵn sàng bắt đầu'}
            {room.status === 'playing' && '🎮 Đang chơi'}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column: Players */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-tft-gold flex items-center gap-2">
              👥 Người chơi ({players.length}/8)
            </h3>
            <div className="space-y-2">
              {players.map(player => {
                const agreed = room.players_agreed?.includes(player.id);
                const isCurrentPlayer = player.id === currentUser?.id;
                
                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      agreed ? 'bg-green-500/10 border border-green-500/30' : 'bg-tft-dark-secondary'
                    }`}
                  >
                    <img
                      src={getIconUrl(player.profile_icon_id || 29)}
                      alt="icon"
                      className="w-10 h-10 rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-tft-gold-light">{player.riot_id}</span>
                        {player.id === room.host_id && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                            👑 Host
                          </span>
                        )}
                        {isCurrentPlayer && (
                          <span className="text-xs text-tft-teal">(Bạn)</span>
                        )}
                      </div>
                      <div className="text-xs text-tft-gold/60">
                        {player.tft_tier || 'Chưa rank'}
                      </div>
                    </div>
                    <div>
                      {agreed ? (
                        <span className="text-green-400 text-sm">✓ Đồng ý</span>
                      ) : (
                        <span className="text-yellow-400 text-sm">⏳ Chờ</span>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Empty slots */}
              {[...Array(8 - players.length)].map((_, i) => (
                <div key={`empty-${i}`} className="flex items-center gap-3 p-3 rounded-lg bg-tft-dark-secondary/50 border-2 border-dashed border-tft-gold/20">
                  <div className="w-10 h-10 rounded-lg bg-tft-dark flex items-center justify-center">
                    <span className="text-tft-gold/30">?</span>
                  </div>
                  <span className="text-tft-gold/30">Đang chờ...</span>
                </div>
              ))}
            </div>

            {/* Lobby Code Section */}
            {room.status === 'ready' && (
              <div className="mt-6 p-4 bg-tft-teal/10 border border-tft-teal/30 rounded-lg">
                <h4 className="text-tft-teal font-semibold mb-2">🎮 Lobby Code</h4>
                {isHost ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={lobbyCode}
                      onChange={(e) => setLobbyCode(e.target.value)}
                      placeholder="Nhập lobby code..."
                      className="input-tft flex-1 rounded-lg"
                    />
                    <button onClick={handleUpdateLobbyCode} className="btn-primary px-4">
                      Lưu
                    </button>
                  </div>
                ) : (
                  <div className="text-2xl font-mono text-tft-gold-light text-center py-2">
                    {room.lobby_code || 'Chờ Host nhập...'}
                  </div>
                )}
                
                {isHost && allAgreed && room.status === 'ready' && (
                  <button
                    onClick={handleStartPlaying}
                    className="w-full mt-4 btn-primary py-3"
                  >
                    🎮 Bắt đầu chơi
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Rules */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-tft-gold flex items-center gap-2">
              📜 Luật chơi ({rules.length} luật)
            </h3>
            
            {rules.length > 0 ? (
              <div className="space-y-2">
                {rules.map((rule, i) => {
                  const isChecked = checkedRules.has(i) || hasAgreed;
                  
                  return (
                    <div
                      key={i}
                      onClick={() => !hasAgreed && toggleRuleCheck(i)}
                      className={`
                        flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all
                        ${hasAgreed 
                          ? 'bg-green-500/10 border border-green-500/30' 
                          : isChecked 
                            ? 'bg-tft-teal/10 border border-tft-teal/30' 
                            : 'bg-tft-dark-secondary hover:bg-tft-dark'
                        }
                      `}
                    >
                      {/* Checkbox */}
                      <div className={`
                        w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-xs mt-0.5
                        ${isChecked 
                          ? 'bg-tft-teal text-tft-dark' 
                          : 'border border-tft-gold/50'
                        }
                      `}>
                        {isChecked && '✓'}
                      </div>
                      
                      {/* Rule text */}
                      <div className="flex-1">
                        <span className="text-tft-teal font-bold mr-2">{i + 1}.</span>
                        <span className="text-tft-gold-light">{rule}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-tft-gold/40 bg-tft-dark-secondary rounded-lg">
                Không có luật đặc biệt - chơi tự do!
              </div>
            )}

            {/* Ban Warning */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                ⚠️ Cảnh báo vi phạm
              </h4>
              <ul className="text-sm text-red-300/80 space-y-1">
                <li>• <span className="text-yellow-400 font-semibold">Lần 1:</span> Cấm 24 giờ</li>
                <li>• <span className="text-red-400 font-semibold">Lần 2:</span> Cấm vĩnh viễn tài khoản + Riot ID</li>
              </ul>
            </div>

            {/* Agree Button */}
            {room.status === 'forming' && !hasAgreed && (
              <button
                onClick={handleAgreeRules}
                disabled={!allRulesChecked || agreeing}
                className={`
                  w-full py-4 text-lg rounded-lg font-semibold transition-all
                  ${allRulesChecked 
                    ? 'btn-primary' 
                    : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {agreeing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Đang xác nhận...
                  </span>
                ) : allRulesChecked ? (
                  '✅ Tôi đã đọc và đồng ý tất cả luật'
                ) : (
                  `📋 Hãy tích vào ${rules.length - checkedRules.size} luật còn lại`
                )}
              </button>
            )}

            {hasAgreed && room.status === 'forming' && (
              <div className="text-center py-4 text-green-400 bg-green-500/10 rounded-lg">
                ✓ Bạn đã đồng ý. Chờ người chơi khác...
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

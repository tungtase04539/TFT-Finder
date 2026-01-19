'use client';

import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { debounce } from '@/lib/debounce';
import { useMatchDetection } from '@/hooks/useMatchDetection';
import { useCopyTracking } from '@/hooks/useCopyTracking';
import { removeUserFromActiveRooms } from '@/lib/room-utils';
import CopyRiotIdButton from '@/components/CopyRiotIdButton';

// Lazy load RoomChat component
const RoomChat = dynamic(() => import('@/components/RoomChat'), {
  loading: () => (
    <div className="flex flex-col h-full bg-tft-dark rounded-lg border border-tft-gold/20 overflow-hidden">
      <div className="px-4 py-2 border-b border-tft-gold/20 bg-tft-dark-secondary">
        <h4 className="text-tft-teal font-semibold">💬 Chat phòng</h4>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    </div>
  ),
  ssr: false,
});

const THREE_MINUTES_MS = 3 * 60 * 1000; // 3 minutes in milliseconds

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
  max_players: number;
  created_at: string;
  started_at: string | null;
  last_copy_action: string | null;
}

// Memoized PlayerList component
const PlayerList = memo(({ 
  players, 
  room, 
  currentUserId,
  isHost,
  getIconUrl,
  onCloseSlot,
  onOpenSlot
}: { 
  players: Profile[];
  room: Room;
  currentUserId: string;
  isHost: boolean;
  getIconUrl: (iconId: number) => string;
  onCloseSlot: () => void;
  onOpenSlot: () => void;
}) => {
  const maxPlayers = room.max_players || 8;
  const emptySlots = maxPlayers - players.length;
  
  return (
    <>
      {players.map(player => {
        const agreed = room.players_agreed?.includes(player.id);
        const isCurrentPlayer = player.id === currentUserId;
        
        return (
          <div
            key={player.id}
            className={`flex items-center gap-3 p-3 rounded-lg ${
              agreed ? 'bg-green-500/10 border border-green-500/30' : 'bg-tft-dark-secondary'
            }`}
          >
            <Image
              src={getIconUrl(player.profile_icon_id || 29)}
              alt="icon"
              width={40}
              height={40}
              className="rounded-full"
              unoptimized
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-tft-gold-light">{player.riot_id}</span>
                {player.id === room.host_id && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                    👑 Host
                  </span>
                )}
                {isCurrentPlayer && (
                  <span className="text-xs text-tft-teal">(Bạn)</span>
                )}
                {/* Copy Riot ID button - only show when room is ready */}
                {room.status === 'ready' && (
                  <CopyRiotIdButton 
                    riotId={player.riot_id} 
                    roomId={room.id}
                  />
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
      {[...Array(emptySlots)].map((_, i) => (
        <div key={`empty-${i}`} className="flex items-center gap-3 p-3 rounded-lg bg-tft-dark-secondary/50 border-2 border-dashed border-tft-gold/20">
          <div className="w-10 h-10 rounded-lg bg-tft-dark flex items-center justify-center">
            <span className="text-tft-gold/30">?</span>
          </div>
          <span className="flex-1 text-tft-gold/30">Đang chờ...</span>
          {isHost && room.status === 'forming' && emptySlots > 0 && (
            <button
              onClick={onCloseSlot}
              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 border border-red-500/30 rounded"
              title="Đóng slot này"
            >
              ✕ Đóng
            </button>
          )}
        </div>
      ))}
      
      {/* Closed slots */}
      {[...Array(8 - maxPlayers)].map((_, i) => (
        <div key={`closed-${i}`} className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border-2 border-red-500/30">
          <div className="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center">
            <span className="text-red-400">🔒</span>
          </div>
          <span className="flex-1 text-red-400/60">Slot đã đóng</span>
          {isHost && room.status === 'forming' && (
            <button
              onClick={onOpenSlot}
              className="text-xs text-tft-teal hover:text-tft-teal/80 px-2 py-1 border border-tft-teal/30 rounded"
              title="Mở lại slot"
            >
              Mở
            </button>
          )}
        </div>
      ))}
    </>
  );
});

PlayerList.displayName = 'PlayerList';

// Memoized RulesList component
const RulesList = memo(({ 
  rules, 
  checkedRules, 
  hasAgreed, 
  onToggleRule 
}: { 
  rules: string[];
  checkedRules: Set<number>;
  hasAgreed: boolean | undefined;
  onToggleRule: (index: number) => void;
}) => {
  return (
    <>
      {rules.map((rule, i) => {
        const isChecked = checkedRules.has(i) || hasAgreed;
        
        return (
          <div
            key={i}
            onClick={() => !hasAgreed && onToggleRule(i)}
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
    </>
  );
});

RulesList.displayName = 'RulesList';

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
  
  // Host rule editing
  const [editingRules, setEditingRules] = useState(false);
  const [editRulesText, setEditRulesText] = useState('');
  
  // Match detection state
  const [matchCompleted, setMatchCompleted] = useState(false);
  const [winner, setWinner] = useState<Profile | null>(null);

  const isHost = currentUser?.id === room?.host_id;
  const hasAgreed = room?.players_agreed?.includes(currentUser?.id || '');
  const maxPlayers = room?.max_players || 8;
  const allAgreed = room?.players?.length === room?.players_agreed?.length && room?.players?.length === maxPlayers;

  // Parse rules from text - memoized
  const rules = useMemo(() => 
    room?.rules_text
      ? room.rules_text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      : [],
    [room?.rules_text]
  );

  const allRulesChecked = rules.length === 0 || checkedRules.size === rules.length;

  // Get player PUUIDs for match detection
  const playerPuuids = useMemo(() => 
    players.map(p => p.puuid).filter(Boolean),
    [players]
  );

  // Copy action tracking - monitors copy actions and triggers detection after 3 minutes
  const {
    lastCopyTime,
    timeSinceLastCopy,
    shouldTriggerDetection,
    timeUntilDetection
  } = useCopyTracking({
    roomId,
    roomStatus: room?.status || '',
    lastCopyAction: room?.last_copy_action || null,
    enabled: room?.status === 'ready'
  });

  // Match detection - enable when room is ready OR playing
  const { matchResult, checking } = useMatchDetection({
    puuids: playerPuuids,
    enabled: (room?.status === 'ready' || room?.status === 'playing') && !matchCompleted,
    pollInterval: 30000, // Check every 30 seconds
    onMatchStartDetected: async () => {
      // Auto-update room status to "playing" when match starts
      if (room?.status === 'ready') {
        console.log('[ROOM] Match started! Auto-updating status to playing...');
        const supabase = createClient();
        await supabase
          .from('rooms')
          .update({ status: 'playing' })
          .eq('id', roomId);
      }
    },
    onMatchFound: (result) => {
      console.log('[ROOM] Match completed!', result);
      
      // Find winner
      const winnerPlayer = players.find(
        p => p.puuid === result.winner?.puuid
      );
      
      setWinner(winnerPlayer || null);
      setMatchCompleted(true);
      
      // Update room status to completed
      const supabase = createClient();
      supabase
        .from('rooms')
        .update({ status: 'completed' })
        .eq('id', roomId)
        .then(() => {
          console.log('[ROOM] Room status updated to completed');
        });
    }
  });

  // Auto-trigger game detection when shouldTriggerDetection = true
  useEffect(() => {
    if (shouldTriggerDetection && !checking && !matchCompleted) {
      console.log('[ROOM] 3 minutes passed since last copy. Triggering game detection...');
      // The useMatchDetection hook will automatically start checking
      // We just need to ensure it's enabled (which it is when room.status = 'ready')
    }
  }, [shouldTriggerDetection, checking, matchCompleted]);

  const fetchRoomData = useCallback(async () => {
    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Get user profile - select only needed fields
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, riot_id, puuid, profile_icon_id, tft_tier, tft_rank, verified')
      .eq('id', user.id)
      .single();

    if (!profile?.verified) {
      router.push('/verify');
      return;
    }

    setCurrentUser(profile);

    // Get room data - select only needed fields
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('id, status, players, players_agreed, lobby_code, host_id, rules_text, max_players, created_at, started_at, last_copy_action')
      .eq('id', roomId)
      .single();

    if (roomError) {
      console.error('[ROOM] Fetch error:', roomError);
      setError(`Lỗi tải phòng: ${roomError.message}`);
      setLoading(false);
      return;
    }

    if (!roomData) {
      console.error('[ROOM] Room not found:', roomId);
      setError('Không tìm thấy phòng');
      setLoading(false);
      return;
    }

    console.log('[ROOM] Loaded room:', roomData);

    // Auto-join room if not already in and room is not full
    const maxPlayers = roomData.max_players || 8;
    if (roomData.status === 'forming' && 
        !roomData.players?.includes(user.id) && 
        (roomData.players?.length || 0) < maxPlayers) {
      
      console.log('[ROOM] Auto-joining room...');
      
      // Remove from any other active rooms first (single room constraint)
      await removeUserFromActiveRooms(user.id);
      
      // Remove from queue
      await supabase
        .from('queue')
        .delete()
        .eq('user_id', user.id);

      // Add to room
      const newPlayers = [...(roomData.players || []), user.id];
      await supabase
        .from('rooms')
        .update({ players: newPlayers })
        .eq('id', roomId);

      // Refresh room data
      const { data: updatedRoom } = await supabase
        .from('rooms')
        .select('id, status, players, players_agreed, lobby_code, host_id, rules_text, max_players, created_at, started_at, last_copy_action')
        .eq('id', roomId)
        .single();

      if (updatedRoom) {
        roomData.players = updatedRoom.players;
      }
    }

    setRoom(roomData);
    setLobbyCode(roomData.lobby_code || '');

    // Get all player profiles - select only needed fields
    if (roomData.players?.length > 0) {
      const { data: playerProfiles } = await supabase
        .from('profiles')
        .select('id, riot_id, puuid, profile_icon_id, tft_tier, tft_rank')
        .in('id', roomData.players);

      setPlayers(playerProfiles || []);
    }

    setLoading(false);
  }, [roomId, router]);

  useEffect(() => {
    fetchRoomData();

    // Debounced fetch to avoid too many updates
    const debouncedFetch = debounce(fetchRoomData, 500);

    // Subscribe to room changes
    const supabase = createClient();
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => {
          debouncedFetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchRoomData]);

  const toggleRuleCheck = useCallback((index: number) => {
    const newChecked = new Set(checkedRules);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedRules(newChecked);
  }, [checkedRules]);

  const handleAgreeRules = useCallback(async () => {
    if (!currentUser || !room || !allRulesChecked) return;

    setAgreeing(true);
    
    const supabase = createClient();
    const newAgreed = [...(room.players_agreed || []), currentUser.id];
    const maxPlayers = room.max_players || 8;

    await supabase
      .from('rooms')
      .update({ 
        players_agreed: newAgreed,
        ...(newAgreed.length === maxPlayers ? { status: 'ready', started_at: new Date().toISOString() } : {})
      })
      .eq('id', roomId);

    setAgreeing(false);
  }, [currentUser, room, allRulesChecked, roomId]);

  const handleStartEditRules = useCallback(async () => {
    if (!isHost || !room) return;
    
    const supabase = createClient();
    await supabase
      .from('rooms')
      .update({ status: 'editing' })
      .eq('id', roomId);
    
    setEditRulesText(room.rules_text || '');
    setEditingRules(true);
  }, [isHost, room, roomId]);

  const handleSaveRules = useCallback(async () => {
    if (!isHost || !room) return;

    const supabase = createClient();
    
    // Save new rules and reset all agreements (except host)
    await supabase
      .from('rooms')
      .update({ 
        rules_text: editRulesText,
        players_agreed: [currentUser?.id], // Only host remains agreed
        status: 'forming',
      })
      .eq('id', roomId);

    setEditingRules(false);
    // Reset all players' checked rules
    setCheckedRules(new Set());
  }, [isHost, room, editRulesText, currentUser?.id, roomId]);

  const handleCancelEditRules = useCallback(() => {
    setEditingRules(false);
    setEditRulesText('');
  }, []);

  const handleUpdateLobbyCode = useCallback(async () => {
    if (!isHost || !lobbyCode.trim()) return;

    const supabase = createClient();
    await supabase
      .from('rooms')
      .update({ lobby_code: lobbyCode.trim() })
      .eq('id', roomId);
  }, [isHost, lobbyCode, roomId]);

  const handleStartPlaying = useCallback(async () => {
    if (!isHost) return;

    const supabase = createClient();
    await supabase
      .from('rooms')
      .update({ status: 'playing' })
      .eq('id', roomId);
  }, [isHost, roomId]);

  const handleLeaveRoom = useCallback(async () => {
    if (!currentUser || !room) return;

    const supabase = createClient();

    if (isHost) {
      // Host leaves - transfer host to next player
      const newPlayers = room.players?.filter(id => id !== currentUser.id) || [];
      const newAgreed = room.players_agreed?.filter(id => id !== currentUser.id) || [];

      if (newPlayers.length > 0) {
        // Transfer host to first remaining player
        const newHostId = newPlayers[0];
        
        await supabase
          .from('rooms')
          .update({ 
            host_id: newHostId,
            players: newPlayers,
            players_agreed: newAgreed,
          })
          .eq('id', roomId);
      } else {
        // No players left - cancel room
        await supabase
          .from('rooms')
          .update({ status: 'cancelled' })
          .eq('id', roomId);
      }
    } else {
      // Regular player leaves - just remove from lists
      const newPlayers = room.players?.filter(id => id !== currentUser.id) || [];
      const newAgreed = room.players_agreed?.filter(id => id !== currentUser.id) || [];

      await supabase
        .from('rooms')
        .update({ 
          players: newPlayers,
          players_agreed: newAgreed,
        })
        .eq('id', roomId);
    }

    router.push('/queue');
  }, [currentUser, room, isHost, roomId, router]);

  const getIconUrl = useCallback((iconId: number) =>
    `https://ddragon.leagueoflegends.com/cdn/15.1.1/img/profileicon/${iconId || 29}.png`, []);

  const copyRoomLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    alert('Đã copy link phòng!');
  }, []);

  const handleCloseSlot = useCallback(async () => {
    if (!isHost || !room) return;
    
    const currentMax = room.max_players || 8;
    const currentPlayers = room.players?.length || 0;
    
    // Can't close if it would kick existing players
    if (currentMax - 1 < currentPlayers) {
      alert('Không thể đóng slot khi đã có người chơi!');
      return;
    }
    
    // Minimum 2 players
    if (currentMax <= 2) {
      alert('Phải có ít nhất 2 slot!');
      return;
    }

    const supabase = createClient();
    await supabase
      .from('rooms')
      .update({ max_players: currentMax - 1 })
      .eq('id', roomId);
  }, [isHost, room, roomId]);

  const handleOpenSlot = useCallback(async () => {
    if (!isHost || !room) return;
    
    const currentMax = room.max_players || 8;
    
    // Maximum 8 players
    if (currentMax >= 8) {
      return;
    }

    const supabase = createClient();
    await supabase
      .from('rooms')
      .update({ max_players: currentMax + 1 })
      .eq('id', roomId);
  }, [isHost, room, roomId]);

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
            onClick={handleLeaveRoom}
            className="text-red-400 hover:text-red-300 text-sm border border-red-500/30 px-3 py-1 rounded"
          >
            🚪 Rời phòng
          </button>
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
            room.status === 'editing' ? 'bg-orange-500/20 text-orange-400' :
            room.status === 'ready' ? 'bg-green-500/20 text-green-400' :
            room.status === 'playing' ? 'bg-blue-500/20 text-blue-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {room.status === 'forming' && `⏳ Đang chờ đồng ý (${room.players_agreed?.length || 0}/${room.players?.length || 0})`}
            {room.status === 'editing' && '✏️ Host đang sửa luật...'}
            {room.status === 'ready' && '✅ Sẵn sàng bắt đầu'}
            {room.status === 'playing' && '🎮 Đang chơi'}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column: Players */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-tft-gold flex items-center gap-2">
              👥 Người chơi ({players.length}/{room.max_players || 8})
            </h3>
            <div className="space-y-2">
              <PlayerList 
                players={players}
                room={room}
                currentUserId={currentUser?.id || ''}
                isHost={isHost}
                getIconUrl={getIconUrl}
                onCloseSlot={handleCloseSlot}
                onOpenSlot={handleOpenSlot}
              />
            </div>

            {/* Match Detection Status */}
            {(room.status === 'ready' || room.status === 'playing') && !matchCompleted && (
              <div className="space-y-3">
                {/* Copy Action Countdown */}
                {room.status === 'ready' && lastCopyTime && (
                  <div className="p-4 bg-tft-teal/10 border border-tft-teal/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-tft-teal font-semibold">
                        ⏱️ Thời gian mời người chơi
                      </h4>
                      <span className="text-xs text-tft-teal/60">
                        Copy lần cuối: {new Date(lastCopyTime).toLocaleTimeString('vi-VN')}
                      </span>
                    </div>
                    
                    {shouldTriggerDetection ? (
                      <div className="text-yellow-400 text-sm">
                        ⚠️ Đã hết thời gian! Đang kiểm tra ai đã vào game...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-tft-dark rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-tft-teal h-full transition-all duration-1000"
                            style={{ 
                              width: `${((THREE_MINUTES_MS - timeUntilDetection) / THREE_MINUTES_MS) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-tft-teal font-mono text-sm min-w-[60px] text-right">
                          {Math.floor(timeUntilDetection / 60000)}:{String(Math.floor((timeUntilDetection % 60000) / 1000)).padStart(2, '0')}
                        </span>
                      </div>
                    )}
                    
                    <p className="text-xs text-tft-teal/60 mt-2">
                      Sau 3 phút không có copy, hệ thống sẽ tự động kiểm tra ai đã vào game
                    </p>
                  </div>
                )}

                {/* Game Detection Status */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {checking && (
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    )}
                    <h4 className="text-blue-400 font-semibold">
                      🎮 Đang theo dõi trận đấu...
                    </h4>
                  </div>
                  <p className="text-sm text-blue-300/80">
                    Hệ thống sẽ tự động phát hiện khi trận đấu bắt đầu và kết thúc
                  </p>
                  <p className="text-xs text-blue-300/60 mt-1">
                    (Kiểm tra mỗi 30 giây)
                  </p>
                </div>
              </div>
            )}

            {/* Match Completed */}
            {matchCompleted && matchResult && (
              <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-lg">
                <h3 className="text-2xl font-bold text-green-400 mb-4">
                  ✅ Trận đấu đã kết thúc!
                </h3>
                
                {winner && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                    <p className="text-yellow-400 text-lg mb-2">🏆 Người chiến thắng:</p>
                    <div className="flex items-center gap-3">
                      <Image
                        src={getIconUrl(winner.profile_icon_id || 29)}
                        alt="winner"
                        width={48}
                        height={48}
                        className="rounded-full"
                        unoptimized
                      />
                      <p className="text-3xl font-bold text-yellow-300">
                        {winner.riot_id}
                      </p>
                    </div>
                  </div>
                )}

                {/* Player Placements */}
                <div className="mt-4">
                  <h4 className="font-semibold text-tft-gold mb-2">📊 Kết quả:</h4>
                  <div className="space-y-2">
                    {matchResult.players
                      ?.filter(p => p.found)
                      .sort((a, b) => (a.placement || 0) - (b.placement || 0))
                      .map(p => {
                        const player = players.find(pl => pl.puuid === p.puuid);
                        return (
                          <div key={p.puuid} className="flex items-center gap-3 p-2 bg-tft-dark-secondary rounded">
                            <span className={`
                              font-bold text-lg w-8
                              ${p.placement === 1 ? 'text-yellow-400' : 
                                p.placement === 2 ? 'text-gray-300' :
                                p.placement === 3 ? 'text-orange-400' :
                                'text-gray-500'}
                            `}>
                              #{p.placement}
                            </span>
                            <Image
                              src={getIconUrl(player?.profile_icon_id || 29)}
                              alt="player"
                              width={32}
                              height={32}
                              className="rounded-full"
                              unoptimized
                            />
                            <span className="flex-1 text-tft-gold-light">{player?.riot_id}</span>
                            <span className="text-xs text-tft-gold/60">Lv.{p.level}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-green-500/20 text-sm text-gray-400">
                  <p>Match ID: {matchResult.matchId}</p>
                  {matchResult.match && (
                    <>
                      <p>Thời gian: {new Date(matchResult.match.gameDatetime).toLocaleString('vi-VN')}</p>
                      <p>Độ dài: {Math.floor(matchResult.match.gameLength / 60)} phút</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Lobby Code Section */}
            {room.status === 'ready' && !matchCompleted && (
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
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-tft-gold flex items-center gap-2">
                📜 Luật chơi ({rules.length} luật)
              </h3>
              {isHost && !editingRules && room.status === 'forming' && (
                <button
                  onClick={handleStartEditRules}
                  className="text-sm text-tft-teal hover:text-tft-teal/80 flex items-center gap-1"
                >
                  ✏️ Sửa luật
                </button>
              )}
            </div>
            
            {/* Editing Mode */}
            {editingRules ? (
              <div className="space-y-3">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <span className="text-yellow-400 text-sm">⚠️ Đang chỉnh sửa - Mọi người phải đồng ý lại sau khi lưu</span>
                </div>
                <textarea
                  value={editRulesText}
                  onChange={(e) => setEditRulesText(e.target.value)}
                  placeholder="Mỗi dòng = 1 luật..."
                  className="input-tft w-full rounded-lg h-40 resize-none font-mono text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveRules}
                    className="flex-1 btn-primary py-2"
                  >
                    💾 Lưu luật
                  </button>
                  <button
                    onClick={handleCancelEditRules}
                    className="px-4 py-2 bg-gray-600 text-gray-200 rounded-lg hover:bg-gray-500"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : rules.length > 0 ? (
              <div className="space-y-2">
                <RulesList 
                  rules={rules}
                  checkedRules={checkedRules}
                  hasAgreed={hasAgreed}
                  onToggleRule={toggleRuleCheck}
                />
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

        {/* Chat Section */}
        <div className="mt-8">
          <RoomChat roomId={roomId} currentUserId={currentUser?.id || ''} />
        </div>
      </main>
    </div>
  );
}

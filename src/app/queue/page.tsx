'use client';

import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { debounce } from '@/lib/debounce';
import { checkBanStatus } from '@/lib/ban-middleware';
import BanMessage from '@/components/BanMessage';

interface Room {
  id: string;
  status: string;
  players: string[];
  players_agreed: string[];
  host_id: string;
  rules_text: string | null;
  created_at: string;
  host_profile?: {
    riot_id: string;
    profile_icon_id: number;
    tft_tier: string;
  };
}

interface Profile {
  id: string;
  riot_id: string;
  profile_icon_id: number;
  tft_tier: string;
  verified: boolean;
}

// Memoized RoomCard component
const RoomCard = memo(({ 
  room, 
  userId, 
  getIconUrl, 
  parseRules, 
  onRoomClick 
}: { 
  room: Room;
  userId: string;
  getIconUrl: (iconId: number) => string;
  parseRules: (rulesText: string | null) => string[];
  onRoomClick: (roomId: string) => void;
}) => {
  const rules = useMemo(() => parseRules(room.rules_text), [room.rules_text, parseRules]);
  const isFull = (room.players?.length || 0) >= 8;
  const isInRoom = room.players?.includes(userId);

  const handleClick = useCallback(() => {
    if (!isFull) {
      onRoomClick(room.id);
    }
  }, [isFull, room.id, onRoomClick]);

  return (
    <div
      className={`
        card-tft rounded-xl overflow-hidden transition-all
        ${isFull ? 'opacity-60' : 'hover:scale-[1.02] cursor-pointer'}
        ${isInRoom ? 'ring-2 ring-tft-teal' : ''}
      `}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-tft-gold/20">
        <Image
          src={getIconUrl(room.host_profile?.profile_icon_id || 29)}
          alt="host"
          width={40}
          height={40}
          className="rounded-full"
          unoptimized
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-tft-gold-light font-medium">
              {room.host_profile?.riot_id?.split('#')[0] || 'Host'}
            </span>
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
              👑 Host
            </span>
          </div>
          <div className="text-xs text-tft-gold/60">
            {room.host_profile?.tft_tier || 'Unranked'}
          </div>
        </div>
        <div className={`
          text-sm font-bold px-3 py-1 rounded-full
          ${isFull ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}
        `}>
          {room.players?.length || 0}/8
        </div>
      </div>

      {/* Rules Preview */}
      <div className="p-4">
        <h4 className="text-tft-teal font-semibold mb-2 flex items-center gap-2">
          📜 Luật chơi ({rules.length})
        </h4>
        {rules.length > 0 ? (
          <ul className="space-y-1 text-sm text-tft-gold-light/80">
            {rules.slice(0, 3).map((rule, i) => (
              <li key={i} className="truncate">
                • {rule}
              </li>
            ))}
            {rules.length > 3 && (
              <li className="text-tft-gold/50 italic">
                +{rules.length - 3} luật khác...
              </li>
            )}
          </ul>
        ) : (
          <p className="text-sm text-tft-gold/50 italic">
            Không có luật đặc biệt
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4">
        {isInRoom ? (
          <button className="w-full py-2 bg-tft-teal/20 text-tft-teal rounded-lg text-sm font-medium">
            ✓ Bạn đang trong phòng này
          </button>
        ) : isFull ? (
          <button disabled className="w-full py-2 bg-gray-600/50 text-gray-400 rounded-lg text-sm">
            Phòng đầy
          </button>
        ) : (
          <button className="w-full py-2 btn-primary rounded-lg text-sm">
            Vào Phòng →
          </button>
        )}
      </div>

      {/* Agreement Status */}
      {room.players_agreed?.length > 0 && (
        <div className="px-4 pb-4 -mt-2">
          <div className="text-xs text-tft-gold/60">
            ✓ {room.players_agreed.length}/{room.players?.length || 0} đã đồng ý luật
          </div>
        </div>
      )}
    </div>
  );
});

RoomCard.displayName = 'RoomCard';

export default function LobbyBrowserPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [banStatus, setBanStatus] = useState<{
    isBanned: boolean;
    banType: 'temporary' | 'permanent' | null;
    bannedUntil: string | null;
    banReason: string | null;
  } | null>(null);

  // Check ban status on mount
  useEffect(() => {
    const checkBan = async () => {
      const status = await checkBanStatus();
      if (status.isBanned) {
        setBanStatus({
          isBanned: true,
          banType: status.banType,
          bannedUntil: status.bannedUntil,
          banReason: status.banReason
        });
      }
    };
    checkBan();
  }, []);

  // Show ban message if user is banned
  if (banStatus?.isBanned && banStatus.banType) {
    return (
      <BanMessage
        banType={banStatus.banType}
        bannedUntil={banStatus.bannedUntil}
        banReason={banStatus.banReason}
      />
    );
  }

  const fetchRooms = useCallback(async () => {
    const supabase = createClient();

    // Get current user
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.push('/login');
      return;
    }

    // Get user profile - select only needed fields
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, riot_id, profile_icon_id, tft_tier, verified')
      .eq('id', authUser.id)
      .single();

    if (!profile?.verified) {
      router.push('/verify');
      return;
    }

    setUser(profile);

    // Optimized: Single query with join, select only needed fields, add pagination
    const { data: roomsData } = await supabase
      .from('rooms')
      .select(`
        id,
        status,
        players,
        players_agreed,
        host_id,
        rules_text,
        created_at,
        host_profile:profiles!host_id(riot_id, profile_icon_id, tft_tier)
      `)
      .in('status', ['forming', 'ready'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (roomsData) {
      setRooms(roomsData as any);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchRooms();

    // Debounced fetch to avoid too many updates
    const debouncedFetch = debounce(fetchRooms, 500);

    // Subscribe to room changes
    const supabase = createClient();
    const channel = supabase
      .channel('rooms_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        () => {
          debouncedFetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRooms]);

  const handleCreateRoom = useCallback(() => {
    router.push('/create-room');
  }, [router]);

  const handleRoomClick = useCallback((roomId: string) => {
    router.push(`/room/${roomId}`);
  }, [router]);

  const getIconUrl = useCallback((iconId: number) =>
    `https://ddragon.leagueoflegends.com/cdn/15.1.1/img/profileicon/${iconId || 29}.png`, []);

  const parseRules = useCallback((rulesText: string | null): string[] => {
    if (!rulesText) return [];
    return rulesText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  }, []);

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
          <button
            onClick={handleCreateRoom}
            className="btn-primary px-4 py-2"
          >
            ➕ Tạo Phòng Mới
          </button>
          <div className="flex items-center gap-2">
            <Image
              src={getIconUrl(user?.profile_icon_id || 29)}
              alt="icon"
              width={32}
              height={32}
              className="rounded-full"
              unoptimized
            />
            <span className="text-tft-gold-light text-sm">{user?.riot_id}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-tft-gold mb-2">
            🎮 Phòng Custom Game
          </h2>
          <p className="text-tft-gold/60">
            Chọn phòng có luật phù hợp hoặc tạo phòng mới
          </p>
        </div>

        {/* Rooms Grid */}
        {rooms.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-xl text-tft-gold-light mb-2">Chưa có phòng nào</h3>
            <p className="text-tft-gold/60 mb-6">Hãy tạo phòng đầu tiên!</p>
            <button
              onClick={handleCreateRoom}
              className="btn-primary px-8 py-3 text-lg"
            >
              ➕ Tạo Phòng Mới
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map(room => (
              <RoomCard
                key={room.id}
                room={room}
                userId={user?.id || ''}
                getIconUrl={getIconUrl}
                parseRules={parseRules}
                onRoomClick={handleRoomClick}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

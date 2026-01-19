'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function CreateRoomPage() {
  const router = useRouter();
  const [rulesText, setRulesText] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ id: string; riot_id: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, riot_id')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        setUser(profile);
      }
    };

    fetchUser();
  }, [router]);

  // Parse rules from text (each line = 1 rule)
  const parseRules = (text: string): string[] => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  const rules = parseRules(rulesText);

  const handleCreateRoom = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const supabase = createClient();

      // Check if user already has an active room as host
      const { data: existingRooms } = await supabase
        .from('rooms')
        .select('id')
        .eq('host_id', user.id)
        .in('status', ['forming', 'ready', 'playing']);

      // Cancel any existing rooms hosted by this user
      if (existingRooms && existingRooms.length > 0) {
        await supabase
          .from('rooms')
          .update({ status: 'cancelled' })
          .eq('host_id', user.id)
          .in('status', ['forming', 'ready', 'playing']);
      }

      // Also remove user from any other rooms they're in
      const { data: otherRooms } = await supabase
        .from('rooms')
        .select('id, players, players_agreed')
        .contains('players', [user.id])
        .in('status', ['forming', 'ready']);

      if (otherRooms) {
        for (const room of otherRooms) {
          const newPlayers = room.players?.filter((id: string) => id !== user.id) || [];
          const newAgreed = room.players_agreed?.filter((id: string) => id !== user.id) || [];
          await supabase
            .from('rooms')
            .update({ players: newPlayers, players_agreed: newAgreed })
            .eq('id', room.id);
        }
      }

      // Create room with host as first player
      const { data: room, error } = await supabase
        .from('rooms')
        .insert({
          host_id: user.id,
          players: [user.id],
          players_agreed: [user.id], // Host auto-agrees
          rules_text: rulesText || null, // Store raw text
          status: 'forming',
        })
        .select()
        .single();

      if (error) throw error;

      // Redirect to room
      router.push(`/room/${room.id}`);
    } catch (err) {
      console.error('Failed to create room:', err);
      alert('Lỗi khi tạo phòng. Vui lòng thử lại.');
    }

    setLoading(false);
  };

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
        <Link href="/queue" className="text-tft-gold/60 hover:text-tft-gold text-sm">
          ← Quay lại
        </Link>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-tft-gold mb-2">
            🎮 Tạo Phòng Custom
          </h2>
          <p className="text-tft-gold/60">
            Viết luật chơi cho trận đấu - mỗi dòng là 1 luật
          </p>
        </div>

        {/* Rules Text Area */}
        <div className="mb-6">
          <label className="block text-tft-gold font-semibold mb-2">
            📜 Luật chơi (mỗi dòng = 1 luật)
          </label>
          <textarea
            value={rulesText}
            onChange={(e) => setRulesText(e.target.value)}
            placeholder={`Ví dụ:\nChỉ được dùng tướng 1 vàng\nKhông được lên level 7\nPhải có ít nhất 1 tướng 3 sao\nCấm dùng item hoàn chỉnh`}
            className="input-tft w-full rounded-lg h-40 resize-none font-mono text-sm"
          />
        </div>

        {/* Rules Preview */}
        {rules.length > 0 && (
          <div className="mb-6 bg-tft-dark-secondary rounded-lg p-4">
            <h3 className="text-tft-gold font-semibold mb-3">
              👁️ Xem trước ({rules.length} luật)
            </h3>
            <div className="space-y-2">
              {rules.map((rule, i) => (
                <div 
                  key={i} 
                  className="flex items-start gap-3 text-sm bg-tft-dark p-3 rounded-lg"
                >
                  <span className="text-tft-teal font-bold">{i + 1}.</span>
                  <span className="text-tft-gold-light">{rule}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ban Warning */}
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
            ⚠️ Cảnh báo về vi phạm luật
          </h4>
          <ul className="text-sm text-red-300/80 space-y-1">
            <li>• <span className="text-yellow-400">Lần 1:</span> Cấm 24 giờ</li>
            <li>• <span className="text-red-400">Lần 2:</span> Cấm vĩnh viễn tài khoản + Riot ID</li>
          </ul>
          <p className="text-xs text-red-300/60 mt-2">
            Người chơi vi phạm luật do Host đặt ra sẽ bị xử lý theo chế độ trên.
          </p>
        </div>

        {/* Create Button */}
        <div className="sticky bottom-0 bg-tft-dark py-4 border-t border-tft-gold/20">
          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className="w-full btn-primary py-4 text-lg disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Đang tạo...
              </span>
            ) : (
              <span>
                ✨ Tạo phòng {rules.length > 0 ? `(${rules.length} luật)` : '(không luật)'}
              </span>
            )}
          </button>
          
          <p className="text-center text-sm text-tft-gold/40 mt-2">
            Sau khi tạo, chia sẻ link phòng để mời người chơi
          </p>
        </div>
      </main>
    </div>
  );
}

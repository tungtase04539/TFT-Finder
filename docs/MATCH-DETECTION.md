# Match Detection System

## Tổng quan

Hệ thống phát hiện khi nào trận đấu TFT đã bắt đầu bằng cách polling match history của players.

## Cách hoạt động

### 1. API Endpoint: `/api/check-match-started`

**Request:**
```typescript
POST /api/check-match-started
{
  puuids: string[],           // Danh sách PUUID của players
  lastCheckedMatchId?: string // Match ID đã check lần trước (optional)
}
```

**Response khi chưa có match mới:**
```typescript
{
  started: false,
  message: "No new match yet",
  latestMatchId: "VN2_123456789" // Match ID gần nhất (để track)
}
```

**Response khi có match mới:**
```typescript
{
  started: true,
  matchId: "VN2_123456789",
  match: {
    matchId: string,
    gameType: string,
    gameDatetime: number,
    gameLength: number
  },
  players: [{
    puuid: string,
    placement: number,  // 1 = Winner, 2 = 2nd place, etc.
    level: number,
    goldLeft: number
  }],
  winner: {
    puuid: string,
    placement: 1
  },
  message: "Match completed!"
}
```

### 2. React Hook: `useMatchDetection`

**Import:**
```typescript
import { useMatchDetection } from '@/hooks/useMatchDetection';
```

**Usage:**
```typescript
const { checking, matchResult, error, reset, checkNow } = useMatchDetection({
  puuids: ['puuid1', 'puuid2', 'puuid3'],  // Players' PUUIDs
  enabled: true,                            // Start/stop polling
  pollInterval: 30000,                      // Check every 30 seconds (optional)
  onMatchFound: (result) => {               // Callback when match found
    console.log('Match found!', result);
    // Update UI, show winner, etc.
  }
});
```

**Return values:**
- `checking`: boolean - Đang check match hay không
- `matchResult`: MatchResult | null - Kết quả match (nếu tìm thấy)
- `error`: string | null - Lỗi (nếu có)
- `reset()`: function - Reset state
- `checkNow()`: function - Check ngay lập tức (không đợi interval)

## Cách tích hợp vào Room Page

### Bước 1: Import hook

```typescript
import { useMatchDetection } from '@/hooks/useMatchDetection';
```

### Bước 2: Lấy PUUIDs của players

```typescript
const playerPuuids = useMemo(() => 
  players.map(p => p.puuid).filter(Boolean),
  [players]
);
```

### Bước 3: Enable detection khi room status = "playing"

```typescript
const { matchResult, checking } = useMatchDetection({
  puuids: playerPuuids,
  enabled: room?.status === 'playing',  // Chỉ check khi đang chơi
  pollInterval: 30000,                   // Check mỗi 30 giây
  onMatchFound: (result) => {
    // Match đã kết thúc!
    console.log('Match completed!', result);
    
    // Tìm winner
    const winner = players.find(p => p.puuid === result.winner?.puuid);
    alert(`🎉 Người chiến thắng: ${winner?.riot_id}`);
    
    // Update room status
    // ... your logic here
  }
});
```

### Bước 4: Hiển thị UI

```typescript
{room?.status === 'playing' && (
  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
    <h4 className="text-blue-400 font-semibold mb-2">
      🎮 Đang theo dõi trận đấu...
    </h4>
    {checking && (
      <p className="text-sm text-blue-300">
        Đang kiểm tra match history...
      </p>
    )}
    {matchResult && (
      <div className="mt-2">
        <p className="text-green-400">✅ Trận đấu đã kết thúc!</p>
        <p className="text-sm">Match ID: {matchResult.matchId}</p>
        {matchResult.winner && (
          <p className="text-lg font-bold text-yellow-400 mt-2">
            🏆 Người chiến thắng: {
              players.find(p => p.puuid === matchResult.winner?.puuid)?.riot_id
            }
          </p>
        )}
      </div>
    )}
  </div>
)}
```

## Timeline

```
Room Status: forming → ready → playing
                                  ↓
                        Start Match Detection
                                  ↓
                        Poll every 30 seconds
                                  ↓
                        Check match history
                                  ↓
                    New common match found?
                          ↙         ↘
                        Yes          No
                         ↓            ↓
                  Match completed!  Continue polling
                         ↓
                  Show winner
                  Update room status
                  Stop polling
```

## Ví dụ đầy đủ

```typescript
'use client';

import { useMatchDetection } from '@/hooks/useMatchDetection';
import { useMemo, useState } from 'react';

export default function RoomPage() {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Profile[]>([]);
  const [matchCompleted, setMatchCompleted] = useState(false);
  const [winner, setWinner] = useState<Profile | null>(null);

  // Get player PUUIDs
  const playerPuuids = useMemo(() => 
    players.map(p => p.puuid).filter(Boolean),
    [players]
  );

  // Detect match
  const { matchResult, checking } = useMatchDetection({
    puuids: playerPuuids,
    enabled: room?.status === 'playing' && !matchCompleted,
    pollInterval: 30000,
    onMatchFound: (result) => {
      console.log('🎉 Match found!', result);
      
      // Find winner
      const winnerPlayer = players.find(
        p => p.puuid === result.winner?.puuid
      );
      
      setWinner(winnerPlayer || null);
      setMatchCompleted(true);
      
      // Update room status to completed
      // ... your Supabase update logic
    }
  });

  return (
    <div>
      {/* Match Detection Status */}
      {room?.status === 'playing' && !matchCompleted && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            {checking && (
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            )}
            <span className="text-blue-400">
              Đang theo dõi trận đấu... (check mỗi 30s)
            </span>
          </div>
        </div>
      )}

      {/* Match Completed */}
      {matchCompleted && matchResult && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 mb-4">
          <h3 className="text-2xl font-bold text-green-400 mb-4">
            ✅ Trận đấu đã kết thúc!
          </h3>
          
          {winner && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-400 text-lg mb-2">🏆 Người chiến thắng:</p>
              <p className="text-3xl font-bold text-yellow-300">
                {winner.riot_id}
              </p>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-400">
            <p>Match ID: {matchResult.matchId}</p>
            <p>Thời gian: {new Date(matchResult.match?.gameDatetime || 0).toLocaleString()}</p>
          </div>

          {/* Player Placements */}
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Kết quả:</h4>
            <div className="space-y-2">
              {matchResult.players
                ?.sort((a, b) => (a.placement || 0) - (b.placement || 0))
                .map(p => {
                  const player = players.find(pl => pl.puuid === p.puuid);
                  return (
                    <div key={p.puuid} className="flex items-center gap-2">
                      <span className={`
                        font-bold
                        ${p.placement === 1 ? 'text-yellow-400' : 
                          p.placement === 2 ? 'text-gray-300' :
                          p.placement === 3 ? 'text-orange-400' :
                          'text-gray-500'}
                      `}>
                        #{p.placement}
                      </span>
                      <span>{player?.riot_id}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Notes

- **Polling interval**: 30 giây là hợp lý để không spam Riot API
- **Rate limiting**: Riot API có rate limit, nên không nên poll quá nhanh
- **Match delay**: Match history có thể delay 1-2 phút sau khi game kết thúc
- **Auto-stop**: Hook tự động dừng polling sau khi tìm thấy match
- **Error handling**: Hook có error state để handle API errors

## Troubleshooting

### Match không được detect
- Check xem tất cả players có PUUID không
- Verify Riot API key còn valid
- Check console logs để xem API response
- Match history có thể delay, đợi thêm 1-2 phút

### Polling không hoạt động
- Check `enabled` prop = true
- Verify room status = "playing"
- Check browser console cho errors

### API rate limit
- Tăng `pollInterval` lên 60000 (1 phút)
- Giảm số players trong room
- Check Riot API rate limit status

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface DetectGameRequest {
  roomId: string;
  puuids: string[];
}

interface DetectGameResponse {
  matchFound: boolean;
  matchId?: string;
  playersInGame: string[]; // PUUIDs
  playersNotInGame: string[]; // PUUIDs
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DetectGameRequest = await request.json();
    const { roomId, puuids } = body;

    if (!roomId || !puuids || puuids.length === 0) {
      return NextResponse.json(
        { error: 'Missing roomId or puuids' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[DETECT_GAME] Checking game participation for', puuids.length, 'players');

    // Get Riot API key
    const riotApiKey = process.env.RIOT_API_KEY;
    if (!riotApiKey) {
      return NextResponse.json(
        { error: 'Riot API key not configured' },
        { status: 500 }
      );
    }

    // Query recent matches for each player
    const playerMatches = new Map<string, string[]>();
    
    for (const puuid of puuids) {
      try {
        const matchesUrl = `https://sea.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?start=0&count=5`;
        const matchesRes = await fetch(matchesUrl, {
          headers: { 'X-Riot-Token': riotApiKey }
        });

        if (!matchesRes.ok) {
          console.error(`[DETECT_GAME] Failed to fetch matches for ${puuid}:`, matchesRes.status);
          continue;
        }

        const matches: string[] = await matchesRes.json();
        playerMatches.set(puuid, matches);
        
        console.log(`[DETECT_GAME] Player ${puuid} has ${matches.length} recent matches`);
      } catch (error) {
        console.error(`[DETECT_GAME] Error fetching matches for ${puuid}:`, error);
      }
    }

    // Find common match among all players
    let commonMatchId: string | null = null;
    const allMatches = Array.from(playerMatches.values());
    
    if (allMatches.length > 0) {
      // Get matches from first player
      const firstPlayerMatches = allMatches[0];
      
      // Find a match that appears in all players' match lists
      for (const matchId of firstPlayerMatches) {
        const isCommon = allMatches.every(matches => matches.includes(matchId));
        if (isCommon) {
          commonMatchId = matchId;
          break;
        }
      }
    }

    if (!commonMatchId) {
      console.log('[DETECT_GAME] No common match found among all players');
      return NextResponse.json<DetectGameResponse>({
        matchFound: false,
        playersInGame: [],
        playersNotInGame: puuids,
        message: 'Chưa phát hiện trận đấu chung. Có thể game chưa bắt đầu hoặc không phải tất cả đều vào cùng game.'
      });
    }

    console.log('[DETECT_GAME] Found common match:', commonMatchId);

    // Fetch match details to verify participants
    const matchUrl = `https://sea.api.riotgames.com/tft/match/v1/matches/${commonMatchId}`;
    const matchRes = await fetch(matchUrl, {
      headers: { 'X-Riot-Token': riotApiKey }
    });

    if (!matchRes.ok) {
      console.error('[DETECT_GAME] Failed to fetch match details:', matchRes.status);
      return NextResponse.json(
        { error: 'Failed to fetch match details' },
        { status: 500 }
      );
    }

    const matchData = await matchRes.json();
    const participantPuuids = matchData.info.participants.map((p: any) => p.puuid);

    // Identify who is in game vs not in game
    const playersInGame = puuids.filter(puuid => participantPuuids.includes(puuid));
    const playersNotInGame = puuids.filter(puuid => !participantPuuids.includes(puuid));

    console.log('[DETECT_GAME] Players in game:', playersInGame.length);
    console.log('[DETECT_GAME] Players NOT in game:', playersNotInGame.length);

    // Update room with game detection timestamp
    await supabase
      .from('rooms')
      .update({ 
        game_detected_at: new Date().toISOString()
      })
      .eq('id', roomId);

    return NextResponse.json<DetectGameResponse>({
      matchFound: true,
      matchId: commonMatchId,
      playersInGame,
      playersNotInGame,
      message: playersNotInGame.length > 0
        ? `Phát hiện ${playersInGame.length}/${puuids.length} người chơi đã vào game. ${playersNotInGame.length} người sẽ bị loại.`
        : `Tất cả ${playersInGame.length} người chơi đã vào game!`
    });

  } catch (error) {
    console.error('[DETECT_GAME] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

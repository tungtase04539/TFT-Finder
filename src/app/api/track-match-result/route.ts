import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { roomId, matchId } = body;

    if (!roomId || !matchId) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, matchId' },
        { status: 400 }
      );
    }

    // Get room details
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('players')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Get player profiles with puuids
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, puuid, riot_id')
      .in('id', room.players);

    if (profilesError || !profiles) {
      return NextResponse.json(
        { error: 'Failed to fetch player profiles' },
        { status: 500 }
      );
    }

    // Query Riot API for match details
    const riotApiKey = process.env.RIOT_API_KEY;
    if (!riotApiKey) {
      return NextResponse.json(
        { error: 'Riot API key not configured' },
        { status: 500 }
      );
    }

    const matchResponse = await fetch(
      `https://sea.api.riotgames.com/tft/match/v1/matches/${matchId}`,
      {
        headers: {
          'X-Riot-Token': riotApiKey
        }
      }
    );

    if (!matchResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch match data from Riot API' },
        { status: 500 }
      );
    }

    const matchData = await matchResponse.json();

    // Extract placements for our players
    const playerPlacements: { [userId: string]: number } = {};
    let winnerId: string | null = null;

    for (const profile of profiles) {
      const participant = matchData.info.participants.find(
        (p: any) => p.puuid === profile.puuid
      );

      if (participant) {
        playerPlacements[profile.id] = participant.placement;
        
        // Winner is placement 1
        if (participant.placement === 1) {
          winnerId = profile.id;
        }
      }
    }

    // Update player statistics
    for (const [userId, placement] of Object.entries(playerPlacements)) {
      const isWinner = placement === 1;

      // Increment total_games for all players
      // Increment win_count for winner
      await supabase.rpc('increment_player_stats', {
        p_user_id: userId,
        p_is_winner: isWinner
      });
    }

    // Store match result
    const { error: insertError } = await supabase
      .from('match_results')
      .insert({
        room_id: roomId,
        match_id: matchId,
        winner_id: winnerId,
        placements: playerPlacements,
        tracked_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error storing match result:', insertError);
      // Don't fail the request, stats are already updated
    }

    return NextResponse.json({
      success: true,
      winnerId,
      placements: playerPlacements
    });

  } catch (error) {
    console.error('Error in track-match-result API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

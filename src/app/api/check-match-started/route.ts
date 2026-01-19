/**
 * API Route: Check if match has started
 * POST /api/check-match-started
 * 
 * Checks if players have a new common match (indicating game has started)
 */

import { NextRequest, NextResponse } from 'next/server';

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const SEA_API_BASE = 'https://sea.api.riotgames.com';

export async function POST(request: NextRequest) {
  if (!RIOT_API_KEY) {
    return NextResponse.json(
      { error: 'Riot API key not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { puuids, lastCheckedMatchId } = body;

    if (!puuids || !Array.isArray(puuids) || puuids.length < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 PUUIDs' },
        { status: 400 }
      );
    }

    console.log(`[CHECK_MATCH] Checking for new match among ${puuids.length} players...`);
    console.log(`[CHECK_MATCH] Last checked match: ${lastCheckedMatchId || 'none'}`);

    // Get recent matches for each player (only check 3 most recent)
    const matchListsPromises = puuids.map(async (puuid: string) => {
      const response = await fetch(
        `${SEA_API_BASE}/tft/match/v1/matches/by-puuid/${puuid}/ids?count=3`,
        {
          headers: {
            'X-Riot-Token': RIOT_API_KEY,
          },
        }
      );

      if (!response.ok) {
        console.error(`[CHECK_MATCH] Failed to get matches for ${puuid.substring(0, 10)}...`);
        return [];
      }

      return response.json();
    });

    const matchLists = await Promise.all(matchListsPromises);

    // Check if any player has no matches
    if (matchLists.some(list => list.length === 0)) {
      return NextResponse.json({
        started: false,
        message: 'Some players have no recent matches',
      });
    }

    // Find common matches
    const commonMatches = matchLists[0].filter((matchId: string) =>
      matchLists.every((list: string[]) => list.includes(matchId))
    );

    if (commonMatches.length === 0) {
      return NextResponse.json({
        started: false,
        message: 'No common match found',
      });
    }

    // Get the most recent common match
    const latestMatchId = commonMatches[0];

    // Check if this is a NEW match (different from last checked)
    if (lastCheckedMatchId && latestMatchId === lastCheckedMatchId) {
      return NextResponse.json({
        started: false,
        message: 'No new match yet',
        latestMatchId,
      });
    }

    // NEW MATCH FOUND! Get match details
    console.log(`[CHECK_MATCH] NEW MATCH FOUND: ${latestMatchId}`);

    const matchResponse = await fetch(
      `${SEA_API_BASE}/tft/match/v1/matches/${latestMatchId}`,
      {
        headers: {
          'X-Riot-Token': RIOT_API_KEY,
        },
      }
    );

    if (!matchResponse.ok) {
      throw new Error(`Failed to get match details: ${matchResponse.status}`);
    }

    const matchData = await matchResponse.json();

    // Extract player results
    const playerResults = puuids.map((puuid: string) => {
      const participant = matchData.info.participants.find(
        (p: { puuid: string }) => p.puuid === puuid
      );

      if (!participant) {
        return { puuid, found: false };
      }

      return {
        puuid,
        found: true,
        placement: participant.placement,
        level: participant.level,
        goldLeft: participant.gold_left || 0,
      };
    });

    // Find winner (placement = 1)
    const winner = playerResults.find(p => p.placement === 1);

    return NextResponse.json({
      started: true,
      matchId: latestMatchId,
      match: {
        matchId: latestMatchId,
        gameType: matchData.info.tft_game_type,
        queueId: matchData.info.queue_id,
        gameDatetime: matchData.info.game_datetime,
        gameLength: matchData.info.game_length,
      },
      players: playerResults,
      winner: winner || null,
      message: 'Match completed!',
    });

  } catch (error) {
    console.error('[CHECK_MATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check match status' },
      { status: 500 }
    );
  }
}

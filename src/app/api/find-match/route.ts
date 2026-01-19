import { NextRequest, NextResponse } from 'next/server';

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const SEA_API_BASE = 'https://sea.api.riotgames.com';

interface MatchInfo {
  matchId: string;
  participants: {
    puuid: string;
    placement: number;
    level: number;
    units: {
      character_id: string;
      tier: number;
      items: string[];
      rarity: number; // cost tier
    }[];
    traits: {
      name: string;
      num_units: number;
      tier_current: number;
    }[];
    augments: string[];
  }[];
  gameType: string;
  queueId: number;
  gameDatetime: number;
}

// POST: Find common match among players
// Body: { puuids: string[] }
export async function POST(request: NextRequest) {
  if (!RIOT_API_KEY) {
    return NextResponse.json(
      { error: 'Riot API key not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { puuids, matchCount = 5 } = body;

    if (!puuids || !Array.isArray(puuids) || puuids.length < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 PUUIDs to find common match' },
        { status: 400 }
      );
    }

    console.log(`Finding common match for ${puuids.length} players...`);

    // Step 1: Get recent matches for each player
    const matchListsPromises = puuids.map(async (puuid: string) => {
      const response = await fetch(
        `${SEA_API_BASE}/tft/match/v1/matches/by-puuid/${puuid}/ids?count=${matchCount}`,
        {
          headers: {
            'X-Riot-Token': RIOT_API_KEY,
          },
        }
      );

      if (!response.ok) {
        console.error(`Failed to get matches for ${puuid.substring(0, 10)}...`);
        return [];
      }

      return response.json();
    });

    const matchLists = await Promise.all(matchListsPromises);
    console.log('Match lists retrieved:', matchLists.map(l => l.length));

    // Step 2: Find intersection - match ID that exists in ALL players' history
    if (matchLists.some(list => list.length === 0)) {
      return NextResponse.json({
        success: true,
        found: false,
        message: 'Some players have no recent matches',
      });
    }

    // Find common match IDs
    const commonMatches = matchLists[0].filter((matchId: string) =>
      matchLists.every((list: string[]) => list.includes(matchId))
    );

    if (commonMatches.length === 0) {
      return NextResponse.json({
        success: true,
        found: false,
        message: 'No common match found among all players',
      });
    }

    console.log(`Found ${commonMatches.length} common matches:`, commonMatches);

    // Step 3: Get details of the most recent common match
    const latestMatchId = commonMatches[0];
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

    // Step 4: Extract relevant info for each player
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
        units: participant.units.map((u: { character_id: string; tier: number; items: string[]; rarity: number }) => ({
          id: u.character_id,
          tier: u.tier, // star level
          items: u.items,
          cost: u.rarity + 1, // rarity 0 = 1-cost, etc.
        })),
        traits: participant.traits.filter((t: { tier_current: number }) => t.tier_current > 0),
        augments: participant.augments,
        goldLeft: participant.gold_left || 0,
      };
    });

    return NextResponse.json({
      success: true,
      found: true,
      match: {
        matchId: latestMatchId,
        gameType: matchData.info.tft_game_type,
        queueId: matchData.info.queue_id,
        gameDatetime: matchData.info.game_datetime,
        gameLength: matchData.info.game_length,
      },
      players: playerResults,
    });
  } catch (error) {
    console.error('Find match error:', error);
    return NextResponse.json(
      { error: 'Failed to find common match' },
      { status: 500 }
    );
  }
}

// GET: Check if a specific match exists and get its details
export async function GET(request: NextRequest) {
  if (!RIOT_API_KEY) {
    return NextResponse.json(
      { error: 'Riot API key not configured' },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const matchId = searchParams.get('matchId');

  if (!matchId) {
    return NextResponse.json(
      { error: 'matchId is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${SEA_API_BASE}/tft/match/v1/matches/${matchId}`,
      {
        headers: {
          'X-Riot-Token': RIOT_API_KEY,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Match not found' },
          { status: 404 }
        );
      }
      throw new Error(`Riot API error: ${response.status}`);
    }

    const matchData = await response.json();

    return NextResponse.json({
      success: true,
      match: {
        matchId,
        gameType: matchData.info.tft_game_type,
        queueId: matchData.info.queue_id,
        gameDatetime: matchData.info.game_datetime,
        gameLength: matchData.info.game_length,
        participants: matchData.info.participants.map((p: { puuid: string; placement: number; level: number; units: { character_id: string; tier: number; items: string[]; rarity: number }[]; traits: { name: string; tier_current: number }[]; augments: string[] }) => ({
          puuid: p.puuid,
          placement: p.placement,
          level: p.level,
          units: p.units.map(u => ({
            id: u.character_id,
            tier: u.tier,
            items: u.items,
            cost: u.rarity + 1,
          })),
          traits: p.traits.filter(t => t.tier_current > 0),
          augments: p.augments,
        })),
      },
    });
  } catch (error) {
    console.error('Get match error:', error);
    return NextResponse.json(
      { error: 'Failed to get match details' },
      { status: 500 }
    );
  }
}

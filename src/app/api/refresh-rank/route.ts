import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const SUMMONER_API_BASE = 'https://vn2.api.riotgames.com';

interface TFTLeagueEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

async function fetchAndUpdateUserRank(userId: string, summonerId: string) {
  if (!RIOT_API_KEY) return null;

  try {
    const tftLeagueResponse = await fetch(
      `${SUMMONER_API_BASE}/tft/league/v1/entries/by-summoner/${summonerId}`,
      {
        headers: { 'X-Riot-Token': RIOT_API_KEY },
      }
    );

    let tftData = {
      tier: 'UNRANKED',
      rank: '',
      lp: 0,
      wins: 0,
      losses: 0,
    };

    if (tftLeagueResponse.ok) {
      const entries: TFTLeagueEntry[] = await tftLeagueResponse.json();
      const rankedEntry = entries.find(e => e.queueType === 'RANKED_TFT');
      
      if (rankedEntry) {
        tftData = {
          tier: rankedEntry.tier,
          rank: rankedEntry.rank,
          lp: rankedEntry.leaguePoints,
          wins: rankedEntry.wins,
          losses: rankedEntry.losses,
        };
      }
    }

    // Update the user's rank in database
    const supabase = await createClient();
    await supabase
      .from('profiles')
      .update({
        tft_tier: tftData.tier,
        tft_rank: tftData.rank,
        tft_lp: tftData.lp,
        tft_wins: tftData.wins,
        tft_losses: tftData.losses,
        tft_rank_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return tftData;
  } catch (error) {
    console.error('Error fetching rank:', error);
    return null;
  }
}

// POST: Smart refresh - can refresh current user OR background user
export async function POST(request: NextRequest) {
  if (!RIOT_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { refreshCurrentUser, userId } = body;

    const supabase = await createClient();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Option 1: Refresh specific current user if their rank is outdated
    if (refreshCurrentUser && userId) {
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('id, summoner_id, tft_rank_updated_at')
        .eq('id', userId)
        .single();

      if (currentUserProfile?.summoner_id) {
        const needsRefresh = !currentUserProfile.tft_rank_updated_at || 
          new Date(currentUserProfile.tft_rank_updated_at) < new Date(oneDayAgo);

        if (needsRefresh) {
          const newRank = await fetchAndUpdateUserRank(
            currentUserProfile.id,
            currentUserProfile.summoner_id
          );

          return NextResponse.json({
            success: true,
            refreshed: true,
            type: 'currentUser',
            newRank,
          });
        } else {
          return NextResponse.json({
            success: true,
            refreshed: false,
            type: 'currentUser',
            message: 'Rank đã được cập nhật trong 24h qua',
          });
        }
      }
    }

    // Option 2: Background refresh - find ONE user with oldest rank data
    const { data: userToRefresh, error } = await supabase
      .from('profiles')
      .select('id, summoner_id, riot_id, tft_rank_updated_at')
      .eq('verified', true)
      .not('summoner_id', 'is', null)
      .or(`tft_rank_updated_at.is.null,tft_rank_updated_at.lt.${oneDayAgo}`)
      .order('tft_rank_updated_at', { ascending: true, nullsFirst: true })
      .limit(1)
      .single();

    if (error || !userToRefresh) {
      return NextResponse.json({
        success: true,
        message: 'Không có user nào cần refresh rank',
        refreshed: false,
        type: 'background',
      });
    }

    const newRank = await fetchAndUpdateUserRank(userToRefresh.id, userToRefresh.summoner_id);

    return NextResponse.json({
      success: true,
      refreshed: true,
      type: 'background',
      userId: userToRefresh.id,
      riotId: userToRefresh.riot_id,
      newRank,
    });
  } catch (error) {
    console.error('Smart refresh error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi refresh rank' },
      { status: 500 }
    );
  }
}

// GET: Check how many users need refresh (for debugging)
export async function GET() {
  try {
    const supabase = await createClient();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verified', true)
      .not('summoner_id', 'is', null)
      .or(`tft_rank_updated_at.is.null,tft_rank_updated_at.lt.${oneDayAgo}`);

    return NextResponse.json({
      usersNeedingRefresh: count || 0,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error checking refresh status' }, { status: 500 });
  }
}

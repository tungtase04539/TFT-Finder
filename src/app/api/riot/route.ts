import { NextRequest, NextResponse } from "next/server";

// Riot API Configuration
const RIOT_API_KEY = process.env.RIOT_API_KEY;

// Region routing for Account-V1 (use regional routing)
const ACCOUNT_API_BASE = "https://asia.api.riotgames.com";
// Region routing for Summoner-V4 and TFT-LEAGUE-V1 (use platform routing)
const SUMMONER_API_BASE = "https://vn2.api.riotgames.com";

interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

interface SummonerData {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

interface TFTLeagueEntry {
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  summonerId: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

// Helper to format TFT rank nicely
function formatTFTRank(entry: TFTLeagueEntry | null): {
  tier: string;
  rank: string;
  lp: number;
  wins: number;
  losses: number;
  displayName: string;
} {
  if (!entry) {
    return {
      tier: 'UNRANKED',
      rank: '',
      lp: 0,
      wins: 0,
      losses: 0,
      displayName: 'Chưa xếp hạng',
    };
  }

  const tierNames: Record<string, string> = {
    'IRON': 'Sắt',
    'BRONZE': 'Đồng',
    'SILVER': 'Bạc',
    'GOLD': 'Vàng',
    'PLATINUM': 'Bạch Kim',
    'EMERALD': 'Ngọc Lục Bảo',
    'DIAMOND': 'Kim Cương',
    'MASTER': 'Cao Thủ',
    'GRANDMASTER': 'Đại Cao Thủ',
    'CHALLENGER': 'Thách Đấu',
  };

  const displayName = entry.tier === 'MASTER' || entry.tier === 'GRANDMASTER' || entry.tier === 'CHALLENGER'
    ? `${tierNames[entry.tier] || entry.tier}`
    : `${tierNames[entry.tier] || entry.tier} ${entry.rank}`;

  return {
    tier: entry.tier,
    rank: entry.rank,
    lp: entry.leaguePoints,
    wins: entry.wins,
    losses: entry.losses,
    displayName,
  };
}

// GET: Lookup Riot ID and get profile icon + TFT rank
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const riotId = searchParams.get("riotId"); // Format: "GameName#TAG"

  if (!riotId || !riotId.includes("#")) {
    return NextResponse.json(
      { error: "Invalid Riot ID format. Use: GameName#TAG" },
      { status: 400 },
    );
  }

  if (!RIOT_API_KEY) {
    return NextResponse.json(
      { error: "Riot API key not configured" },
      { status: 500 },
    );
  }

  try {
    const [gameName, tagLine] = riotId.split("#");
    console.log(`Looking up Riot ID: "${gameName}"#"${tagLine}"`);
    console.log('GameName char codes:', [...gameName].map(c => c.charCodeAt(0)));
    
    // Normalize unicode (NFC form)
    const normalizedGameName = gameName.normalize('NFC');
    const normalizedTagLine = tagLine.normalize('NFC');
    console.log(`Normalized: "${normalizedGameName}"#"${normalizedTagLine}"`);

    // Step 1: Get PUUID from Riot ID using Account-V1
    const accountUrl = `${ACCOUNT_API_BASE}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(normalizedGameName)}/${encodeURIComponent(normalizedTagLine)}`;
    console.log('Account API URL:', accountUrl);
    
    const accountResponse = await fetch(
      accountUrl,
      {
        headers: {
          "X-Riot-Token": RIOT_API_KEY,
        },
      },
    );

    console.log('Account API Response Status:', accountResponse.status);

    if (!accountResponse.ok) {
      const errorBody = await accountResponse.text();
      console.log('Account API Error Body:', errorBody);
      
      if (accountResponse.status === 404) {
        return NextResponse.json(
          { error: "Không tìm thấy Riot ID này. Kiểm tra lại tên#tag (phân biệt hoa thường)" },
          { status: 404 },
        );
      }
      if (accountResponse.status === 429) {
        return NextResponse.json(
          { error: "Quá nhiều yêu cầu, vui lòng thử lại sau 1 phút" },
          { status: 429 },
        );
      }
      if (accountResponse.status === 403) {
        return NextResponse.json(
          { error: "API key hết hạn hoặc không có quyền. Liên hệ admin." },
          { status: 403 },
        );
      }
      throw new Error(`Account API error: ${accountResponse.status}`);
    }

    const accountData: RiotAccount = await accountResponse.json();

    // Step 2: Get LOL Summoner data (for profile icon)
    let summonerData: SummonerData | null = null;
    try {
      const summonerResponse = await fetch(
        `${SUMMONER_API_BASE}/lol/summoner/v4/summoners/by-puuid/${accountData.puuid}`,
        {
          headers: {
            "X-Riot-Token": RIOT_API_KEY,
          },
        },
      );
      if (summonerResponse.ok) {
        summonerData = await summonerResponse.json();
      }
    } catch (e) {
      console.log('LOL Summoner not found, trying TFT only');
    }

    // Step 3: Get TFT Summoner data (has separate ID for TFT League API)
    let tftSummonerId: string | null = null;
    try {
      const tftSummonerResponse = await fetch(
        `${SUMMONER_API_BASE}/tft/summoner/v1/summoners/by-puuid/${accountData.puuid}`,
        {
          headers: {
            "X-Riot-Token": RIOT_API_KEY,
          },
        },
      );
      
      if (tftSummonerResponse.ok) {
        const tftSummoner = await tftSummonerResponse.json();
        tftSummonerId = tftSummoner.id;
        console.log('TFT Summoner ID:', tftSummonerId);
        
        // Use TFT summoner data if LOL summoner not found
        if (!summonerData) {
          summonerData = tftSummoner;
        }
      }
    } catch (e) {
      console.log('TFT Summoner error:', e);
    }

    if (!summonerData) {
      return NextResponse.json(
        { error: "Tài khoản Riot này chưa chơi LOL hoặc TFT trên server Việt Nam. Vui lòng sử dụng tài khoản đã chơi trên VN." },
        { status: 404 },
      );
    }

    // Step 4: Get TFT rank using TFT-LEAGUE-V1 with TFT Summoner ID
    let tftRank = formatTFTRank(null);
    if (tftSummonerId) {
      try {
        const tftLeagueUrl = `${SUMMONER_API_BASE}/tft/league/v1/entries/by-summoner/${tftSummonerId}`;
        console.log('Calling TFT League API:', tftLeagueUrl);
        
        const tftLeagueResponse = await fetch(
          tftLeagueUrl,
          {
            headers: {
              "X-Riot-Token": RIOT_API_KEY,
            },
          },
        );

        console.log('TFT League Response Status:', tftLeagueResponse.status);

        if (tftLeagueResponse.ok) {
          const leagueEntries: TFTLeagueEntry[] = await tftLeagueResponse.json();
          console.log('TFT League Entries:', JSON.stringify(leagueEntries, null, 2));
          
          // Find RANKED_TFT queue (not Double Up or Hyper Roll)
          const rankedEntry = leagueEntries.find(
            (entry) => entry.queueType === "RANKED_TFT"
          );
          console.log('Found Ranked Entry:', rankedEntry);
          tftRank = formatTFTRank(rankedEntry || null);
        } else {
          console.log('TFT League API error:', await tftLeagueResponse.text());
        }
      } catch (tftError) {
        console.error("TFT League API Error:", tftError);
        // Continue without TFT rank if API fails
      }
    }
    return NextResponse.json({
      success: true,
      data: {
        puuid: accountData.puuid,
        gameName: accountData.gameName,
        tagLine: accountData.tagLine,
        profileIconId: summonerData.profileIconId,
        summonerLevel: summonerData.summonerLevel,
        summonerId: summonerData.id,
        tftRank,
      },
    });
  } catch (error) {
    console.error("Riot API Error:", error);
    return NextResponse.json(
      { error: "Lỗi khi gọi Riot API. Vui lòng thử lại sau." },
      { status: 500 },
    );
  }
}


// POST: Verify that user has changed their icon to the expected one
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { puuid, expectedIconId } = body;

    if (!puuid || !expectedIconId) {
      return NextResponse.json(
        { error: "Missing puuid or expectedIconId" },
        { status: 400 },
      );
    }

    if (!RIOT_API_KEY) {
      return NextResponse.json(
        { error: "Riot API key not configured" },
        { status: 500 },
      );
    }

    // Get current summoner data to check icon
    const summonerResponse = await fetch(
      `${SUMMONER_API_BASE}/lol/summoner/v4/summoners/by-puuid/${puuid}`,
      {
        headers: {
          "X-Riot-Token": RIOT_API_KEY,
        },
      },
    );

    if (!summonerResponse.ok) {
      throw new Error(`Summoner API error: ${summonerResponse.status}`);
    }

    const summonerData: SummonerData = await summonerResponse.json();

    const isVerified = summonerData.profileIconId === parseInt(expectedIconId);

    return NextResponse.json({
      success: true,
      verified: isVerified,
      currentIconId: summonerData.profileIconId,
      expectedIconId: parseInt(expectedIconId),
      message: isVerified
        ? "Xác minh thành công! Icon đã khớp."
        : `Icon chưa khớp. Hiện tại: ${summonerData.profileIconId}, Cần: ${expectedIconId}`,
    });
  } catch (error) {
    console.error("Verification Error:", error);
    return NextResponse.json(
      { error: "Lỗi khi xác minh. Vui lòng thử lại sau." },
      { status: 500 },
    );
  }
}

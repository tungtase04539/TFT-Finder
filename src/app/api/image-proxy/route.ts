import { NextRequest, NextResponse } from 'next/server';

// Cache for 1 year (immutable profile icons)
const CACHE_DURATION = 31536000;

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Validate URL is from Riot CDN
    if (!url.startsWith('https://ddragon.leagueoflegends.com/')) {
      return NextResponse.json(
        { error: 'Invalid URL domain' },
        { status: 400 }
      );
    }

    // Fetch image from Riot CDN
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TFT-Finder/1.0',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch image' },
        { status: response.status }
      );
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${CACHE_DURATION}, immutable`,
        'CDN-Cache-Control': `public, max-age=${CACHE_DURATION}, immutable`,
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

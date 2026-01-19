import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
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

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get filter from query params
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all, temporary, permanent

    // Build query
    let query = supabase
      .from('bans')
      .select(`
        id,
        user_id,
        ban_type,
        reason,
        created_at,
        expires_at,
        user_profile:profiles!user_id(riot_id),
        report:reports!report_id(violation_types)
      `)
      .order('created_at', { ascending: false });

    // Apply filter
    if (filter === 'temporary') {
      query = query.eq('ban_type', 'temporary');
    } else if (filter === 'permanent') {
      query = query.eq('ban_type', 'permanent');
    }

    const { data: bans, error: bansError } = await query;

    if (bansError) {
      console.error('Error fetching bans:', bansError);
      return NextResponse.json(
        { error: 'Failed to fetch bans' },
        { status: 500 }
      );
    }

    // Filter out expired temporary bans
    const now = new Date();
    const activeBans = bans?.filter(ban => {
      if (ban.ban_type === 'permanent') return true;
      if (!ban.expires_at) return false;
      return new Date(ban.expires_at) > now;
    }) || [];

    return NextResponse.json({
      bans: activeBans
    });

  } catch (error) {
    console.error('Error in bans API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

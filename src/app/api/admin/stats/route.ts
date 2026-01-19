import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/stats
 * Get dashboard statistics for admin
 */
export async function GET() {
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

    // Get total users count
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get total rooms count
    const { count: totalRooms } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true });

    // Get active rooms count (forming, editing, ready, playing)
    const { count: activeRooms } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .in('status', ['forming', 'editing', 'ready', 'playing']);

    // Get pending reports count
    const { count: pendingReports } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get total bans count (active bans)
    const { count: totalBans } = await supabase
      .from('bans')
      .select('*', { count: 'exact', head: true })
      .or('banned_until.is.null,banned_until.gt.now()');

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalRooms: totalRooms || 0,
      activeRooms: activeRooms || 0,
      pendingReports: pendingReports || 0,
      totalBans: totalBans || 0
    });

  } catch (error) {
    console.error('[ADMIN STATS] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

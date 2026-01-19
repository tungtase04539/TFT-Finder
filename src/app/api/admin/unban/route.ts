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

    // Get request body
    const body = await request.json();
    const { banId, userId, riotId, isPermanent } = body;

    if (!banId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: banId, userId' },
        { status: 400 }
      );
    }

    // Delete ban record
    const { error: deleteBanError } = await supabase
      .from('bans')
      .delete()
      .eq('id', banId);

    if (deleteBanError) {
      console.error('Error deleting ban:', deleteBanError);
      return NextResponse.json(
        { error: 'Failed to delete ban record' },
        { status: 500 }
      );
    }

    // Reset user's ban status in profile
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({
        banned_until: null,
        ban_count: 0
      })
      .eq('id', userId);

    if (updateProfileError) {
      console.error('Error updating profile:', updateProfileError);
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      );
    }

    // If permanent ban, remove Riot ID from banned list
    if (isPermanent && riotId) {
      const { error: deleteRiotIdError } = await supabase
        .from('banned_riot_ids')
        .delete()
        .eq('riot_id', riotId);

      if (deleteRiotIdError) {
        console.error('Error removing Riot ID from banned list:', deleteRiotIdError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User unbanned successfully'
    });

  } catch (error) {
    console.error('Error in unban API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

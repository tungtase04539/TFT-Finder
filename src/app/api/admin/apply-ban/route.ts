import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/apply-ban
 * Apply ban to a user (temporary or permanent)
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { reportId, userId, banType, violationTypes } = body;

    if (!reportId || !userId || !banType || !violationTypes) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (banType !== 'temporary' && banType !== 'permanent') {
      return NextResponse.json(
        { error: 'Invalid ban type' },
        { status: 400 }
      );
    }

    // Get user's current ban_count and riot_id
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('ban_count, riot_id')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const currentBanCount = targetUser.ban_count || 0;

    // Calculate ban details based on type
    let bannedUntil: string | null = null;
    let newBanCount = currentBanCount + 1;

    if (banType === 'temporary') {
      // 24 hours from now
      const now = new Date();
      now.setHours(now.getHours() + 24);
      bannedUntil = now.toISOString();
    } else {
      // Permanent ban
      bannedUntil = null;
      newBanCount = 2; // Set to 2 for permanent bans
    }

    // Update user profile with ban
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        banned_until: bannedUntil,
        ban_count: newBanCount
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[APPLY BAN] Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      );
    }

    // Create ban record
    const { error: banError } = await supabase
      .from('bans')
      .insert({
        user_id: userId,
        report_id: reportId,
        ban_type: banType,
        banned_until: bannedUntil,
        reason: violationTypes.join(', '),
        banned_by: user.id
      });

    if (banError) {
      console.error('[APPLY BAN] Error creating ban record:', banError);
      return NextResponse.json(
        { error: 'Failed to create ban record' },
        { status: 500 }
      );
    }

    // If permanent ban, add Riot ID to banned list
    if (banType === 'permanent' && targetUser.riot_id) {
      const { error: riotIdBanError } = await supabase
        .from('banned_riot_ids')
        .insert({
          riot_id: targetUser.riot_id,
          banned_at: new Date().toISOString(),
          reason: violationTypes.join(', ')
        });

      if (riotIdBanError) {
        console.error('[APPLY BAN] Error banning Riot ID:', riotIdBanError);
        // Continue anyway - ban is still applied to user
      }
    }

    // Update report status to approved
    const { error: reportError } = await supabase
      .from('reports')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (reportError) {
      console.error('[APPLY BAN] Error updating report:', reportError);
      // Continue anyway - ban is applied
    }

    return NextResponse.json({
      success: true,
      message: `Ban ${banType === 'temporary' ? '24 giờ' : 'vĩnh viễn'} đã được áp dụng`,
      banType,
      bannedUntil,
      newBanCount
    });

  } catch (error) {
    console.error('[APPLY BAN] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

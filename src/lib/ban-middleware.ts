/**
 * Ban Middleware
 * Checks if user is currently banned and enforces ban restrictions
 */

import { createClient } from '@/lib/supabase/client';

export interface BanCheckResult {
  isBanned: boolean;
  banType: 'temporary' | 'permanent' | null;
  bannedUntil: string | null;
  banReason: string | null;
  userId: string | null;
}

/**
 * Check if current user is banned
 * Automatically clears expired temporary bans
 * @returns BanCheckResult with ban status and details
 */
export async function checkBanStatus(): Promise<BanCheckResult> {
  const supabase = createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      isBanned: false,
      banType: null,
      bannedUntil: null,
      banReason: null,
      userId: null
    };
  }

  // Get user profile with ban info
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('banned_until, ban_count')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      isBanned: false,
      banType: null,
      bannedUntil: null,
      banReason: null,
      userId: user.id
    };
  }

  // Check if user is banned
  const now = new Date();
  const bannedUntil = profile.banned_until ? new Date(profile.banned_until) : null;

  // Permanent ban (banned_until is NULL and ban_count >= 2)
  if (profile.ban_count >= 2 && !profile.banned_until) {
    // Get ban reason from most recent ban
    const { data: ban } = await supabase
      .from('bans')
      .select('reason')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return {
      isBanned: true,
      banType: 'permanent',
      bannedUntil: null,
      banReason: ban?.reason || 'Vi phạm quy định',
      userId: user.id
    };
  }

  // Temporary ban (banned_until is in the future)
  if (bannedUntil && bannedUntil > now) {
    // Get ban reason from most recent ban
    const { data: ban } = await supabase
      .from('bans')
      .select('reason')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return {
      isBanned: true,
      banType: 'temporary',
      bannedUntil: profile.banned_until,
      banReason: ban?.reason || 'Vi phạm quy định',
      userId: user.id
    };
  }

  // Temporary ban expired - clear it
  if (bannedUntil && bannedUntil <= now) {
    await supabase
      .from('profiles')
      .update({ banned_until: null })
      .eq('id', user.id);

    return {
      isBanned: false,
      banType: null,
      bannedUntil: null,
      banReason: null,
      userId: user.id
    };
  }

  // Not banned
  return {
    isBanned: false,
    banType: null,
    bannedUntil: null,
    banReason: null,
    userId: user.id
  };
}

/**
 * Format time remaining for temporary ban
 * @param bannedUntil - ISO timestamp of when ban expires
 * @returns Formatted string like "23 giờ 45 phút"
 */
export function formatBanTimeRemaining(bannedUntil: string): string {
  const now = new Date();
  const until = new Date(bannedUntil);
  const diffMs = until.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Đã hết hạn';
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  } else {
    return `${minutes} phút`;
  }
}

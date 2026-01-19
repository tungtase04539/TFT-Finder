/**
 * Admin Middleware
 * Checks if user has admin role and is authenticated
 * Admin accounts skip verification requirement
 */

import { createClient } from '@/lib/supabase/client';

export interface AdminCheckResult {
  isAdmin: boolean;
  userId: string | null;
  error?: string;
}

/**
 * Check if current user is an admin
 * @returns AdminCheckResult with isAdmin flag and userId
 */
export async function checkAdminAccess(): Promise<AdminCheckResult> {
  const supabase = createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      isAdmin: false,
      userId: null,
      error: 'Not authenticated'
    };
  }

  // Check admin role in profile (admin doesn't need to be verified)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, verified')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      isAdmin: false,
      userId: user.id,
      error: 'Profile not found'
    };
  }

  if (profile.role !== 'admin') {
    return {
      isAdmin: false,
      userId: user.id,
      error: 'Not an admin'
    };
  }

  return {
    isAdmin: true,
    userId: user.id
  };
}

/**
 * Server-side admin check for API routes
 * @param userId - User ID to check
 * @returns boolean indicating if user is admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return profile?.role === 'admin';
}

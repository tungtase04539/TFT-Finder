/**
 * API Route: Link Google Account
 * POST /api/auth/link-google
 * 
 * Links a Google account to an existing email/password account
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendGoogleLinkedEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { googleEmail } = body;

    // Validate input
    if (!googleEmail) {
      return NextResponse.json(
        { error: 'Google email là bắt buộc' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Bạn cần đăng nhập để liên kết Google' },
        { status: 401 }
      );
    }

    // Check if user already has Google linked
    const { data: profile } = await supabase
      .from('profiles')
      .select('has_google, email')
      .eq('id', user.id)
      .single();

    if (profile?.has_google) {
      return NextResponse.json(
        { error: 'Tài khoản đã được liên kết với Google' },
        { status: 400 }
      );
    }

    // Check if Google email is already used by another account
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', googleEmail)
      .neq('id', user.id)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Email Google này đã được sử dụng bởi tài khoản khác' },
        { status: 400 }
      );
    }

    // Update profile: has_google = true
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        has_google: true,
        email: profile?.email || googleEmail, // Keep existing email or use Google email
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('[LINK_GOOGLE] Profile update error:', profileError);
      return NextResponse.json(
        { error: 'Không thể liên kết tài khoản Google' },
        { status: 500 }
      );
    }

    // Send confirmation email
    await sendGoogleLinkedEmail(profile?.email || googleEmail, googleEmail);

    return NextResponse.json({
      success: true,
      message: 'Tài khoản Google đã được liên kết thành công',
    });

  } catch (error) {
    console.error('[LINK_GOOGLE] Error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi liên kết Google' },
      { status: 500 }
    );
  }
}

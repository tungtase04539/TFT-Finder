/**
 * API Route: Create Password
 * POST /api/auth/create-password
 * 
 * Creates a password for a Google-authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validatePassword } from '@/lib/password-validation';
import { sendPasswordCreatedEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, email } = body;

    // Validate input
    if (!password || !email) {
      return NextResponse.json(
        { error: 'Password và email là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate password strength
    const validation = validatePassword(password);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join(', '), errors: validation.errors },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Bạn cần đăng nhập để tạo mật khẩu' },
        { status: 401 }
      );
    }

    // Verify email matches user
    if (user.email !== email) {
      return NextResponse.json(
        { error: 'Email không khớp với tài khoản hiện tại' },
        { status: 400 }
      );
    }

    // Check if user already has password
    const { data: profile } = await supabase
      .from('profiles')
      .select('has_password')
      .eq('id', user.id)
      .single();

    if (profile?.has_password) {
      return NextResponse.json(
        { error: 'Tài khoản đã có mật khẩu. Vui lòng sử dụng chức năng đổi mật khẩu.' },
        { status: 400 }
      );
    }

    // Update user with password in Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      console.error('[CREATE_PASSWORD] Auth update error:', updateError);
      return NextResponse.json(
        { error: 'Không thể tạo mật khẩu. Vui lòng thử lại.' },
        { status: 500 }
      );
    }

    // Update profile: has_password = true
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        has_password: true,
        email: email,
        email_verified: true,
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('[CREATE_PASSWORD] Profile update error:', profileError);
      // Don't fail the request, password is already created
    }

    // Send confirmation email
    await sendPasswordCreatedEmail(email);

    return NextResponse.json({
      success: true,
      message: 'Mật khẩu đã được tạo thành công',
    });

  } catch (error) {
    console.error('[CREATE_PASSWORD] Error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi tạo mật khẩu' },
      { status: 500 }
    );
  }
}

/**
 * API Route: Register
 * POST /api/auth/register
 * 
 * Registers a new user with email/password
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validatePassword } from '@/lib/password-validation';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, riotId } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email và password là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email không hợp lệ' },
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

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email này đã được đăng ký' },
        { status: 400 }
      );
    }

    // Create user in Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          riot_id: riotId || null,
        },
      },
    });

    if (signUpError) {
      console.error('[REGISTER] Sign up error:', signUpError);
      
      // Handle specific errors
      if (signUpError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'Email này đã được đăng ký' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Không thể tạo tài khoản. Vui lòng thử lại.' },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Không thể tạo tài khoản' },
        { status: 500 }
      );
    }

    // Update profile with additional info
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        has_password: true,
        email: email,
        email_verified: true,
        riot_id: riotId || null,
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error('[REGISTER] Profile update error:', profileError);
      // Don't fail the request, user is already created
    }

    // Send welcome email
    await sendWelcomeEmail(email, riotId || 'Người chơi mới');

    return NextResponse.json({
      success: true,
      user: authData.user,
      session: authData.session,
      message: 'Đăng ký thành công',
    });

  } catch (error) {
    console.error('[REGISTER] Error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi đăng ký' },
      { status: 500 }
    );
  }
}

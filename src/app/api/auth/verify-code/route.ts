/**
 * API Route: Verify Code
 * POST /api/auth/verify-code
 * 
 * Verifies a 6-digit code and returns a verification token
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyCode, isExpired } from '@/lib/verification';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, purpose } = body;

    // Validate input
    if (!email || !code || !purpose) {
      return NextResponse.json(
        { error: 'Email, code và purpose là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Mã xác thực phải là 6 chữ số' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find active code for this email + purpose
    const { data: verificationCodes, error: fetchError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('purpose', purpose)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError || !verificationCodes || verificationCodes.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy mã xác thực. Vui lòng yêu cầu mã mới.' },
        { status: 404 }
      );
    }

    const verificationCode = verificationCodes[0];

    // Check if expired
    if (isExpired(verificationCode.expires_at)) {
      return NextResponse.json(
        { error: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.' },
        { status: 400 }
      );
    }

    // Check max attempts
    if (verificationCode.attempts >= verificationCode.max_attempts) {
      return NextResponse.json(
        { error: 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.' },
        { status: 400 }
      );
    }

    // Verify the code
    const isValid = await verifyCode(code, verificationCode.code);

    if (!isValid) {
      // Increment attempts
      const newAttempts = verificationCode.attempts + 1;
      await supabase
        .from('verification_codes')
        .update({ attempts: newAttempts })
        .eq('id', verificationCode.id);

      const attemptsLeft = verificationCode.max_attempts - newAttempts;
      
      if (attemptsLeft <= 0) {
        return NextResponse.json(
          { error: 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { 
          error: `Mã xác thực không đúng. Còn ${attemptsLeft} lần thử.`,
          attemptsLeft
        },
        { status: 400 }
      );
    }

    // Mark as used
    await supabase
      .from('verification_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', verificationCode.id);

    // Generate verification token (for next step)
    const verificationToken = randomBytes(32).toString('hex');

    // Store token temporarily (you might want to use Redis or similar)
    // For now, we'll return it and trust the client to pass it back
    // In production, consider storing in a session or short-lived cache

    return NextResponse.json({
      success: true,
      verificationToken,
      userId: verificationCode.user_id,
      email: verificationCode.email,
      message: 'Mã xác thực hợp lệ',
    });

  } catch (error) {
    console.error('[VERIFY_CODE] Error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi xác thực mã' },
      { status: 500 }
    );
  }
}

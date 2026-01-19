/**
 * API Route: Send Verification Code
 * POST /api/auth/send-verification-code
 * 
 * Generates and sends a 6-digit verification code via email
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCode, hashCode, getExpirationTime } from '@/lib/verification';
import { sendVerificationCode } from '@/lib/email';

// Rate limiting: Track requests by email (in-memory, simple implementation)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): { allowed: boolean; resetIn?: number } {
  const now = Date.now();
  const limit = rateLimitMap.get(email);

  if (!limit || now > limit.resetAt) {
    // Reset or create new limit
    rateLimitMap.set(email, { count: 1, resetAt: now + 10 * 60 * 1000 }); // 10 minutes
    return { allowed: true };
  }

  if (limit.count >= 3) {
    const resetIn = Math.ceil((limit.resetAt - now) / 1000 / 60); // minutes
    return { allowed: false, resetIn };
  }

  limit.count++;
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, purpose, userId } = body;

    // Validate input
    if (!email || !purpose) {
      return NextResponse.json(
        { error: 'Email và purpose là bắt buộc' },
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

    // Validate purpose
    const validPurposes = ['create_password', 'link_google', 'register', 'reset_password'];
    if (!validPurposes.includes(purpose)) {
      return NextResponse.json(
        { error: 'Purpose không hợp lệ' },
        { status: 400 }
      );
    }

    // Check rate limiting
    const rateLimit = checkRateLimit(email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: `Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau ${rateLimit.resetIn} phút.`,
          resetIn: rateLimit.resetIn
        },
        { status: 429 }
      );
    }

    // Generate verification code
    const code = generateCode();
    const hashedCode = await hashCode(code);
    const expiresAt = getExpirationTime();

    // Store in database
    const supabase = await createClient();
    const { error: dbError } = await supabase
      .from('verification_codes')
      .insert({
        user_id: userId || null,
        email,
        code: hashedCode,
        purpose,
        expires_at: expiresAt,
        attempts: 0,
        max_attempts: 3,
      });

    if (dbError) {
      console.error('[SEND_CODE] Database error:', dbError);
      return NextResponse.json(
        { error: 'Không thể lưu mã xác thực' },
        { status: 500 }
      );
    }

    // Send email
    const emailSent = await sendVerificationCode(email, code, purpose);
    if (!emailSent) {
      console.error('[SEND_CODE] Failed to send email');
      // Don't fail the request, code is still valid
    }

    return NextResponse.json({
      success: true,
      expiresAt,
      message: 'Mã xác thực đã được gửi đến email của bạn',
    });

  } catch (error) {
    console.error('[SEND_CODE] Error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi gửi mã xác thực' },
      { status: 500 }
    );
  }
}

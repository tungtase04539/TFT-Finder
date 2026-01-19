'use client';

/**
 * Register Form Component
 * Email/Password registration with verification code
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import VerificationCodeInput from './VerificationCodeInput';
import { validatePassword, getStrengthColor, getStrengthLabel } from '@/lib/password-validation';

export default function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [riotId, setRiotId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState<number>();

  const passwordValidation = validatePassword(password);

  const handleSendCode = async () => {
    setError('');
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email không hợp lệ');
      return;
    }

    // Validate password
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors[0]);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          purpose: 'register',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Không thể gửi mã xác thực');
        return;
      }

      setStep('verify');
    } catch (err) {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (code: string) => {
    setVerificationError('');
    setLoading(true);

    try {
      // Verify code first
      const verifyResponse = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code,
          purpose: 'register',
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        setVerificationError(verifyData.error || 'Mã xác thực không hợp lệ');
        setAttemptsLeft(verifyData.attemptsLeft);
        setLoading(false);
        return;
      }

      // Register user
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          riotId: riotId || null,
        }),
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        setVerificationError(registerData.error || 'Không thể đăng ký tài khoản');
        setLoading(false);
        return;
      }

      // Success! Redirect to queue
      router.push('/queue');
      router.refresh();
    } catch (err) {
      setVerificationError('Đã xảy ra lỗi. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    await handleSendCode();
  };

  if (step === 'verify') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#c8aa6e] mb-2">
            Nhập mã xác thực
          </h2>
          <p className="text-[#a09080] text-sm">
            Mã xác thực đã được gửi đến <span className="text-[#f0e6d2]">{email}</span>
          </p>
        </div>

        <VerificationCodeInput
          onComplete={handleVerifyCode}
          onResend={handleResendCode}
          attemptsLeft={attemptsLeft}
          error={verificationError}
          loading={loading}
        />

        <button
          onClick={() => setStep('form')}
          className="w-full text-sm text-[#a09080] hover:text-[#f0e6d2] transition-colors"
        >
          ← Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#c8aa6e] mb-2">
          Đăng ký tài khoản
        </h2>
        <p className="text-[#a09080] text-sm">
          Tạo tài khoản TFT Finder mới
        </p>
      </div>

      <div className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-[#f0e6d2] mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-full px-4 py-3 bg-[#1e2328] border-2 border-[#3c3c41] rounded text-[#f0e6d2] placeholder-[#5b5a56] focus:outline-none focus:border-[#c8aa6e] transition-colors"
            disabled={loading}
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-[#f0e6d2] mb-2">
            Mật khẩu
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-[#1e2328] border-2 border-[#3c3c41] rounded text-[#f0e6d2] placeholder-[#5b5a56] focus:outline-none focus:border-[#c8aa6e] transition-colors"
            disabled={loading}
          />
          
          {/* Password strength indicator */}
          {password && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-[#1e2328] rounded overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: passwordValidation.valid
                        ? passwordValidation.strength === 'strong' ? '100%'
                        : passwordValidation.strength === 'medium' ? '66%'
                        : '33%'
                        : '33%',
                      backgroundColor: getStrengthColor(passwordValidation.strength),
                    }}
                  />
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: getStrengthColor(passwordValidation.strength) }}
                >
                  {getStrengthLabel(passwordValidation.strength)}
                </span>
              </div>
              
              {!passwordValidation.valid && (
                <ul className="text-xs text-[#ff4655] space-y-1">
                  {passwordValidation.errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Riot ID (optional) */}
        <div>
          <label className="block text-sm font-medium text-[#f0e6d2] mb-2">
            Riot ID <span className="text-[#5b5a56]">(tùy chọn)</span>
          </label>
          <input
            type="text"
            value={riotId}
            onChange={e => setRiotId(e.target.value)}
            placeholder="PlayerName#TAG"
            className="w-full px-4 py-3 bg-[#1e2328] border-2 border-[#3c3c41] rounded text-[#f0e6d2] placeholder-[#5b5a56] focus:outline-none focus:border-[#c8aa6e] transition-colors"
            disabled={loading}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="text-[#ff4655] text-sm text-center">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSendCode}
          disabled={loading || !email || !password || !passwordValidation.valid}
          className="w-full py-3 bg-gradient-to-b from-[#c8aa6e] to-[#785a28] text-[#010a13] font-bold rounded hover:from-[#f0e6d2] hover:to-[#c8aa6e] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Đang gửi mã...' : 'Gửi mã xác thực'}
        </button>
        
        {/* Info text */}
        <p className="text-xs text-[#a09080] text-center">
          Mã xác thực sẽ được gửi đến email của bạn
        </p>
      </div>
    </div>
  );
}

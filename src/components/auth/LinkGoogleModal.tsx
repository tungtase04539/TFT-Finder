'use client';

/**
 * Link Google Modal Component
 * For email/password users to add Google authentication
 */

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import VerificationCodeInput from './VerificationCodeInput';

interface LinkGoogleModalProps {
  email: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LinkGoogleModal({
  email,
  onClose,
  onSuccess,
}: LinkGoogleModalProps) {
  const [step, setStep] = useState<'initiate' | 'verify' | 'success'>('initiate');
  const [googleEmail, setGoogleEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState<number>();

  const handleInitiateGoogle = async () => {
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      
      // Initiate Google OAuth
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?link_google=true`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) {
        setError('Không thể kết nối với Google');
        setLoading(false);
        return;
      }

      // OAuth will redirect, so we don't need to do anything else here
      // After redirect, user will come back and we'll handle in callback
      
    } catch (err) {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  const handleSendVerificationCode = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          purpose: 'link_google',
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

  const handleVerifyAndLink = async (code: string) => {
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
          purpose: 'link_google',
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        setVerificationError(verifyData.error || 'Mã xác thực không hợp lệ');
        setAttemptsLeft(verifyData.attemptsLeft);
        setLoading(false);
        return;
      }

      // Link Google account
      const linkResponse = await fetch('/api/auth/link-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleEmail: googleEmail || email,
        }),
      });

      const linkData = await linkResponse.json();

      if (!linkResponse.ok) {
        setVerificationError(linkData.error || 'Không thể liên kết Google');
        setLoading(false);
        return;
      }

      setStep('success');
    } catch (err) {
      setVerificationError('Đã xảy ra lỗi. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    await handleSendVerificationCode();
  };

  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f1923] border border-[#1e2328] rounded-lg p-8 max-w-md w-full">
        {/* Step 1: Initiate Google OAuth */}
        {step === 'initiate' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#c8aa6e] mb-2">
                Liên kết Google
              </h2>
              <p className="text-[#a09080] text-sm">
                Thêm Google để có thể đăng nhập nhanh hơn
              </p>
            </div>

            <div className="bg-[#1e2328] border border-[#3c3c41] rounded p-4">
              <p className="text-[#f0e6d2] text-sm">
                Email hiện tại: <span className="text-[#c8aa6e] font-medium">{email}</span>
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-[#a09080] text-sm">
                Sau khi liên kết, bạn có thể đăng nhập bằng:
              </p>
              <ul className="text-[#0ac8b9] text-sm space-y-1 ml-4">
                <li>• Email và mật khẩu</li>
                <li>• Google</li>
              </ul>
            </div>

            {error && (
              <div className="text-[#ff4655] text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleSendVerificationCode}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-b from-[#c8aa6e] to-[#785a28] text-[#010a13] font-bold rounded hover:from-[#f0e6d2] hover:to-[#c8aa6e] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Đang xử lý...' : 'Tiếp tục'}
              </button>

              <button
                onClick={onClose}
                className="w-full py-3 bg-[#1e2328] text-[#f0e6d2] font-medium rounded hover:bg-[#3c3c41] transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Verify code */}
        {step === 'verify' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#c8aa6e] mb-2">
                Nhập mã xác thực
              </h2>
              <p className="text-[#a09080] text-sm">
                Mã đã được gửi đến <span className="text-[#f0e6d2]">{email}</span>
              </p>
            </div>

            <VerificationCodeInput
              onComplete={handleVerifyAndLink}
              onResend={handleResendCode}
              attemptsLeft={attemptsLeft}
              error={verificationError}
              loading={loading}
            />

            <button
              onClick={() => setStep('initiate')}
              className="w-full text-sm text-[#a09080] hover:text-[#f0e6d2] transition-colors"
            >
              ← Quay lại
            </button>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 'success' && (
          <div className="space-y-6 text-center">
            <div className="text-6xl">✅</div>
            
            <div>
              <h2 className="text-2xl font-bold text-[#0ac8b9] mb-2">
                Thành công!
              </h2>
              <p className="text-[#f0e6d2]">
                Tài khoản Google đã được liên kết
              </p>
            </div>

            <div className="bg-[#1e2328] border border-[#3c3c41] rounded p-4 text-left">
              <p className="text-[#a09080] text-sm mb-2">
                Bạn có thể đăng nhập bằng:
              </p>
              <ul className="text-[#0ac8b9] text-sm space-y-1">
                <li>• Google</li>
                <li>• Email và mật khẩu</li>
              </ul>
            </div>

            <button
              onClick={handleSuccess}
              className="w-full py-3 bg-gradient-to-b from-[#c8aa6e] to-[#785a28] text-[#010a13] font-bold rounded hover:from-[#f0e6d2] hover:to-[#c8aa6e] transition-all"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

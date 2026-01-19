'use client';

/**
 * Create Password Modal Component
 * For Google users to add email/password authentication
 */

import { useState } from 'react';
import VerificationCodeInput from './VerificationCodeInput';
import { validatePassword, getStrengthColor, getStrengthLabel } from '@/lib/password-validation';

interface CreatePasswordModalProps {
  email: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePasswordModal({
  email,
  onClose,
  onSuccess,
}: CreatePasswordModalProps) {
  const [step, setStep] = useState<'request' | 'verify' | 'success'>('request');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState<number>();

  const passwordValidation = validatePassword(password);
  const passwordsMatch = password === confirmPassword;

  const handleRequestCode = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          purpose: 'create_password',
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

  const handleVerifyAndCreate = async (code: string) => {
    setVerificationError('');
    
    // Validate password
    if (!passwordValidation.valid) {
      setVerificationError(passwordValidation.errors[0]);
      return;
    }

    if (!passwordsMatch) {
      setVerificationError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);

    try {
      // Verify code first
      const verifyResponse = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code,
          purpose: 'create_password',
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        setVerificationError(verifyData.error || 'Mã xác thực không hợp lệ');
        setAttemptsLeft(verifyData.attemptsLeft);
        setLoading(false);
        return;
      }

      // Create password
      const createResponse = await fetch('/api/auth/create-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        setVerificationError(createData.error || 'Không thể tạo mật khẩu');
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
    await handleRequestCode();
  };

  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f1923] border border-[#1e2328] rounded-lg p-8 max-w-md w-full">
        {/* Step 1: Request code */}
        {step === 'request' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#c8aa6e] mb-2">
                Tạo mật khẩu
              </h2>
              <p className="text-[#a09080] text-sm">
                Thêm mật khẩu để có thể đăng nhập bằng email
              </p>
            </div>

            <div className="bg-[#1e2328] border border-[#3c3c41] rounded p-4">
              <p className="text-[#f0e6d2] text-sm">
                Email: <span className="text-[#c8aa6e] font-medium">{email}</span>
              </p>
            </div>

            <div className="space-y-4">
              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-[#f0e6d2] mb-2">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-[#1e2328] border-2 border-[#3c3c41] rounded text-[#f0e6d2] placeholder-[#5b5a56] focus:outline-none focus:border-[#c8aa6e] transition-colors"
                  disabled={loading}
                />
                
                {/* Password strength */}
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

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-[#f0e6d2] mb-2">
                  Xác nhận mật khẩu
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-[#1e2328] border-2 border-[#3c3c41] rounded text-[#f0e6d2] placeholder-[#5b5a56] focus:outline-none focus:border-[#c8aa6e] transition-colors"
                  disabled={loading}
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-[#ff4655] mt-1">
                    Mật khẩu không khớp
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="text-[#ff4655] text-sm text-center">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-[#1e2328] text-[#f0e6d2] font-medium rounded hover:bg-[#3c3c41] transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleRequestCode}
                disabled={loading || !password || !confirmPassword || !passwordValidation.valid || !passwordsMatch}
                className="flex-1 py-3 bg-gradient-to-b from-[#c8aa6e] to-[#785a28] text-[#010a13] font-bold rounded hover:from-[#f0e6d2] hover:to-[#c8aa6e] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Đang xử lý...' : 'Tiếp tục'}
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
              onComplete={handleVerifyAndCreate}
              onResend={handleResendCode}
              attemptsLeft={attemptsLeft}
              error={verificationError}
              loading={loading}
            />

            <button
              onClick={() => setStep('request')}
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
                Mật khẩu đã được tạo thành công
              </p>
            </div>

            <div className="bg-[#1e2328] border border-[#3c3c41] rounded p-4 text-left">
              <p className="text-[#a09080] text-sm mb-2">
                Bạn có thể đăng nhập bằng:
              </p>
              <ul className="text-[#0ac8b9] text-sm space-y-1">
                <li>• Email và mật khẩu</li>
                <li>• Google</li>
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

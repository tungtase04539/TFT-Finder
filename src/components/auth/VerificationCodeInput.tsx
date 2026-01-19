'use client';

/**
 * Verification Code Input Component
 * 6-digit code input with auto-focus and validation
 */

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';

interface VerificationCodeInputProps {
  onComplete: (code: string) => void;
  onResend: () => void;
  attemptsLeft?: number;
  error?: string;
  loading?: boolean;
  resendCooldown?: number; // seconds
}

export default function VerificationCodeInput({
  onComplete,
  onResend,
  attemptsLeft,
  error,
  loading = false,
  resendCooldown = 60,
}: VerificationCodeInputProps) {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (newCode.every(digit => digit !== '')) {
      onComplete(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Backspace: clear current and focus previous
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Arrow keys navigation
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Only accept 6 digits
    if (/^\d{6}$/.test(pastedData)) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      onComplete(pastedData);
    }
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    setCooldown(resendCooldown);
    setCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    onResend();
  };

  return (
    <div className="space-y-4">
      {/* Code inputs */}
      <div className="flex gap-2 justify-center">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={el => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(index, e.target.value)}
            onKeyDown={e => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={loading}
            className={`
              w-12 h-14 text-center text-2xl font-bold
              bg-[#1e2328] border-2 rounded
              text-[#f0e6d2] placeholder-[#5b5a56]
              focus:outline-none focus:border-[#c8aa6e]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
              ${error ? 'border-[#ff4655]' : 'border-[#3c3c41]'}
            `}
            autoFocus={index === 0}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="text-[#ff4655] text-sm text-center">
          {error}
        </div>
      )}

      {/* Attempts left */}
      {attemptsLeft !== undefined && attemptsLeft > 0 && (
        <div className="text-[#a09080] text-sm text-center">
          Còn {attemptsLeft} lần thử
        </div>
      )}

      {/* Resend button */}
      <div className="text-center">
        <button
          onClick={handleResend}
          disabled={cooldown > 0 || loading}
          className={`
            text-sm font-medium
            ${cooldown > 0 || loading
              ? 'text-[#5b5a56] cursor-not-allowed'
              : 'text-[#c8aa6e] hover:text-[#f0e6d2]'
            }
            transition-colors
          `}
        >
          {cooldown > 0
            ? `Gửi lại sau ${cooldown}s`
            : 'Gửi lại mã xác thực'
          }
        </button>
      </div>
    </div>
  );
}

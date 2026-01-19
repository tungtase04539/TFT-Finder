'use client';

/**
 * Auth Method Card Component
 * Displays authentication method status and actions
 */

interface AuthMethodCardProps {
  type: 'google' | 'password';
  connected: boolean;
  email?: string;
  onAction: () => void;
}

export default function AuthMethodCard({
  type,
  connected,
  email,
  onAction,
}: AuthMethodCardProps) {
  const config = {
    google: {
      icon: '🔵',
      title: 'Google',
      description: 'Đăng nhập nhanh với tài khoản Google',
      actionLabel: connected ? 'Đã liên kết' : 'Liên kết Google',
    },
    password: {
      icon: '🔑',
      title: 'Email & Mật khẩu',
      description: 'Đăng nhập bằng email và mật khẩu',
      actionLabel: connected ? 'Đổi mật khẩu' : 'Tạo mật khẩu',
    },
  };

  const { icon, title, description, actionLabel } = config[type];

  return (
    <div className="bg-[#1e2328] border border-[#3c3c41] rounded-lg p-6">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="text-4xl">{icon}</div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-[#f0e6d2] mb-1">
            {title}
          </h3>
          <p className="text-sm text-[#a09080] mb-3">
            {description}
          </p>

          {/* Email if connected */}
          {connected && email && (
            <p className="text-sm text-[#0ac8b9] mb-3">
              {email}
            </p>
          )}

          {/* Status badge */}
          <div className="flex items-center gap-3">
            {connected ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#0ac8b9]/20 text-[#0ac8b9] text-xs font-medium rounded">
                <span>✓</span> Đã kết nối
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#5b5a56]/20 text-[#a09080] text-xs font-medium rounded">
                Chưa kết nối
              </span>
            )}
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={onAction}
          className={`
            px-4 py-2 rounded font-medium text-sm transition-all
            ${connected
              ? 'bg-[#3c3c41] text-[#f0e6d2] hover:bg-[#5b5a56]'
              : 'bg-gradient-to-b from-[#c8aa6e] to-[#785a28] text-[#010a13] hover:from-[#f0e6d2] hover:to-[#c8aa6e]'
            }
          `}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

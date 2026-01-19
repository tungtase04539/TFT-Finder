'use client';

import { formatBanTimeRemaining } from '@/lib/ban-middleware';
import Link from 'next/link';

interface BanMessageProps {
  banType: 'temporary' | 'permanent';
  bannedUntil?: string | null;
  banReason?: string | null;
}

export default function BanMessage({ banType, bannedUntil, banReason }: BanMessageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-br from-tft-dark via-tft-dark-light to-tft-dark">
      <div className="card-tft p-8 rounded-xl max-w-md w-full text-center">
        {/* Ban Icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-red-500 mb-4">
          {banType === 'permanent' ? 'Tài Khoản Bị Cấm Vĩnh Viễn' : 'Tài Khoản Bị Cấm Tạm Thời'}
        </h1>

        {/* Ban Details */}
        <div className="space-y-4 mb-6">
          {banType === 'temporary' && bannedUntil && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-orange-400 text-sm mb-1">Thời gian còn lại:</p>
              <p className="text-orange-300 font-bold text-lg">
                {formatBanTimeRemaining(bannedUntil)}
              </p>
            </div>
          )}

          {banReason && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm mb-1">Lý do:</p>
              <p className="text-red-300">{banReason}</p>
            </div>
          )}

          {banType === 'permanent' && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm">
                Tài khoản của bạn đã bị cấm vĩnh viễn do vi phạm nghiêm trọng quy định của hệ thống.
              </p>
            </div>
          )}

          {banType === 'temporary' && (
            <div className="p-4 bg-tft-teal/10 border border-tft-teal/30 rounded-lg">
              <p className="text-tft-teal text-sm">
                Đây là lần cảnh cáo đầu tiên. Nếu vi phạm lần nữa, tài khoản sẽ bị cấm vĩnh viễn.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/"
            className="btn-tft-secondary w-full"
          >
            Về Trang Chủ
          </Link>

          {banType === 'temporary' && (
            <button
              onClick={() => window.location.reload()}
              className="text-tft-gold hover:text-tft-gold-light text-sm"
            >
              Kiểm tra lại trạng thái
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

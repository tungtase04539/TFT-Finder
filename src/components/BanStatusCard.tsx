'use client';

import { formatBanTimeRemaining } from '@/lib/ban-middleware';

interface BanStatusCardProps {
  banType: 'temporary' | 'permanent';
  bannedUntil?: string | null;
  banReason?: string | null;
  violationTypes?: string[];
  banDate?: string;
}

const VIOLATION_LABELS: Record<string, string> = {
  game_sabotage: 'Phá game',
  rule_violation: 'Vi phạm luật',
  harassment: 'Quấy rối',
  discrimination: 'Phân biệt đối xử'
};

export default function BanStatusCard({
  banType,
  bannedUntil,
  banReason,
  violationTypes,
  banDate
}: BanStatusCardProps) {
  return (
    <div className="bg-red-500/10 border-2 border-red-500/50 rounded-xl p-6 mb-6">
      {/* Warning Icon and Title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-red-500">
            {banType === 'permanent' ? '⛔ Tài Khoản Bị Cấm Vĩnh Viễn' : '⚠️ Tài Khoản Bị Cấm Tạm Thời'}
          </h3>
          {banDate && (
            <p className="text-sm text-red-400/80">
              Ngày cấm: {new Date(banDate).toLocaleString('vi-VN')}
            </p>
          )}
        </div>
      </div>

      {/* Ban Details */}
      <div className="space-y-3">
        {/* Time Remaining for Temporary Bans */}
        {banType === 'temporary' && bannedUntil && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <p className="text-sm text-orange-400/80 mb-1">Thời gian còn lại:</p>
            <p className="text-2xl font-bold text-orange-400">
              {formatBanTimeRemaining(bannedUntil)}
            </p>
          </div>
        )}

        {/* Ban Reason */}
        {banReason && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-sm text-red-400/80 mb-1">Lý do:</p>
            <p className="text-red-300">{banReason}</p>
          </div>
        )}

        {/* Violation Types */}
        {violationTypes && violationTypes.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-sm text-red-400/80 mb-2">Vi phạm:</p>
            <div className="flex flex-wrap gap-2">
              {violationTypes.map((type) => (
                <span
                  key={type}
                  className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg text-sm font-medium border border-red-500/30"
                >
                  {VIOLATION_LABELS[type] || type}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Warning Message */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-sm text-yellow-300">
            {banType === 'permanent' ? (
              <>
                ⚠️ Tài khoản của bạn đã bị cấm vĩnh viễn do vi phạm nghiêm trọng quy định hệ thống. 
                Bạn không thể tham gia vào bất kỳ phòng nào.
              </>
            ) : (
              <>
                ⚠️ Đây là lần cảnh cáo đầu tiên. Nếu vi phạm lần nữa, tài khoản sẽ bị cấm vĩnh viễn.
                Bạn sẽ có thể sử dụng lại hệ thống sau khi hết thời gian cấm.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

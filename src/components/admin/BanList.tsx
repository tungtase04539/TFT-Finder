'use client';

import { useState } from 'react';
import { formatBanTimeRemaining } from '@/lib/ban-middleware';

interface Ban {
  id: string;
  user_id: string;
  ban_type: 'temporary' | 'permanent';
  reason: string;
  created_at: string;
  expires_at: string | null;
  user_profile?: {
    riot_id: string;
  };
  report?: {
    violation_types: string[];
  };
}

interface BanListProps {
  bans: Ban[];
  onUnban: (banId: string, userId: string, riotId: string, isPermanent: boolean) => Promise<void>;
}

const VIOLATION_LABELS: Record<string, string> = {
  game_sabotage: 'Phá game',
  rule_violation: 'Vi phạm luật',
  harassment: 'Quấy rối',
  discrimination: 'Phân biệt đối xử'
};

export default function BanList({ bans, onUnban }: BanListProps) {
  const [unbanningId, setUnbanningId] = useState<string | null>(null);

  const handleUnban = async (ban: Ban) => {
    if (!confirm(`Xác nhận gỡ ban cho ${ban.user_profile?.riot_id}?`)) {
      return;
    }

    setUnbanningId(ban.id);
    try {
      await onUnban(
        ban.id,
        ban.user_id,
        ban.user_profile?.riot_id || '',
        ban.ban_type === 'permanent'
      );
    } finally {
      setUnbanningId(null);
    }
  };

  if (bans.length === 0) {
    return (
      <div className="text-center py-12 text-tft-gold/50">
        Không có lệnh cấm nào
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bans.map((ban) => (
        <div
          key={ban.id}
          className="card-tft p-6 rounded-lg border border-tft-gold/20"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-bold text-tft-gold">
                  {ban.user_profile?.riot_id || 'Unknown User'}
                </h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    ban.ban_type === 'permanent'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  }`}
                >
                  {ban.ban_type === 'permanent' ? 'Vĩnh viễn' : 'Tạm thời 24h'}
                </span>
              </div>

              {/* Ban Date */}
              <p className="text-sm text-tft-gold/60">
                Bị cấm: {new Date(ban.created_at).toLocaleString('vi-VN')}
              </p>

              {/* Time Remaining for Temporary Bans */}
              {ban.ban_type === 'temporary' && ban.expires_at && (
                <p className="text-sm text-orange-400 mt-1">
                  Còn lại: {formatBanTimeRemaining(ban.expires_at)}
                </p>
              )}
            </div>

            {/* Unban Button */}
            <button
              onClick={() => handleUnban(ban)}
              disabled={unbanningId === ban.id}
              className="px-4 py-2 bg-tft-teal/20 hover:bg-tft-teal/30 text-tft-teal rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            >
              {unbanningId === ban.id ? (
                <span className="flex items-center gap-2">
                  <div className="loading-spinner w-4 h-4 border-2"></div>
                  Đang gỡ...
                </span>
              ) : (
                'Gỡ Ban'
              )}
            </button>
          </div>

          {/* Reason */}
          <div className="mb-4">
            <p className="text-sm text-tft-gold/60 mb-1">Lý do:</p>
            <p className="text-tft-gold-light">{ban.reason}</p>
          </div>

          {/* Violation Types */}
          {ban.report?.violation_types && ban.report.violation_types.length > 0 && (
            <div>
              <p className="text-sm text-tft-gold/60 mb-2">Vi phạm:</p>
              <div className="flex flex-wrap gap-2">
                {ban.report.violation_types.map((type) => (
                  <span
                    key={type}
                    className="px-3 py-1 bg-red-500/10 text-red-400 rounded-lg text-xs border border-red-500/30"
                  >
                    {VIOLATION_LABELS[type] || type}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

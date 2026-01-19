'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  room_id: string;
  violation_types: string[];
  description: string | null;
  evidence_urls: string[];
  status: string;
  created_at: string;
  reporter?: {
    riot_id: string;
    profile_icon_id: number;
  };
  reported_user?: {
    riot_id: string;
    profile_icon_id: number;
    ban_count: number;
  };
}

interface ReportCardProps {
  report: Report;
  onApprove: (reportId: string, reportedUserId: string, banCount: number) => void;
  onReject: (reportId: string) => void;
}

const VIOLATION_LABELS: Record<string, string> = {
  game_sabotage: '🎮 Phá game',
  rule_violation: '📜 Phá luật',
  harassment: '😡 Lăng mạ',
  discrimination: '⚠️ Phân biệt'
};

export default function ReportCard({ report, onApprove, onReject }: ReportCardProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const getIconUrl = (iconId: number) =>
    `https://ddragon.leagueoflegends.com/cdn/15.1.1/img/profileicon/${iconId || 29}.png`;

  const handleApprove = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      await onApprove(
        report.id,
        report.reported_user_id,
        report.reported_user?.ban_count || 0
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      await onReject(report.id);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="bg-tft-dark-secondary border border-tft-gold/20 rounded-lg p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-tft-gold/60">
                {new Date(report.created_at).toLocaleString('vi-VN')}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                report.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {report.status === 'pending' ? '⏳ Chờ duyệt' :
                 report.status === 'approved' ? '✅ Đã duyệt' :
                 '❌ Đã từ chối'}
              </span>
            </div>
            <p className="text-xs text-tft-gold/40">ID: {report.id}</p>
          </div>
        </div>

        {/* Reporter and Reported User */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Reporter */}
          <div className="bg-tft-dark border border-blue-500/20 rounded-lg p-3">
            <p className="text-xs text-blue-400 mb-2">👤 Người báo cáo</p>
            <div className="flex items-center gap-2">
              <Image
                src={getIconUrl(report.reporter?.profile_icon_id || 29)}
                alt="reporter"
                width={32}
                height={32}
                className="rounded-full"
                unoptimized
              />
              <span className="text-sm text-tft-gold-light">
                {report.reporter?.riot_id || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Reported User */}
          <div className="bg-tft-dark border border-red-500/20 rounded-lg p-3">
            <p className="text-xs text-red-400 mb-2">🚫 Người bị báo cáo</p>
            <div className="flex items-center gap-2">
              <Image
                src={getIconUrl(report.reported_user?.profile_icon_id || 29)}
                alt="reported"
                width={32}
                height={32}
                className="rounded-full"
                unoptimized
              />
              <div className="flex-1">
                <p className="text-sm text-tft-gold-light">
                  {report.reported_user?.riot_id || 'Unknown'}
                </p>
                <p className="text-xs text-red-400">
                  Số lần bị cấm: {report.reported_user?.ban_count || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Violation Types */}
        <div className="mb-4">
          <p className="text-sm text-tft-gold mb-2">⚠️ Loại vi phạm:</p>
          <div className="flex flex-wrap gap-2">
            {report.violation_types.map((type) => (
              <span
                key={type}
                className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm border border-red-500/30"
              >
                {VIOLATION_LABELS[type] || type}
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        {report.description && (
          <div className="mb-4">
            <p className="text-sm text-tft-gold mb-2">📝 Mô tả:</p>
            <div className="bg-tft-dark border border-tft-gold/20 rounded-lg p-3">
              <p className="text-sm text-tft-gold-light whitespace-pre-wrap">
                {report.description}
              </p>
            </div>
          </div>
        )}

        {/* Evidence Images */}
        {report.evidence_urls && report.evidence_urls.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-tft-gold mb-2">
              📸 Bằng chứng ({report.evidence_urls.length} ảnh):
            </p>
            <div className="grid grid-cols-3 gap-2">
              {report.evidence_urls.map((url, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(url)}
                  className="relative aspect-video bg-tft-dark border border-tft-gold/20 rounded-lg overflow-hidden hover:border-tft-teal/50 transition-colors group"
                >
                  <Image
                    src={url}
                    alt={`Evidence ${index + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm">🔍 Xem</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {report.status === 'pending' && (
          <div className="flex gap-3 pt-4 border-t border-tft-gold/20">
            <button
              onClick={handleApprove}
              disabled={processing}
              className="flex-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg py-2 px-4 hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? '⏳ Đang xử lý...' : '✅ Duyệt & Cấm'}
            </button>
            <button
              onClick={handleReject}
              disabled={processing}
              className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg py-2 px-4 hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? '⏳ Đang xử lý...' : '❌ Từ chối'}
            </button>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 transition-colors z-10"
            >
              ✕
            </button>
            <div className="relative w-full h-full">
              <Image
                src={selectedImage}
                alt="Evidence full size"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

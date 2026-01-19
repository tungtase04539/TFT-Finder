'use client';

import { useState } from 'react';

interface BanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (banType: 'temporary' | 'permanent') => Promise<void>;
  userName: string;
  currentBanCount: number;
  violationTypes: string[];
}

const VIOLATION_LABELS: Record<string, string> = {
  game_sabotage: '🎮 Phá game',
  rule_violation: '📜 Phá luật',
  harassment: '😡 Lăng mạ',
  discrimination: '⚠️ Phân biệt'
};

export default function BanModal({
  isOpen,
  onClose,
  onConfirm,
  userName,
  currentBanCount,
  violationTypes
}: BanModalProps) {
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  // Determine suggested ban type based on ban count
  const suggestedBanType: 'temporary' | 'permanent' = currentBanCount >= 1 ? 'permanent' : 'temporary';
  const [selectedBanType, setSelectedBanType] = useState<'temporary' | 'permanent'>(suggestedBanType);

  const handleConfirm = async () => {
    if (processing) return;
    
    setProcessing(true);
    try {
      await onConfirm(selectedBanType);
      onClose();
    } catch (error) {
      console.error('[BAN MODAL] Error:', error);
      alert('Có lỗi xảy ra khi áp dụng lệnh cấm');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-tft-dark border border-tft-gold/20 rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-tft-gold">
            🚫 Áp dụng lệnh cấm
          </h3>
          <button
            onClick={onClose}
            disabled={processing}
            className="text-tft-gold/60 hover:text-tft-gold transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* User Info */}
        <div className="bg-tft-dark-secondary border border-red-500/20 rounded-lg p-4 mb-4">
          <p className="text-sm text-tft-gold/60 mb-1">Người dùng:</p>
          <p className="text-lg font-semibold text-red-400">{userName}</p>
          <p className="text-sm text-red-400/80 mt-2">
            Số lần bị cấm trước đó: <span className="font-bold">{currentBanCount}</span>
          </p>
        </div>

        {/* Violation Types */}
        <div className="mb-4">
          <p className="text-sm text-tft-gold mb-2">Vi phạm:</p>
          <div className="flex flex-wrap gap-2">
            {violationTypes.map((type) => (
              <span
                key={type}
                className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs border border-red-500/30"
              >
                {VIOLATION_LABELS[type] || type}
              </span>
            ))}
          </div>
        </div>

        {/* Ban Type Selection */}
        <div className="mb-6">
          <p className="text-sm text-tft-gold mb-3">Chọn loại lệnh cấm:</p>
          
          {/* Temporary Ban Option */}
          <button
            onClick={() => setSelectedBanType('temporary')}
            disabled={processing}
            className={`w-full mb-3 p-4 rounded-lg border-2 transition-all text-left ${
              selectedBanType === 'temporary'
                ? 'border-yellow-500 bg-yellow-500/10'
                : 'border-tft-gold/20 bg-tft-dark-secondary hover:border-yellow-500/50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                selectedBanType === 'temporary'
                  ? 'border-yellow-500 bg-yellow-500'
                  : 'border-tft-gold/50'
              }`}>
                {selectedBanType === 'temporary' && (
                  <div className="w-full h-full flex items-center justify-center text-tft-dark text-xs">
                    ✓
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-yellow-400 mb-1">
                  ⏰ Cấm 24 giờ
                  {currentBanCount === 0 && (
                    <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                      Đề xuất
                    </span>
                  )}
                </p>
                <p className="text-xs text-tft-gold/60">
                  Người dùng sẽ bị cấm trong 24 giờ. Sau đó có thể sử dụng lại.
                </p>
                <p className="text-xs text-yellow-400/80 mt-1">
                  • Ban count sẽ tăng lên {currentBanCount + 1}
                </p>
              </div>
            </div>
          </button>

          {/* Permanent Ban Option */}
          <button
            onClick={() => setSelectedBanType('permanent')}
            disabled={processing}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
              selectedBanType === 'permanent'
                ? 'border-red-500 bg-red-500/10'
                : 'border-tft-gold/20 bg-tft-dark-secondary hover:border-red-500/50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                selectedBanType === 'permanent'
                  ? 'border-red-500 bg-red-500'
                  : 'border-tft-gold/50'
              }`}>
                {selectedBanType === 'permanent' && (
                  <div className="w-full h-full flex items-center justify-center text-white text-xs">
                    ✓
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-400 mb-1">
                  🔒 Cấm vĩnh viễn
                  {currentBanCount >= 1 && (
                    <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                      Đề xuất
                    </span>
                  )}
                </p>
                <p className="text-xs text-tft-gold/60">
                  Người dùng sẽ bị cấm vĩnh viễn. Riot ID cũng sẽ bị cấm.
                </p>
                <p className="text-xs text-red-400/80 mt-1">
                  • Ban count sẽ được set = 2
                </p>
                <p className="text-xs text-red-400/80">
                  • Riot ID sẽ bị thêm vào blacklist
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Warning */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
          <p className="text-xs text-red-400">
            ⚠️ <span className="font-semibold">Cảnh báo:</span> Hành động này không thể hoàn tác dễ dàng. 
            Hãy chắc chắn rằng báo cáo là chính xác.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={processing}
            className="flex-1 bg-gray-600 text-gray-200 rounded-lg py-2 px-4 hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing}
            className="flex-1 bg-red-500 text-white rounded-lg py-2 px-4 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {processing ? '⏳ Đang xử lý...' : '🚫 Xác nhận cấm'}
          </button>
        </div>
      </div>
    </div>
  );
}

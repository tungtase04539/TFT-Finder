'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';
import Image from 'next/image';

interface ReportModalProps {
  reportedUserId: string;
  reportedUserName: string;
  roomId: string;
  onClose: () => void;
  onSubmit: () => void;
}

type ViolationType = 'game_sabotage' | 'rule_violation' | 'harassment' | 'discrimination';

const VIOLATION_LABELS: Record<ViolationType, string> = {
  game_sabotage: '🎮 Phá game (AFK, troll, cố tình thua)',
  rule_violation: '📜 Vi phạm luật phòng',
  harassment: '💬 Lăng mạ, xúc phạm',
  discrimination: '⚠️ Phân biệt chủng tộc, giới tính'
};

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ReportModal({
  reportedUserId,
  reportedUserName,
  roomId,
  onClose,
  onSubmit
}: ReportModalProps) {
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>([]);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleViolationType = (type: ViolationType) => {
    if (violationTypes.includes(type)) {
      setViolationTypes(violationTypes.filter(t => t !== type));
    } else {
      setViolationTypes([...violationTypes, type]);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate number of images
    if (images.length + files.length > MAX_IMAGES) {
      setError(`Chỉ được tải tối đa ${MAX_IMAGES} hình ảnh`);
      return;
    }

    // Validate image sizes
    const invalidFiles = files.filter(f => f.size > MAX_IMAGE_SIZE);
    if (invalidFiles.length > 0) {
      setError(`Mỗi hình ảnh phải nhỏ hơn 5MB`);
      return;
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const invalidTypes = files.filter(f => !validTypes.includes(f.type));
    if (invalidTypes.length > 0) {
      setError('Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WebP)');
      return;
    }

    setError('');

    // Add new images
    const newImages = [...images, ...files];
    setImages(newImages);

    // Generate previews
    const newPreviews = [...imagePreviews];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        setImagePreviews([...newPreviews]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validate violation types
    if (violationTypes.length === 0) {
      setError('Vui lòng chọn ít nhất một loại vi phạm');
      toast.warning('Vui lòng chọn ít nhất một loại vi phạm');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('roomId', roomId);
      formData.append('reportedUserId', reportedUserId);
      formData.append('violationTypes', JSON.stringify(violationTypes));
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      
      images.forEach((image, index) => {
        formData.append(`evidence_${index}`, image);
      });

      const response = await fetch('/api/reports/create', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Không thể gửi báo cáo');
      }

      console.log('[REPORT] Report submitted successfully:', result);
      toast.success('Đã gửi báo cáo thành công! Admin sẽ xem xét.');
      
      // Call onSubmit callback
      onSubmit();
      
      // Close modal
      onClose();

    } catch (err) {
      console.error('[REPORT] Submit error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Lỗi khi gửi báo cáo';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-tft-dark border-2 border-tft-gold/30 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-tft-dark border-b border-tft-gold/20 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-tft-gold">
            🚨 Báo cáo vi phạm
          </h2>
          <button
            onClick={onClose}
            className="text-tft-gold/60 hover:text-tft-gold text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Reported User */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm mb-1">Người bị báo cáo:</p>
            <p className="text-tft-gold-light text-lg font-semibold">{reportedUserName}</p>
          </div>

          {/* Violation Types */}
          <div>
            <label className="block text-tft-gold font-semibold mb-3">
              Loại vi phạm <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2">
              {(Object.keys(VIOLATION_LABELS) as ViolationType[]).map(type => (
                <div
                  key={type}
                  onClick={() => toggleViolationType(type)}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                    ${violationTypes.includes(type)
                      ? 'bg-red-500/20 border-2 border-red-500/50'
                      : 'bg-tft-dark-secondary border-2 border-transparent hover:border-tft-gold/20'
                    }
                  `}
                >
                  <div className={`
                    w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-xs
                    ${violationTypes.includes(type)
                      ? 'bg-red-500 text-white'
                      : 'border-2 border-tft-gold/50'
                    }
                  `}>
                    {violationTypes.includes(type) && '✓'}
                  </div>
                  <span className="text-tft-gold-light">{VIOLATION_LABELS[type]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-tft-gold font-semibold mb-2">
              Mô tả chi tiết (tùy chọn)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết về vi phạm..."
              className="input-tft w-full rounded-lg h-32 resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-tft-gold/40 mt-1">
              {description.length}/1000 ký tự
            </p>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-tft-gold font-semibold mb-2">
              Bằng chứng hình ảnh (tùy chọn, tối đa {MAX_IMAGES} ảnh)
            </label>
            
            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square">
                    <Image
                      src={preview}
                      alt={`Evidence ${index + 1}`}
                      fill
                      className="object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {images.length < MAX_IMAGES && (
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-tft-gold/30 rounded-lg p-6 text-center cursor-pointer hover:border-tft-gold/50 transition-colors">
                  <p className="text-tft-gold/60">
                    📷 Click để tải ảnh lên
                  </p>
                  <p className="text-xs text-tft-gold/40 mt-1">
                    JPG, PNG, GIF, WebP - Tối đa 5MB mỗi ảnh
                  </p>
                </div>
              </label>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-yellow-400 text-sm">
              ⚠️ <strong>Lưu ý:</strong> Báo cáo sai sự thật có thể dẫn đến việc tài khoản của bạn bị xử lý.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-tft-dark border-t border-tft-gold/20 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-3 bg-gray-600 text-gray-200 rounded-lg hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || violationTypes.length === 0}
            className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Đang gửi...
              </span>
            ) : (
              '🚨 Gửi báo cáo'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import ReportModal from './ReportModal';

interface ReportButtonProps {
  userId: string;
  userName: string;
  roomId: string;
  currentUserId: string;
}

export default function ReportButton({
  userId,
  userName,
  roomId,
  currentUserId
}: ReportButtonProps) {
  const [showModal, setShowModal] = useState(false);

  // Cannot report yourself
  if (userId === currentUserId) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 border border-red-500/30 rounded transition-colors"
        title={`Báo cáo ${userName}`}
      >
        🚨 Báo cáo
      </button>

      {showModal && (
        <ReportModal
          reportedUserId={userId}
          reportedUserName={userName}
          roomId={roomId}
          onClose={() => setShowModal(false)}
          onSubmit={() => {
            // Show success message
            alert('Đã gửi báo cáo thành công! Admin sẽ xem xét trong thời gian sớm nhất.');
          }}
        />
      )}
    </>
  );
}

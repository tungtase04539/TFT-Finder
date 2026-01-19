'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CopyRiotIdButtonProps {
  riotId: string;
  roomId: string;
  onCopy?: () => void;
}

export default function CopyRiotIdButton({ riotId, roomId, onCopy }: CopyRiotIdButtonProps) {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  const handleCopy = async () => {
    if (copying) return;

    setCopying(true);

    try {
      // Copy to clipboard
      await navigator.clipboard.writeText(riotId);

      // Record copy action timestamp to room
      const supabase = createClient();
      await supabase
        .from('rooms')
        .update({ last_copy_action: new Date().toISOString() })
        .eq('id', roomId);

      // Show success feedback
      setCopied(true);
      
      // Call optional callback
      onCopy?.();

      // Reset after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);

    } catch (error) {
      console.error('[COPY_RIOT_ID] Error:', error);
      alert('Không thể copy. Vui lòng thử lại.');
    } finally {
      setCopying(false);
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={copying}
      className={`
        flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all
        ${copied 
          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
          : 'bg-tft-teal/10 text-tft-teal border border-tft-teal/30 hover:bg-tft-teal/20'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      title={`Copy ${riotId}`}
    >
      {copying ? (
        <>
          <div className="w-3 h-3 border border-tft-teal border-t-transparent rounded-full animate-spin" />
          <span>Đang copy...</span>
        </>
      ) : copied ? (
        <>
          <span>✓</span>
          <span>Đã copy!</span>
        </>
      ) : (
        <>
          <span>📋</span>
          <span>Copy ID</span>
        </>
      )}
    </button>
  );
}

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseMatchResultTrackingProps {
  roomId: string;
  matchId: string | null;
  gameDetectedAt: string | null;
}

export function useMatchResultTracking({
  roomId,
  matchId,
  gameDetectedAt
}: UseMatchResultTrackingProps) {
  const [tracking, setTracking] = useState(false);
  const [tracked, setTracked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId || !gameDetectedAt || tracked) {
      return;
    }

    // Calculate when to track (1 hour after game detected)
    const detectedTime = new Date(gameDetectedAt).getTime();
    const trackTime = detectedTime + (60 * 60 * 1000); // 1 hour
    const now = Date.now();

    // If track time hasn't arrived yet, set a timeout
    if (now < trackTime) {
      const delay = trackTime - now;
      const timeoutId = setTimeout(() => {
        trackMatchResult();
      }, delay);

      return () => clearTimeout(timeoutId);
    } else {
      // Track time has passed, track immediately
      trackMatchResult();
    }
  }, [matchId, gameDetectedAt, tracked]);

  const trackMatchResult = async () => {
    if (tracking || tracked) return;

    setTracking(true);
    setError(null);

    try {
      const response = await fetch('/api/track-match-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, matchId })
      });

      const data = await response.json();

      if (response.ok) {
        setTracked(true);
        console.log('Match result tracked:', data);
      } else {
        // Retry up to 3 times if match data not available
        setError(data.error);
        console.error('Failed to track match result:', data.error);
      }
    } catch (err) {
      setError('Network error');
      console.error('Error tracking match result:', err);
    } finally {
      setTracking(false);
    }
  };

  return {
    tracking,
    tracked,
    error
  };
}

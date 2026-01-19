/**
 * Hook: useMatchDetection
 * Detects when a TFT match has started by polling match history
 * 
 * Auto-detects matches when room is ready (all players agreed)
 * No need for host to manually click "Start Playing"
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface MatchResult {
  started: boolean;
  matchId?: string;
  match?: {
    matchId: string;
    gameType: string;
    gameDatetime: number;
    gameLength: number;
  };
  players?: {
    puuid: string;
    found: boolean;
    placement?: number;
    level?: number;
    goldLeft?: number;
  }[];
  winner?: {
    puuid: string;
    placement: number;
  } | null;
  message?: string;
}

interface UseMatchDetectionOptions {
  puuids: string[];
  enabled: boolean;
  pollInterval?: number; // milliseconds, default 45000 (45 seconds)
  onMatchFound?: (result: MatchResult) => void;
  onMatchStartDetected?: () => void; // Callback when match starts (before completion)
}

export function useMatchDetection({
  puuids,
  enabled,
  pollInterval = 30000,
  onMatchFound,
  onMatchStartDetected,
}: UseMatchDetectionOptions) {
  const [checking, setChecking] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastCheckedMatchId = useRef<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const checkMatch = useCallback(async () => {
    if (!enabled || puuids.length < 2) return;

    setChecking(true);
    setError(null);

    try {
      const response = await fetch('/api/check-match-started', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puuids,
          lastCheckedMatchId: lastCheckedMatchId.current,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check match');
      }

      // Update last checked match ID
      if (data.latestMatchId) {
        lastCheckedMatchId.current = data.latestMatchId;
      }

      // If match started, notify and stop polling
      if (data.started) {
        console.log('[MATCH_DETECTION] Match found!', data);
        setMatchResult(data);
        
        // Call onMatchStartDetected first (for auto-updating room status)
        onMatchStartDetected?.();
        
        // Then call onMatchFound with full results
        onMatchFound?.(data);
        
        // Stop polling after match found
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      } else {
        console.log('[MATCH_DETECTION] No new match yet:', data.message);
      }

    } catch (err) {
      console.error('[MATCH_DETECTION] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setChecking(false);
    }
  }, [enabled, puuids, onMatchFound]);

  // Start/stop polling based on enabled flag
  useEffect(() => {
    if (!enabled || puuids.length < 2) {
      // Clear polling if disabled
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    // Initial check
    checkMatch();

    // Start polling
    pollTimerRef.current = setInterval(checkMatch, pollInterval);

    // Cleanup on unmount
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [enabled, puuids, pollInterval, checkMatch, onMatchStartDetected]);

  const reset = useCallback(() => {
    lastCheckedMatchId.current = null;
    setMatchResult(null);
    setError(null);
  }, []);

  return {
    checking,
    matchResult,
    error,
    reset,
    checkNow: checkMatch,
  };
}

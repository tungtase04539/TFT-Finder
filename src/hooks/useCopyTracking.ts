'use client';

import { useState, useEffect } from 'react';

interface UseCopyTrackingOptions {
  roomId: string;
  roomStatus: string;
  lastCopyAction: string | null;
  enabled: boolean;
}

interface UseCopyTrackingReturn {
  lastCopyTime: Date | null;
  timeSinceLastCopy: number; // milliseconds
  shouldTriggerDetection: boolean; // true if > 3 minutes
  timeUntilDetection: number; // milliseconds remaining until detection
}

const THREE_MINUTES_MS = 3 * 60 * 1000; // 3 minutes in milliseconds

export function useCopyTracking({
  roomId,
  roomStatus,
  lastCopyAction,
  enabled
}: UseCopyTrackingOptions): UseCopyTrackingReturn {
  const [now, setNow] = useState(Date.now());

  // Update current time every second
  useEffect(() => {
    if (!enabled || roomStatus !== 'ready') {
      return;
    }

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, roomStatus]);

  // Calculate time since last copy
  const lastCopyTime = lastCopyAction ? new Date(lastCopyAction) : null;
  const timeSinceLastCopy = lastCopyTime ? now - lastCopyTime.getTime() : 0;
  
  // Should trigger detection if:
  // 1. Room status is "ready"
  // 2. There was at least one copy action
  // 3. More than 3 minutes passed since last copy
  const shouldTriggerDetection = 
    enabled &&
    roomStatus === 'ready' &&
    lastCopyTime !== null &&
    timeSinceLastCopy >= THREE_MINUTES_MS;

  // Time remaining until detection (0 if should trigger)
  const timeUntilDetection = lastCopyTime
    ? Math.max(0, THREE_MINUTES_MS - timeSinceLastCopy)
    : THREE_MINUTES_MS;

  return {
    lastCopyTime,
    timeSinceLastCopy,
    shouldTriggerDetection,
    timeUntilDetection
  };
}

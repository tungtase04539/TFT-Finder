import { renderHook, act } from '@testing-library/react';
import { useCopyTracking } from '../useCopyTracking';

describe('useCopyTracking', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns null lastCopyTime when no copy action', () => {
    const { result } = renderHook(() =>
      useCopyTracking({
        roomId: 'test-room',
        roomStatus: 'ready',
        lastCopyAction: null,
        enabled: true
      })
    );

    expect(result.current.lastCopyTime).toBeNull();
    expect(result.current.timeSinceLastCopy).toBe(0);
  });

  test('calculates time since last copy correctly', () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    const { result } = renderHook(() =>
      useCopyTracking({
        roomId: 'test-room',
        roomStatus: 'ready',
        lastCopyAction: oneMinuteAgo.toISOString(),
        enabled: true
      })
    );

    expect(result.current.lastCopyTime).toEqual(oneMinuteAgo);
    expect(result.current.timeSinceLastCopy).toBeGreaterThanOrEqual(60000);
  });

  test('shouldTriggerDetection is false before 3 minutes', () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    const { result } = renderHook(() =>
      useCopyTracking({
        roomId: 'test-room',
        roomStatus: 'ready',
        lastCopyAction: oneMinuteAgo.toISOString(),
        enabled: true
      })
    );

    expect(result.current.shouldTriggerDetection).toBe(false);
  });

  test('shouldTriggerDetection is true after 3 minutes', () => {
    const now = new Date();
    const fourMinutesAgo = new Date(now.getTime() - 4 * 60000);

    const { result } = renderHook(() =>
      useCopyTracking({
        roomId: 'test-room',
        roomStatus: 'ready',
        lastCopyAction: fourMinutesAgo.toISOString(),
        enabled: true
      })
    );

    expect(result.current.shouldTriggerDetection).toBe(true);
  });

  test('does not trigger detection when room status is not ready', () => {
    const now = new Date();
    const fourMinutesAgo = new Date(now.getTime() - 4 * 60000);

    const { result } = renderHook(() =>
      useCopyTracking({
        roomId: 'test-room',
        roomStatus: 'forming',
        lastCopyAction: fourMinutesAgo.toISOString(),
        enabled: true
      })
    );

    expect(result.current.shouldTriggerDetection).toBe(false);
  });

  test('does not trigger detection when disabled', () => {
    const now = new Date();
    const fourMinutesAgo = new Date(now.getTime() - 4 * 60000);

    const { result } = renderHook(() =>
      useCopyTracking({
        roomId: 'test-room',
        roomStatus: 'ready',
        lastCopyAction: fourMinutesAgo.toISOString(),
        enabled: false
      })
    );

    expect(result.current.shouldTriggerDetection).toBe(false);
  });

  test('calculates timeUntilDetection correctly', () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    const { result } = renderHook(() =>
      useCopyTracking({
        roomId: 'test-room',
        roomStatus: 'ready',
        lastCopyAction: oneMinuteAgo.toISOString(),
        enabled: true
      })
    );

    // Should have ~2 minutes remaining (3 minutes - 1 minute)
    expect(result.current.timeUntilDetection).toBeGreaterThan(100000);
    expect(result.current.timeUntilDetection).toBeLessThanOrEqual(120000);
  });

  test('timeUntilDetection is 0 after 3 minutes', () => {
    const now = new Date();
    const fourMinutesAgo = new Date(now.getTime() - 4 * 60000);

    const { result } = renderHook(() =>
      useCopyTracking({
        roomId: 'test-room',
        roomStatus: 'ready',
        lastCopyAction: fourMinutesAgo.toISOString(),
        enabled: true
      })
    );

    expect(result.current.timeUntilDetection).toBe(0);
  });

  test('updates time every second when enabled', () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    const { result } = renderHook(() =>
      useCopyTracking({
        roomId: 'test-room',
        roomStatus: 'ready',
        lastCopyAction: oneMinuteAgo.toISOString(),
        enabled: true
      })
    );

    const initialTime = result.current.timeSinceLastCopy;

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.timeSinceLastCopy).toBeGreaterThan(initialTime);
  });

  test('does not update when room status is not ready', () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    const { result } = renderHook(() =>
      useCopyTracking({
        roomId: 'test-room',
        roomStatus: 'forming',
        lastCopyAction: oneMinuteAgo.toISOString(),
        enabled: true
      })
    );

    const initialTime = result.current.timeSinceLastCopy;

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Time should not update when status is not ready
    expect(result.current.timeSinceLastCopy).toBe(initialTime);
  });

  test('resets when lastCopyAction changes', () => {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60000);

    const { result, rerender } = renderHook(
      ({ lastCopyAction }) =>
        useCopyTracking({
          roomId: 'test-room',
          roomStatus: 'ready',
          lastCopyAction,
          enabled: true
        }),
      {
        initialProps: { lastCopyAction: twoMinutesAgo.toISOString() }
      }
    );

    expect(result.current.timeSinceLastCopy).toBeGreaterThan(100000);

    // New copy action
    const justNow = new Date();
    rerender({ lastCopyAction: justNow.toISOString() });

    expect(result.current.timeSinceLastCopy).toBeLessThan(1000);
  });
});

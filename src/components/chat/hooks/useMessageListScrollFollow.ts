import { useCallback, useEffect, useRef } from 'react';

interface UseMessageListScrollFollowParams {
  containerRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  skipAutoScrollRef: React.MutableRefObject<boolean>;
  followRef?: React.MutableRefObject<boolean>;
  lastScrollTopRef?: React.MutableRefObject<number>;
  tryPrependMore: () => void;
  tryTrimBackDown: () => void;
  loadMoreAtTopPx: number;
  trimBackAtBottomPx: number;
}

interface UseMessageListScrollFollowResult {
  followRef: React.MutableRefObject<boolean>;
  lastScrollTopRef: React.MutableRefObject<number>;
  scheduleScrollToBottom: () => void;
}

export function useMessageListScrollFollow({
  containerRef,
  contentRef,
  skipAutoScrollRef,
  followRef: followRefParam,
  lastScrollTopRef: lastScrollTopRefParam,
  tryPrependMore,
  tryTrimBackDown,
  loadMoreAtTopPx,
  trimBackAtBottomPx,
}: UseMessageListScrollFollowParams): UseMessageListScrollFollowResult {
  const internalFollowRef = useRef(true);
  const internalLastScrollTopRef = useRef(0);
  const followRef = followRefParam ?? internalFollowRef;
  const lastScrollTopRef = lastScrollTopRefParam ?? internalLastScrollTopRef;
  const userScrollIntentRef = useRef(false);
  const userScrollIntentTimeoutRef = useRef<number | null>(null);
  const followScrollRafRef = useRef<number | null>(null);

  const scheduleScrollToBottom = useCallback(() => {
    if (followScrollRafRef.current != null) return;
    if (typeof requestAnimationFrame !== 'function') return;
    followScrollRafRef.current = requestAnimationFrame(() => {
      followScrollRafRef.current = null;
      const container = containerRef.current;
      if (!container) return;
      if (!followRef.current) return;
      if (skipAutoScrollRef.current) return;

      container.scrollTop = container.scrollHeight;
      lastScrollTopRef.current = container.scrollTop;
    });
  }, [containerRef, skipAutoScrollRef]);

  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;

    if (typeof ResizeObserver !== 'function') {
      return;
    }

    const ro = new ResizeObserver(() => {
      if (skipAutoScrollRef.current) return;
      if (!followRef.current) return;
      scheduleScrollToBottom();
    });

    ro.observe(contentEl);
    scheduleScrollToBottom();

    return () => {
      ro.disconnect();
      if (followScrollRafRef.current != null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(followScrollRafRef.current);
        followScrollRafRef.current = null;
      }
    };
  }, [contentRef, scheduleScrollToBottom, skipAutoScrollRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const REENABLE_AT_BOTTOM_PX = 8;
    const INTENT_TTL_MS = 160;

    const distanceToBottom = () => container.scrollHeight - container.clientHeight - container.scrollTop;
    const isAtBottom = () => distanceToBottom() <= REENABLE_AT_BOTTOM_PX;

    const markUserIntent = () => {
      userScrollIntentRef.current = true;
      if (userScrollIntentTimeoutRef.current != null) {
        window.clearTimeout(userScrollIntentTimeoutRef.current);
      }
      userScrollIntentTimeoutRef.current = window.setTimeout(() => {
        userScrollIntentRef.current = false;
        userScrollIntentTimeoutRef.current = null;
      }, INTENT_TTL_MS);
    };

    const handleScroll = () => {
      const current = container.scrollTop;
      const prev = lastScrollTopRef.current;
      const delta = current - prev;

      if (userScrollIntentRef.current && !skipAutoScrollRef.current) {
        if (container.scrollTop <= loadMoreAtTopPx) {
          tryPrependMore();
        } else {
          const distToBottom = container.scrollHeight - container.clientHeight - container.scrollTop;
          if (distToBottom <= trimBackAtBottomPx) {
            tryTrimBackDown();
          }
        }
      }

      if (followRef.current) {
        if (userScrollIntentRef.current && delta < 0) {
          followRef.current = false;
        }
      } else {
        if (isAtBottom()) {
          followRef.current = true;
        }
      }

      lastScrollTopRef.current = current;
    };

    lastScrollTopRef.current = container.scrollTop;

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('wheel', markUserIntent, { passive: true });
    container.addEventListener('touchstart', markUserIntent, { passive: true });
    container.addEventListener('touchmove', markUserIntent, { passive: true });
    container.addEventListener('pointerdown', markUserIntent, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', markUserIntent);
      container.removeEventListener('touchstart', markUserIntent);
      container.removeEventListener('touchmove', markUserIntent);
      container.removeEventListener('pointerdown', markUserIntent);
      if (userScrollIntentTimeoutRef.current != null) {
        window.clearTimeout(userScrollIntentTimeoutRef.current);
        userScrollIntentTimeoutRef.current = null;
      }
    };
  }, [
    containerRef,
    loadMoreAtTopPx,
    skipAutoScrollRef,
    trimBackAtBottomPx,
    tryPrependMore,
    tryTrimBackDown,
  ]);

  return { followRef, lastScrollTopRef, scheduleScrollToBottom };
}

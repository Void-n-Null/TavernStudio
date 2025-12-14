import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

export interface VisibleNodeIdsResult {
  ids: string[];
  hiddenCount: number;
  startIndex: number;
}

interface UseMessageListLazyWindowingParams {
  containerRef: React.RefObject<HTMLDivElement | null>;
  activeNodeIds: string[];
  skipAutoScrollRef: React.MutableRefObject<boolean>;
  lastScrollTopRef: React.MutableRefObject<number>;
  initialRenderLimit: number;
  loadMoreBatch: number;
}

interface UseMessageListLazyWindowingResult {
  visibleNodeIds: VisibleNodeIdsResult;
  tryPrependMore: () => void;
  tryTrimBackDown: () => void;
}

export function useMessageListLazyWindowing({
  containerRef,
  activeNodeIds,
  skipAutoScrollRef,
  lastScrollTopRef,
  initialRenderLimit,
  loadMoreBatch,
}: UseMessageListLazyWindowingParams): UseMessageListLazyWindowingResult {
  const pendingLazyScrollAnchorRef = useRef<{
    prevScrollHeight: number;
    prevScrollTop: number;
    reason: 'prepend' | 'trim';
  } | null>(null);
  const lazyRenderInFlightRef = useRef(false);

  const [renderLimit, setRenderLimit] = useState(initialRenderLimit);
  const lazyRenderPathRef = useRef<{ length: number; firstId: string | null }>({ length: 0, firstId: null });

  const renderLimitRef = useRef(renderLimit);
  renderLimitRef.current = renderLimit;

  useEffect(() => {
    const pathLength = activeNodeIds.length;
    const firstId = activeNodeIds[0] ?? null;
    const prev = lazyRenderPathRef.current;

    const branchChanged = firstId !== prev.firstId;
    const significantLengthChange = Math.abs(pathLength - prev.length) > 1;

    if (branchChanged || significantLengthChange) {
      setRenderLimit(initialRenderLimit);
    }
    lazyRenderPathRef.current = { length: pathLength, firstId };
  }, [activeNodeIds, initialRenderLimit]);

  useLayoutEffect(() => {
    const anchor = pendingLazyScrollAnchorRef.current;
    const container = containerRef.current;
    if (!anchor || !container) return;

    pendingLazyScrollAnchorRef.current = null;
    lazyRenderInFlightRef.current = false;

    const nextScrollHeight = container.scrollHeight;
    const delta = nextScrollHeight - anchor.prevScrollHeight;
    if (Math.abs(delta) < 1) return;

    const maxScrollTop = Math.max(0, nextScrollHeight - container.clientHeight);
    const target = Math.max(0, Math.min(maxScrollTop, anchor.prevScrollTop + delta));

    if (!skipAutoScrollRef.current) {
      const prevScrollBehavior = container.style.scrollBehavior;
      container.style.scrollBehavior = 'auto';
      container.scrollTop = target;
      container.style.scrollBehavior = prevScrollBehavior;
      lastScrollTopRef.current = container.scrollTop;
    }
  }, [containerRef, lastScrollTopRef, renderLimit, skipAutoScrollRef]);

  const visibleNodeIds: VisibleNodeIdsResult = useMemo(() => {
    if (activeNodeIds.length <= renderLimit) {
      return { ids: activeNodeIds, hiddenCount: 0, startIndex: 0 };
    }
    const startIndex = activeNodeIds.length - renderLimit;
    return {
      ids: activeNodeIds.slice(startIndex),
      hiddenCount: startIndex,
      startIndex,
    };
  }, [activeNodeIds, renderLimit]);

  const hiddenCountRef = useRef(visibleNodeIds.hiddenCount);
  hiddenCountRef.current = visibleNodeIds.hiddenCount;

  const tryPrependMore = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (lazyRenderInFlightRef.current) return;
    if (skipAutoScrollRef.current) return;
    if (hiddenCountRef.current <= 0) return;

    lazyRenderInFlightRef.current = true;
    pendingLazyScrollAnchorRef.current = {
      prevScrollHeight: container.scrollHeight,
      prevScrollTop: container.scrollTop,
      reason: 'prepend',
    };

    setRenderLimit((prev) => prev + loadMoreBatch);
  }, [containerRef, loadMoreBatch, skipAutoScrollRef]);

  const tryTrimBackDown = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (lazyRenderInFlightRef.current) return;
    if (skipAutoScrollRef.current) return;
    if (renderLimitRef.current <= initialRenderLimit) return;

    lazyRenderInFlightRef.current = true;
    pendingLazyScrollAnchorRef.current = {
      prevScrollHeight: container.scrollHeight,
      prevScrollTop: container.scrollTop,
      reason: 'trim',
    };

    setRenderLimit(initialRenderLimit);
  }, [containerRef, initialRenderLimit, skipAutoScrollRef]);

  return { visibleNodeIds, tryPrependMore, tryTrimBackDown };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, RefObject } from 'react';
import { useOptimisticValue } from '../../../hooks/useOptimisticValue';

export function useMessageListResize({
  wrapperRef,
  storedWidth,
  setLayout,
}: {
  wrapperRef: RefObject<HTMLDivElement | null>;
  storedWidth: number;
  setLayout: (layout: { containerWidth: number }) => unknown;
}): {
  isMobile: boolean;
  isDragging: boolean;
  dragEdge: 'left' | 'right' | null;
  wrapperStyle: CSSProperties;
  leftHandleStyle: CSSProperties;
  rightHandleStyle: CSSProperties;
  handleMouseDown: (edge: 'left' | 'right') => (e: ReactMouseEvent<HTMLDivElement>) => void;
} {
  const dragRef = useRef<{ edge: 'left' | 'right'; startX: number; startWidthPercent: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragEdgeRef = useRef<'left' | 'right' | null>(null);

  const [currentWidth, setLocalWidth] = useOptimisticValue(storedWidth);

  const currentWidthRef = useRef(currentWidth);
  const setLocalWidthRef = useRef(setLocalWidth);
  const setLayoutRef = useRef(setLayout);
  currentWidthRef.current = currentWidth;
  setLocalWidthRef.current = setLocalWidth;
  setLayoutRef.current = setLayout;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseDown = useCallback(
    (edge: 'left' | 'right') => (e: ReactMouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragRef.current = {
        edge,
        startX: e.clientX,
        startWidthPercent: currentWidthRef.current,
      };
      dragEdgeRef.current = edge;
      setIsDragging(true);

      const container = wrapperRef.current;
      if (container) {
        container.style.width = `${currentWidthRef.current}%`;
      }
    },
    [wrapperRef]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const wrapper = wrapperRef.current;
      if (!dragRef.current || !wrapper) return;

      const { edge, startX, startWidthPercent } = dragRef.current;
      const parentWidth = wrapper.parentElement?.clientWidth ?? window.innerWidth;

      const deltaX = e.clientX - startX;
      const deltaPercent = (deltaX * 2 / parentWidth) * 100;

      let newWidthPercent: number;
      if (edge === 'right') {
        newWidthPercent = startWidthPercent + deltaPercent;
      } else {
        newWidthPercent = startWidthPercent - deltaPercent;
      }

      newWidthPercent = Math.max(20, Math.min(100, newWidthPercent));
      currentWidthRef.current = newWidthPercent;
      wrapper.style.width = `${newWidthPercent}%`;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      const finalWidth = currentWidthRef.current;
      dragRef.current = null;
      dragEdgeRef.current = null;

      setLocalWidthRef.current(finalWidth);
      void setLayoutRef.current({ containerWidth: finalWidth });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, wrapperRef]);

  const wrapperStyle: CSSProperties = {
    width: isMobile ? '100%' : `${(isDragging ? currentWidthRef.current : currentWidth)}%`,
    margin: '0 auto',
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  };

  const handleStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '8px',
    cursor: 'col-resize',
    zIndex: 10,
  };

  const leftHandleStyle: CSSProperties = { ...handleStyle, left: '-4px' };
  const rightHandleStyle: CSSProperties = { ...handleStyle, right: '-4px' };

  return {
    isMobile,
    isDragging,
    dragEdge: dragEdgeRef.current,
    wrapperStyle,
    leftHandleStyle,
    rightHandleStyle,
    handleMouseDown,
  };
}

import { useState, useRef, useCallback, useEffect } from 'react';

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 70, maxOffset = 120 }) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [committed, setCommitted] = useState(null);
  const startX = useRef(0);
  const startTime = useRef(0);
  const velocityRef = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const elementRef = useRef(null);

  const reset = useCallback(() => {
    setOffset(0);
    setSwiping(false);
    setCommitted(null);
    velocityRef.current = 0;
  }, []);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      startX.current = touch.clientX;
      startTime.current = Date.now();
      lastX.current = touch.clientX;
      lastTime.current = Date.now();
      velocityRef.current = 0;
      setSwiping(true);
      setCommitted(null);
    };

    const handleTouchMove = (e) => {
      if (!swiping) return;
      const touch = e.touches[0];
      const now = Date.now();
      const dt = now - lastTime.current;
      if (dt > 0) {
        velocityRef.current = (touch.clientX - lastX.current) / dt;
      }
      lastX.current = touch.clientX;
      lastTime.current = now;
      let diff = touch.clientX - startX.current;
      diff = Math.max(-maxOffset, Math.min(maxOffset, diff));
      setOffset(diff);
      if (Math.abs(diff) > 10) e.preventDefault();
    };

    const handleTouchEnd = () => {
      const velocity = velocityRef.current;
      const fastSwipe = Math.abs(velocity) > 0.5;
      const passedThreshold = Math.abs(offset) > threshold;
      const shouldTrigger = passedThreshold || (fastSwipe && Math.abs(offset) > 30);

      if (shouldTrigger) {
        const direction = offset > 0 ? 'right' : 'left';
        setCommitted(direction);
        setOffset(direction === 'right' ? maxOffset : -maxOffset);
        setTimeout(() => {
          if (direction === 'right' && onSwipeRight) onSwipeRight();
          else if (direction === 'left' && onSwipeLeft) onSwipeLeft();
          reset();
        }, 200);
      } else {
        reset();
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [swiping, offset, threshold, maxOffset, onSwipeLeft, onSwipeRight, reset]);

  const progress = Math.min(Math.abs(offset) / threshold, 1);
  const direction = offset > 0 ? 'right' : offset < 0 ? 'left' : null;

  return {
    ref: elementRef,
    offset,
    swiping,
    committed,
    progress,
    direction,
    showLeft: offset < -20,
    showRight: offset > 20,
    style: {
      transform: `translateX(${offset}px)`,
      transition: swiping ? 'none' : 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    },
  };
}
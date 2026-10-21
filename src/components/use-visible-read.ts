'use client';
import { useEffect, useRef } from 'react';

/** Require continuous viewing in an active tab; preserve the card to avoid scroll jumps. */
export function useVisibleRead(read: boolean, onRead: () => Promise<void>) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (read || !element) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    let sent = false;
    let disposed = false;
    const clear = () => {
      clearTimeout(timer);
      timer = undefined;
    };
    const visible = () => {
      if (document.hidden || !document.hasFocus()) return false;
      const rect = element.getBoundingClientRect();
      // Exclude the sticky app header. For a long message, half a screen of text
      // counts; requiring half the entire element could make it impossible to read.
      const top = 80;
      const bottom = window.innerHeight - 16;
      const height = Math.max(0, Math.min(rect.bottom, bottom) - Math.max(rect.top, top));
      const width = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
      const hit = document.elementFromPoint(
        (Math.max(rect.left, 0) + Math.min(rect.right, window.innerWidth)) / 2,
        (Math.max(rect.top, top) + Math.min(rect.bottom, bottom)) / 2,
      );
      if (!hit || !element.contains(hit)) return false;
      return (
        rect.height > 0 &&
        rect.width > 0 &&
        height >= Math.min(rect.height, Math.max(0, bottom - top)) * 0.5 &&
        width >= rect.width * 0.5
      );
    };
    const check = () => {
      if (disposed || sent) return;
      if (!visible()) {
        clear();
        return;
      }
      if (!timer)
        timer = setTimeout(() => {
          timer = undefined;
          if (disposed || sent || !visible()) return;
          sent = true;
          void onRead().catch(() => {
            // Keep unread on failure. The next visibility change or manual button
            // can retry without an endless background request loop.
            sent = false;
          });
        }, 2000);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(check);
    };
    const hidden = () => {
      clear();
      schedule();
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    const intersection = new IntersectionObserver(schedule, {
      threshold: [0, 0.25, 0.5, 0.75, 1],
      rootMargin: '-80px 0px -16px 0px',
    });
    intersection.observe(element);
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    window.addEventListener('focus', schedule);
    window.addEventListener('blur', hidden);
    document.addEventListener('visibilitychange', hidden);
    check();
    return () => {
      disposed = true;
      clear();
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('focus', schedule);
      window.removeEventListener('blur', hidden);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [read, onRead]);
  return ref;
}

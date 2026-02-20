import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
  /** Root margin (e.g. "0px 0px -40px 0px" to trigger when 40px from bottom of viewport) */
  rootMargin?: string;
  /** Threshold 0–1; fraction of element visible to trigger */
  threshold?: number;
  /** Trigger only once (stay visible after first reveal) */
  once?: boolean;
}

export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {}
) {
  const { rootMargin = '0px 0px -8% 0px', threshold = 0.1, once = true } = options;
  const ref = useRef<T>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        } else if (!once) {
          setIsInView(false);
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, threshold, once]);

  return { ref, isInView };
}

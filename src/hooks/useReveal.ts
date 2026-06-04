import { useEffect, useRef } from 'react';

/**
 * Adds `.reveal-ready` on mount (hides the element and any `.reveal`
 * children), then adds `.visible` when it scrolls into view.
 * If IntersectionObserver isn't available the elements stay visible.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) return;

    // Hide the container and all child .reveal elements
    const targets = [el, ...Array.from(el.querySelectorAll('.reveal'))];
    targets.forEach((t) => t.classList.add('reveal-ready'));

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          targets.forEach((t) => t.classList.add('visible'));
          obs.unobserve(el);
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return ref;
}

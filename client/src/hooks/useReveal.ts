import { useEffect } from 'react';

// Adds .anim-visible when elements enter viewport.
export function useReveal(selector: string = '[data-anim]') {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (elements.length === 0) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const el = e.target as HTMLElement;
          el.classList.add('anim-visible');
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.15 });
    elements.forEach((el, idx) => {
      // set stagger custom property
      el.style.setProperty('--_d', idx.toString());
      obs.observe(el);
    });
    return () => obs.disconnect();
  }, [selector]);
}

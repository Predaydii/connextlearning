"use client";

import { useEffect, useRef } from "react";

const fmt = new Intl.NumberFormat("th-TH");

/**
 * Counts from 0 up to `value` once it scrolls into view (after the opening screen on a
 * first visit). The real number is server-rendered, so it is correct without JS and for
 * screen readers; reduced motion skips the animation.
 */
export function CountUp({ value, duration = 1400 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || value <= 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let timer = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        el.textContent = fmt.format(Math.round(value * (1 - (1 - t) ** 3)));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      el.textContent = "0";
      // On the first visit the opening screen covers the page for ~3 s
      const wait = document.documentElement.classList.contains("intro") ? 2900 : 0;
      timer = window.setTimeout(run, wait);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {fmt.format(value)}
    </span>
  );
}

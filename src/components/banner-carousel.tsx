"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Banner = { id: string; small: string; large: string; linkUrl: string | null };

const AUTO_MS = 5000;
const RESUME_MS = 8000;

/**
 * Landing banners (2000×600): native swipe via scroll-snap, neighbours peeking on
 * both sides, auto-advance every 5 s. Auto-advance pauses while touched/hovered,
 * off-screen or in a hidden tab, and is off with reduced motion.
 */
export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const pausedUntil = useRef(0);
  const visible = useRef(true);

  const slides = () => Array.from(track.current?.children ?? []) as HTMLElement[];

  const go = useCallback((i: number) => {
    const el = slides()[i];
    const t = track.current;
    if (!el || !t) return;
    t.scrollTo({ left: el.offsetLeft - (t.clientWidth - el.clientWidth) / 2, behavior: "smooth" });
  }, []);

  // Which slide is centred
  useEffect(() => {
    const t = track.current;
    if (!t) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const mid = t.scrollLeft + t.clientWidth / 2;
        let best = 0;
        slides().forEach((el, i) => {
          const d = Math.abs(el.offsetLeft + el.clientWidth / 2 - mid);
          const bd = Math.abs(slides()[best].offsetLeft + slides()[best].clientWidth / 2 - mid);
          if (d < bd) best = i;
        });
        activeRef.current = best;
        setActive(best);
      });
    };
    t.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      t.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Auto-advance
  useEffect(() => {
    if (banners.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = track.current;
    if (!t) return;
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting));
    io.observe(t);
    const pause = () => (pausedUntil.current = Date.now() + RESUME_MS);
    t.addEventListener("pointerdown", pause);
    t.addEventListener("pointerenter", pause);
    t.addEventListener("wheel", pause, { passive: true });
    const id = window.setInterval(() => {
      if (!visible.current || document.hidden || Date.now() < pausedUntil.current) return;
      go((activeRef.current + 1) % banners.length);
    }, AUTO_MS);
    return () => {
      clearInterval(id);
      io.disconnect();
      t.removeEventListener("pointerdown", pause);
      t.removeEventListener("pointerenter", pause);
      t.removeEventListener("wheel", pause);
    };
  }, [banners.length, go]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section aria-roledescription="carousel" aria-label="แบนเนอร์" className="py-[clamp(32px,5vw,56px)]">
      <div
        ref={track}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(16px,calc((100vw-min(1200px,88vw))/2))] [scrollbar-width:none] sm:gap-6 [&::-webkit-scrollbar]:hidden"
      >
        {banners.map((b, i) => {
          const img = (
            <img
              src={b.small}
              srcSet={`${b.small} 1000w, ${b.large} 2000w`}
              sizes="(min-width: 1364px) 1200px, 88vw"
              width={2000}
              height={600}
              alt={`แบนเนอร์ ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              className="size-full object-cover"
            />
          );
          return (
            <div
              key={b.id}
              aria-roledescription="slide"
              aria-label={`${i + 1} จาก ${banners.length}`}
              className={`aspect-[10/3] w-[min(1200px,88vw)] shrink-0 snap-center overflow-hidden rounded-2xl bg-primary-50 shadow-card transition duration-500 sm:rounded-3xl ${
                i === active ? "" : "scale-[0.97] opacity-70"
              }`}
            >
              {b.linkUrl ? (
                <a href={b.linkUrl} target="_blank" rel="noopener noreferrer" className="block size-full">
                  {img}
                </a>
              ) : (
                img
              )}
            </div>
          );
        })}
      </div>

      {banners.length > 1 && (
        <div className="container-page mt-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={`ไปแบนเนอร์ที่ ${i + 1}`}
                aria-current={i === active ? "true" : undefined}
                onClick={() => {
                  pausedUntil.current = Date.now() + RESUME_MS;
                  go(i);
                }}
                className={`h-2 cursor-pointer rounded-full transition-all duration-300 ${i === active ? "w-8 bg-primary" : "w-2 bg-line hover:bg-primary/40"}`}
              />
            ))}
          </div>
          <p className="text-sm font-medium tabular-nums text-body" aria-live="polite">
            {pad(active + 1)} / {pad(banners.length)}
          </p>
        </div>
      )}
    </section>
  );
}

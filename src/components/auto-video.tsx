"use client";

import { useEffect, useRef } from "react";

/**
 * Site video: muted, looping, inline, starts by itself (controls stay, to unmute).
 * Nothing downloads until it is near the screen (preload none), and it pauses
 * while off-screen so it never costs CPU or data in the background.
 * Reduced motion: no autoplay, the viewer presses play.
 */
export function AutoVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    v.muted = true; // browsers only autoplay muted video; React does not always render the attribute
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {}); // blocked autoplay: controls are there
        else v.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return <video ref={ref} src={src} muted loop playsInline controls preload="none" className={className} />;
}

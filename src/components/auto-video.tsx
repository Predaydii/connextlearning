"use client";

import { useEffect, useRef } from "react";

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * Site video: muted, looping, inline, plays by itself. No controls and no pointer
 * events: nothing to scrub, and a touch while scrolling on a phone can't pause it.
 * The tag is server-rendered as raw HTML because React leaves out the \`muted\`
 * attribute, and phones only autoplay video that is muted in the HTML itself;
 * this way it starts before any JavaScript runs. Once hydrated it pauses while
 * off-screen and resumes when back; with reduced motion it stays paused.
 */
export function AutoVideo({ src, className = "" }: { src: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const v = ref.current?.querySelector("video");
    if (!v) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.pause();
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {}); // autoplay blocked (e.g. power saving): stays on the first frame
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="contents"
      dangerouslySetInnerHTML={{
        __html: `<video src="${attr(src)}" class="${attr(className)}" autoplay muted loop playsinline disablepictureinpicture disableremoteplayback preload="auto" style="pointer-events:none"></video>`,
      }}
    />
  );
}

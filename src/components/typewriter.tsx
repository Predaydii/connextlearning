"use client";

import { useEffect, useMemo, useState } from "react";

type Segment = { text: string; strong?: boolean };

const TYPE_MS = 45;
const ERASE_MS = 18;
const HOLD_MS = 2800;
const GAP_MS = 450;

/** Thai-safe characters: vowels and tone marks stay with their consonant. */
function graphemes(s: string) {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return Array.from(new Intl.Segmenter("th", { granularity: "grapheme" }).segment(s), (g) => g.segment);
  }
  return Array.from(s);
}

/**
 * Types the sentence out, holds, erases and types again, forever. The full text is
 * server-rendered (readable without JS); a hidden copy keeps the height fixed so the
 * layout never jumps, and screen readers get the sentence once. Reduced motion: static.
 */
export function Typewriter({ segments, startDelay = 0 }: { segments: Segment[]; startDelay?: number }) {
  const chars = useMemo(() => segments.flatMap((s) => graphemes(s.text).map((c) => ({ c, strong: !!s.strong }))), [segments]);
  const [n, setN] = useState(chars.length);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // On a first visit the opening screen plays first (html.intro)
    const intro = document.documentElement.classList.contains("intro") ? 2900 : 0;
    let timer = 0;
    let count = chars.length;
    let erasing = true;
    const step = () => {
      if (erasing) {
        count--;
        if (count <= 0) {
          count = 0;
          erasing = false;
          setN(0);
          timer = window.setTimeout(step, GAP_MS);
          return;
        }
        setN(count);
        timer = window.setTimeout(step, ERASE_MS);
      } else {
        count++;
        setN(count);
        if (count >= chars.length) {
          erasing = true;
          timer = window.setTimeout(step, HOLD_MS);
          return;
        }
        timer = window.setTimeout(step, TYPE_MS);
      }
    };
    timer = window.setTimeout(step, intro + startDelay + HOLD_MS);
    return () => clearTimeout(timer);
  }, [chars, startDelay]);

  // Group the visible characters back into bold / normal runs
  const runs: Segment[] = [];
  for (const { c, strong } of chars.slice(0, n)) {
    const last = runs[runs.length - 1];
    if (last && !!last.strong === strong) last.text += c;
    else runs.push({ text: c, strong });
  }
  const render = (list: Segment[]) =>
    list.map((r, i) => (r.strong ? <strong key={i} className="font-semibold text-ink">{r.text}</strong> : <span key={i}>{r.text}</span>));

  return (
    <span className="relative block">
      <span className="sr-only">{segments.map((s) => s.text).join("")}</span>
      {/* spacer: reserves the full height */}
      <span aria-hidden className="invisible">{render(segments)}</span>
      <span aria-hidden className="absolute inset-0">
        {render(runs)}
        <span className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.18em] bg-primary motion-safe:animate-[caret_1s_steps(1)_infinite]" />
      </span>
    </span>
  );
}

"use client";

import { useRef, useState } from "react";

/**
 * Index tracking for a CSS scroll-snap photo strip (`overflow-x-auto snap-x snap-mandatory`).
 * The browser handles swipe and momentum; we only read which photo is showing and scroll on arrow clicks.
 */
export function useSnapIndex() {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const onScroll = () => {
    const el = ref.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };
  const go = (delta: number) => ref.current?.scrollBy({ left: delta * ref.current.clientWidth, behavior: "smooth" });
  return { ref, index, onScroll, go };
}

"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 767px)"; // below Tailwind's md breakpoint

const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

export const useIsMobile = () => useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);

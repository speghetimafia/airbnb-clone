"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { ListingCard } from "./types";

const KEY = "airbnb_recently_viewed";

const read = () => {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
};
const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

/** Per-browser "Recently viewed" row: a snapshot of the last 10 listings opened. */
export function useRecent(): ListingCard[] {
  const raw = useSyncExternalStore(subscribe, read, () => "[]"); // a string snapshot compares by value
  return useMemo(() => JSON.parse(raw), [raw]);
}

export function addRecent(card: ListingCard) {
  try {
    const list: ListingCard[] = JSON.parse(read());
    localStorage.setItem(KEY, JSON.stringify([card, ...list.filter((c) => c.id !== card.id)].slice(0, 10)));
  } catch {}
}

"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { ListingCard, ListingInput } from "./types";

// ---- One tiny localStorage store: per-browser conveniences only, never anything that must persist ----

const EVENT = "local-store"; // same-tab updates ("storage" only fires in other tabs)

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

const subscribe = (onChange: () => void) => {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};

/** Live raw value; a string snapshot compares by value, so renders stay stable. */
const useStored = (key: string) => useSyncExternalStore(subscribe, () => read(key), () => null);

// ---- "Recently viewed" row on Explore: the last 10 listings opened ----

const RECENT = "airbnb_recently_viewed";

export function useRecent(): ListingCard[] {
  const raw = useStored(RECENT);
  return useMemo(() => JSON.parse(raw ?? "[]"), [raw]);
}

export function addRecent(card: ListingCard) {
  const list: ListingCard[] = JSON.parse(read(RECENT) ?? "[]");
  write(RECENT, JSON.stringify([card, ...list.filter((c) => c.id !== card.id)].slice(0, 10)));
}

// ---- Unfinished "create a listing" flow, shown as "In progress" in Your listings ----

type Draft = { step: number; f: ListingInput; updatedAt: string };
const DRAFT = "airbnb_listing_draft";

export const loadDraft = (): Draft | null => JSON.parse(read(DRAFT) ?? "null");
export const saveDraft = (d: Omit<Draft, "updatedAt">) => write(DRAFT, JSON.stringify({ ...d, updatedAt: new Date().toISOString() }));
export const clearDraft = () => write(DRAFT, null);

export function useDraft(): Draft | null {
  const raw = useStored(DRAFT);
  return raw ? JSON.parse(raw) : null;
}

"use client";

import { useSyncExternalStore } from "react";
import type { ListingInput } from "./types";

/** An unfinished "create a listing" flow, kept in this browser so the host can leave and resume, like Airbnb's "In progress" listings. */
export type Draft = { step: number; f: ListingInput; updatedAt: string };

const KEY = "airbnb_listing_draft";
const EVENT = "airbnb-draft";

const read = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const loadDraft = (): Draft | null => {
  const raw = read();
  return raw ? JSON.parse(raw) : null;
};

export function saveDraft(draft: Omit<Draft, "updatedAt">) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }));
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
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

/** Live draft for "Your listings" (string snapshot, so it compares by value). */
export function useDraft(): Draft | null {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  return raw ? JSON.parse(raw) : null;
}

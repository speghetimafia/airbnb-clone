import { differenceInCalendarDays, format, parseISO } from "date-fns";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const money = (n: number) => inr.format(n);

/** Dates travel as "yyyy-MM-dd" strings; parse as local dates (not UTC) so they never shift a day. */
export const toISO = (d: Date) => format(d, "yyyy-MM-dd");
export const fromISO = (s: string) => parseISO(s);

export const nightsBetween = (a: string, b: string) => differenceInCalendarDays(fromISO(b), fromISO(a));

export function dateRange(a: string, b: string) {
  const s = fromISO(a);
  const e = fromISO(b);
  if (s.getFullYear() !== e.getFullYear()) return `${format(s, "d MMM yyyy")} – ${format(e, "d MMM yyyy")}`;
  if (s.getMonth() === e.getMonth()) return `${format(s, "d")}–${format(e, "d MMM yyyy")}`;
  return `${format(s, "d MMM")} – ${format(e, "d MMM yyyy")}`;
}

export const shortDate = (s: string) => format(fromISO(s), "d MMM");
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function yearsSince(iso: string) {
  return Math.max(1, new Date().getFullYear() - new Date(iso).getFullYear());
}

export function time12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

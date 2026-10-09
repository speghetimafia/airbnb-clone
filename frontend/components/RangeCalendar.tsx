"use client";

import { addDays, startOfDay } from "date-fns";
import { DayPicker, type DateRange, type Matcher } from "react-day-picker";
import { fromISO, toISO } from "@/lib/format";
import type { Range } from "@/lib/types";
import { useIsMobile } from "@/lib/useIsMobile";

type Props = {
  checkIn: string | null;
  checkOut: string | null;
  onChange: (checkIn: string | null, checkOut: string | null) => void;
  unavailable?: Range[];
  minNights?: number;
  months?: number;
};

/**
 * Two-month range picker. Booked ranges are [start, end): the end day is free as a check-out
 * and as a new check-in, so we disable start..end-1 only.
 */
export default function RangeCalendar({ checkIn, checkOut, onChange, unavailable = [], minNights = 1, months = 2 }: Props) {
  const isMobile = useIsMobile();
  const today = startOfDay(new Date());
  const from = checkIn ? fromISO(checkIn) : undefined;
  const to = checkOut ? fromISO(checkOut) : undefined;

  let disabled: Matcher[];
  if (from && !to) {
    // Picking check-out: can't jump over a booking, and must respect minimum nights.
    const nextTaken = unavailable.map((r) => fromISO(r.start)).filter((d) => d > from).sort((a, b) => +a - +b)[0];
    disabled = [{ before: from }];
    if (nextTaken) disabled.push({ after: nextTaken });
    if (minNights > 1) disabled.push({ from: addDays(from, 1), to: addDays(from, minNights - 1) });
  } else {
    disabled = [{ before: today }, ...unavailable.map((r) => ({ from: fromISO(r.start), to: addDays(fromISO(r.end), -1) }))];
  }

  const select = (_: DateRange | undefined, day: Date) => {
    // Airbnb flow: first click sets check-in, second sets check-out; clicking again restarts.
    if (!from || to || day <= from) return onChange(toISO(day), null);
    onChange(toISO(from), toISO(day));
  };

  return (
    <DayPicker
      mode="range"
      selected={{ from, to }}
      onSelect={select}
      disabled={disabled}
      numberOfMonths={isMobile ? 1 : months}
      defaultMonth={from ?? today}
      startMonth={today}
    />
  );
}

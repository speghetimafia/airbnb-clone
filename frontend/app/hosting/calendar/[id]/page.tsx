"use client";

import { addDays, addMonths, format, getDay, getDaysInMonth, startOfMonth } from "date-fns";
import { ArrowLeft, ArrowUp, LayoutGrid, Settings } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import LoginPrompt from "@/components/LoginPrompt";
import { del, post } from "@/lib/api";
import { dateRange, fromISO, plural, toISO } from "@/lib/format";
import type { Block, Booking, ListingDetail } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useUser } from "@/lib/user";

const MONTHS_AHEAD = 12;
const shortMoney = (n: number) => (n >= 1000 ? `₹${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : `₹${n}`);
const nightsOf = (start: string, end: string) => {
  const out: string[] = [];
  for (let d = fromISO(start); toISO(d) < end; d = addDays(d, 1)) out.push(toISO(d));
  return out;
};

/** Host price calendar: tap a first and last night, then block or open them. Ranges sent to the API are [start, end). */
export default function ListingCalendar() {
  const { id } = useParams<{ id: string }>();
  const { user, ready } = useUser();
  const { data: l } = useApi<ListingDetail>(`/listings/${id}`);
  const blocks = useApi<Block[]>(user ? `/listings/${id}/blocks` : null);
  const bookings = useApi<Booking[]>(user ? "/host/bookings" : null);
  const [sel, setSel] = useState<{ from: string; to: string | null } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const todayRef = useRef<HTMLDivElement>(null);

  if (ready && !user) return <LoginPrompt title="Calendar" text="Log in to manage your calendar." />;
  if (!l || !user) return <div className="mx-auto mt-10 h-96 max-w-3xl animate-pulse rounded-3xl bg-soft" />;
  if (user.id !== l.host.id) return <p className="p-20 text-center">Only the host can manage this calendar.</p>;

  const today = toISO(new Date());
  const reservedBy = new Map<string, Booking>();
  for (const b of bookings.data ?? []) {
    if (b.listing.id === l.id && b.status === "confirmed") nightsOf(b.check_in, b.check_out).forEach((n) => reservedBy.set(n, b));
  }
  const blockedBy = new Map<string, Block>();
  for (const b of blocks.data ?? []) nightsOf(b.start_date, b.end_date).forEach((n) => blockedBy.set(n, b));

  const tap = (night: string) => {
    if (night < today || reservedBy.has(night)) return;
    if (!sel || sel.to || night < sel.from) setSel({ from: night, to: null });
    else setSel({ from: sel.from, to: night });
  };
  const inSel = (n: string) => !!sel && n >= sel.from && n <= (sel.to ?? sel.from);
  const selNights = sel ? nightsOf(sel.from, toISO(addDays(fromISO(sel.to ?? sel.from), 1))) : [];
  const end = sel ? toISO(addDays(fromISO(sel.to ?? sel.from), 1)) : "";
  const hasReserved = selNights.some((n) => reservedBy.has(n));
  const allBlocked = selNights.length > 0 && selNights.every((n) => blockedBy.has(n));

  /** Remove blocks inside the selection, keeping any part of a block that sticks out on either side. */
  const openRange = async () => {
    const touched = (blocks.data ?? []).filter((b) => b.start_date < end && b.end_date > sel!.from);
    for (const b of touched) {
      await del(`/blocks/${b.id}`);
      if (b.start_date < sel!.from) await post(`/listings/${l.id}/blocks`, { start_date: b.start_date, end_date: sel!.from, note: b.note });
      if (b.end_date > end) await post(`/listings/${l.id}/blocks`, { start_date: end, end_date: b.end_date, note: b.note });
    }
  };
  const run = async (action: "open" | "block") => {
    setBusy(true);
    try {
      await openRange();
      if (action === "block") await post(`/listings/${l.id}/blocks`, { start_date: sel!.from, end_date: end, note });
      toast.success(action === "block" ? `Blocked ${plural(selNights.length, "night")}` : `Opened ${plural(selNights.length, "night")}`);
      setSel(null);
      setNote("");
      blocks.reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const months = Array.from({ length: MONTHS_AHEAD }, (_, i) => addMonths(startOfMonth(new Date()), i));

  return (
    <main className="mx-auto max-w-3xl pb-48">
      <div className="sticky top-0 z-20 bg-white md:top-20">
        <div className="flex items-center gap-4 px-4 py-4">
          <Link href="/hosting/calendar" aria-label="Back" className="rounded-full p-2 hover:bg-soft"><ArrowLeft size={22} /></Link>
          <h1 className="flex-1 truncate text-lg font-medium">{l.title}</h1>
          <Link href="/hosting/calendar" aria-label="All calendars" className="rounded-full p-2 hover:bg-soft"><LayoutGrid size={22} /></Link>
          <Link href={`/hosting/listings/${l.id}?edit=availability`} aria-label="Availability settings" className="rounded-full p-2 hover:bg-soft"><Settings size={22} /></Link>
        </div>
        <div className="grid grid-cols-7 border-b border-line px-3 pb-2 text-center text-sm text-muted">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
        </div>
      </div>

      {months.map((m, mi) => (
        <section key={mi} ref={mi === 0 ? todayRef : undefined} className="scroll-mt-32 px-3 pt-6">
          <h2 className="mb-4 px-2 text-[26px] font-semibold">{format(m, mi === 0 || m.getMonth() === 0 ? "MMMM yyyy" : "MMMM")}</h2>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: getDay(m) }, (_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: getDaysInMonth(m) }, (_, i) => {
              const date = addDays(m, i);
              const n = toISO(date);
              const past = n < today;
              const booking = reservedBy.get(n);
              const blocked = blockedBy.has(n);
              const price = l.weekend_price && [5, 6].includes(getDay(date)) ? l.weekend_price : l.base_price;
              const selected = inSel(n);
              return (
                <button
                  key={n}
                  onClick={() => tap(n)}
                  disabled={past}
                  className={`flex aspect-[3/4] flex-col items-center justify-start gap-1 overflow-hidden rounded-2xl pt-3 text-center ${
                    past ? "bg-[#f7f7f7] text-muted" : booking ? "bg-ink text-white" : blocked ? "cal-blocked-cell border border-line" : "border border-line"
                  } ${selected ? "ring-2 ring-ink ring-offset-1" : ""}`}
                >
                  {n === today ? (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rausch font-semibold text-white">{date.getDate()}</span>
                  ) : (
                    <span className="flex h-8 items-center font-medium">{date.getDate()}</span>
                  )}
                  <span className={`truncate px-1 text-xs ${booking || past ? "" : "text-muted"}`}>
                    {booking ? (booking.check_in === n || getDay(date) === 0 ? booking.guest.name.split(" ")[0] : "") : blocked ? "Blocked" : shortMoney(price)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {sel ? (
        <div className="fixed inset-x-0 bottom-0 z-[600] rounded-t-3xl bg-white px-6 pb-6 pt-5 shadow-[0_-6px_24px_rgba(0,0,0,0.15)]">
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{sel.to ? dateRange(sel.from, end) : format(fromISO(sel.from), "EEE, d MMM")}</div>
                <div className="text-sm text-muted">{sel.to ? plural(selNights.length, "night") : "Tap a last night, or act on this one"}</div>
              </div>
              <button onClick={() => setSel(null)} className="font-semibold underline">Clear</button>
            </div>
            {hasReserved ? (
              <p className="text-sm text-[#c13515]">Your selection includes reserved nights. Pick open or blocked nights only.</p>
            ) : (
              <>
                {!allBlocked && (
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Note (optional), e.g. deep cleaning" className="mb-3 w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-ink" />
                )}
                <div className="flex gap-3">
                  {selNights.some((n) => blockedBy.has(n)) && (
                    <button onClick={() => run("open")} disabled={busy} className="flex-1 rounded-xl border border-ink py-3.5 font-semibold disabled:opacity-40">Open nights</button>
                  )}
                  {!allBlocked && (
                    <button onClick={() => run("block")} disabled={busy} className="flex-1 rounded-xl bg-ink py-3.5 font-semibold text-white disabled:opacity-40">Block nights</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => todayRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="fixed bottom-8 right-6 z-[450] flex items-center gap-2 rounded-full bg-white px-5 py-3.5 text-[15px] font-semibold shadow-[0_4px_16px_rgba(0,0,0,0.18)]"
        >
          <ArrowUp size={18} /> Today
        </button>
      )}
    </main>
  );
}

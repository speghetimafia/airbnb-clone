"use client";

import { addDays, startOfDay } from "date-fns";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { toast } from "sonner";
import Modal from "@/components/Modal";
import { del, post, put } from "@/lib/api";
import { dateRange, fromISO, time12, toISO } from "@/lib/format";
import type { Block, Booking, ListingDetail, Template, Trigger } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useUser } from "@/lib/user";

const TRIGGERS: Record<Trigger, string> = {
  on_confirm: "As soon as the booking is confirmed",
  day_before_checkin: "1 day before check-in, 9:00 AM",
  on_checkout: "On checkout day, 9:00 AM",
};
const PLACEHOLDERS = ["guest_name", "host_name", "listing_title", "check_in", "check_out", "check_in_time", "check_out_time", "address", "maps_link"];

/** Ranges are [start, end): show start..end-1 as taken nights. */
const nights = (start: string, end: string) => ({ from: fromISO(start), to: addDays(fromISO(end), -1) });

function CalendarTab({ listingId, bookings }: { listingId: number; bookings: Booking[] }) {
  const blocks = useApi<Block[]>(`/listings/${listingId}/blocks`);
  const [range, setRange] = useState<DateRange | undefined>();
  const [note, setNote] = useState("");
  const today = startOfDay(new Date());

  const add = async () => {
    if (!range?.from || !range.to) return;
    try {
      // The picker selects nights inclusively; the API stores [start, end).
      await post(`/listings/${listingId}/blocks`, { start_date: toISO(range.from), end_date: toISO(addDays(range.to, 1)), note });
      toast.success("Dates blocked");
      setRange(undefined);
      setNote("");
      blocks.reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const remove = async (id: number) => {
    await del(`/blocks/${id}`);
    toast("Dates reopened");
    blocks.reload();
  };

  const booked = bookings.map((b) => nights(b.check_in, b.check_out));
  const blocked = (blocks.data ?? []).map((b) => nights(b.start_date, b.end_date));

  return (
    <div className="grid gap-10 lg:grid-cols-[auto_1fr]">
      <div>
        <DayPicker
          mode="range"
          selected={range}
          onSelect={setRange}
          numberOfMonths={2}
          startMonth={today}
          disabled={[{ before: today }, ...booked, ...blocked]}
          modifiers={{ booked, blocked }}
          modifiersClassNames={{ booked: "cal-booked", blocked: "cal-blocked" }}
        />
        <div className="mt-2 flex gap-6 text-xs text-muted">
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#fdecef]" /> Reserved</span>
          <span className="flex items-center gap-2"><span className="cal-blocked h-3 w-3 rounded-full bg-[#e4e4e4]" /> Blocked by you</span>
        </div>
      </div>
      <div className="space-y-8">
        <div className="rounded-xl border border-line p-6">
          <h3 className="mb-1 font-semibold">Block dates</h3>
          <p className="mb-4 text-sm text-muted">
            {range?.from && range.to ? `Nights of ${dateRange(toISO(range.from), toISO(addDays(range.to, 1)))}` : "Select the nights you want to close on the calendar."}
          </p>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Note (e.g. family visiting, deep cleaning)" className="mb-4 w-full rounded-lg border border-[#b0b0b0] px-4 py-3 outline-none focus:border-ink" />
          <button onClick={add} disabled={!range?.from || !range.to} className="rounded-lg bg-ink px-5 py-3 font-semibold text-white disabled:opacity-30">
            Block these nights
          </button>
        </div>
        <div>
          <h3 className="mb-3 font-semibold">Blocked dates</h3>
          {(blocks.data ?? []).length === 0 && <p className="text-sm text-muted">Nothing blocked. Guests can book any open night.</p>}
          {(blocks.data ?? []).map((b) => (
            <div key={b.id} className="flex items-center justify-between border-b border-line py-3 text-sm">
              <span><b>{dateRange(b.start_date, b.end_date)}</b> {b.note && <span className="text-muted">· {b.note}</span>}</span>
              <button onClick={() => remove(b.id)} className="font-semibold underline">Unblock</button>
            </div>
          ))}
        </div>
        <div>
          <h3 className="mb-3 font-semibold">Upcoming reservations</h3>
          {bookings.length === 0 && <p className="text-sm text-muted">No upcoming reservations.</p>}
          {bookings.map((b) => (
            <div key={b.id} className="flex justify-between border-b border-line py-3 text-sm">
              <span>{b.guest.name} · {b.guests} guests</span>
              <b>{dateRange(b.check_in, b.check_out)}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplateEditor({ listing, initial, onClose, onSaved }: { listing: ListingDetail; initial?: Template; onClose: () => void; onSaved: () => void }) {
  const [t, setT] = useState({ title: initial?.title ?? "", body: initial?.body ?? "", trigger: initial?.trigger ?? ("on_confirm" as Trigger) });
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const insert = (ph: string) => {
    const el = bodyRef.current;
    const at = el?.selectionStart ?? t.body.length;
    setT({ ...t, body: `${t.body.slice(0, at)}{${ph}}${t.body.slice(at)}` });
    el?.focus();
  };

  const sample: Record<string, string> = {
    guest_name: "Arjun", host_name: listing.host.name.split(" ")[0], listing_title: listing.title,
    check_in: "Fri, 14 Nov 2026", check_out: "Sun, 16 Nov 2026", check_in_time: listing.check_in_time,
    check_out_time: listing.check_out_time, address: listing.address || `${listing.city}, ${listing.state}`,
    maps_link: `https://maps.google.com/?q=${listing.lat},${listing.lng}`,
  };
  const preview = t.body.replace(/\{(\w+)\}/g, (m, k) => sample[k] ?? m);

  const save = async () => {
    try {
      if (initial) await put(`/templates/${initial.id}`, t);
      else await post(`/listings/${listing.id}/templates`, t);
      toast.success("Message saved");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={initial ? "Edit scheduled message" : "New scheduled message"}
      footer={
        <div className="flex justify-between">
          <button onClick={onClose} className="font-semibold underline">Cancel</button>
          <button onClick={save} disabled={!t.title.trim() || !t.body.trim()} className="rounded-lg bg-ink px-6 py-3 font-semibold text-white disabled:opacity-30">Save</button>
        </div>
      }
    >
      <label className="mb-1 block text-sm font-semibold">Name</label>
      <input value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} maxLength={120} placeholder="Wi-Fi & check-in details" className="mb-5 w-full rounded-lg border border-[#b0b0b0] px-4 py-3 outline-none focus:border-ink" />
      <label className="mb-1 block text-sm font-semibold">When to send</label>
      <select value={t.trigger} onChange={(e) => setT({ ...t, trigger: e.target.value as Trigger })} className="mb-5 w-full rounded-lg border border-[#b0b0b0] px-4 py-3 outline-none focus:border-ink">
        {Object.entries(TRIGGERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <label className="mb-1 block text-sm font-semibold">Message</label>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {PLACEHOLDERS.map((p) => (
          <button key={p} type="button" onClick={() => insert(p)} className="rounded-full border border-line px-2.5 py-1 text-xs hover:border-ink">
            + {p.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      <textarea ref={bodyRef} value={t.body} onChange={(e) => setT({ ...t, body: e.target.value })} rows={7} maxLength={4000} placeholder={"Hi {guest_name}! Wi-Fi: MyHome_5G / pass1234\nDirections: {maps_link}"} className="w-full rounded-lg border border-[#b0b0b0] p-4 font-mono text-sm outline-none focus:border-ink" />
      {t.body && (
        <div className="mt-4">
          <div className="mb-1 text-sm font-semibold">Preview</div>
          <p className="whitespace-pre-line rounded-2xl rounded-tl-sm bg-soft p-4 text-sm">{preview}</p>
        </div>
      )}
    </Modal>
  );
}

function MessagesTab({ listing }: { listing: ListingDetail }) {
  const templates = useApi<Template[]>(`/listings/${listing.id}/templates`);
  const [editing, setEditing] = useState<Template | "new" | null>(null);
  const remove = async (id: number) => {
    await del(`/templates/${id}`);
    toast("Message deleted");
    templates.reload();
  };
  return (
    <div className="max-w-3xl">
      <p className="mb-6 text-muted">
        Scheduled messages go out automatically for every confirmed booking, so guests get Wi-Fi details, directions and check-in
        instructions without you lifting a finger. Each message is filled in with the guest&apos;s details when they book.
      </p>
      <div className="space-y-3">
        {(templates.data ?? []).map((t) => (
          <div key={t.id} className="rounded-xl border border-line p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold">{t.title}</div>
                <div className="text-sm text-muted">{TRIGGERS[t.trigger]}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(t)} aria-label="Edit" className="rounded-full p-2 hover:bg-soft"><Pencil size={16} /></button>
                <button onClick={() => remove(t.id)} aria-label="Delete" className="rounded-full p-2 hover:bg-soft"><Trash2 size={16} /></button>
              </div>
            </div>
            <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-muted">{t.body}</p>
          </div>
        ))}
      </div>
      <button onClick={() => setEditing("new")} className="mt-6 rounded-lg border border-ink px-5 py-3 font-semibold hover:bg-soft">+ Add scheduled message</button>
      {editing && (
        <TemplateEditor
          listing={listing}
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            templates.reload();
          }}
        />
      )}
    </div>
  );
}

export default function ManageListing() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const { data: listing, error } = useApi<ListingDetail>(`/listings/${id}`);
  const { data: bookings } = useApi<Booking[]>(user ? `/host/bookings?u=${user.id}` : null);
  const [tab, setTab] = useState<"calendar" | "messages">("calendar");

  if (error) return <p className="p-20 text-center">{error}</p>;
  if (!listing) return <div className="mx-auto mt-10 h-96 max-w-[1280px] animate-pulse rounded-xl bg-soft" />;
  if (user?.id !== listing.host.id) return <p className="p-20 text-center">Only the host can manage this listing.</p>;

  const today = toISO(new Date());
  const upcoming = (bookings ?? []).filter((b) => b.listing.id === listing.id && b.status === "confirmed" && b.check_out > today);

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-10 xl:px-20">
      <Link href="/hosting" className="mb-6 flex items-center gap-2 text-sm font-semibold hover:underline"><ArrowLeft size={16} /> Listings</Link>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold">{listing.title}</h1>
          <p className="text-muted">
            {listing.city}, {listing.state} · Check-in {time12(listing.check_in_time)} · Min {listing.min_nights} night(s)
          </p>
        </div>
        <div className="flex gap-3 text-sm font-semibold">
          <Link href={`/rooms/${listing.id}`} className="rounded-lg border border-line px-4 py-2 hover:border-ink">View listing</Link>
          <Link href={`/hosting/listings/${listing.id}/edit`} className="rounded-lg border border-line px-4 py-2 hover:border-ink">Edit details</Link>
        </div>
      </div>
      <div className="mb-8 flex gap-6 border-b border-line">
        {(["calendar", "messages"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 pb-3 font-semibold ${tab === t ? "border-ink" : "border-transparent text-muted"}`}>
            {t === "calendar" ? "Calendar" : "Scheduled messages"}
          </button>
        ))}
      </div>
      {tab === "calendar" ? <CalendarTab listingId={listing.id} bookings={upcoming} /> : <MessagesTab listing={listing} />}
    </main>
  );
}

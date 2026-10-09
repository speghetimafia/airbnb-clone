"use client";

import { addDays, differenceInCalendarDays } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/Header";
import LoginPrompt from "@/components/LoginPrompt";
import Modal from "@/components/Modal";
import { img, post } from "@/lib/api";
import { dateRange, fromISO, money, plural, toISO } from "@/lib/format";
import type { Booking, ListingCard } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useUser } from "@/lib/user";

function status(b: Booking, today: string) {
  const days = differenceInCalendarDays(fromISO(b.check_in), fromISO(today));
  if (b.check_out === today) return "Checking out today";
  if (days === 0) return "Checking in today";
  if (days === 1) return "Arriving tomorrow";
  if (days < 0) return "Currently hosting";
  return `Arriving in ${days} days`;
}

function ReservationCard({ b, today, onCancel }: { b: Booking; today: string; onCancel?: () => void }) {
  return (
    <div className="flex flex-col rounded-3xl p-6 shadow-[0_6px_24px_rgba(0,0,0,0.1)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-rausch">{b.status === "cancelled" ? "Cancelled" : status(b, today)}</div>
          <div className="mt-1 text-[22px] font-semibold leading-tight">{b.guest.name}</div>
          <div className="truncate text-muted">{b.listing.title}</div>
        </div>
        <Avatar src={b.guest.avatar_url} name={b.guest.name} size={52} />
      </div>
      <div className="mt-4 flex items-center gap-3 text-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(b.listing.photos[0]?.url ?? "", 120)} alt="" className="h-10 w-10 rounded-lg object-cover" />
        <span className="flex-1">{dateRange(b.check_in, b.check_out)} · {plural(b.guests, "guest")}</span>
        <span className="font-semibold">{money(b.total - b.service_fee)}</span>
      </div>
      <div className="mt-5 flex gap-3 border-t border-line pt-4 text-sm font-semibold">
        {b.status === "confirmed" && <Link href={`/hosting/messages/${b.id}`} className="flex-1 rounded-xl bg-soft py-2.5 text-center hover:bg-line">Messages</Link>}
        {onCancel && <button onClick={onCancel} className="flex-1 rounded-xl border border-line py-2.5 hover:border-ink">Cancel</button>}
      </div>
    </div>
  );
}

export default function Today() {
  const { user, ready } = useUser();
  const listings = useApi<ListingCard[]>(user ? "/host/listings" : null);
  const bookings = useApi<Booking[]>(user ? "/host/bookings" : null);
  const [tab, setTab] = useState<"today" | "upcoming">("today");
  const [showAll, setShowAll] = useState(false);
  const [toCancel, setToCancel] = useState<Booking | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  if (!ready) return null;
  if (!user) return <LoginPrompt title="Hosting" text="Log in as a host to see today's reservations." />;

  const today = toISO(new Date());
  const tomorrow = toISO(addDays(fromISO(today), 1));
  const confirmed = (bookings.data ?? []).filter((b) => b.status === "confirmed");
  const now = confirmed.filter((b) => b.check_in <= tomorrow && b.check_out >= today);
  const upcoming = confirmed.filter((b) => b.check_in > tomorrow);
  const shown = tab === "today" ? now : upcoming;
  const past = confirmed.filter((b) => b.check_out < today).reverse();
  const cancelled = (bookings.data ?? []).filter((b) => b.status === "cancelled");

  const cancel = async () => {
    try {
      await post(`/bookings/${toCancel!.id}/cancel`);
      toast("Reservation cancelled. The guest gets a full refund.");
      setToCancel(null);
      bookings.reload();
    } catch (e) {
      setCancelError((e as Error).message);
    }
  };

  if (listings.data?.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 pb-28 pt-16 text-center">
        <div className="text-7xl">🏡</div>
        <h1 className="mt-6 text-[32px] font-semibold">Welcome to hosting, {user.name.split(" ")[0]}</h1>
        <p className="mx-auto mb-8 mt-2 max-w-md text-muted">Create your first listing in a few minutes. You can edit everything later.</p>
        <Link href="/hosting/listings/new" className="btn-brand inline-block px-8 py-3.5">Create a listing</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 pb-28 pt-8">
      <div className="mx-auto mb-10 flex w-fit rounded-full bg-[#ebebeb] p-1">
        {(["today", "upcoming"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-8 py-2.5 text-[15px] capitalize ${tab === t ? "bg-white font-medium shadow" : ""}`}>
            {t}
          </button>
        ))}
      </div>

      <h1 className="mb-8 text-center text-[32px] font-semibold leading-tight">
        {bookings.loading && !bookings.data
          ? " "
          : shown.length
            ? `You have ${plural(shown.length, "reservation")}`
            : tab === "today"
              ? "No guests today or tomorrow"
              : "No upcoming reservations"}
      </h1>

      {shown.length === 0 && bookings.data && (
        <p className="mx-auto mb-10 max-w-sm text-center text-muted">
          {tab === "today" ? "Guests checking in, staying or checking out show up here." : "New bookings will appear here as soon as they're confirmed."}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((b) => (
          <ReservationCard key={b.id} b={b} today={today} onCancel={b.check_in > today ? () => setToCancel(b) : undefined} />
        ))}
      </div>

      <div className="mt-12 text-center">
        <button onClick={() => setShowAll(!showAll)} className="font-semibold underline">
          {showAll ? "Hide past reservations" : `Past and cancelled reservations (${past.length + cancelled.length})`}
        </button>
      </div>
      {showAll && (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...past, ...cancelled].map((b) => <ReservationCard key={b.id} b={b} today={today} />)}
        </div>
      )}

      <Modal
        open={!!toCancel}
        onClose={() => {
          setToCancel(null);
          setCancelError(null);
        }}
        title="Cancel reservation"
        error={cancelError}
        footer={
          <div className="flex justify-between">
            <button onClick={() => setToCancel(null)} className="font-semibold underline">Keep it</button>
            <button onClick={cancel} className="rounded-lg bg-ink px-6 py-3 font-semibold text-white">Cancel reservation</button>
          </div>
        }
      >
        <p>
          Cancel {toCancel?.guest.name}&apos;s stay ({toCancel && dateRange(toCancel.check_in, toCancel.check_out)})? Host cancellations hurt your Superhost
          status, so only do this if you must.
        </p>
      </Modal>
    </main>
  );
}

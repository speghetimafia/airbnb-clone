"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import LoginPrompt from "@/components/LoginPrompt";
import { img } from "@/lib/api";
import { dateRange, toISO } from "@/lib/format";
import type { Booking } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useUser } from "@/lib/user";

function UpcomingCard({ b }: { b: Booking }) {
  return (
    <Link href={`/trips/${b.id}`} className="group block overflow-hidden rounded-3xl border border-line shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img(b.listing.photos[0]?.url ?? "", 900)} alt="" className="aspect-[16/9] w-full object-cover transition group-hover:brightness-95" />
      <div className="flex items-center justify-between gap-4 p-5">
        <div>
          <div className="text-xl font-semibold">{b.listing.city}</div>
          <div className="text-muted">{b.listing.property_type} hosted by {b.listing.host.name.split(" ")[0]}</div>
        </div>
        <div className="shrink-0 rounded-xl bg-soft px-3 py-2 text-center text-sm font-semibold">{dateRange(b.check_in, b.check_out)}</div>
      </div>
    </Link>
  );
}

function PastRow({ b }: { b: Booking }) {
  return (
    <Link href={`/trips/${b.id}`} className="-mx-3 flex items-center gap-4 rounded-xl px-3 py-3 hover:bg-soft">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img(b.listing.photos[0]?.url ?? "", 200)} alt="" className="h-16 w-16 rounded-xl object-cover" />
      <div className="min-w-0">
        <div className="truncate font-semibold">{b.listing.city}</div>
        <div className="truncate text-sm text-muted">Hosted by {b.listing.host.name.split(" ")[0]}</div>
        <div className="text-sm text-muted">{dateRange(b.check_in, b.check_out)}{b.status === "cancelled" && " · Cancelled"}</div>
      </div>
      {b.status === "confirmed" && !b.has_review && <span className="ml-auto shrink-0 rounded-full bg-soft px-3 py-1 text-xs font-semibold">Review</span>}
    </Link>
  );
}

function Trips() {
  const { user, ready } = useUser();
  const booked = Number(useSearchParams().get("booked"));
  const { data, loading } = useApi<Booking[]>(user ? "/bookings/me" : null);
  const today = toISO(new Date());

  if (!ready) return null;
  if (!user) return <LoginPrompt title="Trips" text="You'll find your reservations here after you book." />;

  const all = data ?? [];
  const upcoming = all.filter((b) => b.status === "confirmed" && b.check_out > today).reverse();
  const past = all.filter((b) => b.status === "confirmed" && b.check_out <= today);
  const cancelled = all.filter((b) => b.status === "cancelled");
  const justBooked = all.find((b) => b.id === booked);

  return (
    <main className="mx-auto max-w-[1120px] px-6 pb-28 pt-10">
      <h1 className="mb-8 text-[32px] font-semibold">Trips</h1>
      {justBooked && (
        <div className="mb-8 flex items-center gap-4 rounded-2xl bg-[#f0fdf4] p-6">
          <CheckCircle2 size={32} className="shrink-0 text-[#008a05]" />
          <div>
            <div className="font-semibold">You&apos;re going to {justBooked.listing.city}!</div>
            <div className="text-sm">
              Reservation #{justBooked.id} is confirmed for {dateRange(justBooked.check_in, justBooked.check_out)}. Your host&apos;s welcome message is in Messages.
            </div>
          </div>
        </div>
      )}
      {loading && !data && <div className="h-64 animate-pulse rounded-3xl bg-soft" />}

      {data && upcoming.length === 0 && (
        <div className="mb-12 rounded-3xl border border-line p-8">
          <h2 className="text-[22px] font-semibold">No trips booked… yet!</h2>
          <p className="mb-6 mt-2 text-muted">Time to dust off your bags and start planning your next adventure.</p>
          <Link href="/" className="btn-brand inline-block px-6 py-3">Start searching</Link>
        </div>
      )}
      {upcoming.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-5 text-[22px] font-semibold">Upcoming reservations</h2>
          <div className="grid gap-6 md:grid-cols-2">{upcoming.map((b) => <UpcomingCard key={b.id} b={b} />)}</div>
        </section>
      )}
      {past.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-3 text-[22px] font-semibold">Where you&apos;ve been</h2>
          <div className="grid gap-x-8 md:grid-cols-2">{past.map((b) => <PastRow key={b.id} b={b} />)}</div>
        </section>
      )}
      {cancelled.length > 0 && (
        <section>
          <h2 className="mb-3 text-[22px] font-semibold">Cancelled</h2>
          <div className="grid gap-x-8 md:grid-cols-2">{cancelled.map((b) => <PastRow key={b.id} b={b} />)}</div>
        </section>
      )}
    </main>
  );
}

export default function TripsPage() {
  return (
    <Suspense>
      <Trips />
    </Suspense>
  );
}

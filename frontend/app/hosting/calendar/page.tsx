"use client";

import { addDays, getDay, getDaysInMonth, startOfMonth } from "date-fns";
import Link from "next/link";
import LoginPrompt from "@/components/LoginPrompt";
import { img } from "@/lib/api";
import { fromISO, toISO } from "@/lib/format";
import type { Booking, ListingCard } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useUser } from "@/lib/user";

/** This month as a grid of dots: grey = past, red = today, hollow = reserved, black = open. */
function MiniMonth({ booked }: { booked: Set<string> }) {
  const today = toISO(new Date());
  const first = startOfMonth(new Date());
  const days = Array.from({ length: getDaysInMonth(first) }, (_, i) => toISO(addDays(first, i)));
  return (
    <div className="grid shrink-0 grid-cols-7 gap-2.5 sm:gap-[18px]">
      {Array.from({ length: getDay(first) }, (_, i) => <span key={`b${i}`} />)}
      {days.map((d) => (
        <span
          key={d}
          className={`h-1 w-1 rounded-full sm:h-[5px] sm:w-[5px] ${
            d === today ? "bg-rausch" : d < today ? "bg-[#b0b0b0]" : booked.has(d) ? "ring-1 ring-ink" : "bg-ink"
          }`}
        />
      ))}
    </div>
  );
}

export default function Calendars() {
  const { user, ready } = useUser();
  const listings = useApi<ListingCard[]>(user ? "/host/listings" : null);
  const bookings = useApi<Booking[]>(user ? "/host/bookings" : null);

  if (!ready) return null;
  if (!user) return <LoginPrompt title="Calendar" text="Log in to manage your calendars." />;

  // Reserved nights per listing, as "id:yyyy-MM-dd".
  const booked = new Set<string>();
  for (const b of bookings.data ?? []) {
    if (b.status !== "confirmed") continue;
    for (let d = fromISO(b.check_in); toISO(d) < b.check_out; d = addDays(d, 1)) booked.add(`${b.listing.id}:${toISO(d)}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-16">
      <h1 className="mb-8 px-2 text-[32px] font-semibold">Calendars</h1>
      {listings.loading && !listings.data && <div className="h-40 animate-pulse rounded-2xl bg-soft" />}
      <div className="space-y-7">
        {(listings.data ?? []).map((l) => (
          <Link key={l.id} href={`/hosting/calendar/${l.id}`} className="flex items-center gap-4 rounded-3xl border border-line p-4 hover:shadow-card sm:gap-5 sm:p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(l.photos[0], 300)} alt="" className="h-[72px] w-[72px] shrink-0 rounded-2xl object-cover sm:h-[84px] sm:w-[84px]" />
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-[17px] font-medium leading-snug">{l.title}</div>
              <div className="text-muted">{l.is_listed ? "Listed" : "Unlisted"}</div>
            </div>
            <div>
              <MiniMonth booked={new Set([...booked].filter((k) => k.startsWith(`${l.id}:`)).map((k) => k.split(":")[1]))} />
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

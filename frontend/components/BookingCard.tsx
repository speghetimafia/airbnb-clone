"use client";

import { ChevronDown, ChevronUp, Flag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError, api, qs } from "@/lib/api";
import { money, plural, shortDate } from "@/lib/format";
import type { ListingDetail, Quote, Range } from "@/lib/types";
import Counter from "./Counter";
import RangeCalendar from "./RangeCalendar";

/** Price lines straight from the backend quote, so this always matches what checkout charges. */
export function PriceBreakdown({ quote }: { quote: Quote }) {
  const row = "flex justify-between";
  return (
    <div className="space-y-3">
      <div className={row}>
        <span className="underline">{money(quote.avg_nightly)} x {plural(quote.nights, "night")}</span>
        <span>{money(quote.nightly_total)}</span>
      </div>
      {quote.discount > 0 && (
        <div className={`${row} text-[#008a05]`}>
          <span>{quote.discount_label}</span>
          <span>−{money(quote.discount)}</span>
        </div>
      )}
      {quote.cleaning_fee > 0 && (
        <div className={row}>
          <span className="underline">Cleaning fee</span>
          <span>{money(quote.cleaning_fee)}</span>
        </div>
      )}
      <div className={row}>
        <span className="underline">Airbnb service fee</span>
        <span>{money(quote.service_fee)}</span>
      </div>
      <hr className="border-line" />
      <div className={`${row} font-semibold`}>
        <span>Total</span>
        <span>{money(quote.total)}</span>
      </div>
    </div>
  );
}

type Props = {
  listing: ListingDetail;
  unavailable: Range[];
  checkIn: string | null;
  checkOut: string | null;
  guests: number;
  onDates: (a: string | null, b: string | null) => void;
  onGuests: (n: number) => void;
  onReserve: () => void;
};

export default function BookingCard({ listing, unavailable, checkIn, checkOut, guests, onDates, onGuests, onReserve }: Props) {
  const quoteKey = checkIn && checkOut ? `${checkIn}|${checkOut}|${guests}` : "";
  const [result, setResult] = useState<{ key: string; quote?: Quote; error?: string }>({ key: "" });
  const current = quoteKey && result.key === quoteKey ? result : null; // ignore answers for older dates
  const quote = current?.quote ?? null;
  const error = current?.error ?? null;
  const [panel, setPanel] = useState<"dates" | "guests" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!checkIn || !checkOut) return;
    const key = `${checkIn}|${checkOut}|${guests}`;
    api<Quote>(`/listings/${listing.id}/quote?${qs({ check_in: checkIn, check_out: checkOut, guests })}`)
      .then((q) => setResult({ key, quote: q }))
      .catch((e: ApiError) => setResult({ key, error: e.message }));
  }, [listing.id, checkIn, checkOut, guests]);

  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setPanel(null);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const field = "px-3 py-2.5 text-left";
  const label = "text-[10px] font-bold uppercase";

  return (
    <div ref={ref} className="relative rounded-xl border border-line p-6 shadow-card">
      <div className="mb-6">
        {quote ? (
          <>
            <span className="text-[22px] font-semibold underline">{money(quote.total)}</span>{" "}
            <span>for {plural(quote.nights, "night")}</span>
          </>
        ) : (
          <>
            <span className="text-[22px] font-semibold">{money(listing.base_price)}</span> <span>night</span>
          </>
        )}
      </div>

      <div className="rounded-lg border border-[#b0b0b0]">
        <button onClick={() => setPanel(panel === "dates" ? null : "dates")} className="grid w-full grid-cols-2 border-b border-[#b0b0b0]">
          <div className={`${field} border-r border-[#b0b0b0]`}>
            <div className={label}>Check-in</div>
            <div className={checkIn ? "text-sm" : "text-sm text-muted"}>{checkIn ? shortDate(checkIn) : "Add date"}</div>
          </div>
          <div className={field}>
            <div className={label}>Checkout</div>
            <div className={checkOut ? "text-sm" : "text-sm text-muted"}>{checkOut ? shortDate(checkOut) : "Add date"}</div>
          </div>
        </button>
        <button onClick={() => setPanel(panel === "guests" ? null : "guests")} className={`${field} flex w-full items-center justify-between`}>
          <div>
            <div className={label}>Guests</div>
            <div className="text-sm">{plural(guests, "guest")}</div>
          </div>
          {panel === "guests" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {panel === "dates" && (
        <div className="absolute -left-[340px] top-16 z-30 rounded-2xl bg-white p-6 shadow-[0_6px_20px_rgba(0,0,0,0.2)] max-lg:-left-6">
          <div className="mb-2 flex justify-between">
            <div>
              <h3 className="text-[22px] font-semibold">{checkIn && checkOut ? plural(quote?.nights ?? 0, "night") : "Select dates"}</h3>
              <p className="text-sm text-muted">
                {listing.min_nights > 1 ? `Minimum stay: ${listing.min_nights} nights` : "Add your travel dates for exact pricing"}
              </p>
            </div>
          </div>
          <RangeCalendar checkIn={checkIn} checkOut={checkOut} unavailable={unavailable} minNights={listing.min_nights} onChange={onDates} />
          <div className="mt-2 flex justify-end gap-4">
            <button onClick={() => onDates(null, null)} className="text-sm font-semibold underline">Clear dates</button>
            <button onClick={() => setPanel(null)} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Close</button>
          </div>
        </div>
      )}
      {panel === "guests" && (
        <div className="absolute inset-x-6 z-30 rounded-lg bg-white px-4 shadow-[0_6px_20px_rgba(0,0,0,0.2)]">
          <Counter label="Guests" sub={`This place has a maximum of ${listing.max_guests} guests`} value={guests} min={1} max={listing.max_guests} onChange={onGuests} />
          <div className="flex justify-end pb-4">
            <button onClick={() => setPanel(null)} className="text-sm font-semibold underline">Close</button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-[#c13515]">{error}</p>}

      <button
        onClick={() => (checkIn && checkOut ? onReserve() : setPanel("dates"))}
        disabled={!!error}
        className="btn-brand mt-4 w-full py-3.5 text-base"
      >
        {checkIn && checkOut ? "Reserve" : "Check availability"}
      </button>

      {quote && (
        <>
          <p className="my-4 text-center text-sm">You won&apos;t be charged yet</p>
          <PriceBreakdown quote={quote} />
        </>
      )}
      <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
        <Flag size={14} /> <span className="underline">Report this listing</span>
      </p>
    </div>
  );
}

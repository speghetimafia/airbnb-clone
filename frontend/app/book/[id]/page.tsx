"use client";

import { ChevronLeft, CreditCard, Lock, Star } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { PriceBreakdown } from "@/components/BookingCard";
import { img, post, qs } from "@/lib/api";
import { dateRange, plural, shortDate } from "@/lib/format";
import type { Booking, ListingDetail, Quote } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useUser } from "@/lib/user";

/** Mocked checkout: card fields are only format-checked and never leave the browser. */
function Checkout() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { user, requireLogin } = useUser();
  const checkIn = params.get("check_in") ?? "";
  const checkOut = params.get("check_out") ?? "";
  const guests = Number(params.get("guests") ?? 1);

  const { data: listing } = useApi<ListingDetail>(`/listings/${id}`);
  const { data: quote, error } = useApi<Quote>(`/listings/${id}/quote?${qs({ check_in: checkIn, check_out: checkOut, guests })}`);
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "", pin: "" });
  const [paying, setPaying] = useState(false);

  const digits = card.number.replace(/\D/g, "");
  const cardValid = digits.length >= 15 && /^\d\d\/\d\d$/.test(card.expiry) && /^\d{3,4}$/.test(card.cvv) && /^\d{6}$/.test(card.pin);

  const pay = async () => {
    if (!requireLogin()) return;
    if (!cardValid) return toast.error("Please check your card details");
    setPaying(true);
    try {
      await new Promise((r) => setTimeout(r, 900)); // pretend to talk to a payment gateway
      const booking = await post<Booking>("/bookings", { listing_id: Number(id), check_in: checkIn, check_out: checkOut, guests });
      toast.success("Reservation confirmed! Your host's welcome message is in your trip inbox.");
      router.push(`/trips?booked=${booking.id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setPaying(false);
    }
  };

  const input = "w-full px-4 py-3.5 outline-none placeholder:text-muted";

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-10 xl:px-0">
      <div className="mb-10 flex items-center gap-4">
        <button onClick={() => router.back()} className="rounded-full p-2 hover:bg-soft" aria-label="Back">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-[32px] font-semibold">Confirm and pay</h1>
      </div>

      <div className="grid gap-16 md:grid-cols-2 lg:gap-24">
        <div>
          <section className="border-b border-line pb-8">
            <h2 className="mb-6 text-[22px] font-semibold">Your trip</h2>
            <div className="mb-6 flex justify-between">
              <div>
                <div className="font-semibold">Dates</div>
                <div>{checkIn && checkOut ? dateRange(checkIn, checkOut) : "—"}</div>
              </div>
              <Link href={`/rooms/${id}?${qs({ check_in: checkIn, check_out: checkOut, guests })}`} className="font-semibold underline">Edit</Link>
            </div>
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">Guests</div>
                <div>{plural(guests, "guest")}</div>
              </div>
              <Link href={`/rooms/${id}?${qs({ check_in: checkIn, check_out: checkOut, guests })}`} className="font-semibold underline">Edit</Link>
            </div>
          </section>

          <section className="border-b border-line py-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-[22px] font-semibold">Pay with</h2>
              <span className="flex gap-1 text-xs font-bold">
                {["VISA", "MC", "RuPay", "UPI"].map((b) => (
                  <span key={b} className="rounded border border-line px-1.5 py-0.5">{b}</span>
                ))}
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-[#b0b0b0]">
              <div className="flex items-center border-b border-[#b0b0b0] pr-4">
                <input
                  className={input}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Card number"
                  value={card.number}
                  maxLength={19}
                  onChange={(e) => setCard({ ...card, number: e.target.value.replace(/[^\d]/g, "").replace(/(\d{4})(?=\d)/g, "$1 ") })}
                />
                <CreditCard size={20} className="text-muted" />
              </div>
              <div className="grid grid-cols-2">
                <input
                  className={`${input} border-r border-[#b0b0b0]`}
                  placeholder="Expiration (MM/YY)"
                  value={card.expiry}
                  maxLength={5}
                  onChange={(e) => setCard({ ...card, expiry: e.target.value.replace(/[^\d]/g, "").replace(/^(\d\d)(\d)/, "$1/$2") })}
                />
                <input className={input} placeholder="CVV" inputMode="numeric" autoComplete="off" value={card.cvv} maxLength={4} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })} />
              </div>
            </div>
            <input
              className="mt-3 w-full rounded-lg border border-[#b0b0b0] px-4 py-3.5 outline-none placeholder:text-muted"
              placeholder="PIN code"
              inputMode="numeric"
              value={card.pin}
              maxLength={6}
              onChange={(e) => setCard({ ...card, pin: e.target.value.replace(/\D/g, "") })}
            />
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <Lock size={14} /> Demo checkout: no real payment is made. Use test card 4242 4242 4242 4242, any future date, any CVV.
            </p>
          </section>

          <section className="border-b border-line py-8">
            <h2 className="mb-4 text-[22px] font-semibold">Cancellation policy</h2>
            <p>
              <span className="font-semibold">Free cancellation before {checkIn ? shortDate(checkIn) : "check-in"}.</span> Cancel from your Trips page
              anytime before check-in for a full refund.
            </p>
          </section>

          <section className="border-b border-line py-8">
            <h2 className="mb-4 text-[22px] font-semibold">Ground rules</h2>
            <p className="mb-3">We ask every guest to remember a few simple things about what makes a great guest.</p>
            <ul className="list-disc pl-5">
              <li>Follow the house rules</li>
              <li>Treat your host&apos;s home like your own</li>
            </ul>
          </section>

          <p className="py-6 text-xs text-muted">
            By selecting the button below, I agree to the Host&apos;s House Rules, Ground rules for guests and Airbnb&apos;s Rebooking and Refund Policy.
          </p>
          {error && <p className="mb-4 rounded-lg bg-[#fff8f6] p-4 text-[#c13515]">{error}</p>}
          <button onClick={pay} disabled={paying || !!error || !quote} className="btn-brand w-full py-4 text-base md:w-auto md:px-10">
            {paying ? "Processing…" : user ? "Confirm and pay" : "Log in to book"}
          </button>
        </div>

        <aside>
          <div className="sticky top-28 rounded-xl border border-line p-6">
            {listing && (
              <div className="flex gap-4 border-b border-line pb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img(listing.photos[0]?.url)} alt="" className="h-[106px] w-[124px] rounded-lg object-cover" />
                <div className="text-sm">
                  <div className="text-xs text-muted">Entire {listing.property_type.toLowerCase()}</div>
                  <div className="mb-2">{listing.title}</div>
                  <div className="flex items-center gap-1 text-xs">
                    <Star size={12} className="fill-ink" /> <b>{listing.rating?.toFixed(2) ?? "New"}</b>
                    <span className="text-muted">({listing.review_count} reviews)</span>
                    {listing.host.is_superhost && <span className="text-muted">· Superhost</span>}
                  </div>
                </div>
              </div>
            )}
            <h2 className="mb-6 mt-6 text-[22px] font-semibold">Price details</h2>
            {quote ? <PriceBreakdown quote={quote} /> : !error && <div className="h-40 animate-pulse rounded bg-soft" />}
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function BookPage() {
  return (
    <Suspense>
      <Checkout />
    </Suspense>
  );
}

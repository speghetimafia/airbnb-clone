"use client";

import { Award, CalendarDays, ChevronLeft, DoorOpen, Grip, KeyRound, Medal, Share, Star } from "lucide-react";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import BookingCard from "@/components/BookingCard";
import { Avatar } from "@/components/Header";
import { AmenityIcon } from "@/components/icons";
import { HeartButton } from "@/components/ListingCard";
import Modal from "@/components/Modal";
import RangeCalendar from "@/components/RangeCalendar";
import { img, qs } from "@/lib/api";
import { dateRange, money, nightsBetween, plural, time12, yearsSince } from "@/lib/format";
import type { ListingDetail, Range, Review } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useSnapIndex } from "@/lib/useSnapIndex";
import { useUser } from "@/lib/user";

const share = () => navigator.clipboard?.writeText(location.href).then(() => toast("Link copied"));

const PinMap = dynamic(() => import("@/components/MapView").then((m) => m.PinMap), {
  ssr: false,
  loading: () => <div className="h-[480px] animate-pulse rounded-xl bg-soft" />,
});

function Gallery({ listing }: { listing: ListingDetail }) {
  const [open, setOpen] = useState(false);
  const { ref, index: active, onScroll } = useSnapIndex();
  const router = useRouter();
  const photos = listing.photos;

  return (
    <>
      {/* Mobile edge-to-edge carousel */}
      <div className="relative -mx-6 -mt-6 aspect-[4/3] overflow-hidden bg-soft md:hidden">
        <div ref={ref} onScroll={onScroll} className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto">
          {photos.map((p, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={img(p.url, 720)}
              alt={idx === 0 ? listing.title : ""}
              className="h-full w-full shrink-0 snap-center object-cover"
              onClick={() => setOpen(true)}
            />
          ))}
        </div>

        {/* Floating action buttons */}
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow transition hover:bg-white"
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          <button
            onClick={share}
            aria-label="Share"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow transition hover:bg-white"
          >
            <Share size={15} />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow">
            <HeartButton id={listing.id} className="[&_svg]:h-4 [&_svg]:w-4" />
          </div>
        </div>

        {/* Counter badge */}
        <div className="absolute bottom-4 right-4 z-10 rounded-md bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
          {active + 1} / {photos.length}
        </div>
      </div>

      {/* Desktop 5-photo grid */}
      <div className="relative hidden h-[420px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-xl md:grid">
        {photos.slice(0, 5).map((p, i) => (
          <button
            key={p.id}
            onClick={() => setOpen(true)}
            className={`overflow-hidden ${i === 0 ? "col-span-2 row-span-2" : "col-span-1 row-span-1"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(p.url)} alt={i === 0 ? listing.title : ""} className="h-full w-full object-cover transition hover:brightness-90" />
          </button>
        ))}
        <button
          onClick={() => setOpen(true)}
          className="absolute bottom-6 right-6 flex items-center gap-2 rounded-lg border border-ink bg-white px-4 py-1.5 text-sm font-semibold shadow hover:bg-soft"
        >
          <Grip size={16} /> Show all photos
        </button>
      </div>

      {/* Full screen photos modal */}
      <Modal open={open} onClose={() => setOpen(false)} size="full">
        <div className="mx-auto max-w-3xl space-y-3 pb-8">
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={img(p.url)} alt="" className="w-full rounded-lg" loading="lazy" />
          ))}
        </div>
      </Modal>
    </>
  );
}

function Reviews({ listing }: { listing: ListingDetail }) {
  const { data: reviews } = useApi<Review[]>(`/listings/${listing.id}/reviews`);
  const [all, setAll] = useState(false);
  if (!reviews) return null;
  if (!reviews.length)
    return (
      <section className="border-b border-line py-12">
        <h2 className="text-[22px] font-semibold">No reviews (yet)</h2>
        <p className="mt-2 text-muted">This host has no reviews for this place yet.</p>
      </section>
    );

  const dist = [5, 4, 3, 2, 1].map((s) => reviews.filter((r) => r.rating === s).length / reviews.length);
  const card = (r: Review) => (
    <div key={r.id}>
      <div className="mb-3 flex items-center gap-3">
        <Avatar src={r.author.avatar_url} name={r.author.name} size={48} />
        <div>
          <div className="font-semibold">{r.author.name.split(" ")[0]}</div>
          <div className="text-sm text-muted">{new Date(r.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</div>
        </div>
      </div>
      <div className="mb-1 flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} size={10} className={i < r.rating ? "fill-ink" : "fill-line text-line"} />
        ))}
      </div>
      <p className="leading-relaxed">{r.comment}</p>
    </div>
  );

  return (
    <section id="reviews" className="border-b border-line py-12">
      <h2 className="mb-8 flex items-center gap-2 text-[22px] font-semibold">
        <Star size={20} className="fill-ink" /> {listing.rating?.toFixed(2)} · {plural(listing.review_count, "review")}
      </h2>
      <div className="mb-10 max-w-xs space-y-1">
        {dist.map((d, i) => (
          <div key={i} className="flex items-center gap-3 text-xs">
            <span className="w-2">{5 - i}</span>
            <span className="h-1 flex-1 rounded bg-line">
              <span className="block h-1 rounded bg-ink" style={{ width: `${d * 100}%` }} />
            </span>
          </div>
        ))}
      </div>
      <div className="grid gap-x-24 gap-y-10 md:grid-cols-2">{reviews.slice(0, 6).map(card)}</div>
      {reviews.length > 6 && (
        <button onClick={() => setAll(true)} className="mt-10 rounded-lg border border-ink px-6 py-3 font-semibold hover:bg-soft">
          Show all {reviews.length} reviews
        </button>
      )}
      <Modal open={all} onClose={() => setAll(false)} size="lg" title={`${reviews.length} reviews`}>
        <div className="space-y-10">{reviews.map(card)}</div>
      </Modal>
    </section>
  );
}

function Room() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const { user, requireLogin } = useUser();
  const { data: listing, error } = useApi<ListingDetail>(`/listings/${id}`);
  const { data: unavailable } = useApi<Range[]>(`/listings/${id}/availability`);
  const [checkIn, setCheckIn] = useState<string | null>(params.get("check_in"));
  const [checkOut, setCheckOut] = useState<string | null>(params.get("check_out"));
  const [guests, setGuests] = useState(Math.max(1, Number(params.get("guests") ?? 1)));
  const [descOpen, setDescOpen] = useState(false);
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);

  if (error) return <p className="p-20 text-center text-lg">{error}</p>;
  if (!listing) return <div className="mx-auto max-w-[1120px] p-6"><div className="h-[420px] animate-pulse rounded-xl bg-soft" /></div>;

  const l = listing;
  const host = l.host;
  const isOwner = user?.id === host.id;
  const setDates = (a: string | null, b: string | null) => {
    setCheckIn(a);
    setCheckOut(b);
  };
  const reserve = () => {
    if (!requireLogin()) return;
    router.push(`/book/${l.id}?${qs({ check_in: checkIn, check_out: checkOut, guests })}`);
  };
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

  return (
    <main className="mx-auto max-w-[1120px] px-6 pb-28 pt-6 md:pb-12 xl:px-0">
      {/* Desktop title row */}
      <div className="mb-6 hidden items-end justify-between gap-4 md:flex">
        <h1 className="text-[26px] font-semibold leading-tight">{l.title}</h1>
        <div className="flex shrink-0 gap-2 text-sm font-semibold">
          <button
            onClick={share}
            className="flex items-center gap-2 rounded-lg px-3 py-2 underline hover:bg-soft"
          >
            <Share size={16} /> Share
          </button>
          <span className="flex items-center gap-2 rounded-lg px-3 py-2 underline hover:bg-soft">
            <HeartButton id={l.id} className="[&_svg]:h-4 [&_svg]:w-4 [&_svg]:fill-none [&_svg]:text-ink" /> Save
          </span>
        </div>
      </div>

      <Gallery listing={l} />

      {/* Mobile title */}
      <div className="mt-5 md:hidden">
        <h1 className="text-[22px] font-semibold leading-tight">{l.title}</h1>
      </div>

      <div className="mt-8 grid gap-16 md:grid-cols-[1fr_370px] lg:gap-24">
        <div>
          <section className="border-b border-line pb-8">
            <h2 className="text-[22px] font-semibold">
              Entire {l.property_type.toLowerCase()} in {l.city}, India
            </h2>
            <p className="mt-1">
              {plural(l.max_guests, "guest")} · {plural(l.bedrooms, "bedroom")} · {plural(l.beds, "bed")} · {plural(l.baths, "bathroom")}
            </p>
            <p className="mt-1 flex items-center gap-1 font-semibold">
              <Star size={14} className="fill-ink" /> {l.rating ? l.rating.toFixed(2) : "New"} ·{" "}
              <a href="#reviews" className="underline">{plural(l.review_count, "review")}</a>
            </p>
          </section>

          <section className="flex items-center gap-4 border-b border-line py-6">
            <Avatar src={host.avatar_url} name={host.name} size={40} />
            <div>
              <div className="font-semibold">Hosted by {host.name.split(" ")[0]}</div>
              <div className="text-sm text-muted">
                {host.is_superhost && "Superhost · "}
                {yearsSince(host.joined_at)} years hosting
              </div>
            </div>
          </section>

          <section className="space-y-6 border-b border-line py-8">
            {host.is_superhost && (
              <div className="flex gap-6">
                <Medal size={24} strokeWidth={1.5} />
                <div>
                  <div className="font-semibold">{host.name.split(" ")[0]} is a Superhost</div>
                  <div className="text-sm text-muted">Superhosts are experienced, highly rated hosts.</div>
                </div>
              </div>
            )}
            <div className="flex gap-6">
              <KeyRound size={24} strokeWidth={1.5} />
              <div>
                <div className="font-semibold">Self check-in</div>
                <div className="text-sm text-muted">Check-in details arrive automatically in your trip inbox once you book.</div>
              </div>
            </div>
            <div className="flex gap-6">
              <DoorOpen size={24} strokeWidth={1.5} />
              <div>
                <div className="font-semibold">Check-in after {time12(l.check_in_time)}</div>
                <div className="text-sm text-muted">Checkout before {time12(l.check_out_time)}.</div>
              </div>
            </div>
            <div className="flex gap-6">
              <CalendarDays size={24} strokeWidth={1.5} />
              <div className="font-semibold">Free cancellation before check-in</div>
            </div>
          </section>

          <section className="border-b border-line py-8">
            <p className="line-clamp-6 whitespace-pre-line leading-relaxed">{l.description}</p>
            <button onClick={() => setDescOpen(true)} className="mt-4 font-semibold underline">Show more ›</button>
            <Modal open={descOpen} onClose={() => setDescOpen(false)} size="lg">
              <h2 className="mb-6 text-[26px] font-semibold">About this space</h2>
              <p className="whitespace-pre-line leading-relaxed">{l.description}</p>
            </Modal>
          </section>

          <section className="border-b border-line py-12">
            <h2 className="mb-6 text-[22px] font-semibold">What this place offers</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {l.amenities.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-center gap-4">
                  <AmenityIcon icon={a.icon} /> {a.name}
                </div>
              ))}
            </div>
            {l.amenities.length > 10 && (
              <button onClick={() => setAmenitiesOpen(true)} className="mt-8 rounded-lg border border-ink px-6 py-3 font-semibold hover:bg-soft">
                Show all {l.amenities.length} amenities
              </button>
            )}
            <Modal open={amenitiesOpen} onClose={() => setAmenitiesOpen(false)}>
              <h2 className="mb-6 text-[22px] font-semibold">What this place offers</h2>
              {l.amenities.map((a) => (
                <div key={a.id} className="flex items-center gap-4 border-b border-line py-5">
                  <AmenityIcon icon={a.icon} /> {a.name}
                </div>
              ))}
            </Modal>
          </section>

          <section id="calendar" className="scroll-mt-24 py-12">
            <h2 className="text-[22px] font-semibold">
              {nights > 0 ? `${plural(nights, "night")} in ${l.city}` : checkIn ? "Select checkout date" : "Select check-in date"}
            </h2>
            <p className="mb-6 text-sm text-muted">
              {nights > 0 ? dateRange(checkIn!, checkOut!) : `Minimum stay: ${plural(l.min_nights, "night")}`}
            </p>
            <div className="overflow-x-auto">
              <RangeCalendar checkIn={checkIn} checkOut={checkOut} onChange={setDates} unavailable={unavailable ?? []} minNights={l.min_nights} />
            </div>
            <button onClick={() => setDates(null, null)} className="mt-2 text-sm font-semibold underline">Clear dates</button>
          </section>
        </div>

        <aside className="hidden md:block">
          <div className="sticky top-28">
            <BookingCard
              listing={l}
              unavailable={unavailable ?? []}
              checkIn={checkIn}
              checkOut={checkOut}
              guests={guests}
              isHost={isOwner}
              onDates={setDates}
              onGuests={setGuests}
              onReserve={reserve}
            />
          </div>
        </aside>
      </div>

      <Reviews listing={l} />

      <section className="border-b border-line py-12">
        <h2 className="mb-6 text-[22px] font-semibold">Where you&apos;ll be</h2>
        <PinMap lat={l.lat} lng={l.lng} />
        <p className="mt-6 font-semibold">{l.city}, {l.state}, India</p>
        <p className="mt-2 text-sm text-muted">Exact address is shared in your trip inbox after booking.</p>
      </section>

      <section className="border-b border-line py-12">
        <h2 className="mb-6 text-[22px] font-semibold">Meet your host</h2>
        <div className="grid gap-10 md:grid-cols-[380px_1fr]">
          <div className="flex items-center gap-8 rounded-3xl p-8 shadow-[0_6px_20px_rgba(0,0,0,0.2)]">
            <div className="text-center">
              <div className="relative inline-block">
                <Avatar src={host.avatar_url} name={host.name} size={104} />
                {host.is_superhost && (
                  <span className="absolute bottom-0 right-0 rounded-full bg-rausch p-1.5 text-white"><Award size={16} /></span>
                )}
              </div>
              <div className="mt-2 text-[28px] font-bold leading-none">{host.name.split(" ")[0]}</div>
              {host.is_superhost && <div className="mt-1 text-sm font-semibold">Superhost</div>}
            </div>
            <div className="flex-1 divide-y divide-line">
              <div className="pb-3"><div className="text-[22px] font-bold">{l.review_count}</div><div className="text-[10px] font-semibold">Reviews</div></div>
              <div className="py-3"><div className="text-[22px] font-bold">{l.rating?.toFixed(2) ?? "–"}★</div><div className="text-[10px] font-semibold">Rating</div></div>
              <div className="pt-3"><div className="text-[22px] font-bold">{yearsSince(host.joined_at)}</div><div className="text-[10px] font-semibold">Years hosting</div></div>
            </div>
          </div>
          <div>
            <p className="mb-6 leading-relaxed">{host.bio}</p>
            <h3 className="font-semibold">Host details</h3>
            <p className="mt-2">Response rate: 100%</p>
            <p>Responds within an hour</p>
            <button onClick={() => router.push("/coming-soon?f=Messaging")} className="mt-6 rounded-lg bg-ink px-6 py-3 font-semibold text-white">
              Message host
            </button>
          </div>
        </div>
      </section>

      <section className="py-12">
        <h2 className="mb-6 text-[22px] font-semibold">Things to know</h2>
        <div className="grid gap-8 text-sm md:grid-cols-3">
          <div>
            <h3 className="mb-3 text-base font-semibold">Cancellation policy</h3>
            <p>Free cancellation before check-in. Review this host&apos;s full policy for details.</p>
          </div>
          <div className="space-y-2">
            <h3 className="mb-3 text-base font-semibold">House rules</h3>
            <p>Check-in after {time12(l.check_in_time)}</p>
            <p>Checkout before {time12(l.check_out_time)}</p>
            <p>{plural(l.max_guests, "guest")} maximum</p>
            <p>Minimum stay {plural(l.min_nights, "night")}</p>
          </div>
          <div>
            <h3 className="mb-3 text-base font-semibold">Pricing</h3>
            {l.weekend_price && <p>Fri & Sat nights: {money(l.weekend_price)}</p>}
            {l.weekly_discount_pct > 0 && <p>{l.weekly_discount_pct}% off stays of 7+ nights</p>}
            {l.monthly_discount_pct > 0 && <p>{l.monthly_discount_pct}% off stays of 28+ nights</p>}
          </div>
        </div>
      </section>

      {/* Mobile reserve bar */}
      <div className="fixed inset-x-0 bottom-0 z-[600] flex items-center justify-between border-t border-line bg-white px-6 py-4 md:hidden">
        <div>
          <span className="font-semibold">{money(l.base_price)}</span> night
          {nights > 0 && <div className="text-sm underline">{dateRange(checkIn!, checkOut!)}</div>}
        </div>
        <button
          onClick={() => (nights > 0 ? reserve() : document.getElementById("calendar")?.scrollIntoView({ behavior: "smooth" }))}
          disabled={isOwner}
          className="btn-brand px-8 py-3 disabled:opacity-50"
        >
          {isOwner ? "Your listing" : nights > 0 ? "Reserve" : "Check availability"}
        </button>
      </div>
    </main>
  );
}

export default function RoomPage() {
  return (
    <Suspense>
      <Room />
    </Suspense>
  );
}

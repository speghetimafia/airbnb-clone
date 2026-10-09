"use client";

import { ArrowLeft, DoorClosed, DoorOpen, MapPin, Share2, Star } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { MessageBubbles } from "@/components/Inbox";
import LoginPrompt from "@/components/LoginPrompt";
import Modal from "@/components/Modal";
import { img, post } from "@/lib/api";
import { dateRange, fromISO, money, plural, time12, toISO } from "@/lib/format";
import type { Booking, Message } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useUser } from "@/lib/user";

const PinMap = dynamic(() => import("@/components/MapView").then((m) => m.PinMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-soft" />,
});

function ReviewModal({ booking, onClose, onDone }: { booking: Booking; onClose: () => void; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setSaving(true);
    try {
      await post(`/bookings/${booking.id}/review`, { rating, comment });
      toast.success("Thanks for your review!");
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Write a review"
      error={error}
      footer={
        <button onClick={submit} disabled={!rating || comment.trim().length < 3 || saving} className="btn-brand w-full py-3">
          {saving ? "Submitting…" : "Submit review"}
        </button>
      }
    >
      <h3 className="text-[22px] font-semibold">How was your stay at {booking.listing.title}?</h3>
      <div className="my-6 flex gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} onClick={() => setRating(s)} aria-label={`${s} stars`}>
            <Star size={36} strokeWidth={1.5} className={s <= rating ? "fill-ink" : ""} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={5}
        maxLength={2000}
        placeholder="Share what you loved and what could be better"
        className="w-full rounded-xl border border-[#b0b0b0] p-4 outline-none focus:border-ink"
      />
    </Modal>
  );
}

function TimelineRow({ date, icon, title, sub }: { date: string; icon: React.ReactNode; title: string; sub: string }) {
  const d = fromISO(date);
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 text-center">
        <div className="text-sm font-semibold">{d.toLocaleDateString("en-IN", { weekday: "short" })}</div>
        <div className="mx-auto mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-soft text-sm">{d.getDate()}</div>
      </div>
      <div className="flex flex-1 items-center gap-4 rounded-3xl bg-[#f2f2f2] p-3">
        <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#e8e8e8]">{icon}</span>
        <div>
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-sm text-muted">{sub}</div>
        </div>
      </div>
    </div>
  );
}

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, ready } = useUser();
  const { data: b, error, reload } = useApi<Booking>(user ? `/bookings/${id}` : null);
  const { data: messages } = useApi<Message[]>(user ? `/bookings/${id}/messages` : null);
  const [review, setReview] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  if (ready && !user) return <LoginPrompt title="Trips" text="Log in to see this reservation." />;
  if (error) return <p className="p-20 text-center">{error}</p>;
  if (!b) return <div className="mx-auto mt-10 h-96 max-w-3xl animate-pulse rounded-xl bg-soft" />;

  const l = b.listing;
  const today = toISO(new Date());
  const canCancel = b.status === "confirmed" && b.check_in > today;
  const canReview = b.status === "confirmed" && b.check_out <= today && !b.has_review;
  const share = () => navigator.clipboard?.writeText(`${location.origin}/rooms/${l.id}`).then(() => toast("Listing link copied"));
  const cancel = async () => {
    try {
      await post(`/bookings/${b.id}/cancel`);
      toast("Reservation cancelled. Your full refund is on its way.");
      setConfirmCancel(false);
      reload();
    } catch (e) {
      setCancelError((e as Error).message);
    }
  };
  const section = "border-t border-line py-8";

  return (
    <main className="md:grid md:h-[calc(100vh-81px)] md:grid-cols-[480px_1fr]">
      {/* Map: on top for phones, right column on desktop */}
      <div className="relative h-[42vh] md:order-2 md:h-full">
        <PinMap lat={l.lat} lng={l.lng} zoom={14} height="100%" className="" />
        <div className="pointer-events-none absolute left-1/2 top-[calc(50%+40px)] -translate-x-1/2 text-center text-xs font-semibold [text-shadow:0_0_4px_white]">
          Your stay<br /><span className="font-normal">{dateRange(b.check_in, b.check_out)}</span>
        </div>
      </div>

      <section className="relative z-10 -mt-6 rounded-t-[28px] bg-white px-6 pb-28 pt-3 md:mt-0 md:overflow-y-auto md:rounded-none md:pb-12 md:pt-6">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line md:hidden" />
        <div className="relative mb-6 flex items-center justify-center">
          <button onClick={() => router.push("/trips")} aria-label="Back to trips" className="absolute left-0 rounded-full bg-soft p-3 hover:bg-line">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[26px] font-bold">{l.city}</h1>
        </div>

        <div className="rounded-3xl border border-line p-3 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          <Link href={`/rooms/${l.id}`} className="flex items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(l.photos[0]?.url ?? "", 400)} alt="" className="h-32 w-32 rounded-2xl object-cover" />
            <div>
              <div className="text-xl font-semibold">Your stay</div>
              <div className="text-muted">Hosted by {l.host.name.split(" ")[0]}</div>
              <div className="mt-2 text-sm text-muted">{dateRange(b.check_in, b.check_out)}</div>
              {b.status === "cancelled" && <div className="mt-1 text-sm font-semibold text-[#c13515]">Cancelled</div>}
            </div>
          </Link>
          <button onClick={share} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-soft py-3 text-sm font-semibold hover:bg-line">
            <Share2 size={16} /> Share listing
          </button>
        </div>

        <div className="relative my-8 space-y-4">
          <span className="absolute left-5 top-14 h-[calc(100%-7rem)] w-px bg-line" />
          <TimelineRow date={b.check_in} icon={<DoorOpen size={34} strokeWidth={1.4} />} title="Check-in" sub={`After ${time12(l.check_in_time).toLowerCase()}`} />
          <TimelineRow date={b.check_out} icon={<DoorClosed size={34} strokeWidth={1.4} />} title="Checkout" sub={`Before ${time12(l.check_out_time).toLowerCase()}`} />
        </div>

        {b.status === "confirmed" && (
          <div className={section}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[22px] font-semibold">Messages</h2>
              <Link href={`/messages/${b.id}`} className="text-sm font-semibold underline">Open conversation</Link>
            </div>
            {messages?.length ? (
              <MessageBubbles booking={b} role="guest" messages={messages} />
            ) : (
              <p className="text-muted">Your host&apos;s check-in details will arrive here as your trip gets closer.</p>
            )}
          </div>
        )}

        <div className={section}>
          <h2 className="mb-3 text-[22px] font-semibold">Getting there</h2>
          <p className="flex gap-2"><MapPin size={20} className="shrink-0" /> {l.address || `${l.city}, ${l.state}`}</p>
          <a href={`https://maps.google.com/?q=${l.lat},${l.lng}`} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-lg border border-ink px-5 py-2.5 text-sm font-semibold hover:bg-soft">
            Get directions
          </a>
        </div>

        <div className={section}>
          <h2 className="mb-4 text-[22px] font-semibold">Reservation details</h2>
          <dl className="space-y-3 text-[15px]">
            <div className="flex justify-between"><dt className="text-muted">Confirmation code</dt><dd className="font-semibold">HM{String(b.id).padStart(6, "0")}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Guests</dt><dd>{plural(b.guests, "guest")}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{plural(b.nights, "night")}</dt><dd>{money(b.nightly_total)}</dd></div>
            {b.discount > 0 && <div className="flex justify-between text-[#008a05]"><dt>Discount</dt><dd>−{money(b.discount)}</dd></div>}
            {b.cleaning_fee > 0 && <div className="flex justify-between"><dt className="text-muted">Cleaning fee</dt><dd>{money(b.cleaning_fee)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Service fee</dt><dd>{money(b.service_fee)}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 font-semibold"><dt>Total paid</dt><dd>{money(b.total)}</dd></div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            {canReview && <button onClick={() => setReview(true)} className="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white">Leave a review</button>}
            {canCancel && <button onClick={() => setConfirmCancel(true)} className="rounded-lg border border-ink px-5 py-3 text-sm font-semibold hover:bg-soft">Cancel reservation</button>}
          </div>
        </div>
      </section>

      {review && <ReviewModal booking={b} onClose={() => setReview(false)} onDone={() => { setReview(false); reload(); }} />}
      <Modal
        open={confirmCancel}
        onClose={() => {
          setConfirmCancel(false);
          setCancelError(null);
        }}
        title="Cancel reservation"
        error={cancelError}
        footer={
          <div className="flex justify-between">
            <button onClick={() => setConfirmCancel(false)} className="font-semibold underline">Keep reservation</button>
            <button onClick={cancel} className="rounded-lg bg-ink px-6 py-3 font-semibold text-white">Cancel reservation</button>
          </div>
        }
      >
        <p>
          Cancel your stay at <b>{l.title}</b> ({dateRange(b.check_in, b.check_out)})? You&apos;ll get a full refund of <b>{money(b.total)}</b> and
          the dates will open up for other guests.
        </p>
      </Modal>
    </main>
  );
}

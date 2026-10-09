"use client";

import { CheckCircle2, MessageSquare, Star } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/Header";
import LoginPrompt from "@/components/LoginPrompt";
import Modal from "@/components/Modal";
import { img, post } from "@/lib/api";
import { dateRange, money, plural, time12, toISO } from "@/lib/format";
import type { Booking, Message } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useUser } from "@/lib/user";

function Inbox({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { data: messages, loading } = useApi<Message[]>(`/bookings/${booking.id}/messages`);
  const host = booking.listing.host;
  return (
    <Modal open onClose={onClose} title={`Messages from ${host.name.split(" ")[0]}`} size="lg">
      {loading && <div className="h-24 animate-pulse rounded-xl bg-soft" />}
      {messages?.length === 0 && (
        <p className="text-muted">
          No messages yet. {booking.status === "cancelled" ? "This trip was cancelled." : "Your host's automated messages will show up here as your trip gets closer."}
        </p>
      )}
      <div className="space-y-6">
        {messages?.map((m) => (
          <div key={m.id} className="flex gap-3">
            <Avatar src={host.avatar_url} name={host.name} size={40} />
            <div className="flex-1">
              <div className="mb-1 text-sm">
                <b>{host.name.split(" ")[0]}</b>{" "}
                <span className="text-muted">
                  {new Date(m.send_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · Automated
                </span>
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-soft p-4">
                <div className="mb-2 font-semibold">{m.title}</div>
                <p className="whitespace-pre-line text-[15px] leading-relaxed">{linkify(m.body)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 rounded-xl border border-line p-4 text-sm text-muted">
        Replying to hosts is coming soon. These are automated messages your host set up for this listing.
      </p>
    </Modal>
  );
}

function linkify(text: string) {
  return text.split(/(https?:\/\/\S+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noreferrer" className="font-semibold underline">Open in Maps</a>
    ) : (
      part
    ),
  );
}

function ReviewModal({ booking, onClose, onDone }: { booking: Booking; onClose: () => void; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      await post(`/bookings/${booking.id}/review`, { rating, comment });
      toast.success("Thanks for your review!");
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Write a review"
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

function TripCard({ b, onChange }: { b: Booking; onChange: () => void }) {
  const today = toISO(new Date());
  const [inbox, setInbox] = useState(false);
  const [review, setReview] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const canCancel = b.status === "confirmed" && b.check_in > today;
  const canReview = b.status === "confirmed" && b.check_out <= today && !b.has_review;

  const cancel = async () => {
    try {
      await post(`/bookings/${b.id}/cancel`);
      toast("Reservation cancelled. Your full refund is on its way.");
      setConfirmCancel(false);
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line shadow-sm sm:flex-row">
      <Link href={`/rooms/${b.listing.id}`} className="sm:w-64">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(b.listing.photos[0]?.url)} alt="" className="h-48 w-full object-cover sm:h-full" />
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">{b.listing.city}</h3>
            <p className="text-muted">{b.listing.title}</p>
          </div>
          {b.status === "cancelled" ? (
            <span className="rounded-full bg-[#fff8f6] px-3 py-1 text-xs font-semibold text-[#c13515]">Cancelled</span>
          ) : b.check_in > today ? (
            <span className="rounded-full bg-[#f0fdf4] px-3 py-1 text-xs font-semibold text-[#008a05]">Confirmed</span>
          ) : null}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm sm:grid-cols-4">
          <div><div className="text-muted">Dates</div><div className="font-semibold">{dateRange(b.check_in, b.check_out)}</div></div>
          <div><div className="text-muted">Check-in</div><div className="font-semibold">After {time12(b.listing.check_in_time)}</div></div>
          <div><div className="text-muted">Guests</div><div className="font-semibold">{plural(b.guests, "guest")}</div></div>
          <div><div className="text-muted">Total paid</div><div className="font-semibold">{money(b.total)}</div></div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm">
          <Avatar src={b.listing.host.avatar_url} name={b.listing.host.name} size={24} /> Hosted by {b.listing.host.name}
        </div>
        <div className="mt-auto flex flex-wrap gap-3 pt-4">
          {b.status === "confirmed" && (
            <button onClick={() => setInbox(true)} className="flex items-center gap-2 rounded-lg border border-ink px-4 py-2 text-sm font-semibold hover:bg-soft">
              <MessageSquare size={16} /> Messages
            </button>
          )}
          {canReview && <button onClick={() => setReview(true)} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Leave a review</button>}
          {b.has_review && <span className="flex items-center gap-1 px-2 py-2 text-sm text-muted"><CheckCircle2 size={16} /> Reviewed</span>}
          {canCancel && <button onClick={() => setConfirmCancel(true)} className="px-2 py-2 text-sm font-semibold underline">Cancel reservation</button>}
        </div>
      </div>
      {inbox && <Inbox booking={b} onClose={() => setInbox(false)} />}
      {review && <ReviewModal booking={b} onClose={() => setReview(false)} onDone={() => { setReview(false); onChange(); }} />}
      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel reservation"
        footer={
          <div className="flex justify-between">
            <button onClick={() => setConfirmCancel(false)} className="font-semibold underline">Keep reservation</button>
            <button onClick={cancel} className="rounded-lg bg-ink px-6 py-3 font-semibold text-white">Cancel reservation</button>
          </div>
        }
      >
        <p>
          Cancel your stay at <b>{b.listing.title}</b> ({dateRange(b.check_in, b.check_out)})? You&apos;ll get a full refund of{" "}
          <b>{money(b.total)}</b> and the dates will open up for other guests.
        </p>
      </Modal>
    </div>
  );
}

function Trips() {
  const { user, ready } = useUser();
  const params = useSearchParams();
  const booked = Number(params.get("booked"));
  const { data, loading, reload } = useApi<Booking[]>(user ? `/bookings/me?u=${user.id}` /* refetch when switching users */ : null);
  const [tab, setTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const today = toISO(new Date());

  if (!ready) return null;
  if (!user) return <LoginPrompt title="Trips" text="You'll find your reservations here after you book." />;

  const groups = {
    upcoming: (data ?? []).filter((b) => b.status === "confirmed" && b.check_out > today).reverse(),
    past: (data ?? []).filter((b) => b.status === "confirmed" && b.check_out <= today),
    cancelled: (data ?? []).filter((b) => b.status === "cancelled"),
  };
  const justBooked = data?.find((b) => b.id === booked);

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-12">
      <h1 className="mb-8 text-[32px] font-semibold">Trips</h1>
      {justBooked && (
        <div className="mb-8 flex items-center gap-4 rounded-2xl bg-[#f0fdf4] p-6">
          <CheckCircle2 size={32} className="text-[#008a05]" />
          <div>
            <div className="font-semibold">You&apos;re going to {justBooked.listing.city}!</div>
            <div className="text-sm">
              Reservation #{justBooked.id} is confirmed for {dateRange(justBooked.check_in, justBooked.check_out)}. Open Messages for your host&apos;s welcome note.
            </div>
          </div>
        </div>
      )}
      <div className="mb-8 flex gap-6 border-b border-line">
        {(["upcoming", "past", "cancelled"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 pb-3 text-sm font-semibold capitalize ${tab === t ? "border-ink" : "border-transparent text-muted"}`}>
            {t} ({groups[t].length})
          </button>
        ))}
      </div>
      {loading && !data ? (
        <div className="h-48 animate-pulse rounded-2xl bg-soft" />
      ) : groups[tab].length === 0 ? (
        <div className="border-b border-line pb-12">
          <h2 className="text-[22px] font-semibold">{tab === "upcoming" ? "No trips booked… yet!" : `No ${tab} trips`}</h2>
          <p className="mb-6 mt-2 text-muted">Time to dust off your bags and start planning your next adventure.</p>
          <Link href="/" className="rounded-lg border border-ink px-6 py-3 font-semibold hover:bg-soft">Start searching</Link>
        </div>
      ) : (
        <div className="space-y-6">{groups[tab].map((b) => <TripCard key={b.id} b={b} onChange={reload} />)}</div>
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

"use client";

import { Plus, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/Header";
import LoginPrompt from "@/components/LoginPrompt";
import Modal from "@/components/Modal";
import { del, img, post } from "@/lib/api";
import { dateRange, money, plural, toISO } from "@/lib/format";
import type { Booking, ListingCard } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useUser } from "@/lib/user";

type ResTab = "upcoming" | "current" | "past" | "cancelled";

export default function Hosting() {
  const { user, ready, refresh } = useUser();
  const listings = useApi<ListingCard[]>(user ? "/host/listings" : null);
  const bookings = useApi<Booking[]>(user ? "/host/bookings" : null);
  const [tab, setTab] = useState<"reservations" | "listings">("reservations");
  const [resTab, setResTab] = useState<ResTab>("upcoming");
  const [toDelete, setToDelete] = useState<ListingCard | null>(null);
  const [toCancel, setToCancel] = useState<Booking | null>(null);

  if (!ready) return null;
  if (!user) return <LoginPrompt title="Hosting" text="Log in as a host to manage your listings and reservations." />;

  const today = toISO(new Date());
  const all = bookings.data ?? [];
  const groups: Record<ResTab, Booking[]> = {
    upcoming: all.filter((b) => b.status === "confirmed" && b.check_in > today),
    current: all.filter((b) => b.status === "confirmed" && b.check_in <= today && b.check_out > today),
    past: all.filter((b) => b.status === "confirmed" && b.check_out <= today).reverse(),
    cancelled: all.filter((b) => b.status === "cancelled"),
  };
  const earnings = all
    .filter((b) => b.status === "confirmed" && b.check_in.slice(0, 7) === today.slice(0, 7))
    .reduce((s, b) => s + b.total - b.service_fee, 0);

  const deleteListing = async () => {
    try {
      await del(`/listings/${toDelete!.id}`);
      toast("Listing deleted");
      setToDelete(null);
      listings.reload();
      refresh(); // may no longer be a host
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const cancelBooking = async () => {
    try {
      await post(`/bookings/${toCancel!.id}/cancel`);
      toast("Reservation cancelled. The guest gets a full refund.");
      setToCancel(null);
      bookings.reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const pill = (active: boolean) =>
    `rounded-full border px-4 py-2 text-sm ${active ? "border-ink bg-soft font-semibold ring-1 ring-ink" : "border-line hover:border-ink"}`;

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-10 xl:px-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold">Welcome back, {user.name.split(" ")[0]}</h1>
          {user.is_host && (
            <p className="mt-1 text-muted">
              {plural(listings.data?.length ?? 0, "listing")} · {money(earnings)} payouts this month
            </p>
          )}
        </div>
        <Link href="/hosting/listings/new" className="flex items-center gap-2 rounded-lg border border-ink px-5 py-3 font-semibold hover:bg-soft">
          <Plus size={18} /> Create listing
        </Link>
      </div>

      {listings.data?.length === 0 ? (
        <div className="rounded-2xl border border-line p-10 text-center">
          <h2 className="text-[26px] font-semibold">Airbnb it.</h2>
          <p className="mx-auto mb-6 mt-2 max-w-md text-muted">You could earn by sharing your home. Create a listing in a few minutes; you can edit everything later.</p>
          <Link href="/hosting/listings/new" className="btn-brand inline-block px-8 py-3.5">Create your first listing</Link>
        </div>
      ) : (
        <>
          <div className="mb-8 flex gap-6 border-b border-line">
            {(["reservations", "listings"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 pb-3 font-semibold capitalize ${tab === t ? "border-ink" : "border-transparent text-muted"}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === "reservations" ? (
            <>
              <div className="mb-6 flex flex-wrap gap-2">
                {(
                  [["upcoming", "Upcoming"], ["current", "Currently hosting"], ["past", "Past"], ["cancelled", "Cancelled"]] as const
                ).map(([k, label]) => (
                  <button key={k} onClick={() => setResTab(k)} className={pill(resTab === k)}>
                    {label} ({groups[k].length})
                  </button>
                ))}
              </div>
              {groups[resTab].length === 0 ? (
                <p className="rounded-2xl bg-soft p-10 text-center text-muted">No reservations here.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {groups[resTab].map((b) => (
                    <div key={b.id} className="space-y-3 rounded-xl border border-line p-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2.5 text-sm font-semibold">
                          <Avatar src={b.guest.avatar_url} name={b.guest.name} size={32} />
                          {b.guest.name}
                        </span>
                        <span className="text-sm font-semibold">{money(b.total - b.service_fee)}</span>
                      </div>
                      <Link href={`/rooms/${b.listing.id}`} className="block truncate text-sm text-muted hover:underline">
                        {b.listing.title}
                      </Link>
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span>{dateRange(b.check_in, b.check_out)}</span>
                        <span>{plural(b.guests, "guest")}</span>
                      </div>
                      {resTab === "upcoming" && (
                        <div className="border-t border-line pt-2 text-right">
                          <button onClick={() => setToCancel(b)} className="text-sm font-semibold text-[#c13515] underline">
                            Cancel reservation
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(listings.data ?? []).map((l) => (
                <div key={l.id} className="flex gap-4 rounded-xl border border-line p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img(l.photos[0], 200)} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/rooms/${l.id}`} className="block truncate text-sm font-semibold hover:underline">
                      {l.title}
                    </Link>
                    <div className="mt-0.5 text-xs text-muted">{l.city}, {l.state}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span><b>{money(l.base_price)}</b> night</span>
                      {l.rating && <span className="flex items-center gap-0.5"><Star size={10} className="fill-ink" /> {l.rating.toFixed(2)}</span>}
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs font-semibold">
                      <Link href={`/hosting/listings/${l.id}`} className="underline">Calendar & messages</Link>
                      <Link href={`/hosting/listings/${l.id}/edit`} className="underline">Edit</Link>
                      <button onClick={() => setToDelete(l)} className="text-[#c13515] underline">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete listing"
        footer={
          <div className="flex justify-between">
            <button onClick={() => setToDelete(null)} className="font-semibold underline">Cancel</button>
            <button onClick={deleteListing} className="rounded-lg bg-[#c13515] px-6 py-3 font-semibold text-white">Delete</button>
          </div>
        }
      >
        <p>Permanently delete <b>{toDelete?.title}</b>? Its photos, calendar and past reservation history will be removed. Listings with upcoming reservations can&apos;t be deleted.</p>
      </Modal>
      <Modal
        open={!!toCancel}
        onClose={() => setToCancel(null)}
        title="Cancel reservation"
        footer={
          <div className="flex justify-between">
            <button onClick={() => setToCancel(null)} className="font-semibold underline">Keep it</button>
            <button onClick={cancelBooking} className="rounded-lg bg-ink px-6 py-3 font-semibold text-white">Cancel reservation</button>
          </div>
        }
      >
        <p>Cancel {toCancel?.guest.name}&apos;s stay ({toCancel && dateRange(toCancel.check_in, toCancel.check_out)})? Host cancellations hurt your Superhost status, so only do this if you must.</p>
      </Modal>
    </main>
  );
}

"use client";

import { CalendarDays, Pencil, Plus, Star, Trash2 } from "lucide-react";
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
  const key = user ? `?u=${user.id}` : ""; // refetch when switching users
  const listings = useApi<ListingCard[]>(user ? `/host/listings${key}` : null);
  const bookings = useApi<Booking[]>(user ? `/host/bookings${key}` : null);
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
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-b border-line text-muted">
                      <tr>
                        <th className="p-4 font-semibold">Guest</th>
                        <th className="p-4 font-semibold">Listing</th>
                        <th className="p-4 font-semibold">Dates</th>
                        <th className="p-4 font-semibold">Guests</th>
                        <th className="p-4 font-semibold">Payout</th>
                        <th className="p-4" />
                      </tr>
                    </thead>
                    <tbody>
                      {groups[resTab].map((b) => (
                        <tr key={b.id} className="border-b border-line last:border-0">
                          <td className="p-4">
                            <span className="flex items-center gap-3"><Avatar src={b.guest.avatar_url} name={b.guest.name} size={32} /> {b.guest.name}</span>
                          </td>
                          <td className="max-w-[240px] truncate p-4">
                            <Link href={`/rooms/${b.listing.id}`} className="hover:underline">{b.listing.title}</Link>
                          </td>
                          <td className="p-4">{dateRange(b.check_in, b.check_out)}</td>
                          <td className="p-4">{b.guests}</td>
                          <td className="p-4 font-semibold">{money(b.total - b.service_fee)}</td>
                          <td className="p-4 text-right">
                            {resTab === "upcoming" && (
                              <button onClick={() => setToCancel(b)} className="font-semibold underline">Cancel</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-line text-muted">
                  <tr>
                    <th className="p-4 font-semibold">Listing</th>
                    <th className="p-4 font-semibold">Location</th>
                    <th className="p-4 font-semibold">Price</th>
                    <th className="p-4 font-semibold">Rating</th>
                    <th className="p-4" />
                  </tr>
                </thead>
                <tbody>
                  {(listings.data ?? []).map((l) => (
                    <tr key={l.id} className="border-b border-line last:border-0">
                      <td className="p-4">
                        <Link href={`/rooms/${l.id}`} className="flex items-center gap-4 hover:underline">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img(l.photos[0], 200)} alt="" className="h-12 w-16 rounded-md object-cover" />
                          <span className="max-w-[260px] truncate font-semibold">{l.title}</span>
                        </Link>
                      </td>
                      <td className="p-4">{l.city}, {l.state}</td>
                      <td className="p-4">{money(l.base_price)}</td>
                      <td className="p-4">
                        {l.rating ? <span className="flex items-center gap-1"><Star size={12} className="fill-ink" /> {l.rating.toFixed(2)} ({l.review_count})</span> : "New"}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <Link href={`/hosting/listings/${l.id}`} title="Calendar & messages" className="rounded-full p-2 hover:bg-soft"><CalendarDays size={18} /></Link>
                          <Link href={`/hosting/listings/${l.id}/edit`} title="Edit" className="rounded-full p-2 hover:bg-soft"><Pencil size={18} /></Link>
                          <button onClick={() => setToDelete(l)} title="Delete" className="rounded-full p-2 hover:bg-soft"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

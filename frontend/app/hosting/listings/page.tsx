"use client";

import { LayoutGrid, List, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import LoginPrompt from "@/components/LoginPrompt";
import { img } from "@/lib/api";
import { clearDraft, useDraft } from "@/lib/storage";
import type { ListingCard } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useUser } from "@/lib/user";

const round = "flex h-14 w-14 items-center justify-center rounded-full bg-[#f2f2f2] hover:bg-line";

function Dot({ on }: { on: boolean }) {
  return <span className={`absolute left-2.5 top-2.5 h-3 w-3 rounded-full ring-2 ring-white ${on ? "bg-[#008a05]" : "bg-[#555]"}`} />;
}

export default function YourListings() {
  const { user, ready } = useUser();
  const { data, loading } = useApi<ListingCard[]>(user ? "/host/listings" : null);
  const [grid, setGrid] = useState(false);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const draft = useDraft();

  if (!ready) return null;
  if (!user) return <LoginPrompt title="Listings" text="Log in to manage your listings." />;

  const items = (data ?? []).filter((l) => `${l.title} ${l.city}`.toLowerCase().includes(q.toLowerCase()));
  const groups = [
    { title: "Listed", items: items.filter((l) => l.is_listed) },
    { title: "Unlisted", items: items.filter((l) => !l.is_listed) },
  ].filter((g) => g.items.length);

  return (
    <main className="mx-auto max-w-3xl px-6 pb-28 pt-6">
      <div className="mb-4 flex justify-end gap-3">
        <button onClick={() => { setSearching(!searching); setQ(""); }} aria-label="Search listings" className={round}>
          {searching ? <X size={22} /> : <Search size={22} />}
        </button>
        <button onClick={() => setGrid(!grid)} aria-label={grid ? "List view" : "Grid view"} className={round}>
          {grid ? <List size={22} /> : <LayoutGrid size={22} />}
        </button>
        <Link href="/hosting/listings/new" aria-label="Create a new listing" className={round}><Plus size={24} /></Link>
      </div>
      <h1 className="mb-6 text-[32px] font-semibold">Your listings</h1>
      {searching && (
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title or city" className="mb-6 w-full rounded-full border border-line px-5 py-3 outline-none focus:border-ink" />
      )}

      {draft && (
        <section className="mt-10">
          <h2 className="mb-5 text-xl font-medium">In progress</h2>
          <div className="flex items-center gap-6">
            <Link href="/hosting/listings/new" className="flex min-w-0 flex-1 items-center gap-6">
              {draft.f.photo_urls[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img(draft.f.photo_urls[0], 300)} alt="" className="h-[84px] w-[84px] shrink-0 rounded-2xl object-cover" />
              ) : (
                <span className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-2xl bg-soft text-4xl">🏠</span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-[17px] font-medium">{draft.f.title || `Your ${draft.f.property_type.toLowerCase()} listing`}</span>
                <span className="block text-muted">Edited {new Date(draft.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · Continue</span>
              </span>
            </Link>
            <button onClick={clearDraft} className="text-sm font-semibold underline">Discard</button>
          </div>
        </section>
      )}

      {loading && !data && <div className="h-40 animate-pulse rounded-2xl bg-soft" />}
      {data?.length === 0 && (
        <div className="rounded-3xl bg-[#f7f7f7] p-8">
          <div className="text-5xl">🏡</div>
          <h2 className="mt-4 text-[22px] font-semibold">Create your first listing</h2>
          <p className="mb-6 mt-1 text-muted">It only takes a few minutes, and you can edit everything later.</p>
          <Link href="/hosting/listings/new" className="btn-brand inline-block px-6 py-3">Get started</Link>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.title} className="mt-10">
          <h2 className="mb-5 text-xl font-medium">{g.title}</h2>
          <div className={grid ? "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3" : "space-y-7"}>
            {g.items.map((l) =>
              grid ? (
                <Link key={l.id} href={`/hosting/listings/${l.id}`} className="block">
                  <span className="relative block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img(l.photos[0], 500)} alt="" className="aspect-square w-full rounded-2xl object-cover" />
                    <Dot on={l.is_listed} />
                  </span>
                  <span className="mt-2 block truncate font-medium">{l.title}</span>
                  <span className="block truncate text-sm text-muted">{l.property_type} in {l.city}, India</span>
                </Link>
              ) : (
                <Link key={l.id} href={`/hosting/listings/${l.id}`} className="flex items-center gap-6">
                  <span className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img(l.photos[0], 300)} alt="" className="h-[84px] w-[84px] rounded-2xl object-cover" />
                    <Dot on={l.is_listed} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[17px] font-medium">{l.title}</span>
                    <span className="block truncate text-muted">{l.property_type} in {l.city}, India</span>
                  </span>
                </Link>
              ),
            )}
          </div>
        </section>
      ))}
    </main>
  );
}

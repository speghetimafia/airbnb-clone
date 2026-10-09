"use client";

import Link from "next/link";
import ListingCard from "@/components/ListingCard";
import LoginPrompt from "@/components/LoginPrompt";
import type { ListingCard as Card } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useUser } from "@/lib/user";

export default function Wishlists() {
  const { user, ready, saved } = useUser();
  const { data, loading } = useApi<Card[]>(user ? `/wishlist?u=${user.id}` : null);

  if (!ready) return null;
  if (!user) return <LoginPrompt title="Wishlists" text="Tap the heart on any home to save it here." />;

  // Hide hearts the user just un-saved without refetching.
  const items = (data ?? []).filter((l) => saved.has(l.id));

  return (
    <main className="mx-auto max-w-[1760px] px-6 py-12 xl:px-20">
      <h1 className="mb-8 text-[32px] font-semibold">Wishlists</h1>
      {loading && !data ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="aspect-square animate-pulse rounded-xl bg-soft" />)}
        </div>
      ) : items.length === 0 ? (
        <div>
          <h2 className="text-[22px] font-semibold">Create your first wishlist</h2>
          <p className="mb-6 mt-2 text-muted">As you search, tap the heart icon to save your favourite places to stay.</p>
          <Link href="/" className="rounded-lg border border-ink px-6 py-3 font-semibold hover:bg-soft">Start exploring</Link>
        </div>
      ) : (
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}
    </main>
  );
}

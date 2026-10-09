"use client";

import { BookOpen, ChevronRight, CircleHelp, LogOut, Plus, Settings, Star, UserRoundPlus, Users } from "lucide-react";
import Link from "next/link";
import { Avatar, SwitchPill } from "@/components/Header";
import LoginPrompt from "@/components/LoginPrompt";
import { img } from "@/lib/api";
import { money, toISO } from "@/lib/format";
import type { Booking, ListingCard } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useUser } from "@/lib/user";

export default function HostMenu() {
  const { user, ready, logout } = useUser();
  const listings = useApi<ListingCard[]>(user ? "/host/listings" : null);
  const bookings = useApi<Booking[]>(user ? "/host/bookings" : null);

  if (!ready) return null;
  if (!user) return <LoginPrompt title="Menu" text="Log in to see your hosting earnings and insights." />;

  const month = toISO(new Date()).slice(0, 7);
  const earnings = (bookings.data ?? [])
    .filter((b) => b.status === "confirmed" && b.check_in.startsWith(month))
    .reduce((sum, b) => sum + b.total - b.service_fee, 0);
  const rated = (listings.data ?? []).filter((l) => l.rating);
  const reviews = rated.reduce((n, l) => n + l.review_count, 0);
  const rating = reviews ? rated.reduce((s, l) => s + (l.rating ?? 0) * l.review_count, 0) / reviews : null;

  const card = "flex h-56 flex-col rounded-3xl p-6 shadow-[0_6px_24px_rgba(0,0,0,0.12)]";
  const row = (icon: React.ReactNode, label: string, href: string) => (
    <Link href={href} className="flex items-center gap-5 py-5 text-[18px]">
      {icon}
      <span className="flex-1">{label}</span>
      <ChevronRight size={22} className="text-muted" />
    </Link>
  );

  return (
    <main className="mx-auto max-w-2xl px-6 pb-44 pt-4">
      <div className="mb-4 flex items-center justify-end gap-3">
        <Link href="/profile" aria-label="Profile"><Avatar src={user.avatar_url} name={user.name} size={56} /></Link>
      </div>
      <h1 className="mb-8 text-[32px] font-semibold">Menu</h1>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/hosting" className={card}>
          <span className="text-lg font-medium">Earnings</span>
          <span className="text-muted">{new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
          <span className="mt-auto text-[34px] font-bold leading-none">{money(earnings)}</span>
        </Link>
        <Link href="/hosting/listings" className={card}>
          <span className="text-lg font-medium">Insights</span>
          <span className="flex items-center gap-1 text-muted">
            <Star size={14} className="fill-muted" /> {rating ? `${rating.toFixed(2)} · ${reviews} reviews` : "No reviews yet"}
          </span>
          <span className="mt-auto flex -space-x-3">
            {(listings.data ?? []).slice(0, 3).map((l) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={l.id} src={img(l.photos[0], 120)} alt="" className="h-12 w-12 rounded-xl border-2 border-white object-cover shadow" />
            ))}
          </span>
        </Link>
      </div>

      <Link href="/hosting/listings/new" className="mt-8 flex items-center gap-5 rounded-3xl bg-[#f2f0ec] px-6 py-5">
        <span className="text-5xl">🏡</span>
        <span>
          <span className="block text-lg font-medium">Create a new listing</span>
          <span className="text-muted">Host a home on Airbnb.</span>
        </span>
      </Link>

      <div className="mt-6 divide-y divide-line">
        {row(<Settings size={26} strokeWidth={1.5} />, "Account settings", "/coming-soon?f=Account settings")}
        {row(<BookOpen size={26} strokeWidth={1.5} />, "Hosting resources", "/coming-soon?f=Hosting resources")}
        {row(<CircleHelp size={26} strokeWidth={1.5} />, "Get help", "/coming-soon?f=Help Centre")}
        {row(<Users size={26} strokeWidth={1.5} />, "Find a co-host", "/coming-soon?f=Co-hosting")}
        {row(<Plus size={26} strokeWidth={1.5} />, "Create a new listing", "/hosting/listings/new")}
        {row(<UserRoundPlus size={26} strokeWidth={1.5} />, "Refer a host", "/coming-soon?f=Referrals")}
        <button onClick={logout} className="flex w-full items-center gap-5 py-5 text-[18px]">
          <LogOut size={26} strokeWidth={1.5} /> <span className="flex-1 text-left">Log out</span>
        </button>
      </div>

      <SwitchPill to="travelling" />
    </main>
  );
}

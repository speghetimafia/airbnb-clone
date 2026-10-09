"use client";

import { Bell, ChevronRight, CircleHelp, Heart, LogOut, Settings, ShieldCheck, UserRoundCog } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Avatar, SwitchPill } from "@/components/Header";
import LoginPrompt from "@/components/LoginPrompt";
import { img } from "@/lib/api";
import { toISO, yearsSince } from "@/lib/format";
import type { Booking } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useUser } from "@/lib/user";

export default function Profile() {
  const { user, ready, refresh, logout, setLoginOpen } = useUser();
  const { data: trips } = useApi<Booking[]>(user ? "/bookings/me" : null);

  useEffect(() => {
    refresh(); // trip and review counts change after booking or reviewing
  }, [refresh]);

  if (!ready) return null;
  if (!user) return <LoginPrompt title="Profile" text="Log in to see your trips, reviews and account." />;

  const lastPast = trips?.find((b) => b.status === "confirmed" && b.check_out <= toISO(new Date()));
  const stat = (n: number, label: string) => (
    <div className="border-b border-line py-3 last:border-0">
      <div className="text-[22px] font-bold leading-tight">{n}</div>
      <div className="text-xs font-medium">{label}</div>
    </div>
  );
  const row = (icon: React.ReactNode, label: string, props: { href?: string; onClick?: () => void }) => {
    const inner = (
      <>
        {icon}
        <span className="flex-1 text-left">{label}</span>
        <ChevronRight size={20} className="text-muted" />
      </>
    );
    const cls = "flex w-full items-center gap-4 border-b border-line py-5 text-[17px]";
    return props.href ? <Link href={props.href} className={cls}>{inner}</Link> : <button onClick={props.onClick} className={cls}>{inner}</button>;
  };

  return (
    <main className="mx-auto max-w-2xl px-6 pb-44 pt-6">
      <div className="mb-4 flex justify-end">
        <Link href="/coming-soon?f=Notifications" aria-label="Notifications" className="rounded-full bg-soft p-3.5"><Bell size={20} /></Link>
      </div>
      <h1 className="mb-8 text-[32px] font-semibold">Profile</h1>

      <div className="grid grid-cols-[1.4fr_1fr] items-center gap-6 rounded-3xl p-8 shadow-[0_6px_24px_rgba(0,0,0,0.12)]">
        <div className="text-center">
          <div className="relative inline-block">
            <Avatar src={user.avatar_url} name={user.name} size={120} />
            <span className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-rausch text-white ring-4 ring-white">
              <ShieldCheck size={20} />
            </span>
          </div>
          <div className="mt-3 text-[32px] font-bold leading-tight">{user.name.split(" ")[0]}</div>
          <div className="text-sm text-muted">{user.is_host ? "Host" : "Guest"}</div>
        </div>
        <div>
          {stat(user.trip_count, user.trip_count === 1 ? "Trip" : "Trips")}
          {stat(user.review_count, user.review_count === 1 ? "Review" : "Reviews")}
          {stat(yearsSince(user.joined_at), "Years on Airbnb")}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Link href="/trips" className="flex flex-col items-center gap-4 rounded-3xl p-6 shadow-[0_6px_24px_rgba(0,0,0,0.1)]">
          {lastPast ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img(lastPast.listing.photos[0]?.url ?? "", 300)} alt="" className="h-24 w-24 rotate-[-4deg] rounded-xl border-4 border-white object-cover shadow-md" />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center text-5xl">🧳</span>
          )}
          <span className="text-lg font-medium">Past trips</span>
        </Link>
        <Link href="/wishlists" className="flex flex-col items-center gap-4 rounded-3xl p-6 shadow-[0_6px_24px_rgba(0,0,0,0.1)]">
          <span className="flex h-24 w-24 items-center justify-center rounded-xl bg-[#fff0f3]"><Heart size={44} className="fill-rausch text-rausch" /></span>
          <span className="text-lg font-medium">Wishlists</span>
        </Link>
      </div>

      <div className="mt-8">
        {row(<Settings size={24} strokeWidth={1.5} />, "Account settings", { href: "/coming-soon?f=Account settings" })}
        {row(<CircleHelp size={24} strokeWidth={1.5} />, "Get help", { href: "/coming-soon?f=Help Centre" })}
        {row(<UserRoundCog size={24} strokeWidth={1.5} />, "Switch user", { onClick: () => setLoginOpen(true) })}
        {row(<LogOut size={24} strokeWidth={1.5} />, "Log out", { onClick: logout })}
      </div>

      <SwitchPill to="hosting" />
    </main>
  );
}

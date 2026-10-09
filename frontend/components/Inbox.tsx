"use client";

import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { img } from "@/lib/api";
import { dateRange, toISO } from "@/lib/format";
import type { Booking, Message, Thread } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useUser } from "@/lib/user";
import { Avatar } from "./Header";
import LoginPrompt from "./LoginPrompt";

type Role = "guest" | "host";
const base = (role: Role) => (role === "guest" ? "/messages" : "/hosting/messages");

export function linkify(text: string) {
  return text.split(/(https?:\/\/\S+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noreferrer" className="font-semibold underline">Open in Maps</a>
    ) : (
      part
    ),
  );
}

function when(iso: string) {
  const d = new Date(iso);
  return toISO(d) === toISO(new Date())
    ? d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function stayLabel(b: Booking) {
  const today = toISO(new Date());
  const state = b.check_out <= today ? "Past" : b.check_in <= today ? "Currently staying" : "Upcoming";
  return `${state} · ${dateRange(b.check_in, b.check_out)}`;
}

export function ThreadList({ role }: { role: Role }) {
  const { user, ready } = useUser();
  const { data, loading } = useApi<Thread[]>(user ? `/bookings/inbox?role=${role}` : null);
  if (!ready) return null;
  if (!user) return <LoginPrompt title="Messages" text="Your conversations with hosts appear here after you book." />;

  return (
    <main className="mx-auto max-w-3xl px-6 pb-28 pt-10">
      <h1 className="mb-8 text-[32px] font-semibold">Messages</h1>
      {loading && !data && <div className="h-40 animate-pulse rounded-2xl bg-soft" />}
      {data?.length === 0 && (
        <div className="py-16 text-center">
          <h2 className="text-lg font-semibold">You don&apos;t have any messages</h2>
          <p className="mt-1 text-muted">
            {role === "guest" ? "When you book a trip, your host's messages will appear here." : "Messages to your guests appear here once they book."}
          </p>
        </div>
      )}
      <ul className="divide-y divide-line">
        {data?.map(({ booking: b, last, count }) => {
          const other = role === "guest" ? b.listing.host : b.guest;
          return (
            <li key={b.id}>
              <Link href={`${base(role)}/${b.id}`} className="-mx-3 flex gap-4 rounded-xl px-3 py-4 hover:bg-soft">
                <span className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img(b.listing.photos[0]?.url ?? "", 200)} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  <span className="absolute -bottom-1.5 -right-1.5 rounded-full ring-2 ring-white">
                    <Avatar src={other.avatar_url} name={other.name} size={28} />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2">
                    <span className="truncate font-semibold">{role === "guest" ? other.name.split(" ")[0] : other.name}</span>
                    <span className="shrink-0 text-xs text-muted">{when(last.send_at)}</span>
                  </span>
                  <span className="block truncate text-sm">{role === "host" && "You: "}{last.title}{count > 1 && ` (+${count - 1})`}</span>
                  <span className="block truncate text-sm text-muted">{stayLabel(b)} · {b.listing.city}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

/** Bubbles only; used by the thread page and the trip page. Host-sent messages sit right when you are the host. */
export function MessageBubbles({ booking, role, messages }: { booking: Booking; role: Role; messages: Message[] }) {
  const host = booking.listing.host;
  const mine = role === "host";
  return (
    <div className="space-y-6">
      {messages.map((m) => (
        <div key={m.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
          {!mine && <Avatar src={host.avatar_url} name={host.name} size={36} />}
          <div className={`max-w-[85%] ${mine ? "text-right" : ""}`}>
            <div className="mb-1 text-xs text-muted">
              {mine ? "You" : host.name.split(" ")[0]} · {new Date(m.send_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · Scheduled
            </div>
            <div className={`inline-block rounded-2xl p-4 text-left ${mine ? "rounded-tr-sm bg-ink text-white" : "rounded-tl-sm bg-soft"}`}>
              <div className="mb-1.5 font-semibold">{m.title}</div>
              <p className="whitespace-pre-line text-[15px] leading-relaxed">{linkify(m.body)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ThreadView({ bookingId, role }: { bookingId: string; role: Role }) {
  const router = useRouter();
  const { user, ready } = useUser();
  const { data: booking, error } = useApi<Booking>(user ? `/bookings/${bookingId}` : null);
  const { data: messages } = useApi<Message[]>(user ? `/bookings/${bookingId}/messages` : null);

  if (ready && !user) return <LoginPrompt title="Messages" text="Log in to read this conversation." />;
  if (error) return <p className="p-20 text-center">{error}</p>;
  if (!booking) return <div className="mx-auto mt-10 h-96 max-w-3xl animate-pulse rounded-xl bg-soft" />;
  const other = role === "guest" ? booking.listing.host : booking.guest;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-81px)] max-w-3xl flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-white px-4 py-3 md:top-20">
        <button onClick={() => router.push(base(role))} aria-label="Back" className="rounded-full p-2 hover:bg-soft"><ArrowLeft size={20} /></button>
        <Avatar src={other.avatar_url} name={other.name} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{other.name}</div>
          <div className="truncate text-xs text-muted">{stayLabel(booking)} · {booking.listing.title}</div>
        </div>
        <Link href={role === "guest" ? `/trips/${booking.id}` : `/rooms/${booking.listing.id}`} className="rounded-full border border-line px-4 py-1.5 text-sm font-semibold hover:border-ink">
          Details
        </Link>
      </div>
      <div className="flex-1 px-6 py-8">
        {messages && messages.length === 0 && <p className="text-center text-muted">No messages yet.</p>}
        {messages && <MessageBubbles booking={booking} role={role} messages={messages} />}
      </div>
      <div className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-white px-4 py-3">
        <input disabled placeholder="Replying is coming soon" className="flex-1 rounded-full border border-line bg-soft px-5 py-3 text-sm" />
        <button disabled aria-label="Send" className="rounded-full bg-line p-3 text-white"><Send size={18} /></button>
      </div>
    </main>
  );
}

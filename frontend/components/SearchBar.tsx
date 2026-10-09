"use client";

import { MapPin, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { qs } from "@/lib/api";
import { plural, shortDate } from "@/lib/format";
import Counter from "./Counter";
import RangeCalendar from "./RangeCalendar";

export const DESTINATIONS = [
  { name: "Goa", sub: "For its beaches and nightlife" },
  { name: "Manali", sub: "For snow peaks and pine forests" },
  { name: "Jaipur", sub: "For forts and heritage havelis" },
  { name: "Udaipur", sub: "For lake palaces" },
  { name: "Kerala", sub: "For backwaters and tea gardens" },
  { name: "Rishikesh", sub: "For yoga and the Ganga" },
  { name: "Coorg", sub: "Popular coffee-country getaway", q: "Madikeri" },
  { name: "Lonavala", sub: "Weekend escape from Mumbai" },
  { name: "Mumbai", sub: "For city lights" },
];

type Panel = "where" | "dates" | "who" | null;

/** Where / When / Who. Writes the search into the URL; the explore page reads it from there. */
export default function SearchBar({ onDone, stacked = false }: { onDone?: () => void; stacked?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [location, setLocation] = useState(params.get("location") ?? "");
  const [checkIn, setCheckIn] = useState<string | null>(params.get("check_in"));
  const [checkOut, setCheckOut] = useState<string | null>(params.get("check_out"));
  const [adults, setAdults] = useState(Number(params.get("guests") ?? 0));
  const [children, setChildren] = useState(0);
  const [panel, setPanel] = useState<Panel>(stacked ? "where" : null);
  const ref = useRef<HTMLDivElement>(null);
  const guests = adults + children;

  useEffect(() => {
    if (stacked) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setPanel(null);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [stacked]);

  const submit = () => {
    const keep = Object.fromEntries(params.entries()); // keep category/filters, replace the search fields
    router.push(`/?${qs({ ...keep, location: location.trim(), check_in: checkOut ? checkIn : null, check_out: checkOut, guests: guests || null })}`);
    setPanel(null);
    onDone?.();
  };

  const setGuests = (a: number, c: number) => {
    setAdults(c > 0 && a === 0 ? 1 : a); // children need an adult, like Airbnb
    setChildren(c);
  };

  const suggestions = DESTINATIONS.filter((d) => d.name.toLowerCase().includes(location.toLowerCase()));

  const whereBody = (
    <div className="py-2">
      <p className="px-4 pb-2 text-xs font-semibold">Suggested destinations</p>
      {suggestions.map((d) => (
        <button
          key={d.name}
          onClick={() => {
            setLocation(d.q ?? d.name);
            setPanel("dates");
          }}
          className="flex w-full items-center gap-4 rounded-xl px-4 py-2 text-left hover:bg-soft"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-soft">
            <MapPin size={20} />
          </span>
          <span>
            <span className="block">{d.name}</span>
            <span className="block text-sm text-muted">{d.sub}</span>
          </span>
        </button>
      ))}
    </div>
  );
  const datesBody = (
    <div className="flex justify-center p-4">
      <RangeCalendar
        checkIn={checkIn}
        checkOut={checkOut}
        months={stacked ? 1 : 2}
        onChange={(a, b) => {
          setCheckIn(a);
          setCheckOut(b);
          if (b && !stacked) setPanel("who");
        }}
      />
    </div>
  );
  const whoBody = (
    <div className="divide-y divide-line px-6">
      <Counter label="Adults" sub="Ages 13 or above" value={adults} max={16 - children} onChange={(v) => setGuests(v, children)} />
      <Counter label="Children" sub="Ages 2–12" value={children} max={16 - adults} onChange={(v) => setGuests(adults, v)} />
    </div>
  );

  if (stacked) {
    const card = (p: Panel, label: string, value: string, body: React.ReactNode) => (
      <div className="rounded-2xl bg-white shadow-card">
        {panel === p ? (
          <div className="p-4">
            <h3 className="px-2 pb-2 text-2xl font-bold">{label}</h3>
            {p === "where" && (
              <input
                autoFocus
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Search destinations"
                className="mb-2 w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-ink"
              />
            )}
            {body}
          </div>
        ) : (
          <button onClick={() => setPanel(p)} className="flex w-full justify-between p-5 text-sm">
            <span className="text-muted">{label}</span>
            <span className="font-semibold">{value}</span>
          </button>
        )}
      </div>
    );
    return (
      <div className="flex flex-col gap-3">
        {card("where", "Where to?", location || "I'm flexible", whereBody)}
        {card("dates", "When's your trip?", checkIn && checkOut ? `${shortDate(checkIn)} – ${shortDate(checkOut)}` : "Add dates", datesBody)}
        {card("who", "Who's coming?", guests ? plural(guests, "guest") : "Add guests", whoBody)}
        <button onClick={submit} className="btn-brand mt-2 flex items-center justify-center gap-2 py-3.5">
          <Search size={18} strokeWidth={3} /> Search
        </button>
      </div>
    );
  }

  const seg = (p: Panel) =>
    `relative flex-1 cursor-pointer rounded-full px-8 py-3.5 text-left transition-colors ${
      panel === p ? "bg-white shadow-card" : "hover:bg-[#ebebeb]"
    }`;

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[850px]">
      <div className={`flex items-center rounded-full border border-line shadow-pill ${panel ? "bg-[#ebebeb]" : "bg-white"}`}>
        <label className={`${seg("where")} flex-[1.4]`} onClick={() => setPanel("where")}>
          <div className="text-xs font-semibold">Where</div>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Search destinations"
            className="w-full truncate bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </label>
        <div className={seg("dates")} onClick={() => setPanel("dates")}>
          <div className="text-xs font-semibold">Check in</div>
          <div className={`text-sm ${checkIn ? "" : "text-muted"}`}>{checkIn ? shortDate(checkIn) : "Add dates"}</div>
        </div>
        <div className={seg("dates")} onClick={() => setPanel("dates")}>
          <div className="text-xs font-semibold">Check out</div>
          <div className={`text-sm ${checkOut ? "" : "text-muted"}`}>{checkOut ? shortDate(checkOut) : "Add dates"}</div>
        </div>
        <div className={`${seg("who")} flex items-center justify-between !py-2 !pr-2`} onClick={() => setPanel("who")}>
          <div>
            <div className="text-xs font-semibold">Who</div>
            <div className={`text-sm ${guests ? "" : "text-muted"}`}>{guests ? plural(guests, "guest") : "Add guests"}</div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              submit();
            }}
            className="btn-brand flex h-12 items-center gap-2 !rounded-full px-4"
            aria-label="Search"
          >
            <Search size={16} strokeWidth={3} />
            {panel && <span>Search</span>}
          </button>
        </div>
      </div>

      {panel && (
        <div
          className={`absolute top-[calc(100%+12px)] z-50 overflow-hidden rounded-[32px] bg-white py-4 shadow-[0_3px_12px_rgba(0,0,0,0.15)] ${
            panel === "where" ? "left-0 w-[420px]" : panel === "who" ? "right-0 w-[400px]" : "left-0 right-0"
          }`}
        >
          {panel === "where" ? whereBody : panel === "dates" ? datesBody : whoBody}
        </div>
      )}
    </div>
  );
}

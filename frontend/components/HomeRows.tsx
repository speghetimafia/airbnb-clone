"use client";

import { ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import { img } from "@/lib/api";
import { money } from "@/lib/format";
import { useRecent } from "@/lib/recent";
import type { ListingCard, Page } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { HeartButton } from "./ListingCard";

const ROWS = [
  { title: "Popular homes in Goa", sub: "Beaches, cafés and sunsets", location: "Goa" },
  { title: "Stay in Himachal Pradesh", sub: "Mountain cabins and apple orchards", location: "Himachal" },
  { title: "Homes in Rajasthan", sub: "Havelis, forts and desert camps", location: "Rajasthan" },
  { title: "Available in Kerala", sub: "Backwaters and tea gardens", location: "Kerala" },
  { title: "Weekend getaways in Maharashtra", sub: "Easy escapes from Mumbai and Pune", location: "Maharashtra" },
  { title: "Stay in Uttarakhand", sub: "Rivers, yoga and hill towns", location: "Uttarakhand" },
  { title: "Explore Karnataka", sub: "Coffee estates and ancient ruins", location: "Karnataka" },
];

function RowCard({ l, small }: { l: ListingCard; small?: boolean }) {
  const favourite = l.rating && l.rating >= 4.7 && l.review_count >= 3;
  return (
    <Link href={`/rooms/${l.id}`} className={`block shrink-0 snap-start ${small ? "w-[42%] sm:w-[200px]" : "w-[46%] sm:w-[250px]"}`}>
      <div className="relative aspect-square overflow-hidden rounded-[20px] bg-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(l.photos[0], 500)} alt={l.title} loading="lazy" className="h-full w-full object-cover" />
        {favourite && !small && <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold shadow">Guest favourite</span>}
        <HeartButton id={l.id} className="absolute right-3 top-3" />
      </div>
      <div className="mt-2 text-[15px] leading-snug">
        <div className="truncate font-medium">{small ? l.city : `${l.property_type} in ${l.city}`}</div>
        <div className="truncate text-sm text-muted">
          {small ? l.property_type : `${money(l.base_price)} night`}
          {l.rating ? (
            <> · <Star size={11} className="inline -translate-y-px fill-muted text-muted" /> {l.rating.toFixed(2)}</>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function Row({ title, sub, href, children }: { title: string; sub?: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold leading-tight">{title}</h2>
          {sub && <p className="text-sm text-muted">{sub}</p>}
        </div>
        {href && (
          <Link href={href} aria-label={`See all: ${title}`} className="rounded-full bg-soft p-2.5 hover:bg-line">
            <ArrowRight size={18} />
          </Link>
        )}
      </div>
      <div className="no-scrollbar -mx-6 flex snap-x gap-4 overflow-x-auto scroll-px-6 px-6 xl:-mx-20 xl:scroll-px-20 xl:px-20">{children}</div>
    </section>
  );
}

function DestinationRow({ title, sub, location }: (typeof ROWS)[number]) {
  const { data } = useApi<Page>(`/listings?location=${encodeURIComponent(location)}&page_size=10`);
  if (data && !data.items.length) return null;
  return (
    <Row title={title} sub={sub} href={`/?location=${encodeURIComponent(location)}`}>
      {data
        ? data.items.map((l) => <RowCard key={l.id} l={l} />)
        : Array.from({ length: 5 }, (_, i) => <div key={i} className="aspect-square w-[46%] shrink-0 animate-pulse rounded-[20px] bg-soft sm:w-[250px]" />)}
    </Row>
  );
}

/** Explore before any search: "Recently viewed" plus curated destination rows, like the app. */
export default function HomeRows() {
  const viewed = useRecent();

  return (
    <div className="mx-auto max-w-[1760px] px-6 pt-6 xl:px-20">
      {viewed.length > 0 && (
        <Row title="Recently viewed">
          {viewed.map((l) => <RowCard key={l.id} l={l} small />)}
        </Row>
      )}
      {ROWS.map((r) => <DestinationRow key={r.location} {...r} />)}
    </div>
  );
}

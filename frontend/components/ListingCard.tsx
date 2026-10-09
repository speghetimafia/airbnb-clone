"use client";

import { ChevronLeft, ChevronRight, Heart, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { img } from "@/lib/api";
import { money, nightsBetween } from "@/lib/format";
import type { ListingCard as Card } from "@/lib/types";
import { useUser } from "@/lib/user";

export function HeartButton({ id, className = "" }: { id: number; className?: string }) {
  const { saved, toggleSaved } = useUser();
  const on = saved.has(id);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSaved(id);
      }}
      aria-label={on ? "Remove from wishlist" : "Save to wishlist"}
      className={`transition-transform active:scale-90 ${className}`}
    >
      <Heart size={24} strokeWidth={2} className={`drop-shadow ${on ? "fill-rausch text-white" : "fill-black/50 text-white"}`} />
    </button>
  );
}

type Props = { listing: Card; checkIn?: string | null; checkOut?: string | null; onHover?: (id: number | null) => void };

export default function ListingCard({ listing: l, checkIn, checkOut, onHover }: Props) {
  const [i, setI] = useState(0);
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const href = `/rooms/${l.id}${checkIn && checkOut ? `?check_in=${checkIn}&check_out=${checkOut}` : ""}`;
  const step = (d: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setI((i + d + l.photos.length) % l.photos.length);
  };

  return (
    <Link href={href} className="group block" onMouseEnter={() => onHover?.(l.id)} onMouseLeave={() => onHover?.(null)}>
      <div className="relative aspect-[20/19] overflow-hidden rounded-xl bg-soft">
        <div className="flex h-full transition-transform duration-300" style={{ transform: `translateX(-${i * 100}%)` }}>
          {l.photos.map((p, n) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={n} src={img(p)} alt={n === 0 ? l.title : ""} loading="lazy" className="h-full w-full shrink-0 object-cover" />
          ))}
        </div>
        {l.rating && l.rating >= 4.7 && l.review_count >= 3 && (
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow">Guest favourite</span>
        )}
        <HeartButton id={l.id} className="absolute right-3 top-3" />
        {l.photos.length > 1 && (
          <>
            {i > 0 && (
              <button onClick={step(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow hover:scale-105 group-hover:block">
                <ChevronLeft size={14} strokeWidth={3} />
              </button>
            )}
            {i < l.photos.length - 1 && (
              <button onClick={step(1)} aria-label="Next photo" className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow hover:scale-105 group-hover:block">
                <ChevronRight size={14} strokeWidth={3} />
              </button>
            )}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
              {l.photos.map((_, n) => (
                <span key={n} className={`h-1.5 w-1.5 rounded-full ${n === i ? "bg-white" : "bg-white/60"}`} />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="mt-3 text-[15px]">
        <div className="flex justify-between gap-2">
          <h3 className="truncate font-semibold">
            {l.property_type} in {l.city}
          </h3>
          {l.rating ? (
            <span className="flex shrink-0 items-center gap-1">
              <Star size={12} className="fill-ink" /> {l.rating.toFixed(2)}
            </span>
          ) : (
            <span className="shrink-0">★ New</span>
          )}
        </div>
        <p className="truncate text-muted">{l.title}</p>
        <p className="text-muted">{l.state}</p>
        <p className="mt-1">
          {l.stay_total && nights ? (
            <>
              <span className="font-semibold underline">{money(l.stay_total)}</span> for {nights} night{nights > 1 ? "s" : ""}
            </>
          ) : (
            <>
              <span className="font-semibold">{money(l.base_price)}</span> night
            </>
          )}
        </p>
      </div>
    </Link>
  );
}

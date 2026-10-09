"use client";

import { List, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import HomeRows from "@/components/HomeRows";
import FiltersModal, { countFilters, type Filters } from "@/components/FiltersModal";
import Footer from "@/components/Footer";
import { CATEGORIES } from "@/components/icons";
import ListingCard from "@/components/ListingCard";
import { api, qs } from "@/lib/api";
import type { ListingCard as Card, Page } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-soft" />,
});

const PAGE_SIZE = 20;

function filtersFrom(p: URLSearchParams): Filters {
  const csv = (k: string) => (p.get(k) ? p.get(k)!.split(",") : []);
  return {
    min_price: p.get("min_price") ?? "",
    max_price: p.get("max_price") ?? "",
    property_type: csv("property_type"),
    bedrooms: Number(p.get("bedrooms") ?? 0),
    beds: Number(p.get("beds") ?? 0),
    amenities: csv("amenities").map(Number),
  };
}

function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[20/19] rounded-xl bg-[#ebebeb]" />
      <div className="mt-3 h-4 w-3/4 rounded bg-[#ebebeb]" />
      <div className="mt-2 h-4 w-1/2 rounded bg-[#ebebeb]" />
    </div>
  );
}

function Explore() {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.toString();
  const homeMode = query === ""; // bare home page shows curated rows; any search or filter shows the grid
  const category = params.get("category");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filters = useMemo(() => filtersFrom(params), [query]);
  const nFilters = countFilters(filters);

  const [items, setItems] = useState<Card[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  // New search → reset to page 1 (adjusting state during render, not in an effect).
  const [lastQuery, setLastQuery] = useState(query);
  if (query !== lastQuery) {
    setLastQuery(query);
    setItems([]);
    setPage(1);
  }
  const fetchKey = `${query}|${page}`;
  const loading = loadedKey !== fetchKey;

  useEffect(() => {
    if (homeMode) return;
    let cancelled = false;
    api<Page>(`/listings?${query}${query ? "&" : ""}${qs({ page, page_size: PAGE_SIZE })}`)
      .then((res) => {
        if (cancelled) return;
        setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
        setPages(res.pages);
        setTotal(res.total);
        setError(null);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoadedKey(`${query}|${page}`));
    return () => {
      cancelled = true;
    };
  }, [query, page, homeMode]);

  // Infinite scroll: load the next page when the sentinel scrolls into view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || loading || page >= pages) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setPage((p) => p + 1), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loading, page, pages]);

  const setParams = (patch: Record<string, string | number | null>) => {
    const next = { ...Object.fromEntries(params.entries()), ...patch };
    router.push(`/?${qs(next)}`, { scroll: false });
  };

  const applyFilters = (f: Filters) => {
    setFiltersOpen(false);
    setParams({
      min_price: f.min_price || null,
      max_price: f.max_price || null,
      property_type: f.property_type.join(",") || null,
      bedrooms: f.bedrooms || null,
      beds: f.beds || null,
      amenities: f.amenities.join(",") || null,
    });
  };

  const checkIn = params.get("check_in");
  const checkOut = params.get("check_out");
  const location = params.get("location");

  return (
    <>
      {/* App-style mode chips (phones, home only) */}
      {homeMode && (
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-3 md:hidden">
          {[
            { label: "All", icon: "🌍", href: "/" },
            { label: "Homes", icon: "🏠", href: "/?view=homes" },
            {
              label: "Experiences",
              icon: "🎈",
              href: "/coming-soon?f=Experiences",
            },
            { label: "Services", icon: "🛎️", href: "/coming-soon?f=Services" },
          ].map((c, i) => (
            <Link
              key={c.label}
              href={c.href}
              className={`flex shrink-0 items-center gap-2 rounded-full px-5 py-3 text-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.12)] ${i === 0 ? "bg-[#ebebeb] font-semibold" : "bg-white"}`}
            >
              <span className="text-xl">{c.icon}</span> {c.label}
            </Link>
          ))}
        </div>
      )}

      {/* Category row */}
      <div
        className={`sticky top-[85px] z-[300] ${homeMode ? "hidden md:block" : ""} bg-white pt-2.5 shadow-[0_1px_0_#ebebeb] md:top-20 md:pt-3`}
      >
        <div className="mx-auto flex max-w-[1760px] items-center gap-4 px-4 md:gap-6 md:px-6 xl:px-20">
          <div className="no-scrollbar flex flex-1 gap-8 overflow-x-auto">
            {CATEGORIES.map(({ name, icon: Icon }) => {
              const active = category === name;
              return (
                <button
                  key={name}
                  onClick={() => setParams({ category: active ? null : name })}
                  className={`flex shrink-0 flex-col items-center gap-2 border-b-2 pb-3 text-xs font-semibold transition-colors ${
                    active ? "border-ink text-ink" : "border-transparent text-muted hover:border-line hover:text-ink"
                  }`}
                >
                  <Icon size={24} strokeWidth={1.6} />
                  {name}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setFiltersOpen(true)}
            className={`mb-3 hidden shrink-0 items-center gap-2 rounded-xl border px-4 py-3.5 text-xs font-semibold md:flex ${nFilters ? "border-ink bg-soft" : "border-line hover:border-ink"}`}
          >
            <SlidersHorizontal size={16} /> Filters
            {nFilters > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] text-white">{nFilters}</span>
            )}
          </button>
        </div>
      </div>

      {homeMode ? (
        <HomeRows />
      ) : (
        <main className={`mx-auto max-w-[1760px] ${showMap ? "lg:flex" : ""}`}>
          <section className={`px-6 pt-6 xl:px-20 ${showMap ? "lg:w-[58%] lg:!px-6 xl:!pl-20" : ""} ${showMap ? "hidden md:block" : ""}`}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold">
                {total === null ? " " : `${total > 0 ? `${total} homes` : "No homes"}${location ? ` in ${location}` : ""}`}
              </p>
              <button
                onClick={() => setFiltersOpen(true)}
                className="flex items-center gap-2 rounded-full border border-line px-3 py-2 text-xs font-semibold md:hidden"
              >
                <SlidersHorizontal size={14} /> Filters {nFilters > 0 && `(${nFilters})`}
              </button>
            </div>

            {error && <p className="rounded-xl bg-[#fff8f6] p-4 text-sm text-[#c13515]">Couldn&apos;t load homes: {error}</p>}

            {!loading && total === 0 && (
              <div className="py-20 text-center">
                <h2 className="text-2xl font-semibold">No exact matches</h2>
                <p className="mt-2 text-muted">Try changing or removing some of your filters or adjusting your search area.</p>
                <button onClick={() => router.push("/")} className="mt-6 rounded-lg border border-ink px-6 py-3 font-semibold">
                  Remove all filters
                </button>
              </div>
            )}

            <div
              className={`grid gap-x-6 gap-y-10 sm:grid-cols-2 ${showMap ? "xl:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"}`}
            >
              {items.map((l) => (
                <ListingCard key={l.id} listing={l} checkIn={checkIn} checkOut={checkOut} onHover={setHovered} />
              ))}
              {loading && Array.from({ length: page === 1 ? 10 : 5 }, (_, i) => <CardSkeleton key={i} />)}
            </div>
            <div ref={sentinel} className="h-px" />
            {!loading && page >= pages && items.length > 0 && (
              <p className="py-10 text-center text-sm text-muted">You&apos;ve seen all {total} homes</p>
            )}
          </section>

          {showMap && (
            <aside className="fixed inset-x-0 bottom-0 top-[140px] z-[200] md:top-[165px] lg:sticky lg:top-[165px] lg:h-[calc(100vh-165px)] lg:flex-1">
              <MapView listings={items} activeId={hovered} />
            </aside>
          )}
        </main>
      )}

      {!homeMode && (
        <button
          onClick={() => setShowMap(!showMap)}
          className="fixed bottom-24 left-1/2 z-[450] flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3.5 text-sm font-semibold text-white shadow-card transition-transform hover:scale-105 md:bottom-12"
        >
          {showMap ? (
            <>
              Show list <List size={16} />
            </>
          ) : (
            <>
              Show map <MapIcon size={16} />
            </>
          )}
        </button>
      )}

      {filtersOpen && <FiltersModal onClose={() => setFiltersOpen(false)} value={filters} onApply={applyFilters} />}
      {!showMap && <Footer />}
    </>
  );
}

export default function Home() {
  return (
    <Suspense>
      <Explore />
    </Suspense>
  );
}

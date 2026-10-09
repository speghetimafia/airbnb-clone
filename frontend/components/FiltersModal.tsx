"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Amenity } from "@/lib/types";
import Counter from "./Counter";
import { AmenityIcon, PROPERTY_TYPES } from "./icons";
import Modal from "./Modal";

export type Filters = {
  min_price: string;
  max_price: string;
  property_type: string[];
  bedrooms: number;
  beds: number;
  amenities: number[];
};

const EMPTY_FILTERS: Filters = { min_price: "", max_price: "", property_type: [], bedrooms: 0, beds: 0, amenities: [] };

export const countFilters = (f: Filters) =>
  (f.min_price || f.max_price ? 1 : 0) + f.property_type.length + (f.bedrooms ? 1 : 0) + (f.beds ? 1 : 0) + f.amenities.length;

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Mount only while open (`{open && <FiltersModal/>}`) so it starts from the current filters. */
type Props = { onClose: () => void; value: Filters; onApply: (f: Filters) => void };

export default function FiltersModal({ onClose, value, onApply }: Props) {
  const [f, setF] = useState(value);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  useEffect(() => {
    api<Amenity[]>("/amenities").then(setAmenities).catch(() => {});
  }, []);

  const section = "border-b border-line py-8 first:pt-0 last:border-0";
  const input = "w-full rounded-xl border border-[#b0b0b0] px-4 pb-2 pt-6 outline-none focus:border-ink focus:ring-1 focus:ring-ink";

  return (
    <Modal
      open
      onClose={onClose}
      title="Filters"
      size="lg"
      footer={
        <div className="flex items-center justify-between">
          <button onClick={() => setF(EMPTY_FILTERS)} className="font-semibold underline">Clear all</button>
          <button onClick={() => onApply(f)} className="rounded-lg bg-ink px-6 py-3.5 font-semibold text-white hover:bg-black">
            Show places
          </button>
        </div>
      }
    >
      <div className={section}>
        <h3 className="text-[22px] font-semibold">Price range</h3>
        <p className="mb-6 text-sm text-muted">Nightly prices before fees and taxes</p>
        <div className="flex items-center gap-4">
          <label className="relative flex-1">
            <span className="absolute left-4 top-2 text-xs text-muted">Minimum (₹)</span>
            <input type="number" min={0} value={f.min_price} onChange={(e) => setF({ ...f, min_price: e.target.value })} className={input} placeholder="0" />
          </label>
          <span>—</span>
          <label className="relative flex-1">
            <span className="absolute left-4 top-2 text-xs text-muted">Maximum (₹)</span>
            <input type="number" min={0} value={f.max_price} onChange={(e) => setF({ ...f, max_price: e.target.value })} className={input} placeholder="Any" />
          </label>
        </div>
      </div>

      <div className={section}>
        <h3 className="mb-4 text-[22px] font-semibold">Rooms and beds</h3>
        <Counter label="Bedrooms" value={f.bedrooms} max={10} onChange={(v) => setF({ ...f, bedrooms: v })} />
        <Counter label="Beds" value={f.beds} max={16} onChange={(v) => setF({ ...f, beds: v })} />
      </div>

      <div className={section}>
        <h3 className="mb-4 text-[22px] font-semibold">Property type</h3>
        <div className="flex flex-wrap gap-3">
          {PROPERTY_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setF({ ...f, property_type: toggle(f.property_type, t) })}
              className={`rounded-full border px-5 py-2.5 text-sm ${f.property_type.includes(t) ? "border-ink bg-soft font-semibold ring-1 ring-ink" : "border-line hover:border-ink"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className={section}>
        <h3 className="mb-4 text-[22px] font-semibold">Amenities</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(showAllAmenities ? amenities : amenities.slice(0, 9)).map((a) => (
            <button
              key={a.id}
              onClick={() => setF({ ...f, amenities: toggle(f.amenities, a.id) })}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm ${f.amenities.includes(a.id) ? "border-ink bg-soft ring-1 ring-ink" : "border-line hover:border-ink"}`}
            >
              <AmenityIcon icon={a.icon} size={22} />
              {a.name}
            </button>
          ))}
        </div>
        {amenities.length > 9 && (
          <button onClick={() => setShowAllAmenities(!showAllAmenities)} className="mt-4 font-semibold underline">
            {showAllAmenities ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </Modal>
  );
}

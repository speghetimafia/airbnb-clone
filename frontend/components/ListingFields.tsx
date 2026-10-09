"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, img } from "@/lib/api";
import type { Amenity, ListingDetail, ListingInput } from "@/lib/types";
import Counter from "./Counter";
import { AmenityIcon, CATEGORIES, PROPERTY_TYPES } from "./icons";

const PinMap = dynamic(() => import("./MapView").then((m) => m.PinMap), { ssr: false });

export const BLANK: ListingInput = {
  title: "", description: "", property_type: "House", category: "Trending", city: "", state: "", address: "",
  lat: 15.4989, lng: 73.8278, max_guests: 2, bedrooms: 1, beds: 1, baths: 1, base_price: 3000, weekend_price: null,
  cleaning_fee: 500, weekly_discount_pct: 0, monthly_discount_pct: 0, min_nights: 1, max_nights: 30,
  check_in_time: "14:00", check_out_time: "11:00", advance_notice_days: 0, availability_window_days: 365, is_listed: true,
  photo_urls: [], amenity_ids: [],
};

export function toInput(l: ListingDetail): ListingInput {
  const picked = Object.fromEntries(Object.keys(BLANK).map((k) => [k, l[k as keyof ListingDetail]])) as unknown as ListingInput;
  return { ...picked, photo_urls: l.photos.map((p) => p.url), amenity_ids: l.amenities.map((a) => a.id) };
}

// ---- Field groups shared by the step-by-step create flow and the listing editor. ----

export type Fields = { f: ListingInput; set: <K extends keyof ListingInput>(k: K, v: ListingInput[K]) => void };

export const inputCls = "w-full rounded-lg border border-[#b0b0b0] px-4 py-3 outline-none focus:border-ink focus:ring-1 focus:ring-ink";
export const labelCls = "mb-1 block text-sm font-semibold";
const num = (v: string) => (v === "" ? 0 : Number(v));

export const NOTICE_OPTIONS = [0, 1, 2, 3, 7];
export const noticeLabel = (d: number) => (d === 0 ? "Same day" : `At least ${d} day${d > 1 ? "s" : ""}`);
export const WINDOW_OPTIONS = [90, 180, 270, 365, 730];
export const windowLabel = (d: number) => `${Math.round(d / 30.4)} months in advance`;

export function TypeFields({ f, set }: Fields) {
  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2">
      <div>
        <label className={labelCls}>Property type</label>
        <select className={inputCls} value={f.property_type} onChange={(e) => set("property_type", e.target.value)}>
          {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Category</label>
        <select className={inputCls} value={f.category} onChange={(e) => set("category", e.target.value)}>
          {CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}
        </select>
      </div>
    </div>
  );
}

export function LocationFields({ f, set }: Fields) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>Street address</label>
          <input className={inputCls} value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="House no., street, area" />
        </div>
        <div>
          <label className={labelCls}>City</label>
          <input className={inputCls} required value={f.city} onChange={(e) => set("city", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>State</label>
          <input className={inputCls} required value={f.state} onChange={(e) => set("state", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Latitude</label>
          <input className={inputCls} type="number" step="any" min={-90} max={90} required value={f.lat} onChange={(e) => set("lat", num(e.target.value))} />
        </div>
        <div>
          <label className={labelCls}>Longitude</label>
          <input className={inputCls} type="number" step="any" min={-180} max={180} required value={f.lng} onChange={(e) => set("lng", num(e.target.value))} />
        </div>
      </div>
      <div className="mt-6">
        <PinMap lat={f.lat} lng={f.lng} zoom={10} height={320} onPick={(lat, lng) => { set("lat", lat); set("lng", lng); }} />
      </div>
    </>
  );
}

export function RoomsFields({ f, set }: Fields) {
  return (
    <div className="divide-y divide-line">
      <Counter label="Guests" value={f.max_guests} min={1} max={50} onChange={(v) => set("max_guests", v)} />
      <Counter label="Bedrooms" value={f.bedrooms} min={0} max={50} onChange={(v) => set("bedrooms", v)} />
      <Counter label="Beds" value={f.beds} min={1} max={100} onChange={(v) => set("beds", v)} />
      <Counter label="Bathrooms" value={f.baths} min={0} max={50} onChange={(v) => set("baths", v)} />
    </div>
  );
}

export function PhotosField({ f, set, onUploading }: Fields & { onUploading?: (busy: boolean) => void }) {
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const urls = f.photo_urls;

  const addUrl = () => {
    try {
      new URL(photoUrl);
    } catch {
      return toast.error("Enter a valid image URL");
    }
    set("photo_urls", [...urls, photoUrl]);
    setPhotoUrl("");
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    onUploading?.(true);
    try {
      const added: string[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        added.push((await api<{ url: string }>("/uploads", { method: "POST", body })).url);
      }
      set("photo_urls", [...urls, ...added]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      onUploading?.(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {urls.map((u, i) => (
          <div key={u + i} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(u, 500)} alt="" className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-2 top-2 rounded-md bg-white px-2 py-1 text-xs font-semibold shadow">Cover photo</span>}
            <div className="absolute right-2 top-2 flex gap-1">
              {i > 0 && (
                <button type="button" onClick={() => set("photo_urls", [u, ...urls.filter((_, j) => j !== i)])} className="rounded-full bg-white px-2 py-1 text-xs font-semibold shadow">
                  Make cover
                </button>
              )}
              <button type="button" aria-label="Remove photo" onClick={() => set("photo_urls", urls.filter((_, j) => j !== i))} className="rounded-full bg-white p-1.5 shadow">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#b0b0b0] text-sm font-semibold hover:border-ink"
        >
          <ImagePlus size={28} strokeWidth={1.5} />
          {uploading ? "Uploading…" : "Upload photos"}
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} />
      <div className="mt-4 flex gap-2">
        <input
          className={inputCls}
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          placeholder="https://images.unsplash.com/…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
        />
        <button type="button" onClick={addUrl} className="shrink-0 rounded-lg border border-ink px-5 font-semibold hover:bg-soft">Add link</button>
      </div>
    </>
  );
}

export function AmenitiesField({ f, set }: Fields) {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  useEffect(() => {
    api<Amenity[]>("/amenities").then(setAmenities);
  }, []);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {amenities.map((a) => {
        const on = f.amenity_ids.includes(a.id);
        return (
          <button
            type="button"
            key={a.id}
            onClick={() => set("amenity_ids", on ? f.amenity_ids.filter((x) => x !== a.id) : [...f.amenity_ids, a.id])}
            className={`flex flex-col gap-2 rounded-xl border p-4 text-left text-sm font-semibold ${on ? "border-ink bg-soft ring-1 ring-ink" : "border-line hover:border-ink"}`}
          >
            <AmenityIcon icon={a.icon} size={28} /> {a.name}
          </button>
        );
      })}
    </div>
  );
}

export function DiscountFields({ f, set }: Fields) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className={labelCls}>Weekly discount (7+ nights, %)</label>
        <input className={inputCls} type="number" min={0} max={90} value={f.weekly_discount_pct} onChange={(e) => set("weekly_discount_pct", num(e.target.value))} />
      </div>
      <div>
        <label className={labelCls}>Monthly discount (28+ nights, %)</label>
        <input className={inputCls} type="number" min={0} max={90} value={f.monthly_discount_pct} onChange={(e) => set("monthly_discount_pct", num(e.target.value))} />
      </div>
    </div>
  );
}

export function AvailabilityFields({ f, set }: Fields) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className={labelCls}>Minimum nights</label>
        <input className={inputCls} type="number" min={1} max={1125} required value={f.min_nights} onChange={(e) => set("min_nights", num(e.target.value))} />
      </div>
      <div>
        <label className={labelCls}>Maximum nights</label>
        <input className={inputCls} type="number" min={1} max={1125} required value={f.max_nights} onChange={(e) => set("max_nights", num(e.target.value))} />
      </div>
      <div>
        <label className={labelCls}>Advance notice</label>
        <select className={inputCls} value={f.advance_notice_days} onChange={(e) => set("advance_notice_days", Number(e.target.value))}>
          {NOTICE_OPTIONS.map((d) => <option key={d} value={d}>{noticeLabel(d)}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Availability window</label>
        <select className={inputCls} value={f.availability_window_days} onChange={(e) => set("availability_window_days", Number(e.target.value))}>
          {WINDOW_OPTIONS.map((d) => <option key={d} value={d}>{windowLabel(d)}</option>)}
        </select>
      </div>
    </div>
  );
}

export function TimesFields({ f, set }: Fields) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className={labelCls}>Check-in from</label>
        <input className={inputCls} type="time" required value={f.check_in_time} onChange={(e) => set("check_in_time", e.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Checkout by</label>
        <input className={inputCls} type="time" required value={f.check_out_time} onChange={(e) => set("check_out_time", e.target.value)} />
      </div>
    </div>
  );
}

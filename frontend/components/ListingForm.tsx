"use client";

import { ArrowLeft, ImagePlus, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, img } from "@/lib/api";
import type { Amenity, ListingDetail, ListingInput } from "@/lib/types";
import Counter from "./Counter";
import { AmenityIcon, CATEGORIES, PROPERTY_TYPES } from "./icons";

const PinMap = dynamic(() => import("./MapView").then((m) => m.PinMap), { ssr: false });

const BLANK: ListingInput = {
  title: "", description: "", property_type: "House", category: "Trending", city: "", state: "", address: "",
  lat: 15.4989, lng: 73.8278, max_guests: 2, bedrooms: 1, beds: 1, baths: 1, base_price: 3000, weekend_price: null,
  cleaning_fee: 500, weekly_discount_pct: 0, monthly_discount_pct: 0, min_nights: 1, max_nights: 30,
  check_in_time: "14:00", check_out_time: "11:00", photo_urls: [], amenity_ids: [],
};

export function toInput(l: ListingDetail): ListingInput {
  const picked = Object.fromEntries(Object.keys(BLANK).map((k) => [k, l[k as keyof ListingDetail]])) as unknown as ListingInput;
  return { ...picked, photo_urls: l.photos.map((p) => p.url), amenity_ids: l.amenities.map((a) => a.id) };
}

type Props = { initial?: ListingInput; submitLabel: string; onSubmit: (data: ListingInput) => Promise<void>; onBack: () => void };

export default function ListingForm({ initial = BLANK, submitLabel, onSubmit, onBack }: Props) {
  const [f, setF] = useState<ListingInput>(initial);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<Amenity[]>("/amenities").then(setAmenities);
  }, []);

  const set = <K extends keyof ListingInput>(k: K, v: ListingInput[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const num = (k: keyof ListingInput) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, (e.target.value === "" ? 0 : Number(e.target.value)) as never);

  const addUrl = () => {
    try {
      new URL(photoUrl);
    } catch {
      return toast.error("Enter a valid image URL");
    }
    set("photo_urls", [...f.photo_urls, photoUrl]);
    setPhotoUrl("");
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        urls.push((await api<{ url: string }>("/uploads", { method: "POST", body })).url);
      }
      setF((prev) => ({ ...prev, photo_urls: [...prev.photo_urls, ...urls] }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.photo_urls.length) return toast.error("Add at least one photo");
    setSaving(true);
    try {
      await onSubmit({ ...f, weekend_price: f.weekend_price || null });
    } catch (err) {
      toast.error((err as Error).message);
      setSaving(false);
    }
  };

  const input = "w-full rounded-lg border border-[#b0b0b0] px-4 py-3 outline-none focus:border-ink focus:ring-1 focus:ring-ink";
  const label = "mb-1 block text-sm font-semibold";
  const section = "border-b border-line py-10";
  const h2 = "mb-1 text-[22px] font-semibold";
  const sub = "mb-6 text-muted";

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl px-6 pb-32 pt-8">
      <button type="button" onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-semibold hover:underline">
        <ArrowLeft size={16} /> Back
      </button>

      <section className={section}>
        <h2 className={h2}>Tell guests about your place</h2>
        <p className={sub}>Short titles work best. Have fun with it, you can always change it later.</p>
        <label className={label}>Title</label>
        <input className={input} required minLength={3} maxLength={200} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Sea-view cottage with a private garden" />
        <label className={`${label} mt-6`}>Description</label>
        <textarea className={input} required minLength={10} rows={6} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="What makes your place special?" />
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <label className={label}>Property type</label>
            <select className={input} value={f.property_type} onChange={(e) => set("property_type", e.target.value)}>
              {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Category</label>
            <select className={input} value={f.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className={section}>
        <h2 className={h2}>Where&apos;s your place located?</h2>
        <p className={sub}>Guests see the exact address only after they book. Click the map to drop the pin.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Street address</label>
            <input className={input} value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="House no., street, area" />
          </div>
          <div>
            <label className={label}>City</label>
            <input className={input} required value={f.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <label className={label}>State</label>
            <input className={input} required value={f.state} onChange={(e) => set("state", e.target.value)} />
          </div>
          <div>
            <label className={label}>Latitude</label>
            <input className={input} type="number" step="any" min={-90} max={90} required value={f.lat} onChange={num("lat")} />
          </div>
          <div>
            <label className={label}>Longitude</label>
            <input className={input} type="number" step="any" min={-180} max={180} required value={f.lng} onChange={num("lng")} />
          </div>
        </div>
        <div className="mt-6">
          <PinMap lat={f.lat} lng={f.lng} zoom={10} height={320} onPick={(lat, lng) => setF((p) => ({ ...p, lat, lng }))} />
        </div>
      </section>

      <section className={section}>
        <h2 className={h2}>Share some basics about your place</h2>
        <div className="divide-y divide-line">
          <Counter label="Guests" value={f.max_guests} min={1} max={50} onChange={(v) => set("max_guests", v)} />
          <Counter label="Bedrooms" value={f.bedrooms} min={0} max={50} onChange={(v) => set("bedrooms", v)} />
          <Counter label="Beds" value={f.beds} min={1} max={100} onChange={(v) => set("beds", v)} />
          <Counter label="Bathrooms" value={f.baths} min={0} max={50} onChange={(v) => set("baths", v)} />
        </div>
      </section>

      <section className={section}>
        <h2 className={h2}>Add some photos</h2>
        <p className={sub}>Upload images or paste image links. The first photo is your cover.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {f.photo_urls.map((u, i) => (
            <div key={u + i} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(u)} alt="" className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-2 top-2 rounded-md bg-white px-2 py-1 text-xs font-semibold shadow">Cover photo</span>}
              <div className="absolute right-2 top-2 flex gap-1">
                {i > 0 && (
                  <button type="button" onClick={() => set("photo_urls", [u, ...f.photo_urls.filter((_, j) => j !== i)])} className="rounded-full bg-white px-2 py-1 text-xs font-semibold shadow">
                    Make cover
                  </button>
                )}
                <button type="button" aria-label="Remove photo" onClick={() => set("photo_urls", f.photo_urls.filter((_, j) => j !== i))} className="rounded-full bg-white p-1.5 shadow">
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
          <input className={input} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://images.unsplash.com/…" onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }} />
          <button type="button" onClick={addUrl} className="shrink-0 rounded-lg border border-ink px-5 font-semibold hover:bg-soft">Add link</button>
        </div>
      </section>

      <section className={section}>
        <h2 className={h2}>Tell guests what your place has to offer</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
      </section>

      <section className={section}>
        <h2 className={h2}>Pricing</h2>
        <p className={sub}>Guests see a full breakdown. Airbnb adds a 14% guest service fee.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Nightly price (₹)</label>
            <input className={input} type="number" min={1} required value={f.base_price || ""} onChange={num("base_price")} />
          </div>
          <div>
            <label className={label}>Weekend price, Fri & Sat (₹, optional)</label>
            <input className={input} type="number" min={1} value={f.weekend_price ?? ""} onChange={(e) => set("weekend_price", e.target.value ? Number(e.target.value) : null)} placeholder="Same as nightly" />
          </div>
          <div>
            <label className={label}>Cleaning fee (₹ per stay)</label>
            <input className={input} type="number" min={0} value={f.cleaning_fee} onChange={num("cleaning_fee")} />
          </div>
          <div />
          <div>
            <label className={label}>Weekly discount (7+ nights, %)</label>
            <input className={input} type="number" min={0} max={90} value={f.weekly_discount_pct} onChange={num("weekly_discount_pct")} />
          </div>
          <div>
            <label className={label}>Monthly discount (28+ nights, %)</label>
            <input className={input} type="number" min={0} max={90} value={f.monthly_discount_pct} onChange={num("monthly_discount_pct")} />
          </div>
        </div>
      </section>

      <section className={section}>
        <h2 className={h2}>Availability rules</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Minimum nights</label>
            <input className={input} type="number" min={1} max={365} required value={f.min_nights} onChange={num("min_nights")} />
          </div>
          <div>
            <label className={label}>Maximum nights</label>
            <input className={input} type="number" min={1} max={365} required value={f.max_nights} onChange={num("max_nights")} />
          </div>
          <div>
            <label className={label}>Check-in from</label>
            <input className={input} type="time" required value={f.check_in_time} onChange={(e) => set("check_in_time", e.target.value)} />
          </div>
          <div>
            <label className={label}>Checkout by</label>
            <input className={input} type="time" required value={f.check_out_time} onChange={(e) => set("check_out_time", e.target.value)} />
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-[600] border-t border-line bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl justify-between">
          <button type="button" onClick={onBack} className="font-semibold underline">Cancel</button>
          <button type="submit" disabled={saving || uploading} className="rounded-lg bg-ink px-8 py-3 font-semibold text-white disabled:opacity-40">
            {saving ? "Saving…" : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

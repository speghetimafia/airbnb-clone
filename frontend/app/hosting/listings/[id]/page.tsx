"use client";

import { ArrowLeft, CalendarDays, ChevronRight, Eye, Plus, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import {
  AmenitiesField, DiscountFields, type Fields, LocationFields, NOTICE_OPTIONS, PhotosField, RoomsFields, TimesFields, TypeFields,
  WINDOW_OPTIONS, inputCls, noticeLabel, toInput, windowLabel,
} from "@/components/ListingFields";
import LoginPrompt from "@/components/LoginPrompt";
import Modal from "@/components/Modal";
import TemplateEditor, { TRIGGERS } from "@/components/TemplateEditor";
import { del, img, put } from "@/lib/api";
import { money, plural, time12 } from "@/lib/format";
import type { ListingDetail, ListingInput, Template } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useUser } from "@/lib/user";

type Screen =
  | "status" | "photos" | "title" | "description" | "type" | "rooms" | "location" | "amenities"
  | "pricing" | "discounts" | "availability" | "times";

const SCREEN_TITLES: Record<Screen, string> = {
  status: "Listing status", photos: "Photo tour", title: "Title", description: "Description", type: "Property type",
  rooms: "Rooms and guests", location: "Location", amenities: "Amenities", pricing: "Pricing", discounts: "Discounts",
  availability: "Availability", times: "Check-in and checkout",
};

function Card({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="block w-full rounded-3xl bg-white p-7 text-left shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition hover:shadow-[0_4px_16px_rgba(0,0,0,0.14)]">
      <div className="mb-1 text-[17px] font-medium">{title}</div>
      <div className="text-[17px] text-muted">{children}</div>
    </button>
  );
}

/** Three photos fanned out with the cover in front, like the app's "Photo tour" card. */
function PhotoFan({ urls }: { urls: string[] }) {
  const side = "absolute top-1/2 h-[80%] w-[34%] -translate-y-1/2 rounded-[28px] object-cover";
  return (
    <span className="relative mt-6 block h-[260px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {urls[1] && <img src={img(urls[1], 400)} alt="" className={`${side} left-[4%]`} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {urls[2] && <img src={img(urls[2], 400)} alt="" className={`${side} right-[4%]`} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img(urls[0], 700)} alt="" className="absolute left-1/2 top-0 z-10 h-full w-[56%] -translate-x-1/2 rounded-[40px] object-cover shadow-lg" />
      <span className="absolute left-[26%] top-4 z-20 rounded-full bg-white px-4 py-2 text-sm font-medium text-ink shadow">{plural(urls.length, "photo")}</span>
    </span>
  );
}

/** Big-number setting card used on the Pricing and Availability screens. */
function NumberCard({ label, value, onChange, prefix }: { label: string; value: number; onChange: (v: number) => void; prefix?: string }) {
  return (
    <label className="block rounded-3xl border border-line px-7 py-6">
      <span className="text-[17px] font-medium">{label}</span>
      <span className="mt-1 flex items-baseline text-[40px] font-bold leading-tight">
        {prefix}
        <input
          inputMode="numeric"
          value={value ? value.toLocaleString("en-IN") : ""}
          onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")))} // the API rejects out-of-range values
          className="w-full bg-transparent outline-none"
        />
      </span>
    </label>
  );
}

function SelectCard({ label, value, options, onChange }: { label: string; value: number; options: { value: number; label: string }[]; onChange: (v: number) => void }) {
  return (
    <label className="block rounded-3xl border border-line px-7 py-6">
      <span className="text-[17px] font-medium">{label}</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 block w-full bg-transparent text-[17px] outline-none">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function ScreenBody({ screen, f, set, listing }: Fields & { screen: Screen; listing: ListingDetail }) {
  switch (screen) {
    case "photos": return <PhotosField f={f} set={set} />;
    case "title":
      return <textarea value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={200} rows={3} className="w-full resize-none text-[28px] font-semibold outline-none" />;
    case "description":
      return <textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={12} className={inputCls} />;
    case "type": return <TypeFields f={f} set={set} />;
    case "rooms": return <RoomsFields f={f} set={set} />;
    case "location": return <LocationFields f={f} set={set} />;
    case "amenities": return <AmenitiesField f={f} set={set} />;
    case "discounts": return <DiscountFields f={f} set={set} />;
    case "times": return <TimesFields f={f} set={set} />;
    case "pricing":
      return (
        <div className="space-y-6">
          <NumberCard label="Base price" prefix="₹" value={f.base_price} onChange={(v) => set("base_price", v)} />
          {f.weekend_price === null ? (
            <div className="flex items-center justify-between rounded-3xl border border-line px-7 py-8">
              <span className="text-[17px] font-medium">Custom weekend price</span>
              <button onClick={() => set("weekend_price", f.base_price)} className="font-semibold underline">Add</button>
            </div>
          ) : (
            <div className="relative">
              <NumberCard label="Weekend price" prefix="₹" value={f.weekend_price} onChange={(v) => set("weekend_price", v)} />
              <button onClick={() => set("weekend_price", null)} className="absolute right-7 top-6 text-sm font-semibold underline">Remove</button>
            </div>
          )}
          <NumberCard label="Cleaning fee (per stay)" prefix="₹" value={f.cleaning_fee} onChange={(v) => set("cleaning_fee", v)} />
          <div className="flex items-center justify-between rounded-3xl border border-line px-7 py-6 opacity-60">
            <div>
              <div className="text-[17px] font-medium">Smart Pricing</div>
              <div className="text-muted">Automatically adjust prices to demand. Coming soon.</div>
            </div>
            <span className="h-8 w-14 rounded-full bg-[#b0b0b0] p-1"><span className="block h-6 w-6 rounded-full bg-white" /></span>
          </div>
        </div>
      );
    case "availability":
      return (
        <div className="space-y-6">
          <NumberCard label="Minimum nights" value={f.min_nights} onChange={(v) => set("min_nights", v)} />
          <NumberCard label="Maximum nights" value={f.max_nights} onChange={(v) => set("max_nights", v)} />
          <SelectCard label="Advance notice" value={f.advance_notice_days} options={NOTICE_OPTIONS.map((d) => ({ value: d, label: noticeLabel(d) }))} onChange={(v) => set("advance_notice_days", v)} />
          <SelectCard label="Availability window" value={f.availability_window_days} options={WINDOW_OPTIONS.map((d) => ({ value: d, label: windowLabel(d) }))} onChange={(v) => set("availability_window_days", v)} />
          <Link href={`/hosting/calendar/${listing.id}`} className="flex items-center justify-between rounded-3xl border border-line px-7 py-6">
            <span>
              <span className="block text-[17px] font-medium">Calendar</span>
              <span className="text-muted">Block or open specific nights</span>
            </span>
            <ChevronRight size={22} />
          </Link>
        </div>
      );
    case "status":
      return (
        <div className="space-y-4">
          {[
            { on: true, title: "Listed", text: "Guests can find your listing in search results and book available dates." },
            { on: false, title: "Unlisted", text: "Guests can't book your listing or find it in search results." },
          ].map((o) => (
            <button key={o.title} onClick={() => set("is_listed", o.on)} className={`flex w-full gap-4 rounded-3xl border p-6 text-left ${f.is_listed === o.on ? "border-ink ring-1 ring-ink" : "border-line"}`}>
              <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${o.on ? "bg-[#008a05]" : "bg-[#b0b0b0]"}`} />
              <span>
                <span className="block text-[17px] font-medium">{o.title}</span>
                <span className="text-muted">{o.text}</span>
              </span>
            </button>
          ))}
        </div>
      );
  }
}

function Editor() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { user, ready, refresh } = useUser();
  const { data: l, error, reload } = useApi<ListingDetail>(`/listings/${id}`);
  const templates = useApi<Template[]>(user ? `/listings/${id}/templates` : null);
  const [tab, setTab] = useState<"space" | "arrival">("space");
  const [screen, setScreen] = useState<Screen | null>(params.get("edit") as Screen | null);
  const [draft, setDraft] = useState<ListingInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Template | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Opening a screen (also via ?edit=pricing) starts a fresh draft from the saved listing.
  if (screen && l && !draft) setDraft(toInput(l));

  if (ready && !user) return <LoginPrompt title="Hosting" text="Log in to edit your listing." />;
  if (error) return <p className="p-20 text-center">{error}</p>;
  if (!l || !user) return <div className="mx-auto mt-10 h-96 max-w-2xl animate-pulse rounded-3xl bg-soft" />;
  if (user.id !== l.host.id) return <p className="p-20 text-center">Only the host can edit this listing.</p>;

  const set: Fields["set"] = (k, v) => setDraft((p) => (p ? { ...p, [k]: v } : p));
  const close = () => {
    setScreen(null);
    setDraft(null);
  };
  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await put(`/listings/${l.id}`, { ...draft, weekend_price: draft.weekend_price || null });
      toast.success("Saved");
      reload();
      close();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    try {
      await del(`/listings/${l.id}`);
      toast("Listing deleted");
      await refresh();
      router.push("/hosting/listings");
    } catch (e) {
      setDeleteError((e as Error).message);
    }
  };
  const removeTemplate = async (t: Template) => {
    await del(`/templates/${t.id}`);
    toast("Message deleted");
    templates.reload();
  };

  if (screen && draft) {
    return (
      <main className="mx-auto max-w-2xl px-6 pb-32 pt-6">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={close} aria-label="Back" className="-ml-2 rounded-full p-2 hover:bg-soft"><ArrowLeft size={24} /></button>
          {screen === "pricing" && <span className="rounded-full border border-line px-4 py-2 text-lg">INR</span>}
        </div>
        <h1 className="mb-8 text-[32px] font-semibold">{SCREEN_TITLES[screen]}</h1>
        <ScreenBody screen={screen} f={draft} set={set} listing={l} />
        {screen === "status" && (
          <button onClick={() => setConfirmDelete(true)} className="mt-10 flex items-center gap-2 font-semibold text-[#c13515] underline">
            <Trash2 size={18} /> Delete listing
          </button>
        )}
        <div className="fixed inset-x-0 bottom-0 z-[600] border-t border-line bg-white px-6 py-4">
          <div className="mx-auto flex max-w-2xl justify-between">
            <button onClick={close} className="font-semibold underline">Cancel</button>
            <button onClick={save} disabled={saving} className="rounded-lg bg-ink px-8 py-3 font-semibold text-white disabled:opacity-40">{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
        <Modal
          open={confirmDelete}
          onClose={() => {
            setConfirmDelete(false);
            setDeleteError(null);
          }}
          title="Delete listing"
          error={deleteError}
          footer={
            <div className="flex justify-between">
              <button onClick={() => setConfirmDelete(false)} className="font-semibold underline">Cancel</button>
              <button onClick={remove} className="rounded-lg bg-[#c13515] px-6 py-3 font-semibold text-white">Delete</button>
            </div>
          }
        >
          <p>Permanently delete <b>{l.title}</b>? Listings with upcoming reservations can&apos;t be deleted; unlist them instead.</p>
        </Modal>
      </main>
    );
  }

  const open = (s: Screen) => setScreen(s);
  const amenityNames = l.amenities.map((a) => a.name);

  return (
    <main className="mx-auto max-w-2xl px-6 pb-36 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => router.push("/hosting/listings")} aria-label="Back" className="-ml-2 rounded-full p-2 hover:bg-soft"><ArrowLeft size={24} /></button>
        <h1 className="text-xl font-medium">Listing editor</h1>
        <button onClick={() => open("status")} aria-label="Listing settings" className="-mr-2 rounded-full p-2 hover:bg-soft"><Settings size={22} /></button>
      </div>

      <div className="mx-auto mb-8 flex max-w-md rounded-full bg-[#ebebeb] p-1">
        {(["space", "arrival"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-full py-3 text-[15px] ${tab === t ? "bg-white font-medium shadow" : ""}`}>
            {t === "space" ? "Your space" : "Arrival guide"}
          </button>
        ))}
      </div>

      {tab === "space" ? (
        <div className="space-y-5">
          <button onClick={() => open("status")} className="flex w-full items-center gap-3 rounded-3xl bg-[#f7f7f7] p-7 text-left">
            <span className="flex-1">
              <span className="flex items-center gap-2 text-[17px] font-medium">
                <span className={`h-2.5 w-2.5 rounded-full ${l.is_listed ? "bg-[#008a05]" : "bg-[#8a8a8a]"}`} />
                {l.is_listed ? "Listed" : "Unlisted"}
              </span>
              <span className="mt-1 block text-muted">
                {l.is_listed ? "Guests can find and book your listing." : "Your listing doesn't appear in search results and can't be booked. Relist to start earning."}
              </span>
            </span>
            <ChevronRight size={22} />
          </button>
          <Card title="Photo tour" onClick={() => open("photos")}>
            {plural(l.bedrooms, "bedroom")} · {plural(l.beds, "bed")} · {plural(l.baths, "bath")}
            <PhotoFan urls={l.photos.map((p) => p.url)} />
          </Card>
          <Card title="Title" onClick={() => open("title")}><span className="text-[26px] font-medium">{l.title}</span></Card>
          <Card title="Property type" onClick={() => open("type")}>Entire place · {l.property_type}</Card>
          <Card title="Description" onClick={() => open("description")}><span className="line-clamp-3">{l.description}</span></Card>
          <Card title="Rooms and guests" onClick={() => open("rooms")}>{plural(l.max_guests, "guest")} · {plural(l.bedrooms, "bedroom")} · {plural(l.beds, "bed")} · {plural(l.baths, "bathroom")}</Card>
          <Card title="Location" onClick={() => open("location")}>{l.address || `${l.city}, ${l.state}`}</Card>
          <Card title="Amenities" onClick={() => open("amenities")}>
            {amenityNames.slice(0, 4).join(" · ")}{amenityNames.length > 4 && ` · +${amenityNames.length - 4} more`}
          </Card>
          <Card title="Pricing" onClick={() => open("pricing")}>
            {money(l.base_price)} per night
            {l.weekend_price && <span className="block">{money(l.weekend_price)} Fri & Sat</span>}
            {l.cleaning_fee > 0 && <span className="block">{money(l.cleaning_fee)} cleaning fee</span>}
          </Card>
          <Card title="Discounts" onClick={() => open("discounts")}>
            {l.weekly_discount_pct || l.monthly_discount_pct ? (
              <>
                {l.weekly_discount_pct > 0 && <span className="block">{l.weekly_discount_pct}% weekly discount</span>}
                {l.monthly_discount_pct > 0 && <span className="block">{l.monthly_discount_pct}% monthly discount</span>}
              </>
            ) : "No discounts"}
          </Card>
          <Card title="Availability" onClick={() => open("availability")}>
            <span className="block">{l.min_nights}–{l.max_nights} night stays</span>
            <span className="block">{noticeLabel(l.advance_notice_days)} advance notice</span>
          </Card>
          <Link href={`/hosting/calendar/${l.id}`} className="flex items-center gap-4 rounded-3xl bg-white p-7 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            <CalendarDays size={24} strokeWidth={1.5} /> <span className="flex-1 text-[17px] font-medium">Calendar</span> <ChevronRight size={22} />
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          <Card title="Check-in and checkout" onClick={() => open("times")}>
            Check-in after {time12(l.check_in_time)} · Checkout before {time12(l.check_out_time)}
          </Card>
          <Card title="Directions" onClick={() => open("location")}>
            {l.address || `${l.city}, ${l.state}`}
            <span className="mt-1 block text-sm">Guests get the exact address and a Maps link after booking.</span>
          </Card>
          <div className="rounded-3xl bg-white p-7 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            <div className="text-[17px] font-medium">Scheduled messages</div>
            <p className="mb-4 text-muted">Wi-Fi details, door codes and directions, sent automatically for every booking.</p>
            {(templates.data ?? []).map((t) => (
              <div key={t.id} className="flex items-center gap-3 border-t border-line py-4">
                <button onClick={() => setEditing(t)} className="flex-1 text-left">
                  <span className="block font-medium">{t.title}</span>
                  <span className="text-sm text-muted">{TRIGGERS[t.trigger]}</span>
                </button>
                <button onClick={() => removeTemplate(t)} aria-label={`Delete ${t.title}`} className="rounded-full p-2 hover:bg-soft"><Trash2 size={18} /></button>
              </div>
            ))}
            <button onClick={() => setEditing("new")} className="mt-2 flex items-center gap-2 rounded-full border border-ink px-5 py-2.5 text-sm font-semibold hover:bg-soft">
              <Plus size={16} /> Add message
            </button>
          </div>
        </div>
      )}

      <Link href={`/rooms/${l.id}`} className="fixed bottom-8 left-1/2 z-[450] flex -translate-x-1/2 items-center gap-2 rounded-full bg-black px-7 py-4 text-lg font-semibold text-white shadow-card">
        <Eye size={22} /> View
      </Link>

      {editing && (
        <TemplateEditor
          listing={l}
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            templates.reload();
          }}
        />
      )}
    </main>
  );
}

export default function ListingEditorPage() {
  return (
    <Suspense>
      <Editor />
    </Suspense>
  );
}

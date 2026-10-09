"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { post, put } from "@/lib/api";
import { time12 } from "@/lib/format";
import type { ListingDetail, Template, Trigger } from "@/lib/types";
import Modal from "./Modal";

export const TRIGGERS: Record<Trigger, string> = {
  on_confirm: "As soon as the booking is confirmed",
  day_before_checkin: "1 day before check-in, 9:00 AM",
  on_checkout: "On checkout day, 9:00 AM",
};
const PLACEHOLDERS = ["guest_name", "host_name", "listing_title", "check_in", "check_out", "check_in_time", "check_out_time", "address", "maps_link"];

/** Host-written automated message (Wi-Fi, directions, check-in steps) with placeholder chips and a live preview. */
export default function TemplateEditor({ listing, initial, onClose, onSaved }: { listing: ListingDetail; initial?: Template; onClose: () => void; onSaved: () => void }) {
  const [t, setT] = useState({ title: initial?.title ?? "", body: initial?.body ?? "", trigger: initial?.trigger ?? ("on_confirm" as Trigger) });
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const insert = (ph: string) => {
    const el = bodyRef.current;
    const at = el?.selectionStart ?? t.body.length;
    setT({ ...t, body: `${t.body.slice(0, at)}{${ph}}${t.body.slice(at)}` });
    el?.focus();
  };

  const sample: Record<string, string> = {
    guest_name: "Arjun", host_name: listing.host.name.split(" ")[0], listing_title: listing.title,
    check_in: "Fri, 14 Nov 2026", check_out: "Sun, 16 Nov 2026", check_in_time: time12(listing.check_in_time),
    check_out_time: time12(listing.check_out_time), address: listing.address || `${listing.city}, ${listing.state}`,
    maps_link: `https://maps.google.com/?q=${listing.lat},${listing.lng}`,
  };
  const preview = t.body.replace(/\{(\w+)\}/g, (m, k) => sample[k] ?? m);

  const save = async () => {
    try {
      if (initial) await put(`/templates/${initial.id}`, t);
      else await post(`/listings/${listing.id}/templates`, t);
      toast.success("Message saved");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={initial ? "Edit scheduled message" : "New scheduled message"}
      footer={
        <div className="flex justify-between">
          <button onClick={onClose} className="font-semibold underline">Cancel</button>
          <button onClick={save} disabled={!t.title.trim() || !t.body.trim()} className="rounded-lg bg-ink px-6 py-3 font-semibold text-white disabled:opacity-30">Save</button>
        </div>
      }
    >
      <label className="mb-1 block text-sm font-semibold">Name</label>
      <input value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} maxLength={120} placeholder="Wi-Fi & check-in details" className="mb-5 w-full rounded-lg border border-[#b0b0b0] px-4 py-3 outline-none focus:border-ink" />
      <label className="mb-1 block text-sm font-semibold">When to send</label>
      <select value={t.trigger} onChange={(e) => setT({ ...t, trigger: e.target.value as Trigger })} className="mb-5 w-full rounded-lg border border-[#b0b0b0] px-4 py-3 outline-none focus:border-ink">
        {Object.entries(TRIGGERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <label className="mb-1 block text-sm font-semibold">Message</label>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {PLACEHOLDERS.map((p) => (
          <button key={p} type="button" onClick={() => insert(p)} className="rounded-full border border-line px-2.5 py-1 text-xs hover:border-ink">
            + {p.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      <textarea ref={bodyRef} value={t.body} onChange={(e) => setT({ ...t, body: e.target.value })} rows={7} maxLength={4000} placeholder={"Hi {guest_name}! Wi-Fi: MyHome_5G / pass1234\nDirections: {maps_link}"} className="w-full rounded-lg border border-[#b0b0b0] p-4 font-mono text-sm outline-none focus:border-ink" />
      {t.body && (
        <div className="mt-4">
          <div className="mb-1 text-sm font-semibold">Preview</div>
          <p className="whitespace-pre-line rounded-2xl rounded-tl-sm bg-soft p-4 text-sm">{preview}</p>
        </div>
      )}
    </Modal>
  );
}

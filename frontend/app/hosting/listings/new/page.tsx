"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CATEGORIES, PROPERTY_ICONS, PROPERTY_TYPES } from "@/components/icons";
import {
  AmenitiesField, AvailabilityFields, BLANK, DiscountFields, type Fields, LocationFields, PhotosField, RoomsFields, TimesFields,
  inputCls, labelCls,
} from "@/components/ListingFields";
import LoginPrompt from "@/components/LoginPrompt";
import { Belo } from "@/components/Logo";
import { img, post } from "@/lib/api";
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft";
import { money } from "@/lib/format";
import type { ListingDetail, ListingInput } from "@/lib/types";
import { useUser } from "@/lib/user";

const SERVICE_FEE = 0.14; // matches the backend's guest service fee

type ScreenProps = Fields & { onUploading: (busy: boolean) => void };
type Screen = { stage: 0 | 1 | 2 | 3; valid?: (f: ListingInput) => boolean; render: (props: ScreenProps) => React.ReactNode };

function Heading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-[32px] font-semibold leading-tight">{title}</h1>
      {sub && <p className="mt-2 text-lg text-muted">{sub}</p>}
    </div>
  );
}

function Splash({ n, title, text, emoji }: { n: number; title: string; text: string; emoji: string }) {
  return (
    <div className="grid items-center gap-10 md:grid-cols-2">
      <div>
        <div className="mb-3 text-lg font-medium">Step {n}</div>
        <h1 className="mb-5 text-[44px] font-semibold leading-[1.1]">{title}</h1>
        <p className="text-lg text-muted">{text}</p>
      </div>
      <div className="text-center text-[180px] leading-none drop-shadow-xl" aria-hidden>{emoji}</div>
    </div>
  );
}

function ChoiceGrid({ options, value, onPick }: { options: { key: string; label: string; icon: React.ElementType }[]; value: string; onPick: (k: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onPick(key)}
          className={`flex flex-col gap-3 rounded-xl border p-5 text-left font-medium transition ${value === key ? "border-ink bg-soft ring-1 ring-ink" : "border-line hover:border-ink"}`}
        >
          <Icon size={32} strokeWidth={1.4} />
          {label}
        </button>
      ))}
    </div>
  );
}

const SCREENS: Screen[] = [
  {
    stage: 0,
    render: () => (
      <div className="grid items-center gap-12 md:grid-cols-2">
        <h1 className="text-[44px] font-semibold leading-[1.1]">It&apos;s easy to get started on Airbnb</h1>
        <ol className="divide-y divide-line">
          {[
            ["Tell us about your place", "Share some basic info, like where it is and how many guests can stay.", "🏡"],
            ["Make it stand out", "Add photos plus a title and description. We'll help you out.", "🛋️"],
            ["Finish up and publish", "Set a starting price, a few booking rules, and publish your listing.", "🔑"],
          ].map(([t, d, e], i) => (
            <li key={t} className="flex items-start gap-4 py-6">
              <span className="text-[22px] font-semibold">{i + 1}</span>
              <span className="flex-1">
                <span className="block text-[22px] font-semibold">{t}</span>
                <span className="text-muted">{d}</span>
              </span>
              <span className="text-5xl">{e}</span>
            </li>
          ))}
        </ol>
      </div>
    ),
  },
  {
    stage: 1,
    render: () => (
      <Splash n={1} emoji="🏡" title="Tell us about your place" text="In this step, we'll ask you which type of property you have, where it is and how many guests can stay." />
    ),
  },
  {
    stage: 1,
    render: ({ f, set }) => (
      <>
        <Heading title="Which of these best describes your place?" />
        <ChoiceGrid options={PROPERTY_TYPES.map((t) => ({ key: t, label: t, icon: PROPERTY_ICONS[t] }))} value={f.property_type} onPick={(v) => set("property_type", v)} />
      </>
    ),
  },
  {
    stage: 1,
    render: ({ f, set }) => (
      <>
        <Heading title="What's the vibe of your place?" sub="Guests browse these categories on the home page." />
        <ChoiceGrid options={CATEGORIES.map((c) => ({ key: c.name, label: c.name, icon: c.icon }))} value={f.category} onPick={(v) => set("category", v)} />
      </>
    ),
  },
  {
    stage: 1,
    valid: (f) => f.city.trim().length >= 2 && f.state.trim().length >= 2,
    render: (p) => (
      <>
        <Heading title="Where's your place located?" sub="Your address is only shared with guests after they've made a reservation. Click the map to drop the pin." />
        <LocationFields {...p} />
      </>
    ),
  },
  {
    stage: 1,
    render: (p) => (
      <>
        <Heading title="Share some basics about your place" sub="You'll add more details later, like bed types." />
        <RoomsFields {...p} />
      </>
    ),
  },
  {
    stage: 2,
    render: () => (
      <Splash n={2} emoji="🛋️" title="Make your place stand out" text="In this step, you'll add some of the amenities your place offers, plus photos. Then you'll create a title and description." />
    ),
  },
  {
    stage: 2,
    render: (p) => (
      <>
        <Heading title="Tell guests what your place has to offer" sub="You can add more amenities after you publish your listing." />
        <AmenitiesField {...p} />
      </>
    ),
  },
  {
    stage: 2,
    valid: (f) => f.photo_urls.length > 0,
    render: (p) => (
      <>
        <Heading title={`Add some photos of your ${p.f.property_type.toLowerCase()}`} sub="You'll need at least one photo to get started. The first one is your cover photo." />
        <PhotosField f={p.f} set={p.set} onUploading={p.onUploading} />
      </>
    ),
  },
  {
    stage: 2,
    valid: (f) => f.title.trim().length >= 3,
    render: ({ f, set }) => (
      <>
        <Heading title={`Now, let's give your ${f.property_type.toLowerCase()} a title`} sub="Short titles work best. Have fun with it; you can always change it later." />
        <textarea value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={200} rows={3} className={`${inputCls} text-2xl`} />
        <p className="mt-2 text-sm text-muted">{f.title.length}/200</p>
      </>
    ),
  },
  {
    stage: 2,
    valid: (f) => f.description.trim().length >= 10,
    render: ({ f, set }) => (
      <>
        <Heading title="Create your description" sub="Share what makes your place special." />
        <textarea value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} rows={8} className={inputCls} placeholder="You'll have a great time at this comfortable place to stay." />
        <p className="mt-2 text-sm text-muted">{f.description.length}/5000</p>
      </>
    ),
  },
  {
    stage: 3,
    render: () => (
      <Splash n={3} emoji="🔑" title="Finish up and publish" text="Finally, you'll set your pricing and a few booking rules, then publish your listing." />
    ),
  },
  {
    stage: 3,
    valid: (f) => f.base_price > 0,
    render: ({ f, set }) => (
      <>
        <Heading title="Now, set your price" sub="You can change it anytime." />
        <div className="text-center">
          <label className="inline-flex items-baseline justify-center text-[72px] font-bold leading-none">
            ₹
            <input
              inputMode="numeric"
              aria-label="Nightly price"
              value={f.base_price ? f.base_price.toLocaleString("en-IN") : ""}
              onChange={(e) => set("base_price", Number(e.target.value.replace(/\D/g, "")))}
              className="w-[6ch] bg-transparent outline-none"
            />
          </label>
          <p className="mt-3 text-muted">Guest price before taxes {money(Math.round(f.base_price * (1 + SERVICE_FEE)))}</p>
        </div>
        <div className="mx-auto mt-10 grid max-w-xl gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Weekend price, Fri & Sat (optional)</label>
            <input className={inputCls} inputMode="numeric" value={f.weekend_price ?? ""} placeholder="Same as nightly" onChange={(e) => set("weekend_price", Number(e.target.value.replace(/\D/g, "")) || null)} />
          </div>
          <div>
            <label className={labelCls}>Cleaning fee per stay</label>
            <input className={inputCls} inputMode="numeric" value={f.cleaning_fee || ""} placeholder="0" onChange={(e) => set("cleaning_fee", Number(e.target.value.replace(/\D/g, "")))} />
          </div>
        </div>
      </>
    ),
  },
  {
    stage: 3,
    render: (p) => (
      <>
        <Heading title="Add discounts" sub="Help your place stand out to get booked faster and earn your first reviews." />
        <DiscountFields {...p} />
      </>
    ),
  },
  {
    stage: 3,
    valid: (f) => f.min_nights >= 1 && f.max_nights >= f.min_nights,
    render: (p) => (
      <>
        <Heading title="Set your booking rules" sub="How long guests can stay, how far ahead they can book, and your check-in times." />
        <AvailabilityFields {...p} />
        <div className="mt-4" />
        <TimesFields {...p} />
      </>
    ),
  },
  {
    stage: 3,
    render: ({ f }) => (
      <>
        <Heading title="Review your listing" sub="Here's what we'll show to guests. Make sure everything looks good." />
        <div className="grid items-start gap-10 md:grid-cols-2">
          <div className="rounded-3xl p-4 shadow-[0_6px_24px_rgba(0,0,0,0.14)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(f.photo_urls[0], 700)} alt="" className="aspect-square w-full rounded-2xl object-cover" />
            <div className="mt-4 flex justify-between gap-2">
              <span className="truncate font-semibold">{f.title}</span>
              <span className="shrink-0">New ★</span>
            </div>
            <div><span className="font-semibold">{money(f.base_price)}</span> night</div>
          </div>
          <div>
            <h2 className="mb-6 text-[22px] font-semibold">What&apos;s next?</h2>
            {[
              ["Publish your listing", `${f.property_type} in ${f.city || "your city"} goes live in search right away.`],
              ["Set up your calendar", "Block any nights you're not available."],
              ["Add scheduled messages", "Send Wi-Fi details and directions automatically in the Arrival guide."],
            ].map(([t, d]) => (
              <div key={t} className="mb-6">
                <div className="font-semibold">{t}</div>
                <div className="text-muted">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </>
    ),
  },
];

/** Stages 1-3 each own a segment of the progress bar, filled as you move through that stage's screens. */
function Progress({ index }: { index: number }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3].map((stage) => {
        const screens = SCREENS.map((s, i) => ({ ...s, i })).filter((s) => s.stage === stage);
        const done = screens.filter((s) => s.i <= index).length;
        return (
          <div key={stage} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-ink transition-all duration-300" style={{ width: `${(done / screens.length) * 100}%` }} />
          </div>
        );
      })}
    </div>
  );
}

export default function CreateListing() {
  const router = useRouter();
  const { user, ready, refresh } = useUser();
  // Resume an unfinished draft from this browser (read lazily; nothing renders until `ready`, so no hydration mismatch).
  const [step, setStep] = useState(() => loadDraft()?.step ?? 0);
  const [f, setF] = useState<ListingInput>(() => loadDraft()?.f ?? BLANK);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (step > 0) saveDraft({ step, f }); // keep the draft in sync so "Save & exit" or closing the tab loses nothing
  }, [step, f]);

  if (!ready) return null;
  if (!user) return <LoginPrompt title="Hosting" text="Log in to create a listing." />;

  const set: Fields["set"] = (k, v) => setF((prev) => ({ ...prev, [k]: v }));
  const screen = SCREENS[step];
  const last = step === SCREENS.length - 1;
  const canNext = !uploading && (screen.valid?.(f) ?? true);
  const go = (to: number) => {
    setStep(to);
    window.scrollTo(0, 0);
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const listing = await post<ListingDetail>("/listings", { ...f, weekend_price: f.weekend_price || null });
      clearDraft();
      await refresh(); // a first listing turns a guest into a host
      toast.success("Your listing is live!");
      router.push(`/hosting/listings/${listing.id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[700] flex flex-col bg-white">
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/hosting/listings" aria-label="Your listings" className="text-ink"><Belo size={30} /></Link>
        <Link href="/hosting/listings" className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink">
          {step > 0 ? "Save & exit" : "Exit"}
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-6 md:py-12">{screen.render({ f, set, onUploading: setUploading })}</div>
      </main>

      <footer className="shrink-0 bg-white">
        {step > 0 && <Progress index={step} />}
        <div className="flex items-center justify-between px-6 py-4 md:px-12">
          {step > 0 ? (
            <button onClick={() => go(step - 1)} className="font-semibold underline">Back</button>
          ) : (
            <span />
          )}
          {step === 0 ? (
            <button onClick={() => go(1)} className="btn-brand px-8 py-3.5 text-base">Get started</button>
          ) : last ? (
            <button onClick={publish} disabled={publishing} className="btn-brand px-8 py-3.5 text-base">{publishing ? "Publishing…" : "Publish"}</button>
          ) : (
            <button onClick={() => go(step + 1)} disabled={!canNext} className="rounded-lg bg-ink px-8 py-3.5 font-semibold text-white disabled:bg-line">
              Next
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

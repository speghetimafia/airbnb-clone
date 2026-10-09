"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ComingSoon() {
  const feature = useSearchParams().get("f") || "This feature";
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <span className="mb-6 rounded-full bg-soft p-5 text-rausch"><Sparkles size={36} /></span>
      <h1 className="text-[32px] font-semibold">{feature} is coming soon</h1>
      <p className="mb-8 mt-3 text-muted">
        We&apos;re still building this part of the experience. In the meantime, you can browse homes, book a stay, or manage your listings.
      </p>
      <Link href="/" className="btn-brand px-6 py-3">Back to exploring</Link>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ComingSoon />
    </Suspense>
  );
}

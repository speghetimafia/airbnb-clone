"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

/** The app's full-screen "Switching to hosting" moment between guest and host modes. */
function Switch() {
  const router = useRouter();
  const toHosting = useSearchParams().get("to") !== "travelling";

  useEffect(() => {
    const t = setTimeout(() => router.replace(toHosting ? "/hosting" : "/"), 1100);
    return () => clearTimeout(t);
  }, [router, toHosting]);

  return (
    <main className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-white">
      <span className="animate-[pop_.6s_ease-out] text-[160px] leading-none drop-shadow-xl" aria-hidden>
        {toHosting ? "🏡" : "🧳"}
      </span>
      <p className="mt-16 text-lg font-medium">Switching to {toHosting ? "hosting" : "travelling"}</p>
      <style>{`@keyframes pop{from{transform:scale(.6) translateY(20px);opacity:0}to{transform:none;opacity:1}}`}</style>
    </main>
  );
}

export default function SwitchPage() {
  return (
    <Suspense>
      <Switch />
    </Suspense>
  );
}

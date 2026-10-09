"use client";

import { useUser } from "@/lib/user";

export default function LoginPrompt({ title, text }: { title: string; text: string }) {
  const { setLoginOpen } = useUser();
  return (
    <main className="mx-auto max-w-[1120px] px-6 py-12">
      <h1 className="mb-8 text-[32px] font-semibold">{title}</h1>
      <h2 className="text-[22px] font-semibold">Log in to view your {title.toLowerCase()}</h2>
      <p className="mb-6 mt-2 text-muted">{text}</p>
      <button onClick={() => setLoginOpen(true)} className="btn-brand px-6 py-3">Log in</button>
    </main>
  );
}

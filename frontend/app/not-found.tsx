import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[1120px] px-6 py-24">
      <h1 className="text-[96px] font-bold leading-none text-ink">Oops!</h1>
      <h2 className="mt-4 text-[28px]">We can&apos;t seem to find the page you&apos;re looking for.</h2>
      <p className="mt-2 font-semibold text-muted">Error code: 404</p>
      <Link href="/" className="mt-8 inline-block font-semibold underline">Home</Link>
    </main>
  );
}

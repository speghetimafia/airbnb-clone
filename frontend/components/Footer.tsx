import { Globe } from "lucide-react";
import Link from "next/link";

const COLUMNS = [
  { title: "Support", links: ["Help Centre", "AirCover", "Anti-discrimination", "Disability support", "Cancellation options"] },
  { title: "Hosting", links: ["Airbnb your home", "AirCover for Hosts", "Hosting resources", "Community forum", "Hosting responsibly"] },
  { title: "Airbnb", links: ["Newsroom", "New features", "Careers", "Investors", "Gift cards"] },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-soft">
      <div className="mx-auto grid max-w-[1760px] gap-8 px-6 py-12 md:grid-cols-3 xl:px-20">
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <h4 className="mb-3 text-sm font-semibold">{c.title}</h4>
            <ul className="space-y-3 text-sm">
              {c.links.map((l) => (
                <li key={l}>
                  <Link href={`/coming-soon?f=${encodeURIComponent(l)}`} className="hover:underline">{l}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-[1760px] flex-col justify-between gap-2 border-t border-line px-6 py-6 text-sm md:flex-row xl:px-20">
        <span>© {new Date().getFullYear()} Airbnb clone · Built for a hiring assignment · Privacy · Terms</span>
        <span className="flex items-center gap-4 font-semibold">
          <span className="flex items-center gap-2"><Globe size={16} /> English (IN)</span>
          <span>₹ INR</span>
        </span>
      </div>
    </footer>
  );
}

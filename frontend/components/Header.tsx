"use client";

import { ArrowLeftRight, Bookmark, CalendarDays, Globe, Heart, Menu, MessageSquare, PanelTop, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, img } from "@/lib/api";
import { plural, shortDate } from "@/lib/format";
import type { UserDetail } from "@/lib/types";
import { useUser } from "@/lib/user";
import Logo, { Belo } from "./Logo";
import Modal from "./Modal";
import SearchBar from "./SearchBar";

export function Avatar({ src, name, size = 32 }: { src?: string; name: string; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={img(src)} alt={name} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex items-center justify-center rounded-full bg-ink text-sm font-semibold text-white" style={{ width: size, height: size }}>
      {name[0]}
    </span>
  );
}

function UserMenu() {
  const { user, setLoginOpen, logout } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const item = "block w-full px-4 py-3 text-left text-sm hover:bg-soft";
  const go = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 rounded-full border border-line py-1.5 pl-3.5 pr-1.5 transition-shadow hover:shadow-pill"
        aria-label="Main navigation menu"
      >
        <Menu size={16} strokeWidth={2.5} />
        {user ? <Avatar src={user.avatar_url} name={user.name} /> : <UserRound size={30} className="rounded-full bg-muted p-1 text-white" />}
      </button>
      {open && (
        <div className="absolute right-0 top-14 z-50 w-60 overflow-hidden rounded-xl bg-white py-2 shadow-[0_2px_16px_rgba(0,0,0,0.12)]">
          {user ? (
            <>
              <Link href="/messages" onClick={go} className={`${item} font-semibold`}>Messages</Link>
              <Link href="/trips" onClick={go} className={`${item} font-semibold`}>Trips</Link>
              <Link href="/wishlists" onClick={go} className={`${item} font-semibold`}>Wishlists</Link>
              <hr className="my-2 border-line" />
              <Link href="/switch?to=hosting" onClick={go} className={item}>{user.is_host ? "Manage listings" : "Airbnb your home"}</Link>
              <Link href="/profile" onClick={go} className={item}>Profile</Link>
              <hr className="my-2 border-line" />
              <button onClick={() => { go(); setLoginOpen(true); }} className={item}>Switch user</button>
              <button onClick={() => { go(); logout(); }} className={item}>Log out</button>
            </>
          ) : (
            <>
              <button onClick={() => { go(); setLoginOpen(true); }} className={`${item} font-semibold`}>Log in</button>
              <button onClick={() => { go(); setLoginOpen(true); }} className={item}>Sign up</button>
              <hr className="my-2 border-line" />
              <Link href="/hosting" onClick={go} className={item}>Airbnb your home</Link>
              <Link href="/coming-soon?f=Help Centre" onClick={go} className={item}>Help Centre</Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Mocked auth: pick any seeded user. Hosts own listings; everyone can travel. */
export function LoginModal() {
  const { loginOpen, setLoginOpen, login, user } = useUser();
  const [users, setUsers] = useState<UserDetail[]>([]);

  useEffect(() => {
    if (loginOpen) api<UserDetail[]>("/users").then(setUsers);
  }, [loginOpen]);

  const pick = async (id: number, name: string) => {
    await login(id);
    toast.success(`Welcome, ${name.split(" ")[0]}!`);
  };

  const group = (title: string, list: typeof users) => (
    <div className="mb-6">
      <h3 className="mb-2 text-sm font-semibold text-muted">{title}</h3>
      <div className="grid gap-2">
        {list.map((u) => (
          <button
            key={u.id}
            onClick={() => pick(u.id, u.name)}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left hover:border-ink ${user?.id === u.id ? "border-ink" : "border-line"}`}
          >
            <Avatar src={u.avatar_url} name={u.name} size={40} />
            <span className="flex-1">
              <span className="block font-semibold">{u.name}</span>
              <span className="block text-sm text-muted">{u.email}</span>
            </span>
            {u.is_superhost && <span className="rounded-full bg-soft px-2 py-1 text-xs font-semibold">Superhost</span>}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Modal open={loginOpen} onClose={() => setLoginOpen(false)} title="Log in or sign up">
      <h2 className="mb-1 text-2xl font-semibold">Welcome to Airbnb</h2>
      <p className="mb-6 text-sm text-muted">
        Authentication is mocked for this demo. Pick an account to continue: guests book stays, hosts manage listings.
      </p>
      {group("Hosts", users.filter((u) => u.is_host))}
      {group("Guests", users.filter((u) => !u.is_host))}
    </Modal>
  );
}

const HOST_TABS = [
  { href: "/hosting", label: "Today", icon: Bookmark },
  { href: "/hosting/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/hosting/listings", label: "Listings", icon: PanelTop },
  { href: "/hosting/messages", label: "Messages", icon: MessageSquare },
  { href: "/hosting/menu", label: "Menu", icon: Menu },
];
const hostTabActive = (href: string, pathname: string) => (href === "/hosting" ? pathname === href : pathname.startsWith(href));

/** Hosting mode has its own nav, like the app: Today, Calendar, Listings, Messages, Menu. Desktop only; mobile uses MobileNav. */
function HostHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-[500] hidden border-b border-line bg-white md:block">
      <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-6 xl:px-20">
        <div className="flex-1"><Logo /></div>
        <nav className="flex gap-2">
          {HOST_TABS.map((t) => (
            <Link key={t.href} href={t.href} className={`rounded-full px-4 py-2 text-[15px] ${hostTabActive(t.href, pathname) ? "bg-soft font-semibold" : "text-muted hover:bg-soft hover:text-ink"}`}>
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end gap-2">
          <Link href="/switch?to=travelling" className="rounded-full px-4 py-3 text-sm font-semibold hover:bg-soft">Switch to travelling</Link>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

export default function Header() {
  const pathname = usePathname();
  if (pathname === "/switch") return null;
  if (pathname.startsWith("/hosting")) return <HostHeader />;
  return <GuestHeader />;
}

function GuestHeader() {
  const pathname = usePathname();
  const params = useSearchParams();
  const { user } = useUser();
  const isHome = pathname === "/";
  const [atTop, setAtTop] = useState(true);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setAtTop(window.scrollY < 10);
      setOpen(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Close the expanded search whenever the route or query changes (adjusting state during render).
  const routeKey = pathname + params.toString();
  const [lastRoute, setLastRoute] = useState(routeKey);
  if (routeKey !== lastRoute) {
    setLastRoute(routeKey);
    setOpen(false);
  }

  const expanded = open || (isHome && atTop);
  const ci = params.get("check_in");
  const co = params.get("check_out");
  const g = Number(params.get("guests") ?? 0);
  const narrow = pathname.startsWith("/rooms") || pathname.startsWith("/book");

  return (
    <>
      <header className={`sticky top-0 z-[500] border-line bg-white md:border-b ${expanded ? "md:pb-5" : ""} ${isHome ? "" : "hidden md:block"}`}>
        {/* Desktop */}
        <div className={`mx-auto hidden h-20 items-center justify-between px-6 md:flex xl:px-20 ${narrow ? "max-w-[1280px]" : ""}`}>
          <div className="flex-1">
            <Logo />
          </div>
          {expanded ? (
            <nav className="flex gap-8 text-[15px]">
              <span className="border-b-2 border-ink pb-1 font-semibold">Homes</span>
              <Link href="/coming-soon?f=Experiences" className="pb-1 text-muted hover:text-ink">Experiences</Link>
              <Link href="/coming-soon?f=Services" className="pb-1 text-muted hover:text-ink">Services</Link>
            </nav>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="flex items-center rounded-full border border-line py-2 pl-6 pr-2 text-sm shadow-pill transition-shadow hover:shadow-card"
            >
              <span className="font-semibold">{params.get("location") || "Anywhere"}</span>
              <span className="mx-4 h-6 w-px bg-line" />
              <span className="font-semibold">{ci && co ? `${shortDate(ci)} – ${shortDate(co)}` : "Any week"}</span>
              <span className="mx-4 h-6 w-px bg-line" />
              <span className={g ? "font-semibold" : "text-muted"}>{g ? plural(g, "guest") : "Add guests"}</span>
              <span className="btn-brand ml-3 flex h-8 w-8 items-center justify-center !rounded-full">
                <Search size={14} strokeWidth={3} />
              </span>
            </button>
          )}
          <div className="flex flex-1 items-center justify-end gap-1">
            <Link href="/switch?to=hosting" className="hidden rounded-full px-4 py-3 text-sm font-semibold hover:bg-soft lg:block">
              {user?.is_host ? "Switch to hosting" : "Airbnb your home"}
            </Link>
            <button onClick={() => toast("English (IN) · ₹ INR")} className="mr-2 rounded-full p-3 hover:bg-soft" aria-label="Language and currency">
              <Globe size={18} />
            </button>
            <UserMenu />
          </div>
        </div>
        {expanded && (
          <div className="hidden px-6 md:block">
            <SearchBar key={params.toString()} onDone={() => setOpen(false)} />
          </div>
        )}

        {/* Mobile: only Explore has a search bar, like the app */}
        {isHome && (
          <div className="px-4 pb-3 pt-4 md:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex w-full items-center justify-center gap-2.5 rounded-full bg-white py-4 text-[15px] font-semibold shadow-[0_3px_16px_rgba(0,0,0,0.14)]"
            >
              <Search size={18} strokeWidth={2.5} />
              {params.get("location") || "Start your search"}
            </button>
          </div>
        )}
      </header>
      {open && <div className="fixed inset-0 z-[400] bg-black/25" onClick={() => setOpen(false)} />}
      <Modal open={mobileOpen} onClose={() => setMobileOpen(false)} size="full">
        <div className="-m-6 min-h-full bg-soft p-4">
          <SearchBar stacked onDone={() => setMobileOpen(false)} />
        </div>
      </Modal>
    </>
  );
}

/** Bottom tab bar on phones. Guest and host modes have different tabs; sub-screens (editor, threads, checkout) hide it. */
export function MobileNav() {
  const pathname = usePathname();
  const { user, setLoginOpen } = useUser();
  if (pathname === "/switch" || /^\/(rooms|book)\b|^\/messages\/.+|^\/hosting\/(listings|calendar|messages)\/.+/.test(pathname)) return null;

  const tab = (href: string, label: string, icon: React.ReactNode, active: boolean) => (
    <Link key={href} href={href} className={`flex flex-1 flex-col items-center gap-1 text-[11px] ${active ? "font-semibold text-rausch" : "text-muted"}`}>
      {icon}
      {label}
    </Link>
  );

  const hosting = pathname.startsWith("/hosting");
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[500] flex border-t border-line bg-white pb-[max(8px,env(safe-area-inset-bottom))] pt-2 md:hidden">
      {hosting ? (
        HOST_TABS.map((t) => tab(t.href, t.label, <t.icon size={24} strokeWidth={1.6} />, hostTabActive(t.href, pathname)))
      ) : (
        <>
          {tab("/", "Explore", <Search size={24} strokeWidth={1.6} />, pathname === "/")}
          {tab("/wishlists", "Wishlists", <Heart size={24} strokeWidth={1.6} />, pathname === "/wishlists")}
          {tab("/trips", "Trips", <Belo size={24} />, pathname.startsWith("/trips"))}
          {user && tab("/messages", "Messages", <MessageSquare size={24} strokeWidth={1.6} />, pathname.startsWith("/messages"))}
          {user ? (
            tab("/profile", "Profile", <span className={`rounded-full ${pathname === "/profile" ? "ring-2 ring-rausch ring-offset-1" : ""}`}><Avatar src={user.avatar_url} name={user.name} size={24} /></span>, pathname === "/profile")
          ) : (
            <button onClick={() => setLoginOpen(true)} className="flex flex-1 flex-col items-center gap-1 text-[11px] text-muted">
              <UserRound size={24} strokeWidth={1.6} />
              Log in
            </button>
          )}
        </>
      )}
    </nav>
  );
}

/** Floating black pill above the tab bar ("Switch to hosting" / "Switch to travelling"). */
export function SwitchPill({ to }: { to: "hosting" | "travelling" }) {
  return (
    <Link
      href={`/switch?to=${to}`}
      className="fixed bottom-24 left-1/2 z-[450] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-ink px-6 py-3.5 text-[15px] font-semibold text-white shadow-card md:bottom-10"
    >
      <ArrowLeftRight size={18} /> Switch to {to}
    </Link>
  );
}

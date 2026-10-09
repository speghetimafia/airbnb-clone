"use client";

import { Globe, Heart, Menu, Search, UserRound } from "lucide-react";
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
              <Link href="/coming-soon?f=Messages" onClick={go} className={`${item} font-semibold`}>Messages</Link>
              <Link href="/trips" onClick={go} className={`${item} font-semibold`}>Trips</Link>
              <Link href="/wishlists" onClick={go} className={`${item} font-semibold`}>Wishlists</Link>
              <hr className="my-2 border-line" />
              <Link href="/hosting" onClick={go} className={item}>{user.is_host ? "Manage listings" : "Airbnb your home"}</Link>
              <Link href="/coming-soon?f=Identity verification" onClick={go} className={item}>Account</Link>
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

export default function Header() {
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
      <header className={`sticky top-0 z-[500] border-b border-line bg-white ${expanded ? "md:pb-5" : ""}`}>
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
            <Link href="/hosting" className="hidden rounded-full px-4 py-3 text-sm font-semibold hover:bg-soft lg:block">
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

        {/* Mobile */}
        <div className="flex items-center gap-3 px-4 py-3 md:hidden">
          <button onClick={() => setMobileOpen(true)} className="flex flex-1 items-center justify-center gap-2 rounded-full border border-line py-3 shadow-pill">
            <Search size={16} strokeWidth={3} />
            <span className="text-sm font-semibold">{params.get("location") || "Start your search"}</span>
          </button>
        </div>
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

export function MobileNav() {
  const pathname = usePathname();
  const { user, setLoginOpen } = useUser();
  const tab = (href: string, label: string, icon: React.ReactNode) => (
    <Link href={href} className={`flex flex-col items-center gap-1 text-[10px] ${pathname === href ? "text-rausch" : "text-muted"}`}>
      {icon}
      {label}
    </Link>
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[500] flex justify-around border-t border-line bg-white py-2 md:hidden">
      {tab("/", "Explore", <Search size={22} />)}
      {tab("/wishlists", "Wishlists", <Heart size={22} />)}
      {tab("/trips", "Trips", <Belo size={22} />)}
      {user ? (
        tab("/hosting", user.is_host ? "Hosting" : "Profile", <Avatar src={user.avatar_url} name={user.name} size={22} />)
      ) : (
        <button onClick={() => setLoginOpen(true)} className="flex flex-col items-center gap-1 text-[10px] text-muted">
          <UserRound size={22} />
          Log in
        </button>
      )}
    </nav>
  );
}

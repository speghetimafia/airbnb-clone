"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, del, post, session } from "./api";
import type { UserDetail } from "./types";

type Ctx = {
  user: UserDetail | null;
  ready: boolean;
  login: (id: number) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  /** Returns true when logged in; otherwise opens the login modal. */
  requireLogin: () => boolean;
  loginOpen: boolean;
  setLoginOpen: (open: boolean) => void;
  saved: Set<number>;
  toggleSaved: (listingId: number) => void;
};

const UserContext = createContext<Ctx | null>(null);

async function fetchSession(): Promise<{ user: UserDetail | null; saved: Set<number> }> {
  if (!session.get()) return { user: null, saved: new Set() };
  try {
    const [me, ids] = await Promise.all([api<UserDetail>("/me"), api<number[]>("/wishlist/ids")]);
    return { user: me, saved: new Set(ids) };
  } catch {
    session.set(null); // stale id (e.g. DB reseeded)
    return { user: null, saved: new Set() };
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [ready, setReady] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    const s = await fetchSession();
    setUser(s.user);
    setSaved(s.saved);
  }, []);

  useEffect(() => {
    fetchSession().then((s) => {
      setUser(s.user);
      setSaved(s.saved);
      setReady(true);
    });
  }, []);

  const login = async (id: number) => {
    session.set(id);
    await load();
    setLoginOpen(false);
  };

  const logout = () => {
    session.set(null);
    setUser(null);
    setSaved(new Set());
    toast("Logged out");
  };

  const requireLogin = () => {
    if (user) return true;
    setLoginOpen(true);
    return false;
  };

  const toggleSaved = (id: number) => {
    if (!requireLogin()) return;
    const wasSaved = saved.has(id);
    const next = new Set(saved);
    if (wasSaved) next.delete(id);
    else next.add(id);
    setSaved(next); // optimistic
    (wasSaved ? del(`/wishlist/${id}`) : post(`/wishlist/${id}`))
      .then(() => toast(wasSaved ? "Removed from wishlist" : "Saved to wishlist"))
      .catch(() => {
        setSaved(saved);
        toast.error("Couldn't update your wishlist");
      });
  };

  return (
    <UserContext.Provider
      value={{ user, ready, login, logout, refresh: load, requireLogin, loginOpen, setLoginOpen, saved, toggleSaved }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}

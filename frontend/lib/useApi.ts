"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

type Result<T> = { key: string; data: T | null; error: string | null };

/**
 * GET a path and track loading/error. Pass null to skip (e.g. until logged in).
 * reload() refetches in the background and keeps showing the current data meanwhile.
 */
export function useApi<T>(path: string | null) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<Result<T>>({ key: "", data: null, error: null });
  const key = path ? `${path}#${version}` : "";

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    api<T>(path)
      .then((data) => !cancelled && setResult({ key, data, error: null }))
      .catch((e: Error) => !cancelled && setResult((r) => ({ key, data: r.key.startsWith(`${path}#`) ? r.data : null, error: e.message })));
    return () => {
      cancelled = true;
    };
  }, [path, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  // Data from a previous path never leaks into a new one; a reload of the same path keeps it.
  const same = !!path && result.key.startsWith(`${path}#`);
  return { data: same ? result.data : null, error: same ? result.error : null, loading: !!path && result.key !== key, reload };
}

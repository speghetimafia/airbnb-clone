export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

const USER_KEY = "airbnb_user_id";

export const session = {
  get(): number | null {
    try {
      const v = localStorage.getItem(USER_KEY);
      return v ? Number(v) : null;
    } catch {
      return null;
    }
  },
  set(id: number | null) {
    try {
      if (id) localStorage.setItem(USER_KEY, String(id));
      else localStorage.removeItem(USER_KEY);
    } catch {}
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** FastAPI errors are either {detail: "msg"} or {detail: [{msg, loc}]} for validation. */
function errorMessage(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown })?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) {
    const d = detail[0];
    const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : "";
    return `${field && field !== "body" ? `${field}: ` : ""}${String(d.msg).replace(/^Value error, /, "")}`;
  }
  return fallback;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const uid = session.get();
  if (uid) headers.set("X-User-Id", String(uid));
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_URL}/api${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, errorMessage(body, `Something went wrong (${res.status})`));
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
export const put = <T>(path: string, body: unknown) => api<T>(path, { method: "PUT", body: JSON.stringify(body) });
export const del = (path: string) => api<void>(path, { method: "DELETE" });

/** Uploaded photos come back as /uploads/x.jpg on the API host. */
export const img = (url: string) => (url.startsWith("/uploads/") ? `${API_URL}${url}` : url);

export function qs(params: Record<string, string | number | null | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== "") p.set(k, String(v));
  return p.toString();
}

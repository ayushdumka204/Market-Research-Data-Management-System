const BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
export function token() {
  return localStorage.getItem("nexgen_token") || "";
}
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  )
    headers.set("Content-Type", "application/json");
  if (token()) headers.set("Authorization", `Bearer ${token()}`);
  const response = await fetch(
    `${BASE}${path.startsWith("/") ? path : `/${path}`}`,
    { ...options, headers },
  );
  if (response.status === 204) return undefined as T;
  const data = await response
    .json()
    .catch(() => ({ message: "The server returned an unreadable response." }));
  if (!response.ok)
    throw new Error(data.message || `Request failed (${response.status})`);
  return data as T;
}
export const body = (value: unknown) => JSON.stringify(value);
export function saveSession(accessToken: string, user: any) {
  localStorage.setItem("nexgen_token", accessToken);
  localStorage.setItem("nexgen_user", JSON.stringify(user));
}
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("nexgen_user") || "null");
  } catch {
    return null;
  }
}
export function clearSession() {
  localStorage.removeItem("nexgen_token");
  localStorage.removeItem("nexgen_user");
}
export function apiBase() {
  return BASE;
}

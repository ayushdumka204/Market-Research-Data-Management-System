const BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
export function getToken() {
  return localStorage.getItem("nexgen_token") || "";
}
export function setSession(token: string, user: unknown) {
  localStorage.setItem("nexgen_token", token);
  localStorage.setItem("nexgen_user", JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem("nexgen_token");
  localStorage.removeItem("nexgen_user");
}
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (
    !(options.body instanceof FormData) &&
    options.body &&
    !headers.has("Content-Type")
  )
    headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error(
      "Could not connect to the server. Check API URL and backend availability.",
    );
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    if (!response.ok) throw new Error(`Request failed (${response.status}).`);
    return (await response.text()) as T;
  }
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || `Request failed (${response.status}).`);
  return data as T;
}
export function downloadCsv(path: string, filename: string) {
  return api<any>(path).then((data) => {
    const csv = typeof data === "string" ? data : data.csv;
    const blob = new Blob([csv || ""], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
}

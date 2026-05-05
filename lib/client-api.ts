/**
 * Use absolute URLs for `/api/*` so failures match the tab you actually opened
 * (for example `localhost:3001` versus `:3000`).
 */
export function apiUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return normalized;
  return `${window.location.origin}${normalized}`;
}

/** User-visible hint when fetch fails before a response (wrong port, dev stopped, etc.). */
export function describeApiUnreachable(): string {
  if (typeof window === "undefined") {
    return "Cannot reach the API. Ensure Next.js is running (npm run dev).";
  }

  const origin = window.location.origin;
  return `Cannot reach the API from ${origin}. Run npm run dev from the project folder and open the URL shown in the terminal (try ${origin}/api/health — it should return {"ok":true}). If port 3000 is busy, Next may use 3001; match that URL in your browser.`;
}

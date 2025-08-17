// Central place to resolve API base URL depending on deployment environment
// In Netlify, define VITE_API_BASE / VITE_RENDER_API in site environment variables pointing to Render backend URL

export function getApiBase(): string {
  // Netlify/Vite exposes vars as import.meta.env.VITE_*
  const envBase = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_RENDER_API;
  if (envBase) return envBase.replace(/\/$/, '');
  // Fallback to relative during local dev (proxied by Vite dev server)
  return '';
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const base = getApiBase();
  const url = base ? `${base}${path}` : path; // path expected to start with /api
  return fetch(url, init);
}

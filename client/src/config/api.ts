const rawApiUrl = (import.meta.env.VITE_API_URL ?? "").trim();

if (import.meta.env.PROD && !rawApiUrl) {
  throw new Error("Missing VITE_API_URL in production");
}

export const API_BASE = rawApiUrl.replace(/\/+$/, "");

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${normalizedPath}` : normalizedPath;
};

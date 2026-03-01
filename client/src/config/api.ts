export const API_BASE = import.meta.env.VITE_API_BASE ?? import.meta.env.VITE_API_URL ?? "http://localhost:5000";
export const apiUrl = (path: string) => `${API_BASE.replace(/\/$/,"")}${path.startsWith('/') ? '' : '/'}${path}`;

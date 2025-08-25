// lib/url.ts
export const APP_URL =
  (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');

export const reportUrl = (id: string) => `${APP_URL}/report/${encodeURIComponent(id)}`;

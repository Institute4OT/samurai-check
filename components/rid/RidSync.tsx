// components/rid/RidSync.tsx
'use client';

import { useEffect } from 'react';

export default function RidSync({ rid }: { rid?: string | null }) {
  useEffect(() => {
    const v = String(rid ?? '').trim();
    if (!v) return;
    try {
      localStorage.setItem('samurai:rid', v);
    } catch {}
    try {
      sessionStorage.setItem('samurai:rid', v);
    } catch {}
    try {
      // 30分だけ有効なクッキー
      document.cookie = `samurai_rid=${encodeURIComponent(v)}; Path=/; Max-Age=1800; SameSite=Lax`;
    } catch {}
  }, [rid]);
  return null;
}

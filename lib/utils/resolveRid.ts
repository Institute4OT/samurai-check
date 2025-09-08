// lib/utils/resolveRid.ts
export function isIdish(v?: string | null): boolean {
  if (!v) return false;
  const s = v.trim();
  const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const ulid = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  const generic = /^[A-Za-z0-9_-]{16,}$/;
  return uuid.test(s) || ulid.test(s) || generic.test(s);
}

export function resolveRidFromEnv(): string | null {
  try {
    const u = new URL(window.location.href);
    // 1) クエリ
    const q = u.searchParams.get('rid') || u.searchParams.get('resultId') || u.searchParams.get('id');
    if (isIdish(q)) return q!.trim();
    // 2) パス
    const segs = u.pathname.split('/').filter(Boolean);
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = decodeURIComponent(segs[i] || '');
      if (isIdish(s)) return s.trim();
    }
    // 3) Storage
    const keys = ['samurai:rid','samurai_last_rid','reportRid','resultId','rid'];
    for (const k of keys) {
      try { const v = localStorage.getItem(k); if (isIdish(v)) return v!.trim(); } catch {}
      try { const v = sessionStorage.getItem(k); if (isIdish(v)) return v!.trim(); } catch {}
    }
    // 4) Cookie
    const m = document.cookie.match(/(?:^|;\s*)samurai_rid=([^;]+)/);
    if (m && isIdish(m[1])) return decodeURIComponent(m[1]).trim();
    return null;
  } catch { return null; }
}

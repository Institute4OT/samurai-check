// /lib/utils/resolveRid.ts
// rid（結果ID）の解決・生成・同期ユーティリティ（URL/Storage/Cookie すべて面倒みる）

/** UUID / ULID / 16+英数[_-] を許容 */
export function isIdish(v: string | null | undefined): v is string {
  if (!v) return false;
  const s = v.trim();
  const uuid =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const ulid = /^[0-9A-HJKMNP-TV-Z]{26}$/; // Crockford
  const generic = /^[A-Za-z0-9_-]{16,}$/;
  return uuid.test(s) || ulid.test(s) || generic.test(s);
}

/** URL（?rid / ?resultId / パス末尾）→ Storage → Cookie の順で探索 */
export function resolveRidFromEnv(): string | null {
  try {
    // 1) URLクエリ
    const u = new URL(window.location.href);
    const q =
      u.searchParams.get("rid") ||
      u.searchParams.get("resultId") ||
      u.searchParams.get("id");
    if (isIdish(q)) return q!.trim();

    // 2) パス末尾
    const segs = window.location.pathname.split("/").filter(Boolean);
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = decodeURIComponent(segs[i] || "");
      if (isIdish(s)) return s.trim();
    }

    // 3) Storage 群
    const keys = [
      "samurai:rid",
      "samurai_last_rid",
      "reportRid",
      "resultId",
      "rid",
    ];
    for (const k of keys) {
      try {
        const v = localStorage.getItem(k);
        if (isIdish(v)) return v!.trim();
      } catch {}
      try {
        const v = sessionStorage.getItem(k);
        if (isIdish(v)) return v!.trim();
      } catch {}
    }

    // 4) Cookie
    const m = document.cookie.match(/(?:^|;\s*)samurai_rid=([^;]+)/);
    const v = m ? decodeURIComponent(m[1]) : null;
    if (isIdish(v)) return v!.trim();

    return null;
  } catch {
    return null;
  }
}

/** rid を localStorage / sessionStorage / Cookie / URL に同期 */
export function syncRidEverywhere(rid: string, opts?: { alsoUrl?: boolean }) {
  if (!isIdish(rid)) return;
  const r = rid.trim();

  try {
    localStorage.setItem("samurai:rid", r);
    localStorage.setItem("samurai_last_rid", r);
  } catch {}
  try {
    sessionStorage.setItem("samurai:rid", r);
  } catch {}
  try {
    document.cookie = `samurai_rid=${encodeURIComponent(r)}; Path=/; Max-Age=1800; SameSite=Lax`;
  } catch {}

  if (opts?.alsoUrl) {
    try {
      const url = new URL(window.location.href);
      // 両方のキーを揃えておく（互換のため）
      url.searchParams.set("rid", r);
      url.searchParams.set("resultId", r);
      // 同じパスで置換（履歴は汚さない）
      window.history.replaceState(null, "", url.toString());
    } catch {}
  }
}

/** rid を確実に手に入れて、全域に同期して返す（なければ生成） */
export function ensureRid(initial?: string | null): string {
  let rid: string | null =
    (initial && isIdish(initial) ? initial.trim() : null) ||
    resolveRidFromEnv();

  if (!isIdish(rid)) {
    // 生成（UUID優先／なければ簡易）
    try {
      rid = crypto.randomUUID();
    } catch {
      rid = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    }
  }
  syncRidEverywhere(rid!, { alsoUrl: true });
  return rid!;
}

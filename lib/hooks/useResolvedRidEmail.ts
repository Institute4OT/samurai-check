// /lib/hooks/useResolvedRidEmail.ts
'use client';

import { useEffect, useMemo, useState } from 'react';

/** UUIDらしさ簡易判定（ハイフン有無OK） */
function isUuidish(v?: string | null): v is string {
  if (!v) return false;
  const s = v.trim();
  return /^[0-9a-fA-F-]{30,}$/.test(s);
}

/** 任意URL文字列から rid/email を抜く */
function pickFromUrl(urlLike?: string | null) {
  try {
    if (!urlLike) return { rid: null as string | null, email: null as string | null };
    const u = new URL(urlLike);
    const rid = u.searchParams.get('rid') || u.searchParams.get('id');
    const email = u.searchParams.get('email');
    return {
      rid: isUuidish(rid) ? rid! : null,
      email: email && /\S+@\S+\.\S+/.test(email) ? email : null,
    };
  } catch {
    return { rid: null as string | null, email: null as string | null };
  }
}

/** localStorage の候補キーを総当り */
function readRidFromStorage(): string | null {
  const keys = ['samurai:rid', 'samurai_last_rid', 'reportRid', 'resultId', 'rid'];
  for (const k of keys) {
    try {
      const v = localStorage.getItem(k);
      if (isUuidish(v)) return v!;
    } catch {}
  }
  return null;
}
function readEmailFromStorage(): string | null {
  const keys = ['samurai:email', 'reportEmail', 'userEmail', 'contactEmail'];
  for (const k of keys) {
    try {
      const v = localStorage.getItem(k);
      if (v && /\S+@\S+\.\S+/.test(v)) return v;
    } catch {}
  }
  return null;
}

export function useResolvedRidEmail() {
  // 1) 初期スキャン（URL > LS > referrer）
  const urlPick = typeof window !== 'undefined' ? pickFromUrl(window.location.href) : { rid: null, email: null };
  const [rid, setRid] = useState<string>(urlPick.rid || '');
  const [email, setEmail] = useState<string>(urlPick.email || '');

  // URLに rid があればロック扱い（表示はするが、基本はそのまま使う想定）
  const ridLocked = !!urlPick.rid;

  useEffect(() => {
    // ridが未取得ならLS
    if (!rid) {
      const fromLS = readRidFromStorage();
      if (fromLS) setRid(fromLS);
    }
    // emailが未取得ならLS
    if (!email) {
      const fromLS = readEmailFromStorage();
      if (fromLS) setEmail(fromLS);
    }
  }, []); // 初回のみ

  // referrerフォールバック（最後の砦）
  useEffect(() => {
    if (rid) return;
    const refPick = pickFromUrl(typeof document !== 'undefined' ? document.referrer : null);
    if (refPick.rid) setRid(refPick.rid);
    if (!email && refPick.email) setEmail(refPick.email);
  }, [rid, email]);

  // 取得できたら保存
  useEffect(() => {
    if (rid) {
      try { localStorage.setItem('samurai:rid', rid); } catch {}
    }
  }, [rid]);
  useEffect(() => {
    if (email && /\S+@\S+\.\S+/.test(email)) {
      try { localStorage.setItem('samurai:email', email); } catch {}
    }
  }, [email]);

  return { rid, ridLocked, email, setEmail };
}

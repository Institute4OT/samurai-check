// lib/hooks/useResolvedRidEmail.ts
"use client";

import { useEffect, useState } from "react";

type UseResolvedRidEmail = {
  rid: string;
  ridLocked: boolean; // URLから取得したら true（ユーザー編集させない等の判定に）
  email: string;
  setEmail: (v: string) => void;
};

function readRidFromUrl(): string | null {
  try {
    const u = new URL(window.location.href);
    return (
      u.searchParams.get("rid") ||
      u.searchParams.get("resultId") || // 旧表記の保険
      u.searchParams.get("id")
    );
  } catch {
    return null;
  }
}

function readRidFromStorages(): string | null {
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
      if (v && v.trim()) return v.trim();
    } catch {}
    try {
      const v = sessionStorage.getItem(k);
      if (v && v.trim()) return v.trim();
    } catch {}
  }
  return null;
}

function readRidFromCookie(): string | null {
  try {
    const m = document.cookie.match(/(?:^|;\s*)samurai_rid=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

function readRidFromReferrer(): string | null {
  try {
    const u = new URL(document.referrer);
    return (
      u.searchParams.get("rid") ||
      u.searchParams.get("resultId") ||
      u.searchParams.get("id")
    );
  } catch {
    return null;
  }
}

export function useResolvedRidEmail(): UseResolvedRidEmail {
  const [rid, setRid] = useState("");
  const [ridLocked, setRidLocked] = useState(false);
  const [email, setEmail] = useState("");

  // email は控えとして保持（任意）
  useEffect(() => {
    try {
      setEmail(localStorage.getItem("samurai:email") || "");
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("samurai:email", email);
    } catch {}
  }, [email]);

  // rid を多段で解決：URL → Storage → Cookie → Referrer
  useEffect(() => {
    const fromUrl = readRidFromUrl()?.trim();
    const fromStorage = readRidFromStorages();
    const fromCookie = readRidFromCookie();
    const fromReferrer = readRidFromReferrer();

    const found = fromUrl || fromStorage || fromCookie || fromReferrer;
    if (found) {
      const v = found.trim();
      setRid(v);
      setRidLocked(Boolean(fromUrl)); // URLに明示されていたらLock
      try {
        localStorage.setItem("samurai:rid", v);
        sessionStorage.setItem("samurai:rid", v);
        document.cookie = `samurai_rid=${encodeURIComponent(v)}; Path=/; Max-Age=1800; SameSite=Lax`;
      } catch {}
    }
  }, []);

  return { rid, ridLocked, email, setEmail };
}

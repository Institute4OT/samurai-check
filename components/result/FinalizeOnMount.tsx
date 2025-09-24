"use client";

import { useEffect } from "react";

type Cat = { key: string; score: number };

type Props = {
  rid?: string | null;
  samuraiTypeKey?: string | null;
  samuraiTypeJa?: string | null;
  categories: Cat[];
  /** 追加：回答スナップショット（QID→選択肢リスト） */
  scorePattern?: Record<string, string[]> | null;
};

/** URL/Storage/Cookie へ書き戻す */
function syncRidEverywhere(id: string) {
  try {
    localStorage.setItem("samurai:rid", id);
    sessionStorage.setItem("samurai:rid", id);
  } catch {}
  try {
    document.cookie = `samurai_rid=${encodeURIComponent(id)}; Path=/; Max-Age=1800; SameSite=Lax`;
  } catch {}
  try {
    const u = new URL(window.location.href);
    u.searchParams.set("rid", id);
    window.history.replaceState(null, "", u.toString());
  } catch {}
}

/** ざっくり ID っぽいか判定（UUID/ULID/NanoID などを許容） */
function isIdish(v?: string | null) {
  if (!v) return false;
  const s = v.trim();
  const uuid =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const ulid = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  const generic = /^[A-Za-z0-9_-]{16,}$/;
  return uuid.test(s) || ulid.test(s) || generic.test(s);
}

export default function FinalizeOnMount({
  rid,
  samuraiTypeKey,
  samuraiTypeJa,
  categories,
  scorePattern,
}: Props) {
  useEffect(() => {
    (async () => {
      let id = (rid || "").trim();
      if (!isIdish(id)) {
        id = (
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
        )
          .replace(/[^A-Za-z0-9_-]/g, "");
      }
      syncRidEverywhere(id);

      // ★console.logを追加
      console.log("👀[FinalizeOnMount] fetch送信body:", {
        rid: id,
        samurai_type_key: samuraiTypeKey ?? null,
        samurai_type_ja: samuraiTypeJa ?? null,
        categories_json:
          categories?.map((c) => ({
            key: c.key,
            score: Number(c.score),
          })) ?? [],
        score_pattern: scorePattern ?? null,
      });

      try {
        await fetch("/api/results/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rid: id,
            samurai_type_key: samuraiTypeKey ?? null,
            samurai_type_ja: samuraiTypeJa ?? null,
            categories_json:
              categories?.map((c) => ({
                key: c.key,
                score: Number(c.score),
              })) ?? [],
            score_pattern: scorePattern ?? null,
          }),
        });
      } catch (e) {
        console.warn("[FinalizeOnMount] finalize failed:", e);
      }
    })();
  }, [rid, samuraiTypeKey, samuraiTypeJa, categories, scorePattern]);

  return null;
}

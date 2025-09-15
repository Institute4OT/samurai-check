// /components/rid/RidSync.tsx
"use client";

import { useEffect } from "react";
import {
  ensureRid,
  isIdish,
  resolveRidFromEnv,
  syncRidEverywhere,
} from "@/lib/utils/resolveRid";

/**
 * rid を URL/Storage/Cookie に同期。
 * props.rid が無い場合でも、環境から解決 → それでも無ければ生成して同期。
 */
export default function RidSync({
  rid,
  alsoUrl = true,
}: {
  rid?: string | null;
  alsoUrl?: boolean;
}) {
  useEffect(() => {
    if (rid && isIdish(rid)) {
      syncRidEverywhere(rid, { alsoUrl });
      return;
    }
    // 環境から拾う or 生成
    const found = resolveRidFromEnv();
    if (found && isIdish(found)) {
      syncRidEverywhere(found, { alsoUrl });
    } else {
      ensureRid(null); // 生成して同期（URLにも反映）
    }
  }, [rid, alsoUrl]);
  return null;
}

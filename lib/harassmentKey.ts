// /lib/harassmentKey.ts
// 「無自覚ハラ傾向」まわりのキーゆれを吸収して数値に正規化
export function ensureHarassmentAliases<T extends Record<string, any>>(scores: T) {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = (scores as any)?.[k];
      if (v != null && v !== "") return Number(v) || 0;
    }
    return 0;
  };

  // 旧キー/日本語キーも拾って awareness に反映
  const v = pick(
    "harassmentAwareness",
    "harassment",
    "harassmentRisk",
    "無自覚ハラ傾向",
    "無自覚ハラスメント傾向"
  );

  return {
    ...scores,
    harassmentAwareness: v,
    harassmentRisk: v,
  } as T & { harassmentAwareness: number; harassmentRisk: number };
}

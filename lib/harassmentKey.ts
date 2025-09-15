// /lib/harassmentKey.ts
export function ensureHarassmentAliases<T extends Record<string, any>>(scores: T) {
  const v = Number(scores.harassmentAwareness ?? scores.harassmentRisk ?? 0);
  return { ...scores, harassmentAwareness: v, harassmentRisk: v } as T & {
    harassmentAwareness: number;
    harassmentRisk: number;
  };
}

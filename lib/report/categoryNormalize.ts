// lib/report/categoryNormalize.ts
export type CategoryKey =
  | 'delegation'
  | 'orgDrag'
  | 'commGap'
  | 'updatePower'
  | 'genGap'
  | 'harassmentRisk';

export type CategoryScore = {
  key: CategoryKey;
  label: string;
  score: number; // 0–3
};

// UI表示名（和名）
export const JP_LABEL_BY_KEY: Record<CategoryKey, string> = {
  delegation: '権限委譲・構造整合性',
  orgDrag: '組織進化阻害',
  commGap: 'コミュ力',
  updatePower: 'アップデート力',
  genGap: 'ジェネギャップ感覚',
  harassmentRisk: '無自覚ハラスメント傾向',
};

// 表示順（固定）
export const ORDER: CategoryKey[] = [
  'delegation',
  'orgDrag',
  'commGap',
  'updatePower',
  'genGap',
  'harassmentRisk',
];

// 異表記 → 社内標準キー
const KEY_ALIASES: Record<string, CategoryKey> = {
  delegation: 'delegation',

  orgdrag: 'orgDrag',
  org_inhibition: 'orgDrag',

  commgap: 'commGap',
  comm_gap: 'commGap',

  updatepower: 'updatePower',
  update_ability: 'updatePower',

  gengap: 'genGap',
  gen_gap: 'genGap',

  harassmentrisk: 'harassmentRisk',
  harassment_risk: 'harassmentRisk',
};

export const clamp03 = (n: unknown) => {
  const v = Number(n);
  if (!isFinite(v)) return 0;
  return Math.max(0, Math.min(3, v));
};

function asKey(raw: unknown): CategoryKey | null {
  if (!raw) return null;
  const k = String(raw).trim();
  const norm = k.replace(/[\s_-]/g, '').toLowerCase();
  return KEY_ALIASES[norm] ?? null;
}

/** どんな形で来ても { key, label, score }[] に統一する */
export function normalizeCategories(input: unknown): CategoryScore[] {
  const bucket = new Map<CategoryKey, number>();

  // 1) 配列 [{key?, label?, score?}]
  if (Array.isArray(input)) {
    for (const it of input as any[]) {
      const k =
        asKey(it?.key) ??
        asKey(it?.category) ??
        // label が和名なら逆引き（完全一致）
        (Object.entries(JP_LABEL_BY_KEY).find(
          ([, jp]) => String(it?.label ?? '').trim() === jp
        )?.[0] as CategoryKey | undefined) ??
        null;
      if (!k) continue;
      bucket.set(k, clamp03(it?.score));
    }
  }
  // 2) オブジェクト { key: score }
  else if (input && typeof input === 'object') {
    for (const [rawKey, val] of Object.entries(input as Record<string, unknown>)) {
      const k = asKey(rawKey);
      if (!k) continue;
      bucket.set(k, clamp03(val));
    }
  }

  // 3) 足りないキーは 0 で補完。順番は固定
  return ORDER.map((k) => ({
    key: k,
    label: JP_LABEL_BY_KEY[k],
    score: bucket.get(k) ?? 0,
  }));
}

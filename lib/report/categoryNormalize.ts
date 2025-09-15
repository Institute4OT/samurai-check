// lib/report/categoryNormalize.ts
// ------------------------------------------------------------
// レポート表示用：カテゴリ名ラベルと配列化ユーティリティ
// - NormalizedCategoryScores の keyof を使うマップは
//   harassmentAwareness / harassmentRisk の“両方”を持たせて型を満たす
// - 既存コードとの互換用に、よく使われるエイリアス名も export しておく
// ------------------------------------------------------------

import type {
  CategoryKey,
  NormalizedCategoryScores,
} from '@/types/diagnosis';

/** 表示順（レポート用に固定） */
export const CATEGORY_ORDER: CategoryKey[] = [
  'delegation',
  'orgDrag',
  'commGap',
  'updatePower',
  'genGap',
  'harassmentAwareness',
];

/** 0〜3にクランプ＋丸め（小数1桁） */
function clamp03(v: number, digits = 1) {
  const x = Math.max(0, Math.min(3, Number(v ?? 0)));
  const p = Math.pow(10, digits);
  return Math.round(x * p) / p;
}

/** awareness / risk を常に両方そろえる（ランタイム安全化） */
export function ensureHarassmentAliases<T extends Record<string, any>>(scores: T) {
  const v = Number(scores.harassmentAwareness ?? scores.harassmentRisk ?? 0);
  return { ...scores, harassmentAwareness: v, harassmentRisk: v } as T & {
    harassmentAwareness: number;
    harassmentRisk: number;
  };
}

/** ラベル表（NormalizedCategoryScores の keyof を満たす） */
export const DEFAULT_LABELS: Record<keyof NormalizedCategoryScores, string> = {
  delegation: '権限委譲・構造健全度',
  orgDrag: '組織進化阻害',
  commGap: 'コミュ力誤差',
  updatePower: 'アップデート力',
  genGap: 'ジェネギャップ感覚',
  // ★両方を“必ず”定義する（型満たし＋互換）
  harassmentAwareness: '無自覚ハラ傾向',
  harassmentRisk: '無自覚ハラ傾向',
};

/** 行データ型（表やグラフに流しやすい形） */
export type CategoryRow = {
  key: CategoryKey;
  label: string;
  value: number;   // 0〜3
};

/** スコアを配列（表示順）に整形 */
export function toCategoryRows(
  scores: NormalizedCategoryScores,
  labels: Record<keyof NormalizedCategoryScores, string> = DEFAULT_LABELS,
): CategoryRow[] {
  const s = ensureHarassmentAliases(scores);
  return CATEGORY_ORDER.map((k) => ({
    key: k,
    label: labels[k],
    value: clamp03((s as any)[k]),
  }));
}

/** ラベルだけ必要な箇所向けの別名（互換） */
export const LABELS = DEFAULT_LABELS;
export const categoryLabels = DEFAULT_LABELS;

/** 互換：以前この名前で呼んでいたコードがある場合の橋渡し */
export function normalizeCategories(
  scores: NormalizedCategoryScores,
  labels: Record<keyof NormalizedCategoryScores, string> = DEFAULT_LABELS,
) {
  return toCategoryRows(scores, labels);
}

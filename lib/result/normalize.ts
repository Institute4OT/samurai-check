// /lib/result/normalize.ts
// ------------------------------------------------------------
// 結果表示・集計ユーティリティ（フル機能 + 表記ゆれ吸収 + 互換API）
//  - 表示順/ラベルは report/categoryNormalize に統一
//  - harassmentAwareness / harassmentRisk は常に両方そろえる
//  - ALIASES で英名/和名/略称/スネーク等を正式キーへ寄せる
//  - グラフ用配列化、レコード化、上位/下位抽出、Zodスキーマ、ゆるい入力の吸収
//  - 互換API: normalizeToCatArray / resolveSamuraiType / getEmojiLabel を提供
// ------------------------------------------------------------

import type {
  CategoryKey,
  NormalizedCategoryScores,
  SamuraiType,
} from '@/types/diagnosis';
import { ensureHarassmentAliases } from '@/lib/harassmentKey';
import {
  CATEGORY_ORDER as CATEGORY_KEYS,          // 正式6カテゴリの順序配列
  DEFAULT_LABELS as LABELS_BY_CATEGORY,     // ラベル表（awareness/risk 両方あり）
} from '@/lib/report/categoryNormalize';
import { judgeSamurai } from '@/lib/samuraiJudge';
import { z } from 'zod';

/* ========== 基本ユーティリティ ========== */

/** 0〜3にクランプ */
export function clamp03(v: number): number {
  return Math.max(0, Math.min(3, Number.isFinite(v) ? Number(v) : 0));
}

/** 正式6カテゴリ配列/ラベル（エイリアス再公開） */
export { CATEGORY_KEYS, LABELS_BY_CATEGORY };

/* ========== 表記ゆれ吸収 ========== */

/** ラベル表記ゆれ → 正式キーへ（英名/和名/略称/アンダースコア等まとめて吸収） */
export const ALIASES: Record<string, CategoryKey> = {
  // delegation
  delegation: 'delegation',
  deleg: 'delegation',
  delegation_score: 'delegation',
  delegationlevel: 'delegation',
  '権限委譲・構造健全度': 'delegation',
  権限委譲: 'delegation',
  構造健全度: 'delegation',

  // orgDrag
  orgdrag: 'orgDrag',
  org_drag: 'orgDrag',
  organizationaldrag: 'orgDrag',
  '組織進化阻害': 'orgDrag',
  '組織の足かせ': 'orgDrag',

  // commGap
  commgap: 'commGap',
  comm_gap: 'commGap',
  communicationgap: 'commGap',
  'コミュ力誤差': 'commGap',
  'コミュニケーションギャップ': 'commGap',

  // updatePower
  updatepower: 'updatePower',
  update_power: 'updatePower',
  learningpower: 'updatePower',
  'アップデート力': 'updatePower',
  学習力: 'updatePower',
  変化対応力: 'updatePower',
  改善力: 'updatePower',

  // genGap
  gengap: 'genGap',
  gen_gap: 'genGap',
  generationgap: 'genGap',
  'ジェネギャップ感覚': 'genGap',
  世代ギャップ: 'genGap',

  // harassmentAwareness（※互換：harassmentRisk もここへ寄せる）
  harassmentawareness: 'harassmentAwareness',
  harassment_awareness: 'harassmentAwareness',
  harassment: 'harassmentAwareness',
  '無自覚ハラスメント傾向': 'harassmentAwareness',
  '無自覚ハラ傾向': 'harassmentAwareness',
  'ハラスメント傾向': 'harassmentAwareness',
  powahara: 'harassmentAwareness',
  sekuhara: 'harassmentAwareness',
  // 互換キー
  harassmentrisk: 'harassmentAwareness',
  harassment_risk: 'harassmentAwareness',
};

/** 任意のキー文字列を正式 CategoryKey へ寄せる（該当なしは undefined） */
export function normalizeCategoryKey(raw: string): CategoryKey | undefined {
  if (!raw) return undefined;
  const k = String(raw).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  return (ALIASES as Record<string, CategoryKey | undefined>)[k];
}

/* ========== 配列化/レコード化/抽出 ========== */

export function toRows(
  scores: NormalizedCategoryScores,
  labels: Record<keyof NormalizedCategoryScores, string> = LABELS_BY_CATEGORY,
): Array<{ key: CategoryKey; label: string; value: number }> {
  const s = ensureHarassmentAliases(scores);
  return CATEGORY_KEYS.map((k) => ({
    key: k,
    label: labels[k],
    value: clamp03((s as any)[k]),
  }));
}

export function toRecord(scores: NormalizedCategoryScores): Record<CategoryKey, number> {
  const s = ensureHarassmentAliases(scores);
  return CATEGORY_KEYS.reduce((acc, k) => {
    acc[k] = clamp03((s as any)[k]);
    return acc;
  }, {} as Record<CategoryKey, number>);
}

export function toRadarData(
  scores: NormalizedCategoryScores,
  labels: Record<keyof NormalizedCategoryScores, string> = LABELS_BY_CATEGORY,
): Array<{ category: string; value: number; fullMark: number }> {
  return toRows(scores, labels).map((r) => ({ category: r.label, value: r.value, fullMark: 3 }));
}

export function pickTop(scores: NormalizedCategoryScores, n = 2) {
  const rows = toRows(scores);
  return rows
    .sort((a, b) => (b.value !== a.value ? b.value - a.value : CATEGORY_KEYS.indexOf(a.key) - CATEGORY_KEYS.indexOf(b.key)))
    .slice(0, Math.max(0, n))
    .map((r) => ({ key: r.key, value: r.value }));
}

export function pickBottom(scores: NormalizedCategoryScores, n = 2) {
  const rows = toRows(scores);
  return rows
    .sort((a, b) => (a.value !== b.value ? a.value - b.value : CATEGORY_KEYS.indexOf(a.key) - CATEGORY_KEYS.indexOf(b.key)))
    .slice(0, Math.max(0, n))
    .map((r) => ({ key: r.key, value: r.value }));
}

/* ========== Zod & ゆるい入力の吸収 ========== */

/** NormalizedCategoryScores の受け入れスキーマ（harassmentRisk は互換用で optional） */
export const NormalizedScoresSchema = z.object({
  delegation: z.number().min(0).max(3),
  orgDrag: z.number().min(0).max(3),
  commGap: z.number().min(0).max(3),
  updatePower: z.number().min(0).max(3),
  genGap: z.number().min(0).max(3),
  harassmentAwareness: z.number().min(0).max(3),
  harassmentRisk: z.number().min(0).max(3).optional(),
}) as z.ZodType<NormalizedCategoryScores>;

/** 不正な入力を安全に NormalizedCategoryScores へ寄せる（ZodでOKならそのまま） */
export function coerceNormalized(input: unknown): NormalizedCategoryScores | undefined {
  const p = NormalizedScoresSchema.safeParse(input);
  if (p.success) return ensureHarassmentAliases(p.data);
  if (input && typeof input === 'object') {
    return coerceFromLooseObject(input as Record<string, any>);
  }
  return undefined;
}

/** ゆるいキー名のオブジェクトから正規スコアへ（ALIASES で寄せ、欠損は0） */
export function coerceFromLooseObject(obj: Record<string, any>): NormalizedCategoryScores {
  const base: Record<CategoryKey, number> = {
    delegation: 0,
    orgDrag: 0,
    commGap: 0,
    updatePower: 0,
    genGap: 0,
    harassmentAwareness: 0,
  };

  for (const [k, v] of Object.entries(obj)) {
    const key = normalizeCategoryKey(k);
    if (!key) continue;
    const num = clamp03(Number(v));
    base[key] = Math.max(base[key], num);
  }

  return ensureHarassmentAliases(base as unknown as NormalizedCategoryScores);
}

/* ========== 互換API（既存の import を壊さないための追加） ========== */

/** 旧名との互換：normalizeToCatArray → toRows と同義 */
export const normalizeToCatArray = toRows;

/** 旧UIが期待する“絵文字＋ラベル”表示用 */
export function getEmojiLabel(k: CategoryKey): string {
  const emoji: Record<CategoryKey, string> = {
    delegation: '🤝',
    orgDrag: '🧱',
    commGap: '🗣️',
    updatePower: '⚡',
    genGap: '👥',
    harassmentAwareness: '⚠️',
  };
  return `${emoji[k]} ${LABELS_BY_CATEGORY[k]}`;
}

/** SamuraiType を安全に解決（引数が無ければスコアから判定） */
const SAMURAI_TYPES: SamuraiType[] = [
  '真田幸村型','織田信長型','豊臣秀吉型','徳川家康型','上杉謙信型','斎藤道三型','今川義元型',
];
function isSamuraiType(v: any): v is SamuraiType {
  return typeof v === 'string' && (SAMURAI_TYPES as string[]).includes(v);
}

export function resolveSamuraiType(
  input?: unknown,
  scores?: NormalizedCategoryScores,
): SamuraiType | undefined {
  if (isSamuraiType(input)) return input;
  if (scores) {
    try { return judgeSamurai(scores); } catch { /* noop */ }
  }
  return undefined;
}

/* ========== 互換エクスポート（既存呼び出し温存） ========== */
export const toCategoryRows = toRows;
export const categoryKeys = CATEGORY_KEYS;
export const LABELS = LABELS_BY_CATEGORY;

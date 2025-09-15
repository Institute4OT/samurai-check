// /lib/result/normalize.ts
// ------------------------------------------------------------
// 結果表示・集計ユーティリティ（表記ゆれ吸収＋互換API＋ゆる受け）
//  - 表示順/ラベルは report/categoryNormalize に統一
//  - harassmentAwareness / harassmentRisk は常に両方そろえる
//  - ALIASES で英名/和名/略称/スネーク等を正式キーへ寄せる
//  - グラフ用配列化、レコード化、上位/下位抽出、Zodスキーマ、ゆるい入力の吸収
//  - 互換API: normalizeToCatArray / resolveSamuraiType / getEmojiLabel
//  - ★NEW: normalizeToCatArray は unknown/null を安全に受け付ける
// ------------------------------------------------------------

import type {
  CategoryKey,
  NormalizedCategoryScores,
  SamuraiType,
} from "@/types/diagnosis";
import { ensureHarassmentAliases } from "@/lib/harassmentKey";
import {
  CATEGORY_ORDER as CATEGORY_KEYS, // 正式6カテゴリの順序配列
  DEFAULT_LABELS as LABELS_BY_CATEGORY, // ラベル表（awareness/risk 両方あり）
} from "@/lib/report/categoryNormalize";
import { judgeSamurai } from "@/lib/samuraiJudge";
import { z } from "zod";

/* ========== 基本ユーティリティ ========== */

export function clamp03(v: number): number {
  return Math.max(0, Math.min(3, Number.isFinite(v) ? Number(v) : 0));
}

export { CATEGORY_KEYS, LABELS_BY_CATEGORY };

/* ========== 表記ゆれ吸収 ========== */

export const ALIASES: Record<string, CategoryKey> = {
  // delegation
  delegation: "delegation",
  deleg: "delegation",
  delegation_score: "delegation",
  delegationlevel: "delegation",
  "権限委譲・構造健全度": "delegation",
  権限委譲: "delegation",
  構造健全度: "delegation",
  // orgDrag
  orgdrag: "orgDrag",
  org_drag: "orgDrag",
  organizationaldrag: "orgDrag",
  組織進化阻害: "orgDrag",
  組織の足かせ: "orgDrag",
  // commGap
  commgap: "commGap",
  comm_gap: "commGap",
  communicationgap: "commGap",
  コミュ力誤差: "commGap",
  コミュニケーションギャップ: "commGap",
  // updatePower
  updatepower: "updatePower",
  update_power: "updatePower",
  learningpower: "updatePower",
  アップデート力: "updatePower",
  学習力: "updatePower",
  変化対応力: "updatePower",
  改善力: "updatePower",
  // genGap
  gengap: "genGap",
  gen_gap: "genGap",
  generationgap: "genGap",
  ジェネギャップ感覚: "genGap",
  世代ギャップ: "genGap",
  // harassmentAwareness（互換：harassmentRisk も寄せる）
  harassmentawareness: "harassmentAwareness",
  harassment_awareness: "harassmentAwareness",
  harassment: "harassmentAwareness",
  無自覚ハラスメント傾向: "harassmentAwareness",
  無自覚ハラ傾向: "harassmentAwareness",
  ハラスメント傾向: "harassmentAwareness",
  powahara: "harassmentAwareness",
  sekuhara: "harassmentAwareness",
  // 互換キー
  harassmentrisk: "harassmentAwareness",
  harassment_risk: "harassmentAwareness",
};

export function normalizeCategoryKey(raw: string): CategoryKey | undefined {
  if (!raw) return undefined;
  const k = String(raw)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
  return (ALIASES as Record<string, CategoryKey | undefined>)[k];
}

/* ========== Zod & ゆるい入力吸収 ========== */

export const NormalizedScoresSchema = z.object({
  delegation: z.number().min(0).max(3),
  orgDrag: z.number().min(0).max(3),
  commGap: z.number().min(0).max(3),
  updatePower: z.number().min(0).max(3),
  genGap: z.number().min(0).max(3),
  harassmentAwareness: z.number().min(0).max(3),
  harassmentRisk: z.number().min(0).max(3).optional(),
}) as z.ZodType<NormalizedCategoryScores>;

export function coerceFromLooseObject(
  obj: Record<string, any>,
): NormalizedCategoryScores {
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
    base[key] = Math.max(base[key], clamp03(Number(v)));
  }
  return ensureHarassmentAliases(base as unknown as NormalizedCategoryScores);
}

export function coerceNormalized(
  input: unknown,
): NormalizedCategoryScores | undefined {
  const p = NormalizedScoresSchema.safeParse(input);
  if (p.success) return ensureHarassmentAliases(p.data);
  if (input && typeof input === "object")
    return coerceFromLooseObject(input as Record<string, any>);
  return undefined;
}

/* ========== 配列化/レコード化/抽出（厳格版） ========== */

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

export function toRecord(
  scores: NormalizedCategoryScores,
): Record<CategoryKey, number> {
  const s = ensureHarassmentAliases(scores);
  return CATEGORY_KEYS.reduce(
    (acc, k) => {
      acc[k] = clamp03((s as any)[k]);
      return acc;
    },
    {} as Record<CategoryKey, number>,
  );
}

export function toRadarData(
  scores: NormalizedCategoryScores,
  labels: Record<keyof NormalizedCategoryScores, string> = LABELS_BY_CATEGORY,
): Array<{ category: string; value: number; fullMark: number }> {
  return toRows(scores, labels).map((r) => ({
    category: r.label,
    value: r.value,
    fullMark: 3,
  }));
}

export function pickTop(scores: NormalizedCategoryScores, n = 2) {
  const rows = toRows(scores);
  return rows
    .sort((a, b) =>
      b.value !== a.value
        ? b.value - a.value
        : CATEGORY_KEYS.indexOf(a.key) - CATEGORY_KEYS.indexOf(b.key),
    )
    .slice(0, Math.max(0, n))
    .map((r) => ({ key: r.key, value: r.value }));
}

export function pickBottom(scores: NormalizedCategoryScores, n = 2) {
  const rows = toRows(scores);
  return rows
    .sort((a, b) =>
      a.value !== b.value
        ? a.value - b.value
        : CATEGORY_KEYS.indexOf(a.key) - CATEGORY_KEYS.indexOf(b.key),
    )
    .slice(0, Math.max(0, n))
    .map((r) => ({ key: r.key, value: r.value }));
}

/* ========== ★ゆる受けのラッパ（UI互換向け） ========== */

/** 旧UI互換：unknown/nullでもOK。中身が変でも0埋めで配列生成。 */
export function normalizeToCatArray(
  input: unknown,
  labels: Record<keyof NormalizedCategoryScores, string> = LABELS_BY_CATEGORY,
): Array<{ key: CategoryKey; label: string; value: number }> {
  const s =
    coerceNormalized(input) ??
    ensureHarassmentAliases({
      delegation: 0,
      orgDrag: 0,
      commGap: 0,
      updatePower: 0,
      genGap: 0,
      harassmentAwareness: 0,
    } as NormalizedCategoryScores);
  return toRows(s, labels);
}

/** unknown を受けて Record<CategoryKey, number> を返すユーティリティ（必要に応じて使用） */
export function toRecordLoose(input: unknown): Record<CategoryKey, number> {
  const s =
    coerceNormalized(input) ??
    ensureHarassmentAliases({
      delegation: 0,
      orgDrag: 0,
      commGap: 0,
      updatePower: 0,
      genGap: 0,
      harassmentAwareness: 0,
    } as NormalizedCategoryScores);
  return toRecord(s);
}

/* ========== 互換API（既存 import を壊さない） ========== */

export function getEmojiLabel(k: CategoryKey): string {
  const emoji: Record<CategoryKey, string> = {
    delegation: "🤝",
    orgDrag: "🧱",
    commGap: "🗣️",
    updatePower: "⚡",
    genGap: "👥",
    harassmentAwareness: "⚠️",
  };
  return `${emoji[k]} ${LABELS_BY_CATEGORY[k]}`;
}

const SAMURAI_TYPES: SamuraiType[] = [
  "真田幸村型",
  "織田信長型",
  "豊臣秀吉型",
  "徳川家康型",
  "上杉謙信型",
  "斎藤道三型",
  "今川義元型",
];
function isSamuraiType(v: any): v is SamuraiType {
  return typeof v === "string" && (SAMURAI_TYPES as string[]).includes(v);
}

/** SamuraiType を安全に解決（引数が無ければスコアから判定） */
export function resolveSamuraiType(
  input?: unknown,
  scores?: NormalizedCategoryScores,
): SamuraiType | undefined {
  if (isSamuraiType(input)) return input;
  if (scores) {
    try {
      return judgeSamurai(scores);
    } catch {
      /* noop */
    }
  }
  return undefined;
}

/* ========== 互換エクスポート名（既存呼び出し温存） ========== */
export const toCategoryRows = toRows;
export const categoryKeys = CATEGORY_KEYS;
export const LABELS = LABELS_BY_CATEGORY;

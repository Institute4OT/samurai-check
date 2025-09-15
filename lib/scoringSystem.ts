// /lib/scoringSystem.ts
// ============================================================
// 秒速戦国チェック｜カテゴリ集計＆正規化ユーティリティ
//  - 設問→カテゴリ紐づけ（2025-07-22時点の仕様準拠）
//  - スコアマップ（テキスト => 点）注入式
//  - 正規化モード（auto/fixedMax）/ カテゴリ重み / デバッグ詳細
// ============================================================

import type {
  CategoryKey,
  NormalizedCategoryScores,
  RawCategoryScores,
  ScorePattern,
  QuestionId,
} from '@/types/diagnosis';

/* ===================== 設問→カテゴリの紐づけ ===================== */
// 仕様メモ（2025-07-22）
/*
Q1 ＝ 権限委譲・構造健全度
Q2 ＝ 組織進化阻害, 無自覚ハラスメント傾向
Q3 ＝ 組織進化阻害
Q4 ＝ コミュ力誤差
Q5 ＝ アップデート力, ジェネギャップ感覚
Q6 ＝ アップデート力, ジェネギャップ感覚
Q7 ＝ アップデート力
Q8 ＝ 組織進化阻害, コミュ力誤差
Q9 ＝ ジェネギャップ感覚, コミュ力誤差
Q10＝ アップデート力
Q11＝ 組織進化阻害, 無自覚ハラスメント傾向, 権限委譲・構造健全度
Q12＝ ジェネギャップ感覚, コミュ力誤差
Q13＝ 無自覚ハラスメント傾向, 権限委譲・構造健全度
Q14＝ 権限委譲・構造健全度
Q15＝ 無自覚ハラスメント傾向, コミュ力誤差   ← ★追加
Q16＝ 無自覚ハラスメント傾向, 権限委譲・構造健全度 ← ★追加
*/

const MAPPING: Record<QuestionId, CategoryKey[]> = {
  Q1:  ['delegation'],
  Q2:  ['orgDrag', 'harassmentAwareness'],
  Q3:  ['orgDrag'],
  Q4:  ['commGap'],
  Q5:  ['updatePower', 'genGap'],
  Q6:  ['updatePower', 'genGap'],
  Q7:  ['updatePower'],
  Q8:  ['orgDrag', 'commGap'],
  Q9:  ['genGap', 'commGap'],
  Q10: ['updatePower'],
  Q11: ['orgDrag', 'harassmentAwareness', 'delegation'],
  Q12: ['genGap', 'commGap'],
  Q13: ['harassmentAwareness', 'delegation'],
  Q14: ['delegation'],
  // ★ ここから追記（今回のクラッシュ原因）
  Q15: ['harassmentAwareness', 'commGap'],
  Q16: ['harassmentAwareness', 'delegation'],
};

/* ========================= 型と定数 ========================= */

export type ScoreMap = Partial<Record<QuestionId, Record<string, number>>>;

export type NormalizeMode =
  | 'auto'      // 各カテゴリの「設問数×maxPerQuestion」で自動上限
  | 'fixedMax'; // カテゴリごとに固定上限を明示（上級者向け）

export type ScoringOptions = {
  normalizeMode?: NormalizeMode;
  maxPerQuestion?: number;
  fixedMaxByCategory?: Partial<Record<CategoryKey, number>>;
  weights?: Partial<Record<CategoryKey, number>>;
  roundDigits?: number;
};

export type ScoreDetailRow = {
  qid: QuestionId;
  answerText: string;
  score: number;
  contributes: CategoryKey[]; // どのカテゴリに寄与したか
};

export type ScoringResult = {
  raw: RawCategoryScores;
  normalized: NormalizedCategoryScores;
  details: ScoreDetailRow[]; // デバッグ/可視化用
};

/* ========================= ユーティリティ ========================= */

const ALL_CATEGORIES: CategoryKey[] = [
  'delegation',
  'orgDrag',
  'commGap',
  'updatePower',
  'genGap',
  'harassmentAwareness',
];

function makeEmptyRaw(): RawCategoryScores {
  return {
    delegation: 0,
    orgDrag: 0,
    commGap: 0,
    updatePower: 0,
    genGap: 0,
    harassmentAwareness: 0,
  };
}

export function getMapping(): Readonly<Record<QuestionId, CategoryKey[]>> {
  return MAPPING;
}

export function countQuestionsByCategory(cat: CategoryKey): number {
  let n = 0;
  (Object.keys(MAPPING) as QuestionId[]).forEach((qid) => {
    if (MAPPING[qid]?.includes(cat)) n += 1;
  });
  return n;
}

/** 小数丸めユーティリティ */
function roundTo(value: number, digits: number): number {
  const p = Math.pow(10, digits);
  return Math.round(value * p) / p;
}

/* ========================= バリデーション ========================= */

/** パターン上の未知QIDや空文字回答を検出（致命傷ではないが警告用） */
export function validatePattern(pattern: ScorePattern): {
  unknownQids: string[];
  emptyAnswers: QuestionId[];
} {
  const unknownQids: string[] = [];
  const emptyAnswers: QuestionId[] = [];

  (Object.keys(pattern) as QuestionId[]).forEach((qid) => {
    if (!(qid in MAPPING)) unknownQids.push(qid);
    if (!String((pattern as any)[qid] ?? '').trim()) emptyAnswers.push(qid);
  });

  return { unknownQids, emptyAnswers };
}

/* ========================= コア計算 ========================= */

/**
 * 選択肢テキスト(ScorePattern)と scoreMap からRawと正規化スコアを算出
 * - normalizeMode='auto'：上限=「設問数×maxPerQuestion」
 * - normalizeMode='fixedMax'：fixedMaxByCategoryを優先、未指定はauto計算
 * - weights：カテゴリ別重み（1.0を基準、>1で強調、<1で抑制）
 */
export function calculateCategoryScores(
  pattern: ScorePattern,
  scoreMap: ScoreMap,
  options: ScoringOptions = {},
): ScoringResult {
  const {
    normalizeMode = 'auto',
    maxPerQuestion = 3,
    fixedMaxByCategory = {},
    weights = {},
    roundDigits = 1,
  } = options;

  const raw = makeEmptyRaw();
  const details: ScoreDetailRow[] = [];

  // 1) 生スコア集計（未知QIDでも落ちないよう防御）
  (Object.keys(pattern) as QuestionId[]).forEach((qid) => {
    const answerText = (pattern as any)[qid];
    const map = scoreMap[qid] || {};
    const score = map[answerText] ?? 0;

    const cats = MAPPING[qid] ?? []; // ← ★undefined防止
    if (cats.length === 0) {
      // ここは仕様外のQID。集計せず details にヒントだけ残す
      details.push({ qid, answerText, score: 0, contributes: [] });
      return;
    }

    cats.forEach((cat) => {
      raw[cat] += score;
    });

    details.push({
      qid,
      answerText,
      score,
      contributes: cats,
    });
  });

  // 2) 正規化上限の算出
  const upperAuto: Record<CategoryKey, number> = {} as any;
  ALL_CATEGORIES.forEach((cat) => {
    upperAuto[cat] = countQuestionsByCategory(cat) * maxPerQuestion;
  });

  const upperFinal: Record<CategoryKey, number> = {} as any;
  ALL_CATEGORIES.forEach((cat) => {
    if (normalizeMode === 'fixedMax' && fixedMaxByCategory[cat] && fixedMaxByCategory[cat]! > 0) {
      upperFinal[cat] = fixedMaxByCategory[cat]!;
    } else {
      upperFinal[cat] = upperAuto[cat];
    }
    // 安全策：万一0なら1にして0割防止
    if (!upperFinal[cat] || upperFinal[cat] <= 0) upperFinal[cat] = 1;
  });

  // 3) 重み付け＆0〜3正規化
  const normalized: Record<CategoryKey, number> = {} as any;
  ALL_CATEGORIES.forEach((cat) => {
    const w = weights[cat] ?? 1.0;
    const weighted = raw[cat] * w;
    const v = Math.max(0, Math.min(3, (weighted / upperFinal[cat]) * 3));
    normalized[cat] = roundTo(v, roundDigits);
  });

  return {
    raw: raw as RawCategoryScores,
    normalized: normalized as NormalizedCategoryScores,
    details,
  };
}

/* ========================= おまけ（可視化支援） ========================= */

export function toRadarData(
  normalized: NormalizedCategoryScores,
  labelMap?: Partial<Record<CategoryKey, string>>,
): Array<{ category: string; value: number; fullMark: number }> {
  return ALL_CATEGORIES.map((cat) => ({
    category: labelMap?.[cat] ?? cat,
    value: normalized[cat],
    fullMark: 3,
  }));
}

export function getCategoryCeilTable(
  mode: NormalizeMode = 'auto',
  maxPerQuestion = 3,
  fixedMaxByCategory: Partial<Record<CategoryKey, number>> = {},
): Record<CategoryKey, number> {
  const upper: Record<CategoryKey, number> = {} as any;
  ALL_CATEGORIES.forEach((cat) => {
    const auto = countQuestionsByCategory(cat) * maxPerQuestion;
    if (mode === 'fixedMax' && fixedMaxByCategory[cat] && fixedMaxByCategory[cat]! > 0) {
      upper[cat] = fixedMaxByCategory[cat]!;
    } else {
      upper[cat] = auto;
    }
    if (!upper[cat] || upper[cat] <= 0) upper[cat] = 1;
  });
  return upper;
}

// === Compatibility shims（既存ロジックはそのまま） =====================

export type CategoryScores = Record<string, number>;

export function debugScoreCalculation(pattern: any, answers: any, options: any = {}) {
  try {
    // @ts-ignore
    if (typeof evaluateNormalizedCategoryScores === 'function') {
      // @ts-ignore
      return evaluateNormalizedCategoryScores(pattern, answers, options);
    }
  } catch {}

  try {
    // @ts-ignore
    if (typeof calculateCategoryScores === 'function') {
      // @ts-ignore
      const cs = calculateCategoryScores(pattern, /* scoreMap */ undefined, options) as any;
      const total = Object.values(cs || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
      return { categoryScores: cs || {}, total, _fallback: true as const };
    }
  } catch {}

  return { categoryScores: {} as CategoryScores, total: 0, _fallback: true as const };
}
// ======================================================================

// /lib/report/personalization.ts
// -------------------------------------------------------------
// 個別コメント生成（回答ベース）
//  - 入力：scorePattern(回答テキスト), normalizedScores(0..3), 任意でscoreMap
//  - 出力：gifts[] / challenges[] を最大2件ずつ
//  - ルール：できるだけ「回答テキスト」を引用しつつ、足りない時はスコア傾向から補完
// -------------------------------------------------------------

import type {
  NormalizedCategoryScores,
  ScorePattern,
  QuestionId,
} from '@/types/diagnosis';
import type { ScoreMap } from '@/lib/scoringSystem';
import { getMapping } from '@/lib/scoringSystem';

export type LabelMap = Partial<Record<keyof NormalizedCategoryScores, string>>;

export type PersonalizedComments = {
  gifts: string[];      // 才能（2件推奨）
  challenges: string[]; // 新たな挑戦のフィールド（2件推奨）
};

type QScore = {
  qid: QuestionId;
  answerText: string;
  score: number;             // scoreMapに基づく評価（なければ0扱い）
  categories: (keyof NormalizedCategoryScores)[];
};

// 強み寄与として重視するカテゴリ（値が高いほど良い）
const POSITIVE_KEYS: Array<keyof NormalizedCategoryScores> = ['updatePower', 'delegation'];
// 低いほど良い、もしくは高いとリスク（抑制したい）カテゴリ
const RISK_KEYS: Array<keyof NormalizedCategoryScores> = ['orgDrag', 'commGap', 'genGap', 'harassmentAwareness'];

// スコアしきい値（経験則）
const GIFT_MIN_SCORE_PER_Q = 2;      // 質問スコアがこれ以上なら「良い回答」と見做す
const RISK_MAX_SCORE_PER_Q = 0;      // 質問スコアがこれ以下なら「要改善」と見做す
const LOW_POSITIVE_THRESHOLD = 1.2;  // 正規化スコアがこの値未満なら強化余地
const HIGH_RISK_THRESHOLD = 1.8;     // 正規化スコアがこの値を超えるとリスク寄り

function clamp03(v: number) { return Math.max(0, Math.min(3, Number.isFinite(v) ? v : 0)); }

// 見出し用ラベル（デフォルト）
// ※ keyof NormalizedCategoryScores を満たすため、互換キー harassmentRisk も“必ず”定義
const DEFAULT_LABELS: Record<keyof NormalizedCategoryScores, string> = {
  delegation: '権限委譲・構造健全度',
  orgDrag: '組織進化阻害',
  commGap: 'コミュ力誤差',
  updatePower: 'アップデート力',
  genGap: 'ジェネギャップ感覚',
  harassmentAwareness: '無自覚ハラ傾向',
  harassmentRisk: '無自覚ハラ傾向',
};

/** 回答ベースのQスコア配列を作る（scoreMapが無い場合は0で埋める） */
function buildQScores(pattern: ScorePattern, scoreMap?: ScoreMap): QScore[] {
  const mapping = getMapping();
  const rows: QScore[] = [];
  (Object.keys(pattern) as QuestionId[]).forEach((qid) => {
    const ans = pattern[qid];
    const map = scoreMap?.[qid] || {};
    const score = typeof map[ans] === 'number' ? map[ans] : 0;
    const cats = (mapping[qid] as (keyof NormalizedCategoryScores)[]) || [];
    rows.push({ qid, answerText: ans, score, categories: cats });
  });
  return rows;
}

/** 強み候補：質問スコアが高く、POSITIVE_KEYSカテゴリに寄与しているものを上位から */
function pickGiftCandidates(qscores: QScore[]): QScore[] {
  const filtered = qscores.filter(
    (r) => r.score >= GIFT_MIN_SCORE_PER_Q && r.categories.some((c) => POSITIVE_KEYS.includes(c)),
  );
  // スコア降順・POSITIVE寄与数多い順・QID安定
  return filtered.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const ap = a.categories.filter((c) => POSITIVE_KEYS.includes(c)).length;
    const bp = b.categories.filter((c) => POSITIVE_KEYS.includes(c)).length;
    if (bp !== ap) return bp - ap;
    return a.qid.localeCompare(b.qid);
  });
}

/** リスク候補：質問スコアが低く（<=0）、RISK_KEYSカテゴリに寄与しているものを上位から */
function pickRiskCandidates(qscores: QScore[]): QScore[] {
  const filtered = qscores.filter(
    (r) => r.score <= RISK_MAX_SCORE_PER_Q && r.categories.some((c) => RISK_KEYS.includes(c)),
  );
  // スコア昇順（低いほど悪い）・RISK寄与数多い順・QID安定
  return filtered.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    const ar = a.categories.filter((c) => RISK_KEYS.includes(c)).length;
    const br = b.categories.filter((c) => RISK_KEYS.includes(c)).length;
    if (br !== ar) return br - ar;
    return a.qid.localeCompare(b.qid);
  });
}

/** 回答テキストを短く安全に引用（句読点などで軽めに整形） */
function quoteAnswer(ans: string, max = 42): string {
  const s = String(ans ?? '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** 文章スニペットを組み立てる */
function buildGiftSentence(q: QScore, labels: Record<string, string>): string {
  const catName = q.categories.find((c) => POSITIVE_KEYS.includes(c)) || q.categories[0];
  const label = labels[catName] || catName;
  const qtxt = quoteAnswer(q.answerText);
  if (qtxt) {
    return `「${label}」で優れた姿勢が見られます（回答例：${qtxt}）。この強みは組織の進化スピードを高めます。`;
  }
  return `「${label}」が強みとして機能しています。引き続き活用しましょう。`;
}

function buildRiskSentence(q: QScore, labels: Record<string, string>): string {
  const catName = q.categories.find((c) => RISK_KEYS.includes(c)) || q.categories[0];
  const label = labels[catName] || catName;
  const qtxt = quoteAnswer(q.answerText);
  if (qtxt) {
    return `「${label}」は要注意（回答例：${qtxt}）。小さく早い改善策を1つ決め、今週から実行しましょう。`;
  }
  return `「${label}」は改善余地があります。具体策を決めて90日で習慣化を。`;
}

/** スコア傾向によるフォールバック（top2/bottom2） */
function fallbackFromTrend(
  scores: NormalizedCategoryScores,
  labels: Record<string, string>,
): { gifts: string[]; challenges: string[] } {
  const ordered = (Object.entries(scores) as Array<[keyof NormalizedCategoryScores, number]>)
    .map(([k, v]) => [k, clamp03(v)] as const)
    .sort((a, b) => b[1] - a[1]);

  const top = ordered.slice(0, 2).map(([k]) => `「${labels[k]}」が相対的に強みです。次のプロジェクトで積極活用しましょう。`);
  // リスク側：RISK_KEYSを優先、足りなければ低スコア順
  const risks = ordered
    .filter(([k, v]) => (RISK_KEYS as string[]).includes(k as string) && v >= HIGH_RISK_THRESHOLD)
    .slice(0, 2)
    .map(([k]) => `「${labels[k]}」はリスクが顕在化しやすい領域。行動の言い換えや非同期化で摩擦を減らしましょう。`);

  const need = 2 - risks.length;
  if (need > 0) {
    const bottoms = [...ordered].reverse().slice(0, need).map(([k]) => `「${labels[k]}」は伸びしろ領域。小さな実験で改善を積み上げましょう。`);
    return { gifts: top, challenges: [...risks, ...bottoms] };
  }
  return { gifts: top, challenges: risks };
}

/** メイン：個別コメントを生成 */
export function getPersonalizedComments(params: {
  scorePattern: ScorePattern;
  normalizedScores: NormalizedCategoryScores;
  scoreMap?: ScoreMap;
  labelMap?: LabelMap;
  maxItems?: number; // デフォルト2
}): PersonalizedComments {
  const {
    scorePattern,
    normalizedScores,
    scoreMap,
    labelMap,
    maxItems = 2,
  } = params;

  const labels = { ...DEFAULT_LABELS, ...(labelMap ?? {}) } as Record<string, string>;
  const rows = buildQScores(scorePattern, scoreMap);

  // 1) 回答ベースの候補抽出
  const giftsQ = pickGiftCandidates(rows);
  const risksQ = pickRiskCandidates(rows);

  const gifts: string[] = [];
  const challenges: string[] = [];

  for (const q of giftsQ) {
    gifts.push(buildGiftSentence(q, labels));
    if (gifts.length >= maxItems) break;
  }
  for (const q of risksQ) {
    challenges.push(buildRiskSentence(q, labels));
    if (challenges.length >= maxItems) break;
  }

  // 2) 足りない分はスコア傾向からフォールバック
  if (gifts.length < maxItems || challenges.length < maxItems) {
    const fb = fallbackFromTrend(normalizedScores, labels);
    while (gifts.length < maxItems && fb.gifts.length) gifts.push(fb.gifts.shift()!);
    while (challenges.length < maxItems && fb.challenges.length) challenges.push(fb.challenges.shift()!);
  }

  // 3) 最終トリム
  return {
    gifts: gifts.slice(0, maxItems),
    challenges: challenges.slice(0, maxItems),
  };
}

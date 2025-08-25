// lib/scoringSystem.ts
// スコア集計システム（質問ごとの上限 cap と重み weight 対応）
// Q14(表示) ⇔ id:16 等のズレに対しても「相談窓口なし」減点が効くように実装

export interface CategoryScores {
  "アップデート力": number;
  "コミュ力誤差": number;
  "ジェネギャップ感覚": number;
  "組織進化阻害": number;
  "無自覚ハラスメント傾向": number;
  "権限委譲・構造健全度": number;
}

import { questionCategoryMap } from "@/lib/questionCategoryMap";
import { quizQuestions } from "@/lib/quizQuestions";

/**
 * 複数選択の“取り放題”歪み防止：設問ごとの合計に上限を掛ける。
 * A) 分解能アップのため、学習系の複数選択Qは cap=4 に微調整
 */
const QUESTION_SCORE_CAPS: Record<string, number> = {
  Q1: 3,
  Q4: 3,
  Q5: 4,  // ↑UP
  Q6: 3,
  Q8: 4,  // ↑UP
  Q9: 4,  // ↑UP
  Q12: 4, // ↑UP
  Q13: 4, // ↑UP
};

/**
 * 設問ごとの重み（分子＝実スコア、分母＝最大スコアの両方に適用）
 * B) 社長の意思系（Q2/Q10/Q14）をやや強調
 */
const QUESTION_WEIGHTS: Record<string, number> = {
  Q2: 1.15,
  Q10: 1.15,
  Q14: 1.25,
};

const getQuestionWeight = (qKey: string) =>
  typeof QUESTION_WEIGHTS[qKey] === "number" ? QUESTION_WEIGHTS[qKey] : 1;

/** 設問の“最大得点”を取得（capがあれば cap、なければ選択肢最大） */
function getPerQuestionMaxScore(qKey: string, optionScores: number[]): number {
  const cap = QUESTION_SCORE_CAPS[qKey];
  const maxOption = optionScores.length ? Math.max(...optionScores) : 0;
  return typeof cap === "number" ? cap : maxOption;
}

/* ===== 「相談窓口なし」を選んだら 1 点減点（排他にしない） =====
 * - 表示Q14でも内部idが異なる場合に備え、キー/文言の両方で判定
 * - 減点は合計→cap→weight の「合計」の段階で適用（下限0）
 */
const PENALTY_QUESTION_KEYS = new Set(["Q14", "Q16"]); // 将来ズレ対策
const PENALTY_QUESTION_TEXT_KEYS = ["ハラスメント相談窓口", "相談窓口"]; // 文言でも拾う
const NO_WINDOW_WORDS = [
  "そういう相談窓口は設置していない",
  "窓口は設置していない",
  "相談窓口を設置していない",
];

/** カテゴリ別の最大スコア（正規化の分母）を計算：cap＆weight 反映版 */
export function calculateMaxScoresPerCategory(): CategoryScores {
  const maxScores: CategoryScores = {
    "アップデート力": 0,
    "コミュ力誤差": 0,
    "ジェネギャップ感覚": 0,
    "組織進化阻害": 0,
    "無自覚ハラスメント傾向": 0,
    "権限委譲・構造健全度": 0,
  };

  quizQuestions.forEach((question) => {
    const qKey = `Q${question.id}`;
    const cats = questionCategoryMap[qKey];
    if (!cats || cats.length === 0) return;

    const optionScores = question.options.map((o) => o.score);
    const qMax = getPerQuestionMaxScore(qKey, optionScores);
    const w = getQuestionWeight(qKey);
    const weightedMax = qMax * w;

    const perCat = weightedMax / cats.length;
    cats.forEach((cat) => {
      if (cat in maxScores) {
        maxScores[cat as keyof CategoryScores] += perCat;
      }
    });
  });

  return maxScores;
}

/** 実スコア（cap＆weight適用）→ カテゴリ配分 → 0〜3に正規化 */
export function calculateCategoryScores(
  responses: { questionId: number; selectedAnswers: string[] }[]
): CategoryScores {
  const categorySums: CategoryScores = {
    "アップデート力": 0,
    "コミュ力誤差": 0,
    "ジェネギャップ感覚": 0,
    "組織進化阻害": 0,
    "無自覚ハラスメント傾向": 0,
    "権限委譲・構造健全度": 0,
  };

  responses.forEach(({ questionId, selectedAnswers }) => {
    const qKey = `Q${questionId}`;
    const cats = questionCategoryMap[qKey];
    if (!cats || cats.length === 0) return;

    // 安全網：「該当するものはない」が他と混在したらそれだけ残す
    const none = selectedAnswers.find((a) => a === "該当するものはない");
    if (none && selectedAnswers.length > 1) selectedAnswers = [none];

    const q = quizQuestions.find((qq) => qq.id === questionId);
    if (!q) return;

    // 設問の cap / weight
    const optionScores = q.options.map((o) => o.score);
    const qMax = getPerQuestionMaxScore(qKey, optionScores);
    const w = getQuestionWeight(qKey);

    // 合計
    let total = 0;
    selectedAnswers.forEach((sel) => {
      const opt = q.options.find((o) => o.text === sel);
      if (opt) total += opt.score;
    });

    // ===== 「相談窓口なし」減点（排他にしない） =====
    const isPenaltyQuestion =
      PENALTY_QUESTION_KEYS.has(qKey) ||
      PENALTY_QUESTION_TEXT_KEYS.some((k) =>
        (q?.questionText || "").includes(k)
      );

    const hasNoWindow = (selectedAnswers || []).some((s) =>
      NO_WINDOW_WORDS.some((w) => s.includes(w))
    );

    if (isPenaltyQuestion && hasNoWindow) {
      const before = total;
      total = Math.max(0, total - 1); // 下限0で1点減点
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `Penalty applied on ${qKey}: ${before} -> ${total} (窓口なし)`
        );
      }
    }
    // ==============================================

    // cap → weight
    const capped = Math.min(total, qMax);
    const weighted = capped * w;

    // カテゴリ配分
    const perCat = weighted / cats.length;
    cats.forEach((cat) => {
      if (cat in categorySums) {
        categorySums[cat as keyof CategoryScores] += perCat;
      }
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `Q${questionId}: raw=${total}, cap=${qMax}, weight=${w}, used=${weighted}, cats=${cats}`
      );
    }
  });

  // 正規化（0〜3）
  const maxScores = calculateMaxScoresPerCategory();
  const normalized: CategoryScores = {
    "アップデート力": 0,
    "コミュ力誤差": 0,
    "ジェネギャップ感覚": 0,
    "組織進化阻害": 0,
    "無自覚ハラスメント傾向": 0,
    "権限委譲・構造健全度": 0,
  };

  (Object.keys(normalized) as (keyof CategoryScores)[]).forEach((k) => {
    const total = categorySums[k];
    const max = maxScores[k];
    const v = max > 0 ? (total / max) * 3 : 0;
    normalized[k] = parseFloat(v.toFixed(2));
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("カテゴリ別合計:", categorySums);
    console.log("カテゴリ別最大:", maxScores);
    console.log("カテゴリ別正規化:", normalized);
  }

  return normalized;
}

export function debugScoreCalculation(responses: any[]): void {
  console.log("スコア計算デバッグ:", responses);
}

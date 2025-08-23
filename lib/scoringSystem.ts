// lib/scoringSystem.ts
// v2: 主カテゴリのみ集計 / multi=最大点 / 0〜3で正規化

export interface CategoryScores {
  "アップデート力": number;
  "コミュ力誤差": number;
  "ジェネギャップ感覚": number;
  "組織進化阻害": number;
  "無自覚ハラスメント傾向": number;
  "権限委譲・構造健全度": number;
}

import { quizQuestions } from "@/lib/quizQuestions";

// Q1〜Q16 を主カテゴリ1本にマッピング（日本語キー）
const PRIMARY_CATEGORY_BY_ID: Record<number, keyof CategoryScores> = {
  1: "権限委譲・構造健全度",
  2: "組織進化阻害",
  3: "アップデート力",
  4: "コミュ力誤差",
  5: "アップデート力",
  6: "ジェネギャップ感覚",
  7: "アップデート力",
  8: "コミュ力誤差",
  9: "ジェネギャップ感覚",
  10: "アップデート力",
  11: "権限委譲・構造健全度",
  12: "ジェネギャップ感覚",
  13: "権限委譲・構造健全度",
  14: "権限委譲・構造健全度",
  15: "無自覚ハラスメント傾向",
  16: "無自覚ハラスメント傾向",
};

// 便宜的に空スコアを作る
function emptyScores(): CategoryScores {
  return {
    "アップデート力": 0,
    "コミュ力誤差": 0,
    "ジェネギャップ感覚": 0,
    "組織進化阻害": 0,
    "無自覚ハラスメント傾向": 0,
    "権限委譲・構造健全度": 0,
  };
}

/** カテゴリ別の最大スコア（正規化の分母）。各設問の満点=3で固定。 */
export function calculateMaxScoresPerCategory(): CategoryScores {
  const maxScores = emptyScores();

  Object.entries(PRIMARY_CATEGORY_BY_ID).forEach(([idStr, cat]) => {
    const id = Number(idStr);
    const q = quizQuestions.find((qq) => qq.id === id);
    if (!q) return;
    // 各設問の満点は3
    maxScores[cat] += 3;
  });

  return maxScores;
}

/** 実スコアを集計 → 主カテゴリへ加点 → 0〜3へ正規化（小数2桁） */
export function calculateCategoryScores(
  responses: { questionId: number; selectedAnswers: string[] }[]
): CategoryScores {
  const sums = emptyScores();

  responses.forEach(({ questionId, selectedAnswers }) => {
    const cat = PRIMARY_CATEGORY_BY_ID[questionId];
    if (!cat) return;

    const q = quizQuestions.find((qq) => qq.id === questionId);
    if (!q) return;

    // 安全網：「該当するものはない」と他の選択が混在していればそれだけ残す
    const none = selectedAnswers.find((a) => a === "該当するものはない");
    const cleaned =
      none && selectedAnswers.length > 1 ? [none] : selectedAnswers;

    // 選択肢テキスト→スコアへ
    const pickedScores = cleaned
      .map((sel) => q.options.find((o) => o.text === sel)?.score)
      .filter((v): v is number => typeof v === "number");

    // single: 1件（なければ0） / multi: 選んだ中の最大点（なければ0）
    let qScore = 0;
    if (q.isMultipleChoice) {
      qScore = pickedScores.length ? Math.max(...pickedScores) : 0;
    } else {
      qScore = pickedScores.length ? pickedScores[0] : 0;
      // もし複数入ってきても、より妥当な方を採るため最大に寄せる
      if (pickedScores.length > 1) qScore = Math.max(...pickedScores);
    }

    sums[cat] += qScore;

    if (process.env.NODE_ENV !== "production") {
      console.log(`Q${questionId} → ${cat}: qScore=${qScore}`);
    }
  });

  // 正規化（0〜3）
  const maxScores = calculateMaxScoresPerCategory();
  const normalized = emptyScores();
  (Object.keys(normalized) as (keyof CategoryScores)[]).forEach((k) => {
    const total = sums[k];
    const max = maxScores[k];
    const v = max > 0 ? (total / max) * 3 : 0;
    normalized[k] = parseFloat(v.toFixed(2));
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("カテゴリ別合計:", sums);
    console.log("カテゴリ別最大:", maxScores);
    console.log("カテゴリ別正規化:", normalized);
  }

  return normalized;
}

export function debugScoreCalculation(responses: any[]): void {
  console.log("スコア計算デバッグ:", responses);
}

// スコア集計システム

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

// 各カテゴリの最大スコアを計算する関数
export function calculateMaxScoresPerCategory(): CategoryScores {
  const maxScores: CategoryScores = {
    "アップデート力": 0,
    "コミュ力誤差": 0,
    "ジェネギャップ感覚": 0,
    "組織進化阻害": 0,
    "無自覚ハラスメント傾向": 0,
    "権限委譲・構造健全度": 0,
  };

  // 各質問について、そのカテゴリの最大スコアを加算
  quizQuestions.forEach(question => {
    const qKey = `Q${question.id}`;
    const categories = questionCategoryMap[qKey];
    
    if (categories) {
      // その質問の最大スコアを取得
      const maxQuestionScore = Math.max(...question.options.map(option => option.score));
      
      // カテゴリごとに分配（複数カテゴリの場合は等分）
      const scorePerCategory = maxQuestionScore / categories.length;
      
      categories.forEach(category => {
        if (category in maxScores) {
          maxScores[category as keyof CategoryScores] += scorePerCategory;
        }
      });
    }
  });

  return maxScores;
}

export function calculateCategoryScores(responses: { questionId: number; selectedAnswers: string[] }[]): CategoryScores {
  // 初期化：すべてのカテゴリスコアを0に
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
    const categories = questionCategoryMap[qKey];

    if (!categories) {
      console.warn(`カテゴリが見つかりません: ${qKey}`);
      return;
    }

    // 安全網: 「該当するものはない」が含まれている場合は、それだけを残す
    const noneOption = selectedAnswers.find(ans => ans === "該当するものはない");
    if (noneOption && selectedAnswers.length > 1) {
      console.warn(`"${qKey}"で「該当するものはない」と他の選択肢が同時に選ばれていたため、排他処理を適用しました`);
      selectedAnswers = [noneOption];
    }

    // 該当する質問データを取得
    const questionData = quizQuestions.find(q => q.id === questionId);
    if (!questionData) {
      console.warn(`質問データが見つかりません: Q${questionId}`);
      return;
    }

    // 選択されたテキストに対応するスコアを取得
    let totalScore = 0;
    selectedAnswers.forEach(selectedText => {
      const matchingOption = questionData.options.find(option => option.text === selectedText);
      if (matchingOption) {
        totalScore += matchingOption.score;
      } else {
        console.warn(`選択肢が見つかりません: "${selectedText}" in Q${questionId}`);
      }
    });

    // デバッグ用ログ
    console.log(`Q${questionId}: 選択肢=${selectedAnswers}, 合計スコア=${totalScore}, カテゴリ=${categories}`);

    // カテゴリごとにスコアを分配
    const scorePerCategory = totalScore / categories.length;

    categories.forEach((category) => {
      if (category in categorySums) {
        categorySums[category as keyof CategoryScores] += scorePerCategory;
      }
    });
  });

  // 各カテゴリの最大スコアを取得
  const maxScores = calculateMaxScoresPerCategory();

  // 正規化: (実際のスコア ÷ 最大スコア) × 3 で0〜3点スケールに変換
  const normalizedScores: CategoryScores = {
    "アップデート力": 0,
    "コミュ力誤差": 0,
    "ジェネギャップ感覚": 0,
    "組織進化阻害": 0,
    "無自覚ハラスメント傾向": 0,
    "権限委譲・構造健全度": 0,
  };

  for (const category in categorySums) {
    const total = categorySums[category as keyof CategoryScores];
    const maxScore = maxScores[category as keyof CategoryScores];
    
    // 正規化: (実際のスコア ÷ 最大スコア) × 3 で0〜3点スケールに変換
    const normalizedScore = maxScore > 0 ? (total / maxScore) * 3 : 0;
    normalizedScores[category as keyof CategoryScores] = parseFloat(normalizedScore.toFixed(2));
  }

  // デバッグ用ログ
  if (process.env.NODE_ENV !== 'production') {
    console.log("カテゴリ別合計スコア:", categorySums);
    console.log("カテゴリ別最大スコア:", maxScores);
    console.log("カテゴリ別正規化スコア:", normalizedScores);
  }

  return normalizedScores;
}

export function debugScoreCalculation(responses: any[]): void {
  console.log("スコア計算デバッグ:", responses);
}
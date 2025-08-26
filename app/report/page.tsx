// app/report/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ReportTemplate, { ReportInput } from "@/components/report/ReportTemplate";
import type { SamuraiType } from "@/lib/samuraiJudge";
import { calculateCategoryScores } from "@/lib/scoringSystem";

// ★ 追加：個別コメント生成（回答テキスト→才能/挑戦 各2件）
import { generatePersonalComments, type AnswerLite } from "@/lib/comments/generatePersonalComments";
// ★ 追加：スコア復元用（score_pattern はテキストだけなので、ここからscoreを引く）
import { quizQuestions } from "@/lib/quizQuestions";

// Supabase から読む行の型（使う列だけ）
type Row = {
  id: string;
  result_type?: SamuraiType | null;
  // 例: { Q7: ["先行導入して…"], Q10: ["まず自分が変わる…"], Q4: ["…","…"] }
  score_pattern: Record<string, string[]> | null;
};

export const dynamic = "force-dynamic";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: { resultId?: string };
}) {
  const resultId = searchParams?.resultId;
  if (!resultId) return notFound();

  // Supabase クライアント
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, anon);

  // 必要な列だけ取得
  const { data, error } = await supabase
    .from("samurairesults")
    .select(["id", "result_type", "score_pattern"].join(","))
    .eq("id", resultId)
    .single<Row>();

  if (error || !data) {
    console.error("report supabase error", error, resultId);
    return notFound();
  }

  // score_pattern -> 質問ごとの選択テキスト配列
  const answersByQ =
    data.score_pattern
      ? Object.entries(data.score_pattern)
          .map(([q, selected]) => ({
            questionId: Number(String(q).replace(/^Q/i, "")),
            selectedTexts: Array.isArray(selected) ? selected : [],
          }))
          .sort((a, b) => a.questionId - b.questionId)
      : [];

  // ====== カテゴリスコア（既存ロジック想定） ======
  const scores = calculateCategoryScores(
    answersByQ.map((a) => ({
      questionId: a.questionId,
      selectedAnswers: a.selectedTexts, // 既存の関数がこのキーを見ている想定
    }))
  );

  // ====== 個別コメント用：AnswerLite[] を作る（テキスト→score を復元） ======
  // 質問ID→{ 選択肢テキスト → score } の引きテーブルを用意
  const scoreIndex = new Map<number, Map<string, number>>();
  for (const q of quizQuestions) {
    scoreIndex.set(
      q.id,
      new Map(q.options.map((o) => [o.text, o.score]))
    );
  }

  const answersLite: AnswerLite[] = [];
  for (const a of answersByQ) {
    const m = scoreIndex.get(a.questionId) ?? new Map<string, number>();
    for (const text of a.selectedTexts) {
      const score = m.get(text) ?? 0;
      answersLite.push({ id: a.questionId, selectedText: text, score });
    }
  }

  // 才能/挑戦コメントを各2件ずつ自動抽出
  const personalComments = generatePersonalComments(answersLite, 2);

  // ====== スコア抽出ヘルパ ======
  const num = (v: any) => (typeof v === "number" && !Number.isNaN(v) ? v : 0);
  const clamp3 = (v: number) => Math.max(0, Math.min(3, v));
  const pick = (obj: any, keys: string[]) => {
    for (const k of keys) {
      const v = obj?.[k];
      if (typeof v === "number" && !Number.isNaN(v)) return v;
    }
    return 0;
  };

  // 返却キーのゆらぎに対応
  const pickKeys: Record<string, string[]> = {
    delegation: [
      "delegation",
      "delegationScore",
      "delegationScoreAvg",
      "score_delegation",
      "権限委譲・構造",
      "権限委譲・構造健全度",
    ],
    orgDrag: [
      "orgDrag",
      "orgDragScore",
      "orgDragScoreAvg",
      "score_orgDrag",
      "組織進化阻害",
      "組織進化阻害度",
    ],
    commGap: [
      "commGap",
      "commGapScore",
      "commGapScoreAvg",
      "score_commGap",
      "コミュ力誤差",
    ],
    updatePower: [
      "updatePower",
      "updatePowerScore",
      "updatePowerScoreAvg",
      "score_updatePower",
      "アップデート力",
    ],
    genGap: [
      "genGap",
      "genGapScore",
      "genGapScoreAvg",
      "score_genGap",
      "ジェネギャップ",
      "ジェネギャップ感覚",
      "ジェネギャップ 感覚",
      "ジェネギャップ（感覚）",
      "ジェネギャップ度",
      "世代間ギャップ",
    ],
    harassmentRisk: [
      "harassmentRisk",
      "harassmentRiskScore",
      "harassmentRiskScoreAvg",
      "score_harassmentRisk",
      "ハラスメント傾向",
      "無自覚ハラスメント傾向",
    ],
  };

  // ★ data.personalComments を同梱（ReportTemplate で利用）
  type ReportDataWithPersonal = ReportInput & {
    personalComments: { talents: string[]; challenges: string[] };
  };

  const reportData: ReportDataWithPersonal = {
    resultId: data.id,
    samuraiType: (data.result_type ?? "真田幸村型") as SamuraiType,
    categories: [
      {
        key: "delegation",
        label: "権限委譲・構造",
        score: clamp3(num(pick(scores, pickKeys.delegation))),
      },
      {
        key: "orgDrag",
        label: "組織進化阻害",
        score: clamp3(num(pick(scores, pickKeys.orgDrag))),
      },
      {
        key: "commGap",
        label: "コミュ力誤差",
        score: clamp3(num(pick(scores, pickKeys.commGap))),
      },
      {
        key: "updatePower",
        label: "アップデート力",
        score: clamp3(num(pick(scores, pickKeys.updatePower))),
      },
      {
        key: "genGap",
        label: "ジェネギャップ",
        score: clamp3(num(pick(scores, pickKeys.genGap))),
      },
      {
        key: "harassmentRisk",
        label: "ハラスメント傾向",
        score: clamp3(num(pick(scores, pickKeys.harassmentRisk))),
      },
    ],
    // 旗は一旦デフォルト（DB列が無いので）
    flags: { manyZeroOnQ5: false, noRightHand: false },
    // ★ 追加：個別コメント（才能/挑戦 各2件）
    personalComments,
  };

  return <ReportTemplate data={reportData} />;
}

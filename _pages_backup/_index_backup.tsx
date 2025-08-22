// pages/report/index.tsx
import { GetServerSideProps } from "next";
import ReportTemplate, { ReportInput } from "@/components/report/ReportTemplate";
import { createClient } from "@supabase/supabase-js";

// Supabaseクライアント作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 読み取りはサービスロール or API経由
);

export const getServerSideProps: GetServerSideProps = async (context) => {
  const resultId = context.query.resultId as string;
  if (!resultId) {
    return { notFound: true };
  }

  // 1. Supabaseから回答結果を取得
  const { data, error } = await supabase
    .from("samurairesults") // 実際のテーブル名に置き換え
    .select("*")
    .eq("id", resultId)
    .single();

  if (error || !data) {
    console.error("データ取得エラー", error);
    return { notFound: true };
  }

  // 2. データを ReportInput 形式に変換
  const reportData: ReportInput = {
    resultId: resultId,
    samuraiType: data.samurai_type, // 例: "真田幸村型"
    categories: [
      { key: "delegation", label: "権限委譲・構造", score: data.score_delegation },
      { key: "orgDrag", label: "組織進化阻害", score: data.score_orgDrag },
      { key: "commGap", label: "コミュ力誤差", score: data.score_commGap },
      { key: "updatePower", label: "アップデート力", score: data.score_updatePower },
      { key: "genGap", label: "ジェネギャップ", score: data.score_genGap },
      { key: "harassmentRisk", label: "ハラスメント傾向", score: data.score_harassmentRisk },
    ],
    flags: {
      manyZeroOnQ5: data.flag_manyZeroOnQ5,
      noRightHand: data.flag_noRightHand,
    },
  };

  return { props: { reportData } };
};

export default function ReportPage({ reportData }: { reportData: ReportInput }) {
  return <ReportTemplate data={reportData} />;
}

// app/report/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ReportTemplate, { type ReportInput } from "@/components/report/ReportTemplate";
import { readSnapshot } from "@/lib/scoreSnapshot";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: { rid?: string } };

function envOrThrow(...names: string[]) {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  throw new Error(`Missing env: ${names.join(" or ")}`);
}

const supabase = createClient(
  envOrThrow("NEXT_PUBLIC_SUPABASE_URL"),
  // 読み取り専用：ANON優先／なければSERVICE_ROLEでも可（サーバ実行のため）
  envOrThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } }
);

export default async function Page({ searchParams }: PageProps) {
  const rid = (searchParams?.rid || "").trim();
  if (!rid) notFound();

  // 1) 結果行を取得（※計算はしない）
  const { data: row, error } = await supabase
    .from("samurairesults")
    .select("*")
    .eq("id", rid)
    .single();

  if (error || !row) notFound();

  // 2) Sランク：保存済みスナップショットのみを使用（なければ旧カラムから復元）
  const snap = readSnapshot(row);

  // samuraiType は JA → Key → 旧カラムの順でフォールバック
  const samuraiType =
    snap.samuraiTypeJa ??
    snap.samuraiTypeKey ??
    (typeof row.samurai_type === "string" ? row.samurai_type : "");

  // 3) ReportTemplate への入力データを構築
  const data: ReportInput = {
    resultId: rid,
    samuraiType,                 // ← DBに確定保存された値だけ
    categories: snap.categories, // ← 固定順・0–3に正規化済み
    flags: {
      manyZeroOnQ5: !!row.flag_manyZeroOnQ5,
      noRightHand: !!row.flag_noRightHand,
    },
    // 個別コメントは任意。未指定ならテンプレ側のフォールバックが使われる
    personalComments: undefined,
    companySize:
      typeof row.company_size === "number"
        ? String(row.company_size)
        : (row.company_size ?? ""),
  };

  return <ReportTemplate data={data} />;
}

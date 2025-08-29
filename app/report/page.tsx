// app/report/page.tsx
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import ReportTemplate, { ReportInput } from '@/components/report/ReportTemplate';
import { calculateCategoryScores } from '@/lib/scoringSystem';
import { JA_TO_KEY, type SamuraiKey } from '@/lib/samuraiTypeMap';
import { bookingUrlFor } from '@/lib/emailTemplates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Search = { resultId?: string };

type SamuraiResultRow = {
  id: string;
  created_at: string | null;
  score_pattern: unknown;          // jsonb（{ Q1: [...], Q2: [...] } の想定）
  result_type?: string | null;     // ← 実テーブルはコレ
  samurai_type?: string | null;    // （旧カラムが残っていても一応見る）
  company_size?: string | null;    // あるなら使う
};

type ConsultIntakeRow = {
  result_id?: string | null;
  company_size?: string | null;
  email?: string | null;
  name?: string | null;
};

const ALL_KEYS = ['sanada','oda','hideyoshi','ieyasu','uesugi','saito','imagawa'] as const;

function normalizeSamuraiType(val: unknown): SamuraiKey {
  const s = String(val ?? '').trim();
  if ((ALL_KEYS as readonly string[]).includes(s as any)) return s as SamuraiKey;
  const mapped = JA_TO_KEY[s as keyof typeof JA_TO_KEY];
  return (mapped ?? 'imagawa') as SamuraiKey;
}

function readEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

async function fetchAll(resultId: string) {
  const url = readEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anon = readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const supabase = createClient(url, anon);

  const [{ data: resRow, error: e1 }, { data: intakeRows, error: e2 }] = await Promise.all([
    supabase.from('samurairesults').select('*').eq('id', resultId).single(),
    // consult_intake 側にも company_size がある可能性が高いので補助的に拾う
    supabase.from('consult_intake').select('result_id,company_size,email,name')
      .eq('result_id', resultId).order('created_at', { ascending: false }).limit(1)
  ]);

  if (e1) {
    console.error('[supabase] samurairesults read error', e1);
  }
  if (e2) {
    // 無くても致命ではない
    console.warn('[supabase] consult_intake read warn', e2.message);
  }

  return {
    result: (resRow ?? null) as SamuraiResultRow | null,
    intake: (intakeRows?.[0] ?? null) as ConsultIntakeRow | null,
  };
}

/** score_pattern（{Q1:[…], Q2:[…]}）→ スコア関数にそのまま渡す */
function parseScorePattern(raw: unknown): Record<string, any> | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return typeof raw === 'object' && raw !== null ? (raw as Record<string, any>) : null;
}

function isLargeCompanySize(size?: string | null): boolean {
  if (!size) return false;
  const s = size.toString();
  return ['51-100', '101-300', '301-500', '501-1000', '1001+'].includes(s);
}

export default async function ReportPage({ searchParams }: { searchParams: Search }) {
  const resultId = searchParams?.resultId?.trim();

  if (!resultId) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold mb-2">診断レポートが見つかりません</h1>
        <p className="text-sm text-muted-foreground">
          URLに <code>resultId</code> が付いていません。メールのリンクまたは正しいURLからアクセスしてください。
        </p>
      </div>
    );
  }

  // 1) データ取得（結果＋必要なら相談申込の補助情報）
  const { result: row, intake } = await fetchAll(resultId);
  if (!row) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold mb-2">診断レポートが見つかりません</h1>
        <p className="text-sm text-muted-foreground">
          resultId=<code>{resultId}</code> のデータが存在しません。
        </p>
      </div>
    );
  }

  // 2) タイプ名の確定（列名の差異に対応）
  const samuraiKey = normalizeSamuraiType(row.result_type ?? row.samurai_type);

  // 3) スコア計算（関数が期待する形式＝オブジェクトを渡す）
  const patternObj = parseScorePattern(row.score_pattern);
  if (!patternObj) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold mb-2">スコア計算ができません</h1>
        <p className="text-sm text-muted-foreground">
          <code>score_pattern</code> が空または不正です。
        </p>
      </div>
    );
  }

  const cat = (calculateCategoryScores as any)(patternObj) as any;
  const pick = (k: string, def = 0) => (typeof cat?.[k] === 'number' ? cat[k] : def);

  // 4) ReportTemplate 用データ
  const reportData: ReportInput = {
    resultId,
    samuraiType: samuraiKey,
    categories: [
      { key: 'delegation',      label: '権限委譲・構造健全度', score: pick('delegation') },
      { key: 'orgDrag',         label: '組織進化阻害',         score: pick('orgDrag') },
      { key: 'commGap',         label: 'コミュ力誤差',         score: pick('commGap') },
      { key: 'updatePower',     label: 'アップデート力',       score: pick('updatePower') },
      { key: 'genGap',          label: 'ジェネギャップ感覚',   score: pick('genGap') },
      { key: 'harassmentRisk',  label: 'ハラスメント傾向',     score: pick('harassmentRisk') },
    ],
    flags: { manyZeroOnQ5: false, noRightHand: false },
  };

  // 5) 会社規模（samurairesults → consult_intake の順で補完）
  const companySize = row.company_size ?? intake?.company_size ?? null;
  const isLarge = isLargeCompanySize(companySize);

  // 6) 画面描画（本体＋会社規模が大きい場合のCTA）
  return (
    <div>
      <ReportTemplate data={reportData} />

      {isLarge && (
        <section className="mx-auto max-w-4xl p-6">
          <div className="rounded-2xl border bg-card shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-2">無料個別相談（読み解き＆次の一手）</h2>
            <p className="text-sm text-muted-foreground mb-4">
              組織規模が51名以上の方向けに、レポート読み解き／90日アクションの叩き台をご一緒します。
            </p>
            <a
              className="inline-block rounded-xl px-4 py-2 bg-black text-white"
              href={bookingUrlFor(undefined, resultId, intake?.email ?? undefined)}
            >
              予約ページを開く
            </a>
            <p className="text-xs text-muted-foreground mt-2">
              ※ 予約ページでは resultId / email を自動引き継ぎます
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

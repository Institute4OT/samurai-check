// app/report/page.tsx
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import ReportTemplate, { ReportInput } from '@/components/report/ReportTemplate';
import { calculateCategoryScores } from '@/lib/scoringSystem';
import { JA_TO_KEY, type SamuraiKey } from '@/lib/samuraiTypeMap';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Search = { resultId?: string };

type SamuraiResultRow = {
  id: string;
  created_at: string | null;
  score_pattern: unknown;        // jsonb
  samurai_type?: string | null;  // 日本語ラベル or key
};

// samuraiType の全キー（samuraiTypeMap.ts の定義に合わせる）
const ALL_KEYS = [
  'sanada', 'oda', 'hideyoshi', 'ieyasu', 'uesugi', 'saito', 'imagawa',
] as const;

function normalizeSamuraiType(val: unknown): SamuraiKey {
  const s = String(val ?? '').trim();
  // すでに key ならそのまま
  if ((ALL_KEYS as readonly string[]).includes(s)) return s as SamuraiKey;
  // 日本語ラベル → key 変換
  const mapped = JA_TO_KEY[s as keyof typeof JA_TO_KEY];
  return (mapped ?? 'imagawa') as SamuraiKey; // フォールバック
}

function readEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

async function fetchResult(resultId: string): Promise<SamuraiResultRow | null> {
  const url = readEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anon = readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const supabase = createClient(url, anon);
  const { data, error } = await supabase
    .from('samurairesults')
    .select('*')
    .eq('id', resultId)
    .single();
  if (error) {
    console.error('[supabase] read error', error);
    return null;
  }
  return data as SamuraiResultRow;
}

/** score_pattern（{Q1:[…], Q2:[…]} など）→ スコア関数が期待する配列形に変換 */
function toScoreItems(
  raw: unknown
): { questionId: number; selectedAnswers: string[] }[] | null {
  if (!raw) return null;

  let obj: any = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return null; }
  }
  if (typeof obj !== 'object' || obj === null) return null;

  const items: { questionId: number; selectedAnswers: string[] }[] = [];
  for (const [key, val] of Object.entries(obj)) {
    const qnum = Number(String(key).replace(/\D/g, ''));
    if (!Number.isFinite(qnum)) continue;
    const answers =
      Array.isArray(val) ? val.map(String) : typeof val === 'string' ? [val] : [];
    items.push({ questionId: qnum, selectedAnswers: answers });
  }
  return items;
}

export default async function ReportPage({ searchParams }: { searchParams: Search }) {
  const resultId = searchParams?.resultId?.trim();

  // 1) ID未指定
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

  // 2) 取得
  const row = await fetchResult(resultId);
  if (!row) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold mb-2">診断レポートが見つかりません</h1>
        <p className="text-sm text-muted-foreground">
          resultId=<code>{resultId}</code> のデータが存在しません。送信後の保存を確認してください。
        </p>
      </div>
    );
  }

  // 3) score_pattern → 配列形へ
  const scoreItems = toScoreItems(row.score_pattern);
  if (!scoreItems || scoreItems.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold mb-2">スコア計算ができません</h1>
        <p className="text-sm text-muted-foreground">
          <code>score_pattern</code> が空または不正です。保存ロジックをご確認ください。
        </p>
        {process.env.NODE_ENV !== 'production' && (
          <details className="mt-4">
            <summary className="cursor-pointer">デバッグ情報</summary>
            <pre className="text-xs whitespace-pre-wrap mt-2">
{JSON.stringify({ resultId, raw: row.score_pattern }, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  }

  // 4) カテゴリスコア計算
  const cat = calculateCategoryScores(scoreItems as any) as any;
  const pick = (k: string, def = 0) => (typeof cat?.[k] === 'number' ? cat[k] : def);

  // 5) SamuraiKey 正規化
  const samuraiKey = normalizeSamuraiType(row.samurai_type);

  // 6) ReportTemplate が期待する data 形に整形
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
    flags: {
      manyZeroOnQ5: false,
      noRightHand: false,
    },
  };

  return <ReportTemplate data={reportData} />;
}

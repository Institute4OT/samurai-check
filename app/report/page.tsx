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
  score_pattern: unknown;
  result_type?: string | null;
  samurai_type?: string | null;
  company_size?: string | null;
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
  const mapped = (JA_TO_KEY as Record<string, string | undefined>)[s];
  return (mapped ?? 'imagawa') as SamuraiKey;
}

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`[report] missing env: ${name}`);
  return v;
}

async function fetchAll(resultId: string) {
  const supabase = createClient(need('NEXT_PUBLIC_SUPABASE_URL'), need('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

  const [{ data: resRow }, { data: intakeRows }] = await Promise.all([
    supabase.from('samurairesults').select('*').eq('id', resultId).single(),
    supabase.from('consult_intake')
      .select('result_id,company_size,email,name')
      .eq('result_id', resultId)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  return {
    result: (resRow ?? null) as SamuraiResultRow | null,
    intake: (intakeRows?.[0] ?? null) as ConsultIntakeRow | null,
  };
}

function parsePattern(raw: unknown): Record<string, any> | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return typeof raw === 'object' ? (raw as Record<string, any>) : null;
}

// 返却形の揺れを吸収して {delegation: number,...} に正規化
function extractScores(catAny: any): Record<string, number> {
  if (!catAny) return {};
  // 1) すでに number 直入れ
  if (typeof catAny.delegation === 'number') return catAny;

  // 2) scores フィールドにまとまっている
  if (catAny.scores && typeof catAny.scores.delegation === 'number') return catAny.scores;

  // 3) 各キーが {score:number}
  const keys = ['delegation','orgDrag','commGap','updatePower','genGap','harassmentRisk'];
  const out: Record<string, number> = {};
  let hit = false;
  for (const k of keys) {
    const v = catAny?.[k];
    if (v && typeof v.score === 'number') {
      out[k] = v.score; hit = true;
    }
  }
  if (hit) return out;

  // 4) 配列 [{key,score}]
  if (Array.isArray(catAny)) {
    for (const it of catAny) {
      if (it && typeof it.key === 'string' && typeof it.score === 'number') {
        out[it.key] = it.score; hit = true;
      }
    }
    if (hit) return out;
  }

  return {};
}

function isLargeCompany(size?: string | null) {
  const s = (size || '').toString();
  return ['51-100', '101-300', '301-500', '501-1000', '1001+'].includes(s);
}

export default async function ReportPage({ searchParams }: { searchParams: Search }) {
  const resultId = searchParams?.resultId?.trim();

  if (!resultId) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold mb-2">診断レポートが見つかりません</h1>
        <p className="text-sm text-muted-foreground">URLに <code>resultId</code> が付いていません。</p>
      </main>
    );
  }

  const { result: row, intake } = await fetchAll(resultId);
  if (!row) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold mb-2">診断レポートが見つかりません</h1>
        <p className="text-sm text-muted-foreground">resultId=<code>{resultId}</code> のデータが存在しません。</p>
      </main>
    );
  }

  const samuraiKey = normalizeSamuraiType(row.result_type ?? row.samurai_type);
  const pattern = parsePattern(row.score_pattern);

  // スコア計算（安全運転）
  let scores: Record<string, number> = {};
  try {
    if (pattern) {
      const catAny = (calculateCategoryScores as any)(pattern);
      scores = extractScores(catAny);
    }
  } catch (e) {
    console.error('[report] score calc error:', e);
    scores = {};
  }
  const pick = (k: string, def = 0) => (typeof scores?.[k] === 'number' ? scores[k] : def);

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

  const companySize = row.company_size ?? intake?.company_size ?? null;
  const email = intake?.email ?? null;
  const showCTA = isLargeCompany(companySize);

  return (
    <div>
      <ReportTemplate data={reportData} />

      {showCTA && (
        <section className="mx-auto max-w-4xl p-6">
          <div className="rounded-2xl border bg-card shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-2">無料個別相談（読み解き＆次の一手）</h2>
            <p className="text-sm text-muted-foreground mb-4">
              組織規模が51名以上の方向けに、レポート読み解き／90日アクションの叩き台をご一緒します。
            </p>
            <a
              className="inline-block rounded-xl px-4 py-2 bg-black text-white"
              href={bookingUrlFor(undefined, resultId, email ?? undefined)}
            >
              予約ページを開く
            </a>
            <p className="text-xs text-muted-foreground mt-2">※ resultId / email を自動引き継ぎます</p>
          </div>
        </section>
      )}
    </div>
  );
}

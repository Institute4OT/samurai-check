// components/report/ReportTemplate.tsx
'use client';

import React, { useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Smile, Target, Compass } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

import { TYPE_CONTENTS } from '@/lib/report/typeContents';
import { kabutoSrcByType, SamuraiLabel } from '@/lib/report/kabutoMap';
import ReportCTA from './ReportCTA';
import { genScoreFallbackBullets } from '@/lib/report/personalization';

// 日本語⇄英字キー
import { KEY_TO_JA, type SamuraiKey, type SamuraiJa } from '@/lib/samuraiTypeMap';

/* ========= 型 ========= */
export type CategoryKey =
  | 'delegation'     // 権限委譲・構造健全度
  | 'orgDrag'        // 組織進化阻害
  | 'commGap'        // コミュ力誤差
  | 'updatePower'    // アップデート力
  | 'genGap'         // ジェネギャップ感覚
  | 'harassmentRisk' // 無自覚ハラスメント傾向
;

export type CategoryScore = { key: CategoryKey; label: string; score: number; };
export type PersonalComments = { talents: string[]; challenges: string[]; };

export type ReportInput = {
  resultId: string;
  /** 「織田信長型」などの日本語 or 'oda' 等のkey を許容 */
  samuraiType: SamuraiJa | SamuraiKey | string;
  /** 配列 or 連想（{commGap:2,...}）どちらでも可 */
  categories: CategoryScore[] | Partial<Record<CategoryKey, number>>;
  flags?: { manyZeroOnQ5?: boolean; noRightHand?: boolean };
  personalComments?: PersonalComments;
  companySize?: string;
};

/* ========= ラベルと並び順（レーダーもこれで固定） ========= */
const ORDER: { key: CategoryKey; label: string }[] = [
  { key: 'delegation',     label: '権限委譲・構造健全度' },
  { key: 'orgDrag',        label: '組織進化阻害' },
  { key: 'commGap',        label: 'コミュ力誤差' },
  { key: 'updatePower',    label: 'アップデート力' },
  { key: 'genGap',         label: 'ジェネギャップ感覚' },
  { key: 'harassmentRisk', label: '無自覚ハラスメント傾向' },
];

/* ========= 汎用ヘルパー ========= */
const clamp = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(3, n));
};

function normalizeCategories(input: ReportInput['categories']): CategoryScore[] {
  // 1) すでに配列なら、安全化して並び替え
  if (Array.isArray(input)) {
    const map = new Map< CategoryKey, number >();
    input.forEach((c) => {
      // key不明でも label から推測
      const k = (c?.key as CategoryKey) ??
        (ORDER.find(o => o.label === c?.label)?.key as CategoryKey);
      if (k) map.set(k, clamp(c?.score));
    });
    return ORDER.map(o => ({ key: o.key, label: o.label, score: clamp(map.get(o.key)) }));
  }

  // 2) 連想形式（{commGap: 2, ...}）
  const rec = input || {};
  return ORDER.map(o => ({ key: o.key, label: o.label, score: clamp((rec as any)[o.key]) }));
}

function findKeyByJa(ja: string): SamuraiKey | null {
  // 「型」有無や空白のゆらぎを吸収
  const norm = (s: string) => s.replace(/\s+/g, '').replace(/型$/, '');
  const n = norm(ja);
  for (const [k, v] of Object.entries(KEY_TO_JA)) {
    if (norm(String(v)) === n) return k as SamuraiKey;
  }
  return null;
}

/* ========= タイプ別のキャッチ（タイトル直下） ========= */
const COMMON_BY_TYPE: Record<SamuraiJa, { headline: string }> = {
  今川義元型: { headline: '旧体制に安住しがちな安定志向タイプ' },
  織田信長型: { headline: '革新を突き進むトップダウン型' },
  豊臣秀吉型: { headline: '共創と巻き込みで勢いを生むタイプ' },
  真田幸村型: { headline: '柔軟さと進化力を兼ね備えた理想型' },
  斎藤道三型: { headline: '強引な支配で突き進む独裁型' },
  上杉謙信型: { headline: '高潔な精神を大切にする義将型' },
  徳川家康型: { headline: '慎重に構造を整える守りの型' },
};

/* ========= 本文 ========= */
function ReportBody({ data }: { data: ReportInput }) {
  /** 1) タイプ名を堅牢に解決（信長固定問題の根治） */
  const { typeKey, typeJa } = useMemo(() => {
    const raw = (data.samuraiType ?? '').toString();
    let key: SamuraiKey | null = null;
    let ja: SamuraiJa;

    if (raw in KEY_TO_JA) {
      key = raw as SamuraiKey;
      ja = KEY_TO_JA[key] as SamuraiJa;
    } else {
      const guessed = findKeyByJa(raw);
      if (guessed) {
        key = guessed;
        ja = KEY_TO_JA[guessed] as SamuraiJa;
      } else {
        // どうしても判定できない場合は、表示は raw を使い、本文辞書・兜は信長でフォールバック
        ja = (raw.endsWith('型') ? raw : '織田信長型') as SamuraiJa;
        key = (Object.keys(KEY_TO_JA).includes('oda') ? 'oda' : Object.keys(KEY_TO_JA)[0]) as SamuraiKey;
      }
    }
    return { typeKey: key, typeJa: ja };
  }, [data.samuraiType]);

  /** 2) カテゴリの正規化（配列/連想 どちらでもOK） */
  const categories = useMemo(() => normalizeCategories(data.categories), [data.categories]);

  /** 3) レーダー用データ（空っぽ防止の最終防波堤つき） */
  const chartData = useMemo(
    () => (categories?.length ? categories : ORDER.map(o => ({ key: o.key, label: o.label, score: 0 })))
      .map(c => ({ subject: c.label, score: clamp(c.score) })),
    [categories]
  );

  /** 4) コメント（personal > フォールバック） */
  const fallback = useMemo(
    () => genScoreFallbackBullets({ categories, flags: data.flags }),
    [categories, data.flags]
  );
  const strengths   = data.personalComments?.talents?.length     ? data.personalComments!.talents     : fallback.strengths;
  const improvements= data.personalComments?.challenges?.length  ? data.personalComments!.challenges  : fallback.improvements;
  const personal = { strengths, improvements, notes: fallback.notes };

  /** 5) タイプ別リソース */
  const typeJaForDict = typeJa as unknown as SamuraiLabel;
  const kabutoSrc = kabutoSrcByType[typeJaForDict] ?? '/images/kabuto/oda.svg';
  const detail = TYPE_CONTENTS[typeJaForDict];
  const common = COMMON_BY_TYPE[typeJa] ?? { headline: '' };

  return (
    <div id="print-root" className="printable-root">
      {/* ヘッダ */}
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img src={kabutoSrc} alt={`${typeJa} の兜`} className="h-12 w-12 object-contain shrink-0" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{typeJa} レポート</h1>
            <p className="text-sm text-muted-foreground mt-1">結果ID：{data.resultId}</p>
          </div>
        </div>
        <img src="/images/logo.png" alt="IOT ロゴ" className="h-8 w-auto opacity-90" />
      </header>

      {/* レーダーチャート */}
      <Card className="rounded-2xl border shadow-sm mt-3 break-inside-avoid">
        <CardContent className="px-6 py-4">
          <h2 className="text-base sm:text-lg font-semibold mb-2 flex items-center gap-2">
            <Compass className="w-5 h-5" /> スコア可視化（0–3）
          </h2>
          <div className="w-full h-56 sm:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 3]} />
                <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* とは？ */}
      <Card className="rounded-2xl border shadow-sm mt-4 break-inside-avoid">
        <CardContent className="p-6 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Smile className="w-5 h-5" /> {typeJa} とは？
          </h2>
          {!!common.headline && <p className="text-base font-medium">{common.headline}</p>}
          {detail?.description && <p className="text-sm leading-6 text-muted-foreground">{detail.description}</p>}
        </CardContent>
      </Card>

      {/* タイプ別 詳細 */}
      {detail && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Card className="rounded-2xl border shadow-sm break-inside-avoid">
              <CardContent className="p-6 space-y-2">
                <h3 className="font-semibold">〔長所〕</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {detail.strengths.map((t, i) => <li key={`st-${i}`} className="text-sm leading-6">{t}</li>)}
                </ul>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border shadow-sm break-inside-avoid">
              <CardContent className="p-6 space-y-2">
                <h3 className="font-semibold">〔落とし穴〕</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {detail.pitfalls.map((t, i) => <li key={`pf-${i}`} className="text-sm leading-6">{t}</li>)}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border shadow-sm mt-4 break-inside-avoid">
            <CardContent className="p-6 space-y-2">
              <h3 className="font-semibold">〔伸ばすべきポイント〕</h3>
              <ol className="list-decimal pl-5 space-y-1">
                {detail.shouldFocus.map((t, i) => <li key={`sf-${i}`} className="text-sm leading-6">{t}</li>)}
              </ol>
            </CardContent>
          </Card>

          {detail.growthStory && (
            <Card className="rounded-2xl border shadow-sm mt-4 break-inside-avoid">
              <CardContent className="p-6 space-y-2">
                <h3 className="font-semibold">〔現代における成長ストーリー〕</h3>
                <p className="text-sm leading-7 text-muted-foreground">{detail.growthStory}</p>
              </CardContent>
            </Card>
          )}

          {detail.actionPlan?.length ? (
            <Card className="rounded-2xl border shadow-sm mt-4 break-inside-avoid">
              <CardContent className="p-6 space-y-2">
                <h3 className="font-semibold">〔具体的なアクションプラン〕</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {detail.actionPlan.map((t, i) => <li key={`ap-${i}`} className="text-sm leading-6">{t}</li>)}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {detail.connector && <p className="mt-6 text-sm leading-7 text-gray-600">{detail.connector}</p>}
        </>
      )}

      {/* 個別コメント */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <Card className="rounded-2xl border shadow-sm break-inside-avoid">
          <CardContent className="p-6 space-y-1">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="w-5 h-5" /> あなたが持つ才能（ギフト）
            </h3>
            <p className="text-xs text-muted-foreground">※ あなたの回答から抽出した“いま効いている強み”</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              {personal.strengths.map((t, i) => <li key={`ps-${i}`} className="text-sm leading-6">{t}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border shadow-sm break-inside-avoid">
          <CardContent className="p-6 space-y-1">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="w-5 h-5" /> 新たな挑戦のフィールド
            </h3>
            <p className="text-xs text-muted-foreground">※ 次の90日で磨くと効果が高いテーマ</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              {personal.improvements.map((t, i) => <li key={`pi-${i}`} className="text-sm leading-6">{t}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      {personal.notes.length > 0 && (
        <Card className="rounded-2xl border shadow-sm mt-4 break-inside-avoid">
          <CardContent className="p-6 space-y-2">
            <h3 className="font-semibold">補足メモ</h3>
            <ul className="list-disc pl-5 space-y-1">
              {personal.notes.map((n, i) => <li key={`pn-${i}`} className="text-sm leading-6">{n}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      <ReportCTA
        resultId={data.resultId}
        companySize={data.companySize}
        downloadUrl={`/report/${encodeURIComponent(data.resultId)}`}
      />

      {/* オープンチャット */}
      <Card className="rounded-2xl border shadow-sm mt-6 break-inside-avoid print:border">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-5">
          <div className="flex-1">
            <h3 className="text-base font-semibold">最新情報・交流はLINEオープンチャットで</h3>
            <p className="text-sm text-muted-foreground mt-1">経営のヒントやアップデートを配信中。参加は無料です。</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <a href="https://x.gd/9RRcN" className="text-sm underline underline-offset-4" target="_blank" rel="noopener noreferrer">
                参加リンク：https://x.gd/9RRcN
              </a>
              <a href="https://x.gd/9RRcN" target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-2xl border px-3 py-2 text-sm hover:bg-accent">
                オープンチャットに参加する
              </a>
            </div>
          </div>
          <a href="https://x.gd/9RRcN" target="_blank" rel="noopener noreferrer" className="shrink-0" aria-label="LINEオープンチャットに参加する">
            <img
              src="/images/qr-openchat.jpg"
              alt="LINEオープンチャットQRコード"
              width={144} height={144}
              className="h-36 w-36 rounded-md border bg-white object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </a>
        </CardContent>
      </Card>

      <footer className="pt-6 text-center text-xs text-muted-foreground">© 2025 一般社団法人 企業の未来づくり研究所</footer>
    </div>
  );
}

/* ========= 親（印刷ボタン＆ref） ========= */
export default function ReportTemplate({ data }: { data: ReportInput }) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `report_${data.resultId}`,
    pageStyle: `
      @page { margin: 16mm; }
      @media print {
        .no-print { display: none !important; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .border { border-color: #CCCCCC !important; }
      }`,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-6 sm:p-10">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between no-print">
          <div />
          <Button size="sm" className="rounded-2xl shadow" onClick={handlePrint} aria-label="PDFをダウンロード">
            <Download className="w-4 h-4 mr-2" /> PDFをダウンロード
          </Button>
        </header>
        <div ref={printRef}>
          <ReportBody data={data} />
        </div>
      </div>
    </div>
  );
}

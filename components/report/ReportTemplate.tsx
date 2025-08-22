// components/report/ReportTemplate.tsx
'use client';

import React, { useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Download, Smile, Target, Compass } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { TYPE_CONTENTS } from '@/lib/report/typeContents';
import Link from 'next/link';

// ★ 追加：フォールバック生成を共通関数に分離
import { genScoreFallbackBullets } from '@/lib/report/personalization';

/* ========= 型 ========= */
export type CategoryKey =
  | 'delegation'
  | 'orgDrag'
  | 'commGap'
  | 'updatePower'
  | 'genGap'
  | 'harassmentRisk';

export type SamuraiType =
  | '真田幸村型'
  | '今川義元型'
  | '斎藤道三型'
  | '織田信長型'
  | '豊臣秀吉型'
  | '徳川家康型'
  | '上杉謙信型';

export type CategoryScore = {
  key: CategoryKey;
  label: string;
  score: number; // 0–3
};

export type PersonalComments = {
  talents: string[];     // 各2件想定
  challenges: string[];  // 各2件想定
};

export type ReportInput = {
  resultId: string;
  samuraiType: SamuraiType;
  categories: CategoryScore[];
  flags?: { manyZeroOnQ5?: boolean; noRightHand?: boolean };
  personalComments?: PersonalComments; // 任意
};

/* ========= キャッチ（headline のみ使用） ========= */
const COMMON_BY_TYPE: Record<SamuraiType, { headline: string }> = {
  今川義元型: { headline: '旧体制に安住しがちな安定志向タイプ' },
  織田信長型: { headline: '革新を突き進むトップダウン型' },
  豊臣秀吉型: { headline: '共創と巻き込みで勢いを生むタイプ' },
  真田幸村型: { headline: '柔軟さと進化力を兼ね備えた理想型' },
  斎藤道三型: { headline: '強引な支配で突き進む独裁型' },
  上杉謙信型: { headline: '高潔な精神を大切にする義将型' },
  徳川家康型: { headline: '慎重に構造を整える守りの型' },
};

/* ========= 印刷する中身 ========= */
const Printable = React.forwardRef<HTMLDivElement, { data: ReportInput }>(
  ({ data }, ref) => {
    const common = COMMON_BY_TYPE[data.samuraiType];
    const chartData = useMemo(
      () => data.categories.map((c) => ({ subject: c.label, score: Math.max(0, Math.min(3, c.score)) })),
      [data.categories]
    );

    // スコア由来のフォールバックを先に用意（notesもここで決定）
    const fallback = useMemo(() => genScoreFallbackBullets({ categories: data.categories, flags: data.flags }), [data]);

    // page.tsx から来た personalComments があればそれを優先
    const strengths = data.personalComments?.talents?.length
      ? data.personalComments.talents
      : fallback.strengths;
    const improvements = data.personalComments?.challenges?.length
      ? data.personalComments.challenges
      : fallback.improvements;
    const personal = { strengths, improvements, notes: fallback.notes };

    return (
      <div ref={ref} id="print-root" className="printable-root">
        {/* ヘッダ */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Crown className="w-6 h-6" /> {data.samuraiType} レポート
            </h1>
            <p className="text-sm text-muted-foreground mt-1">結果ID：{data.resultId}</p>
          </div>
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

        {/* とは？（headline + description） */}
        {(() => {
          const detail = TYPE_CONTENTS[data.samuraiType];
          return (
            <Card className="rounded-2xl border shadow-sm mt-4 break-inside-avoid">
              <CardContent className="p-6 space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Smile className="w-5 h-5" /> {data.samuraiType} とは？
                </h2>
                <p className="text-base font-medium">{common.headline}</p>
                {detail?.description ? (
                  <p className="text-sm leading-6 text-muted-foreground">{detail.description}</p>
                ) : null}
              </CardContent>
            </Card>
          );
        })()}

        {/* タイプ別 詳細 */}
        {(() => {
          const detail = TYPE_CONTENTS[data.samuraiType];
          if (!detail) return null;
          return (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <Card className="rounded-2xl border shadow-sm break-inside-avoid">
                  <CardContent className="p-6 space-y-2">
                    <h3 className="font-semibold">〔長所〕</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {detail.strengths.map((t: string, i: number) => (
                        <li key={`st-${i}`} className="text-sm leading-6">{t}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border shadow-sm break-inside-avoid">
                  <CardContent className="p-6 space-y-2">
                    <h3 className="font-semibold">〔落とし穴〕</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {detail.pitfalls.map((t: string, i: number) => (
                        <li key={`pf-${i}`} className="text-sm leading-6">{t}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl border shadow-sm mt-4 break-inside-avoid">
                <CardContent className="p-6 space-y-2">
                  <h3 className="font-semibold">〔伸ばすべきポイント〕</h3>
                  <ol className="list-decimal pl-5 space-y-1">
                    {detail.shouldFocus.map((t: string, i: number) => (
                      <li key={`sf-${i}`} className="text-sm leading-6">{t}</li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              {detail.growthStory ? (
                <Card className="rounded-2xl border shadow-sm mt-4 break-inside-avoid">
                  <CardContent className="p-6 space-y-2">
                    <h3 className="font-semibold">〔現代における成長ストーリー〕</h3>
                    <p className="text-sm leading-7 text-muted-foreground">{detail.growthStory}</p>
                  </CardContent>
                </Card>
              ) : null}

              {detail.actionPlan?.length ? (
                <Card className="rounded-2xl border shadow-sm mt-4 break-inside-avoid">
                  <CardContent className="p-6 space-y-2">
                    <h3 className="font-semibold">〔具体的なアクションプラン〕</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {detail.actionPlan.map((t: string, i: number) => (
                        <li key={`ap-${i}`} className="text-sm leading-6">{t}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : null}

              {detail.connector ? (
                <Card className="rounded-2xl border shadow-sm mt-4 break-inside-avoid">
                  <CardContent className="p-6">
                    <p className="text-sm leading-7">{detail.connector}</p>
                  </CardContent>
                </Card>
              ) : null}
            </>
          );
        })()}

        {/* 個別コメント（自分だけのパート） */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Card className="rounded-2xl border shadow-sm break-inside-avoid">
            <CardContent className="p-6 space-y-1">
              <h3 className="font-semibold flex items-center gap-2">
                <Target className="w-5 h-5" /> あなたが持つ才能（ギフト）
              </h3>
              <p className="text-xs text-muted-foreground">※ あなたの回答から抽出した“いま効いている強み”</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                {personal.strengths.map((t: string, i: number) => (
                  <li key={`ps-${i}`} className="text-sm leading-6">{t}</li>
                ))}
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
                {personal.improvements.map((t: string, i: number) => (
                  <li key={`pi-${i}`} className="text-sm leading-6">{t}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {personal.notes.length > 0 && (
          <Card className="rounded-2xl border shadow-sm mt-4 break-inside-avoid">
            <CardContent className="p-6 space-y-2">
              <h3 className="font-semibold">補足メモ</h3>
              <ul className="list-disc pl-5 space-y-1">
                {personal.notes.map((n: string, i: number) => (
                  <li key={`pn-${i}`} className="text-sm leading-6">{n}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* === ここから：PDFにも載るCTA & オープンチャット === */}
        <Card className="rounded-2xl border-dashed mt-6 break-inside-avoid print:border">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">次の一手を一緒に設計しませんか？</h3>
            <p className="text-sm text-muted-foreground mb-4">
              無料相談（最短30分）で、あなた専用の90日アクションを具体化します。
            </p>
            <Link href={`/consult/start?resultId=${data.resultId}`} className="inline-block">
              <Button size="lg" className="rounded-2xl shadow">
                無料相談に進む（最短1分で予約）
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-sm mt-6 break-inside-avoid print:border">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-5">
            <div className="flex-1">
              <h3 className="text-base font-semibold">最新情報・交流はLINEオープンチャットで</h3>
              <p className="text-sm text-muted-foreground mt-1">経営のヒントやアップデートを配信中。参加は無料です。</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a
                  href="https://x.gd/9RRcN"
                  className="text-sm underline underline-offset-4"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  参加リンク：https://x.gd/9RRcN
                </a>
                <a
                  href="https://x.gd/9RRcN"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-2xl border px-3 py-2 text-sm hover:bg-accent"
                >
                  オープンチャットに参加する
                </a>
              </div>
            </div>

            <a
              href="https://x.gd/9RRcN"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
              aria-label="LINEオープンチャットに参加する"
            >
              {/* ← QR 画像パスを正式版に修正 */}
              <img
                src="/images/qr-openchat.jpg"
                alt="LINEオープンチャットQRコード"
                width={144}
                height={144}
                className="h-36 w-36 rounded-md border bg-white object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </a>
          </CardContent>
        </Card>
        {/* === ここまで：PDFにも載るCTA & オープンチャット === */}

        <footer className="pt-6 text-center text-xs text-muted-foreground">
          © 2025 一般社団法人 企業の未来づくり研究所
        </footer>
      </div>
    );
  }
);
Printable.displayName = 'Printable';

/* ========= レポート（親：印刷ボタン＆ref） ========= */
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
      }
    `,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-6 sm:p-10">
      <div className="max-w-4xl mx-auto">
        {/* 画面用ヘッダ（印刷時は非表示） */}
        <header className="flex items-center justify-between no-print">
          <div />
          <Button size="sm" className="rounded-2xl shadow" onClick={handlePrint} aria-label="PDFをダウンロード">
            <Download className="w-4 h-4 mr-2" />
            PDFをダウンロード
          </Button>
        </header>

        {/* 印刷対象（ここにCTAとQRも含めたのでPDFにも出ます） */}
        <Printable ref={printRef} data={data} />
      </div>
    </div>
  );
}

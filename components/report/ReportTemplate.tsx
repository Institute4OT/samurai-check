// components/report/ReportTemplate.tsx
'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

import ReportBody, { type ReportInput } from './ReportBody';
import ReportCTA from './ReportCTA';

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
          <Button
            size="sm"
            className="rounded-2xl shadow"
            onClick={handlePrint}
            aria-label="PDFをダウンロード"
          >
            <Download className="w-4 h-4 mr-2" />
            PDFをダウンロード
          </Button>
        </header>

        {/* 印刷対象 */}
        <div ref={printRef}>
          <ReportBody data={data} />
          {/* === CTA（PDFにも載る）：会社規模で分岐表示 === */}
          <ReportCTA
            resultId={data.resultId}
            companySize={data.companySize}
            downloadUrl={`/report/${encodeURIComponent(data.resultId)}`}
          />

          {/* オープンチャット告知（共通） */}
          <Card className="rounded-2xl border shadow-sm mt-6 break-inside-avoid print:border">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-5">
              <div className="flex-1">
                <h3 className="text-base font-semibold">最新情報・交流はLINEオープンチャットで</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  経営のヒントやアップデートを配信中。参加は無料です。
                </p>
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
                <img
                  src="/images/qr-openchat.jpg"
                  alt="LINEオープンチャットQRコード"
                  width={144}
                  height={144}
                  className="h-36 w-36 rounded-md border bg-white object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </a>
            </CardContent>
          </Card>

          <footer className="pt-6 text-center text-xs text-muted-foreground">
            © 2025 一般社団法人 企業の未来づくり研究所
          </footer>
        </div>
      </div>
    </div>
  );
}

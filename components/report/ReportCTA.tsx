// components/report/ReportCTA.tsx
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { bookingUrlFor } from '@/lib/emailTemplates';

type Props = {
  resultId: string;
  companySize?: string | null;
  downloadUrl?: string; // 未使用でも互換のため残す
};

const is51Plus = (v?: string | null) => {
  if (!v) return false;
  const s = String(v);
  if (/(^51-)|(^101-)|(^301-)|(^501-)|1001\+/.test(s)) return true;
  if (/51～100|101～300|301～1000|1001名以上|51名以上/.test(s)) return true;
  return false;
};

// 指定の共有リンク（ご要望）＆ OC
const SHARE_URL = 'https://samurai-ck.ourdx-mtg.com/';
const OPENCHAT_URL = process.env.NEXT_PUBLIC_LINE_OC_URL || 'https://x.gd/9RRcN';

export default function ReportCTA({ resultId, companySize }: Props) {
  const big = useMemo(() => is51Plus(companySize), [companySize]);
  const bookingUrl = useMemo(() => bookingUrlFor(undefined, resultId), [resultId]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
      {/* 左：PDFはページ右上のボタンでダウンロードできる旨の案内 */}
      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-6 space-y-2">
          <h3 className="font-semibold">会員様向けPDFダウンロード</h3>
          <p className="text-sm text-muted-foreground">
            右上の「PDFをダウンロード」ボタンから保存できます。
          </p>
        </CardContent>
      </Card>

      {big ? (
        // 右：無料個別相談（特典：51名以上）
        <Card className="rounded-2xl border shadow-sm">
          <CardContent className="p-6 space-y-2">
            <h3 className="font-semibold">無料個別相談（特典）</h3>
            <p className="text-sm text-muted-foreground">
              本相談は、詳細レポートをお申込みいただいた
              <b>従業員51名以上の企業</b>の経営者・役員向けの特典です。
            </p>
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
              <Button className="rounded-2xl px-4">まずは相談内容を送る</Button>
            </a>

            <div className="pt-3 border-t mt-3">
              <p className="text-xs text-muted-foreground">
                最新情報・交流は LINE オープンチャットへ：
                <a className="underline underline-offset-4 ml-1" href={OPENCHAT_URL} target="_blank" rel="noopener noreferrer">
                  {OPENCHAT_URL}
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        // 右：50名以下は「SNS拡散＋OC」カード（申込UIは出さない）
        <Card className="rounded-2xl border shadow-sm">
          <CardContent className="p-6 space-y-2">
            <h3 className="font-semibold">応援のお願い（SNSで拡散）</h3>
            <p className="text-sm text-muted-foreground">
              価値を感じていただけたら、ぜひ経営者仲間へご紹介ください。
            </p>
            <div className="text-sm">
              紹介用リンク：
              <a className="underline underline-offset-4 ml-1" href={SHARE_URL} target="_blank" rel="noopener noreferrer">
                {SHARE_URL}
              </a>
            </div>
            <div className="pt-3 border-t mt-3">
              <p className="text-sm text-muted-foreground">
                最新情報・交流は LINE オープンチャットへ：
                <a className="underline underline-offset-4 ml-1" href={OPENCHAT_URL} target="_blank" rel="noopener noreferrer">
                  {OPENCHAT_URL}
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

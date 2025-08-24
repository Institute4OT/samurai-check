// /components/report/ReportCTA.tsx
'use client';
import React from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  resultId: string;
  companySize?: string; // '1-10' | '11-50' | '51-100' | ...
  downloadUrl: string;  // PDF/HTML ダウンロード/閲覧URL
};

const is51Plus = (v?: string) =>
  v ? ['51-100','101-300','301-500','501-1000','1001+'].includes(v) : false;

export default function ReportCTA({ resultId, companySize, downloadUrl }: Props) {
  const showConsult = is51Plus(companySize);
  return (
    <div className="grid md:grid-cols-2 gap-4 mt-6">
      {/* 🎁 無料レポート（共通） */}
      <div className="rounded-2xl border shadow-sm p-6 bg-gradient-to-br from-amber-50 to-white">
        <p className="text-sm text-amber-700 font-semibold mb-1">🎁 特別プレゼント</p>
        <h4 className="text-lg font-semibold mb-2">無料レポートのダウンロード</h4>
        <p className="text-sm text-gray-600 mb-4">
          いまご覧の内容をPDFとして保存できます。チーム共有や振り返りにどうぞ。
        </p>
        <Button asChild className="w-full">
          <a href={downloadUrl} target="_blank" rel="noopener">PDFをダウンロード</a>
        </Button>
      </div>

      {/* ✨ 無料個別相談（51名以上のみ） */}
      {showConsult ? (
        <div className="rounded-2xl border shadow-sm p-6 bg-gradient-to-br from-violet-50 to-white">
          <p className="text-sm text-violet-700 font-semibold mb-1">✨ 今だけの特典</p>
          <h4 className="text-lg font-semibold mb-2">無料個別相談（30〜45分）</h4>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-4">
            <li>結果の読み解きと“詰まり”の特定</li>
            <li>90日アクション（3つの打ち手＋計測）草案</li>
            <li>自社版テンプレ（判断基準/任せ方）の叩き台</li>
          </ul>
          <Button asChild variant="secondary" className="w-full">
            <a href={`/consult/start?resultId=${encodeURIComponent(resultId)}`}>無料個別相談を申し込む</a>
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border shadow-sm p-6 bg-white/70">
          <p className="text-sm text-gray-500">※個別相談のご案内は組織規模51名以上の方に表示されます。</p>
        </div>
      )}
    </div>
  );
}

// /components/report/ReportCTA.tsx
'use client';
import { Card, CardContent } from '@/components/ui/card';
import { isSMB, isMid, isEnterprise, normalizeCompanySize } from '@/types/diagnosis';

type Props = {
  companySize?: string;      // フォームの生値でもOK
  shareUrl?: string;         // 50名以下：シェア案内先
  consultUrl?: string;       // 51名以上：無料個別相談リンク
};

export default function ReportCTA({ companySize, shareUrl = '#', consultUrl = '#' }: Props) {
  const bucket = normalizeCompanySize(companySize ?? 'unknown');

  if (isSMB(bucket)) {
    return (
      <Card className="border rounded-2xl">
        <CardContent className="p-6 space-y-2">
          <h3 className="text-lg font-semibold">🌟50名以下の経営者向け</h3>
          <p className="text-sm">診断アプリのご紹介にご協力ください（経営者仲間やSNSでのシェア・拡散をお願いします）。</p>
          <a className="underline text-sm" href={shareUrl} target="_blank" rel="noopener noreferrer">
            ▶ 診断アプリを紹介・シェアする
          </a>
        </CardContent>
      </Card>
    );
  }

  if (isMid(bucket) || isEnterprise(bucket)) {
    return (
      <Card className="border rounded-2xl">
        <CardContent className="p-6 space-y-2">
          <h3 className="text-lg font-semibold">🌟詳細レポート特典：無料個別相談のご案内</h3>
          <p className="text-sm">全社展開・制度設計・実装プランの最短ルートをご提案します。</p>
          <a className="underline text-sm" href={consultUrl} target="_blank" rel="noopener noreferrer">
            ▶ 無料個別相談を予約
          </a>
        </CardContent>
      </Card>
    );
  }

  // 不明：安全側（SMB扱いに近い案内）
  return (
    <Card className="border rounded-2xl">
      <CardContent className="p-6 space-y-2">
        <h3 className="text-lg font-semibold">ご案内</h3>
        <p className="text-sm">診断アプリのシェア、または個別相談をご希望の場合は以下からお進みください。</p>
      </CardContent>
    </Card>
  );
}

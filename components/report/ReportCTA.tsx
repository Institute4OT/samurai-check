'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ExternalLink, Mail } from 'lucide-react';

/** UUIDらしさの簡易判定（ハイフン有無どちらもOK） */
function isUuidish(v: string | null | undefined): v is string {
  if (!v) return false;
  const s = v.trim();
  return /^[0-9a-fA-F-]{30,}$/.test(s);
}

/** URL文字列から rid を抜き出す */
function extractRidFromUrl(urlLike: string | null | undefined): string | null {
  try {
    if (!urlLike) return null;
    const u = new URL(urlLike);
    const cand = u.searchParams.get('rid') || u.searchParams.get('id');
    return isUuidish(cand) ? cand! : null;
  } catch {
    return null;
  }
}

/** localStorage を総当りで探索 */
function readRidFromStorage(): string | null {
  const keys = ['samurai:rid', 'samurai_last_rid', 'reportRid', 'resultId', 'rid'];
  for (const k of keys) {
    try {
      const v = localStorage.getItem(k);
      if (isUuidish(v)) return v!;
    } catch {}
  }
  return null;
}

type Props = {
  /** 親から渡される診断結果ID（= rid）。`ReportTemplate`はここに data.resultId を渡している想定 */
  resultId?: string;
  /** 既定の会社規模（フォームで再選択できるので導線は共通のままでOK） */
  companySize?: string;
  /** PDFのDLリンクなど（任意。無くてもOK） */
  downloadUrl?: string;
};

export default function ReportCTA({ resultId, companySize, downloadUrl }: Props) {
  const sp = useSearchParams();

  const [rid, setRid] = useState<string>('');

  // ridの解決順：①props ②URL ③localStorage ④referrer
  useEffect(() => {
    const fromProps = isUuidish(resultId) ? resultId! : null;
    const fromQuery = (() => {
      const q = sp?.get('rid') || sp?.get('id');
      return isUuidish(q) ? q! : null;
    })();
    const fromStore = readRidFromStorage();
    const fromRef = extractRidFromUrl(document.referrer);

    const found = fromProps || fromQuery || fromStore || fromRef;
    if (found) {
      setRid(found);
      try {
        localStorage.setItem('samurai:rid', found);
      } catch {}
    }
  }, [resultId, sp]);

  const hrefForm = useMemo(
    () => (rid ? `/form?rid=${encodeURIComponent(rid)}` : '#'),
    [rid]
  );

  const disabled = !isUuidish(rid);

  return (
    <div className="mt-6 rounded-2xl border shadow-sm p-6 bg-white/80 print:hidden">
      <h2 className="text-lg font-semibold mb-2">詳細レポートのお申込み</h2>
      <p className="text-sm text-gray-600 mb-4">
        診断結果ID（rid）を自動で引き継ぎます。お申込み後、数分以内にメールが届きます。
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* ～50名向け（導線は共通。テキストだけ分ける） */}
        <Link href={hrefForm} prefetch={false} aria-disabled={disabled}>
          <Button className="w-full" disabled={disabled}>
            会社規模：～50名向けで申込
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </Link>

        {/* 51名以上向け（導線は共通） */}
        <Link href={hrefForm} prefetch={false} aria-disabled={disabled}>
          <Button className="w-full" variant="secondary" disabled={disabled}>
            会社規模：51名以上向けで申込
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {downloadUrl && (
        <div className="mt-3">
          <a
            href={downloadUrl}
            className="inline-flex items-center text-sm underline underline-offset-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Mail className="mr-1 h-4 w-4" />
            簡易PDFを先にダウンロードする
          </a>
        </div>
      )}

      {disabled ? (
        <p className="mt-3 text-xs text-rose-600">
          診断直後の画面から来るとIDが自動付与されます。見つからない場合は、結果ページURLの
          <code className="px-1 bg-gray-100 rounded">?rid=...</code> をご確認ください。
        </p>
      ) : (
        <p className="mt-3 text-xs text-gray-500">
          引き継ぎ中のID：
          <code className="px-1 bg-gray-100 rounded">{rid}</code>
          {companySize ? `（想定：${companySize}）` : null}
        </p>
      )}
    </div>
  );
}

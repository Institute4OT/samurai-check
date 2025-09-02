// components/report/ReportCTA.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

type Props = {
  resultId?: string;     // 非空なら最優先で採用
  companySize?: string;
  downloadUrl?: string;
};

export default function ReportCTA({ resultId, companySize, downloadUrl }: Props) {
  const [rid, setRid] = useState<string>('');

  useEffect(() => {
    // ① props ② URL ③ localStorage ④ referrer の順で拾う
    const fromProps = resultId && resultId.trim() ? resultId.trim() : null;

    const fromUrl = (() => {
      try {
        const u = new URL(window.location.href);
        const q = u.searchParams.get('rid') || u.searchParams.get('id');
        return q && q.trim() ? q.trim() : null;
      } catch { return null; }
    })();

    const fromStore = (() => {
      const keys = ['samurai:rid','samurai_last_rid','reportRid','resultId','rid'];
      for (const k of keys) {
        try {
          const v = localStorage.getItem(k);
          if (v && v.trim()) return v.trim();
        } catch {}
      }
      return null;
    })();

    const fromRef = (() => {
      try {
        const u = new URL(document.referrer);
        const q = u.searchParams.get('rid') || u.searchParams.get('id');
        return q && q.trim() ? q.trim() : null;
      } catch { return null; }
    })();

    const found = fromProps || fromUrl || fromStore || fromRef;
    if (found) {
      setRid(found);
      try { localStorage.setItem('samurai:rid', found); } catch {}
    }
  }, [resultId]);

  const hrefForm = useMemo(
    () => (rid ? `/form?rid=${encodeURIComponent(rid)}` : '#'),
    [rid]
  );

  const disabled = !rid?.trim();

  return (
    <div className="mt-6 rounded-2xl border shadow-sm p-6 bg-white/80 print:hidden">
      <h2 className="text-lg font-semibold mb-2">詳細レポートのお申込み</h2>
      <p className="text-sm text-gray-600 mb-4">
        結果ID（rid）を自動で引き継ぎます。お申込み後、数分以内にメールが届きます。
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href={hrefForm} prefetch={false} aria-disabled={disabled}>
          <Button className="w-full" disabled={disabled}>
            会社規模：～50名向けで申込
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <Link href={hrefForm} prefetch={false} aria-disabled={disabled}>
          <Button className="w-full" variant="secondary" disabled={disabled}>
            会社規模：51名以上向けで申込
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {!!downloadUrl && (
        <div className="mt-3">
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center text-sm underline underline-offset-4">
            先に簡易PDFをダウンロードする
          </a>
        </div>
      )}

      {rid ? (
        <p className="mt-3 text-xs text-gray-500">
          引き継ぎ中のID：<code className="px-1 bg-gray-100 rounded">{rid}</code>
          {companySize ? `（想定：${companySize}）` : null}
        </p>
      ) : (
        <p className="mt-3 text-xs text-rose-600">
          結果ページのURLに含まれる
          <code className="px-1 bg-gray-100 rounded">?rid=…</code> を取得します。
        </p>
      )}
    </div>
  );
}

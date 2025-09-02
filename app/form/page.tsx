'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

/** UUIDっぽい文字列かザックリ判定（ハイフン有り無しどちらもOK） */
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

/** localStorage の候補キーを総当りして rid を探す */
function readRidFromStorage(): string | null {
  const keys = [
    'samurai:rid',
    'samurai_last_rid',
    'reportRid',
    'resultId',
    'rid',
  ];
  for (const k of keys) {
    try {
      const v = localStorage.getItem(k);
      if (isUuidish(v)) return v!;
    } catch {}
  }
  return null;
}

const companySizes = [
  '1～10名',
  '11～50名',
  '51～100名',
  '101～300名',
  '301～1000名',
  '1001名以上',
] as const;

const industries = [
  '製造',
  'IT・通信',
  '医療・福祉',
  '金融・保険',
  '建設・不動産',
  '運輸・物流',
  '公務・官公庁',
  '教育・研究',
  '小売・サービス',
  'その他',
] as const;

const ageBands = [
  '～29歳',
  '30～39歳',
  '40～49歳',
  '50～59歳',
  '60歳以上',
] as const;

export default function ReportRequestFormPage() {
  const router = useRouter();

  const [rid, setRid] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [companySize, setCompanySize] = useState<typeof companySizes[number]>('101～300名');
  const [industry, setIndustry] = useState<typeof industries[number]>('金融・保険');
  const [ageBand, setAgeBand] = useState<typeof ageBands[number]>('50～59歳');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** 初回マウント時：rid を ①URL ②localStorage ③直前URL の順で自動取得 */
  useEffect(() => {
    // ① 現在URL
    const fromSelf = extractRidFromUrl(window.location.href);
    // ② localStorage
    const fromStorage = readRidFromStorage();
    // ③ document.referrer
    const fromRef = extractRidFromUrl(document.referrer);

    const found = fromSelf || fromStorage || fromRef;
    if (found) {
      setRid(found);
      try {
        localStorage.setItem('samurai:rid', found);
      } catch {}
    }
  }, []);

  const isReadyToSubmit = useMemo(() => {
    return (
      isUuidish(rid) &&
      name.trim().length > 0 &&
      /\S+@\S+\.\S+/.test(email) &&
      companySize &&
      industry &&
      ageBand
    );
  }, [rid, name, email, companySize, industry, ageBand]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!isReadyToSubmit) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/report-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rid: rid.trim(),
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || null,
          company_size: companySize,
          industry,
          age_band: ageBand,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }

      setMessage('送信しました。数分以内にメールをご確認ください！');
      try {
        localStorage.setItem('samurai:rid', rid.trim());
      } catch {}
      // 送信後はトップ等に戻したい場合は下記を活かす
      // router.push('/thanks');
    } catch (err: any) {
      setError(`送信に失敗しました：${err?.message ?? String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold mb-6">詳細レポート申込</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* rid */}
        <div>
          <label className="block text-sm font-medium mb-1">
            診断結果ID（rid）
          </label>
          <input
            type="text"
            inputMode="text"
            value={rid}
            onChange={(e) => setRid(e.target.value)}
            placeholder="UUID（診断直後のリンクから自動入力）"
            className="w-full rounded-md border px-3 py-2"
          />
          {!rid && (
            <p className="mt-2 text-xs text-gray-500">
              直前の診断結果ページから来ると自動入力されます。見つからない場合は、
              結果ページのURLの
              <code className="px-1 bg-gray-100 rounded">?rid=...</code>
              の値を貼り付けてください。
            </p>
          )}
        </div>

        {/* name & email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">お名前</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              placeholder="例）今川ヨシタカ"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">メール</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              placeholder="you@example.com"
            />
          </div>
        </div>

        {/* company */}
        <div>
          <label className="block text-sm font-medium mb-1">
            会社名（任意）
          </label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="例）（株）今川焼"
          />
        </div>

        {/* company size */}
        <div>
          <label className="block text-sm font-medium mb-1">会社規模</label>
          <select
            value={companySize}
            onChange={(e) =>
              setCompanySize(e.target.value as (typeof companySizes)[number])
            }
            className="w-full rounded-md border px-3 py-2"
          >
            {companySizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* industry */}
        <div>
          <label className="block text-sm font-medium mb-1">業種</label>
          <select
            value={industry}
            onChange={(e) =>
              setIndustry(e.target.value as (typeof industries)[number])
            }
            className="w-full rounded-md border px-3 py-2"
          >
            {industries.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* age band */}
        <div>
          <label className="block text-sm font-medium mb-1">年齢</label>
          <select
            value={ageBand}
            onChange={(e) =>
              setAgeBand(e.target.value as (typeof ageBands)[number])
            }
            className="w-full rounded-md border px-3 py-2"
          >
            {ageBands.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* actions */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={!isReadyToSubmit || submitting}
            className={`w-full rounded-md px-4 py-3 text-white ${
              !isReadyToSubmit || submitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-black hover:opacity-90'
            }`}
          >
            {submitting ? '送信中...' : '送信'}
          </button>
          {!isUuidish(rid) && (
            <p className="mt-2 text-xs text-rose-600">
              ridが未入力／形式不正のため送信できません。
            </p>
          )}
          {message && (
            <p className="mt-3 text-sm text-emerald-700">{message}</p>
          )}
          {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
        </div>
      </form>

      <hr className="my-8" />
      <div className="text-xs text-gray-500 space-y-1">
        <p>※ ridは診断結果ページのURLに含まれるIDです。</p>
        <p>
          例：
          <code className="px-1 bg-gray-100 rounded">
            https://samurai-check.vercel.app/result?rid=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
          </code>
        </p>
      </div>
    </main>
  );
}

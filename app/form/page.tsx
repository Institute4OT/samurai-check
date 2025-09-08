// app/form/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { resolveRidFromEnv } from '@/lib/utils/resolveRid'; // 共通ロジックを使用

/** UUID / ULID / 16+英数[_-] を許容（警告表示用） */
function isIdish(v: string | null | undefined): boolean {
  if (!v) return false;
  const s = v.trim();
  const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const ulid = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  const generic = /^[A-Za-z0-9_-]{16,}$/;
  return uuid.test(s) || ulid.test(s) || generic.test(s);
}

const companySizes = ['1～10名','11～50名','51～100名','101～300名','301～1000名','1001名以上'] as const;
const industries   = ['製造','IT・通信','医療・福祉','金融・保険','建設・不動産','運輸・物流','公務・官公庁','教育・研究','小売・サービス','その他'] as const;
const ageBands     = ['～29歳','30～39歳','40～49歳','50～59歳','60歳以上'] as const;

export default function ReportRequestFormPage() {
  const [rid, setRid] = useState<string>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [companySize, setCompanySize] = useState<(typeof companySizes)[number]>('101～300名');
  const [industry, setIndustry] = useState<(typeof industries)[number]>('金融・保険');
  const [ageBand, setAgeBand] = useState<(typeof ageBands)[number]>('50～59歳');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // URL(クエリ/パス) → Storage → Cookie の順で解決（共通関数）
  useEffect(() => {
    const v = resolveRidFromEnv();
    if (v) {
      setRid(v);
      try {
        localStorage.setItem('samurai:rid', v);
        sessionStorage.setItem('samurai:rid', v);
        document.cookie = `samurai_rid=${encodeURIComponent(v)}; Path=/; Max-Age=1800; SameSite=Lax`;
      } catch {}
    }
  }, []);

  // 🟢 形式チェックは外し、「空でないこと」だけ必須（サーバ側で照合）
  const isReadyToSubmit = useMemo(() => {
    return (
      rid.trim().length > 0 &&
      name.trim().length > 0 &&
      /\S+@\S+\.\S+/.test(email) &&
      companySize && industry && ageBand
    );
  }, [rid, name, email, companySize, industry, ageBand]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!isReadyToSubmit) return;

    setSubmitting(true);
    try {
      const r = rid.trim();
      try {
        localStorage.setItem('samurai:rid', r);
        sessionStorage.setItem('samurai:rid', r);
        document.cookie = `samurai_rid=${encodeURIComponent(r)}; Path=/; Max-Age=1800; SameSite=Lax`;
      } catch {}

      const res = await fetch('/api/report-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rid: r,            // 正式キー
          resultId: r,       // 互換
          name: name.trim(),
          email: email.trim(),
          company_size: companySize,
          company_name: company.trim() || null,
          industry,
          age_range: ageBand,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      setMessage('送信しました。数分以内にメールをご確認ください！');
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
          <label className="block text-sm font-medium mb-1">結果ID（rid）</label>
          <input
            type="text"
            value={rid}
            onChange={(e) => setRid(e.target.value)}
            placeholder="UUID / ULID / NanoID（結果ページから自動入力）"
            className="w-full rounded-md border px-3 py-2"
          />
          {!rid && (
            <p className="mt-2 text-xs text-gray-500">
              直前の結果ページから来ると自動入力されます。見つからない場合は、
              結果ページURLの <code className="px-1 bg-gray-100 rounded">?rid=…</code> または
              パス末尾のIDを貼り付けてください。
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
          <label className="block text-sm font-medium mb-1">会社名（任意）</label>
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
            onChange={(e) => setCompanySize(e.target.value as (typeof companySizes)[number])}
            className="w-full rounded-md border px-3 py-2"
          >
            {companySizes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* industry */}
        <div>
          <label className="block text-sm font-medium mb-1">業種</label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value as (typeof industries)[number])}
            className="w-full rounded-md border px-3 py-2"
          >
            {industries.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* age band */}
        <div>
          <label className="block text-sm font-medium mb-1">年齢</label>
          <select
            value={ageBand}
            onChange={(e) => setAgeBand(e.target.value as (typeof ageBands)[number])}
            className="w-full rounded-md border px-3 py-2"
          >
            {ageBands.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* actions */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={!isReadyToSubmit || submitting}
            className={`w-full rounded-md px-4 py-3 text-white ${
              !isReadyToSubmit || submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:opacity-90'
            }`}
          >
            {submitting ? '送信中…' : '送信'}
          </button>

          {/* 形式は想定外でも送信は許可（サーバ照合） */}
          {rid.trim().length > 0 && !isIdish(rid) && (
            <p className="mt-2 text-xs text-amber-600">
              ※ ID形式が想定外ですが、このまま送信できます（サーバー側で照合します）
            </p>
          )}

          {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
          {error &&   <p className="mt-3 text-sm text-rose-700">{error}</p>}
        </div>
      </form>

      <hr className="my-8" />
      <div className="text-xs text-gray-500 space-y-1">
        <p>※ 結果ID（rid）は結果ページのURLに含まれるIDです（UUID/ULID/NanoIDいずれも可）。</p>
        <p>
          例：<code className="px-1 bg-gray-100 rounded">/result?rid=xxxxxxxx</code> または
          <code className="px-1 bg-gray-100 rounded">/result/xxxxxxxx</code>
        </p>
      </div>
    </main>
  );
}

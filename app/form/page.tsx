// app/form/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

/* ---------- マスタ ---------- */
const COMPANY_SIZE_OPTIONS = [
  '～10名',
  '11～50名',
  '51～100名',
  '101～300名',
  '301～500名',
  '501～1000名',
  '1001名以上',
];

const INDUSTRY_OPTIONS = [
  '製造業',
  '情報・通信',
  '医療・福祉',
  '金融・保険',
  '建設',
  '卸売・小売',
  '教育・学術',
  '公務・団体',
  'その他',
];

const AGE_RANGE_OPTIONS = ['～39歳', '40～49歳', '50～59歳', '60～69歳', '70歳～'];

/* ---------- rid 復元（URL > localStorage > なし） ---------- */
function useResolvedRid() {
  const sp = useSearchParams();
  const ridFromUrl =
    sp.get('resultId') ||
    sp.get('rid') ||
    sp.get('result') ||
    sp.get('id') ||
    '';

  const [rid, setRid] = useState<string>('');
  const [ridLocked, setRidLocked] = useState(false);

  useEffect(() => {
    const fromStorage =
      localStorage.getItem('samurai:lastRid') ||
      localStorage.getItem('samurai_last_rid') ||
      sessionStorage.getItem('samurai:lastRid') ||
      '';

    const v = ridFromUrl || fromStorage || '';
    setRid(v);
    setRidLocked(Boolean(ridFromUrl));

    // URL に rid があれば最新値として保存（/form 直叩きでも復元できる）
    if (ridFromUrl) {
      localStorage.setItem('samurai:lastRid', ridFromUrl);
    }
  }, [ridFromUrl]);

  return { rid, setRid, ridLocked };
}

/* ---------- ページ ---------- */
export default function FormPage() {
  const { rid, setRid, ridLocked } = useResolvedRid();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [industry, setIndustry] = useState('');
  const [ageRange, setAgeRange] = useState('');

  const emailOk = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);

  const disabled = useMemo(
    () => !rid || !name.trim() || !emailOk || !companySize || !industry || !ageRange,
    [rid, name, emailOk, companySize, industry, ageRange]
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const body = {
        rid: rid.trim(),
        name: name.trim(),
        email: email.trim(),
        company_size: companySize,
        industry,
        age_range: ageRange,
        company_name: companyName || undefined, // 任意
      };

      const res = await fetch('/api/report-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => '');
        alert('送信に失敗しました。' + (t ? `\n${t}` : ''));
        return;
      }

      alert('詳細レポート申込を受け付けました。メールをご確認ください。');
    },
    [rid, name, email, companySize, industry, ageRange, companyName]
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">詳細レポート申込</h1>

      <form className="space-y-6" onSubmit={onSubmit}>
        {/* 診断結果ID */}
        <div>
          <label className="block text-sm font-medium">診断結果ID（rid）</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="text"
            name="rid"
            value={rid}
            onChange={(e) => setRid(e.target.value.trim())}
            placeholder="UUID（診断直後のリンクから自動入力）"
            readOnly={ridLocked}
          />
          <p className="mt-1 text-xs text-gray-500">
            ※ URLに含まれていない場合も、直前の診断IDを自動復元します。
          </p>
        </div>

        {/* 氏名・メール */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">お名前</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">メール</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            {!emailOk && email.length > 0 && (
              <p className="mt-1 text-xs text-red-600">メールアドレスの形式で入力してください。</p>
            )}
          </div>
        </div>

        {/* 会社名（任意） */}
        <div>
          <label className="block text-sm font-medium">会社名（任意）</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="例）株式会社〇〇"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            autoComplete="organization"
          />
        </div>

        {/* 会社規模 */}
        <div>
          <label className="block text-sm font-medium">会社規模</label>
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={companySize}
            onChange={(e) => setCompanySize(e.target.value)}
          >
            <option value="">選択してください</option>
            {COMPANY_SIZE_OPTIONS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </div>

        {/* 業種（日本語のみ） */}
        <div>
          <label className="block text-sm font-medium">業種</label>
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          >
            <option value="">選択してください</option>
            {INDUSTRY_OPTIONS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </div>

        {/* 年齢（日本語のみ） */}
        <div>
          <label className="block text-sm font-medium">年齢</label>
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
          >
            <option value="">選択してください</option>
            {AGE_RANGE_OPTIONS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </div>

        {/* 送信 */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={disabled}
            className="w-full rounded bg-black px-4 py-2 font-semibold text-white disabled:opacity-40"
          >
            送信
          </button>
        </div>
      </form>
    </main>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, useCallback } from "react";

const COMPANY_SIZE_OPTIONS = [
  "～10名",
  "11～50名",
  "51～100名",
  "101～300名",
  "301～500名",
  "501～1000名",
  "1001名以上",
];

const INDUSTRY_OPTIONS = [
  "製造業",
  "情報・通信",
  "医療・福祉",
  "金融・保険",
  "建設",
  "卸売・小売",
  "教育・学術",
  "公務・団体",
  "その他",
];

const AGE_RANGE_OPTIONS = ["～39歳", "40～49歳", "50～59歳", "60～69歳", "70歳～"];

export default function FormPage() {
  const sp = useSearchParams();
  // メールのリンクが ?rid= または ?resultId= のどちらでも拾う
  const ridFromQuery = sp.get("rid") || sp.get("resultId") || "";

  const [rid, setRid] = useState(ridFromQuery);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [industry, setIndustry] = useState("");
  const [ageRange, setAgeRange] = useState("");

  const disabled = useMemo(
    () => !rid || !name || !email || !companySize || !industry || !ageRange,
    [rid, name, email, companySize, industry, ageRange]
  );

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      rid,
      name,
      email,
      company_size: companySize,
      industry,
      age_range: ageRange,
      company_name: companyName || undefined, // 任意
    };

    const res = await fetch("/api/report-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      alert("送信に失敗しました。" + (t ? `\n${t}` : ""));
      return;
    }
    alert("詳細レポート申込を受け付けました。メールをご確認ください。");
  }, [rid, name, email, companySize, industry, ageRange, companyName]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">詳細レポート申込</h1>

      <form className="space-y-6" onSubmit={onSubmit}>
        {/* 診断結果ID（URLにあれば自動入力＆編集不可） */}
        <div>
          <label className="block text-sm font-medium">診断結果ID（rid）</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="text"
            name="rid"
            value={rid}
            onChange={(e) => setRid(e.target.value.trim())}
            placeholder="UUID（?rid=xxxxx が自動入力）"
            readOnly={!!ridFromQuery}
          />
          <p className="mt-1 text-xs text-gray-500">
            ※ 診断直後のリンクから自動入力されます。
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
            />
          </div>
          <div>
            <label className="block text-sm font-medium">メール</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
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
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </div>

        {/* 業種 */}
        <div>
          <label className="block text-sm font-medium">業種（industry）</label>
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          >
            <option value="">選択してください</option>
            {INDUSTRY_OPTIONS.map((op) => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </div>

        {/* 年齢帯 */}
        <div>
          <label className="block text-sm font-medium">年齢帯（age_range）</label>
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
          >
            <option value="">選択してください</option>
            {AGE_RANGE_OPTIONS.map((op) => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </div>

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

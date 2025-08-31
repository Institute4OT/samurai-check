// app/form/page.tsx
"use client";

import { useCallback, useMemo, useState } from "react";

type Props = {
  searchParams?: { rid?: string; company_size?: string };
};

const INDUSTRY_OPTIONS = [
  "製造業", "IT/通信", "医療/福祉", "金融", "建設/設備",
  "小売/流通", "運輸/物流", "不動産", "教育/研究", "その他",
];

// 年齢帯レンジ（確定版）
const AGE_RANGE_OPTIONS = ["～39歳", "40～49歳", "50～59歳", "60～69歳", "70歳～"];

export default function ReportRequestForm(_props: Props) {
  // URLクエリから rid/resultId/id と company_size/companySize を許容
  const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
  const qp = url?.searchParams;
  const initialRid =
    (qp?.get("rid") ?? qp?.get("resultId") ?? qp?.get("id") ?? "").trim();
  const initialCompany =
    (qp?.get("company_size") ?? qp?.get("companySize") ?? "").trim();

  const [rid, setRid] = useState(initialRid);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState(""); // 任意
  const [companySize, setCompanySize] = useState(initialCompany);
  const [industry, setIndustry] = useState<string>("");
  const [ageRange, setAgeRange] = useState<string>("");

  const isRidLocked = !!initialRid;

  const disabled = useMemo(() => {
    return !rid || !name || !email || !companySize;
  }, [rid, name, email, companySize]);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/report-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rid,
        name,
        email,
        company_size: companySize,
        company_name: companyName || null,
        industry: industry || null,
        age_range: ageRange || null,
      }),
    });
    const json = await res.json();
    if (json?.ok) {
      alert("詳細レポート申込を受け付けました。メールをご確認ください。");
    } else {
      alert("送信に失敗しました。時間を置いて再度お試しください。");
    }
  }, [rid, name, email, companySize, companyName, industry, ageRange]);

  return (
    <main className="mx-auto max-w-xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">詳細レポート申込</h1>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1">
          <label className="block text-sm font-medium">診断結果ID（rid）</label>
          <input
            className={`w-full rounded border p-2 ${isRidLocked ? "bg-gray-100 cursor-not-allowed" : ""}`}
            placeholder={isRidLocked ? "自動入力されています" : "UUID（?rid=xxxxx が自動入力）"}
            value={rid}
            readOnly={isRidLocked}
            onChange={(e) => setRid(e.target.value)}
          />
          <p className="text-xs text-gray-500">
            {isRidLocked ? "※ 診断直後のリンクから自動入力。" : "※ 診断直後のリンクに含まれるIDを使用します。"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm font-medium">お名前</label>
            <input className="w-full rounded border p-2" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium">メール</label>
            <input type="email" className="w-full rounded border p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">会社名（任意）</label>
          <input
            className="w-full rounded border p-2"
            placeholder="例）株式会社〇〇"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">会社規模</label>
          <select
            className="w-full rounded border p-2"
            value={companySize}
            onChange={(e) => setCompanySize(e.target.value)}
          >
            <option value="">選択してください</option>
            <option value="1-50">1～50名</option>
            <option value="51-300">51～300名</option>
            <option value="301+">301名以上</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">業種（industry）</label>
          <select className="w-full rounded border p-2" value={industry} onChange={(e) => setIndustry(e.target.value)}>
            <option value="">選択してください</option>
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">年齢帯（age_range）</label>
          <select className="w-full rounded border p-2" value={ageRange} onChange={(e) => setAgeRange(e.target.value)}>
            <option value="">選択してください</option>
            {AGE_RANGE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={disabled}
            className="w-full rounded bg-black px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            送信
          </button>
        </div>
      </form>
    </main>
  );
}

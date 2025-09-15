"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";
import { useReactToPrint } from "react-to-print";

/* ================= 型 ================= */
export type PriorityMapInput = {
  company?: string;
  resultId?: string;
  owner?: string;
  strengths: string[]; // 2つ推奨
  focusIssue: {
    label: string; // 例: 権限委譲・構造
    why: string; // なぜ今それをやるのか(1〜2行)
    risks?: string; // リスク/前提
    killCriteria?: string; // 中止/継続の判断基準
    notThisQuarter?: string; // 今期はやらないこと
  };
  notes?: string[]; // 補足メモ
};

export type ActionItem = {
  title: string; // 打ち手名
  objective: string; // 目的
  owner: string; // 担当
  cadence: string; // リズム
  metric: string; // 指標
  deadline: string; // 期限
};

export type ActionPlanInput = {
  company?: string;
  horizon: string; // 例: 90日
  reviewCadence?: string; // 例: 隔週レビュー
  items: ActionItem[]; // 2〜3推奨
};

export type CompanyTemplateInput = {
  title: string; // 例: 任せ方テンプレ（最小合格/期限/基準）
  bullets: string[]; // 箇条書き
};

/* ============== 汎用：印刷ラッパ ============== */
export function GiftPrintShell({
  filename,
  children,
}: {
  filename: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: ref,
    documentTitle: filename,
    pageStyle: `
      @page { margin: 14mm; }
      @media print {
        .no-print { display: none !important; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `,
  });

  return (
    <div className="p-6">
      <div className="no-print mb-3 flex justify-end">
        <Button size="sm" onClick={handlePrint}>
          <Download className="w-4 h-4 mr-2" />
          PDFをダウンロード
        </Button>
      </div>
      <div ref={ref}>{children}</div>
    </div>
  );
}

/* ============== 1) 優先順位マップ ============== */
export function PriorityMapSheet({ data }: { data: PriorityMapInput }) {
  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardContent className="p-6 space-y-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">優先順位マップ</h1>
          <p className="text-xs text-muted-foreground">
            {data.company ?? "（会社名）"} / ResultID: {data.resultId ?? "-"} /
            Owner: {data.owner ?? "-"}
          </p>
        </header>

        <section>
          <h2 className="font-semibold mb-1">今効いている強み</h2>
          <ul className="list-disc pl-5 space-y-1">
            {data.strengths.map((s, i) => (
              <li key={i} className="text-sm leading-6">
                {s}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-semibold mb-1">この90日で集中する一点</h2>
          <div className="rounded-lg border p-3">
            <p className="text-sm">
              <span className="font-medium">テーマ：</span>
              {data.focusIssue.label}
            </p>
            <p className="text-sm">
              <span className="font-medium">なぜ今：</span>
              {data.focusIssue.why}
            </p>
            {data.focusIssue.risks && (
              <p className="text-sm">
                <span className="font-medium">リスク/前提：</span>
                {data.focusIssue.risks}
              </p>
            )}
            {data.focusIssue.killCriteria && (
              <p className="text-sm">
                <span className="font-medium">中止/継続の判断基準：</span>
                {data.focusIssue.killCriteria}
              </p>
            )}
            {data.focusIssue.notThisQuarter && (
              <p className="text-sm">
                <span className="font-medium">今期はやらない：</span>
                {data.focusIssue.notThisQuarter}
              </p>
            )}
          </div>
        </section>

        {data.notes?.length ? (
          <section>
            <h2 className="font-semibold mb-1">補足メモ</h2>
            <ul className="list-disc pl-5 space-y-1">
              {data.notes.map((n, i) => (
                <li key={i} className="text-sm leading-6">
                  {n}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ============== 2) 90日アクション ============== */
export function ActionPlanSheet({ data }: { data: ActionPlanInput }) {
  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardContent className="p-6 space-y-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">90日アクション</h1>
          <p className="text-xs text-muted-foreground">
            {data.company ?? "（会社名）"} / 期間：{data.horizon}（レビュー：
            {data.reviewCadence ?? "—"}）
          </p>
        </header>

        <div className="space-y-3">
          {data.items.map((it, i) => (
            <div key={i} className="rounded-lg border p-3">
              <p className="text-sm font-medium">
                〔{i + 1}〕{it.title}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-1">
                <p className="text-sm">
                  <span className="font-medium">目的：</span>
                  {it.objective}
                </p>
                <p className="text-sm">
                  <span className="font-medium">担当：</span>
                  {it.owner}
                </p>
                <p className="text-sm">
                  <span className="font-medium">リズム：</span>
                  {it.cadence}
                </p>
                <p className="text-sm">
                  <span className="font-medium">指標：</span>
                  {it.metric}
                </p>
                <p className="text-sm">
                  <span className="font-medium">期限：</span>
                  {it.deadline}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============== 3) 会社テンプレ（任せ方/会議など） ============== */
export function CompanyTemplateSheet({ data }: { data: CompanyTemplateInput }) {
  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardContent className="p-6 space-y-3">
        <h1 className="text-xl font-semibold">{data.title}</h1>
        <ul className="list-disc pl-5 space-y-1">
          {data.bullets.map((b, i) => (
            <li key={i} className="text-sm leading-6">
              {b}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ============== デモデータ（プレビュー用） ============== */
export const demoPriority: PriorityMapInput = {
  company: "テスト株式会社",
  resultId: "demo-result",
  owner: "IOT",
  strengths: ["任せ方の基準が言語化できている", "会議の要点を早く掴める"],
  focusIssue: {
    label: "権限委譲・構造",
    why: "ボトルネックは承認の詰まり。最小合格ラインの共有で自走を加速したい。",
    risks: "判断の質が落ちる/責任の所在が曖昧になる恐れ",
    killCriteria: "期限遅延が継続/再現率が上がらない場合は設計を見直す",
    notThisQuarter: "新規の大型採用/評価制度の全面改定",
  },
  notes: ["今期は「小さく任せる→検証」を徹底。"],
};

export const demoAction: ActionPlanInput = {
  company: "テスト株式会社",
  horizon: "90日",
  reviewCadence: "隔週レビュー",
  items: [
    {
      title: "任せ方テンプレの試運用",
      objective: "最小合格の言語化で自走を促す",
      owner: "人事/現場Mgr",
      cadence: "毎週1on1で確認",
      metric: "再質問回数/リードタイム",
      deadline: "30日以内に部門横展開の判断",
    },
    {
      title: "会議の要約→合意フォーマット導入",
      objective: "説明の手戻り削減/同意形成の速度UP",
      owner: "経営企画",
      cadence: "毎会議",
      metric: "決定事項/保留数/所要時間",
      deadline: "60日以内に全体標準化",
    },
  ],
};

export const demoCompanyDelegation: CompanyTemplateInput = {
  title: "任せ方テンプレ（最小合格/期限/基準）",
  bullets: [
    "Why（目的）→ Scope（範囲）→ Deadline（期限）→ Min Pass（最小合格）を1枚で共有",
    "判断に迷ったら「目的に近い方」を選ぶ",
    "リスク/例外は事前に申告。週1で進捗レビュー",
  ],
};

export const demoCompanyMeeting: CompanyTemplateInput = {
  title: "会議テンプレ（目的→現状→制約→合意）",
  bullets: [
    "冒頭で「目的」「合意したい範囲」を共有",
    "現状/制約/選択肢/判断基準の順に並べる",
    "最後に「合意事項」「保留」「次の一手」を1分で要約",
  ],
};

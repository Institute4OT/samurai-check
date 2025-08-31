// components/report/ReportCTA.tsx
"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSpirUrl } from "@/lib/spir";

type Counselor = "ishijima" | "morigami";

type Props = {
  /** CTA自体を外から制御したい場合（未指定なら内部ロジックで可視/不可視判定） */
  visible?: boolean;

  /** 会社規模（文字でも数値でもOK） */
  companySize?: string | number;

  /** 親から担当者を明示指定（無ければ assignedCounselor を見る） */
  counselor?: Counselor | null;

  /** 親データに含まれる担当者（上とどちらか入っていればOK） */
  assignedCounselor?: Counselor | null;

  /** ボタン文言の下にそえる補足など（任意） */
  subtitle?: string;

  /** 直接URLを渡したい時のオーバーライド（通常は不要） */
  spirUrlOverride?: string | null;

  /** その他（スコアやflagsなど）親から来ても破壊しないために受け取るだけ */
  [key: string]: any;
};

export default function ReportCTA(props: Props) {
  // どの担当者で予約ボタンを出すか
  const counselor: Counselor | null =
    (props.counselor as Counselor) ??
    (props.assignedCounselor as Counselor) ??
    null;

  // URLの決定（明示URL > 担当者URL > null）
  const resolvedUrl = useMemo(() => {
    if (props.spirUrlOverride) return props.spirUrlOverride;
    if (counselor) return getSpirUrl(counselor);
    return null;
  }, [props.spirUrlOverride, counselor]);

  // 表示判定：visibleが明示されていればそれに従う。未指定なら「URLが有効なら表示」
  const show = typeof props.visible === "boolean" ? props.visible : !!resolvedUrl;

  if (!show) return null;

  // 会社規模の文字化（必要に応じて表示に使う）
  const companySizeText =
    typeof props.companySize === "number" ? String(props.companySize) : (props.companySize ?? "");

  const label = counselor === "ishijima" ? "石島／無料個別相談を予約" : "森上／無料個別相談を予約";

  return (
    <div className="mt-6 rounded-2xl border p-4 md:p-6">
      <h3 className="text-lg font-semibold">無料個別相談（30分）</h3>
      {companySizeText ? (
        <p className="mt-1 text-sm text-muted-foreground">会社規模：{companySizeText}</p>
      ) : null}
      {props.subtitle ? (
        <p className="mt-1 text-sm text-muted-foreground">{props.subtitle}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        {resolvedUrl ? (
          <a href={resolvedUrl} target="_blank" rel="noopener noreferrer">
            <Button className="px-5 py-2">{label}</Button>
          </a>
        ) : null}

        {/* 予備導線：URL未設定時などの保険 */}
        <Link href="/consult/start">
          <Button variant="outline" className="px-5 py-2">
            まずは相談内容を送る
          </Button>
        </Link>
      </div>

      {/* 両方のURLが環境変数に入っている時だけ“担当者を変える”補助を出してもOK */}
      {!counselor && (
        <p className="mt-3 text-xs text-muted-foreground">
          ※自動アサイン結果に基づき担当を提案しますが、希望があればお好みの担当をお選びください。
        </p>
      )}
    </div>
  );
}

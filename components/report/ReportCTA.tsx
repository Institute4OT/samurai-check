// components/report/ReportCTA.tsx
"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSpirUrl } from "@/lib/spir";

type Counselor = "ishijima" | "morigami";

type Props = {
  visible?: boolean;
  companySize?: string | number;
  counselor?: Counselor | null;
  assignedCounselor?: Counselor | null;
  subtitle?: string;
  spirUrlOverride?: string | null;
  /** 相談フォームへ rid を引き継ぐため */
  resultId?: string;
  [key: string]: any;
};

export default function ReportCTA(props: Props) {
  const counselor: Counselor | null =
    (props.counselor as Counselor) ??
    (props.assignedCounselor as Counselor) ??
    null;

  const resolvedUrl = useMemo(() => {
    if (props.spirUrlOverride) return props.spirUrlOverride;
    if (counselor) return getSpirUrl(counselor);
    return null;
  }, [props.spirUrlOverride, counselor]);

  const show =
    typeof props.visible === "boolean" ? props.visible : !!resolvedUrl;

  if (!show) return null;

  const companySizeText =
    typeof props.companySize === "number"
      ? String(props.companySize)
      : props.companySize ?? "";

  const label =
    counselor === "ishijima"
      ? "石島／無料個別相談を予約"
      : "森上／無料個別相談を予約";

  const consultHref = `/consult/start${
    props.resultId ? `?rid=${encodeURIComponent(props.resultId)}` : ""
  }`;

  return (
    <div className="mt-6 rounded-2xl border p-4 md:p-6">
      <h3 className="text-lg font-semibold">無料個別相談（30分）</h3>
      {companySizeText ? (
        <p className="mt-1 text-sm text-muted-foreground">
          会社規模：{companySizeText}
        </p>
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

        {/* 予備導線（rid 引き継ぎ済み） */}
        <Link href={consultHref}>
          <Button variant="outline" className="px-5 py-2">
            まずは相談内容を送る
          </Button>
        </Link>
      </div>
    </div>
  );
}

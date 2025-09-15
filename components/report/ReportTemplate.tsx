// /components/report/ReportTemplate.tsx
"use client";

import Image from "next/image";
import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import type { NormalizedCategoryScores, SamuraiType } from "@/types/diagnosis";
import ReportBody, {
  TypeContent,
  PersonalComments,
  OpenChatInfo,
} from "./ReportBody";
import ReportCTA from "./ReportCTA";
import { KABUTO_SRC } from "@/lib/report/kabutoMap";

type Props = {
  diagId: string;
  samuraiType: SamuraiType;
  normalizedScores: NormalizedCategoryScores;
  companySize?: string;
  // 型別本文（勝手に改変しないため、外から渡す設計）
  content: TypeContent;
  // 個別コメント（personalizationの結果を渡す）
  personal?: PersonalComments;
  // オープンチャット
  openChat?: OpenChatInfo;
  // 表示オプション
  title?: string;
  subtitle?: string;
  shareUrl?: string;
  consultUrl?: string;
  // フッター
  brandLogoSrc?: string; // 例: '/images/iot-logo.svg'
  brandSiteUrl?: string; // 例: 'https://ourdx-mtg.com/'
};

const LABELS: Record<keyof NormalizedCategoryScores, string> = {
  delegation: "権限委譲・構造健全度",
  orgDrag: "組織進化阻害",
  commGap: "コミュ力誤差",
  updatePower: "アップデート力",
  genGap: "ジェネギャップ感覚",
  harassmentAwareness: "無自覚ハラ傾向",
  // ★追加
  harassmentRisk: "無自覚ハラ傾向",
};

export default function ReportTemplate({
  diagId,
  samuraiType,
  normalizedScores,
  companySize,
  content,
  personal,
  openChat,
  title,
  subtitle,
  shareUrl,
  consultUrl,
  brandLogoSrc = "/images/iot-logo.svg",
  brandSiteUrl = "https://ourdx-mtg.com/",
}: Props) {
  const radarData = useMemo(
    () =>
      (Object.keys(normalizedScores) as (keyof NormalizedCategoryScores)[]).map(
        (k) => ({
          category: LABELS[k],
          value: normalizedScores[k],
          fullMark: 3,
        }),
      ),
    [normalizedScores],
  );

  const kabuto = KABUTO_SRC[samuraiType];

  return (
    <div className="space-y-6">
      {/* ヘッダー（兜＋型名＋診断ID） */}
      <header className="flex items-center gap-4">
        <div className="relative w-14 h-14">
          <Image
            src={kabuto.src}
            alt={`${kabuto.surname} kabuto`}
            fill
            sizes="56px"
            className="object-contain"
          />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {title ?? "AI時代の経営者｜武将タイプ診断レポート"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {subtitle ?? "AI時代に通用する“経営進化スピード”を診断"}／
            <span className="ml-1">
              ID: <span className="font-mono">{diagId}</span>
            </span>
          </p>
        </div>
      </header>

      {/* タイプ＋レーダー */}
      <Card className="border rounded-2xl">
        <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">あなたの武将タイプ</h2>
            <p className="text-3xl font-bold">{samuraiType}</p>
            <p className="text-xs text-muted-foreground">
              ※各カテゴリは0〜3で正規化表示
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 3]} tick={{ fontSize: 10 }} />
                <Radar
                  name="score"
                  dataKey="value"
                  strokeOpacity={0.9}
                  fillOpacity={0.2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 本文（型別コンテンツ＋個別コメント＋OC） */}
      <ReportBody
        samuraiType={samuraiType}
        normalizedScores={normalizedScores}
        content={content}
        personal={personal}
        openChat={openChat}
      />

      {/* CTA（会社規模別） */}
      <ReportCTA
        companySize={companySize}
        shareUrl={shareUrl}
        consultUrl={consultUrl}
      />

      {/* フッター（IOTロゴ＋著作権） */}
      <footer className="pt-2 pb-8 border-t">
        <div className="flex items-center gap-3">
          {brandLogoSrc && (
            <div className="relative w-16 h-16">
              <Image
                src={brandLogoSrc}
                alt="IOT logo"
                fill
                sizes="64px"
                className="object-contain"
              />
            </div>
          )}
          <div className="text-sm">
            <a
              href={brandSiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              一般社団法人 企業の未来づくり研究所（IOT）
            </a>
            <div>© 一般社団法人企業の未来づくり研究所</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

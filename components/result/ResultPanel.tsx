// components/result/ResultPanel.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import ShareModal from "@/components/common/ShareModal";
import { Share2 } from "lucide-react";
import FinalizeOnMount from "@/components/result/FinalizeOnMount";
import {
  normalizeToCatArray,
  resolveSamuraiType,
  getEmojiLabel,
  coerceNormalized,
} from "@/lib/result/normalize";
import { getSamuraiSlug } from "@/lib/samuraiTypeMap";
import IdBadge from "@/components/result/IdBadge";
import RidSync from "@/components/rid/RidSync";
import type { NormalizedCategoryScores, SamuraiType } from "@/types/diagnosis";

/* ========= ユーティリティ ========= */

// UUID / ULID / NanoID(16+英数) をざっくり許容
function isIdish(v?: string | null) {
  if (!v) return false;
  const s = String(v).trim();
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const ulid = /^[0-9A-HJKMNP-TV-Z]{26}$/; // Crockford base32
  const nano = /^[a-zA-Z0-9_-]{16,}$/; // 16文字以上の英数-_ を許容
  return uuid.test(s) || ulid.test(s) || nano.test(s);
}

// URL から rid を拾う（?rid= / ?resultId= / パス断片の両対応）
function pickRidFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    for (const k of ["rid", "resultId", "resultid", "id"]) {
      const v = url.searchParams.get(k);
      if (isIdish(v)) return String(v);
    }
    const segs = url.pathname.split("/").filter(Boolean);
    for (let i = segs.length - 1; i >= 0; i--) {
      const p = decodeURIComponent(segs[i] || "");
      if (isIdish(p)) return p;
    }
  } catch {}
  return null;
}

/* ========= Props ========= */
type Props = {
  rid?: string | null;
  finalScores: Record<string, unknown> | null;
  samuraiType: string | null;
  comments: { strengths: string[]; tips: string[] };
  onRestart: () => void;
  /** Finalize に渡す回答スナップショット（Q1→選択肢…） */
  scorePattern?: Record<string, string[]> | null;
};

const EMPTY: NormalizedCategoryScores = {
  delegation: 0,
  orgDrag: 0,
  commGap: 0,
  updatePower: 0,
  genGap: 0,
  harassmentAwareness: 0,
};

/* ========= 本体 ========= */
export default function ResultPanel({
  rid,
  finalScores,
  samuraiType,
  comments,
  onRestart,
  scorePattern,
}: Props) {
  // rid を props/URL から解決。URL更新（Finalize後）にも追従させる
  const [ridResolved, setRidResolved] = useState<string>(() => {
    if (isIdish(rid)) return String(rid);
    const fromUrl = pickRidFromLocation();
    return fromUrl ?? "";
  });

  useEffect(() => {
    if (isIdish(rid)) {
      setRidResolved(String(rid));
      return;
    }
    // 初回/Finalize後のURL書換えにも追従
    const tryUpdate = () => {
      const v = pickRidFromLocation();
      if (isIdish(v)) setRidResolved(v!);
    };
    tryUpdate();
    const t = setTimeout(tryUpdate, 300); // Finalize→URL反映の後追いを一回
    window.addEventListener("popstate", tryUpdate);
    return () => {
      clearTimeout(t);
      window.removeEventListener("popstate", tryUpdate);
    };
  }, [rid]);

  // 1) スコアを安全に正規化（null/unknown → 0 埋め）
  const safeScores: NormalizedCategoryScores = useMemo(() => {
    return coerceNormalized(finalScores) ?? EMPTY;
  }, [finalScores]);

  // 2) 表示用に「カテゴリ配列」へ整形
  //    ※ normalizeToCatArray は { key, label, value } を返す
  const categoriesFixed = useMemo(
    () => normalizeToCatArray(safeScores),
    [safeScores],
  );

  // 3) 武将タイプの解決（文字列が無ければスコアから判定）
  const typeResolved: SamuraiType | undefined = useMemo(() => {
    return resolveSamuraiType(samuraiType ?? "", safeScores);
  }, [samuraiType, safeScores]);

  const displayName = typeResolved || samuraiType || "武将";

  // Finalize 用の key/ja
  const finalizeKey = typeResolved ? getSamuraiSlug(typeResolved) : null;
  const finalizeJa = typeResolved ?? null;

  const [shareOpen, setShareOpen] = useState(false);
  const hasRid = isIdish(ridResolved);

  // 画面タイトル（任意）
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = `診断結果：${displayName}`;
    }
  }, [displayName]);

  return (
    <div className="text-center max-w-4xl mx-auto p-8">
      {/* RID を local/session/cookie に同期（フォーム自動入力の要） */}
      {hasRid && <RidSync rid={ridResolved} />}

      {/* DBスナップショット確定（UI非表示）
          → rid が空でも FinalizeOnMount 側で発行・URL同期するので実行 */}
      {categoriesFixed.length > 0 && (
        <FinalizeOnMount
          rid={ridResolved}
          samuraiTypeKey={finalizeKey}
          samuraiTypeJa={finalizeJa}
          categories={categoriesFixed.map((c) => ({
            key: c.key,
            score: c.value,
          }))}
          /* ← DB の snake_case に合わせて入れる */
          scorePattern={scorePattern ?? null}
        />
      )}

      <h2 className="text-2xl font-bold mb-8">診断結果</h2>

      {!!displayName && (
        <div className="mb-6 p-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg">
          <h1 className="text-4xl md:text-5xl font-bold text-red-700 mb-3">
            {displayName}
          </h1>

          {/* 診断IDバッジ（コピー可） */}
          {hasRid && (
            <div className="flex items-center justify-center mb-2">
              <IdBadge rid={ridResolved} />
            </div>
          )}

          {/* 説明文：元の仕様では samuraiDescriptions を参照していたが、
              無くても安全に空文字にフォールバック */}
          <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
            {/* ここはプロジェクトの説明データがあれば差し込まれる想定 */}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Button variant="secondary" onClick={() => setShareOpen(true)}>
              <Share2 className="w-4 h-4 mr-2" />
              あなたの武将型をシェアする
            </Button>
          </div>
        </div>
      )}

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        text={`私は「${displayName}」型だったよ！武将タイプ診断やってみた😄`}
        subtitle="投稿前に内容をご確認ください。"
      />

      {/* スコア一覧（value を使用） */}
      <div className="space-y-4 text-left">
        <h3 className="text-xl font-semibold mb-4 text-center">
          カテゴリ別スコア（0〜3点）
        </h3>
        {categoriesFixed.map(({ key, label, value }) => {
          const emojiLabel = getEmojiLabel(key);
          const color =
            value >= 2.5
              ? "text-green-600"
              : value >= 2.0
                ? "text-yellow-600"
                : "text-red-600";
          return (
            <div
              key={key}
              className="flex justify-between items-center p-3 bg-gray-50 rounded"
            >
              <span className="font-medium">{label}</span>
              <div className="flex items-center">
                <span className={`text-lg font-bold ${color}`}>
                  {Math.min(value, 3).toFixed(2)}点
                </span>
                <span className="text-sm font-medium text-gray-800 ml-2">
                  {emojiLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {(comments.strengths.length > 0 || comments.tips.length > 0) && (
        <div className="mt-8 text-left max-w-3xl mx-auto">
          <h3 className="text-lg font-semibold mb-2">
            🔍 あなたの特徴とヒント
          </h3>

          {comments.strengths.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-green-700 mb-1">
                あなたの強み
              </h4>
              <ul className="list-disc list-inside text-green-800">
                {comments.strengths.map((item, idx) => (
                  <li key={`strength-${idx}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {comments.tips.length > 0 && (
            <div>
              <h4 className="font-semibold text-orange-700 mb-1">
                改善のヒント
              </h4>
              <ul className="list-disc list-inside text-orange-800">
                {comments.tips.map((item, idx) => (
                  <li key={`tip-${idx}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 space-y-4">
        <button
          onClick={onRestart}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors shadow-lg hover:shadow-xl mr-4"
        >
          もう一度診断する
        </button>

        <button
          onClick={() => {
            const q = isIdish(ridResolved)
              ? `?rid=${encodeURIComponent(ridResolved)}`
              : "";
            window.location.href = `/form${q}`;
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors shadow-lg hover:shadow-xl"
        >
          あなた専用の詳細レポートを受け取る（無料）
        </button>
      </div>

      {/* フッター：IOTロゴ＋著作権 */}
      <a
        href="https://ourdx-mtg.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 flex items-center justify-center text-gray-500 text-sm space-x-2 hover:text-gray-700"
      >
        <img
          src="/images/logo.png"
          alt="企業の未来づくり研究所ロゴ"
          className="w-[40px] h-auto opacity-70 hover:opacity-90"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
          }}
        />
        <span>© 一般社団法人 企業の未来づくり研究所</span>
      </a>
    </div>
  );
}

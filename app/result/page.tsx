"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ResultPanel from "@/components/result/ResultPanel";

type Comments = { strengths: string[]; tips: string[] };

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function ResultPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // rid は URL から取る（ResultPanel 側でも再解決するが一応渡す）
  const rid = sp.get("rid") ?? null;

  const [finalScores, setFinalScores] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [samuraiType, setSamuraiType] = useState<string | null>(null);
  const [comments, setComments] = useState<Comments>({
    strengths: [],
    tips: [],
  });
  const [scorePattern, setScorePattern] = useState<Record<
    string,
    string[]
  > | null>(null);

  useEffect(() => {
    // 既存フローで保存している想定キー（無ければ fallback）
    setFinalScores(readLocal("samurai-final-scores", null));
    setSamuraiType(readLocal("samurai-type", null));
    setComments(readLocal("samurai-comments", { strengths: [], tips: [] }));
    setScorePattern(readLocal("samurai-score-pattern", null));
  }, []);

  return (
    <ResultPanel
      rid={rid}
      finalScores={finalScores}
      samuraiType={samuraiType}
      comments={comments}
      scorePattern={scorePattern}
      onRestart={() => router.push("/")}
    />
  );
}

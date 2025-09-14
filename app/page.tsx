// app/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';

import StartScreen from '@/components/StartScreen';
import QuizQuestion from '@/components/QuizQuestion';
import ResultPanel from '@/components/result/ResultPanel';

import { quizQuestions, type QuizQuestion as QuizQuestionType } from '@/lib/quizQuestions';
import { shuffleArray } from '@/lib/utils';
import { DISPLAY_ORDER, blockTitleByFirstPosition } from '@/lib/quizBlocks';

import {
  calculateCategoryScores,
  type ScoreMap,
} from '@/lib/scoringSystem';
import { judgeSamuraiType } from '@/lib/samuraiJudge';
import { supabase, type SamuraiResult } from '@/lib/supabase';
import generateScoreComments from '@/lib/generateScoreComments';

import { clamp03 } from '@/lib/scoreSnapshot';
import type {
  NormalizedCategoryScores,
  SamuraiType,
  ScorePattern,
  QuestionId,
} from '@/types/diagnosis';

/* ================= ユーティリティ ================= */

const NONE_LABELS = new Set(['該当するものはない', '該当なし', '特になし']);

function safeSet(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
}

const ALL_QIDS: QuestionId[] = [
  'Q1','Q2','Q3','Q4','Q5','Q6','Q7','Q8','Q9','Q10','Q11','Q12','Q13','Q14'
];

// ★ 内部構築は汎用マップ→最後に ScoreMap へキャスト（型エラー回避）
type AnyScoreMap = Record<string, Record<string, number>>;

/** quizQuestions → ScoreMap */
function buildScoreMap(questions: QuizQuestionType[]): ScoreMap {
  const map: AnyScoreMap = {};
  for (const q of questions) {
    const qkey = `Q${q.id}`;
    const inner: Record<string, number> = {};
    for (const opt of q.options) {
      const label = typeof (opt as any)?.text === 'string' ? (opt as any).text : String(opt);
      const score = typeof (opt as any)?.score === 'number' ? (opt as any).score : 0;
      inner[label] = score;
    }
    map[qkey] = inner;
  }
  return map as unknown as ScoreMap;
}

/** 回答配列 → “必ず Q1〜Q14 を含む” ScorePattern を作成（複数選択は最高スコアを採用） */
function buildFullScorePattern(
  answers: { questionId: number; selectedAnswers: string[] }[],
  scoreMap: ScoreMap
): ScorePattern {
  const anyMap = scoreMap as unknown as AnyScoreMap;

  // まず全QIDを '' で初期化
  const pattern = ALL_QIDS.reduce<Record<QuestionId, string>>((acc, qid) => {
    acc[qid] = '';
    return acc;
  }, {} as Record<QuestionId, string>);

  for (const a of answers) {
    const qkey = `Q${a.questionId}` as QuestionId;
    const m = anyMap[qkey] || {};
    // 選択肢のうちスコア最大のラベルを採用（同点なら先に選んだ方）
    let chosen = a.selectedAnswers[0] ?? '';
    let max = -1;
    for (const txt of a.selectedAnswers) {
      const s = Number(m[txt] ?? -1);
      if (s > max) { max = s; chosen = txt; }
    }
    pattern[qkey] = String(chosen ?? '');
  }
  return pattern as ScorePattern;
}

/* ======================= 画面本体 ======================= */

export default function Home() {
  const [step, setStep] = useState<'start' | `q${number}` | 'result'>('start');
  const [selected, setSelected] = useState<string[]>([]);
  const [orderedQuestions, setOrderedQuestions] = useState<QuizQuestionType[]>([]);

  const [answers, setAnswers] = useState<{ questionId: number; selectedAnswers: string[] }[]>([]);
  const [finalScores, setFinalScores] = useState<NormalizedCategoryScores | null>(null);
  const [samuraiType, setSamuraiType] = useState<SamuraiType | null>(null);
  const [comments, setComments] = useState<{ strengths: string[]; tips: string[] }>({ strengths: [], tips: [] });
  const [rid, setRid] = useState<string | null>(null);

  // ❶ 表示順（選択肢はランダム）
  const computedOrdered = useMemo<QuizQuestionType[]>(() => {
    const byId = new Map(quizQuestions.map((q) => [q.id, q]));
    return DISPLAY_ORDER
      .map((id) => byId.get(id))
      .filter((q): q is QuizQuestionType => Boolean(q))
      .map((q) => ({ ...q, options: shuffleArray(q.options) }));
  }, []);
  useEffect(() => setOrderedQuestions(computedOrdered), [computedOrdered]);

  // ❷ スコアマップを一度だけ構築
  const scoreMap = useMemo<ScoreMap>(() => buildScoreMap(quizQuestions), []);

  const startQuiz = () => {
    setStep('q1');
    setSelected([]);
    setAnswers([]);
    setFinalScores(null);
    setSamuraiType(null);
    setComments({ strengths: [], tips: [] });
    setRid(null);
  };

  // Supabaseへ“行だけ”作成（失敗しても画面は進める）
  async function createRowInSupabase(snapshot: Record<string, string[]>, typeDisplay: string) {
    try {
      const generatedUserId =
        globalThis.crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      const payload: Partial<SamuraiResult> & Record<string, any> = {
        id: generatedUserId,
        score_pattern: snapshot,
        samurai_type: typeDisplay ?? '',
        name: null,
        email: null,
        company_size: null,
      };

      const { error } = await supabase.from('samurairesults').insert(payload).select();
      if (error) {
        console.warn('[supabase.insert] failed:', error);
      } else {
        setRid(generatedUserId);
        try {
          localStorage.setItem('samurai:rid', generatedUserId);
          sessionStorage.setItem('samurai:rid', generatedUserId);
          document.cookie = `samurai_rid=${encodeURIComponent(generatedUserId)}; Path=/; Max-Age=1800; SameSite=Lax`;
        } catch {}
      }
    } catch (e) {
      console.warn('[supabase.insert] exception:', e);
    }
  }

  // 最終計算 → 保存 → 画面遷移
  const nextQuestion = async () => {
    const pos = parseInt(String(step).replace('q', ''), 10);
    const q = orderedQuestions[pos - 1];
    if (!q) return;

    if (selected.length === 0) {
      alert('少なくとも1つは選んでください。');
      return;
    }

    const newAnswer = { questionId: q.id, selectedAnswers: [...selected] };
    const updated = [...answers, newAnswer];
    setAnswers(updated);

    if (pos < orderedQuestions.length) {
      setStep(`q${pos + 1}` as `q${number}`);
      setSelected([]);
      return;
    }

    // ===== ここから最終処理 =====

    // 1) 監査用スナップショット（Q→選択肢[]）
    const snapshot: Record<string, string[]> = {};
    updated.forEach((a) => (snapshot[`Q${a.questionId}`] = a.selectedAnswers));
    // ★ Finalize 用にも保存
    safeSet('samurai-score-pattern', snapshot);

    // 2) スコア計算：配列→“完全な ScorePattern”→ calculateCategoryScores
    const pattern: ScorePattern = buildFullScorePattern(updated, scoreMap);
    const result = calculateCategoryScores(pattern, scoreMap, {
      normalizeMode: 'auto',
      maxPerQuestion: 3,
    });

    // 3) 正規化 0〜3 & タイプ判定
    const normalized = result.normalized as NormalizedCategoryScores;
    const typeDisplay = String(judgeSamuraiType(normalized) ?? '');

    // 4) コメント生成（日本語ラベルを渡す）
    const commentSource: Record<string, number> = {
      '権限委譲・構造健全度': clamp03(normalized.delegation),
      '組織進化阻害': clamp03(normalized.orgDrag),
      'コミュ力誤差': clamp03(normalized.commGap),
      'アップデート力': clamp03(normalized.updatePower),
      'ジェネギャップ感覚': clamp03(normalized.genGap),
      '無自覚ハラスメント傾向': clamp03(
        (normalized as any).harassmentAwareness ?? (normalized as any).harassmentRisk ?? 0
      ),
    };
    const cmts = generateScoreComments(commentSource);

    // 5) 画面状態＆ローカル保存
    setFinalScores(normalized);
    setSamuraiType(typeDisplay as unknown as SamuraiType);
    setComments(cmts);
    safeSet('samurai-final-scores', normalized);
    safeSet('samurai-type', typeDisplay);
    safeSet('samurai-comments', cmts);

    // 6) Supabase に“行だけ”作成（失敗しても続行）
    createRowInSupabase(snapshot, typeDisplay);

    // 7) 結果へ
    setStep('result');
    setSelected([]);
  };

  const prevQuestion = () => {
    const pos = parseInt(String(step).replace('q', ''), 10);
    if (pos <= 1) return;
    const prevQ = orderedQuestions[pos - 2];
    setStep(`q${pos - 1}` as `q${number}`);
    if (!prevQ) {
      setSelected([]);
      return;
    }
    const prevStored = answers.find((a) => a.questionId === prevQ.id);
    setSelected(prevStored ? [...prevStored.selectedAnswers] : []);
    setAnswers(answers.filter((a) => a.questionId !== prevQ.id));
  };

  if (step === 'start') return <StartScreen startQuiz={startQuiz} />;

  if (step === 'result') {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center">
        <ResultPanel
          rid={rid ?? ''}
          finalScores={finalScores as unknown as NormalizedCategoryScores}
          samuraiType={samuraiType as unknown as string}
          comments={comments}
          scorePattern={null /* ResultPanel 側で localStorage からも読む */}
          onRestart={() => { setStep('start'); }}
        />
      </div>
    );
  }

  if (String(step).startsWith('q')) {
    const pos = parseInt(String(step).replace('q', ''), 10);
    const q = orderedQuestions[pos - 1];
    const total = orderedQuestions.length;

    if (!q) {
      return (
        <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">質問が見つかりません</h2>
            <p className="text-gray-600">質問データの読み込み中です...</p>
          </div>
        </div>
      );
    }

    const blockTitle = (blockTitleByFirstPosition as any)[pos];
    const progress = Math.round((pos / total) * 100);

    return (
      <QuizQuestion
        questionNumber={pos}
        totalQuestions={total}
        progressPercentage={progress}
        noteText={blockTitle}
        questionText={q.questionText}
        options={q.options as any}
        selectedAnswers={selected}
        isMultipleChoice={q.isMultipleChoice}
        onAnswerChange={
          q.isMultipleChoice
            ? (v) => {
                setSelected((prev) => {
                  if (NONE_LABELS.has(v)) return [v]; // 「該当なし」選択で他を外す
                  const withoutNone = prev.filter((x) => !NONE_LABELS.has(x));
                  const exists = withoutNone.includes(v);
                  if (exists) return withoutNone.filter((x) => x !== v);
                  if (withoutNone.length >= 3) return withoutNone; // 最大3つ
                  return [...withoutNone, v];
                });
              }
            : (v) => setSelected([v])
        }
        onNext={nextQuestion}
        onPrev={prevQuestion}
        canGoBack={pos > 1}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">エラー</h2>
        <p className="text-gray-600">予期しない状態です</p>
      </div>
    </div>
  );
}

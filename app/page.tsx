// app/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import StartScreen from '@/components/StartScreen';
import QuizQuestion from '@/components/QuizQuestion';
import {
  quizQuestions,
  DISPLAY_ORDER,
  BLOCKS,
  type QuizQuestion as QuizQuestionType,
} from '@/lib/quizQuestions';
import { shuffleArray } from '@/lib/utils';

// ここはラッパーだけ使う（2引数: pattern, answers）
import { debugScoreCalculation } from '@/lib/scoringSystem';

// 型は diagnosis から。CategoryScores ではなく NormalizedCategoryScores を使う
import type { NormalizedCategoryScores, SamuraiType } from '@/types/diagnosis';
import { judgeSamuraiType } from '@/lib/samuraiJudge';

import { supabase, SamuraiResult } from '@/lib/supabase';
import { generateScoreComments } from '@/lib/generateScoreComments';

const NONE_LABELS = new Set(['該当するものはない', '該当なし', '特になし']);

export default function Home() {
  /* ========= 互換リダイレクト：/?rid=... → /result?rid=... ========= */
  const router = useRouter();
  const sp = useSearchParams();
  useEffect(() => {
    const rid =
      sp.get('rid') || sp.get('resultId') || sp.get('resultid') || sp.get('id');
    if (rid) {
      router.replace(`/result?rid=${encodeURIComponent(rid)}`);
    }
  }, [sp, router]);

  /* ======================= 画面ステート ======================= */
  const [currentStep, setCurrentStep] = useState<'start' | `q${number}` | 'result'>('start');
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestionType[]>([]);
  const [allAnswers, setAllAnswers] = useState<{ questionId: number; selectedAnswers: string[] }[]>([]);
  const [finalScores, setFinalScores] = useState<NormalizedCategoryScores | null>(null);
  const [samuraiType, setSamuraiType] = useState<SamuraiType | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [generatedComments, setGeneratedComments] = useState<{ strengths: string[]; tips: string[] }>({ strengths: [], tips: [] });

  /* ========= 表示順：/lib/quizQuestions.ts を唯一の正とする ========= */
  // DISPLAY_ORDER は ['Q2','Q3',...] なので数値ID配列に変換
  const NUMERIC_ORDER = useMemo<number[]>(
    () => DISPLAY_ORDER.map(code => Number(String(code).replace(/^Q/i, ''))),
    []
  );

  // ブロック見出し：ブロック先頭の設問が画面に来たときだけ薄く出す
  const blockTitleByFirstPosition = useMemo<Record<number, string>>(() => {
    const posByCode = new Map<string, number>(
      DISPLAY_ORDER.map((code, i) => [code, i + 1])
    );
    const map: Record<number, string> = {};
    for (const b of BLOCKS) {
      const first = b.items[0]; // 'Q2' など
      const pos = posByCode.get(first);
      if (pos) map[pos] = b.title;
    }
    return map;
  }, []);

  // 並び替え（選択肢のみランダム）
  const orderedQuestions = useMemo<QuizQuestionType[]>(() => {
    const byId = new Map(quizQuestions.map((q) => [q.id, q]));
    return NUMERIC_ORDER
      .map((id) => byId.get(id))
      .filter((q): q is QuizQuestionType => Boolean(q))
      .map((q) => ({ ...q, options: shuffleArray(q.options) }));
  }, [NUMERIC_ORDER]);

  useEffect(() => {
    setShuffledQuestions(orderedQuestions);
  }, [orderedQuestions]);

  /* ========= Supabaseへ「暫定保存」（行作成） ========= */
  const saveResultsToSupabase = async (
    scores: NormalizedCategoryScores,
    judgedType: SamuraiType,
    answers: { questionId: number; selectedAnswers: string[] }[],
  ) => {
    try {
      const generatedUserId =
        globalThis.crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      // FinalizeOnMount へも渡せるスナップショット
      const scorePattern: Record<string, string[]> = Object.fromEntries(
        answers.map(a => [`Q${a.questionId}`, a.selectedAnswers]),
      );

      const resultData: Partial<SamuraiResult> & Record<string, any> = {
        id: generatedUserId,
        score_pattern: scorePattern,     // 回答スナップショット（監査用）
        samurai_type: String(judgedType),// 旧列（互換用）。確定は Finalize API
        name: null,
        email: null,
        company_size: null,
      };

      const { error } = await supabase.from('samurairesults').insert(resultData).select();
      if (error) console.error('Error saving results to Supabase:', error);
      else setUserId(generatedUserId);
    } catch (error) {
      console.error('Error generating UUID or saving to Supabase:', error);
    }
  };

  /* ======================= フロー制御 ======================= */
  const startQuiz = () => {
    setCurrentStep('q1');
    setSelectedAnswers([]);
    setAllAnswers([]);
    setFinalScores(null);
    setSamuraiType(null);
    setUserId(null);
  };

  const nextQuestion = async () => {
    const currentPos = parseInt(String(currentStep).replace('q', ''), 10);
    const currentQuestion = shuffledQuestions[currentPos - 1];
    if (!currentQuestion) return;

    // 未回答ガード
    if (selectedAnswers.length === 0) {
      alert('少なくとも1つは選んでください。');
      return;
    }

    const newAnswer = { questionId: currentQuestion.id, selectedAnswers: [...selectedAnswers] };
    const updatedAllAnswers = [...allAnswers, newAnswer];
    setAllAnswers(updatedAllAnswers);

    if (currentPos < shuffledQuestions.length) {
      setCurrentStep(`q${currentPos + 1}` as `q${number}`);
    } else {
      // ===== 最終計算 =====
      // 1) ScorePattern を作る（Q1→選択肢...）
      const pattern: Record<string, string[]> = Object.fromEntries(
        updatedAllAnswers.map(a => [`Q${a.questionId}`, a.selectedAnswers]),
      );

      // 2) 正規化スコア算出
      const scores = debugScoreCalculation(pattern, updatedAllAnswers) as NormalizedCategoryScores;
      setFinalScores(scores);

      // 3) タイプ判定
      const judged = judgeSamuraiType(scores);
      setSamuraiType(judged);

      // 4) コメント生成
      const comments = generateScoreComments(scores as unknown as any);
      setGeneratedComments(comments);

      // 5) ローカル保存（/result ページが参照）
      try {
        localStorage.setItem('samurai-final-scores', JSON.stringify(scores));
        localStorage.setItem('samurai-type', JSON.stringify(String(judged)));
        localStorage.setItem('samurai-comments', JSON.stringify(comments));
        localStorage.setItem('samurai-score-pattern', JSON.stringify(pattern));
      } catch { /* ignore */ }

      // 6) DBに行作成（RID付与）
      await saveResultsToSupabase(scores, judged, updatedAllAnswers);

      // 7) 互換のためこのページでも結果を描画できるようにしておく
      setCurrentStep('result');
    }
    setSelectedAnswers([]);
  };

  const prevQuestion = () => {
    const currentPos = parseInt(String(currentStep).replace('q', ''), 10);
    if (currentPos > 1) {
      const prevQuestion = shuffledQuestions[currentPos - 2];
      setCurrentStep(`q${currentPos - 1}` as `q${number}`);
      if (prevQuestion) {
        const prevStored = allAnswers.find((a) => a.questionId === prevQuestion.id);
        setSelectedAnswers(prevStored ? [...prevStored.selectedAnswers] : []);
        setAllAnswers(allAnswers.filter((a) => a.questionId !== prevQuestion.id));
      } else {
        setSelectedAnswers([]);
      }
    }
  };

  /* ======================= レンダリング ======================= */

  // スタート画面
  if (currentStep === 'start') return <StartScreen startQuiz={startQuiz} />;

  // 結果画面（互換：このページでも表示できる）
  if (currentStep === 'result') {
    const ResultPanel = require('@/components/result/ResultPanel').default;
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center">
        <ResultPanel
          rid={userId ?? ''}
          finalScores={finalScores as unknown as Record<string, unknown> | null}
          samuraiType={(samuraiType ?? '') as unknown as string}
          comments={generatedComments}
          onRestart={startQuiz}
        />
      </div>
    );
  }

  // 質問画面（q1, q2, ...）
  if (String(currentStep).startsWith('q')) {
    const position = parseInt(String(currentStep).replace('q', ''), 10);
    const currentQuestion = shuffledQuestions[position - 1];
    const total = shuffledQuestions.length;

    if (!currentQuestion) {
      return (
        <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">質問が見つかりません</h2>
            <p className="text-gray-600">質問データの読み込み中です...</p>
          </div>
        </div>
      );
    }

    const blockTitle = blockTitleByFirstPosition[position];
    const progress = Math.round((position / total) * 100);

    return (
      <QuizQuestion
        questionNumber={position}
        totalQuestions={total}
        progressPercentage={progress}
        noteText={blockTitle}
        questionText={currentQuestion.questionText}
        options={currentQuestion.options}
        selectedAnswers={selectedAnswers}
        isMultipleChoice={currentQuestion.isMultipleChoice}
        onAnswerChange={
          currentQuestion.isMultipleChoice
            ? (v) =>
                setSelectedAnswers((prev) => {
                  const isNone = NONE_LABELS.has(v);
                  if (prev.includes(v)) return prev.filter((x) => x !== v);
                  if (isNone) return [v];
                  const withoutNone = prev.filter((x) => !NONE_LABELS.has(x));
                  if (withoutNone.length >= 3) return withoutNone;
                  return [...withoutNone, v];
                })
            : (v) => setSelectedAnswers([v])
        }
        onNext={nextQuestion}
        onPrev={prevQuestion}
        canGoBack={position > 1}
      />
    );
  }

  // フォールバック
  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">エラー</h2>
        <p className="text-gray-600">予期しない状態です</p>
      </div>
    </div>
  );
}

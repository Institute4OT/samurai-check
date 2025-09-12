// app/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import StartScreen from '@/components/StartScreen';
import QuizQuestion from '@/components/QuizQuestion';
import { quizQuestions, QuizQuestion as QuizQuestionType } from '@/lib/quizQuestions';
import { shuffleArray } from '@/lib/utils';

// 2引数: (pattern, answers)
import { debugScoreCalculation } from '@/lib/scoringSystem';

// 型（Normalized 使用）
import type { NormalizedCategoryScores, SamuraiType } from '@/types/diagnosis';
import { judgeSamuraiType } from '@/lib/samuraiJudge';

import { supabase, SamuraiResult } from '@/lib/supabase';
import { generateScoreComments } from '@/lib/generateScoreComments';
import { DISPLAY_ORDER, blockTitleByFirstPosition } from '@/lib/quizBlocks';
import ResultPanel from '@/components/result/ResultPanel';

/* ================= ユーティリティ ================= */

const NONE_LABELS = new Set(['該当するものはない', '該当なし', '特になし']);

/* ======================= 画面本体 ======================= */

export default function Home() {
  const [currentStep, setCurrentStep] = useState<'start' | `q${number}` | 'result'>('start');
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestionType[]>([]);
  const [allAnswers, setAllAnswers] = useState<{ questionId: number; selectedAnswers: string[] }[]>([]);
  const [finalScores, setFinalScores] = useState<NormalizedCategoryScores | null>(null);
  const [samuraiType, setSamuraiType] = useState<SamuraiType | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [generatedComments, setGeneratedComments] =
    useState<{ strengths: string[]; tips: string[] }>({ strengths: [], tips: [] });

  // ❶ 表示順に並び替えた設問（選択肢だけランダム）
  const orderedQuestions = useMemo<QuizQuestionType[]>(() => {
    const byId = new Map(quizQuestions.map((q) => [q.id, q]));
    return DISPLAY_ORDER
      .map((id) => byId.get(id))
      .filter((q): q is QuizQuestionType => Boolean(q))
      .map((q) => ({ ...q, options: shuffleArray(q.options) }));
  }, []);

  useEffect(() => {
    setShuffledQuestions(orderedQuestions);
  }, [orderedQuestions]);

  // Supabase へ結果保存（行の作成まで。確定は ResultPanel 内の FinalizeOnMount）
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
        score_pattern: scorePattern,      // 回答スナップショット（監査用）
        samurai_type: String(judgedType), // 旧列（互換用）。確定は Finalize API
        name: null,
        email: null,
        company_size: null,
      };

      const { error } = await supabase.from('samurairesults').insert(resultData);
      if (error) {
        // ここは表示に影響しないので、ログだけ
        console.warn('Error saving results to Supabase:', error);
      } else {
        setUserId(generatedUserId);
      }
    } catch (error) {
      console.warn('Error generating UUID or saving to Supabase:', error);
    }
  };

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

    // ★ 未回答ガード
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

      // 2) 正規化スコアを算出（2引数必須）
      const scores = debugScoreCalculation(pattern, updatedAllAnswers) as NormalizedCategoryScores;
      setFinalScores(scores);

      // 3) タイプ判定
      const judged = judgeSamuraiType(scores);
      setSamuraiType(judged);

      // 4) コメント生成（型差がある環境でも安全に通す）
      const comments = generateScoreComments(scores as unknown as any);
      setGeneratedComments(comments);

      // 5) Supabase「行だけ」生成（失敗してもUIは続行）
      await saveResultsToSupabase(scores, judged, updatedAllAnswers);

      // 6) ★★★ /result ページが読むスナップショットを localStorage へ保存 ★★★
      try {
        localStorage.setItem('samurai-final-scores', JSON.stringify(scores));
        localStorage.setItem('samurai-type', JSON.stringify(String(judged)));
        localStorage.setItem('samurai-comments', JSON.stringify(comments));
        localStorage.setItem('samurai-score-pattern', JSON.stringify(pattern));
      } catch {
        /* storage 不可でも落ちないよう握りつぶし */
      }

      // 7) 旧フローのフォールバック（/result に遷移しない場合も一応表示できるように）
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

  // ===== スタート画面 =====
  if (currentStep === 'start') return <StartScreen startQuiz={startQuiz} />;

  // ===== 結果画面（フォールバック表示） =====
  if (currentStep === 'result') {
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

  // ===== 質問画面（q1, q2, ...） =====
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

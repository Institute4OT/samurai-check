// lib/report/personalization.ts
// 詳細レポートの個別コメント「top2/bottom2 から短文コメントを返す」だけ
import type { CategoryKey, CategoryScore } from '@/components/report/ReportTemplate';

type Input = { categories: CategoryScore[]; flags?: { manyZeroOnQ5?: boolean; noRightHand?: boolean } };

const POS_TEXT: Record<CategoryKey, string> = {
  delegation:     '任せ方と判断の土台が整っており、現場に自走が生まれています。',
  orgDrag:        'ムダな手戻りが少なく、決めたことが進む下地ができています。',
  commGap:        '言葉の意味合わせができ、会話から前進の合意が作れています。',
  updatePower:    '仮説→検証の小回りが効き、改善のテンポが良い状態です。',
  genGap:         '世代間の価値観の違いを受け止め、健全な議論ができています。',
  harassmentRisk: '安心安全な関係づくりに配慮があり、挑戦が促されています。',
};

const NEG_TEXT: Record<CategoryKey, string> = {
  delegation:     '任せ方の基準が曖昧で、判断が属人的。最後はトップに戻って詰まりがち。',
  orgDrag:        '決めたはずのことが止まりやすい。誰が・いつまでに・何をの明確化から。',
  commGap:        '同じ言葉でも解釈がズレがち。定義のすり合わせと合意形成の型を整えましょう。',
  updatePower:    '小さく試す文化が弱く、正解探しで停滞。2週間で終える最小実験を設計。',
  genGap:         '価値観の違いが“分断”に。観点の言語化と役割期待の再合意がカギです。',
  harassmentRisk: '無自覚な発言/態度が心理的安全を損ねがち。OK/NGの境界を明確に共有。',
};

export function genScoreFallbackBullets({ categories, flags }: Input) {
  // スコア降順/昇順で top2 / bottom2 を抽出（スコア同点はラベルで安定ソート）
  const sorted = [...categories].sort((a, b) => (b.score - a.score) || a.label.localeCompare(b.label, 'ja'));
  const top = sorted.slice(0, 2);
  const bottom = [...sorted].reverse().slice(0, 2);

  // 文生成（カテゴリ名は本文に出さない）
  const strengths = Array.from(new Set(top.map(c => POS_TEXT[c.key])));       // 重複排除
  const improvements = Array.from(new Set(bottom.map(c => NEG_TEXT[c.key]))); // 重複排除

  const notes: string[] = [];
  if (flags?.manyZeroOnQ5) notes.push('「判断のエネルギー」が低め。まずは“やらないことリスト”で集中力を取り戻しましょう。');
  if (flags?.noRightHand)  notes.push('右腕/後継の育成は急務。決裁の基準と任せ方の範囲を可視化し、少しずつ委任を進めます。');

  return { strengths, improvements, notes };
}

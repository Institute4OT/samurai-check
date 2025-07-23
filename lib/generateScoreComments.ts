// lib/generateScoreComments.ts
import { CategoryScores } from './scoringSystem';

const scoreComments: {
  [category: string]: {
    strength: string;
    tip: string;
  };
} = {
  'アップデート力': {
    strength: '変化を恐れず、常に学び続ける姿勢が際立っています。',
    tip: '新しい知識や外部刺激を取り入れる習慣をつけましょう。',
  },
  'コミュ力誤差': {
    strength: '立場や世代を超えて、伝える力と受け止める力のバランスが取れています。',
    tip: '一方的な発信になっていないか、時々フィードバックを確認しましょう。',
  },
  'ジェネギャップ感覚': {
    strength: '若手の価値観や感性にも柔軟に共感できています。',
    tip: '「昔はこうだった」と比較せず、未来への期待で語るようにしましょう。',
  },
  '組織進化阻害': {
    strength: '構造的な変化や新しい取り組みにもオープンな姿勢があります。',
    tip: '「うちの会社らしさ」へのこだわりがブレーキになっていないか確認しましょう。',
  },
  '無自覚ハラスメント傾向': {
    strength: '部下や周囲に威圧感を与えず、安心感ある関係づくりができています。',
    tip: '善意のつもりでも、受け手にとって不快でないか振り返る習慣を持ちましょう。',
  },
  '権限委譲・構造健全度': {
    strength: 'チームに裁量を与え、信頼して任せるマネジメントができています。',
    tip: '「最後は自分が判断する」が習慣になっていないか注意しましょう。',
  }
};

export function generateScoreComments(scores: CategoryScores): {
  strengths: string[];
  tips: string[];
} {
  const strengths: string[] = [];
  const tips: string[] = [];

  Object.entries(scores).forEach(([category, score]) => {
    const item = scoreComments[category];
    if (!item) return;

    if (score >= 2.5) {
      strengths.push(`✅ ${item.strength}`);
    } else if (score < 2.0) {
      tips.push(`💡 ${item.tip}`);
    }
  });

  return { strengths, tips };
}
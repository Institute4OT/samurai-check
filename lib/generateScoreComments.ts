// lib/generateScoreComments.ts
import type { CategoryScores } from './scoringSystem';

// バンド境界（0〜3点スケール）
const HIGH = 2.4; // これ以上は「強み」コメント
const LOW  = 1.6; // これ未満は「重要改善」、以上は「軽微改善」

type CommentSet = {
  strength: string;   // HIGH 以上
  tip: string;        // LOW 以上 HIGH 未満（軽微改善）
  tipSevere: string;  // LOW 未満（重要改善）
};

const COMMENTS: Record<keyof CategoryScores, CommentSet> = {
  'アップデート力': {
    strength:
      '変化を恐れず、小さく試して数値で判断する姿勢が際立っています。',
    tip:
      '小さな実験 → データで良し悪しを判断するサイクルを意識して回しましょう。',
    tipSevere:
      '新規提案は「担当者を決めて小さく試す」を標準化し、結果で判断する運用へ切り替えましょう。',
  },
  'コミュ力誤差': {
    strength:
      '立場や世代を超えて意図が伝わり、現場の理解も得られています。',
    tip:
      'ビジョンを“現場の行動”に翻訳する対話（例：月1回の振り返り・事例共有）を続けましょう。',
    tipSevere:
      'ビジョンを作って終わりにせず、現場と一緒に「どう活かすか」を対話する場を定例化しましょう。',
  },
  'ジェネギャップ感覚': {
    strength:
      '若手の価値観や働き方の多様性に柔軟に対応できています。',
    tip:
      '働き方の選択肢や越境学習の機会を増やし、パフォーマンス最大化を狙いましょう。',
    tipSevere:
      '「仕事はこうあるべき」という前提を見直し、若手の声・退職理由の定点観測を始めましょう。',
  },
  '組織進化阻害': {
    strength:
      '任せて試す文化があり、変化に前向きです。',
    tip:
      '意思決定は会議体で合意 → 担当と期限を明確に。トップの“持ち帰り保留”を減らしましょう。',
    tipSevere:
      'トップ一存や棚上げをやめ、「担当を決めて小さく試す→レビュー」を標準プロセスにしましょう。',
  },
  '無自覚ハラスメント傾向': {
    strength:
      '境界線への配慮があり、安心して話せる土壌が作れています。',
    tip:
      '属性話題は同意ベースで扱う運用に。NGガイドを簡潔に文書化し、役職者に周知しましょう。',
    tipSevere:
      '外部/匿名の相談窓口・役職者トレーニングを急ぎ整備。服装規定や評価基準の中立化も見直しましょう。',
  },
  '権限委譲・構造健全度': {
    strength:
      '役割・権限・決裁が明確で、現場が自律的に動けています。',
    tip:
      '決裁基準と合意プロセスの見える化、会議での「担当と期日」明確化を徹底しましょう。',
    tipSevere:
      '決裁の属人化を解消。「会議で決めて任せる」運用に切替え、社長承認のボトルネックを外しましょう。',
  },
};

export function generateScoreComments(scores: CategoryScores): {
  strengths: string[];
  tips: string[];
} {
  // エントリ化
  const entries = (Object.keys(scores) as (keyof CategoryScores)[])
    .map((k) => ({ key: k, val: scores[k] }));

  // Top2（降順）/ Bottom2（昇順）を抽出。重複は避ける
  const desc = [...entries].sort((a, b) => b.val - a.val);
  const asc  = [...entries].sort((a, b) => a.val - b.val);

  const topKeys = desc.slice(0, 2).map((e) => e.key);
  const bottomKeys = asc.filter((e) => !topKeys.includes(e.key)).slice(0, 2).map((e) => e.key);

  // 強み（Top2）
  const strengths = topKeys.map((k) => {
    const v = scores[k];
    const c = COMMENTS[k];
    // HIGH未満でも、簡易結果では前向きに要点提示（相対的に高い旨 + 軽微改善ヒント）
    if (v >= HIGH) return `✅ ${c.strength}`;
    return `✅ この領域は相対的に高めです。${c.tip}`;
  });

  // 改善（Bottom2）
  const tips = bottomKeys.map((k) => {
    const v = scores[k];
    const c = COMMENTS[k];
    if (v < LOW) return `⚠️ ${c.tipSevere}`;
    return `💡 ${c.tip}`;
  });

  return { strengths, tips };
}

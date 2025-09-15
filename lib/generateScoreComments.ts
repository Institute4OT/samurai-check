// /lib/generateScoreComments.ts
// スコア(0〜3)から「強み / 改善ヒント」を抽出（英語キー/日本語ラベル両対応・フェイルセーフ）

import type { CategoryScores } from "./scoringSystem";

type EKey =
  | "delegation"
  | "org_inhibition"
  | "comm_gap"
  | "update_ability"
  | "gen_gap"
  | "harassment_risk";

const EN_KEYS: EKey[] = [
  "delegation",
  "org_inhibition",
  "comm_gap",
  "update_ability",
  "gen_gap",
  "harassment_risk",
];

// 表示ラベル（JP）
const JP_LABEL: Record<EKey, string> = {
  delegation: "権限委譲・構造健全度",
  org_inhibition: "組織進化阻害",
  comm_gap: "コミュ力誤差",
  update_ability: "アップデート力",
  gen_gap: "ジェネギャップ感覚",
  harassment_risk: "無自覚ハラスメント傾向",
};

type CommentSet = {
  strength: string; // HIGH 以上
  tip: string; // 通常のヒント
  tipSevere: string; // LOW 未満（重要改善）
};

// 文章は既存版を英語キーで再定義
const COMMENTS: Record<EKey, CommentSet> = {
  update_ability: {
    strength: "変化を恐れず、小さく試して数値で判断する姿勢が根付いています。",
    tip: "小さな実験 → データで良し悪しを判断するサイクルを意識して回しましょう。",
    tipSevere:
      "新規提案は「担当を決めて小さく試す」を標準化し、結果で判断する運用へ切り替えましょう。",
  },
  comm_gap: {
    strength: "立場や世代を超えて意図が伝わり、現場の理解が得られています。",
    tip: "ビジョンを“現場の行動”に翻訳する対話（例：月1回の振り返り・事例共有）を続けましょう。",
    tipSevere:
      "ビジョンを作って終わりにせず、現場と一緒に「どう活かすか」を対話する場を定例化しましょう。",
  },
  gen_gap: {
    strength: "若手の価値観や働き方の多様性に柔軟に対応できています。",
    tip: "働き方の選択肢や越境学習の機会を増やし、パフォーマンス最大化を狙いましょう。",
    tipSevere:
      "「仕事はこうあるべき」という前提を見直し、若手の声・退職理由の定点観測を始めましょう。",
  },
  org_inhibition: {
    strength: "任せて試す文化があり、変化に前向きです。",
    tip: "意思決定は合議でなく合意 → 担当と期限を明確に。トップの“持ち帰り”を減らしましょう。",
    tipSevere:
      "トップ一存や根回しをやめ、「担当を決めて小さく試す→レビュー」を標準プロセスにしましょう。",
  },
  harassment_risk: {
    strength: "境界線への配慮があり、安心して話せる土壌が作れています。",
    tip: "属性話題は同意ベースで扱う運用に。NGガイドを簡潔に文書化し、役職者に周知しましょう。",
    tipSevere:
      "外部/匿名の相談窓口・役職者トレーニングを急ぎ整備。服装規定や評価基準の中立化も見直しましょう。",
  },
  delegation: {
    strength: "役割・権限・決裁が明確で、現場が自律的に動けています。",
    tip: "決裁基準と合意プロセスの見える化。会議での「担当と期日」明確化を徹底しましょう。",
    tipSevere:
      "決裁の属人化を解消。会議で“決めて任せる”運用に切替え、社長承認のボトルネックを外しましょう。",
  },
};

// 閾値（0〜3点スケール）
const HIGH = 2.4; // 以上なら「強み」
const LOW = 1.6; // 未満なら「重要改善」

// 英語/日本語どちらで来ても取り込む
function normalizeScores(input: CategoryScores | Record<string, number>) {
  const out: Record<EKey, number> = {
    delegation: 0,
    org_inhibition: 0,
    comm_gap: 0,
    update_ability: 0,
    gen_gap: 0,
    harassment_risk: 0,
  };
  for (const k of EN_KEYS) {
    const v =
      typeof (input as any)?.[k] === "number"
        ? (input as any)[k]
        : typeof (input as any)?.[JP_LABEL[k]] === "number"
          ? (input as any)[JP_LABEL[k]]
          : 0;
    out[k] = Number.isFinite(v) ? Number(v) : 0;
  }
  return out;
}

export function generateScoreComments(
  scores: CategoryScores | Record<string, number>,
): { strengths: string[]; tips: string[] } {
  const s = normalizeScores(scores);

  const entries = EN_KEYS.map((k) => ({ key: k, val: s[k] }));
  const desc = [...entries].sort((a, b) => b.val - a.val);
  const asc = [...entries].sort((a, b) => a.val - b.val);

  const topKeys = desc.slice(0, 2).map((e) => e.key);
  const bottomKeys = asc
    .filter((e) => !topKeys.includes(e.key))
    .slice(0, 2)
    .map((e) => e.key);

  const strengths = topKeys
    .map((k) => {
      const v = s[k];
      const c = COMMENTS[k];
      if (!c) return "";
      return v >= HIGH
        ? `✅ ${c.strength}`
        : `✅ この領域は相対的に高めです。${c.tip}`;
    })
    .filter(Boolean);

  const tips = bottomKeys
    .map((k) => {
      const v = s[k];
      const c = COMMENTS[k];
      if (!c) return "";
      return v <= LOW ? `⚠️ ${c.tipSevere}` : `💡 ${c.tip}`;
    })
    .filter(Boolean);

  return { strengths, tips };
}

export default generateScoreComments;

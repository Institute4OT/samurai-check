// lib/report/personalization.ts

// ====== 型 ======
export type CategoryKey =
  | 'delegation'
  | 'orgDrag'
  | 'commGap'
  | 'updatePower'
  | 'genGap'
  | 'harassmentRisk';

export type CategoryScore = { key: CategoryKey; label: string; score: number };

// flags.ts 側で作ったブール群をここでは必要分だけ受け取れるようにしておく
// （importに依存しないようローカル型でOK）
export type ReportFlags = {
  // 既存
  manyZeroOnQ5?: boolean;
  noRightHand?: boolean;

  // 追加（高シグナル）
  q1MeetingStalls?: boolean;
  q3Favoritism?: boolean;
  q8SpeakUpLow?: boolean;
  q12AttritionRisk?: boolean;
  q14BusFactorHigh?: boolean;
  q5TraditionHeavy?: boolean;
  q13Backroom?: boolean;
  q11Micromanage?: boolean;
  q7IndustryDenial?: boolean;
  q7NoAction?: boolean;
  q10Postpone?: boolean;
  q10DelegateToField?: boolean;

  // （必要なら強み系も拾えるようにしておく）
  q3DecisionClear?: boolean;
  q11HighTrust?: boolean;
  q12AlumniPositive?: boolean;
  q5DataDriven?: boolean;
  q8ChallengeFriendly?: boolean;
  q13RulesBased?: boolean;
};

type TemplateKind = 'strength' | 'improvement';
type TemplateMap = Record<CategoryKey, Record<TemplateKind, string[]>>;

// ====== テンプレ（明確化版） ======
// ルール：
// ・strength は「あなたは〜できています。次の一歩：〜」
// ・improvement は「課題：〜。対策：〜」で端的＆行動に直結
const TEMPLATES: TemplateMap = {
  delegation: {
    strength: [
      'あなたは任せる枠と判断の土台を示せています。次の一歩：測り方を軽量化し、チームの自走をさらに加速しましょう。'
    ],
    improvement: [
      '課題：権限の線引きが曖昧。対策：Why／判断基準／期限／最小合格ラインを1枚に明示しましょう。'
    ],
  },
  orgDrag: {
    strength: [
      'あなたは“止めない”文化を意識できています。次の一歩：小さく試すための固定枠（予算・時間）を設け、継続運転に。'
    ],
    improvement: [
      '課題：“前例重視”で挑戦が萎縮。対策：金額と期間を先に決めた低リスク実験で学習を回しましょう。'
    ],
  },
  commGap: {
    strength: [
      'あなたは要点が伝わる話し方ができています。次の一歩：聞き返しテンプレをチームで共有し、誤解の再発を防ぎましょう。'
    ],
    improvement: [
      '課題：説明した“つもり”が起きがち。対策：目的→現状→制約→基準→相手の要約確認の順で話す癖をつけましょう。'
    ],
  },
  updatePower: {
    strength: [
      'あなたは新しいツールに前向きです。次の一歩：効果測定を1枚で可視化し、採用の説得力を強化しましょう。'
    ],
    improvement: [
      '課題：ツールが点在し定着が弱い。対策：目詰まり業務から逆算し「何を→どこで（対象業務）→何で（ツール）」を選定。手順と指標をセットに。'
    ],
  },
  genGap: {
    strength: [
      'あなたは世代差の翻訳（言い換え）ができます。次の一歩：価値観の違いを事例で言語化し、合意形成を早めましょう。'
    ],
    improvement: [
      '課題：“最近の若手は…”などと一般化しがち。対策：期待水準とOK/NG例を共有して、行動基準をそろえましょう。'
    ],
  },
  harassmentRisk: {
    strength: [
      'あなたは言葉の重みを意識できています。次の一歩：否定語を具体語に置換し、心理的安全性をさらに高めましょう。'
    ],
    improvement: [
      '課題：善意の指導が裏目に出がち。対策：観察→事実→期待→支援の順でフィードバックしましょう。'
    ],
  },
};

// ====== ヘルパ ======
function pickTop2Bottom2(categories: CategoryScore[]) {
  const high = [...categories].sort((a, b) => (b.score - a.score) || a.key.localeCompare(b.key));
  const low = [...categories].sort((a, b) => (a.score - b.score) || a.key.localeCompare(b.key));
  return { top2: high.slice(0, 2), bottom2: low.slice(0, 2) };
}

/** スコア由来のフォールバック（personalCommentsが無い時に使う） */
export function genScoreFallbackBullets(input: {
  categories: CategoryScore[];
  flags?: ReportFlags;
}): { strengths: string[]; improvements: string[]; notes: string[] } {
  const { top2, bottom2 } = pickTop2Bottom2(input.categories);
  const strengths: string[] = [];
  const improvements: string[] = [];
  const notes: string[] = [];

  for (const c of top2) {
    const base = TEMPLATES[c.key]?.strength?.[0];
    if (base) strengths.push(`「${c.label}」：${base}`);
  }
  for (const c of bottom2) {
    const base = TEMPLATES[c.key]?.improvement?.[0];
    if (base) improvements.push(`「${c.label}」：${base}`);
  }

  if (strengths.length === 0) strengths.push('強みは測定中。小さな成功の再現で抽出していきましょう。');
  if (improvements.length === 0) improvements.push('大きなボトルネックは見えません。検証の継続で微調整を。');

  // ---- ここから notes 生成（回答フラグ由来）----
  const f = input.flags || {};

  // 既存の2つ
  if (f.manyZeroOnQ5) {
    notes.push('価値観（Q5）で0が多め。“やらないことリスト”で判断のエネルギーを節約。');
  }
  if (f.noRightHand) {
    notes.push('右腕/後継の育成が弱め。意思決定の言語化と役割移譲で“秒速”を持続可能に。');
  }

  // 追加（高シグナル）
  if (f.q14BusFactorHigh) {
    notes.push('「自分不在で回らない」サイン。判断基準の1枚化と右腕育成でボトルネックを解消。');
  }
  if (f.q3Favoritism) {
    notes.push('えこひいき疑念が生じやすい構造。意思決定の透明度（基準・プロセス）を1枚で共有。');
  }
  if (f.q8SpeakUpLow) {
    notes.push('発言しにくい空気。会議設計（目的・役割・発言ルール・要約担当）で安全性を担保。');
  }
  if (f.q12AttritionRisk) {
    notes.push('離職の予兆に気づきにくい。「観察→事実→期待→支援」を運用し早期発見へ。');
  }
  if (f.q1MeetingStalls) {
    notes.push('会議で決めきれない傾向。「最小合格・期限・責任」の三点セットで意思決定を軽量化。');
  }
  if (f.q5TraditionHeavy) {
    notes.push('伝統・勘への依存が強め。小実験の固定枠（予算/時間）で安全に前進を。');
  }
  if (f.q13Backroom) {
    notes.push('根回し/独断に依存。議論→決定→記録の流れを明文化し、合意形成の納得度を上げる。');
  }
  if (f.q11Micromanage) {
    notes.push('任せ切れない兆候。権限の線引きと判断基準・期限の明示で委譲の成功率UP。');
  }
  if (f.q7IndustryDenial) {
    notes.push('「業界に関係ない」発言あり。他業界の成功を自社文脈に翻訳する場づくりが有効。');
  }
  if (f.q7NoAction) {
    notes.push('重要性は理解していても着手が遅れがち。まずは90日で回す“試すリズム”を設計。');
  }
  if (f.q10Postpone) {
    notes.push('先送り傾向。最初の1テーマを一緒に特定し、90日検証で確実に前進。');
  }
  if (f.q10DelegateToField) {
    notes.push('現場主導志向は良い資質。権限線引きと評価設計を揃えると推進力が増します。');
  }
  // ---- notes ここまで ----

  return { strengths, improvements, notes };
}

// === 相談への“迷子フック”生成 ===
export const CONSULT_BENEFITS = [
  '現在地の言語化（優先順位マップ）',
  '90日アクション案（3つの打ち手＋計測指標）',
  'あなたの会社版テンプレ1枚（判断基準/任せ方）',
] as const;

const QUESTION_BANK: Record<CategoryKey, ((label: string) => string)[]> = {
  delegation: [
    (l) => `「${l}」の停滞は、スキル不足か、判断基準の不在か？（見極め所は3つあります）`,
    (l) => `任せられない理由は人か設計か？“最小合格ライン”の定義で試すと分かります。`,
  ],
  orgDrag: [
    (l) => `「${l}」は“前例”か“評価の設計”が原因？どちらを先に変えるべきかを判定します。`,
  ],
  commGap: [
    (l) => `「${l}」は言語か構造の問題か？目的→現状→制約の整列でどこまで解ける？`,
  ],
  updatePower: [
    (l) => `「${l}」はツール選定か運用定着の課題か？効果測定1枚の作りで変わります。`,
  ],
  genGap: [
    (l) => `「${l}」は価値観翻訳の不足か、期待水準の不一致か？OK/NG事例の精度が鍵。`,
  ],
  harassmentRisk: [
    (l) => `「${l}」の不安は言葉選びか、面談設計か？“観察→事実→期待→支援”の運用で判断。`,
  ],
};

export function genTeaserQuestions(input: { categories: CategoryScore[] }) {
  const bottom2 = [...input.categories]
    .sort((a, b) => (a.score - b.score) || a.key.localeCompare(b.key))
    .slice(0, 2);

  const questions: string[] = [];
  for (const c of bottom2) {
    const makers = QUESTION_BANK[c.key] || [];
    for (const m of makers) questions.push(m(c.label));
  }
  // 保障：最低2つは出す
  if (questions.length < 2) {
    questions.push('ボトルネックは構造か人か？最初に変えるべき一点を一緒に特定します。');
  }
  return { questions, benefits: [...CONSULT_BENEFITS] };
}

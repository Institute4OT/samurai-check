// lib/report/personalization.ts
// 詳細レポート用の個別コメント＆相談CTAテキスト生成（IOT版：関係性×ベクトル×対話）

// ====== 型 ======
export type CategoryKey =
  | 'delegation'      // 権限委譲・構造健全度
  | 'orgDrag'         // 組織進化阻害
  | 'commGap'         // コミュ力誤差
  | 'updatePower'     // アップデート力
  | 'genGap'          // ジェネギャップ感覚
  | 'harassmentRisk'; // 無自覚ハラスメント傾向

export type CategoryScore = { key: CategoryKey; label: string; score: number };

// flags.ts 側のブール群（ここでは必要分だけ受ける）
export type ReportFlags = {
  // 既存
  manyZeroOnQ5?: boolean;
  noRightHand?: boolean;

  // 高シグナル
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

  // 強み系サイン
  q3DecisionClear?: boolean;
  q11HighTrust?: boolean;
  q12AlumniPositive?: boolean;
  q5DataDriven?: boolean;
  q8ChallengeFriendly?: boolean;
  q13RulesBased?: boolean;

  // ★追加：相談窓口が未設置
  /** ハラスメント相談窓口が未設置（Q14/16で「窓口なし」を選択） */
  noConsultWindow?: boolean;
};

type TemplateKind = 'strength' | 'improvement';
type TemplateMap = Record<CategoryKey, Record<TemplateKind, string[]>>;

// ====== テンプレ（IOTの文脈に調整：KPI表現なし） ======
// ルール：
// ・strength：あなたは〜できています。次の一歩：〜（対話→合意の言葉→確かめ方）
// ・improvement：課題：〜。対策：〜（目的/制約/最小合格ラインを“1枚化”）
const TEMPLATES: TemplateMap = {
  delegation: {
    strength: [
      'あなたは任せる枠（役割・決裁・期限）を示せています。次の一歩：「最小合格ライン」と合意の言葉を1枚化し、軽いレビューリズムで自走を加速しましょう。',
    ],
    improvement: [
      '課題：権限の線引きが曖昧。対策：目的／制約／最小合格ライン（例：品質・コスト・期日）を1枚に明示し、対話で合意→任せる→短い振り返りの順で定着。',
    ],
  },
  orgDrag: {
    strength: [
      '“止めない”文化が芽生えています。次の一歩：2週間の小さな試行に「誰と何をどう確かめるか」を添えて、続ける/変える/やめるの合意を先に決めましょう。',
    ],
    improvement: [
      '課題：前例重視で挑戦が止まりがち。対策：2週間ミニ実験（担当・仮説・確かめ方・期日）を設計し、合意の言葉で判断を軽くする運用へ移行。',
    ],
  },
  commGap: {
    strength: [
      '意図が現場の行動に翻訳できています。次の一歩：「目的→現状→制約→基準→相手の要約」の対話テンプレを共有し、誤解の再発をブロック。',
    ],
    improvement: [
      '課題：説明した“つもり”が発生。対策：要点の1スライド化＋「相手の言葉での要約」を必ず入れる会話設計で、ベクトル合わせを進めましょう。',
    ],
  },
  updatePower: {
    strength: [
      '外の知恵や新しいやり方を前向きに取り入れられています。次の一歩：効果の「確かめ方」を1枚（目的/対象/確かめ方/期日/伴走者）で揃えましょう。',
    ],
    improvement: [
      '課題：道具や手法が点在し定着が弱い。対策：「どこをほぐすために何を試すか」から選び、2週間で確かめる流れを作る。合意の言葉で横展開。',
    ],
  },
  genGap: {
    strength: [
      '世代や立場の違いを翻訳できます。次の一歩：期待水準のOK/NG事例を言語化し、本人の「意味づけ」と結びつける対話を増やしましょう。',
    ],
    improvement: [
      '課題：“最近の若手は…”の一般化。対策：一括りをやめ、個別の手応えを対話で見つける。行動基準を事例で共有し、尊厳を守りながら合意形成。',
    ],
  },
  harassmentRisk: {
    strength: [
      '言葉の境界線に配慮があります。次の一歩：NGガイドを1枚で整え、役職者が「観察→事実→期待→支援」でフィードバックできるよう練習。',
    ],
    improvement: [
      '課題：善意の指導が裏目に出やすい。対策：外部/匿名の相談ルートを用意し、同意ベースの対話を標準化。合意の言葉を増やして安心を担保。',
    ],
  },
};

// ====== ヘルパ ======
function pickTop2Bottom2(categories: CategoryScore[]) {
  const high = [...categories].sort((a, b) => (b.score - a.score) || a.key.localeCompare(b.key));
  const low  = [...categories].sort((a, b) => (a.score - b.score) || a.key.localeCompare(b.key));
  return { top2: high.slice(0, 2), bottom2: low.slice(0, 2) };
}

/** スコア由来のフォールバック（個別テンプレが無い時用の保険） */
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
  if (improvements.length === 0) improvements.push('大きなボトルネックは見えません。2週間の小さな試行で微調整を。');

  // ---- notes（回答フラグ由来の一言アドバイス）----
  const f = input.flags || {};

  // ★追加：相談窓口が未設置
  if (f.noConsultWindow) {
    notes.push('相談窓口が未設置。法令順守と心理的安全の観点から、外部/匿名の窓口を最低1つ整備し、就業規則・評価・周知まで含めて早急に運用を開始しましょう。');
  }

  if (f.manyZeroOnQ5) notes.push('価値観（Q5）で0が多め。“やらないことリスト”で意思決定のエネルギーを節約。');
  if (f.noRightHand) notes.push('右腕/後継の育成が弱め。判断基準の言語化と役割移譲で“秒速”を持続可能に。');

  if (f.q14BusFactorHigh) notes.push('「自分不在で回らない」サイン。基準の1枚化と右腕育成でボトルネック解消。');
  if (f.q3Favoritism) notes.push('えこひいき疑念。決裁基準とプロセスの可視化で透明度を上げる。');
  if (f.q8SpeakUpLow) notes.push('発言しにくい空気。会議の目的/役割/発言ルール/要約担当を明確に。');
  if (f.q12AttritionRisk) notes.push('離職の予兆が見えにくい。1on1で「観察→事実→期待→支援」を運用。');
  if (f.q1MeetingStalls) notes.push('会議で決めきれない傾向。「最小合格×期限×責任」の三点で意思決定を軽量化。');
  if (f.q5TraditionHeavy) notes.push('伝統・勘への依存が強め。2週間の試行枠を作って安全に前進。');
  if (f.q13Backroom) notes.push('根回し/独断に依存。議論→決定→記録をワンフローで明文化。');
  if (f.q11Micromanage) notes.push('任せ切れない兆候。権限線引きとレビュー設計で委譲の成功率UP。');
  if (f.q7IndustryDenial) notes.push('「業界に関係ない」発言あり。他業界の成功を自社文脈に翻訳する場づくりを。');
  if (f.q7NoAction) notes.push('重要性は理解しているが着手遅れ。まずは2週間で確かめる一歩を設計。');
  if (f.q10Postpone) notes.push('先送り傾向。最初の1テーマを特定し、2週間→4週間→90日と階段状に進める。');
  if (f.q10DelegateToField) notes.push('現場主導志向は強み。決裁基準と合意の言葉を揃えると推進力が増す。');

  return { strengths, improvements, notes };
}

// === 相談への“迷子フック”生成（IOT版ベネフィット） ===
export const CONSULT_BENEFITS = [
  '現在地の可視化（秒速レーダー＋優先順位マップ）',
  '最初の「関係ほぐし」設計（2週間／誰と何をどう話すか／確かめ方＝手応えサイン）',
  'あなたの会社版「任せ方・決め方」1枚（目的／制約／最小合格ライン／合意の言葉）',
] as const;

// カテゴリ別に、相談で深掘りする「問い」を生成（KPI語は使わない）
const QUESTION_BANK: Record<CategoryKey, ((label: string) => string)[]> = {
  delegation: [
    (l) => `「${l}」の停滞はスキル不足か、設計（基準/線引き）か？最初に見極めるチェックは3つです。`,
    () => `“最小合格ライン”をどう置くと、任せても安心できる？（合意の言葉まで1枚化）`,
  ],
  orgDrag: [
    (l) => `「${l}」は前例か評価のどちらがブレーキ？2週間の試行で「確かめ方」と「やめるサイン」を先に決めましょう。`,
  ],
  commGap: [
    () => `ビジョンは現場の行動に翻訳されている？「目的→現状→制約→基準→要約」の1スライドで確認。`,
  ],
  updatePower: [
    () => `新しいやり方の“効果の確かめ方”は？対象・確かめ方・期日・伴走者を1枚にまとめます。`,
  ],
  genGap: [
    () => `価値観ギャップは翻訳不足か、期待水準の不一致か？OK/NG事例と本人の意味づけを合わせます。`,
  ],
  harassmentRisk: [
    () => `安心の線引きは十分？外部/匿名ルートと、対話の型（観察→事実→期待→支援）を点検します。`,
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
  if (questions.length < 2) {
    questions.push('ボトルネックは「関係性」か「設計」か？最初にほぐす一点を一緒に特定します。');
  }
  return { questions, benefits: [...CONSULT_BENEFITS] };
}

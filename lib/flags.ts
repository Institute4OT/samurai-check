// lib/flags.ts
export type AnswerLite = { id: number; selectedText: string; score: number };

export type Flags = {
  // 既存
  q7IndustryDenial?: boolean;   // 「うちの業界には関係ない」
  q7NoAction?: boolean;         // 「他優先で着手できていない」
  q10DelegateToField?: boolean; // 「現場主導で変わるのが望ましい」
  q10Postpone?: boolean;        // 「必要になったら変わる（先送り）」

  // 追加（高シグナル）
  q1MeetingStalls?: boolean;    // 会議で決めきれず/報告で終わる/長丁場/曖昧
  q1HealthyDebate?: boolean;    // 「特に問題は感じず、活発に議論できている」

  q3Favoritism?: boolean;       // 特別扱いだ（えこひいき疑念）
  q3DecisionClear?: boolean;    // 会議の結果が納得できる/決断が早い 等

  q8SpeakUpLow?: boolean;       // ちょっと発言しにくい
  q8ChallengeFriendly?: boolean;// 挑戦しやすい/幅広く声が聞こえる

  q11Micromanage?: boolean;     // 自分が握っている/常時監視系
  q11HighTrust?: boolean;       // 社員を信じて任せている

  q12AlumniPositive?: boolean;  // 卒業後も関係良好（連絡・イベント・協業）
  q12AttritionRisk?: boolean;   // 望ましい人ほど辞める/退職代行

  q13Backroom?: boolean;        // 根回し/独断で決まる
  q13RulesBased?: boolean;      // プロセスに基づく/合意形成/委ねる

  q14BusFactorHigh?: boolean;   // 自分不在で回らない（バスファクター高）
  q5TraditionHeavy?: boolean;   // 昔のやり方/勘
  q5DataDriven?: boolean;       // データや外部環境
};

// 正規化：空白・句読点・記号を除去して比較（半角/全角差にも強い）
const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(/[、。，．・（）\(\)［\]\[\]「」『』【】〈〉<>!?！？」“”'"`]/g, "");

const hit = (haystack: string, needle: string) => norm(haystack).includes(norm(needle));

export function deriveFlags(answers: AnswerLite[]): Flags {
  const flags: Flags = {};

  for (const a of answers) {
    const t = a.selectedText || "";

    // Q1 会議（新テキスト対応）
    if (a.id === 1) {
      // 停滞系：報告だけ/議題なし/長丁場/曖昧/発言出ない/説明・指示中心/原因・経緯・担当の整理に時間
      if (
        hit(t, "報告だけで終わる") ||
        hit(t, "議題なし") ||
        hit(t, "長丁場") ||
        hit(t, "曖昧") ||
        hit(t, "なかなか出てこない") ||
        hit(t, "説明や指示が中心で、他メンバーの発言が少ない") ||
        hit(t, "原因・経緯・担当の整理に時間を使いがち")
      ) {
        flags.q1MeetingStalls = true;
      }
      // ポジティブ：活発に議論できている（この選択肢だけを厳密に見る）
      if (hit(t, "特に問題は感じず、活発に議論できている")) {
        flags.q1HealthyDebate = true;
      }
    }

    // Q3 意思決定の見え方
    if (a.id === 3) {
      if (hit(t, "特別扱い")) flags.q3Favoritism = true;
      if (hit(t, "決断が早くて助かる") || hit(t, "会議の結果が納得できる")) flags.q3DecisionClear = true;
    }

    // Q5 重視すること
    if (a.id === 5) {
      if (hit(t, "昔のやり方") || hit(t, "勘で決める")) flags.q5TraditionHeavy = true;
      if (hit(t, "データや外部環境")) flags.q5DataDriven = true;
    }

    // Q6 セリフ（前向きさを流用）
    if (a.id === 6) {
      if (hit(t, "まずはそれでいってみよう") || hit(t, "自由にやっていい")) {
        flags.q8ChallengeFriendly = true;
      }
    }

    // Q7 DX/AI姿勢
    if (a.id === 7) {
      if (hit(t, "業界には関係ない")) flags.q7IndustryDenial = true;
      if (hit(t, "他優先") || hit(t, "着手できていない")) flags.q7NoAction = true;
    }

    // Q8 社内の声
    if (a.id === 8) {
      if (hit(t, "発言しにくい")) flags.q8SpeakUpLow = true;
      if (hit(t, "挑戦しやすい") || hit(t, "まんべんなく聞こえてくる") || hit(t, "指示が明確")) {
        flags.q8ChallengeFriendly = true;
      }
    }

    // Q11 社員へのスタンス
    if (a.id === 11) {
      if (hit(t, "自分が握っている") || hit(t, "自分が行わないと") || hit(t, "常に確認できる仕組み")) {
        flags.q11Micromanage = true;
      }
      if (hit(t, "信じて任せている")) flags.q11HighTrust = true;
    }

    // Q12 退職傾向（新テキスト対応）
    if (a.id === 12) {
      // 良好関係（連絡・イベント・協業）
      if (hit(t, "退職後も連絡") || hit(t, "イベントに顔を出してくれ") || hit(t, "今も連携して一緒に仕事")) {
        flags.q12AlumniPositive = true;
      }
      // リスク（残ってほしい人ほど辞める／退職代行）
      if (hit(t, "残ってほしい人ほど、あっさり辞めていく") || hit(t, "退職代行")) {
        flags.q12AttritionRisk = true;
      }
    }

    // Q13 意思決定の型
    if (a.id === 13) {
      if (hit(t, "根回し") || hit(t, "独断で決める")) flags.q13Backroom = true;
      if (hit(t, "プロセスに基づいて") || hit(t, "合意が形成") || hit(t, "委ねる場面")) {
        flags.q13RulesBased = true;
      }
    }

    // Q14 バスファクター
    if (a.id === 14) {
      if (hit(t, "自分抜きではどうにもならない") || hit(t, "全部自分")) {
        flags.q14BusFactorHigh = true;
      }
    }

    // Q10 変わる覚悟
    if (a.id === 10) {
      if (hit(t, "現場主導で変わる")) flags.q10DelegateToField = true;
      if (hit(t, "必要になったら変わる") || hit(t, "先送り")) flags.q10Postpone = true;
    }
  }

  return flags;
}

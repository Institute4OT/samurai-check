// lib/flags.ts
// 選択肢テキストからレポート用のブール・フラグを抽出するユーティリティ
// - 大小/全角半角/句読点ゆれに強い部分一致（norm/hit）
// - 複数選択は 1 選択肢ずつ AnswerLite が来る想定（まとめて来ても includes で拾える）

export type AnswerLite = { id: number; selectedText: string; score: number };

export type Flags = {
  // 既存（互換保持）
  q7IndustryDenial?: boolean;   // 「うちの業界には関係ない」
  q7NoAction?: boolean;         // 「他優先で着手できていない」
  q10DelegateToField?: boolean; // 「現場主導で変わるのが望ましい」
  q10Postpone?: boolean;        // 「必要になったら変わる（先送り）」

  // 追加（会議/意思決定・文化）
  q1MeetingStalls?: boolean;    // 会議で決めきれず/報告で終わる/長丁場/曖昧/発言少
  q1HealthyDebate?: boolean;    // 「特に問題は感じず、活発に議論できている」

  q3Pioneer?: boolean;          // 新技術・新市場に攻め（先んじて生み出す/積極的に試す/異業種ヒント）
  q3Cautious?: boolean;         // 事例確認後/安全確認してから（慎重）
  q3Traditional?: boolean;      // 流行に乗らない/自社のやり方を貫く

  q3Favoritism?: boolean;       // （旧Q3互換）特別扱いだ、等の声
  q3DecisionClear?: boolean;    // 決断が早い/会議の結果が納得できる

  q5TraditionHeavy?: boolean;   // 昔のやり方/勘
  q5DataDriven?: boolean;       // データや外部環境

  q8SpeakUpLow?: boolean;       // ちょっと発言しにくい
  q8ChallengeFriendly?: boolean;// 挑戦しやすい/幅広く声が聞こえる/指示が明確

  q11Micromanage?: boolean;     // 自分が握っている/常時監視系/社長がやらないと…
  q11HighTrust?: boolean;       // 社員を信じて任せている

  q12AlumniPositive?: boolean;  // 卒業後も関係良好（連絡・イベント・協業）
  q12AttritionRisk?: boolean;   // 望ましい人ほど辞める/退職代行

  q13Backroom?: boolean;        // 根回し/独断で決まる
  q13RulesBased?: boolean;      // プロセスに基づく/合意形成/委ねる

  q14BusFactorHigh?: boolean;   // 自分不在で回らない（バスファクター高）

  // 追加（Q2：新提案への関わり方）
  q2RejectNew?: boolean;        // 却下することが多い
  q2TopDownAll?: boolean;       // すべて自分が指示（トップダウン）
  q2PartialDelegate?: boolean;  // 最終判断は自分だが一部任せる
  q2ExperimentAssign?: boolean; // 担当者を決め小さく試す
  q2MeetingDecision?: boolean;  // 関係部署で話し合って決定
  q2FullDelegation?: boolean;   // 目的・制約だけ示して実行は任せる

  // 追加（Q15：日常コミュニケーションの扱い）
  q15WorkOnly?: boolean;        // 仕事の話題のみ（過度に収縮）
  q15OverOpen?: boolean;        // プライベートを遠慮なくオープン（過度に開放）
  q15ConsentOnly?: boolean;     // 相手の自己言及があればOK（同意ベース）
  q15PolicyTraining?: boolean;  // NGガイド＋役職者トレーニングあり

  // 追加（Q16：相談窓口/人事運用）
  q16ConsultBossOnly?: boolean; // 相談は社長/直属が受ける
  q16GenderedUniform?: boolean; // 性別で異なる服装/制服の慣行
  q16InternalSingleWindow?: boolean; // 社内の特定者が受ける体制（単線）
  q16MaleDominantMgmt?: boolean; // 経営・管理職は男性が多い
  q16InternalMultiAnon?: boolean; // 社内で複数/匿名窓口（直属以外）
  q16GenderNeutralPolicy?: boolean; // 性別中立の服装規定・評価/昇格の明文化
  q16ExternalHotline?: boolean;  // 外部を含む複線化
  q16FairnessMonitoring?: boolean; // 昇格・配置の公平性モニタ（例：女性管理職比率）
};

// 正規化：空白・句読点・記号を除去して比較（半角/全角差にも強い）
const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(/[、。，．・（）\(\)［\]\[\]「」『』【】〈〉<>!?！？」“”'"`、。・]/g, "");

const hit = (haystack: string, needle: string) => norm(haystack).includes(norm(needle));

export function deriveFlags(answers: AnswerLite[]): Flags {
  const flags: Flags = {};

  for (const a of answers) {
    const t = a.selectedText || "";

    // Q1 会議（新テキスト）
    if (a.id === 1) {
      if (
        hit(t, "報告だけで終わる") ||
        hit(t, "議題なし") ||
        hit(t, "長丁場") ||
        hit(t, "曖昧") ||
        hit(t, "なかなか出てこない") ||
        hit(t, "説明や指示が中心") ||
        hit(t, "発言が少ない") ||
        hit(t, "原因") && hit(t, "経緯")
      ) {
        flags.q1MeetingStalls = true;
      }
      if (hit(t, "活発に議論できている")) {
        flags.q1HealthyDebate = true;
      }
    }

    // Q2 新しい提案への関わり方
    if (a.id === 2) {
      if (hit(t, "却下する")) flags.q2RejectNew = true;
      if (hit(t, "自分すべて指示") || hit(t, "自分すべて") || hit(t, "自分がすべて指示")) flags.q2TopDownAll = true;
      if (hit(t, "最終的な判断は自分") && hit(t, "一部は任せる")) flags.q2PartialDelegate = true;
      if (hit(t, "小さく試して") || hit(t, "担当者を決め")) flags.q2ExperimentAssign = true;
      if (hit(t, "関係部署") && hit(t, "話し合う")) flags.q2MeetingDecision = true;
      if (hit(t, "目的と制約") && hit(t, "実行は全て任せる")) flags.q2FullDelegation = true;
    }

    // Q3 新技術/市場へのスタンス
    if (a.id === 3) {
      if (hit(t, "他社よりも早く") || hit(t, "生み出したい") || hit(t, "積極的に試す") || hit(t, "異業種")) {
        flags.q3Pioneer = true;
      }
      if (hit(t, "成功事例") || hit(t, "安全性を確認") || hit(t, "部分的に関心")) {
        flags.q3Cautious = true;
      }
      if (hit(t, "流行には乗らない") || hit(t, "自社のやり方を貫く")) {
        flags.q3Traditional = true;
      }
      // 旧Q3互換（もし類する文言が混在してきても拾えるよう温存）
      if (hit(t, "特別扱い")) flags.q3Favoritism = true;
      if (hit(t, "決断が早く") || hit(t, "会議の結果が納得できる")) flags.q3DecisionClear = true;
    }

    // Q5 重視すること
    if (a.id === 5) {
      if (hit(t, "やり方") || hit(t, "前例") || hit(t, "勘で決める")) flags.q5TraditionHeavy = true;
      if (hit(t, "データ") || hit(t, "外部環境")) flags.q5DataDriven = true;
    }

    // Q6（旧セリフ→現「働き方」でも正負シグナルを緩やかに拾う）
    if (a.id === 6) {
      // 前向きに挑戦できる空気感を Q8 チャレンジフレンドリへ寄与させる
      if (hit(t, "多様な働き方") || hit(t, "外部の力") || hit(t, "最大のパフォーマンス") || hit(t, "切磋琢磨")) {
        flags.q8ChallengeFriendly = true;
      }
    }

    // Q7 DX/AI姿勢
    if (a.id === 7) {
      if (hit(t, "関係ない")) flags.q7IndustryDenial = true;
      if (hit(t, "他優先") || hit(t, "着手できていない")) flags.q7NoAction = true;
    }

    // Q8 社内の声/挑戦しやすさ
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

    // Q12 退職傾向
    if (a.id === 12) {
      if (hit(t, "退職後も連絡") || hit(t, "イベントに顔を出してくれ") || hit(t, "今も連携して一緒に仕事")) {
        flags.q12AlumniPositive = true;
      }
      if (hit(t, "残ってほしい人ほど") || hit(t, "退職代行")) {
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

    // Q15 日常コミュニケーションの扱い
    if (a.id === 15) {
      if (hit(t, "仕事関係のみに限定")) flags.q15WorkOnly = true;
      if (hit(t, "遠慮なくオープン")) flags.q15OverOpen = true;
      if (hit(t, "自己言及") || hit(t, "自分言及")) flags.q15ConsentOnly = true;
      if (hit(t, "ngガイド") || (hit(t, "ng") && hit(t, "ガイド")) || hit(t, "トレーニング")) {
        flags.q15PolicyTraining = true;
      }
    }

    // Q16 相談窓口/運用
    if (a.id === 16) {
      if (hit(t, "社長") && hit(t, "相談") || hit(t, "直属") && hit(t, "相談")) flags.q16ConsultBossOnly = true;
      if (hit(t, "性別で異なる服装") || hit(t, "制服")) flags.q16GenderedUniform = true;
      if (hit(t, "社内の特定者") && hit(t, "受ける")) flags.q16InternalSingleWindow = true;
      if (hit(t, "男性が多い") || hit(t, "男性がほとんど")) flags.q16MaleDominantMgmt = true;

      if (hit(t, "複数") && hit(t, "匿名") || hit(t, "匿名の窓口")) flags.q16InternalMultiAnon = true;
      if (hit(t, "性別中立") || (hit(t, "服装規定") && hit(t, "中立")) || hit(t, "評価") && hit(t, "昇格") && hit(t, "明文化")) {
        flags.q16GenderNeutralPolicy = true;
      }
      if (hit(t, "外部") && (hit(t, "窓口") || hit(t, "複線化"))) flags.q16ExternalHotline = true;
      if (hit(t, "公平性") || hit(t, "比率") && hit(t, "女性管理職") || hit(t, "モニタ")) {
        flags.q16FairnessMonitoring = true;
      }
    }
  }

  return flags;
}

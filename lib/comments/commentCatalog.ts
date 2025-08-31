// src/lib/comments/commentCatalog.ts  (6カテゴリのテンプレ倉庫（強み/改善/ヒント、${leader} などを展開）)
export type CategoryKey =
  | "delegation"
  | "org_inhibition"
  | "comm_gap"
  | "update_ability"
  | "gen_gap"
  | "harassment_risk";

export type TemplateKind = "strength" | "improvement" | "hint";

export interface CommentTemplate { kind: TemplateKind; text: string; }

type Catalog = Record<CategoryKey, Record<TemplateKind, CommentTemplate[]>>;

export const JP_LABEL: Record<CategoryKey, string> = {
  delegation: "権限委譲・構造健全度",
  org_inhibition: "組織進化阻害",
  comm_gap: "コミュ力誤差",
  update_ability: "アップデート力",
  gen_gap: "ジェネギャップ感覚",
  harassment_risk: "無自覚ハラスメント傾向",
};

// 最小セット（必要に応じて増やす）
export const catalog: Catalog = {
  delegation: {
    strength: [{ kind: "strength", text:
      "${leader}型の強みは「${catJP}」。任せる枠と判断の土台を示せています。次は“任せた後の測り方”を軽量化すると、現場がさらに自走します。"}],
    improvement: [{ kind: "improvement", text:
      "権限の線引きが曖昧。決裁の戻りが多く速度を削いでいます。Why/基準/期限/最小合格を1枚に可視化し、“再持ち帰り”を減らしましょう。"}],
    hint: [{ kind: "hint", text:
      "週1回の“任せた後ミーティング”を15分で。進捗・阻害要因・次の一手だけに絞ると、委譲の成功率が上がります。"}],
  },
  org_inhibition: { strength:[{kind:"strength",text:
      "ムダな停止を嫌い、${catJP}の芽を早期に潰さない姿勢が出ています。次は“試す予算”の枠を決め、改善が回る仕組みに。"}],
    improvement:[{kind:"improvement",text:
      "“前例”が強すぎ、挑戦が萎縮。小さく試す金額と期間を先に決め、事例の共有を定例化しましょう。"}],
    hint:[{kind:"hint",text:
      "会議は“決める会議”と“考える会議”を分けるだけで、進化速度が上がります。"}],
  },
  comm_gap: { strength:[{kind:"strength",text:
      "要点が伝わる話し方ができています。次は“聞き返しテンプレ”をチーム共通化し、誤解の再発を防ぎましょう。"}],
    improvement:[{kind:"improvement",text:
      "“説明したつもり”が多め。目的→現状→制約→判断基準の順で話し、最後に相手の理解を要約してもらいましょう。"}],
    hint:[{kind:"hint",text:
      "禁止ワード（抽象・精神論）を決め、具体と数字で語る練習を週1で。"}],
  },
  update_ability: { strength:[{kind:"strength",text:
      "新しい道具に前向き。まずは“使いどころ”の選定が的確です。次は効果測定を1枚で可視化し、採用の説得力を高めましょう。"}],
    improvement:[{kind:"improvement",text:
      "ツール導入が点在。業務フロー上の“詰まり”から逆算して選ぶと、定着率が上がります。"}],
    hint:[{kind:"hint",text:
      "PoCは2週間・1業務・3指標まで。伸びない指標は即撤退のルールで。"}],
  },
  gen_gap: { strength:[{kind:"strength",text:
      "世代差の捉えが柔らかく、言い換え力があります。価値観の“翻訳者”を続けてください。"}],
    improvement:[{kind:"improvement",text:
      "“最近の若手は…”が出やすい傾向。期待水準を言語化し、OK/NGの境界を事例で共有しましょう。"}],
    hint:[{kind:"hint",text:
      "用語辞典・禁止ワード・推奨フレーズを1ページで。合意形成が速くなります。"}],
  },
  harassment_risk: { strength:[{kind:"strength",text:
      "言葉の重みを意識できています。否定語の置き換えが進み、心理的安全性を保てています。"}],
    improvement:[{kind:"improvement",text:
      "“善意の指導”が刺さる可能性。行動観察→事実→期待→支援の順でフィードバックに。"}],
    hint:[{kind:"hint",text:
      "会議の“ジャッジ禁止タイム”を最初の3分に。発言量が増えます。"}],
  },
};

export const flagNotes: Record<string, string[]> = {
  flag_manyZeroQ5: [
    "価値観項目で“0”が目立ちます。否定でなく“未定義”の可能性。まずは“やらないことリスト”を作り、判断のエネルギーを節約しましょう。"
  ],
};

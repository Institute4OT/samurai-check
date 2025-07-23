import { judgeSamuraiType, SamuraiType } from "./lib/samuraiJudge";
import { CategoryScores } from "./lib/scoringSystem";

// 架空のスコアパターンと期待される武将タイプ
const testCases: { name: string; input: CategoryScores; expected: SamuraiType }[] = [
  {
    name: "真田幸村型（理想型）",
    input: {
      アップデート力: 2.8,
      ジェネギャップ感覚: 2.7,
      "権限委譲・構造健全度": 2.6,
      組織進化阻害: 1.0,
      無自覚ハラスメント傾向: 1.0,
      コミュ力誤差: 2.4,
    },
    expected: "真田幸村型",
  },
  {
    name: "今川義元型（停滞）",
    input: {
      アップデート力: 0.8,
      ジェネギャップ感覚: 1.0,
      "権限委譲・構造健全度": 1.1,
      組織進化阻害: 2.6,
      無自覚ハラスメント傾向: 2.7,
      コミュ力誤差: 0.9,
    },
    expected: "今川義元型",
  },
  {
    name: "斎藤道三型（独裁）",
    input: {
      アップデート力: 2.6,
      ジェネギャップ感覚: 1.9,
      "権限委譲・構造健全度": 1.5,
      組織進化阻害: 2.3,
      無自覚ハラスメント傾向: 2.4,
      コミュ力誤差: 1.5,
    },
    expected: "斎藤道三型",
  },
  {
    name: "織田信長型（革新）",
    input: {
      アップデート力: 2.6,
      ジェネギャップ感覚: 2.4,
      "権限委譲・構造健全度": 1.8,
      組織進化阻害: 1.5,
      無自覚ハラスメント傾向: 1.6,
      コミュ力誤差: 1.9,
    },
    expected: "織田信長型",
  },
  {
    name: "上杉謙信型（高潔）",
    input: {
      アップデート力: 2.0,
      ジェネギャップ感覚: 2.3,
      "権限委譲・構造健全度": 2.0,
      組織進化阻害: 1.3,
      無自覚ハラスメント傾向: 1.2,
      コミュ力誤差: 2.5,
    },
    expected: "上杉謙信型",
  },
  {
    name: "徳川家康型（慎重）",
    input: {
      アップデート力: 1.4,
      ジェネギャップ感覚: 1.8,
      "権限委譲・構造健全度": 2.7,
      組織進化阻害: 1.4,
      無自覚ハラスメント傾向: 1.4,
      コミュ力誤差: 1.6,
    },
    expected: "徳川家康型",
  },
  {
    name: "豊臣秀吉型（共創）",
    input: {
      アップデート力: 2.2,
      ジェネギャップ感覚: 2.3,
      "権限委譲・構造健全度": 2.5,
      組織進化阻害: 1.5,
      無自覚ハラスメント傾向: 1.6,
      コミュ力誤差: 2.6,
    },
    expected: "豊臣秀吉型",
  },
];

// Boltで直接実行できるmain関数（Runボタン用）
export default function main() {
  for (const { name, input, expected } of testCases) {
    const result = judgeSamuraiType(input);
    const passed = result === expected ? "✅" : "❌";
    console.log(`${passed} ${name} → ${result}（期待: ${expected}）`);
  }
}

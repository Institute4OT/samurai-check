// testSamuraiJudge.ts
import { judgeSamuraiType } from "./lib/samuraiJudge";
import type { SamuraiType, NormalizedCategoryScores } from "./types/diagnosis";

// 期待パターン（NormalizedCategoryScores 形式）
const testCases: {
  name: string;
  input: NormalizedCategoryScores;
  expected: SamuraiType;
}[] = [
  {
    name: "真田幸村型（理想型）",
    input: {
      updatePower: 2.8,
      genGap: 2.7,
      delegation: 2.6,
      orgDrag: 1.0,
      harassmentAwareness: 1.0,
      commGap: 0.8, // 真田条件に合わせて控えめに（高すぎると信長寄りになるため）
    },
    expected: "真田幸村型",
  },
  {
    name: "今川義元型（停滞）",
    input: {
      updatePower: 0.8,
      genGap: 1.0,
      delegation: 1.1,
      orgDrag: 2.6,
      harassmentAwareness: 2.7,
      commGap: 0.9,
    },
    expected: "今川義元型",
  },
  {
    name: "斎藤道三型（独裁）",
    input: {
      updatePower: 2.6,
      genGap: 1.9,
      delegation: 1.5,
      orgDrag: 2.3, // 組織進化阻害（orgDrag）高め
      harassmentAwareness: 2.4,
      commGap: 1.5,
    },
    expected: "斎藤道三型",
  },
  {
    name: "織田信長型（革新）",
    input: {
      updatePower: 2.6,
      genGap: 1.2,
      delegation: 1.8,
      orgDrag: 1.3,
      harassmentAwareness: 1.2,
      commGap: 1.1, // commGap 低め
    },
    expected: "織田信長型",
  },
  {
    name: "上杉謙信型（高潔）",
    input: {
      updatePower: 2.0,
      genGap: 2.3,
      delegation: 2.0,
      orgDrag: 1.3,
      harassmentAwareness: 1.2,
      commGap: 2.5,
    },
    expected: "上杉謙信型",
  },
  {
    name: "徳川家康型（慎重）",
    input: {
      updatePower: 1.4,
      genGap: 1.8,
      delegation: 2.7,
      orgDrag: 1.2, // orgDrag 低め
      harassmentAwareness: 1.4,
      commGap: 1.6,
    },
    expected: "徳川家康型",
  },
  {
    name: "豊臣秀吉型（共創）",
    input: {
      updatePower: 2.2,
      genGap: 2.3,
      delegation: 2.5,
      orgDrag: 1.5,
      harassmentAwareness: 1.6,
      commGap: 2.1, // commGap 高め
    },
    expected: "豊臣秀吉型",
  },
];

// ローカル実行用
export default function main() {
  for (const { name, input, expected } of testCases) {
    const result = judgeSamuraiType(input);
    const passed = result === expected ? "✅" : "❌";
    console.log(`${passed} ${name} → ${result}（期待: ${expected}）`);
  }
}

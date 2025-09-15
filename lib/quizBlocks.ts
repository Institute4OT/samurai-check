// lib/quizBlocks.ts
export type BlockDef = { title: string; items: (string | number)[] };

const toId = (x: string | number) => Number(String(x).replace(/^Q/i, ""));

export const blocks: BlockDef[] = [
  { title: "初動・意思・根拠", items: ["Q2", "Q3", "Q5", "Q10"] },
  { title: "仕組み・通り道", items: ["Q4", "Q1", "Q11", "Q8"] },
  { title: "土壌・受容性・学習", items: ["Q6", "Q9", "Q7", "Q12"] },
  { title: "人材の能力発揮", items: ["Q15", "Q16", "Q13"] },
  { title: "進化スピードの分かれ道", items: ["Q14"] },
];

// 表示順（ポジション順の配列）
export const DISPLAY_ORDER: number[] = blocks.flatMap((b) => b.items).map(toId);

// 見出し：各ブロックの“最初の設問が来たポジション”にだけ出す
export const blockTitleByFirstPosition: Record<number, string> = (() => {
  const map: Record<number, string> = {};
  DISPLAY_ORDER.forEach((qid, idx) => {
    // そのポジションが各ブロックの先頭IDなら見出しを付ける
    const title = blocks.find((b) => toId(b.items[0]) === qid)?.title;
    if (title) map[idx + 1] = title; // 1-based
  });
  return map;
})();

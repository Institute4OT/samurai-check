import { catalog, JP_LABEL, CategoryKey, flagNotes } from "./commentCatalog";

type ScoreItem = { key: CategoryKey; score: number; };
type Input = {
  leader: string; // 例: "真田幸村"
  scores: Record<CategoryKey, number>; // 0-3
  flags?: Record<string, boolean>;
};

const STRENGTH_THRESHOLD = 2.5;
const IMPROVE_THRESHOLD = 1.0;

function stableSort<T>(arr: T[], getKey: (v: T) => string): T[] {
  return [...arr].sort((a,b)=> getKey(a).localeCompare(getKey(b),"ja"));
}

function pickTopBottom(scores: Record<CategoryKey, number>) {
  const list: ScoreItem[] = Object.entries(scores).map(([k,v])=>({
    key: k as CategoryKey, score: v
  }));

  const byHigh = [...list].sort((a,b)=>{
    if (b.score !== a.score) return b.score - a.score;
    return a.key.localeCompare(b.key);
  });
  const byLow = [...list].sort((a,b)=>{
    if (a.score !== b.score) return a.score - b.score;
    return a.key.localeCompare(b.key);
  });

  return {
    top2: byHigh.slice(0,2),
    bottom2: byLow.slice(0,2),
  };
}

function render(template: string, leader: string, catJP: string, score: number) {
  return template
    .replaceAll("${leader}", leader)
    .replaceAll("${catJP}", catJP)
    .replaceAll("${score}", String(score));
}

// 文字数制御（超えたら三点リーダ）
function clamp(text: string, max = 140) {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

export function generateComments(input: Input) {
  const { leader, scores, flags } = input;
  const { top2, bottom2 } = pickTopBottom(scores);

  const strengths = top2.map(({key, score})=>{
    const cat = catalog[key].strength[0]; // 今は1本、将来はスコア帯でバリエーション
    return clamp(render(cat.text, leader, JP_LABEL[key], score), 140);
  });

  const improvements = bottom2.map(({key, score})=>{
    const cat = catalog[key].improvement[0];
    return clamp(render(cat.text, leader, JP_LABEL[key], score), 140);
  });

  const notes: string[] = [];
  if (flags) {
    Object.entries(flags).forEach(([flag, on])=>{
      if (on && flagNotes[flag]) {
        // 1フラグ1本。将来は状況で2本まで
        notes.push(clamp(flagNotes[flag][0], 100));
      }
    });
  }

  return { strengths, improvements, notes };
}

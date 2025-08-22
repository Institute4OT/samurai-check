// lib/comments/generatePersonalComments.ts
import { answerRules, CommentItem } from "./answerRules";

export type AnswerLite = { id: number; selectedText: string; score: number };
const norm = (s: string) => (s || "").replace(/\s/g, "");

export function generatePersonalComments(
  answers: AnswerLite[],
  maxEach: number = 2
): { talents: string[]; challenges: string[] } {
  const picked = new Map<string, CommentItem>();

  for (const a of answers) {
    for (const r of answerRules) {
      if (a.id !== r.q) continue;
      const hay = norm(a.selectedText);
      const hit =
        typeof r.includes === "string"
          ? hay.includes(norm(r.includes))
          : r.includes.test(a.selectedText);
      if (!hit) continue;
      for (const item of r.emit) if (!picked.has(item.key)) picked.set(item.key, item);
    }
  }

  const talents = Array.from(picked.values())
    .filter(i => i.category === "talent")
    .sort((a,b) => b.weight - a.weight)
    .slice(0, maxEach)
    .map(i => i.text);

  const challenges = Array.from(picked.values())
    .filter(i => i.category === "challenge")
    .sort((a,b) => b.weight - a.weight)
    .slice(0, maxEach)
    .map(i => i.text);

  if (talents.length === 0) talents.push("直近の成功体験から“再現できた要因”を言語化し、強みを資産化しましょう。");
  if (challenges.length === 0) challenges.push("2週間で終わる最小実験を1つ設定し、学びを次に繋げましょう。");

  return { talents, challenges };
}

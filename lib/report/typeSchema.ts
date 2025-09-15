// lib/report/typeSchema.ts
export type SamuraiType =
  | "真田幸村型"
  | "今川義元型"
  | "斎藤道三型"
  | "織田信長型"
  | "豊臣秀吉型"
  | "徳川家康型"
  | "上杉謙信型";

export type TypeContent = {
  description?: string;
  strengths: string[];
  pitfalls: string[];
  shouldFocus: string[];
  growthStory?: string;
  actionPlan?: string[];
  connector?: string;
};

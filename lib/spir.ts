// lib/spir.ts
export type Counselor = "ishijima" | "morigami";

const urls = {
  ishijima: process.env.NEXT_PUBLIC_SPIR_ISHIJIMA_URL || "",
  morigami: process.env.NEXT_PUBLIC_SPIR_MORIGAMI_URL || "",
} as const;

export function getSpirUrl(counselor: Counselor): string | null {
  const url = urls[counselor];
  if (!url || !/^https?:\/\//i.test(url)) return null;
  return url;
}

// /lib/samuraiTypeMap.ts
// 目的：苗字スラッグを正（oda/toyotomi/tokugawa/…）に統一しつつ、
//       旧キー hideyoshi / ieyasu も後方互換で受ける。

export type SamuraiJa =
  | "真田幸村型"
  | "織田信長型"
  | "豊臣秀吉型"
  | "徳川家康型"
  | "上杉謙信型"
  | "斎藤道三型"
  | "今川義元型";

// “正”のスラッグ（苗字で統一）
export type SamuraiSlug =
  | "sanada"
  | "oda"
  | "toyotomi"
  | "tokugawa"
  | "uesugi"
  | "saito"
  | "imagawa";

// 後方互換を含むキー型（旧：hideyoshi/ieyasu を許容）
export type SamuraiKey = SamuraiSlug | "hideyoshi" | "ieyasu";

/** 日本語 → 苗字スラッグ（正） */
export const JA_TO_SLUG: Record<SamuraiJa, SamuraiSlug> = {
  真田幸村型: "sanada",
  織田信長型: "oda",
  豊臣秀吉型: "toyotomi", // 旧 hideyoshi → 正 toyotomi
  徳川家康型: "tokugawa", // 旧 ieyasu   → 正 tokugawa
  上杉謙信型: "uesugi",
  斎藤道三型: "saito",
  今川義元型: "imagawa",
};

/** 苗字スラッグ（正） → 日本語 */
export const SLUG_TO_JA: Record<SamuraiSlug, SamuraiJa> = Object.entries(
  JA_TO_SLUG,
).reduce(
  (acc, [ja, slug]) => {
    acc[slug as SamuraiSlug] = ja as SamuraiJa;
    return acc;
  },
  {} as Record<SamuraiSlug, SamuraiJa>,
);

/** 旧キー → 正スラッグ への変換（後方互換） */
export const LEGACY_TO_SLUG: Record<"hideyoshi" | "ieyasu", SamuraiSlug> = {
  hideyoshi: "toyotomi",
  ieyasu: "tokugawa",
};

/** 日本語 → 後方互換キー（= 正スラッグを返す。旧値が必要なら JA_TO_KEY_LEGACY を使用） */
export const JA_TO_KEY: Record<SamuraiJa, SamuraiKey> = JA_TO_SLUG;

/** 後方互換キー（正/旧の混在） → 日本語 */
export const KEY_TO_JA: Record<SamuraiKey, SamuraiJa> = {
  // 正スラッグ
  ...SLUG_TO_JA,
  // 旧キーも受ける
  hideyoshi: SLUG_TO_JA["toyotomi"],
  ieyasu: SLUG_TO_JA["tokugawa"],
};

/** （必要なら）旧キーで返す互換マップ */
export const JA_TO_KEY_LEGACY: Record<
  SamuraiJa,
  "sanada" | "oda" | "hideyoshi" | "ieyasu" | "uesugi" | "saito" | "imagawa"
> = {
  真田幸村型: "sanada",
  織田信長型: "oda",
  豊臣秀吉型: "hideyoshi",
  徳川家康型: "ieyasu",
  上杉謙信型: "uesugi",
  斎藤道三型: "saito",
  今川義元型: "imagawa",
};

/* 便利ヘルパー（どこからでも統一スラッグを取得） */
export function getSamuraiSlug(input: SamuraiJa | SamuraiKey): SamuraiSlug {
  if (isSamuraiJa(input)) return JA_TO_SLUG[input];
  // キーなら正スラッグ or 旧を正へ寄せる
  if (input === "hideyoshi" || input === "ieyasu") return LEGACY_TO_SLUG[input];
  return input as SamuraiSlug;
}

export function isSamuraiJa(v: any): v is SamuraiJa {
  return typeof v === "string" && v in JA_TO_SLUG;
}

/* 兜画像／色などスラッグ依存リソースの一元アクセサ */
export function getHelmetSrc(input: SamuraiJa | SamuraiKey) {
  const slug = getSamuraiSlug(input);
  return `/images/helmets/${slug}.svg`;
}

export const SAMURAI_COLOR_BY_SLUG: Record<SamuraiSlug, string> = {
  oda: "#C62828",
  toyotomi: "#EF6C00",
  tokugawa: "#2E7D32",
  uesugi: "#1565C0",
  sanada: "#AD1457",
  imagawa: "#6A1B9A",
  saito: "#455A64",
};

export function getSamuraiColor(input: SamuraiJa | SamuraiKey) {
  return SAMURAI_COLOR_BY_SLUG[getSamuraiSlug(input)];
}

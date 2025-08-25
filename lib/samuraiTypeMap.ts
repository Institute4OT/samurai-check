// lib/samuraiTypeMap.ts
export type SamuraiKey =
  | 'sanada' | 'oda' | 'hideyoshi' | 'ieyasu' | 'uesugi' | 'saito' | 'imagawa';

export type SamuraiJa =
  | '真田幸村型' | '織田信長型' | '豊臣秀吉型'
  | '徳川家康型' | '上杉謙信型' | '斎藤道三型' | '今川義元型';

export const JA_TO_KEY: Record<SamuraiJa, SamuraiKey> = {
  '真田幸村型': 'sanada',
  '織田信長型': 'oda',
  '豊臣秀吉型': 'hideyoshi',
  '徳川家康型': 'ieyasu',
  '上杉謙信型': 'uesugi',
  '斎藤道三型': 'saito',
  '今川義元型': 'imagawa',
};

export const KEY_TO_JA: Record<SamuraiKey, SamuraiJa> =
  Object.entries(JA_TO_KEY).reduce((acc, [ja, key]) => {
    acc[key as SamuraiKey] = ja as SamuraiJa;
    return acc;
  }, {} as Record<SamuraiKey, SamuraiJa>);

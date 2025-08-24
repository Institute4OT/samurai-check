// /lib/report/kabutoMap.ts
export type SamuraiLabel =
  | '真田幸村型'
  | '斎藤道三型'
  | '上杉謙信型'
  | '徳川家康型'
  | '豊臣秀吉型'
  | '織田信長型'
  | '今川義元型';

// public/images/kabuto/*.svg を配置済み前提
export const kabutoSrcByType: Record<SamuraiLabel, string> = {
  '真田幸村型': '/images/kabuto/sanada.svg',
  '斎藤道三型': '/images/kabuto/saito.svg',
  '上杉謙信型': '/images/kabuto/uesugi.svg',
  '徳川家康型': '/images/kabuto/tokugawa.svg',
  '豊臣秀吉型': '/images/kabuto/toyotomi.svg',
  '織田信長型': '/images/kabuto/oda.svg',
  '今川義元型': '/images/kabuto/imagawa.svg',
};

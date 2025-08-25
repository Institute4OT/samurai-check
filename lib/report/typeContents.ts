// lib/report/typeContents.ts
import type { SamuraiType, TypeContent } from './typeSchema';

import { SANADA } from './types/sanada';
import { IMAGAWA } from './types/imagawa';
import { SAITO } from './types/saito';
import { ODA } from './types/oda';
import { TOYOTOMI } from './types/toyotomi';
import { TOKUGAWA } from './types/tokugawa';
import { UESUGI } from './types/uesugi';

export { SamuraiType, TypeContent }; // 外からも使えるように再エクスポート

export const TYPE_CONTENTS: Record<SamuraiType, TypeContent> = {
  '真田幸村型': SANADA,
  '今川義元型': IMAGAWA,
  '斎藤道三型': SAITO,
  '織田信長型': ODA,
  '豊臣秀吉型': TOYOTOMI,
  '徳川家康型': TOKUGAWA,
  '上杉謙信型': UESUGI,
} as const;

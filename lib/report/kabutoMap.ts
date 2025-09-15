// /lib/report/kabutoMap.ts
import type { SamuraiType } from "@/types/diagnosis";

// public/images/kabuto/{surname}.svg を前提（姓ローマ字）
export const KABUTO_SRC: Record<SamuraiType, { surname: string; src: string }> =
  {
    真田幸村型: { surname: "sanada", src: "/images/kabuto/sanada.svg" },
    織田信長型: { surname: "oda", src: "/images/kabuto/oda.svg" },
    豊臣秀吉型: { surname: "toyotomi", src: "/images/kabuto/toyotomi.svg" },
    徳川家康型: { surname: "tokugawa", src: "/images/kabuto/tokugawa.svg" },
    斎藤道三型: { surname: "saito", src: "/images/kabuto/saito.svg" },
    今川義元型: { surname: "imagawa", src: "/images/kabuto/imagawa.svg" },
    上杉謙信型: { surname: "uesugi", src: "/images/kabuto/uesugi.svg" },
  };

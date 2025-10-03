// middleware.ts（プロジェクト直下）
// 目的：①メンテ中は /coming-soon へリライト ②既存の /report/<uuid> → /report?id=<uuid> 301 を維持

import { NextResponse, NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname, search } = url;

  // ---- 1) メンテナンスゲート -----------------------------------------
  const isMaintenance = process.env.MAINTENANCE === "1";
  if (isMaintenance) {
    // 許可パス（メンテ画面自体・静的資産・ヘルスチェックなど）
    const allow = [
      "/coming-soon",
      "/api/health",
      "/favicon", "/robots.txt", "/sitemap.xml",
      "/_next", "/assets", "/images"
    ];
    if (!allow.some((p) => pathname.startsWith(p))) {
      const res = NextResponse.rewrite(new URL("/coming-soon", req.url));
      res.headers.set("Cache-Control", "no-store");
      return res;
    }
    return NextResponse.next();
  }

  // ---- 2) 旧式 /report/<uuid> を /report?id=<uuid> に 301 リダイレクト ----
  // 例: /report/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const m = pathname.match(/^\/report\/([0-9a-fA-F-]{36})\/?$/);
  if (m) {
    const id = m[1];
    const url2 = req.nextUrl.clone();
    url2.pathname = "/report";
    url2.search = `?id=${encodeURIComponent(id)}${search ? "&" + search.slice(1) : ""}`;
    return NextResponse.redirect(url2, 301);
  }

  // デフォルト
  return NextResponse.next();
}

// どのパスに適用するか（全体に適用）
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

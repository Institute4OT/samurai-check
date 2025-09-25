// middleware.ts（プロジェクト直下に新規作成、📧「レポートを開く」リンクの正常化が目的）

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 旧式の /report/<uuid> を /report?id=<uuid> に301リダイレクト
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // /report/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx のようなパスにマッチ
  const m = pathname.match(/^\/report\/([0-9a-fA-F-]{36})\/?$/);
  if (m) {
    const id = m[1];
    const url = req.nextUrl.clone();
    url.pathname = "/report";
    url.search = `?id=${encodeURIComponent(id)}${search ? "&" + search.slice(1) : ""}`;
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

// このミドルウェアを適用するパス
export const config = {
  matcher: ["/report/:path*"],
};

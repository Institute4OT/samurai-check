// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";

// 日本語フォントを全体に適用
const noto = Noto_Sans_JP({
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"], // 指定必須。Noto_Sans_JPはCJK同梱なのでこれでOK
  display: "swap",
  preload: true,
  variable: "--font-sans", // Tailwindと連携するためのCSS変数
});

export const metadata: Metadata = {
  title: "AI時代の経営者 武将タイプ診断",
  description:
    "AI時代の“経営戦国”を生き抜くタイプ診断。6カテゴリのバランスも可視化。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={noto.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const to = searchParams.get("to") || process.env.MAIL_TO_TEST!;

    const html = `
      <p>テスト送信です。（Xserver経由）</p>
      <hr />
      <p>PDF(ダミー)：<a href="https://example.com/pdf">https://example.com/pdf</a></p>
      <br/>
      □■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□<br/>
      一般社団法人企業の未来づくり研究所（Institute for Our Transformation）<br/>
      <a href="https://ourdx-mtg.com/">https://ourdx-mtg.com/</a><br/>
      お問合せ先：info@ourdx-mtg.com<br/>
      〒150-0001東京都渋谷区神宮前6-29-4 原宿小宮ビル6F
    `;

    const info = await sendMail({
      to,
      subject: "【テスト】Xserver経由メール送信",
      html,
      text: "テスト送信です。（Xserver経由）",
    });

    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (err: any) {
    console.error("MAIL_ERROR:", err);
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}

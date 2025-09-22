// app/api/report-mail/route.ts
/* eslint-disable no-console */
import { NextRequest, NextResponse } from "next/server";
import { buildReportEmail } from "@/lib/emailTemplates"; // V2 を re-export している想定
import { sendMail } from "@/lib/mail";

export const runtime = "nodejs";

function extractRidFromUrl(u: string | undefined | null): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    // /report/<uuid> 形式
    const m = url.pathname.match(/\/report\/([0-9a-fA-F-]{36})/);
    if (m) return m[1];
    // ?rid=<uuid> 形式
    const q = url.searchParams.get("rid");
    if (q && /^[0-9a-fA-F-]{36}$/.test(q)) return q;
  } catch { /* noop */ }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) ?? {};

    // to の候補（必須）
    const to: string =
      data.email ||
      data.toEmail ||
      data.recipient ||
      "";

    if (!to) {
      return NextResponse.json(
        { ok: false, error: "missing_to" },
        { status: 400 }
      );
    }

    const appBase =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || "";

    // rid と reportUrl を安全に構築
    const rid: string =
      data.rid ||
      extractRidFromUrl(data.reportLink) ||
      "";

    const reportUrl =
      rid
        ? `${appBase}/report/${rid}`
        : (() => {
            // rid が取れない時は受信リンクをそのまま使うが、
            // /report でなければ最悪 /result に落とさないように /report に寄せる
            const raw = String(data.reportLink || "");
            const fallbackRid = extractRidFromUrl(raw);
            return fallbackRid
              ? `${appBase}/report/${fallbackRid}`
              : raw || `${appBase}/report/unknown`;
          })();

    // 宛名ゆれ吸収
    const toName: string | undefined =
      data.toName || data.name || data.userName || data.recipientName || undefined;

    // 会社規模ゆれ吸収
    const companySize: string | undefined =
      data.companySize || data.company_size || undefined;

    // V2 テンプレへ（文言・分岐はテンプレそのまま）
    const mail = buildReportEmail({
      rid: rid || undefined,
      toName,
      companySize,
      typeName: data.typeName || undefined,
    });

    await sendMail({
      to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    return NextResponse.json({
      ok: true,
      to,
      reportUrl,
    });
  } catch (err: unknown) {
    const msg = (err instanceof Error) ? err.message : String(err);
    console.error("[api/report-mail] error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

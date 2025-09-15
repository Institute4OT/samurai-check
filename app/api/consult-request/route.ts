// app/api/consult-request/route.ts
// 相談受付 → ユーザー通知／社内通知／ご案内メール送信

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendMail } from "@/lib/mail";
import {
  renderConsultIntakeMailToUser,
  renderConsultIntakeMailToOps,
  buildConsultEmail,
} from "@/lib/emailTemplates";

// Next.js app router が許可しているメタ export
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "hnd1"; // 任意（Tokyo）

// UTM を付与（rid は utm_id として付与）
function addUtm(url: string, content: string, rid?: string) {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", "email");
    u.searchParams.set("utm_medium", "transactional");
    u.searchParams.set("utm_campaign", "consult_intake");
    u.searchParams.set("utm_content", content);
    if (rid) u.searchParams.set("utm_id", rid);
    return u.toString();
  } catch {
    return url;
  }
}

export async function POST(req: NextRequest) {
  try {
    // 入力の取得＆バリデーション
    const raw = await req.json().catch(() => null);
    if (!raw) {
      return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
    }

    const Schema = z.object({
      email: z.string().email(),
      name: z.string().trim().optional(),
      company: z.string().trim().optional(),
      note: z.string().optional(),
      rid: z.string().optional(),
      dry: z.boolean().optional(),
    });

    const parsed = Schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const { email, name, company, note, rid, dry } = parsed.data;

    // 予約導線（なければ /consult をフォールバック）
    const base =
      (process.env.NEXT_PUBLIC_BOOKING_URL || "").trim() ||
      `${(process.env.NEXT_PUBLIC_APP_URL || "").trim()}/consult`;

    const consultLink = base
      ? addUtm(
          rid ? `${base}${base.includes("?") ? "&" : "?"}rid=${encodeURIComponent(rid)}` : base,
          "cta_consult",
          rid
        )
      : "";

    // テンプレに渡す引数（型は libs の変更に左右されないよう any で吸収）
    const args = {
      toEmail: email,
      toName: name ?? "",
      company,
      note,
      rid,
      consultLink,
    };

    // 受付メール（ユーザー／運営）
    const userMail = renderConsultIntakeMailToUser(args as any) as any;
    const opsMail = renderConsultIntakeMailToOps(args as any) as any;

    // ご案内メール（buildConsultEmail は { user, ops } を返す）
    const guide = buildConsultEmail(args as any) as any;
    const guideUser = (guide?.user ?? {}) as { subject?: string; html?: string; text?: string };

    // dry-run でなければ送信
    if (!dry) {
      await Promise.all([
        // ユーザー：受付通知
        sendMail({
          to: email,
          subject: userMail.subject,
          html: userMail.html,
          text: userMail.text,
          replyTo: process.env.MAIL_REPLY_TO || undefined,
          tagId: `consult:intake_user${rid ? `:${rid}` : ""}`,
        }),
        // 運営：受付通知
        sendMail({
          to: process.env.MAIL_TO_OPS || process.env.MAIL_TO_TEST || email,
          subject: opsMail.subject,
          html: opsMail.html,
          text: opsMail.text,
          tagId: `consult:intake_ops${rid ? `:${rid}` : ""}`,
        }),
        // ユーザー：ご案内（予約導線付き）
        sendMail({
          to: email,
          subject: guideUser.subject || userMail.subject,
          html: guideUser.html || userMail.html,
          text: guideUser.text || userMail.text,
          replyTo: process.env.MAIL_REPLY_TO || undefined,
          tagId: `consult:guide${rid ? `:${rid}` : ""}`,
        }),
      ]);
    }

    return NextResponse.json({ ok: true, dry: !!dry });
  } catch (e: any) {
    console.error("[api/consult-request] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 400 }
    );
  }
}

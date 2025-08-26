// app/api/report-request/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendMail } from '@/lib/mail';
import {
  renderReportRequestMailToUser,
  renderReportRequestMailToOps,
} from '@/lib/emailTemplates';

// Edge では nodemailer が使えないため Node.js を明示
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const preferredRegion = ['hnd1']; // Tokyo(羽田)で実行

const COMPANY_SIZE_VALUES = [
  '1-10',
  '11-50',
  '51-100',
  '101-300',
  '301-500',
  '501-1000',
  '1001+',
] as const;

const INDUSTRY_VALUES = [
  '製造',
  'IT・ソフトウェア',
  '医療・福祉',
  '金融',
  '物流・運輸',
  '建設',
  '小売・卸',
  '飲食・宿泊',
  '教育・研究',
  '不動産',
  'メディア・広告',
  'エネルギー',
  '農林水産',
  '公共・行政',
  'サービス',
  'その他',
] as const;

// UUID または id_ で始まるフォールバックを許容
const ResultIdSchema = z
  .string()
  .regex(
    /^(:?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|id_[a-z0-9_-]+)$/i
  )
  .optional();

const Payload = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  companyName: z.string().optional(),
  companySize: z.enum(COMPANY_SIZE_VALUES),
  industry: z.enum(INDUSTRY_VALUES),
  agree: z.boolean().refine((v) => v === true),
  resultId: ResultIdSchema,
  // 将来の担当出し分け用（未指定ならテンプレ側で /consult にフォールバック）
  consultant: z.enum(['ishijima', 'morigami']).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = Payload.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'invalid_payload' },
        { status: 400 }
      );
    }
    const p = parsed.data;

    // ---- 申込者へ（会社規模で文面が分岐：lib/emailTemplates.ts）
    const userMail = renderReportRequestMailToUser({
      name: p.name,
      resultId: p.resultId,
      companySize: p.companySize,
      consultant: p.consultant,
    });
    await sendMail({
      to: p.email,
      subject: userMail.subject,
      html: userMail.html,
      text: userMail.text,
    });

    // ---- 運用通知へ
    const opsMail = renderReportRequestMailToOps({
      email: p.email,
      name: p.name,
      companyName: p.companyName,
      companySize: p.companySize,
      industry: p.industry,
      resultId: p.resultId,
    });
    await sendMail({
      to: (process.env.MAIL_TO_OPS || 'info@ourdx-mtg.com').trim(),
      subject: opsMail.subject,
      html: opsMail.html,
      text: opsMail.text,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[api/report-request] failed:', e);
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}

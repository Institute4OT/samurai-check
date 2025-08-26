// app/report/[resultId]/page.tsx
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ReportByPath({
  params,
}: {
  params: { resultId: string };
}) {
  const id = Array.isArray(params.resultId) ? params.resultId[0] : params.resultId;
  redirect(`/report?resultId=${encodeURIComponent(id)}`);
}

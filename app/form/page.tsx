// app/form/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

// ------------------------
// 定数
// ------------------------
const COMPANY_SIZE_VALUES = [
  '1-10','11-50','51-100','101-300','301-500','501-1000','1001+',
] as const;

const COMPANY_SIZES = [
  { value: '1-10', label: '1～10名' },
  { value: '11-50', label: '11～50名' },
  { value: '51-100', label: '51～100名' },
  { value: '101-300', label: '101～300名' },
  { value: '301-500', label: '301～500名' },
  { value: '501-1000', label: '501～1000名' },
  { value: '1001+', label: '1001名以上' },
] as const;

const INDUSTRY_VALUES = [
  '製造','IT・ソフトウェア','医療・福祉','金融','物流・運輸',
  '建設','小売・卸','飲食・宿泊','教育・研究','不動産',
  'メディア・広告','エネルギー','農林水産','公共・行政',
  'サービス','その他',
] as const;

// ------------------------
// スキーマ
// ------------------------
// UUID もしくは id_ で始まるフォールバックIDを許容
const ResultIdSchema = z
  .string()
  .regex(
    /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|id_[a-z0-9_-]+)$/i
  )
  .optional();

const Schema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください。'),
  name: z.string().min(1, 'お名前は必須です。'),
  companyName: z.string().optional(),
  companySize: z.enum(COMPANY_SIZE_VALUES, { required_error: '会社規模を選択してください。' }),
  industry: z.enum(INDUSTRY_VALUES, { required_error: '業種を選択してください。' }),
  agree: z.boolean().refine(v => v === true, { message: '個人情報の取扱いに同意してください。' }),
  resultId: ResultIdSchema,
});

type FormValues = z.infer<typeof Schema>;

// ------------------------
// ページ
// ------------------------
export default function Page() {
  const sp = useSearchParams();
  const initialResultId = useMemo(() => sp.get('resultId') ?? undefined, [sp]);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      email: '',
      name: '',
      companyName: '',
      companySize: undefined,
      industry: undefined,
      agree: false,
      resultId: initialResultId,
    },
    mode: 'onTouched',
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/report-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.text()) || '送信に失敗しました。');

      alert('送信が完了しました。詳細レポートをご案内します。');
      form.reset({ ...form.getValues(), agree: false });
    } catch (e: any) {
      alert(e?.message ?? '送信時にエラーが発生しました。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">詳細レポートお申込みフォーム</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {initialResultId && <input type="hidden" value={initialResultId} {...form.register('resultId')} />}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>メールアドレス <span className="text-red-500">＊必須</span></FormLabel>
                <FormControl><Input inputMode="email" placeholder="you@example.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>お名前 <span className="text-red-500">＊必須</span></FormLabel>
                <FormControl><Input placeholder="山田 太郎" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>会社名（任意）</FormLabel>
                <FormControl><Input placeholder="株式会社〇〇" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 会社規模（必須） */}
          <FormField
            control={form.control}
            name="companySize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>会社規模 <span className="text-red-500">＊必須</span></FormLabel>
                <FormControl>
                  <Select defaultValue={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map(cs => (
                        <SelectItem key={cs.value} value={cs.value}>{cs.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 業種（必須） */}
          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>業種 <span className="text-red-500">＊必須</span></FormLabel>
                <FormControl>
                  <Select defaultValue={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_VALUES.map(ind => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 同意チェック（必須） */}
          <FormField
            control={form.control}
            name="agree"
            render={({ field }) => (
              <FormItem className="flex items-start gap-3">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />
                </FormControl>
                <div>
                  <FormLabel className="font-normal">
                    個人情報の取扱いに同意します <span className="text-red-500">＊必須</span>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <div className="pt-2">
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? '送信中…' : '詳細レポートを申し込む'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

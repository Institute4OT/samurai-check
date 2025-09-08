// app/api/results/finalize/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Cat = { key: string; score: number };

function isIdish(v?: string | null) {
  if (!v) return false;
  const s = String(v).trim();
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) || // uuid
    /^[0-9A-HJKMNP-TV-Z]{26}$/.test(s) ||                                      // ulid
    /^[A-Za-z0-9_-]{16,}$/.test(s)                                            // generic id
  );
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    // 受け取り（camel/snake 両対応で吸収）
    const rid            = String(body.rid ?? '').trim();
    const samuraiTypeKey = body.samuraiTypeKey ?? null;
    const samuraiTypeJa  = body.samuraiTypeJa ?? null;
    const categories     = Array.isArray(body.categories) ? (body.categories as Cat[]) : [];
    const score_pattern  = body.score_pattern ?? body.scorePattern ?? null;

    if (!isIdish(rid)) {
      return NextResponse.json({ ok: false, error: 'invalid rid' }, { status: 400 });
    }

    // categories_json へ整形（DB 側が jsonb の想定）
    const categories_json =
      categories
        .filter(c => c && typeof c.key === 'string')
        .map(c => ({ key: String(c.key), score: Number(c.score) })) || [];

    const sb = admin();

    // 1) 存在確認
    const { data: existing, error: selErr } = await sb
      .from('samurairesults')
      .select('id')
      .eq('id', rid)
      .limit(1);

    if (selErr) {
      return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 });
    }

    const patch: Record<string, any> = {
      samurai_type_key: samuraiTypeKey ?? null,
      samurai_type_ja : samuraiTypeJa  ?? null,
      categories_json,
      score_version   : 'v1',
      updated_at      : new Date().toISOString(),
    };

    // score_pattern は初回もしくは毎回上書き、どちらでもOK。必要なら一度だけにしたい場合はコメントの if を使う
    if (score_pattern != null) {
      patch.score_pattern = score_pattern;
    }

    if (!existing || existing.length === 0) {
      // 2-a) なければ insert
      const insertRow = { id: rid, ...patch };
      const { error: insErr } = await sb.from('samurairesults').insert(insertRow);
      if (insErr) {
        return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, mode: 'inserted' });
    } else {
      // 2-b) あれば update
      const { error: updErr } = await sb
        .from('samurairesults')
        .update(patch)
        .eq('id', rid);
      if (updErr) {
        return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, mode: 'updated' });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

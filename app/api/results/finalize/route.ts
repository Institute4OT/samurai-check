// app/api/results/finalize/route.ts
// 診断完了時にサーバー確定し、DBへスナップショットを書き込み（冪等・堅牢化）

export const runtime = 'nodejs';

import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeCats } from '@/lib/scoreSnapshot';

/* ========= env & supabase ========= */
function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
const supabase = createClient(
  mustEnv('NEXT_PUBLIC_SUPABASE_URL'),
  mustEnv('SUPABASE_SERVICE_ROLE_KEY')
);

/* ========= helpers ========= */
function isIdish(v?: string | null): boolean {
  if (!v) return false;
  const s = v.trim();
  const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const ulid = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  const generic = /^[A-Za-z0-9_-]{16,}$/; // NanoID等
  return uuid.test(s) || ulid.test(s) || generic.test(s);
}

async function readBody(req: NextRequest): Promise<Record<string, any> | null> {
  const ct = (req.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('application/json')) {
    return (await req.json().catch(() => null)) as any;
  }
  if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
    const fd = await req.formData().catch(() => null);
    if (!fd) return null;
    const obj: Record<string, any> = {};
    fd.forEach((v, k) => (obj[k] = typeof v === 'string' ? v : String(v)));
    return obj;
  }
  // 不明でも一旦JSONで試す
  return (await req.json().catch(() => null)) as any;
}

function pickRidFromQuery(req: NextRequest): string | null {
  const u = req.nextUrl;
  const q = u.searchParams.get('rid') || u.searchParams.get('resultId') || u.searchParams.get('id');
  return q ? q.trim() : null;
}

function pickRid(req: NextRequest, body?: Record<string, any> | null): string | null {
  const fromBody =
    body?.rid?.toString().trim() ||
    body?.resultId?.toString().trim() ||
    body?.id?.toString().trim() ||
    null;

  const fromQuery = pickRidFromQuery(req);
  if (fromBody) return fromBody;
  if (fromQuery) return fromQuery;

  // パス末尾がIDらしい場合（/api/results/finalize/<id> のような形にも保険）
  const segs = req.nextUrl.pathname.split('/').filter(Boolean);
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = decodeURIComponent(segs[i] || '');
    if (isIdish(s)) return s.trim();
  }
  return null;
}

/* ========= handler ========= */
export async function POST(req: NextRequest) {
  try {
    const body = await readBody(req);
    if (!body) {
      return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
    }

    // 入力ゆれを吸収（rid / resultId / id）
    const rid = pickRid(req, body);
    const samuraiTypeKey =
      (body.samuraiTypeKey ?? body.typeKey ?? '').toString().trim() || null;
    const samuraiTypeJa =
      (body.samuraiTypeJa ?? body.typeJa ?? '').toString().trim() || null;
    const categories = Array.isArray(body.categories) ? body.categories : null;

    if (!rid || !categories || (!samuraiTypeKey && !samuraiTypeJa)) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
    }
    // IDの形式は広く許容（DB実在は後で照合）
    const cats = normalizeCats(categories);

    // 対象行の取得
    const { data: row, error: selErr } = await supabase
      .from('samurairesults')
      .select('id,categories_json,samurai_type_key,samurai_type_ja,score_version')
      .eq('id', rid)
      .maybeSingle();

    if (selErr || !row) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    // 既に確定済みの場合の扱い
    // - categories_json が入っていれば再確定「しない」
    // - ただし、samurai_type_* が未設定で今回入ってくる場合は片付けておく（上書きはしない）
    const update: Record<string, any> = {};
    let willUpdate = false;

    if (!row.categories_json) {
      update.categories_json = cats;
      update.score_version = row.score_version || 'v1';
      willUpdate = true;
    }
    if (!row.samurai_type_key && samuraiTypeKey) {
      update.samurai_type_key = samuraiTypeKey;
      willUpdate = true;
    }
    if (!row.samurai_type_ja && samuraiTypeJa) {
      update.samurai_type_ja = samuraiTypeJa;
      willUpdate = true;
    }
    if (willUpdate) {
      update.updated_at = new Date().toISOString();

      // 競合防止：初回確定のみ許可（categories_json を書く場合は IS NULL を付ける）
      let q = supabase.from('samurairesults').update(update).eq('id', rid);
      if ('categories_json' in update) {
        q = q.is('categories_json', null);
      }

      // ← ここを修正：UPDATE後の select は「列名のみ」
      const { error: upErr, data } = await q.select('id');
      if (upErr) {
        return NextResponse.json({ ok: false, error: 'update_failed' }, { status: 500 });
      }
      // data が空 = 並行更新などで書けなかった
      return NextResponse.json({ ok: true, updated: Array.isArray(data) && data.length > 0 });
    }

    // 何も更新しなかった（すでに確定済み）
    return NextResponse.json({ ok: true, updated: false });
  } catch (e) {
    console.error('[api/results/finalize] error:', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

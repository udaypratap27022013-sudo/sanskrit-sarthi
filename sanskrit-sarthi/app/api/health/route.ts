import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const configured = Boolean(process.env.OPENAI_API_KEY && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!configured) return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  const { error } = await supabase.from('textbooks').select('id', { head: true, count: 'exact' });
  return NextResponse.json({ ok: !error, configured: true, database: !error });
}

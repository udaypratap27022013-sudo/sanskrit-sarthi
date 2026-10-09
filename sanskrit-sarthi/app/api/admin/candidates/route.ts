import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
function authorized(req: NextRequest) { return req.headers.get('x-admin-secret') === process.env.ADMIN_SECRET && !!process.env.ADMIN_SECRET; }
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase.from('update_candidates').select('*').order('detected_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
export async function PATCH(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, status, notes } = await req.json();
  if (!id || !['pending_review','approved','rejected'].includes(status)) return NextResponse.json({ error: 'Invalid update' }, { status: 400 });
  const { data, error } = await supabase.from('update_candidates').update({ status, notes }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

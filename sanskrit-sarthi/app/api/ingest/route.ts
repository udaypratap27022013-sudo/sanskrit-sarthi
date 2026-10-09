import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

const SOURCES = [
  { title: 'NCERT Sanskrit textbook catalogue', publisher: 'NCERT', url: 'https://ncert.nic.in/ebooks.php' },
];

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const added = [];
  for (const source of SOURCES) {
    const hash = crypto.createHash('sha256').update(source.url).digest('hex');
    const { data: existing } = await supabase.from('update_candidates').select('id').eq('source_url', source.url).eq('status', 'pending_review').maybeSingle();
    if (!existing) {
      const { data } = await supabase.from('update_candidates').insert({ title: source.title, publisher: source.publisher, source_url: source.url, notes: `Discovered by scheduled source check. Hash ${hash.slice(0, 12)}. Review the official publication before importing content.` }).select().single();
      if (data) added.push(data);
    }
  }
  return NextResponse.json({ ok: true, checked: SOURCES.length, candidatesAdded: added.length, candidates: added });
}

import fs from 'node:fs';
import path from 'node:path';
import { openai, embedText } from '../lib/openai';
import { supabase } from '../lib/supabase';

// Usage after installing dependencies:
// npx tsx scripts/ingest-local.ts ./approved-content.json
// JSON shape: [{bookTitle,publisher,board,classLevel,edition,officialUrl,licenseNotes,chapter,page,content}]
async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Pass an approved-content.json file.');
  const rows = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')) as any[];
  for (const row of rows) {
    let { data: book } = await supabase.from('textbooks').select('*').eq('title', row.bookTitle).eq('publisher', row.publisher).maybeSingle();
    if (!book) { const result = await supabase.from('textbooks').insert({
      title: row.bookTitle, publisher: row.publisher, board: row.board, class_level: row.classLevel,
      edition: row.edition, official_url: row.officialUrl, source_url: row.officialUrl,
      license_notes: row.licenseNotes, status: 'published'
    }).select().single(); book = result.data; if (result.error) throw result.error; }
    if (bookError) throw bookError;
    const embedding = await embedText(row.content);
    const { error } = await supabase.from('textbook_chunks').insert({
      textbook_id: book.id, book_title: row.bookTitle, chapter: row.chapter, page: row.page, content: row.content, embedding
    });
    if (error) throw error;
    console.log(`Imported ${row.bookTitle} / ${row.chapter} / p.${row.page}`);
  }
}
main().catch(err => { console.error(err); process.exit(1); });

import { NextRequest, NextResponse } from 'next/server';
import { openai, embedText } from '@/lib/openai';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

const collections = new Set(['new-ncert', 'old-ncert', 'state', 'classical', 'other']);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = String(body.question ?? '').trim();
    const language = body.language === 'en' ? 'en' : 'hi';
    const level = String(body.level ?? 'school');
    const book = collections.has(body.book) ? body.book : '';

    if (!question) return NextResponse.json({ error: 'Please enter a Sanskrit doubt.' }, { status: 400 });
    if (!process.env.OPENAI_API_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server setup is incomplete. Add the OpenAI and Supabase environment variables.' }, { status: 503 });
    }

    const embedding = await embedText(question);
    const { data: chunks, error: retrievalError } = await supabase.rpc('match_textbook_chunks', {
      query_embedding: embedding,
      filter_collection: book || null,
      match_threshold: 0.30,
      match_count: 8,
    });
    if (retrievalError) throw retrievalError;

    const context = (chunks ?? []).map((c: any, i: number) =>
      `[SOURCE ${i + 1}] ${c.book_title} | ${c.chapter ?? 'Chapter not recorded'} | page ${c.page ?? 'n/a'}\n${c.content}`
    ).join('\n\n');

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.6',
      input: [
        {
          role: 'system',
          content: `You are Sanskrit Sarthi, a Sanskrit-only educational tutor. Answer only questions about Sanskrit language, Sanskrit literature, Sanskrit grammar, Sanskrit translation, shlokas, or Sanskrit textbooks. Explain in ${language === 'hi' ? 'Hindi' : 'English'}. The learner is at ${level} level.\n\nUse VERIFIED TEXTBOOK CONTEXT when it is relevant. Never invent a textbook citation, page, quotation, or publication detail. If the context does not answer the book-specific part, clearly say so and give a general Sanskrit explanation. Keep explanations age-appropriate, accurate, and useful for study.`,
        },
        {
          role: 'user',
          content: `Question: ${question}\nBook collection: ${book || 'all approved books'}\n\nVERIFIED TEXTBOOK CONTEXT:\n${context || 'No matching published textbook chunk was found.'}`,
        },
      ],
    });

    const explanation = response.output_text?.trim() || 'I could not generate an explanation. Please try again.';
    const sourceIds = (chunks ?? []).map((c: any) => c.id).filter(Boolean);
    const { data: saved, error: saveError } = await supabase.from('questions').insert({
      question, language, level, book_filter: book || null, answer: explanation, source_ids: sourceIds,
    }).select('id').single();
    if (saveError) console.error('question save failed', saveError);

    return NextResponse.json({
      id: saved?.id,
      title: 'संस्कृत साथी — Sanskrit explanation',
      explanation,
      sources: (chunks ?? []).map((c: any) => ({
        book: c.book_title, page: c.page, chapter: c.chapter,
        url: c.official_url, similarity: c.similarity, locator: c.source_locator,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'The Sanskrit tutor is temporarily unavailable. Check the server logs and configuration.' }, { status: 500 });
  }
}

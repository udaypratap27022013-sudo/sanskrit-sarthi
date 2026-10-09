import OpenAI from 'openai';

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const EMBEDDING_MODEL = 'text-embedding-3-small';

export async function embedText(text: string) {
  const result = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: text });
  return result.data[0].embedding;
}

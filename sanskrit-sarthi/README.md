# Sanskrit Sarthi — production-ready starter

A Sanskrit-only AI doubt-solving platform with:

- AI explanations in Hindi or English
- verified textbook RAG using OpenAI embeddings + Supabase pgvector
- old/new Sanskrit textbook collections
- approval-first publication update queue
- saved questions, answers, and source IDs
- approved learning resources
- admin review dashboard
- Vercel scheduled update checking

## Architecture

`Student question → embedding → published textbook chunks → AI explanation → cited source metadata → saved Q&A`

Supabase pgvector stores 1536-dimensional embeddings from `text-embedding-3-small` and uses a cosine HNSW index. The SQL RPC filters to `published` textbooks only.

## 1. Environment

Copy `.env.example` to `.env.local`:

```env
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-5.6
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=a-long-random-secret
ADMIN_SECRET=a-different-long-random-secret
```

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, or `ADMIN_SECRET` in browser code.

## 2. Database

Create a Supabase project, enable the `vector` extension, then run `supabase/schema.sql` in the SQL editor.

The schema creates:

- `textbooks`
- `textbook_chunks`
- `questions`
- `learning_resources`
- `update_candidates`
- `match_textbook_chunks(...)`
- HNSW vector indexing

## 3. Install and run

```bash
npm install
npm run dev
```

Production:

```bash
npm run build
npm start
```

Health check: `/api/health`

## 4. Add approved textbooks

Only ingest material you are legally allowed to use. For public/official NCERT material, record the official publication URL and license/usage notes in `textbooks`.

For each approved book, split permitted text into chunks and generate embeddings with:

```ts
import { embedText } from './lib/openai';
const embedding = await embedText(chunkText);
```

Insert each chunk into `textbook_chunks` with the same 1536-dimensional embedding.

Set the book to `status = 'published'` only after verification.

The included `scripts/ingest-local.ts` is the place to add a PDF/text importer for material you have permission to ingest.

## 5. Book update system

Vercel runs `/api/ingest` weekly using `vercel.json`. The checker currently tracks the official NCERT catalogue as a discovery source and places candidates in `update_candidates`.

The workflow is intentionally:

`Detected → Admin review → Approved → Licensed content imported → Embedded → Published`

Do not make an external crawler silently publish new textbook content.

## 6. Admin

Open `/admin` and provide `ADMIN_SECRET` to review detected publication candidates.

## 7. Deploy

Recommended deployment:

1. Put this project in a Git repository.
2. Import the repository into Vercel.
3. Add all `.env.local` values as Vercel environment variables.
4. Deploy.
5. Run the Supabase SQL once.
6. Test `/api/health`.
7. Add your first approved textbook and embedded chunks.
8. Ask a Sanskrit question and verify that the answer displays the retrieved sources.

## Important

This repository contains the application/backend code, not a bundled commercial textbook corpus. A real textbook database must be populated with sources you are permitted to ingest.

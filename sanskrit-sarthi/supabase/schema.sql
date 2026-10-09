create extension if not exists vector with schema extensions;

create table if not exists textbooks (
  id bigint generated always as identity primary key,
  title text not null,
  publisher text,
  board text,
  collection text not null default 'other',
  class_level text,
  edition text,
  language text default 'Sanskrit',
  official_url text,
  source_url text,
  license_notes text,
  status text not null default 'pending_review' check (status in ('pending_review','published','archived')),
  content_hash text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists textbook_chunks (
  id bigint generated always as identity primary key,
  textbook_id bigint not null references textbooks(id) on delete cascade,
  book_title text not null,
  chapter text,
  page integer,
  content text not null,
  embedding extensions.vector(1536),
  source_locator text,
  created_at timestamptz default now()
);

create table if not exists questions (
  id bigint generated always as identity primary key,
  question text not null,
  language text not null default 'en' check (language in ('en','hi')),
  level text not null default 'school',
  book_filter text,
  answer text,
  source_ids bigint[] default '{}',
  created_at timestamptz default now()
);

create table if not exists learning_resources (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  url text not null,
  resource_type text not null default 'article',
  language text default 'en',
  level text default 'school',
  approved boolean default false,
  created_at timestamptz default now()
);

create table if not exists update_candidates (
  id bigint generated always as identity primary key,
  title text not null,
  publisher text,
  source_url text not null,
  detected_at timestamptz default now(),
  status text not null default 'pending_review' check (status in ('pending_review','approved','rejected')),
  notes text,
  textbook_id bigint references textbooks(id) on delete set null
);

create index if not exists textbook_chunks_embedding_hnsw
on textbook_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists textbook_chunks_book_idx on textbook_chunks(textbook_id);
create index if not exists textbooks_collection_idx on textbooks(collection);
create index if not exists textbooks_status_idx on textbooks(status);
create index if not exists questions_created_idx on questions(created_at desc);
create index if not exists candidates_status_idx on update_candidates(status);

alter table textbooks add column if not exists collection text not null default 'other';
alter table textbook_chunks add column if not exists source_locator text;
alter table questions add column if not exists source_ids bigint[] default '{}';

create or replace function match_textbook_chunks(
  query_embedding extensions.vector(1536),
  filter_collection text default null,
  match_threshold float default 0.30,
  match_count int default 8
)
returns table(
  id bigint, book_title text, chapter text, page integer, content text,
  similarity float, official_url text, source_locator text
)
language sql stable
as $$
  select tc.id, tc.book_title, tc.chapter, tc.page, tc.content,
    1 - (tc.embedding <=> query_embedding) as similarity,
    t.official_url, tc.source_locator
  from textbook_chunks tc
  join textbooks t on t.id = tc.textbook_id
  where t.status = 'published'
    and tc.embedding is not null
    and (filter_collection is null or filter_collection = '' or t.collection = filter_collection)
    and 1 - (tc.embedding <=> query_embedding) >= match_threshold
  order by tc.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists textbooks_touch_updated_at on textbooks;
create trigger textbooks_touch_updated_at before update on textbooks
for each row execute function touch_updated_at();

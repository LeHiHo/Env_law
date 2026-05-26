create table laws (
  id text primary key,
  mst text,
  title text not null,
  official_title text,
  ministry text,
  category text,
  status text not null,
  promulgation_date date,
  effective_date date,
  source_link text not null,
  raw_search_payload jsonb,
  raw_detail_payload jsonb,
  raw_detail_xml text,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table laws enable row level security;

create index laws_mst_idx on laws (mst);
create index laws_status_idx on laws (status);
create index laws_effective_date_idx on laws (effective_date desc);

create table law_articles (
  id bigserial primary key,
  law_id text not null references laws(id) on delete cascade,
  article_key text not null,
  article_number text,
  title text,
  body text not null,
  changed boolean not null default false,
  notes text,
  sort_order integer not null,
  clauses jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (law_id, article_key)
);

alter table law_articles enable row level security;

create index law_articles_law_id_sort_order_idx on law_articles (law_id, sort_order);

create table supplementary_provisions (
  id bigserial primary key,
  law_id text not null references laws(id) on delete cascade,
  provision_key text not null,
  title text,
  promulgation_date date,
  promulgation_number text,
  paragraphs jsonb not null default '[]'::jsonb,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (law_id, provision_key)
);

alter table supplementary_provisions enable row level security;

create index supplementary_provisions_law_id_sort_order_idx
  on supplementary_provisions (law_id, sort_order);

create table topics (
  slug text primary key,
  title text not null,
  description text,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table topics enable row level security;

create table law_topics (
  law_id text not null references laws(id) on delete cascade,
  topic_slug text not null references topics(slug) on delete cascade,
  source text not null default 'keyword',
  created_at timestamptz not null default now(),
  primary key (law_id, topic_slug)
);

alter table law_topics enable row level security;

create index law_topics_topic_slug_idx on law_topics (topic_slug);

create table law_annotations (
  law_id text primary key references laws(id) on delete cascade,
  plain_summary text,
  practical_notes jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table law_annotations enable row level security;

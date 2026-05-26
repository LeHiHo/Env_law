import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { JsonValue, LawStatus } from "./types";
import type { ArticleRow, LawRow, ProvisionRow, RepositorySearchFilters, SupabaseLawDatabase } from "./repository";

type Database = {
  public: {
    Tables: {
      laws: { Row: LawDbRow; Insert: LawDbInsert; Update: LawDbUpdate; Relationships: [] };
      law_articles: { Row: ArticleDbRow; Insert: ArticleDbInsert; Update: ArticleDbUpdate; Relationships: [] };
      supplementary_provisions: { Row: ProvisionDbRow; Insert: ProvisionDbInsert; Update: ProvisionDbUpdate; Relationships: [] };
      law_topics: { Row: LawTopicDbRow; Insert: LawTopicDbInsert; Update: LawTopicDbUpdate; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type TypedSupabaseClient = SupabaseClient<Database>;

type LawDbRow = LawDbInsert & { created_at: string; updated_at: string; fetched_at: string };
type LawDbInsert = {
  id: string;
  mst?: string | null;
  title: string;
  official_title?: string | null;
  ministry?: string | null;
  category?: string | null;
  status: LawStatus;
  promulgation_date?: string | null;
  effective_date?: string | null;
  source_link: string;
  raw_search_payload?: JsonValue | null;
  raw_detail_payload?: JsonValue | null;
};
type LawDbUpdate = Partial<LawDbInsert>;

type ArticleDbRow = ArticleDbInsert & { id: number; created_at: string; updated_at: string };
type ArticleDbInsert = {
  law_id: string;
  article_key: string;
  article_number?: string | null;
  title?: string | null;
  body: string;
  changed: boolean;
  notes?: string | null;
  sort_order: number;
  clauses: JsonValue;
};
type ArticleDbUpdate = Partial<ArticleDbInsert>;

type ProvisionDbRow = ProvisionDbInsert & { id: number; created_at: string; updated_at: string };
type ProvisionDbInsert = {
  law_id: string;
  provision_key: string;
  title?: string | null;
  promulgation_date?: string | null;
  promulgation_number?: string | null;
  paragraphs: JsonValue;
  sort_order: number;
};
type ProvisionDbUpdate = Partial<ProvisionDbInsert>;

type LawTopicDbRow = LawTopicDbInsert & { created_at: string };
type LawTopicDbInsert = { law_id: string; topic_slug: string; source?: string };
type LawTopicDbUpdate = Partial<LawTopicDbInsert>;

export function createSupabaseLawDatabaseFromEnv(): SupabaseLawDatabase | undefined {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  return url && secretKey ? createSupabaseLawDatabase(url, secretKey) : undefined;
}

export function createSupabaseLawDatabase(url: string, secretKey: string): SupabaseLawDatabase {
  const client = createClient<Database>(url, secretKey, { auth: { persistSession: false } });
  return createSupabaseLawDatabaseFromClient(client);
}

export function createSupabaseLawDatabaseFromClient(client: TypedSupabaseClient): SupabaseLawDatabase {
  return {
    upsertLaws: (rows) => upsertLaws(client, rows),
    replaceLawTopics: (lawId, topicSlugs) => replaceLawTopics(client, lawId, topicSlugs),
    replaceArticles: (lawId, rows) => replaceArticles(client, lawId, rows),
    replaceSupplementaryProvisions: (lawId, rows) => replaceProvisions(client, lawId, rows),
    listLaws: (filters) => listLaws(client, filters),
    getLaw: (id) => getLaw(client, id),
    getLawByMst: (mst) => getLawByMst(client, mst),
    listArticles: (lawId) => listArticles(client, lawId),
    listSupplementaryProvisions: (lawId) => listProvisions(client, lawId),
  };
}

async function upsertLaws(client: TypedSupabaseClient, rows: LawRow[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const { error } = await client.from("laws").upsert(rows.map(toLawDbInsert), { onConflict: "id" });
  throwIfError(error);
}

async function replaceLawTopics(client: TypedSupabaseClient, lawId: string, topicSlugs: string[]): Promise<void> {
  await deleteByLawId(client, "law_topics", lawId);

  if (topicSlugs.length === 0) {
    return;
  }

  const rows = topicSlugs.map((slug) => ({ law_id: lawId, topic_slug: slug, source: "keyword" }));
  const { error } = await client.from("law_topics").insert(rows);
  throwIfError(error);
}

async function replaceArticles(client: TypedSupabaseClient, lawId: string, rows: ArticleRow[]): Promise<void> {
  await deleteByLawId(client, "law_articles", lawId);

  if (rows.length === 0) {
    return;
  }

  const { error } = await client.from("law_articles").insert(rows.map(toArticleDbInsert));
  throwIfError(error);
}

async function replaceProvisions(client: TypedSupabaseClient, lawId: string, rows: ProvisionRow[]): Promise<void> {
  await deleteByLawId(client, "supplementary_provisions", lawId);

  if (rows.length === 0) {
    return;
  }

  const { error } = await client.from("supplementary_provisions").insert(rows.map(toProvisionDbInsert));
  throwIfError(error);
}

async function listLaws(client: TypedSupabaseClient, filters: RepositorySearchFilters): Promise<LawRow[]> {
  let query = client.from("laws").select("*");

  if (filters.status && filters.status !== "전체") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query.order(filters.sort === "effectiveDate" ? "effective_date" : "title");
  throwIfError(error);
  return filterLawRows(await hydrateTopicSlugs(client, (data ?? []).map(fromLawDbRow)), filters);
}

async function getLaw(client: TypedSupabaseClient, id: string): Promise<LawRow | undefined> {
  const { data, error } = await client.from("laws").select("*").eq("id", id).maybeSingle();
  throwIfError(error);
  return data ? (await hydrateTopicSlugs(client, [fromLawDbRow(data)]))[0] : undefined;
}

async function getLawByMst(client: TypedSupabaseClient, mst: string): Promise<LawRow | undefined> {
  const { data, error } = await client.from("laws").select("*").eq("mst", mst).maybeSingle();
  throwIfError(error);
  return data ? (await hydrateTopicSlugs(client, [fromLawDbRow(data)]))[0] : undefined;
}

async function listArticles(client: TypedSupabaseClient, lawId: string): Promise<ArticleRow[]> {
  const { data, error } = await client.from("law_articles").select("*").eq("law_id", lawId).order("sort_order");
  throwIfError(error);
  return (data ?? []).map(fromArticleDbRow);
}

async function listProvisions(client: TypedSupabaseClient, lawId: string): Promise<ProvisionRow[]> {
  const { data, error } = await client.from("supplementary_provisions").select("*").eq("law_id", lawId).order("sort_order");
  throwIfError(error);
  return (data ?? []).map(fromProvisionDbRow);
}

async function hydrateTopicSlugs(client: TypedSupabaseClient, rows: LawRow[]): Promise<LawRow[]> {
  if (rows.length === 0) {
    return rows;
  }

  const ids = rows.map((row) => row.id);
  const { data, error } = await client.from("law_topics").select("*").in("law_id", ids);
  throwIfError(error);
  const topics = data ?? [];
  return rows.map((row) => ({ ...row, topicSlugs: topics.filter((topic) => topic.law_id === row.id).map((topic) => topic.topic_slug) }));
}

async function deleteByLawId(
  client: TypedSupabaseClient,
  table: "law_topics" | "law_articles" | "supplementary_provisions",
  lawId: string,
): Promise<void> {
  const { error } = await client.from(table).delete().eq("law_id", lawId);
  throwIfError(error);
}

function filterLawRows(rows: LawRow[], filters: RepositorySearchFilters): LawRow[] {
  return rows.filter((row) => {
    const query = filters.query?.trim().toLowerCase();
    const text = `${row.title} ${row.ministry ?? ""}`.toLowerCase();
    const topicOk = !filters.topic || filters.topic === "all" || row.topicSlugs.includes(filters.topic);
    const ministryOk = !filters.ministry || filters.ministry === "전체" || row.ministry === filters.ministry;
    return (!query || text.includes(query)) && topicOk && ministryOk;
  });
}

function toLawDbInsert(row: LawRow): LawDbInsert {
  return {
    id: row.id,
    mst: row.mst ?? null,
    title: row.title,
    official_title: row.officialTitle ?? null,
    ministry: row.ministry ?? null,
    category: row.category ?? null,
    status: row.status,
    promulgation_date: row.promulgationDate ?? null,
    effective_date: row.effectiveDate ?? null,
    source_link: row.sourceLink,
    raw_search_payload: row.rawSearchPayload ?? null,
    raw_detail_payload: row.rawDetailPayload ?? null,
  };
}

function fromLawDbRow(row: LawDbRow): LawRow {
  return {
    id: row.id,
    mst: row.mst ?? undefined,
    title: row.title,
    officialTitle: row.official_title ?? undefined,
    ministry: row.ministry ?? undefined,
    category: row.category ?? undefined,
    status: row.status,
    promulgationDate: row.promulgation_date ?? undefined,
    effectiveDate: row.effective_date ?? undefined,
    sourceLink: row.source_link,
    rawSearchPayload: row.raw_search_payload ?? undefined,
    rawDetailPayload: row.raw_detail_payload ?? undefined,
    topicSlugs: [],
  };
}

function toArticleDbInsert(row: ArticleRow): ArticleDbInsert {
  return {
    law_id: row.lawId,
    article_key: row.articleKey,
    article_number: row.articleNumber ?? null,
    title: row.title ?? null,
    body: row.body,
    changed: row.changed,
    notes: row.notes ?? null,
    sort_order: row.sortOrder,
    clauses: row.clauses,
  };
}

function fromArticleDbRow(row: ArticleDbRow): ArticleRow {
  return {
    lawId: row.law_id,
    articleKey: row.article_key,
    articleNumber: row.article_number ?? undefined,
    title: row.title ?? undefined,
    body: row.body,
    changed: row.changed,
    notes: row.notes ?? undefined,
    sortOrder: row.sort_order,
    clauses: row.clauses,
  };
}

function toProvisionDbInsert(row: ProvisionRow): ProvisionDbInsert {
  return {
    law_id: row.lawId,
    provision_key: row.provisionKey,
    title: row.title ?? null,
    promulgation_date: row.promulgationDate ?? null,
    promulgation_number: row.promulgationNumber ?? null,
    paragraphs: row.paragraphs,
    sort_order: row.sortOrder,
  };
}

function fromProvisionDbRow(row: ProvisionDbRow): ProvisionRow {
  return {
    lawId: row.law_id,
    provisionKey: row.provision_key,
    title: row.title ?? undefined,
    promulgationDate: row.promulgation_date ?? undefined,
    promulgationNumber: row.promulgation_number ?? undefined,
    paragraphs: row.paragraphs,
    sortOrder: row.sort_order,
  };
}

function throwIfError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

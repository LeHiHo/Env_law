import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { JsonValue, LawAnnexType, LawRelationType, LawStatus } from "./types";
import type {
  AnnexChangeFilters,
  AnnexChangeRow,
  AnnexRow,
  ArticleRow,
  LawRelationRow,
  LawRow,
  LawVersionRow,
  ProvisionRow,
  RepositorySearchFilters,
  SupabaseLawDatabase,
  VersionAnnexRow,
  ArticleChangeFilters,
  ArticleChangeRow,
  VersionArticleRow,
  VersionProvisionRow,
} from "./repository";

type Database = {
  public: {
    Tables: {
      laws: { Row: LawDbRow; Insert: LawDbInsert; Update: LawDbUpdate; Relationships: [] };
      law_articles: { Row: ArticleDbRow; Insert: ArticleDbInsert; Update: ArticleDbUpdate; Relationships: [] };
      law_annexes: { Row: AnnexDbRow; Insert: AnnexDbInsert; Update: AnnexDbUpdate; Relationships: [] };
      supplementary_provisions: { Row: ProvisionDbRow; Insert: ProvisionDbInsert; Update: ProvisionDbUpdate; Relationships: [] };
      law_topics: { Row: LawTopicDbRow; Insert: LawTopicDbInsert; Update: LawTopicDbUpdate; Relationships: [] };
      law_relations: { Row: LawRelationDbRow; Insert: LawRelationDbInsert; Update: LawRelationDbUpdate; Relationships: [] };
      law_versions: { Row: LawVersionDbRow; Insert: LawVersionDbInsert; Update: LawVersionDbUpdate; Relationships: [] };
      law_version_articles: { Row: VersionArticleDbRow; Insert: VersionArticleDbInsert; Update: VersionArticleDbUpdate; Relationships: [] };
      law_version_supplementary_provisions: { Row: VersionProvisionDbRow; Insert: VersionProvisionDbInsert; Update: VersionProvisionDbUpdate; Relationships: [] };
      law_version_annexes: { Row: VersionAnnexDbRow; Insert: VersionAnnexDbInsert; Update: VersionAnnexDbUpdate; Relationships: [] };
      law_article_changes: { Row: ArticleChangeDbRow; Insert: ArticleChangeDbInsert; Update: ArticleChangeDbUpdate; Relationships: [] };
      law_annex_changes: { Row: AnnexChangeDbRow; Insert: AnnexChangeDbInsert; Update: AnnexChangeDbUpdate; Relationships: [] };
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

type AnnexDbRow = AnnexDbInsert & { id: number; created_at: string; updated_at: string };
type AnnexDbInsert = {
  law_id: string;
  annex_key: string;
  annex_type: LawAnnexType;
  title: string;
  annex_number?: string | null;
  branch_number?: string | null;
  body?: string | null;
  hwp_url?: string | null;
  pdf_url?: string | null;
  sort_order: number;
  raw_payload?: JsonValue | null;
};
type AnnexDbUpdate = Partial<AnnexDbInsert>;

type LawRelationDbRow = LawRelationDbInsert & { created_at: string; updated_at: string };
type LawRelationDbInsert = {
  parent_law_id: string;
  child_law_id: string;
  relation_type: LawRelationType;
  source: LawRelationRow["source"];
  sort_order: number;
};
type LawRelationDbUpdate = Partial<LawRelationDbInsert>;

type LawVersionDbRow = LawVersionDbInsert & { created_at: string; updated_at: string; fetched_at: string };
type LawVersionDbInsert = {
  mst: string;
  law_id: string;
  title: string;
  official_title?: string | null;
  ministry?: string | null;
  category?: string | null;
  status: LawStatus;
  promulgation_date?: string | null;
  effective_date?: string | null;
  source_link: string;
  raw_detail_payload?: JsonValue | null;
  raw_detail_xml?: string | null;
};
type LawVersionDbUpdate = Partial<LawVersionDbInsert>;

type VersionArticleDbRow = VersionArticleDbInsert & { id: number; created_at: string; updated_at: string };
type VersionArticleDbInsert = Omit<ArticleDbInsert, "law_id"> & { mst: string };
type VersionArticleDbUpdate = Partial<VersionArticleDbInsert>;

type VersionProvisionDbRow = VersionProvisionDbInsert & { id: number; created_at: string; updated_at: string };
type VersionProvisionDbInsert = Omit<ProvisionDbInsert, "law_id"> & { mst: string };
type VersionProvisionDbUpdate = Partial<VersionProvisionDbInsert>;

type VersionAnnexDbRow = VersionAnnexDbInsert & { id: number; created_at: string; updated_at: string };
type VersionAnnexDbInsert = Omit<AnnexDbInsert, "law_id"> & { mst: string };
type VersionAnnexDbUpdate = Partial<VersionAnnexDbInsert>;

type ArticleChangeDbRow = ArticleChangeDbInsert & { id: number; created_at: string; updated_at: string };
type ArticleChangeDbInsert = {
  law_id: string;
  from_mst: string;
  to_mst: string;
  article_match_key: string;
  article_number?: string | null;
  change_type: ArticleChangeRow["changeType"];
  old_title?: string | null;
  new_title?: string | null;
  old_text?: string | null;
  new_text?: string | null;
  old_clauses?: JsonValue | null;
  new_clauses?: JsonValue | null;
  changed_fields: string[];
  sort_order: number;
};
type ArticleChangeDbUpdate = Partial<ArticleChangeDbInsert>;

type AnnexChangeDbRow = AnnexChangeDbInsert & { id: number; created_at: string; updated_at: string };
type AnnexChangeDbInsert = {
  law_id: string;
  from_mst: string;
  to_mst: string;
  annex_match_key: string;
  annex_type: LawAnnexType;
  annex_number?: string | null;
  branch_number?: string | null;
  change_type: AnnexChangeRow["changeType"];
  old_title?: string | null;
  new_title?: string | null;
  old_text?: string | null;
  new_text?: string | null;
  old_hwp_url?: string | null;
  new_hwp_url?: string | null;
  old_pdf_url?: string | null;
  new_pdf_url?: string | null;
  changed_fields: string[];
  sort_order: number;
};
type AnnexChangeDbUpdate = Partial<AnnexChangeDbInsert>;

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
    replaceAnnexes: (lawId, rows) => replaceAnnexes(client, lawId, rows),
    upsertVersion: (row) => upsertVersion(client, row),
    replaceVersionArticles: (mst, rows) => replaceVersionArticles(client, mst, rows),
    replaceVersionSupplementaryProvisions: (mst, rows) => replaceVersionProvisions(client, mst, rows),
    replaceVersionAnnexes: (mst, rows) => replaceVersionAnnexes(client, mst, rows),
    upsertRelations: (rows) => upsertRelations(client, rows),
    listChildRelations: (parentLawId) => listChildRelations(client, parentLawId),
    listParentRelations: (childLawId) => listParentRelations(client, childLawId),
    getVersion: (mst) => getVersion(client, mst),
    listVersions: (lawId) => listVersions(client, lawId),
    upsertArticleChanges: (rows) => upsertArticleChanges(client, rows),
    listArticleChanges: (filters) => listArticleChanges(client, filters),
    upsertAnnexChanges: (rows) => upsertAnnexChanges(client, rows),
    listAnnexChanges: (filters) => listAnnexChanges(client, filters),
    listLaws: (filters) => listLaws(client, filters),
    getLaw: (id) => getLaw(client, id),
    getLawByMst: (mst) => getLawByMst(client, mst),
    listArticles: (lawId) => listArticles(client, lawId),
    listSupplementaryProvisions: (lawId) => listProvisions(client, lawId),
    listAnnexes: (lawId) => listAnnexes(client, lawId),
    listVersionArticles: (mst) => listVersionArticles(client, mst),
    listVersionSupplementaryProvisions: (mst) => listVersionProvisions(client, mst),
    listVersionAnnexes: (mst) => listVersionAnnexes(client, mst),
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

async function replaceAnnexes(client: TypedSupabaseClient, lawId: string, rows: AnnexRow[]): Promise<void> {
  await deleteByLawId(client, "law_annexes", lawId);

  if (rows.length === 0) {
    return;
  }

  const { error } = await client.from("law_annexes").insert(rows.map(toAnnexDbInsert));
  throwIfError(error);
}

async function upsertVersion(client: TypedSupabaseClient, row: LawVersionRow): Promise<void> {
  const { error } = await client.from("law_versions").upsert(toVersionDbInsert(row), { onConflict: "mst" });
  throwIfError(error);
}

async function replaceVersionArticles(client: TypedSupabaseClient, mst: string, rows: VersionArticleRow[]): Promise<void> {
  await deleteByMst(client, "law_version_articles", mst);

  if (rows.length === 0) {
    return;
  }

  const { error } = await client.from("law_version_articles").insert(rows.map(toVersionArticleDbInsert));
  throwIfError(error);
}

async function replaceVersionProvisions(client: TypedSupabaseClient, mst: string, rows: VersionProvisionRow[]): Promise<void> {
  await deleteByMst(client, "law_version_supplementary_provisions", mst);

  if (rows.length === 0) {
    return;
  }

  const { error } = await client.from("law_version_supplementary_provisions").insert(rows.map(toVersionProvisionDbInsert));
  throwIfError(error);
}

async function replaceVersionAnnexes(client: TypedSupabaseClient, mst: string, rows: VersionAnnexRow[]): Promise<void> {
  await deleteByMst(client, "law_version_annexes", mst);

  if (rows.length === 0) {
    return;
  }

  const { error } = await client.from("law_version_annexes").insert(rows.map(toVersionAnnexDbInsert));
  throwIfError(error);
}

async function upsertRelations(client: TypedSupabaseClient, rows: LawRelationRow[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const { error } = await client
    .from("law_relations")
    .upsert(rows.map(toRelationDbInsert), { onConflict: "parent_law_id,child_law_id,relation_type" });
  throwIfError(error);
}

async function upsertArticleChanges(client: TypedSupabaseClient, rows: ArticleChangeRow[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  for (const chunk of chunkRows(rows, 200)) {
    const { error } = await client
      .from("law_article_changes")
      .upsert(chunk.map(toArticleChangeDbInsert), { onConflict: "law_id,from_mst,to_mst,article_match_key" });
    throwIfError(error);
  }
}

async function listArticleChanges(client: TypedSupabaseClient, filters: ArticleChangeFilters): Promise<ArticleChangeRow[]> {
  let query = client.from("law_article_changes").select("*").eq("law_id", filters.lawId);

  if (filters.fromMst) {
    query = query.eq("from_mst", filters.fromMst);
  }

  if (filters.toMst) {
    query = query.eq("to_mst", filters.toMst);
  }

  const { data, error } = await query.order("sort_order");
  throwIfError(error);
  return (data ?? []).map(fromArticleChangeDbRow);
}

async function upsertAnnexChanges(client: TypedSupabaseClient, rows: AnnexChangeRow[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  for (const chunk of chunkRows(rows, 200)) {
    const { error } = await client
      .from("law_annex_changes")
      .upsert(chunk.map(toAnnexChangeDbInsert), { onConflict: "law_id,from_mst,to_mst,annex_match_key" });
    throwIfError(error);
  }
}

async function listAnnexChanges(client: TypedSupabaseClient, filters: AnnexChangeFilters): Promise<AnnexChangeRow[]> {
  let query = client.from("law_annex_changes").select("*").eq("law_id", filters.lawId);

  if (filters.fromMst) {
    query = query.eq("from_mst", filters.fromMst);
  }

  if (filters.toMst) {
    query = query.eq("to_mst", filters.toMst);
  }

  if (filters.type) {
    query = query.eq("annex_type", filters.type);
  }

  const { data, error } = await query.order("sort_order");
  throwIfError(error);
  return (data ?? []).map(fromAnnexChangeDbRow);
}

async function listChildRelations(client: TypedSupabaseClient, parentLawId: string): Promise<LawRelationRow[]> {
  const { data, error } = await client.from("law_relations").select("*").eq("parent_law_id", parentLawId).order("sort_order");
  throwIfError(error);
  return (data ?? []).map(fromRelationDbRow);
}

async function listParentRelations(client: TypedSupabaseClient, childLawId: string): Promise<LawRelationRow[]> {
  const { data, error } = await client.from("law_relations").select("*").eq("child_law_id", childLawId).order("sort_order");
  throwIfError(error);
  return (data ?? []).map(fromRelationDbRow);
}

async function getVersion(client: TypedSupabaseClient, mst: string): Promise<LawVersionRow | undefined> {
  const { data, error } = await client.from("law_versions").select("*").eq("mst", mst).maybeSingle();
  throwIfError(error);
  return data ? fromVersionDbRow(data) : undefined;
}

async function listVersions(client: TypedSupabaseClient, lawId: string): Promise<LawVersionRow[]> {
  const { data, error } = await client.from("law_versions").select("*").eq("law_id", lawId).order("effective_date", { ascending: false });
  throwIfError(error);
  return (data ?? []).map(fromVersionDbRow);
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

async function listAnnexes(client: TypedSupabaseClient, lawId: string): Promise<AnnexRow[]> {
  const { data, error } = await client.from("law_annexes").select("*").eq("law_id", lawId).order("sort_order");
  throwIfError(error);
  return (data ?? []).map(fromAnnexDbRow);
}

async function listVersionArticles(client: TypedSupabaseClient, mst: string): Promise<VersionArticleRow[]> {
  const { data, error } = await client.from("law_version_articles").select("*").eq("mst", mst).order("sort_order");
  throwIfError(error);
  return (data ?? []).map(fromVersionArticleDbRow);
}

async function listVersionProvisions(client: TypedSupabaseClient, mst: string): Promise<VersionProvisionRow[]> {
  const { data, error } = await client.from("law_version_supplementary_provisions").select("*").eq("mst", mst).order("sort_order");
  throwIfError(error);
  return (data ?? []).map(fromVersionProvisionDbRow);
}

async function listVersionAnnexes(client: TypedSupabaseClient, mst: string): Promise<VersionAnnexRow[]> {
  const { data, error } = await client.from("law_version_annexes").select("*").eq("mst", mst).order("sort_order");
  throwIfError(error);
  return (data ?? []).map(fromVersionAnnexDbRow);
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
  table: "law_topics" | "law_articles" | "law_annexes" | "supplementary_provisions",
  lawId: string,
): Promise<void> {
  const { error } = await client.from(table).delete().eq("law_id", lawId);
  throwIfError(error);
}

async function deleteByMst(
  client: TypedSupabaseClient,
  table: "law_version_articles" | "law_version_supplementary_provisions" | "law_version_annexes",
  mst: string,
): Promise<void> {
  const { error } = await client.from(table).delete().eq("mst", mst);
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

function toAnnexDbInsert(row: AnnexRow): AnnexDbInsert {
  return {
    law_id: row.lawId,
    annex_key: row.annexKey,
    annex_type: row.annexType,
    title: row.title,
    annex_number: row.annexNumber ?? null,
    branch_number: row.branchNumber ?? null,
    body: row.body ?? null,
    hwp_url: row.hwpUrl ?? null,
    pdf_url: row.pdfUrl ?? null,
    sort_order: row.sortOrder,
    raw_payload: row.rawPayload ?? null,
  };
}

function fromAnnexDbRow(row: AnnexDbRow): AnnexRow {
  return {
    lawId: row.law_id,
    annexKey: row.annex_key,
    annexType: row.annex_type,
    title: row.title,
    annexNumber: row.annex_number ?? undefined,
    branchNumber: row.branch_number ?? undefined,
    body: row.body ?? undefined,
    hwpUrl: row.hwp_url ?? undefined,
    pdfUrl: row.pdf_url ?? undefined,
    sortOrder: row.sort_order,
    rawPayload: row.raw_payload ?? undefined,
  };
}

function toVersionDbInsert(row: LawVersionRow): LawVersionDbInsert {
  return {
    mst: row.mst,
    law_id: row.lawId,
    title: row.title,
    official_title: row.officialTitle ?? null,
    ministry: row.ministry ?? null,
    category: row.category ?? null,
    status: row.status,
    promulgation_date: row.promulgationDate ?? null,
    effective_date: row.effectiveDate ?? null,
    source_link: row.sourceLink,
    raw_detail_payload: row.rawDetailPayload ?? null,
  };
}

function fromVersionDbRow(row: LawVersionDbRow): LawVersionRow {
  return {
    mst: row.mst,
    lawId: row.law_id,
    title: row.title,
    officialTitle: row.official_title ?? undefined,
    ministry: row.ministry ?? undefined,
    category: row.category ?? undefined,
    status: row.status,
    promulgationDate: row.promulgation_date ?? undefined,
    effectiveDate: row.effective_date ?? undefined,
    sourceLink: row.source_link,
    rawDetailPayload: row.raw_detail_payload ?? undefined,
  };
}

function toVersionArticleDbInsert(row: VersionArticleRow): VersionArticleDbInsert {
  return {
    mst: row.mst,
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

function fromVersionArticleDbRow(row: VersionArticleDbRow): VersionArticleRow {
  return {
    mst: row.mst,
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

function toVersionProvisionDbInsert(row: VersionProvisionRow): VersionProvisionDbInsert {
  return {
    mst: row.mst,
    provision_key: row.provisionKey,
    title: row.title ?? null,
    promulgation_date: row.promulgationDate ?? null,
    promulgation_number: row.promulgationNumber ?? null,
    paragraphs: row.paragraphs,
    sort_order: row.sortOrder,
  };
}

function fromVersionProvisionDbRow(row: VersionProvisionDbRow): VersionProvisionRow {
  return {
    mst: row.mst,
    provisionKey: row.provision_key,
    title: row.title ?? undefined,
    promulgationDate: row.promulgation_date ?? undefined,
    promulgationNumber: row.promulgation_number ?? undefined,
    paragraphs: row.paragraphs,
    sortOrder: row.sort_order,
  };
}

function toVersionAnnexDbInsert(row: VersionAnnexRow): VersionAnnexDbInsert {
  return {
    mst: row.mst,
    annex_key: row.annexKey,
    annex_type: row.annexType,
    title: row.title,
    annex_number: row.annexNumber ?? null,
    branch_number: row.branchNumber ?? null,
    body: row.body ?? null,
    hwp_url: row.hwpUrl ?? null,
    pdf_url: row.pdfUrl ?? null,
    sort_order: row.sortOrder,
    raw_payload: row.rawPayload ?? null,
  };
}

function fromVersionAnnexDbRow(row: VersionAnnexDbRow): VersionAnnexRow {
  return {
    mst: row.mst,
    annexKey: row.annex_key,
    annexType: row.annex_type,
    title: row.title,
    annexNumber: row.annex_number ?? undefined,
    branchNumber: row.branch_number ?? undefined,
    body: row.body ?? undefined,
    hwpUrl: row.hwp_url ?? undefined,
    pdfUrl: row.pdf_url ?? undefined,
    sortOrder: row.sort_order,
    rawPayload: row.raw_payload ?? undefined,
  };
}

function toArticleChangeDbInsert(row: ArticleChangeRow): ArticleChangeDbInsert {
  return {
    law_id: row.lawId,
    from_mst: row.fromMst,
    to_mst: row.toMst,
    article_match_key: row.articleMatchKey,
    article_number: row.articleNumber ?? null,
    change_type: row.changeType,
    old_title: row.oldTitle ?? null,
    new_title: row.newTitle ?? null,
    old_text: row.oldText ?? null,
    new_text: row.newText ?? null,
    old_clauses: row.oldClauses ?? null,
    new_clauses: row.newClauses ?? null,
    changed_fields: row.changedFields,
    sort_order: row.sortOrder,
  };
}

function fromArticleChangeDbRow(row: ArticleChangeDbRow): ArticleChangeRow {
  return {
    lawId: row.law_id,
    fromMst: row.from_mst,
    toMst: row.to_mst,
    articleMatchKey: row.article_match_key,
    articleNumber: row.article_number ?? undefined,
    changeType: row.change_type,
    oldTitle: row.old_title ?? undefined,
    newTitle: row.new_title ?? undefined,
    oldText: row.old_text ?? undefined,
    newText: row.new_text ?? undefined,
    oldClauses: row.old_clauses ?? undefined,
    newClauses: row.new_clauses ?? undefined,
    changedFields: row.changed_fields,
    sortOrder: row.sort_order,
  };
}

function toAnnexChangeDbInsert(row: AnnexChangeRow): AnnexChangeDbInsert {
  return {
    law_id: row.lawId,
    from_mst: row.fromMst,
    to_mst: row.toMst,
    annex_match_key: row.annexMatchKey,
    annex_type: row.annexType,
    annex_number: row.annexNumber ?? null,
    branch_number: row.branchNumber ?? null,
    change_type: row.changeType,
    old_title: row.oldTitle ?? null,
    new_title: row.newTitle ?? null,
    old_text: row.oldText ?? null,
    new_text: row.newText ?? null,
    old_hwp_url: row.oldHwpUrl ?? null,
    new_hwp_url: row.newHwpUrl ?? null,
    old_pdf_url: row.oldPdfUrl ?? null,
    new_pdf_url: row.newPdfUrl ?? null,
    changed_fields: row.changedFields,
    sort_order: row.sortOrder,
  };
}

function fromAnnexChangeDbRow(row: AnnexChangeDbRow): AnnexChangeRow {
  return {
    lawId: row.law_id,
    fromMst: row.from_mst,
    toMst: row.to_mst,
    annexMatchKey: row.annex_match_key,
    annexType: row.annex_type,
    annexNumber: row.annex_number ?? undefined,
    branchNumber: row.branch_number ?? undefined,
    changeType: row.change_type,
    oldTitle: row.old_title ?? undefined,
    newTitle: row.new_title ?? undefined,
    oldText: row.old_text ?? undefined,
    newText: row.new_text ?? undefined,
    oldHwpUrl: row.old_hwp_url ?? undefined,
    newHwpUrl: row.new_hwp_url ?? undefined,
    oldPdfUrl: row.old_pdf_url ?? undefined,
    newPdfUrl: row.new_pdf_url ?? undefined,
    changedFields: row.changed_fields,
    sortOrder: row.sort_order,
  };
}

function chunkRows<T>(rows: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

function toRelationDbInsert(row: LawRelationRow): LawRelationDbInsert {
  return {
    parent_law_id: row.parentLawId,
    child_law_id: row.childLawId,
    relation_type: row.relationType,
    source: row.source,
    sort_order: row.sortOrder,
  };
}

function fromRelationDbRow(row: LawRelationDbRow): LawRelationRow {
  return {
    parentLawId: row.parent_law_id,
    childLawId: row.child_law_id,
    relationType: row.relation_type,
    source: row.source,
    sortOrder: row.sort_order,
  };
}

function throwIfError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

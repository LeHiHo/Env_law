import type { JsonValue, LawArticle, LawDetail, LawStatus, LawSummary, RawSearchRecord, SupplementaryProvision } from "./types";

export type LawRepository = {
  upsertSearchRecords(records: RawSearchRecord[]): Promise<void>;
  upsertDetail(detail: LawDetail, raw: unknown): Promise<void>;
  search(filters: RepositorySearchFilters): Promise<LawSummary[]>;
  getDetail(id: string): Promise<LawDetail | undefined>;
};

export type RepositorySearchFilters = {
  query?: string;
  ministry?: string;
  status?: LawStatus | "전체";
  topic?: string;
  sort?: "relevance" | "effectiveDate";
};

export type SupabaseLawDatabase = {
  upsertLaws(rows: LawRow[]): Promise<void>;
  replaceLawTopics(lawId: string, topicSlugs: string[]): Promise<void>;
  replaceArticles(lawId: string, rows: ArticleRow[]): Promise<void>;
  replaceSupplementaryProvisions(lawId: string, rows: ProvisionRow[]): Promise<void>;
  listLaws(filters: RepositorySearchFilters): Promise<LawRow[]>;
  getLaw(id: string): Promise<LawRow | undefined>;
  getLawByMst(mst: string): Promise<LawRow | undefined>;
  listArticles(lawId: string): Promise<ArticleRow[]>;
  listSupplementaryProvisions(lawId: string): Promise<ProvisionRow[]>;
};

export type LawRow = {
  id: string;
  mst?: string;
  title: string;
  officialTitle?: string;
  ministry?: string;
  category?: string;
  status: LawSummary["status"];
  promulgationDate?: string;
  effectiveDate?: string;
  sourceLink: string;
  rawSearchPayload?: JsonValue;
  rawDetailPayload?: JsonValue;
  topicSlugs: string[];
};

export type ArticleRow = {
  lawId: string;
  articleKey: string;
  articleNumber?: string;
  title?: string;
  body: string;
  changed: boolean;
  notes?: string;
  sortOrder: number;
  clauses: JsonValue;
};

export type ProvisionRow = {
  lawId: string;
  provisionKey: string;
  title?: string;
  promulgationDate?: string;
  promulgationNumber?: string;
  paragraphs: JsonValue;
  sortOrder: number;
};

export function createMemoryLawRepository(): LawRepository {
  const summaries = new Map<string, LawSummary>();
  const details = new Map<string, LawDetail>();

  return {
    upsertSearchRecords: async (records) => {
      records.forEach((record) => summaries.set(record.item.id, record.item));
    },
    upsertDetail: async (detail) => {
      summaries.set(detail.id, detail);
      details.set(detail.id, detail);
    },
    search: async (filters) => filterSummaries([...summaries.values()], filters),
    getDetail: async (id) => details.get(id) ?? findByMst(details, id),
  };
}

export function createSupabaseLawRepository(database: SupabaseLawDatabase): LawRepository {
  return {
    upsertSearchRecords: async (records) => {
      await database.upsertLaws(records.map((record) => toLawRow(record.item, record.raw)));
      await Promise.all(records.map((record) => database.replaceLawTopics(record.item.id, record.item.topicSlugs)));
    },
    upsertDetail: async (detail, raw) => {
      await database.upsertLaws([toLawRow(detail, undefined, raw)]);
      await database.replaceLawTopics(detail.id, detail.topicSlugs);
      await database.replaceArticles(detail.id, detail.articles.map((item, index) => toArticleRow(detail.id, item, index)));
      await database.replaceSupplementaryProvisions(
        detail.id,
        detail.supplementaryProvisions.map((item, index) => toProvisionRow(detail.id, item, index)),
      );
    },
    search: async (filters) => {
      const rows = await database.listLaws(filters);
      return rows.map(fromLawRow);
    },
    getDetail: async (id) => {
      const row = (await database.getLaw(id)) ?? (await database.getLawByMst(id));
      return row ? fromLawDetailRow(row, await database.listArticles(row.id), await database.listSupplementaryProvisions(row.id)) : undefined;
    },
  };
}

function filterSummaries(items: LawSummary[], filters: RepositorySearchFilters): LawSummary[] {
  const query = (filters.query ?? "").trim().toLowerCase();
  const filtered = items.filter((item) => matchesFilters(item, filters, query));

  return filters.sort === "effectiveDate" ? sortByEffectiveDate(filtered) : sortByRelevance(filtered, query);
}

function matchesFilters(item: LawSummary, filters: RepositorySearchFilters, query: string): boolean {
  const text = `${item.title} ${item.ministry ?? ""} ${item.summary ?? ""}`.toLowerCase();
  const topicOk = !filters.topic || filters.topic === "all" || item.topicSlugs.includes(filters.topic);
  const ministryOk = !filters.ministry || filters.ministry === "전체" || item.ministry === filters.ministry;
  const statusOk = !filters.status || filters.status === "전체" || item.status === filters.status;

  return (!query || text.includes(query)) && topicOk && ministryOk && statusOk;
}

function sortByEffectiveDate(items: LawSummary[]): LawSummary[] {
  return [...items].sort((a, b) => (b.effectiveDate ?? "").localeCompare(a.effectiveDate ?? ""));
}

function sortByRelevance(items: LawSummary[], query: string): LawSummary[] {
  return [...items].sort((a, b) => score(b, query) - score(a, query));
}

function score(item: LawSummary, query: string): number {
  if (!query) {
    return item.status === "현행" ? 10 : 0;
  }

  return item.title.toLowerCase() === query ? 100 : item.title.toLowerCase().includes(query) ? 50 : 0;
}

function findByMst(details: Map<string, LawDetail>, mst: string): LawDetail | undefined {
  return [...details.values()].find((item) => item.mst === mst);
}

function toLawRow(item: LawSummary, rawSearch?: unknown, rawDetail?: unknown): LawRow {
  return {
    id: item.id,
    mst: item.mst,
    title: item.title,
    officialTitle: readOfficialTitle(item),
    ministry: item.ministry,
    category: item.category,
    status: item.status,
    promulgationDate: item.promulgationDate,
    effectiveDate: item.effectiveDate,
    sourceLink: item.sourceLink,
    rawSearchPayload: rawSearch === undefined ? undefined : toJsonValue(rawSearch),
    rawDetailPayload: rawDetail === undefined ? undefined : toJsonValue(rawDetail),
    topicSlugs: item.topicSlugs,
  };
}

function readOfficialTitle(item: LawSummary): string | undefined {
  return "officialTitle" in item && typeof item.officialTitle === "string" ? item.officialTitle : undefined;
}

function fromLawRow(row: LawRow): LawSummary {
  return {
    id: row.id,
    mst: row.mst,
    title: row.title,
    ministry: row.ministry,
    category: row.category,
    promulgationDate: row.promulgationDate,
    effectiveDate: row.effectiveDate,
    status: row.status,
    sourceLink: row.sourceLink,
    topicSlugs: row.topicSlugs,
  };
}

function fromLawDetailRow(row: LawRow, articles: ArticleRow[], provisions: ProvisionRow[]): LawDetail {
  return {
    ...fromLawRow(row),
    officialTitle: row.officialTitle,
    articles: articles.sort(compareSortOrder).map(fromArticleRow),
    supplementaryProvisions: provisions.sort(compareSortOrder).map(fromProvisionRow),
  };
}

function toArticleRow(lawId: string, item: LawArticle, index: number): ArticleRow {
  return {
    lawId,
    articleKey: item.key,
    articleNumber: item.number,
    title: item.title,
    body: item.text,
    changed: item.changed ?? false,
    notes: item.notes,
    sortOrder: index,
    clauses: toJsonValue(item.clauses),
  };
}

function fromArticleRow(row: ArticleRow): LawArticle {
  return {
    key: row.articleKey,
    number: row.articleNumber,
    title: row.title,
    text: row.body,
    changed: row.changed,
    notes: row.notes,
    clauses: Array.isArray(row.clauses) ? (row.clauses as LawArticle["clauses"]) : [],
  };
}

function toProvisionRow(lawId: string, item: SupplementaryProvision, index: number): ProvisionRow {
  return {
    lawId,
    provisionKey: item.key,
    title: item.title,
    promulgationDate: item.promulgationDate,
    promulgationNumber: item.promulgationNumber,
    paragraphs: toJsonValue(item.paragraphs),
    sortOrder: index,
  };
}

function fromProvisionRow(row: ProvisionRow): SupplementaryProvision {
  return {
    key: row.provisionKey,
    title: row.title,
    promulgationDate: row.promulgationDate,
    promulgationNumber: row.promulgationNumber,
    paragraphs: Array.isArray(row.paragraphs) ? row.paragraphs.filter(isString) : [],
  };
}

function toJsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }

  return typeof value === "object" ? toJsonObject(value) : null;
}

function toJsonObject(value: object): JsonValue {
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, toJsonValue(entry)]));
}

function compareSortOrder(a: { sortOrder: number }, b: { sortOrder: number }): number {
  return a.sortOrder - b.sortOrder;
}

function isString(value: JsonValue | undefined): value is string {
  return typeof value === "string";
}

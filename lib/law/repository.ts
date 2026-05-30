import type {
  JsonValue,
  ArticleChange,
  LawAnnex,
  LawAnnexType,
  LawArticle,
  LawDetail,
  LawRelation,
  LawStatus,
  LawSummary,
  LawVersion,
  RawSearchRecord,
  SupplementaryProvision,
} from "./types";

export type LawRepository = {
  upsertSearchRecords(records: RawSearchRecord[]): Promise<void>;
  upsertDetail(detail: LawDetail, raw: unknown): Promise<void>;
  upsertRelations(relations: LawRelation[]): Promise<void>;
  listChildRelations(parentLawId: string): Promise<LawRelation[]>;
  listParentRelations(childLawId: string): Promise<LawRelation[]>;
  listVersions(lawId: string): Promise<LawVersion[]>;
  findVersionByEffectiveDate(lawId: string, date: string): Promise<LawVersion | undefined>;
  upsertArticleChanges(changes: ArticleChange[]): Promise<void>;
  listArticleChanges(filters: ArticleChangeFilters): Promise<ArticleChange[]>;
  search(filters: RepositorySearchFilters): Promise<LawSummary[]>;
  getDetail(id: string, mst?: string): Promise<LawDetail | undefined>;
};

export type RepositorySearchFilters = {
  query?: string;
  ministry?: string;
  status?: LawStatus | "전체";
  topic?: string;
  sort?: "relevance" | "effectiveDate";
};

export type ArticleChangeFilters = {
  lawId: string;
  fromMst?: string;
  toMst?: string;
};

export type SupabaseLawDatabase = {
  upsertLaws(rows: LawRow[]): Promise<void>;
  replaceLawTopics(lawId: string, topicSlugs: string[]): Promise<void>;
  replaceArticles(lawId: string, rows: ArticleRow[]): Promise<void>;
  replaceSupplementaryProvisions(lawId: string, rows: ProvisionRow[]): Promise<void>;
  replaceAnnexes(lawId: string, rows: AnnexRow[]): Promise<void>;
  upsertVersion(row: LawVersionRow): Promise<void>;
  replaceVersionArticles(mst: string, rows: VersionArticleRow[]): Promise<void>;
  replaceVersionSupplementaryProvisions(mst: string, rows: VersionProvisionRow[]): Promise<void>;
  replaceVersionAnnexes(mst: string, rows: VersionAnnexRow[]): Promise<void>;
  upsertRelations(rows: LawRelationRow[]): Promise<void>;
  listChildRelations(parentLawId: string): Promise<LawRelationRow[]>;
  listParentRelations(childLawId: string): Promise<LawRelationRow[]>;
  getVersion(mst: string): Promise<LawVersionRow | undefined>;
  listVersions(lawId: string): Promise<LawVersionRow[]>;
  upsertArticleChanges(rows: ArticleChangeRow[]): Promise<void>;
  listArticleChanges(filters: ArticleChangeFilters): Promise<ArticleChangeRow[]>;
  listLaws(filters: RepositorySearchFilters): Promise<LawRow[]>;
  getLaw(id: string): Promise<LawRow | undefined>;
  getLawByMst(mst: string): Promise<LawRow | undefined>;
  listArticles(lawId: string): Promise<ArticleRow[]>;
  listSupplementaryProvisions(lawId: string): Promise<ProvisionRow[]>;
  listAnnexes(lawId: string): Promise<AnnexRow[]>;
  listVersionArticles(mst: string): Promise<VersionArticleRow[]>;
  listVersionSupplementaryProvisions(mst: string): Promise<VersionProvisionRow[]>;
  listVersionAnnexes(mst: string): Promise<VersionAnnexRow[]>;
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

export type AnnexRow = {
  lawId: string;
  annexKey: string;
  annexType: LawAnnexType;
  title: string;
  annexNumber?: string;
  branchNumber?: string;
  body?: string;
  hwpUrl?: string;
  pdfUrl?: string;
  sortOrder: number;
  rawPayload?: JsonValue;
};

export type LawRelationRow = LawRelation;

export type LawVersionRow = LawVersion & {
  officialTitle?: string;
  ministry?: string;
  category?: string;
  rawDetailPayload?: JsonValue;
};

export type VersionArticleRow = Omit<ArticleRow, "lawId"> & { mst: string };
export type VersionProvisionRow = Omit<ProvisionRow, "lawId"> & { mst: string };
export type VersionAnnexRow = Omit<AnnexRow, "lawId"> & { mst: string };
export type ArticleChangeRow = ArticleChange;

export function createMemoryLawRepository(): LawRepository {
  const summaries = new Map<string, LawSummary>();
  const details = new Map<string, LawDetail>();
  const versions = new Map<string, LawDetail>();
  const relations = new Map<string, LawRelation>();
  const articleChanges = new Map<string, ArticleChange>();

  return {
    upsertSearchRecords: async (records) => {
      records.forEach((record) => summaries.set(record.item.id, record.item));
    },
    upsertDetail: async (detail) => {
      summaries.set(detail.id, detail);
      details.set(detail.id, detail);
      if (detail.mst) {
        versions.set(detail.mst, detail);
      }
    },
    upsertRelations: async (rows) => {
      rows.forEach((row) => relations.set(relationKey(row), row));
    },
    listChildRelations: async (parentLawId) => [...relations.values()].filter((row) => row.parentLawId === parentLawId),
    listParentRelations: async (childLawId) => [...relations.values()].filter((row) => row.childLawId === childLawId),
    listVersions: async (lawId) => sortVersions([...versions.values()].filter((item) => item.id === lawId).map(toLawVersion)),
    findVersionByEffectiveDate: async (lawId, date) => findVersionAtDate(await listMemoryVersions(versions, lawId), date),
    upsertArticleChanges: async (rows) => {
      rows.forEach((row) => articleChanges.set(articleChangeKey(row), row));
    },
    listArticleChanges: async (filters) => filterArticleChanges([...articleChanges.values()], filters),
    search: async (filters) => filterSummaries([...summaries.values()], filters),
    getDetail: async (id, mst) => (mst ? versions.get(mst) : undefined) ?? details.get(id) ?? findByMst(details, id),
  };
}

async function listMemoryVersions(versions: Map<string, LawDetail>, lawId: string): Promise<LawVersion[]> {
  return sortVersions([...versions.values()].filter((item) => item.id === lawId).map(toLawVersion));
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
      await database.replaceArticles(detail.id, toArticleRows(detail.id, detail.articles));
      await database.replaceSupplementaryProvisions(
        detail.id,
        detail.supplementaryProvisions.map((item, index) => toProvisionRow(detail.id, item, index)),
      );
      await database.replaceAnnexes(detail.id, detail.annexes.map((item, index) => toAnnexRow(detail.id, item, index)));
      await upsertVersionDetail(database, detail, raw);
    },
    upsertRelations: async (relations) => database.upsertRelations(relations),
    listChildRelations: async (parentLawId) => database.listChildRelations(parentLawId),
    listParentRelations: async (childLawId) => database.listParentRelations(childLawId),
    listVersions: async (lawId) => sortVersions((await database.listVersions(lawId)).map(fromVersionRow)),
    findVersionByEffectiveDate: async (lawId, date) => findVersionAtDate((await database.listVersions(lawId)).map(fromVersionRow), date),
    upsertArticleChanges: async (changes) => database.upsertArticleChanges(changes),
    listArticleChanges: async (filters) => database.listArticleChanges(filters),
    search: async (filters) => {
      const rows = await database.listLaws(filters);
      return rows.map(fromLawRow);
    },
    getDetail: async (id, mst) => {
      if (mst) {
        const version = await database.getVersion(mst);
        return version ? fromVersionDetailRow(version, database) : undefined;
      }

      const row = (await database.getLaw(id)) ?? (await database.getLawByMst(id));
      return row ? fromLawDetailDatabaseRow(row, database) : undefined;
    },
  };
}

async function upsertVersionDetail(database: SupabaseLawDatabase, detail: LawDetail, raw: unknown): Promise<void> {
  const mst = detail.mst;

  if (!mst) {
    return;
  }

  await database.upsertVersion(toVersionRow(detail, raw));
  await database.replaceVersionArticles(mst, toVersionArticleRows(mst, detail.articles));
  await database.replaceVersionSupplementaryProvisions(
    mst,
    detail.supplementaryProvisions.map((item, index) => toVersionProvisionRow(mst, item, index)),
  );
  await database.replaceVersionAnnexes(mst, detail.annexes.map((item, index) => toVersionAnnexRow(mst, item, index)));
}

async function fromLawDetailDatabaseRow(row: LawRow, database: SupabaseLawDatabase): Promise<LawDetail> {
  const articles = await database.listArticles(row.id);
  const provisions = await database.listSupplementaryProvisions(row.id);
  const annexes = await database.listAnnexes(row.id);
  return fromLawDetailRow(row, articles, provisions, annexes);
}

async function fromVersionDetailRow(row: LawVersionRow, database: SupabaseLawDatabase): Promise<LawDetail> {
  const articles = await database.listVersionArticles(row.mst);
  const provisions = await database.listVersionSupplementaryProvisions(row.mst);
  const annexes = await database.listVersionAnnexes(row.mst);
  return fromVersionRowDetail(row, articles, provisions, annexes);
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

function relationKey(row: LawRelation): string {
  return `${row.parentLawId}:${row.childLawId}:${row.relationType}`;
}

function articleChangeKey(row: ArticleChange): string {
  return `${row.lawId}:${row.fromMst}:${row.toMst}:${row.articleMatchKey}`;
}

function filterArticleChanges(items: ArticleChange[], filters: ArticleChangeFilters): ArticleChange[] {
  return items
    .filter((item) => item.lawId === filters.lawId)
    .filter((item) => !filters.fromMst || item.fromMst === filters.fromMst)
    .filter((item) => !filters.toMst || item.toMst === filters.toMst)
    .sort(compareSortOrder);
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

function toVersionRow(item: LawDetail, rawDetail?: unknown): LawVersionRow {
  return {
    mst: item.mst ?? item.id,
    lawId: item.id,
    title: item.title,
    officialTitle: item.officialTitle,
    ministry: item.ministry,
    category: item.category,
    status: item.status,
    promulgationDate: item.promulgationDate,
    effectiveDate: item.effectiveDate,
    sourceLink: item.sourceLink,
    rawDetailPayload: rawDetail === undefined ? undefined : toJsonValue(rawDetail),
  };
}

function fromVersionRow(row: LawVersionRow): LawVersion {
  return {
    mst: row.mst,
    lawId: row.lawId,
    title: row.title,
    status: row.status,
    promulgationDate: row.promulgationDate,
    effectiveDate: row.effectiveDate,
    sourceLink: row.sourceLink,
  };
}

function fromVersionRowDetail(
  row: LawVersionRow,
  articles: VersionArticleRow[],
  provisions: VersionProvisionRow[],
  annexes: VersionAnnexRow[],
): LawDetail {
  return {
    id: row.lawId,
    mst: row.mst,
    title: row.title,
    officialTitle: row.officialTitle,
    ministry: row.ministry,
    category: row.category,
    promulgationDate: row.promulgationDate,
    effectiveDate: row.effectiveDate,
    status: row.status,
    sourceLink: row.sourceLink,
    topicSlugs: [],
    articles: articles.sort(compareSortOrder).map(fromVersionArticleRow),
    supplementaryProvisions: provisions.sort(compareSortOrder).map(fromVersionProvisionRow),
    annexes: annexes.sort(compareSortOrder).map(fromVersionAnnexRow),
  };
}

function fromLawDetailRow(
  row: LawRow,
  articles: ArticleRow[],
  provisions: ProvisionRow[],
  annexes: AnnexRow[],
): LawDetail {
  return {
    ...fromLawRow(row),
    officialTitle: row.officialTitle,
    articles: articles.sort(compareSortOrder).map(fromArticleRow),
    supplementaryProvisions: provisions.sort(compareSortOrder).map(fromProvisionRow),
    annexes: annexes.sort(compareSortOrder).map(fromAnnexRow),
  };
}

function toArticleRow(lawId: string, item: LawArticle, index: number): ArticleRow {
  return {
    lawId,
    articleKey: item.key || `article-${index}`,
    articleNumber: item.number,
    title: item.title,
    body: item.text,
    changed: item.changed ?? false,
    notes: item.notes,
    sortOrder: index,
    clauses: toJsonValue(item.clauses),
  };
}

function toArticleRows(lawId: string, articles: LawArticle[]): ArticleRow[] {
  const counts = new Map<string, number>();

  return articles.map((item, index) => {
    const row = toArticleRow(lawId, item, index);
    const count = counts.get(row.articleKey) ?? 0;
    counts.set(row.articleKey, count + 1);
    return count === 0 ? row : { ...row, articleKey: `${row.articleKey}-${count + 1}` };
  });
}

function toVersionArticleRows(mst: string, articles: LawArticle[]): VersionArticleRow[] {
  const counts = new Map<string, number>();

  return articles.map((item, index) => {
    const row = toVersionArticleRow(mst, item, index);
    const count = counts.get(row.articleKey) ?? 0;
    counts.set(row.articleKey, count + 1);
    return count === 0 ? row : { ...row, articleKey: `${row.articleKey}-${count + 1}` };
  });
}

function toVersionArticleRow(mst: string, item: LawArticle, index: number): VersionArticleRow {
  const row = toArticleRow("", item, index);
  return {
    mst,
    articleKey: row.articleKey,
    articleNumber: row.articleNumber,
    title: row.title,
    body: row.body,
    changed: row.changed,
    notes: row.notes,
    sortOrder: row.sortOrder,
    clauses: row.clauses,
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

function fromVersionArticleRow(row: VersionArticleRow): LawArticle {
  return fromArticleRow({ ...row, lawId: "" });
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

function toVersionProvisionRow(mst: string, item: SupplementaryProvision, index: number): VersionProvisionRow {
  const row = toProvisionRow("", item, index);
  return {
    mst,
    provisionKey: row.provisionKey,
    title: row.title,
    promulgationDate: row.promulgationDate,
    promulgationNumber: row.promulgationNumber,
    paragraphs: row.paragraphs,
    sortOrder: row.sortOrder,
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

function fromVersionProvisionRow(row: VersionProvisionRow): SupplementaryProvision {
  return fromProvisionRow({ ...row, lawId: "" });
}

function toAnnexRow(lawId: string, item: LawAnnex, index: number): AnnexRow {
  return {
    lawId,
    annexKey: item.key,
    annexType: item.type,
    title: item.title,
    annexNumber: item.number,
    branchNumber: item.branchNumber,
    body: item.text,
    hwpUrl: item.hwpUrl,
    pdfUrl: item.pdfUrl,
    sortOrder: index,
    rawPayload: item.raw,
  };
}

function toVersionAnnexRow(mst: string, item: LawAnnex, index: number): VersionAnnexRow {
  const row = toAnnexRow("", item, index);
  return {
    mst,
    annexKey: row.annexKey,
    annexType: row.annexType,
    title: row.title,
    annexNumber: row.annexNumber,
    branchNumber: row.branchNumber,
    body: row.body,
    hwpUrl: row.hwpUrl,
    pdfUrl: row.pdfUrl,
    sortOrder: row.sortOrder,
    rawPayload: row.rawPayload,
  };
}

function fromAnnexRow(row: AnnexRow): LawAnnex {
  return {
    key: row.annexKey,
    type: row.annexType,
    title: row.title,
    number: row.annexNumber,
    branchNumber: row.branchNumber,
    text: row.body,
    hwpUrl: row.hwpUrl,
    pdfUrl: row.pdfUrl,
    raw: row.rawPayload,
  };
}

function fromVersionAnnexRow(row: VersionAnnexRow): LawAnnex {
  return fromAnnexRow({ ...row, lawId: "" });
}

function toLawVersion(item: LawDetail): LawVersion {
  return {
    mst: item.mst ?? item.id,
    lawId: item.id,
    title: item.title,
    status: item.status,
    promulgationDate: item.promulgationDate,
    effectiveDate: item.effectiveDate,
    sourceLink: item.sourceLink,
  };
}

function sortVersions(versions: LawVersion[]): LawVersion[] {
  return [...versions].sort((a, b) => (b.effectiveDate ?? "").localeCompare(a.effectiveDate ?? ""));
}

function findVersionAtDate(versions: LawVersion[], date: string): LawVersion | undefined {
  return sortVersions(versions).find((version) => !version.effectiveDate || version.effectiveDate <= date);
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

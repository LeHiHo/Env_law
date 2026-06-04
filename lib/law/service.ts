import { createLawApiClient } from "./client";
import { FALLBACK_LAWS, FALLBACK_WARNING, getFallbackDetail } from "./fallback";
import { diffAnnexVersions } from "./annex-diff";
import { diffArticleVersions, sortVersionsAscending } from "./article-diff";
import { parseHistoryHtml } from "./history-parser";
import { parseDetailPayload } from "./detail-parser";
import { parseSearchPayload, parseSearchRecords } from "./search-parser";
import type {
  AnnexChange,
  LawAnnex,
  LawAnnexType,
  ArticleChange,
  LawApiClient,
  LawDetail,
  LawDetailResult,
  LawHistoryItem,
  LawSummary,
  LawVersion,
  SearchFilters,
  SearchResult,
} from "./types";
import { createMemoryLawRepository, createSupabaseLawRepository, type LawRepository } from "./repository";
import { createSupabaseLawDatabaseFromEnv } from "./supabase-database";

export type LawServiceDependencies = {
  client?: LawApiClient;
  repository?: LawRepository;
};

const defaultRepository = createDefaultLawRepository();

export function createLawService(dependencies: LawServiceDependencies = {}) {
  const client = dependencies.client ?? createLawApiClient();
  const repository = dependencies.repository ?? defaultRepository;

  return {
    searchLaws: (filters: SearchFilters) => searchLaws(filters, client, repository),
    getLawDetail: (id: string, mst?: string) => getLawDetail(id, mst, client, repository),
    listAnnexes: (id: string, type?: LawAnnexType) => listAnnexes(id, undefined, type, client, repository),
    listVersionAnnexes: (id: string, mst: string, type?: LawAnnexType) => listAnnexes(id, mst, type, client, repository),
    listLawVersions: (lawId: string) => listLawVersions(lawId, repository),
    syncLawHistory: (id: string) => syncLawHistory(id, client, repository),
    computeArticleChanges: (id: string) => computeArticleChanges(id, repository),
    listArticleChanges: (id: string, fromMst?: string, toMst?: string) => listArticleChanges(id, fromMst, toMst, repository),
    computeAnnexChanges: (id: string) => computeAnnexChanges(id, repository),
    listAnnexChanges: (id: string, fromMst?: string, toMst?: string, type?: LawAnnexType) =>
      listAnnexChanges(id, fromMst, toMst, type, repository),
  };
}

const ANNEX_TYPES: LawAnnexType[] = ["별표", "서식", "별지", "별도", "부록", "기타"];

export function parseAnnexTypeFilter(value: string | null): LawAnnexType | undefined {
  return ANNEX_TYPES.find((type) => type === value);
}

function createDefaultLawRepository(): LawRepository {
  const database = createSupabaseLawDatabaseFromEnv();
  return database ? createSupabaseLawRepository(database) : createMemoryLawRepository();
}

async function searchLaws(
  filters: SearchFilters,
  client: LawApiClient,
  repository: LawRepository,
): Promise<SearchResult> {
  try {
    const payload = await client.search(filters);

    if (payload) {
      await repository.upsertSearchRecords(parseSearchRecords(payload));
      return resultFromItems(parseSearchPayload(payload), "api");
    }
  } catch (error) {
    const cached = await repository.search(filters);
    return cached.length ? resultFromItems(cached, "db-cache", getWarning(error)) : fallbackSearch(filters);
  }

  const cached = await repository.search(filters);
  return cached.length ? resultFromItems(cached, "db-cache") : fallbackSearch(filters);
}

async function getLawDetail(
  id: string,
  mst: string | undefined,
  client: LawApiClient,
  repository: LawRepository,
): Promise<LawDetailResult> {
  try {
    const detail = await fetchAndStoreDetail(id, mst, client, repository);

    if (detail) {
      return { item: detail, source: "api" };
    }
  } catch (error) {
    const cached = await repository.getDetail(id, mst);
    return cached ? { item: cached, source: "db-cache", warning: getWarning(error) } : fallbackDetail(id);
  }

  const cached = await repository.getDetail(id, mst);
  return cached ? { item: cached, source: "db-cache" } : fallbackDetail(id);
}

async function listLawVersions(lawId: string, repository: LawRepository): Promise<{ items: LawVersion[]; total: number }> {
  const items = await repository.listVersions(lawId);
  return { items, total: items.length };
}

async function listAnnexes(
  id: string,
  mst: string | undefined,
  type: LawAnnexType | undefined,
  client: LawApiClient,
  repository: LawRepository,
): Promise<{ items: LawAnnex[]; total: number }> {
  const result = await getLawDetail(id, mst, client, repository);
  const items = filterAnnexes(result.item?.annexes ?? [], type);
  return { items, total: items.length };
}

async function syncLawHistory(
  id: string,
  client: LawApiClient,
  repository: LawRepository,
): Promise<{ items: LawHistoryItem[]; stored: number; skipped: number }> {
  const base = await repository.getDetail(id);
  const title = base?.title ?? id;
  const html = await client.historyByTitle(title);
  const items = html ? parseHistoryHtml(html, id, title) : [];
  const stored = await storeMissingHistoryVersions(id, items, client, repository);

  return { items, stored, skipped: items.length - stored };
}

async function computeArticleChanges(
  lawId: string,
  repository: LawRepository,
): Promise<{ items: ArticleChange[]; total: number }> {
  const versions = sortVersionsAscending(await repository.listVersions(lawId));
  const items = (await Promise.all(versionPairs(versions).map((pair) => diffVersionPair(lawId, pair, repository))))
    .flat()
    .filter((item) => item.changeType !== "unchanged");
  await repository.upsertArticleChanges(items);
  return { items, total: items.length };
}

async function listArticleChanges(
  lawId: string,
  fromMst: string | undefined,
  toMst: string | undefined,
  repository: LawRepository,
): Promise<{ items: ArticleChange[]; total: number }> {
  const items = await repository.listArticleChanges({ lawId, fromMst, toMst });
  return { items, total: items.length };
}

async function computeAnnexChanges(
  lawId: string,
  repository: LawRepository,
): Promise<{ items: AnnexChange[]; total: number }> {
  const versions = sortVersionsAscending(await repository.listVersions(lawId));
  const items = (await Promise.all(versionPairs(versions).map((pair) => diffAnnexVersionPair(lawId, pair, repository))))
    .flat()
    .filter((item) => item.changeType !== "unchanged");
  await repository.upsertAnnexChanges(items);
  return { items, total: items.length };
}

async function listAnnexChanges(
  lawId: string,
  fromMst: string | undefined,
  toMst: string | undefined,
  type: LawAnnexType | undefined,
  repository: LawRepository,
): Promise<{ items: AnnexChange[]; total: number }> {
  const items = await repository.listAnnexChanges({ lawId, fromMst, toMst, type });
  return { items, total: items.length };
}

async function storeMissingHistoryVersions(
  lawId: string,
  items: LawHistoryItem[],
  client: LawApiClient,
  repository: LawRepository,
): Promise<number> {
  let stored = 0;
  const existingMsts = new Set((await repository.listVersions(lawId)).map((version) => version.mst));

  for (const item of items) {
    stored += await storeHistoryVersion(lawId, item, existingMsts, client, repository);
  }

  return stored;
}

async function storeHistoryVersion(
  lawId: string,
  item: LawHistoryItem,
  existingMsts: Set<string>,
  client: LawApiClient,
  repository: LawRepository,
): Promise<number> {
  if (existingMsts.has(item.mst)) {
    return 0;
  }

  const raw = await client.detailByMst(item.mst);
  const detail = mergeDetailMeta(raw ? parseDetailPayload(raw) : undefined, itemToSummary(item), item.mst);

  if (!detail) {
    return 0;
  }

  await repository.upsertDetail({ ...detail, id: lawId }, raw);
  existingMsts.add(item.mst);
  return 1;
}

async function diffVersionPair(
  lawId: string,
  pair: [LawVersion, LawVersion],
  repository: LawRepository,
): Promise<ArticleChange[]> {
  const from = await repository.getDetail(lawId, pair[0].mst);
  const to = await repository.getDetail(lawId, pair[1].mst);
  return from && to ? diffArticleVersions(from, to) : [];
}

async function diffAnnexVersionPair(
  lawId: string,
  pair: [LawVersion, LawVersion],
  repository: LawRepository,
): Promise<AnnexChange[]> {
  const from = await repository.getDetail(lawId, pair[0].mst);
  const to = await repository.getDetail(lawId, pair[1].mst);
  return from && to ? diffAnnexVersions(from, to) : [];
}

async function fetchAndStoreDetail(
  id: string,
  mst: string | undefined,
  client: LawApiClient,
  repository: LawRepository,
) {
  const summary = await findCachedSummary(id, mst, repository);
  const raw = mst ? await client.detailByMst(mst) : await client.detailById(id);
  const parsed = raw ? parseDetailPayload(raw) : undefined;
  const fallbackRaw = parsed ? undefined : await fetchDetailFallback(id, mst, client);
  const payload = parsed ? raw : fallbackRaw;
  const detail = mergeDetailMeta(parsed ?? (fallbackRaw ? parseDetailPayload(fallbackRaw) : undefined), summary, mst);

  if (detail) {
    await repository.upsertDetail(detail, payload);
  }

  return detail;
}

async function fetchDetailFallback(
  id: string,
  mst: string | undefined,
  client: LawApiClient,
): Promise<unknown | undefined> {
  return mst ? client.detailById(id) : undefined;
}

async function findCachedSummary(
  id: string,
  mst: string | undefined,
  repository: LawRepository,
): Promise<LawSummary | undefined> {
  const candidates = await repository.search({});
  const exact = candidates.find((item) => item.id === id && (!mst || item.mst === mst));
  return exact ?? (mst ? candidates.find((item) => item.mst === mst) : candidates.find((item) => item.id === id));
}

function itemToSummary(item: LawHistoryItem): LawSummary {
  return {
    id: item.lawId,
    mst: item.mst,
    title: item.title,
    promulgationDate: item.promulgationDate,
    effectiveDate: item.effectiveDate,
    status: item.status,
    sourceLink: item.sourceLink,
    topicSlugs: [],
  };
}

function versionPairs(versions: LawVersion[]): Array<[LawVersion, LawVersion]> {
  return versions.slice(1).map((version, index) => [versions[index]!, version]);
}

function mergeDetailMeta(
  detail: LawDetail | undefined,
  summary: LawSummary | undefined,
  requestedMst: string | undefined,
): LawDetail | undefined {
  if (!detail) {
    return undefined;
  }

  return {
    ...detail,
    mst: summary?.mst ?? detail.mst ?? requestedMst,
    ministry: summary?.ministry ?? detail.ministry,
    category: summary?.category ?? detail.category,
    promulgationDate: summary?.promulgationDate ?? detail.promulgationDate,
    effectiveDate: summary?.effectiveDate ?? detail.effectiveDate,
    status: summary?.status ?? detail.status,
    sourceLink: summary?.sourceLink ?? detail.sourceLink,
    topicSlugs: summary?.topicSlugs.length ? summary.topicSlugs : detail.topicSlugs,
    summary: detail.summary ?? summary?.summary,
  };
}

function fallbackSearch(filters: SearchFilters): SearchResult {
  return resultFromItems(filterFallback(filters), "mock", FALLBACK_WARNING);
}

function fallbackDetail(id: string): LawDetailResult {
  return { item: getFallbackDetail(id), source: "mock", warning: FALLBACK_WARNING };
}

function filterFallback(filters: SearchFilters) {
  return FALLBACK_LAWS.filter((item) => {
    const query = filters.query?.trim().toLowerCase();
    const queryOk = !query || item.title.toLowerCase().includes(query);
    const statusOk = !filters.status || filters.status === "전체" || item.status === filters.status;
    const topicOk = !filters.topic || filters.topic === "all" || item.topicSlugs.includes(filters.topic);
    return queryOk && statusOk && topicOk;
  });
}

function filterAnnexes(items: LawAnnex[], type: LawAnnexType | undefined): LawAnnex[] {
  return type ? items.filter((item) => item.type === type) : items;
}

function resultFromItems(
  items: SearchResult["items"],
  source: SearchResult["source"],
  warning?: string,
): SearchResult {
  return { items, total: items.length, source, warning };
}

function getWarning(error: unknown): string {
  return error instanceof Error ? error.message : FALLBACK_WARNING;
}

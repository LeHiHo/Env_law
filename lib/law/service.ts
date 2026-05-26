import { createLawApiClient } from "./client";
import { FALLBACK_LAWS, FALLBACK_WARNING, getFallbackDetail } from "./fallback";
import { parseDetailPayload } from "./detail-parser";
import { parseSearchPayload, parseSearchRecords } from "./search-parser";
import type { LawApiClient, LawDetailResult, SearchFilters, SearchResult } from "./types";
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
  };
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
    const cached = await repository.getDetail(id);
    return cached ? { item: cached, source: "db-cache", warning: getWarning(error) } : fallbackDetail(id);
  }

  const cached = await repository.getDetail(id);
  return cached ? { item: cached, source: "db-cache" } : fallbackDetail(id);
}

async function fetchAndStoreDetail(
  id: string,
  mst: string | undefined,
  client: LawApiClient,
  repository: LawRepository,
) {
  const raw = await client.detailById(id);
  const parsed = raw ? parseDetailPayload(raw) : undefined;
  const fallbackRaw = parsed ? undefined : await fetchMstFallback(mst, client);
  const payload = parsed ? raw : fallbackRaw;
  const detail = parsed ?? (fallbackRaw ? parseDetailPayload(fallbackRaw) : undefined);

  if (detail) {
    await repository.upsertDetail(detail, payload);
  }

  return detail;
}

async function fetchMstFallback(mst: string | undefined, client: LawApiClient): Promise<unknown | undefined> {
  return mst ? client.detailByMst(mst) : undefined;
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

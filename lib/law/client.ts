import type { LawApiClient, SearchFilters } from "./types";
import { compactText } from "./utils";

const LAW_SEARCH_ENDPOINT = "https://www.law.go.kr/DRF/lawSearch.do";
const LAW_DETAIL_ENDPOINT = "https://www.law.go.kr/DRF/lawService.do";

export class LawApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "LawApiError";
  }
}

export function createLawApiClient(credential = process.env.LAW_API_OC): LawApiClient {
  return {
    search: (filters) => fetchSearch(credential, filters),
    detailById: (id) => fetchDetail(credential, { ID: id }),
    detailByMst: (mst) => fetchDetail(credential, { MST: mst }),
    historyByTitle: (title) => fetchHistory(credential, title),
  };
}

async function fetchSearch(credential: string | undefined, filters: SearchFilters): Promise<unknown | undefined> {
  const query = compactText(filters.query) || "*";
  const sort = filters.sort === "effectiveDate" ? "efdes" : "lasc";
  const nw = toNwCode(filters.status);

  return fetchJson(credential, LAW_SEARCH_ENDPOINT, {
    target: "eflaw",
    search: "1",
    query,
    display: "50",
    page: "1",
    sort,
    nw,
  });
}

async function fetchDetail(
  credential: string | undefined,
  identity: { ID?: string; MST?: string },
): Promise<unknown | undefined> {
  return fetchJson(credential, LAW_DETAIL_ENDPOINT, { target: "law", ...identity });
}

async function fetchHistory(credential: string | undefined, title: string): Promise<string | undefined> {
  return fetchText(credential, LAW_SEARCH_ENDPOINT, {
    target: "lsHistory",
    query: compactText(title),
    display: "100",
    page: "1",
    sort: "efdes",
  });
}

async function fetchJson(
  credential: string | undefined,
  endpoint: string,
  params: Record<string, string | undefined>,
): Promise<unknown | undefined> {
  if (!credential) {
    return undefined;
  }

  const response = await fetch(buildUrl(endpoint, credential, params), { headers: { Accept: "application/json" } });

  if (!response.ok) {
    throw new LawApiError("국가법령 Open API 호출에 실패했습니다.", response.status);
  }

  return response.json() as Promise<unknown>;
}

async function fetchText(
  credential: string | undefined,
  endpoint: string,
  params: Record<string, string | undefined>,
): Promise<string | undefined> {
  if (!credential) {
    return undefined;
  }

  const response = await fetch(buildUrl(endpoint, credential, { ...params, type: "HTML" }));

  if (!response.ok) {
    throw new LawApiError("국가법령 Open API 호출에 실패했습니다.", response.status);
  }

  return response.text();
}

function buildUrl(endpoint: string, credential: string, params: Record<string, string | undefined>): URL {
  const url = new URL(endpoint);
  url.searchParams.set("OC", credential);
  url.searchParams.set("type", "JSON");

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url;
}

function toNwCode(status: SearchFilters["status"]): string | undefined {
  if (status === "현행") {
    return "3";
  }

  if (status === "시행예정") {
    return "2";
  }

  return status === "연혁" ? "1" : undefined;
}

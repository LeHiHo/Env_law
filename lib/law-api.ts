import { unstable_cache } from "next/cache";

import { MOCK_LAWS, getMockLawDetail } from "@/lib/mock-laws";
import { ENVIRONMENT_TOPICS } from "@/lib/topics";
import {
  ApiError,
  LawArticle,
  LawDetail,
  LawStatus,
  LawSubItem,
  LawSummary,
  SearchFilters,
  SearchResult,
  SupplementaryProvision,
  Topic,
} from "@/lib/types";
import { compactText, normalizeDateString } from "@/lib/utils";

const LAW_SEARCH_ENDPOINT = "https://www.law.go.kr/DRF/lawSearch.do";
const LAW_DETAIL_ENDPOINT = "https://www.law.go.kr/DRF/lawService.do";
const FOCUS_LAW_TITLE = "물환경보전법";

const DEFAULT_WARNING =
  "국가법령 Open API 키가 없어 목업 데이터를 보여주고 있습니다. .env.local에 LAW_API_OC를 설정하면 실데이터로 전환됩니다.";

function getApiCredential() {
  return process.env.LAW_API_OC;
}

function buildOfficialLawLink(law: { mst?: string; id?: string; title: string }) {
  if (law.mst) {
    return `https://www.law.go.kr/lsInfoP.do?lsiSeq=${encodeURIComponent(law.mst)}`;
  }

  if (law.id) {
    return `https://www.law.go.kr/lsInfoP.do?lsId=${encodeURIComponent(law.id)}`;
  }

  return `https://www.law.go.kr/lsSc.do?query=${encodeURIComponent(law.title)}`;
}

function toLawStatus(value?: string): LawStatus {
  const normalized = compactText(value);

  if (normalized.includes("예정")) {
    return "시행예정";
  }

  if (normalized.includes("연혁")) {
    return "연혁";
  }

  return "현행";
}

function topicMatches(item: LawSummary, topic?: string) {
  if (!topic || topic === "all") {
    return true;
  }

  return item.topicSlugs.includes(topic);
}

function queryScore(item: LawSummary, query: string) {
  if (!query) {
    return 0;
  }

  const title = compactText(item.title).toLowerCase();
  const ministry = compactText(item.ministry).toLowerCase();
  const summary = compactText(item.summary).toLowerCase();

  if (title === query) {
    return 100;
  }

  if (title.startsWith(query)) {
    return 80;
  }

  if (title.includes(query)) {
    return 60;
  }

  return ministry.includes(query) || summary.includes(query) ? 20 : 0;
}

function compareRelevance(query: string) {
  return (a: LawSummary, b: LawSummary) => {
    const score = queryScore(b, query) - queryScore(a, query);

    if (score !== 0) {
      return score;
    }

    if (a.status !== b.status) {
      return a.status === "현행" ? -1 : 1;
    }

    return (b.effectiveDate ?? "").localeCompare(a.effectiveDate ?? "");
  };
}

function applyFilters(items: LawSummary[], filters: SearchFilters) {
  const query = compactText(filters.query).toLowerCase();

  let results = items.filter((item) => {
    const matchesQuery =
      !query ||
      item.title.toLowerCase().includes(query) ||
      compactText(item.summary).toLowerCase().includes(query) ||
      compactText(item.ministry).toLowerCase().includes(query);
    const matchesMinistry =
      !filters.ministry || filters.ministry === "전체" || item.ministry === filters.ministry;
    const matchesStatus =
      !filters.status || filters.status === "전체" || item.status === filters.status;

    return matchesQuery && matchesMinistry && matchesStatus && topicMatches(item, filters.topic);
  });

  if (filters.sort === "effectiveDate") {
    results = [...results].sort((a, b) => (b.effectiveDate ?? "").localeCompare(a.effectiveDate ?? ""));
  } else {
    results = [...results].sort(compareRelevance(query));
  }

  return results;
}

function getTopicBySlug(slug: string) {
  return ENVIRONMENT_TOPICS.find((topic) => topic.slug === slug);
}

function inferTopicSlugs(title: string) {
  const slugs = ENVIRONMENT_TOPICS.filter((topic) =>
    topic.keywords.some((keyword) => title.includes(keyword)),
  ).map((topic) => topic.slug);

  return slugs.length > 0 ? slugs : ["permit"];
}

export function normalizeSearchPayload(payload: unknown): LawSummary[] {
  const root = payload as Record<string, unknown>;
  const raw = root?.LawSearch ?? root?.lawSearch ?? root;
  const result = raw as Record<string, unknown>;
  const records = [
    ...toRecordArray(result?.law),
    ...toRecordArray(result?.laws),
    ...toRecordArray(result?.["법령"]),
  ];

  const normalized = records.map(normalizeSearchRecord);

  return normalized.filter((item): item is LawSummary => item !== undefined);
}

function normalizeSearchRecord(item: Record<string, unknown>, index: number): LawSummary | undefined {
  const title = compactText(
    String(item.법령명한글 ?? item.법령명 ?? item.lawNameKor ?? item.LM ?? item.법령명약칭 ?? ""),
  );

  if (!title) {
    return undefined;
  }

  const ministry = compactText(String(item.소관부처명 ?? item.minister ?? item.소관부처 ?? ""));
  const category = compactText(String(item.법종구분 ?? item.lawType ?? item.법종구분명 ?? ""));
  const promulgationDate = normalizeDateString(String(item.공포일자 ?? item.공포일 ?? item.promulgationDate ?? ""));
  const effectiveDate = normalizeDateString(String(item.시행일자 ?? item.시행일 ?? item.effectiveDate ?? ""));
  const status = toLawStatus(String(item.현행연혁코드명 ?? item.현행연혁코드 ?? item.시행상태 ?? item.nw ?? ""));
  const mst = compactText(String(item.MST ?? item.lsiSeq ?? item.법령일련번호 ?? ""));
  const id = compactText(String((item.ID ?? item.법령ID ?? item.lawId ?? mst) || `law-${index}`));

  return {
    id,
    mst,
    title,
    ministry,
    category,
    promulgationDate,
    effectiveDate,
    status,
    sourceLink: buildOfficialLawLink({ id, mst, title }),
    topicSlugs: inferTopicSlugs(title),
    summary: ministry ? `${ministry} 소관 환경 법령입니다.` : "환경 실무에서 자주 조회되는 법령입니다.",
  } satisfies LawSummary;
}

export function normalizeDetailPayload(payload: unknown): LawDetail | undefined {
  const root = payload as Record<string, unknown>;
  const law = (root?.법령 ?? root?.law ?? root) as Record<string, unknown>;
  const basicInfo = (law.기본정보 ?? law.basicInfo ?? {}) as Record<string, unknown>;
  const title = getDetailTitle(law, basicInfo);

  if (!title) {
    return undefined;
  }

  const mst = compactText(String(law.MST ?? law.lsiSeq ?? law.법령일련번호 ?? ""));
  const id = compactText(String((basicInfo.법령ID ?? law.ID ?? law.법령ID ?? mst) || title));
  const detailMeta = getDetailMeta(law, basicInfo);
  const summary = getDetailSummary(law);
  const topicSlugs = inferTopicSlugs(title);
  const articles = normalizeArticles(law.조문);
  const supplementaryProvisions = normalizeSupplementaryProvisions(law.부칙);

  const base: LawDetail = {
    id,
    mst,
    title,
    officialTitle: title,
    ...detailMeta,
    sourceLink: buildOfficialLawLink({ id, mst, title }),
    topicSlugs,
    summary: summary || undefined,
    aiSummaryPending: !summary,
    articles,
    supplementaryProvisions,
    relatedLaws: [],
  };

  return {
    ...base,
    relatedLaws: MOCK_LAWS.filter(
      (item) => item.id !== base.id && item.topicSlugs.some((slug) => base.topicSlugs.includes(slug)),
    ).slice(0, 3),
  };
}

function getDetailTitle(law: Record<string, unknown>, basicInfo: Record<string, unknown>) {
  return compactText(
    String(
      basicInfo.법령명_한글 ??
        law.법령명한글 ??
        law.법령명 ??
        law.제명 ??
        basicInfo.법령명약칭 ??
        "",
    ),
  );
}

function getDetailMeta(law: Record<string, unknown>, basicInfo: Record<string, unknown>) {
  const ministryNode = asRecord(basicInfo.소관부처);
  const categoryNode = asRecord(basicInfo.법종구분);

  return {
    ministry: compactText(String(ministryNode.content ?? basicInfo.소관부처명 ?? law.소관부처명 ?? law.소관부처 ?? "")),
    category: compactText(String(categoryNode.content ?? basicInfo.법종구분명 ?? law.법종구분 ?? law.법종구분명 ?? "")),
    promulgationDate: normalizeDateString(String(basicInfo.공포일자 ?? law.공포일자 ?? law.공포일 ?? "")),
    effectiveDate: normalizeDateString(String(basicInfo.시행일자 ?? law.시행일자 ?? law.시행일 ?? "")),
    status: toLawStatus(String(law.현행연혁코드명 ?? law.현행연혁코드 ?? basicInfo.현행연혁코드 ?? law.시행상태 ?? "")),
  };
}

function getDetailSummary(law: Record<string, unknown>) {
  const revisionReason = asRecord(law.제개정이유);

  return compactText(
    String(law.법령개요 ?? revisionReason.제개정이유내용 ?? revisionReason.content ?? ""),
  );
}

function asRecord(value: unknown) {
  return (value && typeof value === "object" ? (value as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
}

function toRecordArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.map(asRecord).filter((item) => Object.keys(item).length > 0);
  }

  const record = asRecord(value);

  return Object.keys(record).length > 0 ? [record] : [];
}

function toValueArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [value];
}

function normalizeSubItems(value: unknown): LawSubItem[] {
  const array = toRecordArray(value);

  return array.flatMap((item) => {
    const nestedItems = normalizeSubItems(
      item.목 ?? item.목단위 ?? item.호 ?? item.호단위 ?? item.세부 ?? item.children,
    );
    const text = compactText(String(item.목내용 ?? item.호내용 ?? item.항내용 ?? item.내용 ?? ""));

    if (!text) {
      return nestedItems;
    }

    const subItem = {
      label: compactText(
        String(item.목번호 ?? item.호번호 ?? item.항번호 ?? item.번호 ?? ""),
      ) || undefined,
      text,
      children: nestedItems.length > 0 ? nestedItems : undefined,
    } satisfies LawSubItem;

    return [subItem];
  });
}

function normalizeArticleClauses(article: Record<string, unknown>) {
  const rawClauses = article.항;

  return toRecordArray(rawClauses).flatMap((clause) => {
    const children = normalizeSubItems(clause.호 ?? clause.호단위 ?? clause.목);
    const text = compactText(String(clause.항내용 ?? clause.내용 ?? ""));

    if (!text) {
      return children;
    }

    const subItem = {
      label: compactText(String(clause.항번호 ?? clause.번호 ?? "")) || undefined,
      text,
      children: children.length > 0 ? children : undefined,
    } satisfies LawSubItem;

    return [subItem];
  });
}

function normalizeArticles(rawValue: unknown): LawArticle[] {
  const root = asRecord(rawValue);
  const units = toRecordArray(root.조문단위 ?? root.articleUnits ?? rawValue);
  const normalized = units.map((unit, index): LawArticle | undefined => {
    const text = compactText(String(unit.조문내용 ?? unit.내용 ?? ""));

    if (!text) {
      return undefined;
    }

    return {
      key: compactText(String(unit.조문키 ?? unit.id ?? `article-${index}`)),
      number: compactText(String(unit.조문번호 ?? "")) || undefined,
      title: compactText(String(unit.조문제목 ?? "")) || undefined,
      text,
      changed: compactText(String(unit.조문변경여부 ?? "")) === "Y",
      notes: compactText(String(unit.조문참고자료 ?? "")) || undefined,
      clauses: normalizeArticleClauses(unit),
    } satisfies LawArticle;
  });

  return normalized.filter((item): item is LawArticle => item !== undefined);
}

function normalizeSupplementaryProvisions(rawValue: unknown): SupplementaryProvision[] {
  const root = asRecord(rawValue);
  const units = toRecordArray(root.부칙단위 ?? rawValue);
  const normalized = units.map((unit, index): SupplementaryProvision | undefined => {
    const nestedParagraphs = toValueArray(unit.부칙내용)
      .flatMap((group) => toValueArray(group))
      .map((line) => compactText(String(line)))
      .filter(Boolean);

    if (nestedParagraphs.length === 0) {
      return undefined;
    }

    return {
      key: compactText(String(unit.부칙키 ?? `supplementary-${index}`)),
      title: nestedParagraphs[0] || compactText(String(unit.부칙제목 ?? "")) || undefined,
      promulgationDate: compactText(String(unit.부칙공포일자 ?? "")) || undefined,
      promulgationNumber: compactText(String(unit.부칙공포번호 ?? "")) || undefined,
      paragraphs: nestedParagraphs,
    } satisfies SupplementaryProvision;
  });

  return normalized.filter((item): item is SupplementaryProvision => item !== undefined);
}

async function fetchFromLawApi(
  endpoint: string,
  params: Record<string, string | number | undefined>,
  init?: RequestInit,
) {
  const credential = getApiCredential();

  if (!credential) {
    return null;
  }

  const url = new URL(endpoint);
  url.searchParams.set("OC", credential);
  url.searchParams.set("type", "JSON");

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    ...init,
    next: { revalidate: 60 },
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const error: ApiError = {
      code: "LAW_API_FAILED",
      message: "국가법령 Open API 호출에 실패했습니다.",
      details: `${response.status} ${response.statusText}`,
    };

    throw error;
  }

  return response.json();
}

export const getTopics = unstable_cache(
  async (): Promise<Topic[]> => ENVIRONMENT_TOPICS,
  ["environment-topics"],
  { revalidate: 3600 },
);

export async function searchLaws(filters: SearchFilters): Promise<SearchResult> {
  const query = compactText(filters.query);
  const credential = getApiCredential();

  if (!credential) {
    const items = applyFilters(MOCK_LAWS, filters);

    return {
      items,
      total: items.length,
      fromMock: true,
      warning: DEFAULT_WARNING,
    };
  }

  try {
    const payload = await fetchFromLawApi(LAW_SEARCH_ENDPOINT, {
      target: "eflaw",
      search: 1,
      query: query || "*",
      display: 50,
      page: 1,
      sort: filters.sort === "effectiveDate" ? "efdes" : "lasc",
      nw:
        filters.status === "현행"
          ? "3"
          : filters.status === "시행예정"
            ? "2"
            : filters.status === "연혁"
              ? "1"
              : undefined,
    });
    const normalized = applyFilters(normalizeSearchPayload(payload), filters);

    return {
      items: normalized,
      total: normalized.length,
      fromMock: false,
    };
  } catch (error) {
    const items = applyFilters(MOCK_LAWS, filters);

    return {
      items,
      total: items.length,
      fromMock: true,
      warning:
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "법령 검색 중 오류가 발생해 목업 데이터로 대체했습니다.",
    };
  }
}

export async function getTopicLaws(topicSlug: string) {
  const topic = getTopicBySlug(topicSlug);

  if (!topic) {
    return {
      topic: undefined,
      items: [] as LawSummary[],
      total: 0,
      fromMock: true,
      warning: "존재하지 않는 주제입니다.",
    };
  }

  const searchResult = await searchLaws({
    query: topic.keywords[0],
    topic: topicSlug,
    sort: "relevance",
  });

  return {
    topic,
    items: searchResult.items,
    total: searchResult.items.length,
    fromMock: searchResult.fromMock,
    warning: searchResult.warning,
  };
}

export async function getFeaturedLaws() {
  return MOCK_LAWS.slice(0, 4);
}

export async function getRecentLawUpdates() {
  return [...MOCK_LAWS]
    .sort((a, b) => (b.effectiveDate ?? "").localeCompare(a.effectiveDate ?? ""))
    .slice(0, 4);
}

export async function getLawDetail(id: string): Promise<{ item?: LawDetail; fromMock: boolean; warning?: string }> {
  const credential = getApiCredential();

  if (!credential) {
    return {
      item: getMockLawDetail(id),
      fromMock: true,
      warning: DEFAULT_WARNING,
    };
  }

  try {
    const payload = await fetchFromLawApi(LAW_DETAIL_ENDPOINT, {
      target: "law",
      ID: id,
    });
    const item = normalizeDetailPayload(payload);

    return {
      item: item ?? getMockLawDetail(id),
      fromMock: !item,
      warning: item ? undefined : "상세 응답을 해석하지 못해 목업 상세를 대신 표시했습니다.",
    };
  } catch (error) {
    return {
      item: getMockLawDetail(id),
      fromMock: true,
      warning:
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "법령 상세 조회 중 오류가 발생했습니다.",
    };
  }
}

export function getAvailableMinistries(items: LawSummary[]) {
  return ["전체", ...new Set(items.map((item) => item.ministry).filter(Boolean) as string[])];
}

export function getSearchWarning() {
  return getApiCredential() ? undefined : DEFAULT_WARNING;
}

function findLawByTitle(items: LawSummary[], title: string) {
  const exactMatches = items.filter((item) => compactText(item.title) === compactText(title));

  const exactCurrent = exactMatches.find((item) => item.status === "현행");

  if (exactCurrent) {
    return exactCurrent;
  }

  const exactMatch = exactMatches[0];

  if (exactMatch) {
    return exactMatch;
  }

  return items.find((item) => compactText(item.title).includes(compactText(title)));
}

export async function getFocusLaw(): Promise<{ item?: LawDetail; fromMock: boolean; warning?: string }> {
  const mockItem = getMockLawDetail("law-water-001");
  const credential = getApiCredential();

  if (!credential) {
    return {
      item: mockItem,
      fromMock: true,
      warning: DEFAULT_WARNING,
    };
  }

  try {
    const searchResult = await searchLaws({
      query: FOCUS_LAW_TITLE,
      sort: "relevance",
    });
    const matchedLaw = findLawByTitle(searchResult.items, FOCUS_LAW_TITLE);

    if (!matchedLaw) {
      return {
        item: mockItem,
        fromMock: true,
        warning: "물환경보전법을 실데이터에서 찾지 못해 목업 데이터를 대신 표시합니다.",
      };
    }

    const detailResult = await getLawDetail(matchedLaw.id);

    return {
      item: detailResult.item ?? mockItem,
      fromMock: detailResult.fromMock,
      warning: detailResult.warning,
    };
  } catch (error) {
    return {
      item: mockItem,
      fromMock: true,
      warning:
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "물환경보전법 조회 중 오류가 발생했습니다.",
    };
  }
}

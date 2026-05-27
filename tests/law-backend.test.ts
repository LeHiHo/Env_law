import test from "node:test";
import assert from "node:assert/strict";

import { parseDetailPayload } from "../lib/law/detail-parser";
import {
  createSupabaseLawRepository,
  type ArticleRow,
  type LawRow,
  type ProvisionRow,
  type SupabaseLawDatabase,
} from "../lib/law/repository";
import { createLawService } from "../lib/law/service";
import { parseSearchPayload } from "../lib/law/search-parser";
import type { LawApiClient } from "../lib/law/types";
import { normalizeDateString, toLawStatus } from "../lib/law/utils";
import { GET as searchRouteGet } from "../app/api/laws/search/route";

test("parseSearchPayload reads array response fields", () => {
  const items = parseSearchPayload({
    LawSearch: {
      law: [
        {
          법령명한글: "물환경보전법",
          소관부처명: "환경부",
          공포일자: "20260219",
          시행일자: "2027.02.20",
          현행연혁코드: "시행예정",
          법령일련번호: "283441",
          법령ID: "000166",
          법종구분명: "법률",
        },
      ],
    },
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "물환경보전법");
  assert.equal(items[0]?.id, "000166");
  assert.equal(items[0]?.mst, "283441");
  assert.equal(items[0]?.effectiveDate, "2027-02-20");
  assert.equal(items[0]?.status, "시행예정");
});

test("parseSearchPayload accepts singleton records and drops untitled records", () => {
  const items = parseSearchPayload({
    LawSearch: {
      law: {
        법령명한글: "대기환경보전법",
        소관부처명: "환경부",
        시행일자: "2026-01-01",
        현행연혁코드: "현행",
        법령ID: "001765",
      },
    },
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "대기환경보전법");
});

test("normalizes date and status variants", () => {
  assert.equal(normalizeDateString("20260219"), "2026-02-19");
  assert.equal(normalizeDateString("2026.2.9"), "2026-02-09");
  assert.equal(toLawStatus("2"), "시행예정");
  assert.equal(toLawStatus("연혁"), "연혁");
});

test("parseDetailPayload preserves article clause hierarchy and provisions", () => {
  const document = parseDetailPayload(buildDetailPayload());

  if (!document) {
    assert.fail("expected detail document");
  }

  assert.equal(document.articles.length, 2);
  assert.equal(document.effectiveDate, "2027-02-20");
  assert.equal(document.articles[1]?.clauses[0]?.text, "① 다음 각 호의 용어를 정의한다.");
  assert.equal(document.articles[1]?.clauses[0]?.children?.[0]?.children?.[0]?.text, "가. 세부 설명");
  assert.equal(document.supplementaryProvisions[0]?.paragraphs[0], "이 법은 공포 후 1년이 경과한 날부터 시행한다.");
});

test("service returns mock fallback without API credential", async () => {
  const service = createLawService({ client: emptyClient() });
  const result = await service.searchLaws({ query: "화학물질", status: "현행" });

  assert.equal(result.source, "mock");
  assert.equal(result.items[0]?.title, "화학물질관리법");
});

test("service stores API search results in repository", async () => {
  const service = createLawService({ client: fixtureClient() });
  const result = await service.searchLaws({ query: "물환경" });

  assert.equal(result.source, "api");
  assert.equal(result.items[0]?.id, "000166");
});

test("service merges cached search metadata into detail before storing", async () => {
  const database = new FakeSupabaseLawDatabase();
  const repository = createSupabaseLawRepository(database);
  const service = createLawService({ client: fixtureClient(), repository });

  await service.searchLaws({ query: "물환경" });
  const result = await service.getLawDetail("000166", "283441");

  assert.equal(result.item?.status, "시행예정");
  assert.equal(result.item?.mst, "283441");
  assert.equal(result.item?.effectiveDate, "2027-02-20");
  assert.equal(database.laws[0]?.status, "시행예정");
});

test("service falls back to MST detail lookup when ID returns empty", async () => {
  const service = createLawService({ client: mstFallbackClient() });
  const result = await service.getLawDetail("000166", "283441");

  assert.equal(result.source, "api");
  assert.equal(result.item?.title, "물환경보전법");
});

test("supabase repository persists summaries with topic links", async () => {
  const database = new FakeSupabaseLawDatabase();
  const repository = createSupabaseLawRepository(database);
  const items = parseSearchPayload(buildSearchPayload());

  await repository.upsertSearchRecords([{ item: items[0]!, raw: { fixture: true } }]);
  const results = await repository.search({ topic: "water" });

  assert.equal(database.laws.length, 1);
  assert.equal(database.topics.get("000166")?.[0], "water");
  assert.equal(results[0]?.title, "물환경보전법");
});

test("supabase repository replaces detail articles and provisions", async () => {
  const database = new FakeSupabaseLawDatabase();
  const repository = createSupabaseLawRepository(database);
  const detail = parseDetailPayload(buildDetailPayload());

  if (!detail) {
    assert.fail("expected detail document");
  }

  await repository.upsertDetail(detail, { raw: true });
  await repository.upsertDetail({ ...detail, articles: detail.articles.slice(0, 1) }, { raw: true });
  const cached = await repository.getDetail("000166");

  assert.equal(cached?.articles.length, 1);
  assert.equal(cached?.supplementaryProvisions.length, 1);
});

test("search route returns backend search result shape", async () => {
  const request = new Request("http://localhost/api/laws/search?q=화학물질&status=현행");
  const response = await searchRouteGet(request);
  const body = await response.json() as { source?: string; total?: number };

  assert.equal(response.status, 200);
  assert.equal(body.source, "mock");
  assert.equal(body.total, 1);
});

function emptyClient(): LawApiClient {
  return {
    search: async () => undefined,
    detailById: async () => undefined,
    detailByMst: async () => undefined,
  };
}

function fixtureClient(): LawApiClient {
  return {
    search: async () => buildSearchPayload(),
    detailById: async () => buildDetailPayload(),
    detailByMst: async () => undefined,
  };
}

function mstFallbackClient(): LawApiClient {
  return {
    search: async () => buildSearchPayload(),
    detailById: async () => undefined,
    detailByMst: async () => buildDetailPayload(),
  };
}

function buildSearchPayload(): unknown {
  return {
    LawSearch: {
      law: {
        법령명한글: "물환경보전법",
        소관부처명: "환경부",
        시행일자: "20270220",
        현행연혁코드: "시행예정",
        법령일련번호: "283441",
        법령ID: "000166",
      },
    },
  };
}

function buildDetailPayload(): unknown {
  return {
    법령: {
      기본정보: {
        법령명_한글: "물환경보전법",
        법령ID: "000166",
        공포일자: "20260219",
        시행일자: "20270220",
        소관부처: { content: "환경부" },
        법종구분: { content: "법률" },
      },
      조문: { 조문단위: buildArticleUnits() },
      부칙: {
        부칙단위: {
          부칙키: "supp-1",
          부칙공포일자: "20260219",
          부칙공포번호: "21368",
          부칙내용: [["이 법은 공포 후 1년이 경과한 날부터 시행한다."]],
        },
      },
    },
  };
}

function buildArticleUnits(): unknown[] {
  return [
    {
      조문키: "0001001",
      조문번호: "1",
      조문제목: "목적",
      조문내용: "제1조(목적) 물환경을 적정하게 관리ㆍ보전한다.",
    },
    {
      조문키: "0002001",
      조문번호: "2",
      조문제목: "정의",
      조문내용: "제2조(정의) 용어의 뜻은 다음과 같다.",
      항: {
        항번호: "1",
        항내용: "① 다음 각 호의 용어를 정의한다.",
        호: [{ 호번호: "1.", 호내용: "1. 물환경이란 수질과 수생태계를 말한다.", 목: [{ 목내용: "가. 세부 설명" }] }],
      },
    },
  ];
}

class FakeSupabaseLawDatabase implements SupabaseLawDatabase {
  laws: LawRow[] = [];
  articles: ArticleRow[] = [];
  provisions: ProvisionRow[] = [];
  topics = new Map<string, string[]>();

  async upsertLaws(rows: LawRow[]): Promise<void> {
    rows.forEach((row) => {
      this.laws = [...this.laws.filter((item) => item.id !== row.id), row];
    });
  }

  async replaceLawTopics(lawId: string, topicSlugs: string[]): Promise<void> {
    this.topics.set(lawId, topicSlugs);
  }

  async replaceArticles(lawId: string, rows: ArticleRow[]): Promise<void> {
    this.articles = [...this.articles.filter((row) => row.lawId !== lawId), ...rows];
  }

  async replaceSupplementaryProvisions(lawId: string, rows: ProvisionRow[]): Promise<void> {
    this.provisions = [...this.provisions.filter((row) => row.lawId !== lawId), ...rows];
  }

  async listLaws(): Promise<LawRow[]> {
    return this.laws.map((row) => ({ ...row, topicSlugs: this.topics.get(row.id) ?? [] }));
  }

  async getLaw(id: string): Promise<LawRow | undefined> {
    return this.withTopics(this.laws.find((row) => row.id === id));
  }

  async getLawByMst(mst: string): Promise<LawRow | undefined> {
    return this.withTopics(this.laws.find((row) => row.mst === mst));
  }

  async listArticles(lawId: string): Promise<ArticleRow[]> {
    return this.articles.filter((row) => row.lawId === lawId);
  }

  async listSupplementaryProvisions(lawId: string): Promise<ProvisionRow[]> {
    return this.provisions.filter((row) => row.lawId === lawId);
  }

  private withTopics(row: LawRow | undefined): LawRow | undefined {
    return row ? { ...row, topicSlugs: this.topics.get(row.id) ?? [] } : undefined;
  }
}

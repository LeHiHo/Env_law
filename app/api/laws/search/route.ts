import { createLawService } from "@/lib/law/service";
import type { LawStatus, SearchFilters } from "@/lib/law/types";

export async function GET(request: Request): Promise<Response> {
  const searchParams = new URL(request.url).searchParams;
  const service = createLawService();
  const result = await service.searchLaws(readSearchFilters(searchParams));

  return Response.json(result);
}

function readSearchFilters(searchParams: URLSearchParams): SearchFilters {
  return {
    query: searchParams.get("q") ?? undefined,
    topic: searchParams.get("topic") ?? undefined,
    ministry: searchParams.get("ministry") ?? undefined,
    status: readStatus(searchParams.get("status")),
    sort: readSort(searchParams.get("sort")),
  };
}

function readStatus(value: string | null): SearchFilters["status"] {
  const allowed: Array<LawStatus | "전체"> = ["현행", "시행예정", "연혁", "전체"];
  return allowed.find((status) => status === value);
}

function readSort(value: string | null): SearchFilters["sort"] {
  return value === "effectiveDate" ? "effectiveDate" : "relevance";
}

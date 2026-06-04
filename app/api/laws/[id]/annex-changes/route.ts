import { createLawService, parseAnnexTypeFilter } from "@/lib/law/service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  const searchParams = new URL(request.url).searchParams;
  const service = createLawService();

  return Response.json(
    await service.listAnnexChanges(
      params.id,
      searchParams.get("fromMst") ?? undefined,
      searchParams.get("toMst") ?? undefined,
      parseAnnexTypeFilter(searchParams.get("type")),
    ),
  );
}

export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  const service = createLawService();

  return Response.json(await service.computeAnnexChanges(params.id));
}

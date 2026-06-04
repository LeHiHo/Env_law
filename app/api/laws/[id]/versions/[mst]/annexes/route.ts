import { createLawService, parseAnnexTypeFilter } from "@/lib/law/service";

type RouteContext = {
  params: Promise<{
    id: string;
    mst: string;
  }>;
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  const searchParams = new URL(request.url).searchParams;
  const service = createLawService();

  return Response.json(await service.listVersionAnnexes(params.id, params.mst, parseAnnexTypeFilter(searchParams.get("type"))));
}

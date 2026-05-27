import { createLawService } from "../../../../lib/law/service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const searchParams = new URL(request.url).searchParams;
  const params = await context.params;
  const service = createLawService();
  const result = await service.getLawDetail(params.id, searchParams.get("mst") ?? undefined);

  return Response.json(result, { status: result.item ? 200 : 404 });
}

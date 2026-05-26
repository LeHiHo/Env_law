import { createLawService } from "../../../../lib/law/service";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const searchParams = new URL(request.url).searchParams;
  const service = createLawService();
  const result = await service.getLawDetail(context.params.id, searchParams.get("mst") ?? undefined);

  return Response.json(result, { status: result.item ? 200 : 404 });
}

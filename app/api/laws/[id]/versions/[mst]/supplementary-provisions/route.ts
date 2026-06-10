import { createLawService } from "@/lib/law/service";

type RouteContext = {
  params: Promise<{
    id: string;
    mst: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  const service = createLawService();

  return Response.json(await service.listVersionSupplementaryProvisions(params.id, params.mst));
}

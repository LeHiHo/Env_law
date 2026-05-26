import { ENVIRONMENT_TOPICS } from "../../../lib/law/topics";

export async function GET(): Promise<Response> {
  return Response.json({ items: ENVIRONMENT_TOPICS });
}

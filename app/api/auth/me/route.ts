import { requireSession } from "../../../../lib/auth";
import { route } from "../../../../lib/api";

export async function GET(request: Request) {
  return route(async () => ({ user: await requireSession(request) }));
}

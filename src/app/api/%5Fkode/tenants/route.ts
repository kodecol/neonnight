import { kodeHandler } from "../_shared";

export const dynamic = "force-dynamic";

/** GET /api/_kode/tenants → {ok, tenants:[…]} */
export async function GET(req: Request) {
  return kodeHandler(req, (admin) => admin.list());
}

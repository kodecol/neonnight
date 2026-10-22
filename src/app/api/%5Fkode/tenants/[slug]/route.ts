import { kodeHandler } from "../../_shared";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

/** PUT /api/_kode/tenants/:slug → crea o actualiza la demo (brand:apply, seed al crear, contraseña). */
export async function PUT(req: Request, { params }: Ctx) {
  const { slug } = await params;
  return kodeHandler(req, (admin, body) => admin.upsert(slug, JSON.parse(body)));
}

/** DELETE /api/_kode/tenants/:slug → borra la base, los medios `demos/<slug>/` y el registro. */
export async function DELETE(req: Request, { params }: Ctx) {
  const { slug } = await params;
  return kodeHandler(req, (admin) => admin.delete(slug));
}

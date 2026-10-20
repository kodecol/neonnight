import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, adminSecret, verifySessionToken } from "@/infrastructure/auth/session";

/** Protege /admin: sin sesión válida, todo redirige al login. */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secret = adminSecret();
  const authed = secret ? await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value, secret) : false;

  if (pathname === "/admin/login") {
    return authed ? NextResponse.redirect(new URL("/admin/catalogo", req.url)) : NextResponse.next();
  }
  if (!authed) return NextResponse.redirect(new URL("/admin/login", req.url));
  if (pathname === "/admin" || pathname === "/admin/") return NextResponse.redirect(new URL("/admin/catalogo", req.url));
  return NextResponse.next();
}

// Las server actions (cabecera `next-action`) no pasan por aquí: en producción el middleware
// clona el cuerpo y descarta las partes de archivo del multipart (las fotos llegaban vacías).
// Siguen protegidas: cada action llama a requireAdmin() y el layout del panel también.
// (Next exige que `config` sea un literal estático: sin constantes.)

export const config = {
  matcher: [
    { source: "/admin", missing: [{ type: "header", key: "next-action" }] },
    { source: "/admin/:path*", missing: [{ type: "header", key: "next-action" }] },
  ],
  // Node: lee ADMIN_SECRET en runtime (no en build) al autoalojar.
  runtime: "nodejs",
};

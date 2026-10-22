import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, adminSecret, verifySessionToken } from "@/infrastructure/auth/session";

/**
 * Protege /admin: sin sesión firmada y vigente, todo redirige al login. Aquí no
 * hay base, así que la versión de sesión la comprueba el servidor (isAdmin): por
 * eso el login no redirige al panel por su cuenta (una cookie de versión vieja
 * rebotaría entre los dos); lo decide la propia página de login.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Demo host: la clave de sesión es de cada tenant y aquí no hay tenant; cada
  // página y action del panel verifica la sesión con la suya (requireAdmin).
  if (process.env.TENANCY === "multi") {
    return pathname === "/admin" || pathname === "/admin/" ? NextResponse.redirect(new URL("/admin/catalogo", req.url)) : NextResponse.next();
  }
  const secret = adminSecret();
  const authed = secret ? await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value, secret) : false;

  if (pathname === "/admin/login") return NextResponse.next();
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

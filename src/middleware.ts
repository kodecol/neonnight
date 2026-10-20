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

export const config = {
  matcher: ["/admin", "/admin/:path*"],
  // Node: lee ADMIN_SECRET en runtime (no en build) al autoalojar.
  runtime: "nodejs",
};

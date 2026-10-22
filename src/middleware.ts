import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, adminSecret, verifySessionToken } from "@/infrastructure/auth/session";

/**
 * - Single: protege /admin. Sin sesión firmada y vigente, todo redirige al
 *   login. Aquí no hay base, así que la versión de sesión la comprueba el
 *   servidor (isAdmin): por eso el login no redirige al panel por su cuenta.
 *   El resto de rutas pasa sin tocar nada.
 * - Multi (demo host): la clave de sesión es de cada tenant y aquí no hay
 *   tenant; cada página y action del panel verifica la sesión con la suya.
 *   Aquí va el freno a picos de una demo, que comparte servidor con la tienda
 *   real: por IP y host, y por host.
 */
const WINDOW_MS = 60_000;
const PER_IP_HOST = 240;
const PER_HOST = 1200;

const g = globalThis as unknown as { __nnRate?: Map<string, { n: number; start: number }> };
const counters = (g.__nnRate ??= new Map());

/** true si la clave pasó su tope en la ventana actual. */
function over(key: string, max: number, now: number): boolean {
  const c = counters.get(key);
  if (!c || now - c.start >= WINDOW_MS) {
    counters.set(key, { n: 1, start: now });
    if (counters.size > 20_000) for (const [k, v] of counters) if (now - v.start >= WINDOW_MS) counters.delete(k);
    return false;
  }
  c.n++;
  return c.n > max;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");

  if (process.env.TENANCY === "multi") {
    if (!pathname.startsWith("/api/_kode/") && !pathname.startsWith("/api/health")) {
      const host = (req.headers.get("host") ?? "").toLowerCase();
      const ip = req.headers.get("x-real-ip")?.trim() || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocida";
      const now = Date.now();
      if (over(`h:${host}`, PER_HOST, now) || over(`i:${host}|${ip}`, PER_IP_HOST, now)) {
        return new NextResponse("Demasiadas solicitudes. Intenta de nuevo en un minuto.", { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
      }
    }
    return pathname === "/admin" || pathname === "/admin/" ? NextResponse.redirect(new URL("/admin/catalogo", req.url)) : NextResponse.next();
  }

  if (!isAdminPath) return NextResponse.next();
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
    // Resto del sitio (para el freno del demo host), sin estáticos ni imágenes optimizadas.
    { source: "/((?!admin|_next/static|_next/image|assets/|favicon.ico).*)", missing: [{ type: "header", key: "next-action" }] },
  ],
  // Node: lee ADMIN_SECRET en runtime (no en build) al autoalojar.
  runtime: "nodejs",
};

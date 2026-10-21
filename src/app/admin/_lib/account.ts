import { cookies, headers } from "next/headers";
import { getContainer } from "@/infrastructure/container";
import { checkAdminPassword } from "@/infrastructure/auth/password";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken } from "@/infrastructure/auth/session";
import { AdminAccount } from "@/application/use-cases/admin/account";

export function adminAccount(): AdminAccount {
  const { adminCredentials, passwordHasher, clock, loginThrottles } = getContainer();
  return new AdminAccount({ credentials: adminCredentials, hasher: passwordHasher, clock, checkEnvPassword: (p) => checkAdminPassword(p), throttles: loginThrottles });
}

/**
 * IP del cliente. Detrás del proxy inverso (nginx-proxy-manager) llega en
 * X-Real-IP / X-Forwarded-For; el contenedor no se expone directo a internet.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocida";
}

/** Emite (o reemite) la cookie de sesión con la versión vigente. */
export async function setSessionCookie(secret: string, version: number): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(secret, version), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: SESSION_TTL_SECONDS,
  });
}

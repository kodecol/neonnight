/**
 * Credenciales del único administrador, guardadas en la base (`settings/admin`).
 * Mientras no exista el documento, la contraseña es la de `ADMIN_PASSWORD`
 * (arranque); el primer cambio desde el panel la pasa a la base, con hash.
 */
export interface AdminCredentials {
  /**
   * `scrypt$N$r$p$sal$hash` (ver infrastructure/auth/password.ts). null = sigue
   * valiendo `ADMIN_PASSWORD` (p. ej. se cerraron las sesiones sin cambiarla).
   */
  readonly passwordHash: string | null;
  /**
   * Versión de sesión: va firmada dentro de la cookie. Subirla invalida todas
   * las sesiones abiertas (cambio de contraseña, "cerrar todas las sesiones").
   */
  readonly sessionVersion: number;
  readonly passwordChangedAt: Date | null;
}

export interface AdminCredentialsRepository {
  /** null = todavía no se cambió desde el panel: vale `ADMIN_PASSWORD`, versión 0. */
  get(): Promise<AdminCredentials | null>;
  save(credentials: AdminCredentials): Promise<void>;
}

/** Hash de contraseñas. La implementación (scrypt) vive en infraestructura. */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, stored: string): Promise<boolean>;
}

/**
 * Freno a la fuerza bruta del login. Va dentro de la server action (no en el
 * middleware, que las actions se saltan). En memoria: una instancia por cliente.
 */
export interface LoginThrottle {
  /** Segundos que faltan para volver a intentar; 0 = puede intentar. */
  retryAfter(key: string, nowMs: number): number;
  fail(key: string, nowMs: number): void;
  reset(key: string): void;
}

import type { Clock } from "../../ports/clock";
import type { AdminCredentials, AdminCredentialsRepository, LoginThrottle, PasswordHasher } from "../../ports/admin-credentials";
import { FieldValidationError } from "../../lib/errors";
import { ChangePasswordInputSchema, type AccountView } from "../../dto/account.dto";

const GLOBAL_KEY = "*";

export type LoginResult = { ok: true; version: number } | { ok: false; reason: "invalid" } | { ok: false; reason: "throttled"; retryAfter: number };

interface Deps {
  credentials: AdminCredentialsRepository;
  hasher: PasswordHasher;
  clock: Clock;
  /** Contraseña de arranque (ADMIN_PASSWORD): vale mientras no haya hash en la base. */
  checkEnvPassword: (plain: string) => boolean;
  throttles: { perIp: LoginThrottle; global: LoginThrottle };
}

/**
 * Cuenta del único administrador: login con freno a la fuerza bruta, cambio de
 * contraseña y cierre de todas las sesiones (sube la versión de sesión).
 */
export class AdminAccount {
  constructor(private readonly deps: Deps) {}

  private async verify(plain: string, stored: AdminCredentials | null): Promise<boolean> {
    if (stored?.passwordHash) return this.deps.hasher.verify(plain, stored.passwordHash);
    return this.deps.checkEnvPassword(plain);
  }

  async sessionVersion(): Promise<number> {
    return (await this.deps.credentials.get())?.sessionVersion ?? 0;
  }

  async view(): Promise<AccountView> {
    const c = await this.deps.credentials.get();
    return { stored: Boolean(c?.passwordHash), passwordChangedAt: c?.passwordChangedAt?.toISOString() ?? null, sessionVersion: c?.sessionVersion ?? 0 };
  }

  async login(password: string, ip: string): Promise<LoginResult> {
    const { perIp, global } = this.deps.throttles;
    const now = this.deps.clock.now().getTime();
    const wait = Math.max(perIp.retryAfter(ip, now), global.retryAfter(GLOBAL_KEY, now));
    if (wait > 0) return { ok: false, reason: "throttled", retryAfter: wait };

    const stored = await this.deps.credentials.get();
    if (!password || !(await this.verify(password, stored))) {
      perIp.fail(ip, now);
      global.fail(GLOBAL_KEY, now);
      return { ok: false, reason: "invalid" };
    }
    perIp.reset(ip);
    return { ok: true, version: stored?.sessionVersion ?? 0 };
  }

  /** Cambia la contraseña e invalida las demás sesiones. Devuelve la versión nueva. */
  async changePassword(raw: unknown): Promise<number> {
    const input = ChangePasswordInputSchema.parse(raw);
    if (input.next !== input.confirm) throw new FieldValidationError("confirm", "No coincide con la contraseña nueva.");
    const stored = await this.deps.credentials.get();
    if (!(await this.verify(input.current, stored))) throw new FieldValidationError("current", "La contraseña actual no es correcta.");
    if (input.next === input.current) throw new FieldValidationError("next", "Debe ser distinta de la actual.");
    const version = (stored?.sessionVersion ?? 0) + 1;
    await this.deps.credentials.save({ passwordHash: await this.deps.hasher.hash(input.next), sessionVersion: version, passwordChangedAt: this.deps.clock.now() });
    return version;
  }

  /** Cierra todas las sesiones abiertas (también la actual, que se reemite). */
  async revokeAllSessions(): Promise<number> {
    const stored = await this.deps.credentials.get();
    const version = (stored?.sessionVersion ?? 0) + 1;
    await this.deps.credentials.save({ passwordHash: stored?.passwordHash ?? null, sessionVersion: version, passwordChangedAt: stored?.passwordChangedAt ?? null });
    return version;
  }
}

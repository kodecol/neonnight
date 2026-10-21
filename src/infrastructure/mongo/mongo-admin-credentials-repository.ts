import type { AdminCredentials, AdminCredentialsRepository } from "@/application/ports/admin-credentials";
import type { DbProvider } from "./client";

interface AdminDoc {
  _id: "admin";
  passwordHash: string | null;
  sessionVersion: number;
  passwordChangedAt: Date | null;
  updatedAt: Date;
}

/** `settings/admin`: hash de la contraseña y versión de sesión del administrador. */
export class MongoAdminCredentialsRepository implements AdminCredentialsRepository {
  constructor(private readonly db: DbProvider) {}

  private async col() {
    return (await this.db()).collection<AdminDoc>("settings");
  }

  async get(): Promise<AdminCredentials | null> {
    const d = await (await this.col()).findOne({ _id: "admin" });
    return d ? { passwordHash: d.passwordHash ?? null, sessionVersion: d.sessionVersion ?? 0, passwordChangedAt: d.passwordChangedAt ?? null } : null;
  }

  async save(c: AdminCredentials): Promise<void> {
    const doc: AdminDoc = { _id: "admin", passwordHash: c.passwordHash, sessionVersion: c.sessionVersion, passwordChangedAt: c.passwordChangedAt, updatedAt: new Date() };
    await (await this.col()).replaceOne({ _id: "admin" }, doc, { upsert: true });
  }
}

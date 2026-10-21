import type { AdminCredentials, AdminCredentialsRepository } from "@/application/ports/admin-credentials";

export class InMemoryAdminCredentialsRepository implements AdminCredentialsRepository {
  constructor(private credentials: AdminCredentials | null = null) {}

  async get(): Promise<AdminCredentials | null> {
    return this.credentials;
  }

  async save(credentials: AdminCredentials): Promise<void> {
    this.credentials = credentials;
  }
}

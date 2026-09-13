import type { SiteContent } from "@/application/dto/site-content.dto";
import type { SiteContentRepository } from "@/application/ports/site-content-repository";
import { SITE_CONTENT } from "./site-content";

export class StaticSiteContentRepository implements SiteContentRepository {
  constructor(private readonly content: SiteContent = SITE_CONTENT) {}
  async get(): Promise<SiteContent> {
    return this.content;
  }
}

import type { SiteContent } from "../dto/site-content.dto";

export interface SiteContentRepository {
  get(): Promise<SiteContent>;
}

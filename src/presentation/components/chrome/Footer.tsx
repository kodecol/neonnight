import Link from "next/link";
import type { LinkItem, SiteContent } from "@/application/dto/site-content.dto";
import { fill } from "@/application/lib/template";
import { Isotype } from "@/presentation/components/primitives/Isotype";
import { SocialIcon } from "@/presentation/components/primitives/SocialIcon";
import { CookieSettingsButton } from "./ConsentBanner";

const linkCls = "text-ink-2 transition-colors hover:text-ink";

function FooterLink({ link, whatsappUrl }: { link: LinkItem; whatsappUrl: string | null }) {
  // El enlace especial "whatsapp" se resuelve con el número configurado.
  if (link.href === "whatsapp") {
    return whatsappUrl ? (
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={linkCls}>
        {link.label}
      </a>
    ) : (
      <span className="text-ink-3">{link.label} (pendiente)</span>
    );
  }
  return link.external ? (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkCls}>
      {link.label}
    </a>
  ) : (
    <Link href={link.href} className={linkCls}>
      {link.label}
    </Link>
  );
}

export function Footer({
  content,
  brand,
  company,
  networks,
  whatsappUrl,
  trackingEnabled,
}: {
  content: SiteContent["footer"];
  brand: SiteContent["brand"];
  company: SiteContent["company"];
  networks: SiteContent["social"]["networks"];
  whatsappUrl: string | null;
  /** Solo con medición configurada hay preferencias de cookies que cambiar. */
  trackingEnabled: boolean;
}) {
  return (
    <footer className="border-t border-divider px-page pb-28 pt-20 md:pb-32" data-testid="site-footer">
      <div className="grid gap-14 md:grid-cols-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div className="flex max-w-[360px] flex-col gap-7 md:col-span-3 lg:col-span-1">
          <Link href="/" className="group flex w-fit items-center gap-5" aria-label={`${brand.name}, inicio`}>
            <Isotype size={64} className="transition-transform duration-500 ease-[var(--ease-reveal)] group-hover:-rotate-6" />
            <span className="text-[20px] font-semibold uppercase leading-none tracking-[0.32em]">{brand.wordmark}</span>
          </Link>
          <p className="m-0 text-meta text-ink-2 [text-wrap:pretty]">{brand.tagline}</p>
          <ul className="m-0 flex list-none gap-2 p-0" aria-label="Redes sociales">
            {networks.map((n) => (
              <li key={n.id}>
                <a
                  href={n.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={n.label}
                  className="flex h-10 w-10 items-center justify-center border border-divider text-ink-2 transition-colors hover:border-accent hover:text-ink"
                >
                  <SocialIcon id={n.id} className="h-[18px] w-[18px]" />
                </a>
              </li>
            ))}
          </ul>
        </div>
        {content.columns.map((col) => (
          <nav key={col.title} className="flex flex-col gap-3.5 text-meta" aria-label={col.title}>
            <span className="mb-1.5 text-label uppercase text-ink-3">{col.title}</span>
            {col.links.map((l) => (
              <FooterLink key={l.label} link={l} whatsappUrl={whatsappUrl} />
            ))}
          </nav>
        ))}
      </div>

      <div className="mt-16 flex flex-col gap-5 border-t border-divider pt-6 text-legal text-ink-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <span>{fill(content.copyrightTemplate, { year: new Date().getFullYear() })}</span>
          <span>{fill(content.registryTemplate, { tradeName: company.tradeName, number: company.registry.number, chamber: company.registry.chamber, city: company.city })}</span>
        </div>
        <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
          {content.legalLinks.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:text-ink">
                {l.label}
              </Link>
            </li>
          ))}
          {trackingEnabled && (
            <li>
              <CookieSettingsButton label={content.cookieSettings} />
            </li>
          )}
          <li>
            <a href={content.authority.href} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
              {content.authority.label}
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}

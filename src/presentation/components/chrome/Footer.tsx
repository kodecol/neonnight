import Link from "next/link";
import type { SiteContent } from "@/application/dto/site-content.dto";
import { fill } from "@/application/lib/template";
import { Isotype } from "@/presentation/components/primitives/Isotype";

const linkCls = "text-ink-2 hover:text-ink";

export function Footer({ content, tagline, whatsappUrl }: { content: SiteContent["footer"]; tagline: string; whatsappUrl: string | null }) {
  return (
    <footer className="border-t border-divider px-page pb-10 pt-20" id="showroom">
      <div className="flex flex-wrap justify-between gap-14">
        <div className="flex max-w-[280px] flex-col gap-[22px]">
          <Isotype size={52} />
          <p className="m-0 text-meta text-ink-2 [text-wrap:pretty]">{tagline}</p>
        </div>
        {content.columns.map((col) => (
          <div key={col.title} className="flex flex-col gap-3.5 text-meta">
            <span className="mb-1.5 text-label uppercase text-ink-3">{col.title}</span>
            {col.links.map((l) => {
              // El enlace especial "whatsapp" se resuelve con el número configurado.
              if (l.href === "whatsapp") {
                return whatsappUrl ? (
                  <a key={l.label} href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={linkCls}>
                    {l.label}
                  </a>
                ) : (
                  <span key={l.label} className="text-ink-3">
                    {l.label} (pendiente)
                  </span>
                );
              }
              return l.external ? (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className={linkCls}>
                  {l.label}
                </a>
              ) : (
                <Link key={l.label} href={l.href} className={linkCls}>
                  {l.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-16 flex flex-wrap justify-between gap-6 border-t border-divider pt-6 text-legal text-ink-3">
        <span>{fill(content.copyrightTemplate, { year: new Date().getFullYear() })}</span>
        <span>{content.legal}</span>
      </div>
    </footer>
  );
}

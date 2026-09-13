import Link from "next/link";
import { Isotype } from "@/presentation/components/primitives/Isotype";
import { ROUTES, SITE_TAGLINE } from "@/presentation/lib/site";

function Col({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5 text-meta">
      <span className="mb-1.5 text-label uppercase text-ink-3">{title}</span>
      {children}
    </div>
  );
}

const linkCls = "text-ink-2 hover:text-ink";

export function Footer({ whatsappUrl, instagramUrl }: { whatsappUrl: string | null; instagramUrl: string }) {
  return (
    <footer className="border-t border-divider px-page pb-10 pt-20" id="showroom">
      <div className="flex flex-wrap justify-between gap-14">
        <div className="flex max-w-[280px] flex-col gap-[22px]">
          <Isotype size={52} />
          <p className="m-0 text-meta text-ink-2 [text-wrap:pretty]">{SITE_TAGLINE}</p>
        </div>
        <Col title="Comprar">
          <Link href={ROUTES.collection} className={linkCls}>
            Colección
          </Link>
          <Link href={`${ROUTES.collection}?orden=novedades`} className={linkCls}>
            Novedades
          </Link>
          <span className="text-ink-3">Financiación</span>
        </Col>
        <Col title="Confianza">
          <Link href="/#autenticidad" className={linkCls}>
            Autenticidad
          </Link>
          <Link href="/#autenticidad" className={linkCls}>
            Garantía
          </Link>
          <Link href="/#autenticidad" className={linkCls}>
            Envíos y devoluciones
          </Link>
        </Col>
        <Col title="Contacto">
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={linkCls}>
              WhatsApp
            </a>
          ) : (
            <span className="text-ink-3">WhatsApp (pendiente)</span>
          )}
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={linkCls}>
            Instagram
          </a>
          <span className="text-ink-2">Showroom Bogotá</span>
        </Col>
      </div>
      <div className="mt-16 flex flex-wrap justify-between gap-6 border-t border-divider pt-6 text-legal text-ink-3">
        <span>© {new Date().getFullYear()} Neon Night</span>
        <span>Términos · Privacidad · Cambios y devoluciones</span>
      </div>
    </footer>
  );
}

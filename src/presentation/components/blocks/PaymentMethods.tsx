import Image from "next/image";
import type { PaymentLogo, SiteContent } from "@/application/dto/site-content.dto";
import { Button } from "@/presentation/components/primitives/Button";
import { Kicker } from "@/presentation/components/primitives/Kicker";
import { BoldLogo } from "@/presentation/components/primitives/BoldLogo";

/** Área visual común (px²): iguala el peso óptico entre logos cuadrados y apaisados. */
const LOGO_AREA = 1800;

function Logo({ item }: { item: PaymentLogo }) {
  if (!item.logo) {
    return <span className="text-[22px] font-semibold uppercase tracking-[0.04em] text-ink transition-colors duration-500 group-hover:text-[#E2231A]">{item.name}</span>;
  }
  const { src, ratio, mono = "silhouette", round, scale = 1 } = item.logo;
  const h = Math.round(Math.sqrt(LOGO_AREA / ratio) * scale);
  const w = Math.round(h * ratio);
  return (
    <Image
      src={src}
      alt={item.name}
      width={w}
      height={h}
      unoptimized={src.endsWith(".svg")}
      data-mono={mono}
      className="nn-logo"
      style={{ width: w, height: h, clipPath: round ? "circle(49%)" : undefined }}
    />
  );
}

/**
 * Métodos de pago: textos a la izquierda y un muro de logos oficiales a la
 * derecha. En reposo, monocromos; al pasar el cursor la celda se vuelve blanca
 * y el logo aparece a color (así los logos oscuros se leen bien).
 */
export function PaymentMethods({ content, whatsappUrl }: { content: SiteContent["home"]["payments"]; whatsappUrl: string | null }) {
  return (
    <section id="pagos" className="border-b border-divider px-page py-section" data-reveal="1" aria-labelledby="payments-title">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-20">
        <div className="flex flex-col">
          <Kicker as="p" className="m-0">
            {content.kicker}
          </Kicker>
          <h2 id="payments-title" className="mb-5 mt-5 text-h2-fluid uppercase">
            {content.title}
          </h2>
          <p className="m-0 max-w-[40ch] text-lead text-ink-2 [text-wrap:pretty]">{content.body}</p>
          <ul className="m-0 mt-10 flex list-none flex-col gap-3.5 p-0">
            {content.assurances.map((a) => (
              <li key={a} className="flex items-center gap-3.5 text-label uppercase text-ink">
                <span className="h-1.5 w-1.5 shrink-0 bg-accent" aria-hidden="true" />
                {a}
              </li>
            ))}
          </ul>
          {whatsappUrl && (
            <div className="mt-10 lg:mt-auto lg:pt-10">
              <Button href={whatsappUrl} variant="link" target="_blank" rel="noopener noreferrer">
                {content.whatsappCta}
              </Button>
            </div>
          )}
        </div>

        <div className="self-start">
          <a
            href="https://bold.co"
            target="_blank"
            rel="noopener noreferrer"
            className="group mb-6 flex items-center gap-5"
            aria-label="Pagos procesados por Bold (abre bold.co en una pestaña nueva)"
          >
            <span className="text-label uppercase text-ink-2 transition-colors duration-500 group-hover:text-ink">{content.processedBy}</span>
            <BoldLogo className="h-[22px] text-ink" />
            <span className="h-px flex-1 bg-divider" aria-hidden="true" />
          </a>
          <ul className="m-0 grid list-none grid-cols-2 gap-px border border-divider bg-divider p-0 md:grid-cols-4" data-testid="payment-methods">
            {content.logos.map((item) => (
              <li
                key={item.name}
                className="nn-logo-host group relative flex flex-col items-center justify-center gap-6 bg-bg px-3 py-10 transition-colors duration-500 hover:bg-ink md:aspect-[4/5] md:py-0"
              >
                <span className="flex h-12 items-center justify-center">
                  <Logo item={item} />
                </span>
                <span className="text-center text-label-sm uppercase text-ink-2 transition-colors duration-500 group-hover:text-bg md:absolute md:inset-x-3 md:bottom-5">
                  {item.caption}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

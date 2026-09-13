import { Kicker } from "@/presentation/components/primitives/Kicker";

const ITEMS = [
  { n: "01", title: "Verificación en mano", body: "Revisión de calibre, número de serie y caja antes de despachar. Informe fotográfico incluido." },
  { n: "02", title: "Garantía de 24 meses", body: "Cobertura de movimiento y hermeticidad, con servicio en Colombia." },
  { n: "03", title: "Devolución en 10 días", body: "Si la pieza no es lo que esperabas, la recogemos y devolvemos el pago completo.", accent: true },
];

export function TrustColumns() {
  return (
    <section id="autenticidad" className="border-b border-divider px-page py-section" data-reveal="1" aria-labelledby="trust-kicker">
      <Kicker as="p" className="m-0">
        <span id="trust-kicker">Garantía y autenticidad</span>
      </Kicker>
      <div className="mt-14 grid grid-cols-1 gap-12 md:grid-cols-3">
        {ITEMS.map((it) => (
          <div key={it.n} className={it.accent ? "border-t-2 border-accent pt-6" : "border-t-2 border-ink pt-6"}>
            <div className={it.accent ? "text-number text-accent" : "text-number"}>{it.n}</div>
            <h3 className="mb-3 mt-[18px] text-h3 uppercase">{it.title}</h3>
            <p className="m-0 text-body text-ink-2 [text-wrap:pretty]">{it.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

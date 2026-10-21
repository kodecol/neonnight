import Link from "next/link";
import type { LegalPageRowDto, LegalStatus } from "@/application/dto/legal.dto";
import { cn } from "@/presentation/lib/cn";

const STATUS: Record<LegalStatus, { label: string; tone: string }> = {
  fabrica: { label: "Texto de fábrica", tone: "border-border text-ink-3" },
  publicado: { label: "Publicado", tone: "border-ink text-ink" },
  borrador: { label: "Borrador sin publicar", tone: "border-accent text-accent" },
};

const formatDate = (iso: string) =>
  iso ? new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)) : "—";

/** Lista de páginas legales con su estado, versión y vigencia. */
export function LegalPagesTable({ rows }: { rows: LegalPageRowDto[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-px border border-divider bg-divider p-0" data-testid="legal-pages">
      {rows.map((r) => (
        <li key={r.slug}>
          <Link href={`/admin/legales/${r.slug}`} className="group flex flex-wrap items-center justify-between gap-4 bg-bg px-5 py-4 transition-colors hover:bg-surface" data-testid={`legal-${r.slug}`}>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-label-lg uppercase text-ink group-hover:text-accent">{r.title}</span>
              <span className="text-legal text-ink-3">/{r.slug}</span>
            </span>
            <span className="flex items-center gap-5">
              <span className={cn("border px-2 py-1 text-label-sm uppercase", STATUS[r.status].tone)}>{STATUS[r.status].label}</span>
              <span className="w-36 text-right text-legal text-ink-2">
                v{r.version} · {formatDate(r.effective)}
              </span>
              <span aria-hidden="true" className="text-ink-3 transition-transform group-hover:translate-x-1 group-hover:text-accent">
                →
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

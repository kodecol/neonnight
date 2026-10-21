import type { InfoBlock } from "@/application/dto/info-page.dto";
import { RichText } from "@/presentation/components/primitives/RichText";
import { cn } from "@/presentation/lib/cn";

/** Bloques de contenido de las páginas institucionales (ver `InfoBlock`). */
/** `label`: el título de la sección, que nombra sus tablas (cada región con un nombre distinto). */
export function InfoBlocks({ blocks, editorial = false, label }: { blocks: InfoBlock[]; editorial?: boolean; label: string }) {
  const tables = blocks.filter((b) => b.type === "table").length;
  const tableLabel = (i: number) => (tables > 1 ? `${label} (tabla ${blocks.slice(0, i + 1).filter((b) => b.type === "table").length})` : label);
  return (
    <div className="flex flex-col gap-6">
      {blocks.map((b, i) => (
        <Block key={i} block={b} editorial={editorial} tableLabel={tableLabel(i)} />
      ))}
    </div>
  );
}

function Block({ block, editorial, tableLabel }: { block: InfoBlock; editorial: boolean; tableLabel: string }) {
  switch (block.type) {
    case "p":
      return (
        <p className={cn("m-0 text-ink-2 [text-wrap:pretty]", editorial ? "text-lead" : "text-body")}>
          <RichText text={block.text} />
        </p>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className="m-0 flex list-none flex-col gap-3 p-0">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-4 text-body text-ink-2 [text-wrap:pretty]">
              {block.ordered ? (
                <span className="w-6 shrink-0 text-label tabular-nums leading-[26px] text-accent">{String(i + 1).padStart(2, "0")}</span>
              ) : (
                <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 bg-accent" />
              )}
              <span>
                <RichText text={item} />
              </span>
            </li>
          ))}
        </Tag>
      );
    }
    case "steps":
      return (
        <ol className={cn("m-0 grid list-none gap-px border border-divider bg-divider p-0", editorial ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2")}>
          {block.items.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-3 bg-bg p-6 md:p-7">
              <span className="text-number tabular-nums text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-label-lg uppercase text-ink">{s.title}</span>
              <span className="text-small text-ink-2 [text-wrap:pretty]">
                <RichText text={s.body} />
              </span>
            </li>
          ))}
        </ol>
      );
    case "table":
      return (
        <div className="overflow-x-auto border border-divider" role="region" aria-label={tableLabel} tabIndex={0}>
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr>
                {block.head.map((h) => (
                  <th key={h} scope="col" className="border-b border-divider bg-surface px-5 py-3.5 text-label uppercase text-ink-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-b border-divider last:border-b-0">
                  {row.map((cell, c) =>
                    c === 0 ? (
                      <th key={c} scope="row" className="px-5 py-4 align-top text-small font-medium text-ink">
                        <RichText text={cell} />
                      </th>
                    ) : (
                      <td key={c} className="px-5 py-4 align-top text-small text-ink-2 [text-wrap:pretty]">
                        <RichText text={cell} />
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "note":
      return (
        <p className="m-0 border-l-2 border-accent bg-surface px-6 py-5 text-meta text-ink [text-wrap:pretty]">
          <RichText text={block.text} />
        </p>
      );
    case "facts":
      return (
        <dl className="m-0 grid border-t border-divider sm:grid-cols-2">
          {block.items.map((f) => (
            <div key={f.label} className="flex flex-col gap-1.5 border-b border-divider py-4 sm:pr-6">
              <dt className="text-label-sm uppercase text-ink-3">{f.label}</dt>
              <dd className="m-0 text-meta text-ink [overflow-wrap:anywhere]">
                <RichText text={f.value} />
              </dd>
            </div>
          ))}
        </dl>
      );
  }
}

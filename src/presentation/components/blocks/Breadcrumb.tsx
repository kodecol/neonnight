import Link from "next/link";

export function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Migas de pan" className="text-kicker uppercase text-ink-3">
      <ol className="m-0 flex list-none flex-wrap gap-2 p-0">
        {items.map((it, i) => (
          <li key={it.label} className="flex gap-2">
            {it.href ? (
              <Link href={it.href} className="hover:text-ink">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page">{it.label}</span>
            )}
            {i < items.length - 1 && <span aria-hidden="true">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

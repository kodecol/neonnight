import Link from "next/link";
import { Fragment } from "react";
import { isExternalHref, parseRichText, type RichNode } from "@/presentation/lib/rich-text";
import { cn } from "@/presentation/lib/cn";

/** Pinta texto con `**negrita**` y `[enlaces](/ruta)` (ver `parseRichText`). */
export function RichText({ text, linkClassName }: { text: string; linkClassName?: string }) {
  return <Nodes nodes={parseRichText(text)} linkClassName={linkClassName} />;
}

function Nodes({ nodes, linkClassName }: { nodes: RichNode[]; linkClassName?: string }) {
  const linkCls = cn("text-ink underline decoration-accent decoration-1 underline-offset-4 transition-colors hover:text-accent", linkClassName);
  return (
    <>
      {nodes.map((n, i) => {
        if (n.type === "strong")
          return (
            <strong key={i} className="font-medium text-ink">
              <Nodes nodes={n.children} linkClassName={linkClassName} />
            </strong>
          );
        if (n.type === "link") {
          if (isExternalHref(n.href))
            return (
              <a key={i} href={n.href} target="_blank" rel="noopener noreferrer" className={linkCls}>
                {n.text}
              </a>
            );
          if (n.href.startsWith("mailto:"))
            return (
              <a key={i} href={n.href} className={linkCls}>
                {n.text}
              </a>
            );
          return (
            <Link key={i} href={n.href} className={linkCls}>
              {n.text}
            </Link>
          );
        }
        return <Fragment key={i}>{n.text}</Fragment>;
      })}
    </>
  );
}

import Image from "next/image";
import { cn } from "@/presentation/lib/cn";

/** Proporción alto/ancho del arte recortado (656 × 677). */
const RATIO = 677 / 656;

/**
 * Isotipo para fondo oscuro: trazos blancos y el "&" en magenta, recortado
 * al borde del dibujo (sin el aire del PNG original), así que `size` es el
 * ancho visible real.
 */
export function Isotype({ size, className, priority = false }: { size: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src="/assets/isotipo-dark.png"
      alt=""
      width={size}
      height={Math.round(size * RATIO)}
      priority={priority}
      className={cn("shrink-0", className)}
      style={{ width: size, height: "auto" }}
    />
  );
}

import type { IdentityAsset } from "@/application/dto/identity.dto";
import { SmartImage as Image } from "@/presentation/components/primitives/SmartImage";
import { cn } from "@/presentation/lib/cn";

/** Proporción ancho/alto del isotipo del sitio, recortado al borde del dibujo (656 × 677). */
const DEFAULT_RATIO = 656 / 677;

/**
 * Isotipo para fondo oscuro. Por defecto, el del sitio (trazos blancos y el
 * "&" en magenta); con `asset`, el subido en el panel › Identidad. `size` es
 * el ancho visible real.
 */
export function Isotype({ size, asset, className, priority = false }: { size: number; asset?: IdentityAsset | null; className?: string; priority?: boolean }) {
  const src = asset?.src ?? "/assets/isotipo-dark.png";
  const ratio = asset?.ratio ?? DEFAULT_RATIO;
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={Math.round(size / ratio)}
      priority={priority}
      unoptimized={src.endsWith(".svg") && !src.startsWith("https://")}
      className={cn("shrink-0", className)}
      style={{ width: size, height: "auto" }}
    />
  );
}

/** Logo horizontal de Identidad a un alto dado (reemplaza isotipo + wordmark). */
export function WideLogo({ asset, height, className, priority = false }: { asset: IdentityAsset; height: number; className?: string; priority?: boolean }) {
  const width = Math.round(height * asset.ratio);
  return (
    <Image
      src={asset.src}
      alt={asset.alt}
      width={width}
      height={height}
      priority={priority}
      unoptimized={asset.src.endsWith(".svg") && !asset.src.startsWith("https://")}
      className={cn("shrink-0", className)}
      style={{ width, height }}
      data-testid="brand-wide-logo"
    />
  );
}

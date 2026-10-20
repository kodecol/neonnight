import Image from "next/image";
import type { ImageDto } from "@/application/dto/watch.dto";
import { cn } from "@/presentation/lib/cn";

/**
 * Contenedor de media con alto reservado (CLS 0). Si no hay imagen, deja la
 * superficie #0E0E0E como en el prototipo (placeholder de las refs 02–08).
 */
export function MediaSlot({
  image,
  fit = "cover",
  sizes,
  priority = false,
  className,
  label,
  position,
}: {
  image: ImageDto | null;
  fit?: "cover" | "contain";
  sizes: string;
  priority?: boolean;
  className?: string;
  label?: string;
  /** `object-position` del recorte. */
  position?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-surface", className)} aria-label={image ? undefined : label} role={image ? undefined : "img"}>
      {image ? (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          priority={priority}
          className={fit === "contain" ? "object-contain" : "object-cover"}
          style={position ? { objectPosition: position } : undefined}
        />
      ) : null}
    </div>
  );
}

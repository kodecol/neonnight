import Image from "next/image";
import { cn } from "@/presentation/lib/cn";

/** Isotipo monocromo invertido a blanco. */
export function Isotype({ size, className, priority = false }: { size: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src="/assets/isotipo-mono.png"
      alt=""
      width={size}
      height={Math.round((size * 778) / 807)}
      priority={priority}
      className={cn("invert", className)}
      style={{ width: size, height: "auto" }}
    />
  );
}

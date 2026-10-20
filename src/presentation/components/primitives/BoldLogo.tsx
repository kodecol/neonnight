import { useId } from "react";
import { cn } from "@/presentation/lib/cn";

/**
 * Logotipo oficial de Bold (bold.co). Monocromo (currentColor) en reposo;
 * con `group-hover` del contenedor toma el degradado de la marca.
 */
export function BoldLogo({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 79 28" className={cn("h-5 w-auto", className)} role="img" aria-label="Bold">
      <defs>
        <linearGradient id={`bold-${id}`} x1="78.748" y1="14" x2="0" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0.2" stopColor="#EE424E" />
          <stop offset="0.8" stopColor="#4A5BD4" />
        </linearGradient>
      </defs>
      <path
        className="fill-current transition-[fill] duration-500"
        style={{ ["--nn-bold-fill" as string]: `url(#bold-${id})` }}
        d="M23.764 18.993h19.502c-.469 5.045-4.662 9.006-9.752 9.006-5.09 0-9.282-3.96-9.75-9.006zM9.85 8.154v19.8c4.967-.476 8.87-4.734 8.87-9.9S14.816 8.63 9.85 8.155zm23.665-.044c-5.089 0-9.282 3.962-9.751 9.007h19.502c-.469-5.045-4.662-9.008-9.752-9.008h.001zM0 15.335V28h7.944V0H0v15.336zM70.804 0v28h7.944V0h-7.944zM60.085 18.055c0 .628.06 1.242.171 1.839.797 4.305 4.336 7.642 8.7 8.06v-19.8c-4.968.476-8.87 4.734-8.87 9.9zm-12.802 9.944h7.944V0h-7.944v28z"
      />
    </svg>
  );
}

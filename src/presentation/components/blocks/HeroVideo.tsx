"use client";
import { cloudinaryUrl, isCloudinary } from "@/presentation/lib/cloudinary";
import { useEffect, useRef, useState } from "react";

/**
 * Video de fondo del hero. En móvil y bajo prefers-reduced-motion se sirve
 * solo el poster (el archivo de referencia pesa 12 MB). Llama a .play() con
 * .catch() tras montar: los atributos de autoplay no bastan en todos los navegadores.
 */
export function HeroVideo({ src, poster, className, parallax }: { src: string; poster: string; className?: string; parallax?: number }) {
  // Desde Cloudinary: formato, calidad y ancho automáticos en su CDN (el archivo original pesa 12 MB).
  const media = (u: string) => (isCloudinary(u) ? cloudinaryUrl(u, 1920) : u);
  src = media(src);
  poster = media(poster);
  const ref = useRef<HTMLVideoElement>(null);
  const [useVideo, setUseVideo] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 768px)");
    const decide = () => setUseVideo(!reduced.matches && desktop.matches);
    decide();
    reduced.addEventListener("change", decide);
    desktop.addEventListener("change", decide);
    return () => {
      reduced.removeEventListener("change", decide);
      desktop.removeEventListener("change", decide);
    };
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v || !useVideo) return;
    v.muted = true;
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, [useVideo]);

  return (
    <div data-parallax={parallax} className={className}>
      {useVideo ? (
        <video ref={ref} src={src} poster={poster} muted loop playsInline autoPlay preload="metadata" className="block h-full w-full object-cover" aria-hidden="true" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="block h-full w-full object-cover" fetchPriority="high" decoding="async" />
      )}
    </div>
  );
}

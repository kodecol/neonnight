"use client";
import { cloudinaryUrl, isCloudinary } from "@/presentation/lib/cloudinary";
import { useEffect, useRef, useState } from "react";

/**
 * Video vertical de fondo. No descarga nada hasta acercarse a la pantalla
 * (`preload="none"` y sin `autoPlay`, que obliga a bajarlo entero): al entrar
 * se reproduce y al salir se pausa. Con movimiento reducido o si falla, el póster.
 */
export function VerticalVideo({ src, poster }: { src: string; poster: string }) {
  // Desde Cloudinary: formato, calidad y ancho automáticos en su CDN (el archivo original pesa 12 MB).
  const media = (u: string) => (isCloudinary(u) ? cloudinaryUrl(u, 720) : u);
  src = media(src);
  poster = media(poster);
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [motion, setMotion] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => setMotion(!reduced.matches);
    decide();
    reduced.addEventListener("change", decide);
    return () => reduced.removeEventListener("change", decide);
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v || !motion) return;
    v.muted = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          const p = v.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } else {
          v.pause();
        }
      },
      // Empieza a cargar un poco antes de que se vea.
      { rootMargin: "200px 0px" },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [motion]);

  if (failed || !motion) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />;
  }
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      onError={() => setFailed(true)}
      className="absolute inset-0 block h-full w-full object-cover"
      aria-hidden="true"
    />
  );
}

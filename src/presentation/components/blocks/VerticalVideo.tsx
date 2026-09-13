"use client";
import { useEffect, useRef, useState } from "react";

export function VerticalVideo({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => setPlay(!reduced.matches);
    decide();
    reduced.addEventListener("change", decide);
    return () => reduced.removeEventListener("change", decide);
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v || !play) return;
    v.muted = true;
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, [play]);

  if (failed || !play) {
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
      autoPlay
      preload="metadata"
      onError={() => setFailed(true)}
      className="absolute inset-0 block h-full w-full object-cover"
      aria-hidden="true"
    />
  );
}

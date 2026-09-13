"use client";
import { useParallax } from "@/presentation/hooks/use-parallax";
import { useReveal } from "@/presentation/hooks/use-reveal";

/** Monta los efectos globales (parallax + reveal) una sola vez en el layout. */
export function SiteEffects() {
  useParallax();
  useReveal();
  return null;
}

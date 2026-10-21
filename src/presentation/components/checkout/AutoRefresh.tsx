"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Vuelve a pedir la página cada `everyMs` mientras el pago esté pendiente (máximo `times` veces). */
export function AutoRefresh({ everyMs = 4000, times = 45 }: { everyMs?: number; times?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      if (n > times) window.clearInterval(id);
      else router.refresh();
    }, everyMs);
    return () => window.clearInterval(id);
  }, [router, everyMs, times]);
  return null;
}

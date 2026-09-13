"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Isotype } from "@/presentation/components/primitives/Isotype";
import { useCart } from "@/presentation/hooks/use-cart";
import { ROUTES } from "@/presentation/lib/site";
import { cn } from "@/presentation/lib/cn";
import { SideMenu } from "./SideMenu";

import type { SiteContent } from "@/application/dto/site-content.dto";

export function Header({
  whatsappUrl,
  instagramUrl,
  navigation,
  brand,
}: {
  whatsappUrl: string | null;
  instagramUrl: string;
  navigation: SiteContent["navigation"];
  brand: SiteContent["brand"];
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cart = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "backdrop-header fixed inset-x-0 top-0 z-[51] flex h-header items-center justify-between px-page transition-[background] duration-[400ms] ease-in-out",
          scrolled ? "bg-glass" : "bg-transparent",
        )}
      >
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          className="flex cursor-pointer items-center gap-3.5 border-0 bg-transparent p-0 text-ink"
        >
          <span className="flex w-[26px] flex-col gap-1.5" aria-hidden="true">
            <span className="block h-0.5 bg-ink" />
            <span className="block h-0.5 bg-ink" />
          </span>
          <span className="text-label uppercase">{navigation.header.menuLabel}</span>
        </button>

        <Link href={ROUTES.home} className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3" aria-label={`${brand.name}, inicio`}>
          <Isotype size={26} />
          <span className="hidden text-[14px] font-semibold uppercase tracking-[0.3em] leading-none sm:inline">{brand.wordmark}</span>
        </Link>

        <nav className="flex items-center gap-5 text-label uppercase md:gap-[34px]" aria-label="Principal">
          <Link href={ROUTES.collection} className="hidden hover:text-accent md:inline">
            {navigation.header.collectionLabel}
          </Link>
          <span className="hidden text-ink-2 md:inline" aria-label={`Divisa: ${brand.currencyLabel}`}>
            {brand.currencyLabel}
          </span>
          <button
            type="button"
            onClick={cart.toggle}
            aria-expanded={cart.isOpen}
            aria-controls="cart-drawer"
            className="flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-label uppercase text-ink"
          >
            {navigation.header.cartLabel}
            <span
              className="inline-flex h-5 min-w-5 items-center justify-center bg-accent px-1 text-[11px] leading-none tracking-normal text-ink"
              data-testid="cart-count"
              aria-label={`${cart.count} piezas en la bolsa`}
            >
              {cart.count}
            </span>
          </button>
        </nav>
      </header>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} whatsappUrl={whatsappUrl} instagramUrl={instagramUrl} content={navigation} />
    </>
  );
}

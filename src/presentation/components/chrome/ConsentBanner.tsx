"use client";
import { useEffect, useId, useState } from "react";
import type { SiteContent } from "@/application/dto/site-content.dto";
import { OPEN_PREFERENCES_EVENT, openConsentPreferences, readConsent, saveConsent } from "@/presentation/analytics/consent";
import { Button } from "@/presentation/components/primitives/Button";
import { RichText } from "@/presentation/components/primitives/RichText";

/**
 * Banner de cookies: aceptar, rechazar y configurar con el mismo peso visual.
 * No bloquea la navegación; mientras está abierto marca `<html data-consent-open>`
 * para que el botón flotante de WhatsApp no quede encima.
 */
export function ConsentBanner({ content }: { content: SiteContent["consent"] }) {
  const [open, setOpen] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!readConsent()) setOpen(true);
    const onOpen = () => {
      const current = readConsent();
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
      setConfiguring(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_PREFERENCES_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, onOpen);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (open) root.dataset.consentOpen = "";
    else delete root.dataset.consentOpen;
    return () => {
      delete root.dataset.consentOpen;
    };
  }, [open]);

  if (!open) return null;

  const decide = (choice: { analytics: boolean; marketing: boolean }) => {
    saveConsent(choice);
    setOpen(false);
    setConfiguring(false);
  };

  return (
    <section
      role="region"
      aria-labelledby={titleId}
      data-testid="consent-banner"
      className="fixed inset-x-0 bottom-0 z-[65] border-t border-divider bg-surface-elevated px-5 py-6 md:inset-x-auto md:bottom-6 md:left-6 md:max-w-[460px] md:border md:p-7"
    >
      <h2 id={titleId} className="m-0 text-label uppercase text-ink">
        {content.title}
      </h2>
      <p className="mb-0 mt-3 text-small text-ink-2 [text-wrap:pretty]">
        <RichText text={content.body} />
      </p>

      {configuring && (
        <fieldset className="m-0 mt-5 flex flex-col gap-4 border-0 border-t border-divider p-0 pt-5">
          <legend className="sr-only">{content.configure}</legend>
          <Toggle label={content.categories.necessary.label} body={content.categories.necessary.body} checked disabled />
          <Toggle label={content.categories.analytics.label} body={content.categories.analytics.body} checked={analytics} onChange={setAnalytics} testId="consent-analytics" />
          <Toggle label={content.categories.marketing.label} body={content.categories.marketing.body} checked={marketing} onChange={setMarketing} testId="consent-marketing" />
        </fieldset>
      )}

      <div className="mt-6 grid grid-cols-2 gap-2">
        <Button size="sm" className="justify-center" onClick={() => decide({ analytics: true, marketing: true })} data-testid="consent-accept">
          {content.accept}
        </Button>
        <Button size="sm" variant="secondary" className="justify-center" onClick={() => decide({ analytics: false, marketing: false })} data-testid="consent-reject">
          {content.reject}
        </Button>
        {configuring ? (
          <Button size="sm" variant="ghost" className="col-span-2 justify-center" onClick={() => decide({ analytics, marketing })} data-testid="consent-save">
            {content.save}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" className="col-span-2 justify-center" onClick={() => setConfiguring(true)} aria-expanded={false} data-testid="consent-configure">
            {content.configure}
          </Button>
        )}
      </div>
    </section>
  );
}

function Toggle({ label, body, checked, disabled, onChange, testId }: { label: string; body: string; checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void; testId?: string }) {
  return (
    <label className={`flex items-start justify-between gap-5 ${disabled ? "cursor-default" : "cursor-pointer"}`}>
      <span className="flex flex-col gap-1">
        <span className="text-label-sm uppercase text-ink">{label}</span>
        <span className="text-legal text-ink-2">{body}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        data-testid={testId}
        className="mt-0.5 h-5 w-9 shrink-0 cursor-pointer appearance-none border border-border-strong bg-transparent transition-colors before:block before:h-3.5 before:w-3.5 before:translate-x-0.5 before:translate-y-[2px] before:bg-ink-2 before:transition-transform checked:border-accent checked:bg-accent checked:before:translate-x-[17px] checked:before:bg-ink disabled:cursor-default disabled:opacity-60"
      />
    </label>
  );
}

/** "Preferencias de cookies" del pie de página. */
export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={openConsentPreferences} className="cursor-pointer border-0 bg-transparent p-0 text-left text-legal text-ink-3 hover:text-ink" data-testid="cookie-settings">
      {label}
    </button>
  );
}

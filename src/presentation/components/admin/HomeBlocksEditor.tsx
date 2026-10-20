"use client";
import type { HomeEditorDefaults } from "@/application/dto/home.dto";
import { SOCIAL_NETWORKS } from "@/application/lib/social-networks";
import { SocialIcon } from "@/presentation/components/primitives/SocialIcon";
import { cn } from "@/presentation/lib/cn";
import { slotAction } from "./ImageField";
import { Select, TextArea, TextInput, Toggle } from "./fields";

type Trust = HomeEditorDefaults["trust"];
type Testimonials = HomeEditorDefaults["testimonials"];
type Testimonial = Testimonials["items"][number];
type Social = HomeEditorDefaults["social"];
type Err = (key: string) => string | undefined;

/** Garantía y autenticidad: tres compromisos con número automático (el último va en magenta). */
export function TrustEditor({ value, onChange, err, defaultKicker }: { value: Trust; onChange: (v: Trust) => void; err: Err; defaultKicker: string }) {
  const item = (i: number, k: "title" | "body", v: string) => onChange({ ...value, items: value.items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) });
  return (
    <div className="flex flex-col gap-8" data-testid="trust-editor">
      <TextInput label="Antetítulo" value={value.kicker ?? ""} onChange={(e) => onChange({ ...value, kicker: e.target.value })} placeholder={defaultKicker} maxLength={40} className="md:max-w-[50%]" />
      <div className="grid gap-6 md:grid-cols-3">
        {value.items.map((it, i) => (
          <div key={i} className={cn("flex flex-col gap-4 border-t-2 pt-5", i === value.items.length - 1 ? "border-accent" : "border-ink")}>
            <span className={cn("text-number", i === value.items.length - 1 && "text-accent")}>{String(i + 1).padStart(2, "0")}</span>
            <TextInput label="Título" value={it.title} onChange={(e) => item(i, "title", e.target.value)} maxLength={40} error={err(`trust.items.${i}.title`)} />
            <TextArea label="Texto" rows={5} value={it.body} onChange={(e) => item(i, "body", e.target.value)} maxLength={220} error={err(`trust.items.${i}.body`)} hint={`${it.body.length}/220`} />
          </div>
        ))}
      </div>
    </div>
  );
}

const RATINGS = [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${"★".repeat(n)}${"☆".repeat(5 - n)}` }));

function status(t: Testimonial): { label: string; tone: string } {
  if (!t.visible) return { label: "Oculto", tone: "border-border text-ink-3" };
  if (!t.authorized) return { label: "Falta autorización", tone: "border-accent text-accent" };
  return { label: "Publicado", tone: "border-ink text-ink" };
}

/**
 * Testimonios: solo se publican los visibles con autorización escrita del
 * cliente (Ley 1480). Los que vienen del código son de ejemplo y entran sin
 * autorización.
 */
export function TestimonialsEditor({ value, onChange, err, defaults }: { value: Testimonials; onChange: (v: Testimonials) => void; err: Err; defaults: { kicker: string; title: string; note: string } }) {
  const set = (i: number, patch: Partial<Testimonial>) => onChange({ ...value, items: value.items.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.items.length) return;
    const items = [...value.items];
    [items[i], items[j]] = [items[j]!, items[i]!];
    onChange({ ...value, items });
  };
  const add = () =>
    onChange({ ...value, items: [...value.items, { id: `t-${Date.now().toString(36)}`, quote: "", name: "", city: "", piece: "", rating: 5, authorized: false, visible: true }] });
  const published = value.items.filter((t) => t.visible && t.authorized).length;
  const examples = value.items.filter((t) => t.id.startsWith("ejemplo-")).length;

  return (
    <div className="flex flex-col gap-8" data-testid="testimonials-editor">
      <div className="grid gap-6 md:grid-cols-3">
        <TextInput label="Antetítulo" value={value.kicker ?? ""} onChange={(e) => onChange({ ...value, kicker: e.target.value })} placeholder={defaults.kicker} maxLength={40} />
        <TextInput label="Título" value={value.title ?? ""} onChange={(e) => onChange({ ...value, title: e.target.value })} placeholder={defaults.title} maxLength={90} />
        <TextInput label="Nota" value={value.note ?? ""} onChange={(e) => onChange({ ...value, note: e.target.value })} placeholder={defaults.note} maxLength={90} />
      </div>

      <p className="m-0 border-l-2 border-accent bg-surface px-5 py-4 text-small text-ink-2 [text-wrap:pretty]">
        Solo se publican los testimonios <strong className="font-medium text-ink">visibles y con autorización escrita del cliente</strong>: publicar comentarios inventados como reales es publicidad engañosa (Ley 1480).
        {examples > 0 && <> Los {examples} marcados como ejemplo vienen del diseño: reemplázalos por testimonios reales.</>} Hoy se publicarían {published}; con cero, la sección no aparece.
      </p>

      <ol className="m-0 flex list-none flex-col gap-4 p-0">
        {value.items.map((t, i) => {
          const st = status(t);
          return (
            <li key={t.id} className="border border-divider p-5 md:p-6" data-testid="testimonial">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <span className="text-label-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  <span className={cn("border px-2 py-1 text-label-sm uppercase", st.tone)}>{st.label}</span>
                  {t.id.startsWith("ejemplo-") && <span className="text-label-sm uppercase text-ink-3">Ejemplo</span>}
                </span>
                <span className="flex items-center gap-4">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={slotAction} aria-label={`Subir testimonio ${i + 1}`}>
                    ↑
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === value.items.length - 1} className={slotAction} aria-label={`Bajar testimonio ${i + 1}`}>
                    ↓
                  </button>
                  <button type="button" onClick={() => onChange({ ...value, items: value.items.filter((_, j) => j !== i) })} className={cn(slotAction, "hover:text-accent")}>
                    Quitar
                  </button>
                </span>
              </div>
              <div className="grid gap-5 md:grid-cols-4">
                <TextArea className="md:col-span-4" rows={3} label="Testimonio" value={t.quote} onChange={(e) => set(i, { quote: e.target.value })} maxLength={400} error={err(`testimonials.items.${i}.quote`)} />
                <TextInput label="Nombre" value={t.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Andrés M." maxLength={40} error={err(`testimonials.items.${i}.name`)} />
                <TextInput label="Ciudad" value={t.city} onChange={(e) => set(i, { city: e.target.value })} placeholder="Medellín" maxLength={40} error={err(`testimonials.items.${i}.city`)} />
                <TextInput label="Pieza" value={t.piece} onChange={(e) => set(i, { piece: e.target.value })} placeholder="Rolex Datejust 36" maxLength={60} error={err(`testimonials.items.${i}.piece`)} />
                <Select label="Calificación" value={String(t.rating)} onChange={(e) => set(i, { rating: Number(e.target.value) })} options={RATINGS} />
              </div>
              <div className="mt-6 grid gap-5 border-t border-divider pt-5 md:grid-cols-2">
                <Toggle label="Autorizado por el cliente" description="Tienes su autorización escrita para publicarlo con su nombre." checked={t.authorized} onChange={(v) => set(i, { authorized: v })} />
                <Toggle label="Visible" description="Apágalo para guardarlo sin mostrarlo." checked={t.visible} onChange={(v) => set(i, { visible: v })} />
              </div>
            </li>
          );
        })}
      </ol>
      {err("testimonials.items") && <p className="m-0 text-label-sm uppercase text-accent">{err("testimonials.items")}</p>}
      <button type="button" onClick={add} disabled={value.items.length >= 12} className="w-fit cursor-pointer border border-dashed border-border px-5 py-3.5 text-label uppercase text-ink-2 transition-colors hover:border-ink hover:text-ink disabled:opacity-45" data-testid="add-testimonial">
        + Añadir testimonio
      </button>
    </div>
  );
}

/** Redes: activar, perfil y enlace. Las apagadas desaparecen de la home, el menú y el pie de página. */
export function SocialEditor({ value, onChange, err, defaults }: { value: Social; onChange: (v: Social) => void; err: Err; defaults: { kicker: string; title: string; body: string } }) {
  const set = (i: number, patch: Partial<Social["networks"][number]>) => onChange({ ...value, networks: value.networks.map((n, j) => (j === i ? { ...n, ...patch } : n)) });
  return (
    <div className="flex flex-col gap-8" data-testid="social-editor">
      <div className="grid gap-6 md:grid-cols-2">
        <TextInput label="Antetítulo" value={value.kicker ?? ""} onChange={(e) => onChange({ ...value, kicker: e.target.value })} placeholder={defaults.kicker} maxLength={40} />
        <TextInput label="Título" value={value.title ?? ""} onChange={(e) => onChange({ ...value, title: e.target.value })} placeholder={defaults.title} maxLength={90} />
        <TextArea className="md:col-span-2" rows={2} label="Texto" value={value.body ?? ""} onChange={(e) => onChange({ ...value, body: e.target.value })} placeholder={defaults.body} maxLength={220} />
      </div>
      <ul className="m-0 flex list-none flex-col gap-px border border-divider bg-divider p-0">
        {value.networks.map((n, i) => (
          <li key={n.id} className="bg-bg p-5 md:p-6" data-testid={`network-${n.id}`}>
            <div className={cn("flex items-center justify-between gap-4", n.enabled && "mb-5")}>
              <span className="flex items-center gap-3 text-label-lg uppercase">
                <SocialIcon id={n.id} className="h-5 w-5 text-ink-2" />
                {SOCIAL_NETWORKS[n.id].label}
              </span>
              <div className="w-48">
                <Toggle label={n.enabled ? "Activa" : "Apagada"} checked={n.enabled} onChange={(v) => set(i, { enabled: v })} />
              </div>
            </div>
            {n.enabled && (
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <TextInput label="Usuario" value={n.handle} onChange={(e) => set(i, { handle: e.target.value })} placeholder="@neonnight01" maxLength={40} error={err(`social.networks.${i}.handle`)} />
                <TextInput label="Enlace del perfil" value={n.href} onChange={(e) => set(i, { href: e.target.value })} placeholder={`https://www.${SOCIAL_NETWORKS[n.id].hosts[0]}/…`} error={err(`social.networks.${i}.href`)} />
                <TextInput className="md:col-span-2" label="Qué publicas ahí" value={n.description} onChange={(e) => set(i, { description: e.target.value })} maxLength={90} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

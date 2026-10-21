import type { Clock } from "../../ports/clock";
import { DEFAULT_APPEARANCE, StoreAppearanceSchema, type StoreAppearanceInput } from "../../dto/appearance.dto";
import type { AppearanceSettingsRepository, StoreAppearance } from "../../ports/appearance-settings";

const toInput = (a: StoreAppearanceInput): StoreAppearanceInput => ({ preset: a.preset, colors: { ...a.colors }, fonts: { ...a.fonts } });

export interface AppearanceEditorState {
  input: StoreAppearanceInput;
  hasDraft: boolean;
  publishedAt: string | null;
  history: Array<{ at: string; input: StoreAppearanceInput }>;
}

/** Estado del editor de Ajustes › Apariencia: borrador, lo publicado o la del código. */
export class GetAppearanceEditor {
  constructor(private readonly appearance: AppearanceSettingsRepository) {}

  async execute(): Promise<AppearanceEditorState> {
    const [published, draft, history] = await Promise.all([this.appearance.get(), this.appearance.getDraft(), this.appearance.history()]);
    return {
      input: toInput(draft ?? published ?? DEFAULT_APPEARANCE),
      hasDraft: draft !== null,
      publishedAt: published?.updatedAt.toISOString() ?? null,
      history: history.map((h) => ({ at: h.updatedAt.toISOString(), input: toInput(h) })),
    };
  }
}

/** Lo que pinta la tienda: lo publicado (o el borrador en la vista previa); null: la del código, sin estilos extra. */
/**
 * Lo leído de la base se vuelve a validar antes de llegar al <style> del tema
 * (defensa en profundidad: si el documento se alterara fuera del panel, rige
 * globals.css en vez de inyectar valores sin revisar).
 */
function valid(a: StoreAppearanceInput | null): StoreAppearanceInput | null {
  if (!a) return null;
  const r = StoreAppearanceSchema.safeParse(a);
  return r.success ? r.data : null;
}

export class GetActiveAppearance {
  constructor(private readonly appearance: AppearanceSettingsRepository) {}

  async execute(opts: { preview?: boolean } = {}): Promise<StoreAppearanceInput | null> {
    const published = valid(await this.appearance.get().catch(() => null));
    if (!opts.preview) return published;
    return valid(await this.appearance.getDraft().catch(() => null)) ?? published;
  }
}

/**
 * Guarda la apariencia como borrador o la publica. Valida el esquema y el
 * contraste WCAG AA en el servidor (texto sobre fondo, superficie y acento).
 */
export class SaveAppearance {
  constructor(private readonly deps: { appearance: AppearanceSettingsRepository; clock: Clock }) {}

  async execute(raw: unknown, mode: "draft" | "publish" = "publish"): Promise<StoreAppearance> {
    const appearance: StoreAppearance = { ...StoreAppearanceSchema.parse(raw), updatedAt: this.deps.clock.now() };
    if (mode === "draft") await this.deps.appearance.saveDraft(appearance);
    else await this.deps.appearance.publish(appearance);
    return appearance;
  }
}

/** `brand:apply` de la apariencia (CLI, importación): valida y publica. */
export class ApplyAppearance {
  constructor(private readonly deps: { appearance: AppearanceSettingsRepository; clock: Clock }) {}

  execute(raw: unknown): Promise<StoreAppearance> {
    return new SaveAppearance(this.deps).execute(raw, "publish");
  }
}

export class DiscardAppearanceDraft {
  constructor(private readonly appearance: AppearanceSettingsRepository) {}

  execute(): Promise<void> {
    return this.appearance.discardDraft();
  }
}

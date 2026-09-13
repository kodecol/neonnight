import type { Money } from "../value-objects/money";
import type { Slug } from "../value-objects/slug";
import type { Reference } from "../value-objects/reference";

export type WatchId = string & { readonly __brand: "WatchId" };
export const watchId = (value: string): WatchId => value as WatchId;

export type WatchCondition = "nuevo" | "como-nuevo" | "excelente";
export type WatchAvailability = "disponible" | "reservado" | "vendido";
export type WatchCategory = "automatico" | "cronografo" | "gmt" | "buceo";

export interface WatchSpecs {
  readonly movement: string;
  readonly powerReserveHours: number | null;
  readonly caseMm: number;
  readonly caseMaterial: string;
  readonly crystal: string;
  readonly waterResistanceM: number | null;
}

export interface WatchImage {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}

export interface WatchVideo {
  readonly src: string;
  readonly poster: string;
}

export interface WatchMedia {
  readonly front: WatchImage | null;
  readonly back: WatchImage | null;
  readonly hero: WatchImage | WatchVideo | null;
  readonly gallery: readonly WatchImage[];
  readonly band: WatchImage | null;
  readonly video: WatchVideo | null;
}

export interface Watch {
  readonly id: WatchId;
  readonly slug: Slug;
  readonly brand: string;
  readonly model: string;
  readonly reference: Reference;
  readonly price: Money;
  readonly category: WatchCategory;
  readonly condition: WatchCondition;
  readonly subtitle: string;
  readonly description: readonly string[];
  readonly specs: WatchSpecs;
  readonly media: WatchMedia;
  readonly includes: readonly string[];
  readonly availability: WatchAvailability;
  readonly featured: boolean;
  readonly updatedAt: Date;
}

export const watchDisplayName = (w: Pick<Watch, "brand" | "model">): string => `${w.brand} ${w.model}`.trim();

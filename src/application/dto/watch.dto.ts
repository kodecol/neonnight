import type { Watch, WatchAvailability, WatchCategory, WatchCondition, WatchImage, WatchVideo } from "@/domain/entities/watch";
import { watchDisplayName } from "@/domain/entities/watch";

export interface ImageDto {
  src: string;
  alt: string;
  width: number;
  height: number;
}
export interface VideoDto {
  src: string;
  poster: string;
}
export type HeroMediaDto = { kind: "image"; image: ImageDto } | { kind: "video"; video: VideoDto } | null;

export interface PriceDto {
  cents: number;
  units: number;
  currency: "COP";
  formatted: string;
}

/** Forma mínima para tarjetas de grilla. */
export interface WatchSummaryDto {
  id: string;
  slug: string;
  brand: string;
  model: string;
  name: string;
  subtitle: string;
  price: PriceDto;
  category: WatchCategory;
  availability: WatchAvailability;
  front: ImageDto | null;
  back: ImageDto | null;
}

/** Forma completa para la página de detalle. */
export interface WatchDetailDto extends WatchSummaryDto {
  reference: string;
  condition: WatchCondition;
  description: string[];
  specs: {
    movement: string;
    powerReserve: string;
    case: string;
    crystal: string;
    waterResistance: string;
    includes: string;
  };
  hero: HeroMediaDto;
  gallery: ImageDto[];
  band: ImageDto | null;
  video: VideoDto | null;
  updatedAt: string;
}

const toImage = (img: WatchImage | null): ImageDto | null => (img ? { ...img } : null);
const toVideo = (v: WatchVideo | null): VideoDto | null => (v ? { ...v } : null);

const isVideo = (m: WatchImage | WatchVideo): m is WatchVideo => "poster" in m;

export function toPriceDto(watch: Watch): PriceDto {
  return { cents: watch.price.cents, units: watch.price.units, currency: watch.price.currency, formatted: watch.price.format() };
}

export function toWatchSummaryDto(watch: Watch): WatchSummaryDto {
  return {
    id: watch.id,
    slug: watch.slug.value,
    brand: watch.brand,
    model: watch.model,
    name: watchDisplayName(watch),
    subtitle: watch.subtitle,
    price: toPriceDto(watch),
    category: watch.category,
    availability: watch.availability,
    front: toImage(watch.media.front),
    back: toImage(watch.media.back),
  };
}

export function toWatchDetailDto(watch: Watch): WatchDetailDto {
  const hero = watch.media.hero;
  return {
    ...toWatchSummaryDto(watch),
    reference: watch.reference.value,
    condition: watch.condition,
    description: [...watch.description],
    specs: {
      movement: watch.specs.movement,
      powerReserve: watch.specs.powerReserveHours === null ? "—" : `${watch.specs.powerReserveHours} horas`,
      case: `${watch.specs.caseMm} mm · ${watch.specs.caseMaterial}`,
      crystal: watch.specs.crystal,
      waterResistance: watch.specs.waterResistanceM === null ? "—" : `${watch.specs.waterResistanceM} m`,
      includes: watch.includes.join(", "),
    },
    hero: hero === null ? null : isVideo(hero) ? { kind: "video", video: { ...hero } } : { kind: "image", image: { ...hero } },
    gallery: watch.media.gallery.map((g) => ({ ...g })),
    band: toImage(watch.media.band),
    video: toVideo(watch.media.video),
    updatedAt: watch.updatedAt.toISOString(),
  };
}

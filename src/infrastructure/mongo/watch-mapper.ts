import { watchId, type Watch, type WatchMedia, type WatchSpecs } from "@/domain/entities/watch";
import { Money } from "@/domain/value-objects/money";
import { Slug } from "@/domain/value-objects/slug";
import { Reference } from "@/domain/value-objects/reference";

export interface WatchDoc {
  _id: string;
  slug: string;
  brand: string;
  model: string;
  reference: string;
  priceCents: number;
  currency: "COP";
  category: string;
  condition: Watch["condition"];
  subtitle: string;
  description: string[];
  specs: WatchSpecs;
  media: WatchMedia;
  includes: string[];
  availability: Watch["availability"];
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toWatchDoc(w: Watch, createdAt: Date): WatchDoc {
  return {
    _id: w.id,
    slug: w.slug.value,
    brand: w.brand,
    model: w.model,
    reference: w.reference.value,
    priceCents: w.price.cents,
    currency: w.price.currency,
    category: w.category,
    condition: w.condition,
    subtitle: w.subtitle,
    description: [...w.description],
    specs: { ...w.specs },
    media: structuredClone(w.media) as WatchMedia,
    includes: [...w.includes],
    availability: w.availability,
    featured: w.featured,
    createdAt,
    updatedAt: w.updatedAt,
  };
}

export function fromWatchDoc(d: WatchDoc): Watch {
  return {
    id: watchId(d._id),
    slug: Slug.of(d.slug),
    brand: d.brand,
    model: d.model,
    reference: Reference.of(d.reference),
    price: Money.fromCents(d.priceCents, d.currency),
    category: d.category,
    condition: d.condition,
    subtitle: d.subtitle,
    description: d.description,
    specs: d.specs,
    media: d.media,
    includes: d.includes,
    availability: d.availability,
    featured: d.featured,
    updatedAt: d.updatedAt,
  };
}

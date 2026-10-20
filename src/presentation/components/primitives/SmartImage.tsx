"use client";
import Image, { type ImageProps } from "next/image";
import { cloudinaryUrl, isCloudinary } from "@/presentation/lib/cloudinary";

const cloudinaryLoader: NonNullable<ImageProps["loader"]> = ({ src, width, quality }) => cloudinaryUrl(src, width, quality);

/**
 * `next/image` que delega en Cloudinary las fotos que ya viven allí (catálogo
 * y subidas del panel) y usa el optimizador de Next solo para los assets
 * locales. Es cliente porque el `loader` es una función.
 */
export function SmartImage(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : "";
  return <Image {...props} alt={props.alt} loader={isCloudinary(src) ? cloudinaryLoader : undefined} />;
}

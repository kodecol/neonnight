import { notFound } from "next/navigation";

/** Cualquier URL desconocida cae aquí para que el 404 se pinte con el chrome de la tienda. */
export default function CatchAll() {
  notFound();
}

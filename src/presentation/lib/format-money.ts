/** Formato de cliente para importes que ya llegan como centavos del servidor. */
export function formatCop(cents: number): string {
  const units = Math.trunc(cents / 100);
  return `$ ${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(units)} COP`;
}

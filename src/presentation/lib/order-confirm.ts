/**
 * Textos de confirmación de Pedidos, compartidos por la lista y el detalle.
 * Eliminar avisa si algún pedido tiene un link de Bold que quizá sigue vigente.
 */
export function deleteOrdersQuestion(orders: ReadonlyArray<{ id: string; linkMayBeLive: boolean }>): string {
  const head =
    orders.length === 1
      ? `¿Eliminar el pedido ${orders[0]!.id}? Va a Eliminados y se purga solo en 30 días; hasta entonces puedes restaurarlo.`
      : `¿Eliminar ${orders.length} pedidos? Van a Eliminados y se purgan solos en 30 días; hasta entonces puedes restaurarlos.`;
  const live = orders.filter((o) => o.linkMayBeLive).map((o) => o.id);
  if (live.length === 0) return head;
  const who =
    live.length === 1
      ? `${live[0]} tiene un link de pago de Bold que puede seguir vigente (se creó hace menos de 30 minutos)`
      : `${live.join(", ")} tienen links de pago de Bold que pueden seguir vigentes (se crearon hace menos de 30 minutos)`;
  return `${head}\n\nOjo: ${who}. Si el cliente paga, el pedido vuelve solo y queda marcado para revisar.`;
}

export const purgeOrderQuestion = (id: string) => `¿Purgar el pedido ${id} definitivamente? Se borra de la base y no se puede deshacer.`;

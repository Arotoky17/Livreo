export function normalizeOrderItems(items) {
  if (!Array.isArray(items) || !items.length) throw new Error('Ajoutez au moins un article.');
  return items.map((item) => {
    const quantity = Number(item.quantity), unitPrice = Number(item.unitPrice);
    if (!item.productName?.trim() || !Number.isInteger(quantity) || quantity < 1 || item.unitPrice === '' || item.unitPrice == null || !Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error('Renseignez un nom, une quantité entière positive et un prix valide pour chaque article.');
    }
    return { productName: item.productName.trim(), quantity, unitPrice };
  });
}
export function completionValues(order, collected) {
  if (order.paymentMethod === 'PREPAID') return {};
  const amount = Number(collected);
  if (collected == null || String(collected).trim() === '' || !Number.isFinite(amount) || amount < 0) throw new Error('Renseignez un montant encaissé positif ou nul.');
  return { collectedAmount: amount };
}
export function gpsDeliveryIds(deliveries, user) {
  if (user?.role !== 'DELIVERY') return '';
  return deliveries.filter((delivery) => delivery.status === 'EN_ROUTE' && delivery.deliveryPersonId === user.id).map((delivery) => delivery.id).sort().join('|');
}

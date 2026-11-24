const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Indian/Antananarivo', year: 'numeric', month: '2-digit', day: '2-digit' });
export const money = (value) => `${Number(value ?? 0).toLocaleString('fr-FR')} Ar`;
export const dateTime = (value) => value ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Indian/Antananarivo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';
export const statusLabels = { EN_ATTENTE: 'En attente', VALIDEE: 'Validée', AFFECTEE: 'Affectée', EN_ROUTE: 'En route', LIVREE: 'Livrée', ECHEC: 'Échec', REPROGRAMMEE: 'À reprogrammer', ANNULEE: 'Annulée' };
export function matches(query, ...values) {
  const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalize(values.join(' ')).includes(normalize(query.trim()));
}
export function dailyActivity(orders, deliveries, days, now) {
  const today = dayFormat.format(new Date(now));
  const anchor = new Date(`${today}T12:00:00+03:00`);
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(anchor.getTime() - (days - index - 1) * 86400000);
    return { date: dayFormat.format(date), label: new Intl.DateTimeFormat('fr-FR', { timeZone: 'Indian/Antananarivo', day: 'numeric', month: 'short' }).format(date), orders: 0, delivered: 0, collected: 0, started: 0 };
  });
  const byDate = new Map(buckets.map((bucket) => [bucket.date, bucket]));
  for (const order of orders) {
    const bucket = byDate.get(dayFormat.format(new Date(order.createdAt)));
    if (bucket) bucket.orders++;
  }
  for (const delivery of deliveries) {
    if (delivery.startedAt) {
      const bucket = byDate.get(dayFormat.format(new Date(delivery.startedAt)));
      if (bucket) bucket.started++;
    }
    if (delivery.status === 'LIVREE' && delivery.completedAt) {
      const bucket = byDate.get(dayFormat.format(new Date(delivery.completedAt)));
      if (bucket) { bucket.delivered++; bucket.collected += Number(delivery.collectedAmount ?? 0); }
    }
  }
  return buckets;
}
export function orderPeriodTotals(orders, buckets, deliveries = []) {
  const dates = new Set(buckets.map(({ date }) => date));
  const deliveryStatuses = new Map(deliveries.map(({ orderId, order, status }) => [orderId ?? order?.id, status]));
  const totals = { total: 0, delivered: 0, waiting: 0 };
  for (const order of orders) {
    if (!dates.has(dayFormat.format(new Date(order.createdAt)))) continue;
    const status = deliveryStatuses.get(order.id) ?? order.delivery?.status ?? order.status;
    totals.total++;
    if (status === 'LIVREE') totals.delivered++;
    if (status === 'VALIDEE' || status === 'REPROGRAMMEE') totals.waiting++;
  }
  return totals;
}
export function sellerBalances(deliveries) {
  const balances = new Map();
  for (const delivery of deliveries) {
    if (delivery.status !== 'LIVREE' || delivery.collectedAmount == null) continue;
    const seller = delivery.order.seller;
    const id = seller?.id ?? delivery.order.sellerId;
    const row = balances.get(id) ?? { id, name: seller?.nom ?? 'Vendeur', count: 0, collected: 0, fees: 0, due: 0 };
    row.count++;
    row.collected += Number(delivery.collectedAmount);
    row.fees += Number(delivery.order.deliveryFee);
    row.due += Number(delivery.sellerPayout ?? Math.max(0, delivery.collectedAmount - delivery.order.deliveryFee));
    balances.set(id, row);
  }
  return [...balances.values()];
}

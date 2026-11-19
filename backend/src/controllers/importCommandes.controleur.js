import { createHash } from 'node:crypto';
import { z } from 'zod';
import prisma from '../config/db.js';
import { generateUniqueTrackingCode } from '../services/trackingCode.service.js';

const requiredText = (max) => z.string().trim().min(1).max(max);
const orderSchema = z.object({
  reference: z.string().trim().max(100).default(''),
  customerName: requiredText(200),
  customerPhone: requiredText(60),
  deliveryAddress: requiredText(500),
  deliveryDetails: z.string().trim().max(500).default(''),
  notes: z.string().trim().max(500).default(''),
  zoneId: z.string().uuid(),
  sellerId: z.string().uuid(),
  paymentMethod: z.enum(['CASH_ON_DELIVERY', 'PREPAID']),
  items: z.array(z.object({
    productName: requiredText(160),
    quantity: z.number().int().min(1).max(100000),
    unitPrice: z.number().finite().min(0).max(1000000000),
  })).min(1).max(30),
});

function orderKey(order) {
  const normalized = {
    ...order,
    customerName: order.customerName.toLowerCase(),
    customerPhone: order.customerPhone.replace(/[\s.()-]/g, ''),
    deliveryAddress: order.deliveryAddress.toLowerCase(),
    items: order.items.map((item) => JSON.stringify(item)).sort(),
  };
  const identity = order.reference
    ? { sellerId: order.sellerId, reference: order.reference.toLowerCase() }
    : normalized;
  const hash = createHash('sha256').update(JSON.stringify(identity)).digest('hex');
  return [hash.slice(0, 8), hash.slice(8, 12), '8' + hash.slice(13, 16), '8' + hash.slice(17, 20), hash.slice(20, 32)].join('-');
}

export async function importOrders(req, res, next) {
  const parsed = z.object({
    orders: z.array(orderSchema).min(1).max(50),
    preview: z.boolean().default(false),
  }).safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const row = typeof issue.path[1] === 'number' ? `Commande ${issue.path[1] + 1} · ` : '';
    return res.status(400).json({ message: `${row}Vérifiez les champs obligatoires et les valeurs (50 commandes maximum, 30 articles par commande).` });
  }

  const { orders, preview } = parsed.data;
  const keys = orders.map(orderKey);
  const uniqueKeys = [...new Set(keys)];
  try {
    const [zones, sellers] = await Promise.all([
      prisma.zone.findMany({ where: { id: { in: orders.map((order) => order.zoneId) }, isActive: true } }),
      prisma.user.findMany({ where: { id: { in: orders.map((order) => order.sellerId) }, role: 'SELLER', isActive: true }, select: { id: true } }),
    ]);
    const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
    const sellerIds = new Set(sellers.map((seller) => seller.id));
    const invalidRow = orders.findIndex((order) => !zoneById.has(order.zoneId) || !sellerIds.has(order.sellerId));
    if (invalidRow !== -1) {
      return res.status(400).json({ message: `Commande ${invalidRow + 1} · Sélectionnez une zone et un vendeur actifs.` });
    }

    if (preview) {
      const existing = await prisma.order.findMany({ where: { id: { in: uniqueKeys } }, select: { id: true } });
      const seen = new Set(existing.map((order) => order.id));
      const duplicates = [];
      keys.forEach((key, index) => {
        if (seen.has(key)) duplicates.push(index);
        seen.add(key);
      });
      return res.json({ duplicates });
    }

    let created;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        created = await prisma.$transaction(async (tx) => {
          const existing = await tx.order.findMany({ where: { id: { in: uniqueKeys } }, select: { id: true } });
          const seen = new Set(existing.map((order) => order.id));
          const batch = [];
          for (const [index, order] of orders.entries()) {
            const id = keys[index];
            if (seen.has(id)) continue;
            seen.add(id);
            const { reference, items, ...fields } = order;
            const formattedItems = items.map((item) => ({ ...item, totalPrice: item.quantity * item.unitPrice }));
            const totalProductsAmount = formattedItems.reduce((total, item) => total + item.totalPrice, 0);
            const deliveryFee = zoneById.get(order.zoneId).fraisLivraison;
            const trackingCode = await generateUniqueTrackingCode(tx);
            const saved = await tx.order.create({
              data: {
                ...fields,
                id,
                notes: [reference && `Référence d’import : ${reference}`, fields.notes].filter(Boolean).join('\n') || null,
                totalProductsAmount,
                deliveryFee,
                totalAmount: totalProductsAmount + deliveryFee,
                status: 'VALIDEE',
                items: { create: formattedItems },
                delivery: { create: {
                  trackingCode,
                  status: 'VALIDEE',
                  statusHistories: { create: {
                    status: 'VALIDEE',
                    comment: 'Commande importée et validée par l’administrateur',
                    changedById: req.user.id,
                  } },
                } },
              },
              select: { id: true, delivery: { select: { trackingCode: true } } },
            });
            batch.push({ id: saved.id, trackingCode: saved.delivery.trackingCode });
          }
          return batch;
        }, { isolationLevel: 'Serializable', timeout: 20000 });
        break;
      } catch (error) {
        if (attempt === 2 || !['P2002', 'P2034'].includes(error.code)) throw error;
      }
    }
    return res.status(201).json({ created, skipped: orders.length - created.length });
  } catch (error) {
    return next(error);
  }
}

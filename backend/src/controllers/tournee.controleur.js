import { z } from 'zod';
import prisma from '../config/db.js';

const id = z.string().min(1);
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('assign'), driverId: id, ids: z.array(id).min(1).max(100) }),
  z.object({ action: z.literal('move'), driverId: id, id, adjacentId: id, direction: z.enum(['up', 'down']) }),
  z.object({ action: z.literal('remove'), driverId: id, id }),
  z.object({ action: z.literal('reset') }),
]);

const queueOrder = [{ routePosition: 'asc' }, { assignedAt: 'asc' }, { id: 'asc' }];

async function changeAssignment(tx, delivery, driverId, status, assignedAt, routePosition, comment, adminId) {
  await tx.delivery.update({
    where: { id: delivery.id },
    data: { deliveryPersonId: driverId, status, assignedAt, routePosition },
  });
  await tx.order.update({ where: { id: delivery.orderId }, data: { status } });
  await tx.statusHistory.create({
    data: { deliveryId: delivery.id, status, comment, changedById: adminId },
  });
}

async function saveOrder(tx, queue) {
  for (const [index, delivery] of queue.entries()) {
    if (delivery.routePosition !== index + 1) {
      await tx.delivery.update({ where: { id: delivery.id }, data: { routePosition: index + 1 } });
    }
  }
}

export async function organiseDeliveries(req, res, next) {
  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Action de tournée invalide.' });
  const action = parsed.data;

  try {
    const conflict = await prisma.$transaction(async (tx) => {
      if (action.action === 'reset') {
        const offset = 3 * 60 * 60 * 1000;
        const day = 24 * 60 * 60 * 1000;
        const start = Math.floor((Date.now() + offset) / day) * day - offset;
        await tx.delivery.updateMany({
          where: {
            status: 'AFFECTEE',
            assignedAt: { gte: new Date(start), lt: new Date(start + day) },
            routePosition: { not: null },
          },
          data: { routePosition: null },
        });
        return;
      }

      const queue = await tx.delivery.findMany({
        where: { deliveryPersonId: action.driverId, status: 'AFFECTEE' },
        orderBy: queueOrder,
      });

      if (action.action === 'assign') {
        const driver = await tx.user.findFirst({
          where: { id: action.driverId, role: 'DELIVERY', isActive: true },
          select: { nom: true },
        });
        if (!driver) return 'Le livreur sélectionné est inactif ou introuvable.';

        const ids = [...new Set(action.ids)];
        const candidates = await tx.delivery.findMany({
          where: { id: { in: ids }, status: { in: ['VALIDEE', 'REPROGRAMMEE'] } },
        });
        if (candidates.length !== ids.length) return 'La sélection a changé. Actualisez les courses et réessayez.';

        await saveOrder(tx, queue);
        const assignedAt = new Date();
        const byId = new Map(candidates.map((delivery) => [delivery.id, delivery]));
        for (const [index, deliveryId] of ids.entries()) {
          await changeAssignment(tx, byId.get(deliveryId), action.driverId, 'AFFECTEE',
            assignedAt, queue.length + index + 1, `Course affectée à ${driver.nom}`, req.user.id);
        }
        return;
      }

      const index = queue.findIndex((delivery) => delivery.id === action.id);
      if (index < 0) return 'Cette course a déjà changé de statut ou de livreur.';

      if (action.action === 'remove') {
        await changeAssignment(tx, queue[index], null, 'VALIDEE', null, null,
          'Course retirée de la tournée', req.user.id);
        return;
      }

      const adjacent = index + (action.direction === 'up' ? -1 : 1);
      if (queue[adjacent]?.id !== action.adjacentId) return 'L’ordre des courses a changé. Actualisez et réessayez.';
      [queue[index], queue[adjacent]] = [queue[adjacent], queue[index]];
      await saveOrder(tx, queue);
    }, { isolationLevel: 'Serializable', timeout: 20000 });

    if (conflict) return res.status(409).json({ success: false, message: conflict });
    return res.json({ success: true });
  } catch (error) {
    if (error.code === 'P2034') {
      return res.status(409).json({ success: false, message: 'La tournée a changé. Actualisez et réessayez.' });
    }
    return next(error);
  }
}

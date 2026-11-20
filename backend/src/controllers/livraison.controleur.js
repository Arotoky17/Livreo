import prisma from '../config/db.js';

export const getDeliveries = async (req, res, next) => {
  try {
    const { status, deliveryPersonId } = req.query;
    const where = {};

    // Si livreur connecté : uniquement ses livraisons
    if (req.user.role === 'DELIVERY') {
      where.deliveryPersonId = req.user.id;
    } else if (deliveryPersonId) {
      where.deliveryPersonId = deliveryPersonId;
    }

    if (status) {
      where.status = status;
    }

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        order: {
          include: {
            zone: true,
            items: true,
            seller: { select: { id: true, nom: true, telephone: true } },
          },
        },
        deliveryPerson: {
          select: { id: true, nom: true, telephone: true },
        },
        gpsLogs: {
          orderBy: { recordedAt: 'desc' },
          take: 1, // Dernière position connue
        },
      },
      orderBy: req.user.role === 'DELIVERY'
        ? [{ routePosition: 'asc' }, { assignedAt: 'asc' }, { id: 'asc' }]
        : { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: deliveries.length,
      deliveries,
    });
  } catch (error) {
    next(error);
  }
};

export const getDeliveryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            zone: true,
            items: true,
            seller: { select: { id: true, nom: true, telephone: true } },
          },
        },
        deliveryPerson: {
          select: { id: true, nom: true, telephone: true },
        },
        gpsLogs: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
        statusHistories: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: { select: { id: true, nom: true, role: true } },
          },
        },
      },
    });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Livraison introuvable.',
      });
    }

    // Sécurité Livreur
    if (req.user.role === 'DELIVERY' && delivery.deliveryPersonId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Cette livraison ne vous est pas affectée.',
      });
    }

    res.status(200).json({
      success: true,
      delivery,
    });
  } catch (error) {
    next(error);
  }
};

export const assignDelivery = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deliveryPersonId, notes } = req.body;

    if (!deliveryPersonId) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez sélectionner un livreur.',
      });
    }

    const deliveryPerson = await prisma.user.findFirst({
      where: { id: deliveryPersonId, role: 'DELIVERY', isActive: true },
    });

    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        message: 'Livreur introuvable ou inactif.',
      });
    }

    const delivery = await prisma.delivery.findUnique({ where: { id } });
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Livraison introuvable.',
      });
    }

    if (!['VALIDEE', 'AFFECTEE', 'REPROGRAMMEE'].includes(delivery.status)) {
      return res.status(409).json({ success: false, message: 'Cette course ne peut plus être affectée.' });
    }

    const updated = await prisma.$transaction([
      prisma.delivery.update({
        where: { id, status: delivery.status, deliveryPersonId: delivery.deliveryPersonId },
        data: {
          deliveryPersonId,
          status: 'AFFECTEE',
          assignedAt: new Date(),
          routePosition: deliveryPersonId === delivery.deliveryPersonId ? delivery.routePosition : null,
          notes: notes ? notes.trim() : delivery.notes,
        },
      }),
      prisma.order.update({
        where: { id: delivery.orderId },
        data: { status: 'AFFECTEE' },
      }),
      prisma.statusHistory.create({
        data: {
          deliveryId: id,
          status: 'AFFECTEE',
          comment: `Course affectée à ${deliveryPerson.nom}`,
          changedById: req.user.id,
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: `Course affectée avec succès à ${deliveryPerson.nom}.`,
      delivery: updated[0],
    });
  } catch (error) {
    next(error);
  }
};

export const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, failureReason, collectedAmount, comment } = req.body;

    const validStatuses = ['EN_ROUTE', 'LIVREE', 'ECHEC', 'REPROGRAMMEE'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Statuts acceptés : ${validStatuses.join(', ')}.`,
      });
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Livraison introuvable.',
      });
    }

    // Le livreur ne peut modifier que les courses qui lui sont affectées
    if (req.user.role === 'DELIVERY' && delivery.deliveryPersonId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Action refusée : Cette course ne vous est pas attribuée.',
      });
    }

    const updateData = { status };
    const orderUpdateData = { status };

    if (status === 'EN_ROUTE') {
      if (!delivery.startedAt) {
        updateData.startedAt = new Date();
      }
    } else if (status === 'LIVREE') {
      updateData.completedAt = new Date();
      if (collectedAmount !== undefined && collectedAmount !== null) {
        const parsedCollected = parseFloat(collectedAmount);
        updateData.collectedAmount = parsedCollected;
        // Calcul du reversement vendeur : montant encaissé - frais de livraison
        updateData.sellerPayout = Math.max(0, parsedCollected - delivery.order.deliveryFee);
      }
    } else if (status === 'ECHEC') {
      if (!failureReason || failureReason.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Un motif d’échec est obligatoire (ex: client injoignable, adresse erronée).',
        });
      }
      updateData.failureReason = failureReason.trim();
    }

    const [updatedDelivery] = await prisma.$transaction([
      prisma.delivery.update({
        where: { id, status: delivery.status, deliveryPersonId: delivery.deliveryPersonId },
        data: updateData,
        include: {
          deliveryPerson: { select: { id: true, nom: true, telephone: true } },
          order: true,
        },
      }),
      prisma.order.update({
        where: { id: delivery.orderId },
        data: orderUpdateData,
      }),
      prisma.statusHistory.create({
        data: {
          deliveryId: id,
          status,
          comment: comment || failureReason || `Statut passé à ${status}`,
          changedById: req.user.id,
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: `Statut mis à jour : ${status}.`,
      delivery: updatedDelivery,
    });
  } catch (error) {
    next(error);
  }
};

export const recordLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, accuracy, speed, heading } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Coordonnées GPS (latitude et longitude) requises.',
      });
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      select: { id: true, status: true, deliveryPersonId: true },
    });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Livraison introuvable.',
      });
    }

    // Le livreur doit être celui assigné
    if (req.user.role === 'DELIVERY' && delivery.deliveryPersonId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas envoyer la position pour cette course.',
      });
    }

    // La position n'est enregistrée que si la livraison est active
    if (delivery.status !== 'EN_ROUTE') {
      return res.status(400).json({
        success: false,
        message: 'L’enregistrement GPS n’est actif que pour les livraisons "EN_ROUTE".',
      });
    }

    const gpsLog = await prisma.gpsLog.create({
      data: {
        deliveryId: id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : null,
        speed: speed ? parseFloat(speed) : null,
        heading: heading ? parseFloat(heading) : null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Position enregistrée.',
      log: gpsLog,
    });
  } catch (error) {
    next(error);
  }
};

export const getLiveDeliveriesForMap = async (req, res, next) => {
  try {
    // Récupère toutes les livraisons en cours avec leur dernière position GPS
    const activeDeliveries = await prisma.delivery.findMany({
      where: { status: 'EN_ROUTE' },
      include: {
        deliveryPerson: { select: { id: true, nom: true, telephone: true } },
        order: {
          select: {
            id: true,
            customerName: true,
            customerPhone: true,
            deliveryAddress: true,
            totalAmount: true,
            zone: true,
          },
        },
        gpsLogs: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
    });

    res.status(200).json({
      success: true,
      deliveries: activeDeliveries,
    });
  } catch (error) {
    next(error);
  }
};

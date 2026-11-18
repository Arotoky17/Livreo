import prisma from '../config/db.js';

export const trackByCode = async (req, res, next) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code de suivi obligatoire.',
      });
    }

    const cleanCode = code.trim().toUpperCase();

    const delivery = await prisma.delivery.findUnique({
      where: { trackingCode: cleanCode },
      include: {
        order: {
          select: {
            deliveryAddress: true,
            deliveryDetails: true,
            customerName: true,
            totalAmount: true,
            paymentMethod: true,
            zone: { select: { nom: true } },
            items: {
              select: { productName: true, quantity: true },
            },
          },
        },
        deliveryPerson: {
          select: {
            nom: true,
            telephone: true,
          },
        },
        gpsLogs: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
        statusHistories: {
          orderBy: { createdAt: 'asc' },
          select: {
            status: true,
            comment: true,
            createdAt: true,
          },
        },
      },
    });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Aucune livraison trouvée pour ce code de suivi.',
      });
    }

    // Masquage du nom du client pour la confidentialité
    const nameParts = (delivery.order.customerName || '').split(' ');
    const maskedName = nameParts
      .map((part) => (part.length > 2 ? `${part.slice(0, 2)}***` : part))
      .join(' ');

    // Analyse de la position GPS
    let latestLocation = null;
    let isLocationOutdated = false;

    if (delivery.status === 'EN_ROUTE' && delivery.gpsLogs.length > 0) {
      const log = delivery.gpsLogs[0];
      const now = new Date();
      const diffMinutes = (now.getTime() - new Date(log.recordedAt).getTime()) / (1000 * 60);

      // Si la position a plus de 3 minutes, elle est considérée comme non en direct
      if (diffMinutes > 3) {
        isLocationOutdated = true;
      }

      latestLocation = {
        latitude: log.latitude,
        longitude: log.longitude,
        recordedAt: log.recordedAt,
        isOutdated: isLocationOutdated,
      };
    }

    res.status(200).json({
      success: true,
      tracking: {
        trackingCode: delivery.trackingCode,
        status: delivery.status,
        failureReason: delivery.status === 'ECHEC' ? delivery.failureReason : null,
        recipient: maskedName,
        deliveryAddress: delivery.order.deliveryAddress,
        deliveryDetails: delivery.order.deliveryDetails,
        zoneName: delivery.order.zone.nom,
        items: delivery.order.items,
        totalAmount: delivery.order.totalAmount,
        paymentMethod: delivery.order.paymentMethod,
        deliveryPerson:
          delivery.status === 'EN_ROUTE' || delivery.status === 'AFFECTEE'
            ? delivery.deliveryPerson
            : null,
        currentLocation: latestLocation,
        timeline: delivery.statusHistories,
      },
    });
  } catch (error) {
    next(error);
  }
};

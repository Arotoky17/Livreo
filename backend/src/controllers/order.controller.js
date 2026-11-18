import prisma from '../config/db.js';
import { generateUniqueTrackingCode } from '../services/trackingCode.service.js';

export const createOrder = async (req, res, next) => {
  try {
    const {
      zoneId,
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryDetails,
      paymentMethod = 'CASH_ON_DELIVERY',
      items,
      notes,
    } = req.body;

    // Détermination du vendeur : l'utilisateur connecté s'il est vendeur, sinon spécifié si admin
    const sellerId = req.user.role === 'SELLER' ? req.user.id : req.body.sellerId || req.user.id;

    if (!zoneId || !customerName || !customerPhone || !deliveryAddress) {
      return res.status(400).json({
        success: false,
        message: 'La zone, le nom du client, le téléphone et l’adresse sont obligatoires.',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La commande doit comporter au moins un article.',
      });
    }

    // Récupération de la zone et de ses frais
    const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone) {
      return res.status(404).json({
        success: false,
        message: 'Zone de livraison sélectionnée introuvable.',
      });
    }

    // Calcul des montants des articles
    let totalProductsAmount = 0;
    const formattedItems = items.map((item) => {
      const quantity = parseInt(item.quantity, 10) || 1;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const totalPrice = quantity * unitPrice;
      totalProductsAmount += totalPrice;

      return {
        productName: item.productName.trim(),
        quantity,
        unitPrice,
        totalPrice,
      };
    });

    const deliveryFee = zone.fraisLivraison;
    const totalAmount = totalProductsAmount + deliveryFee;

    const order = await prisma.order.create({
      data: {
        sellerId,
        zoneId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        deliveryDetails: deliveryDetails ? deliveryDetails.trim() : null,
        paymentMethod,
        totalProductsAmount,
        deliveryFee,
        totalAmount,
        status: 'EN_ATTENTE',
        notes: notes ? notes.trim() : null,
        items: {
          create: formattedItems,
        },
      },
      include: {
        items: true,
        zone: true,
        seller: {
          select: { id: true, nom: true, email: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Commande enregistrée avec succès. En attente de validation.',
      order,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const { status, search } = req.query;

    const where = {};

    // Si c'est un vendeur, il ne voit que ses commandes
    if (req.user.role === 'SELLER') {
      where.sellerId = req.user.id;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
        { deliveryAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        zone: true,
        seller: {
          select: { id: true, nom: true, telephone: true },
        },
        delivery: {
          select: {
            id: true,
            trackingCode: true,
            status: true,
            deliveryPerson: {
              select: { id: true, nom: true, telephone: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        zone: true,
        seller: {
          select: { id: true, nom: true, email: true, telephone: true },
        },
        delivery: {
          include: {
            deliveryPerson: {
              select: { id: true, nom: true, telephone: true },
            },
            statusHistories: {
              orderBy: { createdAt: 'desc' },
              include: {
                changedBy: { select: { id: true, nom: true, role: true } },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande introuvable.',
      });
    }

    // Sécurité : Un vendeur ne peut consulter que ses propres commandes
    if (req.user.role === 'SELLER' && order.sellerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette commande.',
      });
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

export const validateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { delivery: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande introuvable.',
      });
    }

    if (order.status !== 'EN_ATTENTE') {
      return res.status(400).json({
        success: false,
        message: `La commande est déjà au statut ${order.status}.`,
      });
    }

    const trackingCode = await generateUniqueTrackingCode();

    // Mise à jour de la commande et création de la livraison dans une transaction
    const [updatedOrder, delivery] = await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: { status: 'VALIDEE' },
      }),
      prisma.delivery.create({
        data: {
          orderId: order.id,
          trackingCode,
          status: 'VALIDEE',
          statusHistories: {
            create: {
              status: 'VALIDEE',
              comment: 'Commande validée par l’administrateur',
              changedById: req.user.id,
            },
          },
        },
        include: {
          statusHistories: true,
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Commande validée avec succès. Code de suivi généré.',
      order: updatedOrder,
      delivery,
    });
  } catch (error) {
    next(error);
  }
};

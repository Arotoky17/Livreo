import prisma from '../config/db.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const isSeller = req.user.role === 'SELLER';
    const sellerId = isSeller ? req.user.id : null;

    const orderFilter = sellerId ? { sellerId } : {};
    const deliveryFilter = sellerId ? { order: { sellerId } } : {};

    const [
      totalOrders,
      pendingOrders,
      inRouteDeliveries,
      completedDeliveries,
      failedDeliveries,
      deliveriesWithMoney,
    ] = await Promise.all([
      prisma.order.count({ where: orderFilter }),
      prisma.order.count({ where: { ...orderFilter, status: 'EN_ATTENTE' } }),
      prisma.delivery.count({ where: { ...deliveryFilter, status: 'EN_ROUTE' } }),
      prisma.delivery.count({ where: { ...deliveryFilter, status: 'LIVREE' } }),
      prisma.delivery.count({ where: { ...deliveryFilter, status: 'ECHEC' } }),
      prisma.delivery.findMany({
        where: {
          ...deliveryFilter,
          status: 'LIVREE',
          collectedAmount: { not: null },
        },
        select: {
          collectedAmount: true,
          sellerPayout: true,
          order: { select: { deliveryFee: true } },
        },
      }),
    ]);

    let totalCollected = 0;
    let totalDeliveryFees = 0;
    let totalSellerPayout = 0;

    deliveriesWithMoney.forEach((d) => {
      const collected = d.collectedAmount || 0;
      const fee = d.order.deliveryFee || 0;
      const payout = d.sellerPayout !== null ? d.sellerPayout : Math.max(0, collected - fee);

      totalCollected += collected;
      totalDeliveryFees += fee;
      totalSellerPayout += payout;
    });

    res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        inRouteDeliveries,
        completedDeliveries,
        failedDeliveries,
        totalCollected,
        totalDeliveryFees,
        totalSellerPayout,
      },
    });
  } catch (error) {
    next(error);
  }
};

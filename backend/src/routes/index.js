import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import zoneRoutes from './zone.routes.js';
import orderRoutes from './order.routes.js';
import deliveryRoutes from './delivery.routes.js';
import trackingRoutes from './tracking.routes.js';
import statsRoutes from './stats.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/zones', zoneRoutes);
router.use('/orders', orderRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/tracking', trackingRoutes);
router.use('/stats', statsRoutes);

// Route de santé (Health check)
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date(),
    service: 'Livreo API',
  });
});

export default router;

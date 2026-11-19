import { Router } from 'express';
import authRoutes from './authentification.routes.js';
import userRoutes from './utilisateur.routes.js';
import zoneRoutes from './zone.routes.js';
import orderRoutes from './commande.routes.js';
import deliveryRoutes from './livraison.routes.js';
import trackingRoutes from './suivi.routes.js';
import statsRoutes from './statistiques.routes.js';

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

import { Router } from 'express';
import {
  getDeliveries,
  getDeliveryById,
  assignDelivery,
  updateDeliveryStatus,
  recordLocation,
  getLiveDeliveriesForMap,
} from '../controllers/delivery.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authenticate);

// Carte en temps réel pour l'administrateur
router.get('/live-map', authorize('ADMIN'), getLiveDeliveriesForMap);

// Liste des livraisons (Admin et Livreur)
router.get('/', authorize('ADMIN', 'DELIVERY'), getDeliveries);
router.get('/:id', authorize('ADMIN', 'DELIVERY'), getDeliveryById);

// Affectation de livreur (Admin uniquement)
router.patch('/:id/assign', authorize('ADMIN'), assignDelivery);

// Mise à jour de statut (Livreur pour ses courses ou Admin)
router.patch('/:id/status', authorize('ADMIN', 'DELIVERY'), updateDeliveryStatus);

// Envoi de la position GPS (Livreur)
router.post('/:id/location', authorize('DELIVERY', 'ADMIN'), recordLocation);

export default router;

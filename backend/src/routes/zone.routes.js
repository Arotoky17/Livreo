import { Router } from 'express';
import { getZones, createZone } from '../controllers/zone.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

// Tout utilisateur authentifié peut voir les zones (ex: vendeur lors de la saisie d'une commande)
router.get('/', authenticate, getZones);

// Seul l'administrateur peut créer ou modifier des zones
router.post('/', authenticate, authorize('ADMIN'), createZone);

export default router;

import { Router } from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  validateOrder,
} from '../controllers/commande.controleur.js';
import { importOrders } from '../controllers/importCommandes.controleur.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authenticate);

// Vendeur & Admin peuvent lister et consulter
router.get('/', authorize('ADMIN', 'SELLER'), getOrders);
router.get('/:id', authorize('ADMIN', 'SELLER'), getOrderById);

// Vendeur & Admin peuvent créer une commande
router.post('/', authorize('ADMIN', 'SELLER'), createOrder);
router.post('/import', authorize('ADMIN'), importOrders);

// Seul l'administrateur valide la commande et déclenche la génération de suivi
router.patch('/:id/validate', authorize('ADMIN'), validateOrder);

export default router;

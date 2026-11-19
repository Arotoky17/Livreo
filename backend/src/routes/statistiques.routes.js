import { Router } from 'express';
import { getDashboardStats } from '../controllers/statistiques.controleur.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

router.get('/', authenticate, authorize('ADMIN', 'SELLER'), getDashboardStats);

export default router;

import { Router } from 'express';
import { getDashboardStats } from '../controllers/stats.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();

router.get('/', authenticate, authorize('ADMIN', 'SELLER'), getDashboardStats);

export default router;

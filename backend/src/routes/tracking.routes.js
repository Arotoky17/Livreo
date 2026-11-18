import { Router } from 'express';
import { trackByCode } from '../controllers/tracking.controller.js';

const router = Router();

// Route publique pour le suivi client
router.get('/:code', trackByCode);

export default router;

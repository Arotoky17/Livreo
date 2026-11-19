import { Router } from 'express';
import { trackByCode } from '../controllers/suivi.controleur.js';

const router = Router();

// Route publique pour le suivi client
router.get('/:code', trackByCode);

export default router;

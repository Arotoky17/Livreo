import { Router } from 'express';
import { login, getMe, changePassword } from '../controllers/authentification.controleur.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/me/password', authenticate, changePassword);

export default router;

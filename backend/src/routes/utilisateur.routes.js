import { Router } from 'express';
import { getUsers, createUser, toggleUserStatus } from '../controllers/utilisateur.controleur.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { getMyPhoto, updateMyPhoto, deleteMyPhoto } from '../controllers/photoProfil.controleur.js';

const router = Router();

// A driver can manage only their own photo; no client-supplied user ID is used.
router.get('/me/photo', authenticate, authorize('DELIVERY'), getMyPhoto);
router.put('/me/photo', authenticate, authorize('DELIVERY'), updateMyPhoto);
router.delete('/me/photo', authenticate, authorize('DELIVERY'), deleteMyPhoto);

// Gestion des utilisateurs réservée aux administrateurs
router.use(authenticate, authorize('ADMIN'));

router.get('/', getUsers);
router.post('/', createUser);
router.patch('/:id/toggle-status', toggleUserStatus);

export default router;

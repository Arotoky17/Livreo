import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import prisma from '../config/db.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé : Token manquant.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ENV.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        nom: true,
        email: true,
        telephone: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur introuvable.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Votre compte est suspendu. Contactez un administrateur.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Votre session a expiré. Veuillez vous reconnecter.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token invalide.',
    });
  }
};

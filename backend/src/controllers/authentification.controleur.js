import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { ENV } from '../config/env.js';
import { profilePhotos } from '../services/profilePhoto.service.js';
import { passwordSession } from '../services/passwordSession.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez renseigner votre email et votre mot de passe.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects (email ou mot de passe invalide).',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Ce compte a été suspendu. Veuillez contacter l’administrateur.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects (email ou mot de passe invalide).',
      });
    }

    // Génération du token JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        nom: user.nom,
        passwordSession: passwordSession(user.password),
      },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      message: 'Connexion réussie.',
      token,
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        telephone: user.telephone,
        role: user.role,
        avatarUrl: user.role === 'DELIVERY' ? await profilePhotos.get(user.id) : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ success: false, message: 'Renseignez les deux mots de passe.' });
    }
    if ([...newPassword].length < 15 || Buffer.byteLength(newPassword, 'utf8') > 72) {
      return res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit comporter au moins 15 caractères et tenir dans 72 octets.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { password: true },
    });
    if (!user || req.passwordSession !== passwordSession(user.password)) {
      return res.status(401).json({ success: false, message: 'Votre session a expiré. Reconnectez-vous.' });
    }
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ success: false, message: 'Le mot de passe actuel est incorrect.' });
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ success: false, message: 'Choisissez un mot de passe différent du mot de passe actuel.' });
    }

    const password = await bcrypt.hash(newPassword, 10);
    const result = await prisma.user.updateMany({
      where: { id: req.user.id, password: user.password, isActive: true },
      data: { password },
    });
    if (result.count === 0) {
      return res.status(401).json({ success: false, message: 'Votre session a expiré. Reconnectez-vous.' });
    }
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      user: { ...req.user, avatarUrl: req.user.role === 'DELIVERY' ? await profilePhotos.get(req.user.id) : null },
    });
  } catch (error) {
    next(error);
  }
};

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { ENV } from '../config/env.js';
import { profilePhotos } from '../services/profilePhoto.service.js';

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

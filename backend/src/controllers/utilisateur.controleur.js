import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';

export const getUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;

    const where = {};
    if (role) {
      where.role = role;
    }
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        nom: true,
        email: true,
        telephone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { nom, email, password, telephone, role } = req.body;

    if (!nom || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Nom, email, mot de passe et rôle sont obligatoires.',
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cette adresse email existe déjà.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        nom: nom.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        telephone: telephone ? telephone.trim() : null,
        role,
        isActive: true,
      },
      select: {
        id: true,
        nom: true,
        email: true,
        telephone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès.',
      user: newUser,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable.',
      });
    }

    // Protection : L'admin ne peut pas se suspendre lui-même
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas suspendre votre propre compte.',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    res.status(200).json({
      success: true,
      message: `Compte ${updatedUser.isActive ? 'activé' : 'suspendu'} avec succès.`,
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

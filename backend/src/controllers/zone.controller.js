import prisma from '../config/db.js';

export const getZones = async (req, res, next) => {
  try {
    const zones = await prisma.zone.findMany({
      where: { isActive: true },
      orderBy: { nom: 'asc' },
    });

    res.status(200).json({
      success: true,
      zones,
    });
  } catch (error) {
    next(error);
  }
};

export const createZone = async (req, res, next) => {
  try {
    const { nom, description, fraisLivraison } = req.body;

    if (!nom || fraisLivraison === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Le nom de la zone et les frais de livraison sont obligatoires.',
      });
    }

    const zone = await prisma.zone.create({
      data: {
        nom: nom.trim(),
        description: description ? description.trim() : null,
        fraisLivraison: parseFloat(fraisLivraison),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Zone de livraison ajoutée.',
      zone,
    });
  } catch (error) {
    next(error);
  }
};

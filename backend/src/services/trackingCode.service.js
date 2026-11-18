import crypto from 'crypto';
import prisma from '../config/db.js';

/**
 * Génère un code de suivi alphanumérique unique et lisible
 * Exemple : LIV-7X92K
 */
export const generateUniqueTrackingCode = async (database = prisma) => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sans caractères ambigus (0, O, 1, I)
  let isUnique = false;
  let code = '';

  while (!isUnique) {
    let randomPart = '';
    const bytes = crypto.randomBytes(5);
    for (let i = 0; i < 5; i++) {
      randomPart += chars[bytes[i] % chars.length];
    }
    code = `LIV-${randomPart}`;

    const existing = await database.delivery.findUnique({
      where: { trackingCode: code },
    });

    if (!existing) {
      isUnique = true;
    }
  }

  return code;
};

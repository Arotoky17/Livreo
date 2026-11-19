import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

async function creerAdministrateur() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!z.string().email().safeParse(email).success) {
    console.error('Renseigne une adresse e-mail valide dans SEED_ADMIN_EMAIL.');
    process.exitCode = 1;
    return;
  }

  if (!password || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    console.error('SEED_ADMIN_PASSWORD doit contenir au moins 8 caractères et au plus 72 octets UTF-8.');
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    await prisma.user.create({
      data: {
        nom: 'Administrateur Livreo',
        email,
        password: await bcrypt.hash(password, 12),
        role: Role.ADMIN,
        isActive: true,
      },
      select: { id: true },
    });
    console.log('Compte administrateur créé.');
  } catch (error) {
    if (error.code === 'P2002') {
      console.error('Cette adresse est déjà utilisée. Le compte existant a été préservé.');
    } else {
      const code = error.code ?? error.errorCode;
      console.error(/^P\d{4}$/.test(code) ? `Échec de la création (${code}).` : 'Échec de la création du compte administrateur.');
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

await creerAdministrateur();

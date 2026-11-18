import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Initialisation du Seed Livreo ---');

  // 1. Création des Utilisateurs
  const salt = await bcrypt.genSalt(10);
  const sellerPassword = await bcrypt.hash('Vendeur123!', salt);

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        nom: 'Administrateur Livreo',
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, salt),
        role: Role.ADMIN,
        isActive: true,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: 'vendeur@livreo.mg' },
    update: {},
    create: {
      nom: 'Boutique Mode & Beauté Live',
      email: 'vendeur@livreo.mg',
      password: sellerPassword,
      telephone: '+261 32 00 000 02',
      role: Role.SELLER,
      isActive: true,
    },
  });

  console.log('✓ Initialisation des comptes terminée');

  // 2. Création des Zones d'Antananarivo
  await prisma.zone.upsert({
    where: { nom: 'Zone 1 - Centre Ville (Analakely, Ankorondrano, Antanimena)' },
    update: {},
    create: {
      nom: 'Zone 1 - Centre Ville (Analakely, Ankorondrano, Antanimena)',
      description: 'Cœur urbain et centres commerciaux d’Antananarivo',
      fraisLivraison: 4000,
    },
  });

  await prisma.zone.upsert({
    where: { nom: 'Zone 2 - Première Couronne (Tanjombato, Analamahitsy, Ivato)' },
    update: {},
    create: {
      nom: 'Zone 2 - Première Couronne (Tanjombato, Analamahitsy, Ivato)',
      description: 'Périphérie proche',
      fraisLivraison: 6000,
    },
  });

  await prisma.zone.upsert({
    where: { nom: 'Zone 3 - Grand Tana (Itaosy, Ambohimangakely, Iavoloha)' },
    update: {},
    create: {
      nom: 'Zone 3 - Grand Tana (Itaosy, Ambohimangakely, Iavoloha)',
      description: 'Axes extérieurs de l’agglomération',
      fraisLivraison: 8000,
    },
  });

  console.log('✓ Zones de livraison créées');

  console.log('--- Seed terminé avec succès ---');
}

main()
  .catch((e) => {
    console.error('Erreur lors du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

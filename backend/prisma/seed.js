import { PrismaClient, Role, OrderStatus, PaymentMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Initialisation du Seed Livreo ---');

  // Nettoyage préalable dans l'ordre des contraintes
  await prisma.statusHistory.deleteMany();
  await prisma.gpsLog.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.user.deleteMany();

  console.log('✓ Anciennes données nettoyées');

  // 1. Création des Utilisateurs
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('Admin123!', salt);
  const sellerPassword = await bcrypt.hash('Vendeur123!', salt);
  const deliveryPassword = await bcrypt.hash('Livreur123!', salt);

  const admin = await prisma.user.create({
    data: {
      nom: 'Administrateur Livreo',
      email: 'admin@livreo.mg',
      password: adminPassword,
      telephone: '+261 34 00 000 01',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const seller = await prisma.user.create({
    data: {
      nom: 'Boutique Mode & Beauté Live',
      email: 'vendeur@livreo.mg',
      password: sellerPassword,
      telephone: '+261 32 00 000 02',
      role: Role.SELLER,
      isActive: true,
    },
  });

  const deliveryPerson = await prisma.user.create({
    data: {
      nom: 'Rakoto Livreur Express',
      email: 'livreur@livreo.mg',
      password: deliveryPassword,
      telephone: '+261 33 00 000 03',
      role: Role.DELIVERY,
      isActive: true,
    },
  });

  console.log('✓ Utilisateurs créés (Admin, Vendeur, Livreur)');

  // 2. Création des Zones d'Antananarivo
  const zone1 = await prisma.zone.create({
    data: {
      nom: 'Zone 1 - Centre Ville (Analakely, Ankorondrano, Antanimena)',
      description: 'Cœur urbain et centres commerciaux d’Antananarivo',
      fraisLivraison: 4000,
    },
  });

  const zone2 = await prisma.zone.create({
    data: {
      nom: 'Zone 2 - Première Couronne (Tanjombato, Analamahitsy, Ivato)',
      description: 'Périphérie proche',
      fraisLivraison: 6000,
    },
  });

  const zone3 = await prisma.zone.create({
    data: {
      nom: 'Zone 3 - Grand Tana (Itaosy, Ambohimangakely, Iavoloha)',
      description: 'Axes extérieurs de l’agglomération',
      fraisLivraison: 8000,
    },
  });

  console.log('✓ Zones de livraison créées');

  // 3. Création d'une commande test issue d'un live TikTok
  const order1 = await prisma.order.create({
    data: {
      sellerId: seller.id,
      zoneId: zone1.id,
      customerName: 'Aina Rasoanaivo',
      customerPhone: '+261 34 12 345 67',
      deliveryAddress: 'Près Pharmacie Principale, Analakely',
      deliveryDetails: 'Maison avec portail vert en face du kiosque',
      paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      totalProductsAmount: 45000,
      deliveryFee: 4000,
      totalAmount: 49000,
      status: OrderStatus.EN_ROUTE,
      notes: 'Commande live TikTok du 12/11 lot n°4',
      items: {
        create: [
          {
            productName: 'Robe d’été fleurie (Taille M)',
            quantity: 1,
            unitPrice: 35000,
            totalPrice: 35000,
          },
          {
            productName: 'Accessoire Cheveux Doré',
            quantity: 2,
            unitPrice: 5000,
            totalPrice: 10000,
          },
        ],
      },
    },
  });

  // 4. Création de la livraison associée avec code de suivi
  const delivery1 = await prisma.delivery.create({
    data: {
      orderId: order1.id,
      deliveryPersonId: deliveryPerson.id,
      trackingCode: 'LIV-8X92K',
      status: OrderStatus.EN_ROUTE,
      collectedAmount: null,
      sellerPayout: null,
      assignedAt: new Date(Date.now() - 3600 * 1000), // affecté il y a 1h
      startedAt: new Date(Date.now() - 1200 * 1000), // démarré il y a 20 min
      gpsLogs: {
        create: [
          {
            latitude: -18.9101,
            longitude: 47.5256,
            accuracy: 10,
            recordedAt: new Date(Date.now() - 600 * 1000),
          },
          {
            latitude: -18.9135,
            longitude: 47.5278,
            accuracy: 8,
            recordedAt: new Date(), // position actuelle
          },
        ],
      },
      statusHistories: {
        create: [
          {
            status: OrderStatus.VALIDEE,
            comment: 'Commande validée par l’administrateur',
            changedById: admin.id,
          },
          {
            status: OrderStatus.AFFECTEE,
            comment: 'Course affectée au livreur Rakoto',
            changedById: admin.id,
          },
          {
            status: OrderStatus.EN_ROUTE,
            comment: 'Livreur en route vers Analakely',
            changedById: deliveryPerson.id,
          },
        ],
      },
    },
  });

  console.log(`✓ Commande & Livraison de démonstration créées (Code suivi : ${delivery1.trackingCode})`);
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

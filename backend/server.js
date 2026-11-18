import app from './src/app.js';
import { ENV } from './src/config/env.js';
import prisma from './src/config/db.js';

const startServer = async () => {
  try {
    // Vérification de la connexion PostgreSQL
    await prisma.$connect();
    console.log('✓ Connecté avec succès à la base PostgreSQL (Livreo)');

    app.listen(ENV.PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur Livreo démarré sur http://localhost:${ENV.PORT}`);
      console.log(`📡 API disponible sur http://localhost:${ENV.PORT}/api`);
    });
  } catch (error) {
    console.error('Erreur au démarrage du serveur :', error);
    process.exit(1);
  }
};

startServer();

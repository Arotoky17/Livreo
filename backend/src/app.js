import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// Middlewares globaux
app.use(
  cors({
    origin: '*', // Permet les tests locaux et multi-appareils (smartphone sur le même Wi-Fi)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Déclaration des routes de l'API
app.use('/api', routes);

// Gestion 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route introuvable : ${req.method} ${req.originalUrl}`,
  });
});

// Middleware d'erreur global
app.use(errorHandler);

export default app;

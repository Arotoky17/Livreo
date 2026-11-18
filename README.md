# Livreo

Plateforme de gestion des commandes et de suivi des livraisons à Madagascar.

## Organisation

Les noms habituels sont conservés, avec les fichiers regroupés par fonction.

```text
Livreo/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── components/
│   │   │   ├── delivery/     Carte et étapes de livraison
│   │   │   ├── navigation/   Menu, logo et structure des espaces
│   │   │   ├── profile/      Avatar et modification de photo
│   │   │   └── ui/           Éléments communs et graphique
│   │   ├── context/          Authentification et session
│   │   ├── hooks/            Chargement des données et partage GPS
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   ├── delivery/
│   │   │   ├── public/       Accueil, connexion et suivi
│   │   │   └── seller/
│   │   ├── assets/           Illustrations et icônes du code
│   │   ├── services/         Appels API et préparation des photos
│   │   ├── styles/           Feuilles CSS regroupées
│   │   └── utils/            Statistiques et règles de livraison
│   ├── public/               Images et icônes servies directement
│   └── tests/
├── backend/
│   ├── server.js
│   ├── src/
│   │   ├── app.js
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   └── services/
│   ├── prisma/
│   ├── storage/              Photos privées, exclues de Git
│   └── tests/
└── tools/                    Lancement des deux applications
```

## Démarrage

Depuis `D:\Livreo`, dans PowerShell :

```powershell
npm.cmd run dev
```

Ou dans deux terminaux séparés :

```powershell
npm.cmd run backend
npm.cmd run frontend
```

Les commandes habituelles restent disponibles dans chaque dossier : `cd backend` ou `cd frontend`, puis `npm.cmd run dev`.

- Interface : http://localhost:5173
- API : http://localhost:5000/api
- Configuration : `backend/.env`, d’après `backend/.env.example`.
- Installation si nécessaire : `npm.cmd --prefix frontend install` et `npm.cmd --prefix backend install`.

## Vérifications depuis la racine

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test
```

## Pages principales

| Espace | Fichier | Adresse |
| --- | --- | --- |
| Accueil | `frontend/src/pages/public/HomePage.jsx` | `/` |
| Connexion | `frontend/src/pages/public/LoginPage.jsx` | `/login` |
| Suivi public | `frontend/src/pages/public/PublicTrackingPage.jsx` | `/tracking` |
| Administration | `frontend/src/pages/admin/AdminDashboard.jsx` | `/admin` |
| Vendeur | `frontend/src/pages/seller/SellerOrdersPage.jsx` | `/seller` |
| Nouvelle commande | `frontend/src/pages/seller/OrderWizard.jsx` | `/seller?section=new` |
| Livreur | `frontend/src/pages/delivery/DeliveryDriverPage.jsx` | `/delivery` |
| Photo de profil | `frontend/src/components/profile/ProfilePhotoEditor.jsx` | `/delivery?section=profile` |

## Comptes de démonstration

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| Administrateur | admin@livreo.mg | Admin123! |
| Vendeur | vendeur@livreo.mg | Vendeur123! |
| Livreur | livreur@livreo.mg | Livreur123! |

## Base de données

Les commandes Prisma se lancent dans `backend` : `npm.cmd run prisma:generate`, `npm.cmd run prisma:migrate` et `npm.cmd run prisma:studio`.

`npm.cmd run prisma:seed` exécute `prisma/seed.js` et réinitialise les données de démonstration. Cette commande n’est pas nécessaire après un renommage de fichiers.

## Photos de profil

Les livreurs ajoutent ou suppriment leur photo dans **Mon profil**. Les images JPG, PNG et WebP sont recadrées puis compressées en JPEG 320 × 320, avec un maximum de 60 Ko après compression. L’API vérifie la photo et limite les opérations au livreur connecté.

Les fichiers sont conservés dans `backend/storage/profile-photos/`. En hébergement, définir `PROFILE_PHOTOS_DIR` vers un volume persistant et sauvegarder ce dossier. Les photos ne sont pas exposées sur le suivi public.

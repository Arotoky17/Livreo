# Rapport d’avancement du projet Livreo

Date : 13 novembre 2026

Livreo dispose d’un MVP avancé : les espaces administrateur, vendeur, livreur et client sont implémentés et reliés à l’API. Les derniers travaux ont porté sur les interfaces issues des maquettes, la photo de profil du livreur et l’organisation du code. La conformité complète au cahier des charges reste à finaliser, notamment pour les tournées, les reversements réellement effectués et les contrôles métier côté serveur.

Les statuts ci-dessous décrivent le code disponible. Ils ne remplacent pas une recette complète sur smartphone et en conditions réelles.

## Fonctionnalités par espace

| Espace | Fonctions disponibles |
| --- | --- |
| Accueil | Présentation issue de la maquette, navigation, formulaire de suivi transmettant le code saisi. |
| Connexion | Présentation par rôle, authentification existante, redirection selon le rôle réel du compte. |
| Administration | Indicateurs, graphique sur 7/30/90 jours, recherche et filtres, validation, codes de suivi, affectation avec consignes, reprogrammation après échec, détail et historique, carte GPS. |
| Comptes | Création de vendeurs et livreurs, activation et suspension par l’administrateur. |
| Zones | Consultation, création et calcul des frais associés. |
| Vendeur | Tableau de bord, commande en trois étapes, recherche, suivi des commandes et livraisons, consultation des montants vendeur calculés. |
| Livreur | Courses affectées, détail, démarrage, GPS des courses actives, confirmation de remise, échec motivé, encaissement pour le paiement à réception, historique et profil. |
| Client public | Suivi sans compte par code, statut, étapes horodatées, carte de la position disponible, signal ancien identifié, actualisation toutes les 15 secondes. |
| Photo de profil | Ajout, aperçu, remplacement, suppression, affichage dans l’en-tête et conservation après reconnexion. |

La photo du livreur est préparée par le navigateur à partir d’un JPG, PNG ou WebP de 5 Mo maximum. Elle est recadrée en JPEG 320 × 320 et limitée à 60 Ko après compression. L’API vérifie le format et les dimensions, et autorise uniquement le livreur connecté à gérer sa propre photo. Le stockage privé est dans `backend/storage/profile-photos/`.

## Comparaison avec les besoins fonctionnels

| Référence | Besoin | État actuel |
| --- | --- | --- |
| BF01 | Authentification selon le rôle | Implémentée ; sécurité de production à durcir. |
| BF02 | Créer, modifier, activer et suspendre les comptes | Partiel : modification des informations d’un compte manquante. |
| BF03 | Enregistrer une commande complète | Implémenté dans l’interface ; validation serveur à renforcer. |
| BF04 | Consulter et vérifier les commandes | Implémenté : recherche, filtres et fiche détaillée. |
| BF05 | Valider et générer un code unique | Implémenté. |
| BF06 | Affecter une commande à un livreur | Implémenté ; règles de réaffectation à renforcer côté serveur. |
| BF07 | Organiser manuellement les trajets | Partiel : affectation et consignes ; pas de tournée structurée avec ordre de passage. |
| BF08 | Consulter les courses affectées | Implémenté. |
| BF09 | Mettre à jour les statuts et motiver les échecs | Implémenté ; transitions et droits de reprogrammation à verrouiller côté serveur. |
| BF10 | Envoyer le GPS pendant une course active | Implémenté avec une fréquence cible de 30 secondes ; validation réelle sur smartphone à effectuer. |
| BF11 | Carte administrateur | Implémentée ; rendu et comportement réel à valider dans un navigateur. |
| BF12 | Suivi public par code | Implémenté avec actualisation et indication de position ancienne. |
| BF13 | Historique horodaté des statuts | Implémenté et consultable dans le détail administrateur. |
| BF14 | Gérer les zones et tarifs | Partiel : modification et désactivation manquantes. |
| BF15 | Enregistrer l’encaissement éventuel | Implémenté ; contrôles serveur des montants et du mode de paiement à renforcer. |
| BF16 | Calculer et enregistrer les reversements | Partiel : montant calculé et stocké ; versement réellement effectué non enregistré. |
| BF17 | Consulter les commandes et reversements | Partiel : commandes et montants calculés visibles ; état payé/non payé absent. |
| BF18 | Tableau de bord administrateur | Implémenté à partir des données de l’application. |

## Vérifications effectuées

- Dernière compilation frontend : réussie.
- Dernière exécution des tests : 10 réussis sur 10.
- Couverture des tests : dates à Madagascar, statistiques et montants vendeur, recherche, validation des articles, paiement prépayé et à réception, sélection des courses GPS, validation et stockage des photos.
- Contrôles API réalisés : authentification, consultation des ressources administrateur, vendeur et livreur, suivi public et détail des commandes.
- Parcours photo vérifié via API : ajout, lecture dans le profil, reconnexion, suppression et restauration de l’état initial du compte de démonstration.
- Contrôles d’accès photo vérifiés : refus sans authentification et refus pour un vendeur.
- Contrôle HTTP de ce rapport : accueil et état de santé de l’API accessibles.
- Lint : deux avertissements préexistants dans `frontend/src/context/AuthContext.jsx`.
- Compilation : avertissement de taille du fichier JavaScript principal, environ 587 Ko avant compression.

Les 10 tests automatisés ne couvrent pas l’ensemble des parcours métier. La création d’une commande jusqu’à sa livraison, le rendu des pages sur différentes tailles d’écran et le GPS réel restent à recetter dans un navigateur et sur smartphone. Aucun navigateur n’était accessible dans la session pour effectuer ces vérifications visuelles.

## Travaux prioritaires

1. Verrouiller les transitions de statut, les droits de reprogrammation et les réaffectations côté API.
2. Renforcer la validation serveur des quantités, prix, coordonnées et encaissements, ainsi que le traitement des commandes prépayées.
3. Ajouter un enregistrement des reversements effectués : vendeur, commandes concernées, montant, date et état payé/non payé.
4. Compléter la modification des comptes et la modification/désactivation des zones et tarifs.
5. Ajouter une organisation des tournées avec ordre de passage persistant.
6. Réaliser une recette mobile en HTTPS : permission GPS, interruption réseau, reprise, plusieurs courses et arrêt du partage à la clôture.
7. Préparer l’hébergement : configuration de sécurité, stockage persistant des photos, sauvegardes et migrations de base versionnées.
8. Corriger les avertissements d’authentification et réduire le chargement initial par découpage du JavaScript.

Le secret JWT de secours et la configuration CORS ouverte doivent être adaptés avant une mise en production. L’hébergement public et HTTPS ne sont pas attestés par les vérifications locales.

## Organisation et lancement

Les noms anglais ont été rétablis à la demande de l’utilisateur. Le rangement reste organisé : `frontend`, `backend`, `tools`, composants par fonction, feuilles CSS regroupées dans `styles` et tests séparés dans `tests`. Les imports et commandes ont été mis à jour. Les routes existantes et les fonctionnalités sont conservées.

Depuis `D:\Livreo` :

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
npm.cmd test
```

- Interface : http://localhost:5173
- API : http://localhost:5000/api
- Documentation : `README.md` à la racine.

## Périmètre conservé

Les intégrations automatiques TikTok/Facebook, le catalogue et les stocks, les SMS, Mobile Money, l’application mobile native et l’optimisation automatique des itinéraires restent hors du MVP prévu dans le cahier des charges. Leur absence ne constitue pas une fonctionnalité MVP manquante.

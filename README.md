# Bottin des artistes - Diversité Artistique Montréal

Une plateforme web pour Diversité Artistique Montréal (DAM) qui connecte les artistes diversifiés au Québec à travers un écosystème numérique complet.

## Technologies

- Frontend: React.js avec Tailwind CSS
- Backend: Express.js
- Base de données: PostgreSQL via Supabase
- ORM: Drizzle ORM

## Prérequis

- Node.js (v18 ou plus récent)
- Accès à une base de données PostgreSQL (Supabase recommandé)

## Configuration locale

1. Clonez ce dépôt
2. Copiez le fichier `.env.example` vers `.env` et mettez à jour les variables d'environnement:
   ```
   cp .env.example .env
   ```
3. Modifiez le fichier `.env` avec vos informations de connexion à la base de données
4. Installez les dépendances:
   ```
   npm install
   ```
5. Lancez l'application en mode développement:
   ```
   npm run dev
   ```

## Déploiement sur Koyeb

### Prérequis

- Un compte [Koyeb](https://www.koyeb.com)
- Un dépôt GitHub contenant votre code
- Une base de données PostgreSQL (Supabase recommandé)

### Étapes de déploiement

1. Connectez-vous à votre compte Koyeb
2. Créez une nouvelle application en choisissant "GitHub" comme source
3. Sélectionnez votre dépôt et la branche à déployer
4. Configurez le service:
   - **Name**: bottin-des-artistes (ou autre)
   - **Region**: Choisissez la plus proche de vos utilisateurs
   - **Instance Type**: Nano (pour le niveau gratuit)
   - **Environment variables**:
     - `DATABASE_URL`: Votre chaîne de connexion PostgreSQL Supabase
     - `SESSION_SECRET`: Une chaîne aléatoire pour sécuriser les sessions
     - `NODE_ENV`: production

5. Cliquez sur "Deploy"

### Configuration avancée sur Koyeb

Koyeb détectera automatiquement le fichier `koyeb.yaml` qui contient toutes les configurations nécessaires:
- Serveur web sur le port 5000
- Variables d'environnement requises
- Endpoint de santé (/health)
- Règles de scaling

### Mise à jour du déploiement

Pour mettre à jour votre application:
1. Poussez vos modifications vers votre dépôt GitHub
2. Koyeb déploiera automatiquement la nouvelle version

## Configuration de la base de données

Ce projet utilise Supabase comme service de base de données PostgreSQL. Pour mettre en place votre propre base de données:

1. Créez un compte sur [Supabase](https://supabase.com/)
2. Créez un nouveau projet
3. Récupérez la chaîne de connexion PostgreSQL depuis "Settings" > "Database"
4. Utilisez cette chaîne comme valeur pour la variable d'environnement `DATABASE_URL`

## Environnement de développement

- Le projet est configuré pour le hot-reloading en mode développement
- Les modifications du code frontend et backend sont automatiquement prises en compte
- Utilisez `npm run build` pour créer une version de production

## Structure du projet

- `/client`: Code du frontend React
- `/server`: API backend Express
- `/shared`: Code partagé entre frontend et backend (schémas Drizzle)
- `/drizzle`: Configurations de la base de données

## Caractéristiques principales

- Authentification complète
- Profils d'artistes personnalisables
- Section TROC'DAM pour les annonces
- Galeries de médias
- Messagerie entre artistes
- Tableau de bord administrateur
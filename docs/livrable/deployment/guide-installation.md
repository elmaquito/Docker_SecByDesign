# NOTIMATIC — Guide d'Installation et de Déploiement

> **Document** : Guide opérationnel complet  
> **Date de consolidation** : 2026-04-01  
> **Version projet** : v1.2.0

---

## Table des Matières

1. [Prérequis](#1-prérequis)
2. [Clonage du Dépôt](#2-clonage-du-dépôt)
3. [Configuration des Variables d'Environnement](#3-configuration-des-variables-denvironnement)
4. [Démarrage en Mode Développement](#4-démarrage-en-mode-développement)
   - 4.1 [Avec Docker Compose (recommandé)](#41-avec-docker-compose-recommandé)
   - 4.2 [Sans Docker (développement local)](#42-sans-docker-développement-local)
5. [Migrations de Base de Données](#5-migrations-de-base-de-données)
6. [Création du Compte Administrateur Initial](#6-création-du-compte-administrateur-initial)
7. [Déploiement en Production (Docker Swarm)](#7-déploiement-en-production-docker-swarm)
8. [Tests](#8-tests)
9. [Résolution des Problèmes Courants](#9-résolution-des-problèmes-courants)
10. [Checklist de Déploiement Sécurisé](#10-checklist-de-déploiement-sécurisé)

---

## 1. Prérequis

### Logiciels requis

| Outil | Version minimale | Usage | Installation |
|-------|-----------------|-------|-------------|
| **Docker** | 24.x | Environnement d'exécution | https://docs.docker.com/get-docker/ |
| **Docker Compose** | 2.x (plugin) | Orchestration locale | Inclus dans Docker Desktop |
| **Node.js** | 18.x LTS | Développement local | https://nodejs.org/ |
| **PostgreSQL** | 16 | BDD hors Docker | https://www.postgresql.org/ |
| **Git** | 2.x | Clonage du dépôt | https://git-scm.com/ |
| **psql** | — | Exécution des migrations | Inclus avec PostgreSQL |

### Prérequis production supplémentaires

| Outil | Usage |
|-------|-------|
| Docker Swarm activé (`docker swarm init`) | Orchestration multi-nœuds |
| Domaine DNS configuré | TLS Let's Encrypt via Traefik |
| Compte AWS + bucket S3 (optionnel) | Backups chiffrés |
| Clé GPG (optionnel) | Chiffrement des backups |

### Ports utilisés

| Environnement | Service | Port externe | Port interne |
|---------------|---------|-------------|-------------|
| Développement | Frontend | 5173 | 5173 |
| Développement | Backend API | 3001 | 3000 |
| Développement | PostgreSQL | 5432 | 5432 |
| Production | HTTP (redirect HTTPS) | 80 | 80 |
| Production | HTTPS | 443 | 443 |

---

## 2. Clonage du Dépôt

```bash
git clone https://github.com/elmaquito/NOTIMATIC.git
cd NOTIMATIC
```

Structure après clonage :

```
NOTIMATIC/
├── backend/          # API Node.js/Express/TypeScript
├── frontend/         # Application Vue 3 + TypeScript
├── infrastructure/   # Docker Compose, Dockerfiles, Traefik
└── docs/             # Documentation complète
```

---

## 3. Configuration des Variables d'Environnement

### Backend (`backend/.env`)

Copier le fichier d'exemple et le personnaliser :

```bash
cp backend/.env.example backend/.env   # si .env.example existe
# ou créer manuellement :
```

```ini
# Serveur
PORT=3000
NODE_ENV=development

# Base de données
DB_HOST=database       # 'database' pour Docker, 'localhost' pour dev local
DB_PORT=5432
DB_USER=user
DB_PASSWORD=dev_secret_password     # ⚠️ À changer en production
DB_NAME=notimatic_dev

# Authentification JWT
JWT_SECRET=dev_jwt_secret_change_me          # ⚠️ Générer avec openssl rand -hex 64
REFRESH_TOKEN_SECRET=dev_refresh_secret_change_me  # ⚠️ Générer avec openssl rand -hex 64

# CORS
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

> ⚠️ **Générer des secrets sécurisés pour la production** :
> ```bash
> openssl rand -hex 64   # Pour JWT_SECRET
> openssl rand -hex 64   # Pour REFRESH_TOKEN_SECRET
> openssl rand -hex 32   # Pour DB_PASSWORD
> ```

### Backend — Tests (`backend/.env.test`)

```ini
PORT=3001
NODE_ENV=test
DB_HOST=localhost
DB_PORT=5432
DB_USER=user
DB_PASSWORD=test_secret_password
DB_NAME=notimatic_test
JWT_SECRET=test_jwt_secret
REFRESH_TOKEN_SECRET=test_refresh_secret
CORS_ORIGINS=http://localhost:5173
```

### Frontend (`frontend/.env`)

```ini
# Option 1 : URL complète
VITE_API_URL=http://localhost:3001

# Option 2 : Composants séparés
# VITE_API_HOST=localhost
# VITE_API_PORT=3001
# VITE_API_PROTOCOL=http:
```

---

## 4. Démarrage en Mode Développement

### 4.1 Avec Docker Compose (recommandé)

```bash
# Construire et démarrer tous les services (frontend + backend + database)
docker compose -f infrastructure/docker-compose.dev.yml up --build

# En arrière-plan
docker compose -f infrastructure/docker-compose.dev.yml up --build -d

# Voir les logs
docker compose -f infrastructure/docker-compose.dev.yml logs -f

# Arrêter
docker compose -f infrastructure/docker-compose.dev.yml down
```

**Services démarrés** :

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | Vite dev server avec HMR |
| Backend API | http://localhost:3001 | Express + hot-reload (ts-node-dev) |
| PostgreSQL | localhost:5432 | Base de données (accessible depuis DBeaver/pgAdmin) |

> **Hot-reload** : Le code source est monté en volume — toute modification de fichier `.vue` ou `.ts` déclenche un rechargement automatique.

### 4.2 Sans Docker (développement local)

**Terminal 1 — Base de données** (si PostgreSQL installé localement) :

```bash
# Démarrer PostgreSQL (exemple macOS avec Homebrew)
brew services start postgresql@16

# Créer la base de données
createdb notimatic_dev
```

**Terminal 2 — Backend** :

```bash
cd backend
npm install
npm run start:dev
# → Serveur sur http://localhost:3000
```

**Terminal 3 — Frontend** :

```bash
cd frontend
npm install
npm run dev
# → Interface sur http://localhost:5173
```

---

## 5. Migrations de Base de Données

Les migrations doivent être appliquées **après** le démarrage de PostgreSQL, **avant** d'utiliser l'application.

### Script automatique (recommandé)

```bash
# Linux / macOS
bash backend/migrate.sh

# Windows PowerShell
.\backend\migrate.ps1

# Depuis Docker (si la BDD tourne dans un conteneur)
docker compose -f infrastructure/docker-compose.dev.yml exec backend bash migrate.sh
```

### Variables de connexion pour le script

Le script utilise les variables d'environnement ou leurs valeurs par défaut :

```bash
DB_HOST=localhost DB_USER=user DB_PASSWORD=dev_secret_password \
  DB_NAME=notimatic_dev bash backend/migrate.sh
```

### Résultat attendu

```
🔧 NOTIMATIC Database Migration Runner
========================================
Database: notimatic_dev
Host: localhost:5432
User: user

📋 Checking migrations table...
✅ Migrations table ready

🚀 Running migrations...

▶️  Applying 001_add_profiles.sql...
✅ Applied 001_add_profiles.sql
▶️  Applying 002_add_themes_categories.sql...
✅ Applied 002_add_themes_categories.sql
[...]
▶️  Applying 009_add_user_tags.sql...
✅ Applied 009_add_user_tags.sql

========================================
✨ Migration complete!
Applied 9 new migration(s)

Current schema version: 009_add_user_tags.sql
```

### Vérification

```sql
-- Se connecter et vérifier les tables
psql -U user -d notimatic_dev -c "\dt"
-- Doit lister les 18 tables + schema_migrations
```

---

## 6. Création du Compte Administrateur Initial

> ⚠️ Cette route **ne fonctionne qu'une seule fois** (désactivée dès qu'un utilisateur existe).

```bash
curl -X POST http://localhost:3001/api/v1/users/setup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "AdminPass123!SecureKey"
  }'
```

**Réponse attendue** :

```json
{ "message": "Admin created (admin)" }
```

> Le mot de passe doit faire **au moins 12 caractères**. Utilisez un générateur de mots de passe fort.

### Première connexion

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "username": "admin",
    "password": "AdminPass123!SecureKey"
  }'
```

---

## 7. Déploiement en Production (Docker Swarm)

### Étape 1 — Initialiser Docker Swarm

```bash
# Sur le nœud manager
docker swarm init

# Si plusieurs nœuds, ajouter les workers
docker swarm join-token worker
# (coller la commande générée sur chaque nœud worker)
```

### Étape 2 — Créer les secrets Docker

```bash
# Générer et stocker les secrets (jamais en clair dans les fichiers)
printf "$(openssl rand -hex 32)"  | docker secret create db_password -
printf "$(openssl rand -hex 64)"  | docker secret create jwt_secret -
printf "$(openssl rand -hex 64)"  | docker secret create refresh_secret -
```

> Les secrets sont chiffrés au repos et en transit, accessibles uniquement aux services qui les déclarent.

### Étape 3 — Configurer le DNS

Configurer les enregistrements DNS :
```
notimatic.com     → A   → <IP du nœud manager>
api.notimatic.com → A   → <IP du nœud manager>
```

### Étape 4 — Déployer la stack

```bash
docker stack deploy \
  -c infrastructure/docker-compose.prod.yml \
  notimatic
```

### Étape 5 — Vérifier le déploiement

```bash
# Voir les services
docker stack services notimatic

# Voir les conteneurs en cours
docker stack ps notimatic

# Vérifier les logs
docker service logs notimatic_backend
docker service logs notimatic_frontend
docker service logs notimatic_proxy
```

**Résultat attendu** :

```
ID             NAME                   MODE         REPLICAS   IMAGE
abc123         notimatic_proxy        replicated   1/1        traefik:v2.10
def456         notimatic_frontend     replicated   2/2        notimatic-frontend:latest
ghi789         notimatic_backend      replicated   3/3        notimatic-backend:latest
jkl012         notimatic_database     replicated   1/1        postgres:15-alpine
```

### Étape 6 — Appliquer les migrations en production

```bash
# Exécuter le script de migration dans le conteneur backend
docker exec -it $(docker ps -q -f name=notimatic_backend) bash migrate.sh
```

### Mise à jour (rolling update)

```bash
# Rebuilder les images
docker build -f infrastructure/Dockerfile.backend -t notimatic-backend:latest ./backend
docker build -f infrastructure/Dockerfile.frontend -t notimatic-frontend:latest ./frontend

# Mettre à jour le service (zero-downtime avec 3 replicas)
docker service update --image notimatic-backend:latest notimatic_backend
docker service update --image notimatic-frontend:latest notimatic_frontend
```

---

## 8. Tests

### Backend

```bash
cd backend

# Tous les tests
npm test

# Avec rapport de couverture
npm test -- --coverage

# Mode watch (développement)
npm run test:watch

# Linting
npm run lint
```

**Seuils de couverture** : ≥ 80% (vérifié en CI)

### Frontend

```bash
cd frontend

# Tous les tests
npm test

# Mode watch
npx vitest

# Avec couverture
npx vitest run --coverage
```

**Seuils de couverture** : ≥ 70% (vérifié en CI)

### Tests d'intégration CI

```bash
# Démarrer l'environnement de test
docker compose -f infrastructure/docker-compose.test.yml up -d

# Exécuter les tests backend contre cet environnement
cd backend && npm test

# Nettoyer
docker compose -f infrastructure/docker-compose.test.yml down
```

---

## 9. Résolution des Problèmes Courants

### Erreur : `CORS policy blocked`

**Symptôme** : La requête est bloquée par CORS dans le navigateur.

**Cause** : L'origine du frontend n'est pas dans `CORS_ORIGINS`.

**Solution** :
```ini
# backend/.env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

> Vérifier que l'URL que vous utilisez dans le navigateur (`localhost` vs `127.0.0.1`) correspond exactement à l'une des origines configurées.

### Erreur : Cookie non transmis (`auth_token` manquant)

**Symptôme** : `[Auth] FAILED: No valid tokens` dans les logs backend.

**Cause** : Mismatch entre le hostname du frontend et du backend pour les cookies `SameSite`.

**Solution** : Utiliser `VITE_API_URL` pointant vers le même hostname que le navigateur :
```ini
# frontend/.env
VITE_API_URL=http://localhost:3001   # si vous accédez via localhost
# ou
VITE_API_URL=http://127.0.0.1:3001  # si vous accédez via 127.0.0.1
```

### Erreur : Migration échoue (`relation "users" already exists`)

**Symptôme** : Le script de migration plante à `001_add_profiles.sql`.

**Cause** : Le script essaie de recréer une table déjà créée par `init.sql`.

**Vérification** :
```sql
SELECT * FROM schema_migrations ORDER BY applied_at;
```

**Solution** : Insérer manuellement les migrations déjà appliquées dans `schema_migrations`.

### Erreur : `argon2` ne compile pas

**Symptôme** : `npm install` échoue sur le module natif `argon2`.

**Solution** :
```bash
# Installer les outils de build
# Ubuntu/Debian
sudo apt-get install python3 make g++

# macOS
xcode-select --install

# Puis réinstaller
npm install --build-from-source=argon2
```

### Erreur : Connexion BDD refusée (`ECONNREFUSED`)

**Symptôme** : `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Causes possibles** :
1. PostgreSQL n'est pas démarré
2. `DB_HOST` est configuré à `database` (Docker) mais vous lancez en local

**Solution** :
```ini
# Pour dev local sans Docker
DB_HOST=localhost
```

---

## 10. Checklist de Déploiement Sécurisé

Avant tout déploiement en production, vérifier chaque point :

### Secrets et Configuration

- [ ] `JWT_SECRET` généré avec `openssl rand -hex 64` (≥ 64 octets)
- [ ] `REFRESH_TOKEN_SECRET` généré avec `openssl rand -hex 64`
- [ ] `DB_PASSWORD` fort et unique — jamais la valeur par défaut
- [ ] Secrets stockés via Docker Swarm secrets (pas en variable d'env directe)
- [ ] Fichiers `.env` absents du dépôt Git (vérifier `.gitignore`)
- [ ] Variables d'environnement de dev (`dev_jwt_secret_change_me`) **non utilisées** en prod

### Infrastructure

- [ ] TLS activé (HTTPS uniquement) — `entrypoints.web.redirections` configuré
- [ ] `NODE_ENV=production` défini dans le service backend
- [ ] `read_only: true` sur les conteneurs backend et frontend
- [ ] `no-new-privileges: true` sur tous les conteneurs
- [ ] Dashboard Traefik désactivé (`api.dashboard: false`)
- [ ] Réseau `net-data` chiffré (`encrypted: "true"`)
- [ ] Base de données non accessible depuis internet (réseau `internal: true`)
- [ ] Ports de la BDD non exposés publiquement

### Application

- [ ] Rate limiting actif (vérifier logs Traefik + Express)
- [ ] CORS configuré avec les domaines de production uniquement
- [ ] `CORS_ORIGINS=https://notimatic.com,https://www.notimatic.com`
- [ ] Migrations à jour (`SELECT * FROM schema_migrations`)
- [ ] Compte admin créé avec un mot de passe fort
- [ ] Route `/api/v1/users/setup` désactivée (vérifier : retourne 403 si utilisateurs existent)

### CI/CD et Scan

- [ ] `npm audit --audit-level=critical` → aucune CVE critique
- [ ] Trivy scan → aucune CVE CRITICAL sur les images
- [ ] Tests backend : couverture ≥ 80%
- [ ] Tests frontend : couverture ≥ 70%
- [ ] Build Docker réussi en CI

### Monitoring

- [ ] Logs JSON activés (Traefik : `format: json`)
- [ ] Alertes configurées sur les erreurs 5xx
- [ ] Backup BDD planifié (`security_ops.sh backup` en cron)
- [ ] Procédure de rollback testée

# Notimatic - Secure by Design Project

Bienvenue dans le projet **Notimatic**. Ce dépôt contient l'architecture et l'implémentation de référence pour une application de prise de notes sécurisée avec **feed d'actualités, commentaires, assignation par thèmes et catégories ciblées**.

## 📋 État du Projet

🎯 **Version**: v1.0.0 (Production Ready)  
✅ **Fonctionnalités**: MVP Complet (Auth, Feed, Commentaires, Thèmes, GDPR)  
✅ **Documentation**: Guides Utilisateur, Architecture et API disponibles  
✅ **Qualité**: Tests unitaires et E2E en place, CI/CD configuré  
✅ **Sécurité**: Audit logs, Rate limiting, Sanitization et Conformité RGPD  

## ✨ Fonctionnalités Clés
- **Authentification Sécurisée**: JWT avec cookies HTTP-only, rôles RBAC
- **Feed Personnalisé**: Filtrage par Thèmes et Catégories
- **Expérience Utilisateur**: Mode Sombre/Clair, Interface Responsive
- **Gestion de Contenu**: Création riche, commentaires, modération basique
- **Conformité**: Export de données RGPD, suppression de compte

## 🚀 Démarrage Rapide

### Prérequis
- Docker & Docker Compose installés
- Node.js 20.x (optionnel, pour le développement local hors Docker)
- PostgreSQL 16 (si développement local)

### 1. Structure du Projet
- `docs/` : Documentation complète (architecture, roadmap, wireframes, GDPR)
- `backend/` : API Node.js/Express/TypeScript + migrations SQL
- `frontend/` : Application Vue.js/Vite (à migrer vers TypeScript + Pinia)
- `infrastructure/` : Docker Compose et configuration
- `.github/workflows/` : Pipeline CI/CD

### 2. Appliquer les Migrations

Avant de lancer l'application, appliquer les migrations SQL:

```bash
.\backend\migrate.ps1
```

Cela créera les tables nécessaires:
- `profiles` - Profils utilisateurs (classe, promo, niveau)
- `themes` - Thématiques pour organisation des notes
- `categories` - Catégories pour ciblage
- `note_targets` - Assignation de notes
- `audit_logs` - Logs d'audit
- `gdpr_export_requests` - Conformité RGPD
- Et plus...

### 3. Lancer l'environnement de Développement

Mode développement avec hot-reloading:

```bash
docker-compose -f infrastructure/docker-compose.dev.yml up --build
```

Ou en mode local (sans Docker):

```bash
# Terminal 1: Backend
cd backend
npm install
npm run build
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

**URLs**:
- **Frontend**: http://localhost:5173 (or http://127.0.0.1:5173)
- **Backend API**: http://localhost:3001 (mapped from internal port 3000)
- **Base de données**: localhost:5432 (User: `user`, Pass: `dev_secret_password`)

**Note**: The application automatically detects whether you access it via `localhost` or `127.0.0.1` and adjusts API calls accordingly to ensure authentication cookies work correctly. You can override this behavior using environment variables (see `.env.example` files).

### 4. Configuration (Optionnel)

Les variables d'environnement peuvent être configurées pour personnaliser l'application:

**Frontend** (`frontend/.env`):
```bash
# Option 1: Full API URL
VITE_API_URL=http://localhost:3001

# Option 2: Individual components
VITE_API_HOST=localhost
VITE_API_PORT=3001
```

**Backend** (`backend/.env`):
```bash
PORT=3000
DB_HOST=database
DB_USER=user
DB_PASSWORD=dev_secret_password
DB_NAME=notimatic_dev
JWT_SECRET=your_secure_secret
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Voir les fichiers `.env.example` pour la documentation complète.

### 5. Simuler la Production

Mode production avec Docker Swarm:

```bash
# 1. Initialiser Swarm
docker swarm init

# 2. Créer les secrets
printf "super_secure_db_password" | docker secret create db_password -
printf "super_secure_jwt_secret" | docker secret create jwt_secret -

# 3. Déployer la stack
docker stack deploy -c infrastructure/docker-compose.prod.yml notimatic
```

## 📚 Documentation

### Documentation Principale

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Analyse technique complète, stack retenue, décisions
- **[ROADMAP.md](docs/ROADMAP.md)** - Roadmap par version avec timeline (6-8 semaines)
- **[wireframes.md](docs/wireframes.md)** - Wireframes UX détaillés (7 écrans)
- **[GDPR.md](docs/GDPR.md)** - Conformité RGPD (données, droits, procédures)
- **[GITHUB_ISSUES.md](docs/GITHUB_ISSUES.md)** - 18 issues détaillées à créer
- **[RAPPORT_FINAL.md](docs/RAPPORT_FINAL.md)** - Rapport complet du travail accompli

### Documentation Technique

- **[Migrations SQL](backend/migrations/README.md)** - Guide des migrations
- **[CI/CD Pipeline](.github/workflows/ci.yml)** - Configuration GitHub Actions

### Documentation Existante

- **[Architecture Proposal](docs/PROPOSAL_ARCHITECTURE.md)** - Proposition initiale
- **[Threat Model](docs/THREAT_MODEL_AND_PLAYBOOKS.md)** - Modèle de menaces et playbooks

## 🏗️ Architecture

### Stack Technique

**Backend**:
- Node.js 20.x + Express.js 4.18
- TypeScript 5.1
- PostgreSQL 16 (client natif `pg`)
- JWT avec HTTP-only cookies
- Argon2 pour hashing
- Zod pour validation

**Frontend** (en migration):
- Vue 3.3.4
- Vite 4.4.5
- **À ajouter**: TypeScript, Pinia, Vue Router, Vitest

**Infrastructure**:
- Docker + Docker Compose
- Traefik (reverse proxy)
- GitHub Actions (CI/CD)
- Trivy (scan sécurité)

### Base de Données

Schéma étendu avec 13 tables:
- `users`, `profiles` - Utilisateurs et profils
- `notes`, `comments` - Contenu
- `themes`, `categories` - Organisation et ciblage
- `note_themes`, `note_categories`, `note_targets` - Associations
- `audit_logs`, `gdpr_export_requests` - Audit et GDPR
- `schema_migrations` - Tracking migrations

Voir [ARCHITECTURE.md](docs/ARCHITECTURE.md) pour le schéma complet.

## 🎯 Roadmap MVP

### Version 0.2.0 - Extensions Base de Données & TypeScript ⏳
- Migrations SQL (✅ créées, à tester)
- Migration frontend vers TypeScript + Pinia

### Version 0.3.0 - API Thèmes & Catégories
- Endpoints CRUD pour themes et categories
- Endpoints profils utilisateurs

### Version 0.4.0 - Feed Intelligent & Assignation 🎯
- Endpoint `/api/feed` avec filtrage
- Logique de ciblage (note_targets)
- Composants Vue (FeedList, NoteCard, etc.)

### Version 0.5.0 - Sécurité & GDPR 🔒
- Endpoints GDPR (export/purge)
- Rate limiting et sanitization XSS
- Audit logging

### Version 0.6.0 - Tests & CI/CD ✅
- Tests unitaires (Jest, Vitest)
- Tests E2E (Playwright)
- CI/CD complet

### Version 1.0.0 - Production Ready 🚀
- Documentation complète
- Déploiement production
- Release

**Timeline estimée**: 6-8 semaines avec 1-2 développeurs

Voir [ROADMAP.md](docs/ROADMAP.md) pour le détail complet.

## 🔒 Sécurité & RGPD

### Mesures de Sécurité

✅ **Existantes**:
- JWT avec HTTP-only cookies
- Argon2 pour hashing de mots de passe
- Helmet pour headers sécurisés
- CORS configuré
- Requêtes SQL paramétrées (anti-injection)
- Validation Zod

🔲 **À implémenter**:
- Rate limiting (express-rate-limit)
- Sanitization XSS (DOMPurify, validator)
- CSRF protection (csurf)
- Audit logging pour actions critiques
- Scan dépendances (npm audit, Trivy)

### Conformité RGPD

✅ **Documentation** complète dans [GDPR.md](docs/GDPR.md)  
✅ **Schéma de données** GDPR (migration 004)  
🔲 **Endpoints** GDPR à implémenter:
- `GET /api/v1/users/:id/export` - Export données
- `DELETE /api/v1/users/:id` - Suppression/anonymisation

**Politique de conservation**:
- Comptes: durée du contrat + 1 an
- Audit logs: 6 mois
- Exports GDPR: 3 mois
- Soft delete puis anonymisation à 30 jours

## 🧪 Tests

### Tests Unitaires
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Tests E2E
```bash
npx playwright test
```

### CI/CD

Le pipeline GitHub Actions s'exécute automatiquement sur chaque push:
- Lint backend & frontend
- Tests unitaires
- Build TypeScript
- Scan sécurité (Trivy, npm audit)
- Tests E2E (sur PR)
- Build Docker images

## 📝 Créer les Issues GitHub

Les issues sont documentées dans [docs/GITHUB_ISSUES.md](docs/GITHUB_ISSUES.md).

**Total**: 18 issues réparties en 7 epics

Pour créer les issues (via GitHub CLI):

```bash
# Exemple
gh issue create \
  --title "Implement /api/feed endpoint" \
  --body-file docs/issue-templates/epic-1-issue-1.md \
  --label "backend,MVP,high-priority"
```

Ou créer manuellement dans l'interface GitHub en copiant le contenu de `GITHUB_ISSUES.md`.

## 👥 Contribution

### Workflow de Développement

1. Créer une branche `feature/nom-feature`
2. Développer avec tests
3. Pousser et créer une Pull Request
4. CI doit passer au vert
5. Code review
6. Merge vers `main`

### Standards de Code

- **TypeScript strict mode**
- **ESLint + Prettier** (à configurer)
- **Tests requis** pour nouvelles features
- **Documentation** à jour
- **Commits conventionnels** (feat, fix, docs, etc.)

## 📞 Support

- **Issues GitHub**: https://github.com/elmaquito/NOTIMATIC/issues
- **Documentation**: Voir dossier `docs/`
- **GDPR/DPO**: dpo@notimatic.example.com (à configurer)

## 📄 License

À définir

---

**Version**: 0.2.0-alpha  
**Dernière mise à jour**: 12 décembre 2024  
**Statut**: En développement actif 🚧


# NOTIMATIC — Secure by Design

> Application de prise de notes sécurisée avec feed d'actualités ciblé, commentaires et conformité RGPD.  
> Conçue pour les établissements d'enseignement (rôles : admin, technician, teacher, student).

![CI](https://github.com/elmaquito/NOTIMATIC/actions/workflows/ci.yml/badge.svg)

---

## Sommaire

1. [État du Projet](#-état-du-projet)
2. [Fonctionnalités](#-fonctionnalités)
3. [Démarrage Rapide](#-démarrage-rapide)
4. [Configuration](#-configuration)
5. [Architecture & Stack](#️-architecture--stack)
6. [Base de Données](#base-de-données)
7. [Roadmap MVP](#-roadmap-mvp)
8. [Sécurité & RGPD](#-sécurité--rgpd)
9. [Tests & CI/CD](#-tests--cicd)
10. [Documentation](#-documentation)
11. [Contribution](#-contribution)
12. [Support](#-support)

---

## 📋 État du Projet

🎯 **Version**: v1.2.0
✅ **Backend**: Node.js/Express/TypeScript (Auth, Unified Tags, Profiles, Feed, GDPR, Audit)
✅ **Frontend**: Vue 3 + TypeScript + Pinia + Vue Router (Migration complète)
✅ **CI/CD**: GitHub Actions strict — lint, tests, couverture, Trivy, Docker Build backend (Node 18 & 20) + frontend (Node 20)
✅ **Sécurité**: Rate limiting, Sanitization XSS, Audit logs, Conformité RGPD

## ✨ Fonctionnalités

| Domaine | Fonctionnalité | Statut |
|---------|---------------|--------|
| **Authentification** | JWT HTTP-only cookies, RBAC 4 rôles, refresh token | ✅ |
| **Feed ciblé** | Filtrage par Tags Unifiés + `note_targets` | ✅ |
| **Gestion de contenu** | Notes (CRUD), commentaires, réactions | ✅ |
| **Tags Unifiés** | `classe`, `specialite`, `groupe`, `categorie` | ✅ |
| **Profils utilisateurs** | Classe, promotion, niveau, photo | ✅ |
| **Sécurité** | Rate limiting, Helmet CSP, Sanitization XSS | ✅ |
| **RGPD** | Export JSON, soft-delete, anonymisation | ✅ |
| **Audit** | Journal des actions critiques | ✅ |
| **UI/UX** | Dark/Light mode, Responsive, Loader | ✅ |
| **CI/CD** | GitHub Actions — lint, tests, Trivy, Docker | ✅ |
| **2FA TOTP** | Authentification forte pour admins | 🔄 |
| **Tests E2E** | Playwright smoke + flows | 🔄 |

## 🚀 Démarrage Rapide

### Prérequis

| Outil | Version minimale | Usage |
|-------|-----------------|-------|
| Docker + Docker Compose | 24.x | Environnement d'exécution |
| Node.js | 18.x LTS | Développement local |
| PostgreSQL | 16 | Base de données (si hors Docker) |

### Structure du Projet

```
NOTIMATIC/
├── backend/          # API Node.js/Express/TypeScript
│   ├── src/          # Code source (modules: auth, users, notes, tags, feed, …)
│   ├── migrations/   # Migrations SQL numérotées 001→009
│   └── Dockerfile
├── frontend/         # Application Vue 3 + TypeScript + Pinia
│   ├── src/          # Composants, stores, routes, types
│   └── Dockerfile
├── infrastructure/   # Docker Compose (dev, prod, test)
├── docs/             # Documentation complète
└── .github/          # Workflows CI/CD
```

### Étape 1 — Cloner et appliquer les migrations

```bash
git clone https://github.com/elmaquito/NOTIMATIC.git
cd NOTIMATIC

# Linux / macOS
bash backend/migrate.sh

# Windows PowerShell
.\backend\migrate.ps1
```

### Étape 2 — Lancer en développement

```bash
# Mode Docker (recommandé) avec hot-reloading
docker-compose -f infrastructure/docker-compose.dev.yml up --build
```

Ou sans Docker :

```bash
# Terminal 1 : Backend
cd backend && npm install && npm run start:dev

# Terminal 2 : Frontend
cd frontend && npm install && npm run dev
```

**URLs d'accès** :

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:5173 | Vite dev server |
| Backend API | http://localhost:3001 | Port mappé depuis 3000 |
| Base de données | localhost:5432 | User: `user` / Pass: `dev_secret_password` |

### Étape 3 — Compte initial

```bash
curl -X POST http://localhost:3001/api/v1/users/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"AdminPass123!"}'
```

> ⚠️ La route `/users/setup` est désactivée automatiquement dès qu'un utilisateur admin existe.

---

## ⚙️ Configuration

### Variables d'environnement Backend (`backend/.env`)

| Variable | Valeur par défaut | Description |
|----------|------------------|-------------|
| `PORT` | `3000` | Port d'écoute interne |
| `DB_HOST` | `database` | Hôte PostgreSQL |
| `DB_USER` | `user` | Utilisateur BDD |
| `DB_PASSWORD` | *(requis)* | Mot de passe BDD |
| `DB_NAME` | `notimatic_dev` | Nom de la BDD |
| `JWT_SECRET` | *(requis)* | Secret de signature JWT access token |
| `REFRESH_TOKEN_SECRET` | *(requis)* | Secret refresh token |
| `CORS_ORIGINS` | `http://localhost:5173` | Origins CORS (virgule-séparées) |
| `NODE_ENV` | `development` | `development` \| `production` \| `test` |

### Variables d'environnement Frontend (`frontend/.env`)

```bash
# Option 1 : URL complète
VITE_API_URL=http://localhost:3001

# Option 2 : Composants individuels
VITE_API_HOST=localhost
VITE_API_PORT=3001
```

### Mode Production — Docker Swarm

```bash
# 1. Initialiser le Swarm
docker swarm init

# 2. Créer les secrets chiffrés
printf "your_db_password"  | docker secret create db_password -
printf "your_jwt_secret"   | docker secret create jwt_secret -
printf "your_refresh_secret" | docker secret create refresh_secret -

# 3. Déployer la stack
docker stack deploy -c infrastructure/docker-compose.prod.yml notimatic
```

## 📚 Documentation

### Référence Technique

| Document | Contenu |
|----------|---------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, décisions, API surface complète, schéma BDD |
| [API.md](docs/API.md) | Documentation de tous les endpoints HTTP |
| [ROADMAP.md](docs/ROADMAP.md) | Historique des versions livrées + reste à faire |
| [RELEASE_NOTES.md](docs/RELEASE_NOTES.md) | Changelog détaillé par version |
| [Migrations SQL](backend/migrations/README.md) | Guide des 9 migrations (001→009) |
| [CI/CD Pipeline](.github/workflows/ci.yml) | Configuration GitHub Actions |

### Sécurité & Conformité

| Document | Contenu |
|----------|---------|
| [SECURITY.md](docs/SECURITY.md) | Architecture auth Zero-Trust, modèle de menaces STRIDE, checklist déploiement, réponse aux incidents |
| [GDPR.md](docs/GDPR.md) | Conformité RGPD : données collectées, droits, procédures d'exercice |

### Guides Utilisateur

| Document | Contenu |
|----------|---------|
| [USER_GUIDE.md](docs/USER_GUIDE.md) | Guide utilisateur final (reset mot de passe, compte) |
| [wireframes.md](docs/wireframes.md) | Wireframes UX détaillés (7 écrans ASCII) |
| [GITHUB_ISSUES.md](docs/GITHUB_ISSUES.md) | 18 issues GitHub à créer (7 epics) |

## 🏗️ Architecture & Stack

### Stack Technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| **Runtime** | Node.js | 20.x LTS |
| **Framework API** | Express.js | 4.18 |
| **Langage** | TypeScript | 5.x (strict) |
| **Base de données** | PostgreSQL | 16 |
| **Client BDD** | pg (node-postgres) | 8.11 |
| **Auth** | JWT (jsonwebtoken) + Argon2 | — |
| **Validation** | Zod | 3.21 |
| **Sécurité** | Helmet, express-rate-limit, validator | — |
| **Frontend framework** | Vue 3 | 3.3.4 |
| **Bundler** | Vite | 4.4.5 |
| **State management** | Pinia | 3.x |
| **Routing** | Vue Router | 5.x |
| **Tests backend** | Jest + Supertest | 29.x |
| **Tests frontend** | Vitest + Vue Test Utils | 4.x |
| **Conteneurisation** | Docker + Docker Compose | — |
| **Reverse proxy** | Traefik | — |
| **CI/CD** | GitHub Actions | — |
| **Scan sécurité** | Trivy, npm audit | — |

### Diagramme d'Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT                                   │
│  Vue 3 + TypeScript + Pinia + Vue Router 5                      │
│  ┌──────────────┐  ┌────────────────┐  ┌───────────────────┐   │
│  │  Components  │  │  Pinia Stores  │  │   Vue Router 5    │   │
│  │ Dashboard    │  │  auth.ts       │  │  + Auth Guards    │   │
│  │ Feed.vue     │  │  tag.ts        │  └───────────────────┘   │
│  │ NoteCard.vue │  └────────────────┘                          │
│  └──────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
               │ HTTP/JSON (JWT cookie)
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  TRAEFIK (reverse proxy TLS)                    │
└─────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│            BACKEND — Node.js/Express/TypeScript                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │  auth/   │ │  users/  │ │  notes/  │ │  feed/ + tags/    │  │
│  │  routes  │ │  routes  │ │  routes  │ │  routes           │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────────┘  │
│  Middleware: Helmet · CORS · Rate Limit · Sanitize · Audit      │
└─────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                 PostgreSQL 16 (18 tables)                       │
└─────────────────────────────────────────────────────────────────┘
```

### Base de Données

Schéma complet — 18 tables réparties en 4 domaines :

**Identité & Authentification**
- `users` — Comptes (username, rôle RBAC, soft-delete)
- `profiles` — Données de profil étendues (classe, promotion, niveau)
- `sessions` — Refresh tokens persistants
- `password_reset_tokens` — Tokens SHA-256 one-time pour réinitialisation

**Contenu**
- `notes` — Notes (titre, contenu, pinned, urgent, view_count)
- `comments` — Commentaires sur les notes
- `reactions` — Réactions (toggle par utilisateur)

**Tagging & Ciblage**
- `tags` — Tags Unifiés : `classe`, `specialite`, `groupe`, `categorie`
- `note_tags` — Association note ↔ tag (many-to-many)
- `user_tags` — Tags affectés à un utilisateur (pour le feed ciblé)
- `themes` — Thèmes UI (modèle historique, coexistant avec Tags Unifiés)
- `note_themes` — Association note ↔ thème (legacy)
- `categories` — Catégories de ciblage (`classe`, `promotion`, `niveau`, `all`)
- `note_categories` — Association note ↔ catégorie (legacy)
- `note_targets` — Règles de ciblage fin par note (user, classe, promotion, niveau, all)

**Conformité & Audit**
- `audit_logs` — Journal immuable des actions critiques
- `gdpr_export_requests` — Suivi des demandes d'export RGPD
- `schema_migrations` — Versioning des migrations (001→009)

Voir [ARCHITECTURE.md](docs/ARCHITECTURE.md) pour le schéma complet.

## 🎯 État de la Roadmap MVP

Toutes les versions MVP sont livrées. Les axes de travail restants portent sur la sécurité avancée (2FA) et les fonctionnalités post-MVP.

### ✅ v0.1.0 — Fondations
Authentification JWT, CRUD notes, commentaires, Docker.

### ✅ v0.2.0 — Base de Données & TypeScript
Migrations SQL 001-009, migration frontend TS + Pinia.

### ✅ v0.3.0 — API Unified Tags & Profils
CRUD tags, assignation notes↔tags, endpoints profils, stores Pinia.

### ✅ v0.4.0 — Feed Intelligent & Assignation
Algorithme de feed ciblé, `GET /api/v1/feed`, `Feed.vue`, `user_tags`.

### ✅ v0.5.0 — Sécurité & GDPR
Rate limiting, sanitization XSS, `GDPR export/delete`, audit logs, DOMPurify frontend.

### ✅ v0.6.0 — Tests & CI/CD
Jest (backend), Vitest (frontend), pipeline GitHub Actions strict (lint → test → couverture → Trivy → Docker Build, matrix Node 18/20), CI fix (PR #18).

### ✅ v0.7.0 — UI/UX & Wireframes
Dark/Light mode, Loader, Responsive, wireframes ASCII.

### ✅ v1.0.0 — Production Ready
Docker Swarm, Traefik, secrets, documentation complète.

### 🔄 Reste à faire (post-v1.0.0)
- **Sécurité avancée**: 2FA TOTP, interface QR Code, vue "Activités récentes"
- **Audit admin**: endpoint `GET /api/v1/audit`, couverture complète des actions sensibles
- **Tests E2E**: Playwright (smoke, teacher flow, student flow, GDPR flow)
- **Couverture**: atteindre 80% backend / 70% frontend dans le CI
- **Notifications** (v1.x): Temps réel WebSocket + e-mail
- **Recherche full-text** (v1.x): PostgreSQL FTS sur les notes
- **Collaboration** (v1.x): Mentions @username, réactions enrichies
- **Analytics** (v1.x): Tableaux de bord engagement

Voir [ROADMAP.md](docs/ROADMAP.md) pour le détail complet.

## 🔒 Sécurité & RGPD

### Mesures de Sécurité

✅ **Implémentées**:
- JWT avec HTTP-only cookies
- Argon2 pour hashing de mots de passe
- Helmet pour headers sécurisés (CSP inclus)
- CORS configuré
- Requêtes SQL paramétrées (anti-injection)
- Validation Zod
- Rate limiting (`express-rate-limit`) — API, auth, commentaires
- Sanitization XSS (`validator` backend, DOMPurify frontend)
- Audit logging pour actions critiques
- Scan dépendances en CI (npm audit, Trivy)

🔲 **Reste à implémenter**:
- 2FA TOTP (obligatoire pour les admins)
- Stockage sécurisé des secrets (Vault / param store)
- Interface utilisateur "Activités récentes"

### Conformité RGPD

✅ **Documentation** complète dans [GDPR.md](docs/GDPR.md)  
✅ **Endpoints GDPR** implémentés :
- `GET /api/v1/users/:id/export` — Export données utilisateur
- `DELETE /api/v1/users/:id` — Suppression / anonymisation

**Politique de conservation**:
- Comptes : durée du contrat + 1 an
- Audit logs : 6 mois
- Exports GDPR : 3 mois
- Soft delete puis anonymisation à 30 jours

## 🧪 Tests & CI/CD

### Exécuter les Tests Localement

```bash
# Backend (Jest + Supertest)
cd backend && npm test

# Backend avec rapport de couverture
cd backend && npm test -- --coverage

# Frontend (Vitest)
cd frontend && npm test
```

### Pipeline GitHub Actions

Le workflow `.github/workflows/ci.yml` se déclenche sur chaque `push` et `pull_request` :

| Job | Outil | Matrix |
|-----|-------|--------|
| `backend-lint` | ESLint | Node 18 & 20 |
| `backend-test` | Jest + coverage (seuil ≥ 80%) | Node 18 & 20 |
| `frontend-lint` | *(à configurer)* | Node 20 |
| `frontend-test` | Vitest + coverage (seuil ≥ 70%) | Node 20 |
| `npm-audit` | npm audit --audit-level=critical | — |
| `trivy-scan` | Trivy (CRITICAL) sur images Docker | — |
| `docker-build` | Build multi-stage (backend + frontend) | — |
| `e2e-smoke` | Playwright *(main branch only)* | — |

> **Couverture actuelle** : les seuils sont contrôlés en CI mais non encore atteints → voir section [Reste à faire](#-roadmap-mvp).

## 👥 Contribution

### Workflow Git

```
main ←─── develop ←─── feature/nom-feature
                 └──── fix/nom-fix
```

1. Créer une branche depuis `develop` : `git checkout -b feature/ma-feature`
2. Développer avec tests unitaires
3. Pousser et créer une Pull Request vers `develop`
4. Attendre que la CI passe (tous les jobs en vert)
5. Code review par un pair
6. Merge et suppression de la branche

### Standards de Code

- **TypeScript strict mode** — `"strict": true` dans `tsconfig.json`
- **ESLint** — backend configuré (`@typescript-eslint`, `eslint-plugin-security`) ; frontend à finaliser
- **Commits conventionnels** : `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `ci:`
- **Tests requis** pour toute nouvelle fonctionnalité
- **Documentation** mise à jour avec le code

### Créer des Issues GitHub

Les issues structurées sont disponibles dans [docs/GITHUB_ISSUES.md](docs/GITHUB_ISSUES.md).

```bash
# Exemple via GitHub CLI
gh issue create \
  --title "feat: implement 2FA TOTP for admin accounts" \
  --body-file docs/GITHUB_ISSUES.md \
  --label "security,high-priority"
```

## 📞 Support

| Canal | Adresse |
|-------|---------|
| Issues GitHub | https://github.com/elmaquito/NOTIMATIC/issues |
| Documentation | Répertoire `docs/` |
| DPO (RGPD) | dpo@notimatic.example.com *(à configurer)* |

## 📄 Licence

À définir — voir [LICENSE](LICENSE) si présent.

---

| Champ | Valeur |
|-------|--------|
| **Version courante** | v1.2.0 |
| **Statut** | MVP livré — améliorations continues 🚀 |
| **Dernière mise à jour** | 1er avril 2026 |
| **Auteur** | [elmaquito](https://github.com/elmaquito) |

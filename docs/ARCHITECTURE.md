# NOTIMATIC — Architecture Technique

> **Document** : Architecture technique et décisions de conception  
> **Projet** : NOTIMATIC — Application de prise de notes sécurisée  
> **Version du document** : 2.0  
> **Date initiale** : 12 décembre 2024 · **Mise à jour** : 1er avril 2026  
> **Auteur** : GitHub Copilot Agent

---

## Sommaire

1. [Analyse du Projet](#1-analyse-du-projet)
   - 1.1 [Stack Technique](#11-stack-technique)
   - 1.2 [Structure des Fichiers](#12-structure-des-fichiers)
   - 1.3 [Modèle de Données](#13-modèle-de-données--18-tables-migrations-001009)
   - 1.4 [Surface API v1](#14-surface-api-v1-état-au-1er-avril-2026)
2. [Décisions Techniques](#2-décisions-techniques-pour-le-mvp)
   - 2.1 [Choix ORM / Database Layer](#21-choix-ormdatabase-layer)
   - 2.2 [Choix Frontend](#22-choix-frontend)
   - 2.3 [Architecture Cible](#23-architecture-cible)
3. [Sécurité](#3-sécurité)
4. [Infrastructure & Déploiement](#4-infrastructure--déploiement)
5. [Stratégie de Migration](#5-stratégie-de-migration)
6. [Plan d'Évolution](#6-plan-dévolution)

---

## 1. Analyse du Projet

### 1.1 Stack Technique

### 1.1 Stack Technique

#### Backend

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Runtime | Node.js | 20.x LTS |
| Framework | Express.js | 4.18.2 |
| Langage | TypeScript | 5.x (strict) |
| Base de données | PostgreSQL | 16 |
| Client BDD | pg (node-postgres) | 8.11.0 |
| Auth | JWT (jsonwebtoken) + Argon2 | 9.0.0 / 0.44.0 |
| Validation | Zod | 3.21.4 |
| Sécurité headers | Helmet | 7.0.0 |
| Rate limiting | express-rate-limit | 8.3.1 |
| Sanitization | validator | 13.x |
| Tests | Jest + Supertest | 29.x |

#### Frontend

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | Vue 3 | 3.3.4 |
| Bundler | Vite | 4.4.5 |
| Langage | TypeScript | 5.x |
| State management | Pinia | 3.x |
| Routing | Vue Router | 5.x |
| Tests | Vitest + Vue Test Utils | 4.x |
| Sanitization | DOMPurify | 3.x |

#### Infrastructure

| Composant | Technologie |
|-----------|-------------|
| Conteneurisation | Docker + Docker Compose |
| Reverse Proxy | Traefik (production) |
| Orchestration | Docker Swarm (production) |
| CI/CD | GitHub Actions |
| Scan sécurité | Trivy + npm audit |

### 1.2 Structure des Fichiers

```
backend/
├── src/
│   ├── main.ts              # Point d'entrée — middleware + montage routes
│   ├── auth/                # auth.controller.ts · auth.routes.ts · auth.schema.ts · token.service.ts
│   ├── users/               # user.controller.ts · user.routes.ts · user.schema.ts
│   ├── notes/               # notes.controller.ts · notes.routes.ts · notes.schema.ts
│   ├── tags/                # tags.controller.ts · tags.routes.ts
│   ├── feed/                # feed.controller.ts · feed.routes.ts
│   ├── metadata/            # metadata.controller.ts · metadata.routes.ts (themes, categories)
│   ├── common/              # middleware.ts · audit.ts · types.ts · utils.ts
│   └── config/              # database.ts · env.ts
├── migrations/              # 001→009 scripts SQL
├── tests/                   # Jest + Supertest
├── Dockerfile
├── migrate.sh / migrate.ps1
└── package.json

frontend/
├── src/
│   ├── App.vue · main.ts    # Racine TS
│   ├── components/          # AccountSettings, Dashboard, Feed, NoteCard, Reactions, …
│   ├── composables/         # useTheme.ts
│   ├── router/index.ts      # Vue Router 5 + navigation guards
│   ├── stores/              # auth.ts · tag.ts (Pinia)
│   ├── types/models.ts      # Interfaces TypeScript
│   ├── utils/               # sanitize.ts (DOMPurify wrapper)
│   └── tests/               # Vitest
├── Dockerfile
└── package.json

infrastructure/
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── docker-compose.test.yml
└── Dockerfile.backend
```

### 1.3 Modèle de Données — 18 Tables (migrations 001→009)

| Domaine | Tables |
|---------|--------|
| **Identité** | `users`, `profiles`, `sessions`, `password_reset_tokens` |
| **Contenu** | `notes`, `comments`, `reactions` |
| **Tagging** | `tags`, `note_tags`, `user_tags` |
| **Legacy ciblage** | `themes`, `note_themes`, `categories`, `note_categories`, `note_targets` |
| **Conformité** | `audit_logs`, `gdpr_export_requests` |
| **Infrastructure** | `schema_migrations` |

**Système de Tags Unifiés** (migration 006) — remplace progressivement `themes`/`categories` :

```sql
CREATE TABLE tags (
    id   SERIAL PRIMARY KEY,
    type VARCHAR(20) CHECK (type IN ('classe', 'specialite', 'groupe', 'categorie')) NOT NULL,
    name VARCHAR(100) NOT NULL,
    meta JSONB DEFAULT '{}',          -- couleur, icône, etc.
    is_default_for_student_view BOOLEAN DEFAULT FALSE,
    UNIQUE (type, name)
);

-- Association note ↔ tag (many-to-many)
CREATE TABLE note_tags (
    note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
    tag_id  INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

-- Tags affectés à un utilisateur (pour filtrage du feed)
CREATE TABLE user_tags (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tag_id  INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, tag_id)
);
```

### 1.4 Surface API v1 (état au 1er avril 2026)

Toutes les routes sont montées sous le préfixe `/api/v1/` via `backend/src/main.ts`.

#### Authentification (`auth/`)

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| `POST` | `/auth/login` | Public | Connexion — émission de cookies JWT |
| `POST` | `/auth/logout` | Authentifié | Révocation du cookie JWT |
| `POST` | `/auth/refresh` | Public | Renouvellement du token d'accès via refresh token |
| `POST` | `/auth/request-password-reset` | Public | Demande de réinitialisation (token SHA-256) |
| `POST` | `/auth/reset-password` | Public | Finalisation de la réinitialisation |

#### Utilisateurs (`users/`)

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| `POST` | `/users/setup` | Public (one-shot) | Création de l'admin initial |
| `POST` | `/users` | admin, technician | Créer un utilisateur |
| `GET` | `/users` | admin, technician, teacher | Lister les utilisateurs |
| `GET` | `/users/me` | Authentifié | Obtenir les infos du compte courant |
| `PUT` | `/users/me` | Authentifié | Modifier email, téléphone, mot de passe |
| `GET` | `/users/:id/profile` | Authentifié | Obtenir le profil étendu (classe, promo, niveau, tags) |
| `PUT` | `/users/:id/profile` | Soi-même ou admin | Mettre à jour le profil et les `user_tags` |
| `GET` | `/users/:id/export` | Soi-même ou admin | Export RGPD — JSON de toutes les données |
| `DELETE` | `/users/:id` | admin | Soft-delete + anonymisation RGPD |

> **Note** : les `user_tags` (spécialités, groupes de l'utilisateur) sont gérés via `PUT /users/:id/profile` et non via des routes dédiées.

#### Notes (`notes/`)

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| `GET` | `/notes` | Authentifié | Lister les notes (filtrage RBAC) |
| `POST` | `/notes` | admin, teacher, student | Créer une note |
| `GET` | `/notes/:id` | Authentifié | Détail d'une note |
| `PATCH` | `/notes/:id` | Auteur ou admin | Modifier une note |
| `DELETE` | `/notes/:id` | Auteur ou admin | Supprimer une note |
| `GET` | `/notes/:id/tags` | Authentifié | Tags associés à la note |
| `POST` | `/notes/:id/tags` | admin, teacher, student | Assigner des tags à la note |
| `GET` | `/notes/:id/comments` | Authentifié | Commentaires de la note |
| `POST` | `/notes/:id/comments` | Authentifié | Ajouter un commentaire |
| `POST` | `/notes/:id/reactions` | Authentifié | Toggle réaction (add/remove/change) |
| `GET` | `/notes/:id/reactions/me` | Authentifié | Réaction courante de l'utilisateur |

#### Tags (`tags/`)

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| `GET` | `/tags` | Authentifié | Lister tous les tags |
| `POST` | `/tags` | admin, teacher, technician | Créer un tag |
| `PATCH` | `/tags/:id` | admin, teacher, technician | Modifier un tag |
| `DELETE` | `/tags/:id` | admin | Supprimer un tag |

#### Feed (`feed/`)

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| `GET` | `/feed` | Authentifié | Feed ciblé avec pagination (`page`, `limit`, `tag`, `tags`, `search`) |

#### Metadata — Thèmes & Catégories (lecture seule)

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| `GET` | `/themes` | Authentifié | Lister les thèmes |
| `GET` | `/categories` | Authentifié | Lister les catégories |

> **Note** : seules les routes GET sont exposées pour les thèmes et catégories. Les opérations d'écriture ne sont pas encore montées dans `main.ts`.

#### Health Check

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| `GET` | `/health` | Public | Statut du service et timestamp BDD |

## 2. Décisions Techniques pour le MVP

### 2.1 Choix ORM/Database Layer

**Décision**: Continuer avec **PostgreSQL + pg (node-postgres)** en mode SQL natif

**Justification**:
1. **Cohérence**: Le backend utilise déjà `pg` avec des requêtes SQL natives
2. **Performance**: Pas de surcharge ORM pour un projet de cette taille
3. **Contrôle**: SQL natif offre un contrôle total sur les requêtes et optimisations
4. **Sécurité**: Utilisation déjà présente de requêtes paramétrées ($1, $2...)
5. **Migration**: Migrations SQL explicites plus faciles à auditer

**Alternative considérée mais rejetée**: 
- **Prisma**: Excellent ORM, mais nécessiterait une refonte complète du code existant
- **TypeORM**: Même problématique, plus lourd à configurer

**Approche retenue**:
- Fichiers de migration SQL numérotés dans `backend/migrations/` (001→009)
- Script de migration `backend/migrate.sh` / `backend/migrate.ps1`
- Transactions pour intégrité des données

### 2.2 Choix Frontend

**Décision**: Migrer vers **Vue 3 + TypeScript + Pinia** ✅ **Migration terminée**

**Justification**:
1. Vue 3 déjà en place, on étend avec TypeScript
2. Pinia = state management officiel pour Vue 3 (plus moderne que Vuex)
3. TypeScript = sécurité de type, meilleure DX, moins d'erreurs
4. Vitest = framework de test natif Vite, très rapide

**Migration réalisée** (v0.2.0 → v1.2.0):
1. `main.js` → `main.ts` ✅
2. `tsconfig.json` configuré ✅
3. Pinia, TypeScript, Vitest installés ✅
4. Stores Pinia créés (`auth.ts`, `tag.ts`) ✅
5. Composants principaux migrés vers `<script setup lang="ts">` ✅

### 2.3 Architecture Cible

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Vue 3 + TS)                │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  Components   │  │ Pinia Stores │  │  Vue Router     │  │
│  │  - FeedList   │  │ - feedStore  │  │  + Auth Guards  │  │
│  │  - NoteCard   │  │ - noteStore  │  └─────────────────┘  │
│  │  - Dashboard  │  │ - themeStore │                        │
│  └───────────────┘  └──────────────┘                        │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP + JWT Cookie
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express + TS)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Middleware   │  │   Routes     │  │   Services      │  │
│  │ - Auth JWT   │  │ - /api/feed  │  │ - FeedService   │  │
│  │ - RBAC       │  │ - /api/notes │  │ - ThemeService  │  │
│  │ - Rate Limit │  │ - /api/themes│  │ - GDPRService   │  │
│  │ - Sanitize   │  └──────────────┘  └─────────────────┘  │
│  └──────────────┘                                           │
└────────────────────────────┬────────────────────────────────┘
                             │ pg (node-postgres)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                     │
│  ┌──────────┐  ┌────────┐  ┌───────────┐  ┌─────────────┐ │
│  │  users   │  │ themes │  │ note_     │  │ audit_logs  │ │
│  │ profiles │  │categor.│  │ targets   │  │ gdpr_export │ │
│  └──────────┘  └────────┘  └───────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 3. Sécurité

### Mesures Implémentées (v1.2.0)

| Mesure | Technologie | Détail |
|--------|-------------|--------|
| Authentification | JWT (HTTP-only cookies) | Access token (15min) + Refresh token (7j) |
| Hashing mots de passe | Argon2 | Argon2id avec salt aléatoire |
| Headers sécurité | Helmet | CSP, X-Frame-Options, HSTS, etc. |
| Rate limiting | express-rate-limit | API: 100/15min · Auth: 15/1h · Comments: 10/1min |
| Sanitization input | validator (backend) | Validation et nettoyage de toutes les entrées |
| Sanitization output | DOMPurify (frontend) | Wrapper `sanitize.ts` pour tout contenu affiché |
| Anti-injection SQL | pg paramétré | Requêtes `$1, $2, …` systématiques |
| CORS | cors middleware | Origins strictement listées |
| Audit logging | `AuditLogger` | Journal BDD de toutes les actions critiques |
| Scan dépendances | npm audit | Niveau `critical` en CI |
| Scan images | Trivy | Niveau `CRITICAL` sur images Docker |
| RBAC | Middleware `authorize()` | 4 rôles: admin, technician, teacher, student |

### Reste à Implémenter

| Mesure | Priorité | Notes |
|--------|----------|-------|
| 2FA TOTP | 🔴 Haute | Google Authenticator / Authy |
| Stockage secrets | 🟡 Moyenne | Vault ou AWS SSM (actuellement `.env`) |
| Endpoint audit admin | 🔴 Haute | `GET /api/v1/audit` avec pagination |

## 4. Infrastructure & Déploiement

### Environnements

| Environnement | Fichier | Usage |
|---------------|---------|-------|
| Développement | `docker-compose.dev.yml` | Hot-reload, BDD locale |
| Test | `docker-compose.test.yml` | CI, BDD isolée |
| Production | `docker-compose.prod.yml` | Docker Swarm, Traefik, secrets |

### Pipeline CI/CD (`.github/workflows/ci.yml`)

```
push/PR
  │
  ├─► backend-lint      (ESLint, Node 18+20)
  ├─► backend-test      (Jest + coverage ≥80%, Node 18+20, PostgreSQL 16)
  ├─► frontend-lint     (echo stub, Node 20)
  ├─► frontend-test     (Vitest + coverage ≥70%, Node 20)
  ├─► npm-audit         (--audit-level=critical, backend+frontend)
  │
  ├─► trivy-scan        (CRITICAL, après backend+frontend-test)
  ├─► docker-build      (multi-stage, après trivy-scan)
  │
  └─► e2e-smoke         (Playwright, main branch uniquement)
      upload-reports    (artefacts couverture)
```

## 5. Stratégie de Migration

### Migrations SQL Appliquées

| Migration | Description | Statut |
|-----------|-------------|--------|
| 001_add_profiles | Table `profiles` | ✅ |
| 002_add_themes_categories | Tables `themes`, `categories`, `note_themes`, `note_categories` | ✅ |
| 003_add_note_targets | Table `note_targets`, colonnes `notes.pinned/urgent` | ✅ |
| 004_add_audit_gdpr | Tables `audit_logs`, `gdpr_export_requests` | ✅ |
| 005_add_password_reset | Table `password_reset_tokens` | ✅ |
| 006_add_unified_tags | Tables `tags`, `note_tags` (système unifié) | ✅ |
| 007_add_reactions | Table `reactions` | ✅ |
| 008_add_sessions | Table `sessions` (refresh tokens persistants) | ✅ |
| 009_add_user_tags | Table `user_tags` (tags affectés à l'utilisateur) | ✅ |

### Commandes

```bash
# Linux / macOS
bash backend/migrate.sh

# Windows PowerShell
.\backend\migrate.ps1
```

## 6. Plan d'Évolution

### Court terme (v1.x)
- 2FA TOTP (obligatoire admin)
- Tests E2E Playwright complets
- Couverture ≥80% backend / ≥70% frontend
- ESLint côté frontend
- ThemeManager.vue / CategoryManager.vue

### Moyen terme (v1.1→1.3)
- Notifications temps réel (WebSocket / SSE)
- Recherche full-text PostgreSQL (`tsvector`)
- Analytics engagement

---

**Auteur** : GitHub Copilot Agent  
**Date initiale** : 12 décembre 2024 · **Mise à jour** : 1er avril 2026  
**Version** : 2.0

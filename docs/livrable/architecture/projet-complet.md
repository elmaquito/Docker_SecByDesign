# NOTIMATIC — Vue d'Ensemble du Projet

> **Document** : Architecture globale, stack complète, schéma BDD, flux applicatifs  
> **Date de consolidation** : 2026-04-01  
> **Commit de référence** : `d43a8a27e16b58aad6e0639d1f329fed295f95f9`  
> **Version projet** : v1.2.0

---

## Table des Matières

1. [Description du Projet](#1-description-du-projet)
2. [Stack Technique Complète](#2-stack-technique-complète)
3. [Architecture Globale](#3-architecture-globale)
   - 3.1 [Diagramme d'Architecture](#31-diagramme-darchitecture)
   - 3.2 [Flux de Requête Typique](#32-flux-de-requête-typique)
4. [Structure du Dépôt](#4-structure-du-dépôt)
5. [Schéma de Base de Données](#5-schéma-de-base-de-données)
   - 5.1 [Domaines et Tables](#51-domaines-et-tables)
   - 5.2 [Relations Clés](#52-relations-clés)
6. [Sécurité by Design — Vue Transversale](#6-sécurité-by-design--vue-transversale)
7. [Pipeline CI/CD](#7-pipeline-cicd)
8. [Métriques du Projet](#8-métriques-du-projet)

---

## 1. Description du Projet

**NOTIMATIC** est une application web de prise de notes sécurisée avec feed d'actualités ciblé, développée pour les établissements d'enseignement supérieur.

| Champ | Valeur |
|-------|--------|
| **Type** | Application web SPA + API REST |
| **Domaine** | Éducation — partage de notes pédagogiques |
| **Paradigme de sécurité** | Security by Design — Zero-Trust |
| **Version courante** | v1.2.0 (MVP livré) |
| **Statut** | Production-ready — améliorations continues |
| **Dépôt** | https://github.com/elmaquito/NOTIMATIC |

### Problématique adressée

> Comment centraliser la diffusion d'informations pédagogiques au sein d'un établissement, en garantissant la **confidentialité des données**, le **contrôle d'accès par rôle**, la **traçabilité des actions** et la **conformité RGPD** ?

### Rôles Utilisateurs (RBAC)

| Rôle | Niveau d'accès | Mode de création |
|------|---------------|-----------------|
| `admin` | Accès total | `POST /api/v1/users/setup` (bootstrap) ou par un admin |
| `technician` | Gestion utilisateurs + infrastructure | Par un admin |
| `teacher` | Créer/modifier notes, voir notes étudiants | Par un admin ou technician |
| `student` | Consulter le feed ciblé, créer notes | Par un admin ou technician |

---

## 2. Stack Technique Complète

### Backend

| Couche | Technologie | Version | Justification |
|--------|-------------|---------|---------------|
| Runtime | Node.js | 20.x LTS | Performance I/O, écosystème npm, compatibilité Distroless |
| Framework | Express.js | 4.18 | Léger, modulaire, middleware system |
| Langage | TypeScript | 5.x (strict) | Typage fort, détection d'erreurs à la compilation |
| Base de données | PostgreSQL | 16 | ACID, RBAC natif, ENUM type, requêtes paramétrées |
| Client BDD | node-postgres (pg) | 8.11 | Léger, requêtes paramétrées natives |
| Authentification | jsonwebtoken | 9.x | JWT access + refresh tokens opaques |
| Hashing | argon2 | 0.44.x | Argon2id — résistant GPU/ASIC, standard OWASP |
| Validation | zod | 3.21 | Schémas TypeScript-first, parse + type inference |
| Sécurité headers | helmet | 7.x | CSP, HSTS, X-Frame-Options |
| CORS | cors | 2.8.5 | Origins whitelist configurables |
| Rate limiting | express-rate-limit | 8.x | 3 niveaux (global, auth, commentaires) |
| Sanitization | validator | 13.x | Échappement XSS sur les entrées serveur |

### Frontend

| Couche | Technologie | Version | Justification |
|--------|-------------|---------|---------------|
| Framework UI | Vue 3 | 3.3.4 | Composition API, réactivité fine, SFC |
| Langage | TypeScript | 5.x | Typage des modèles, cohérence avec backend |
| Bundler | Vite | 4.4.5 | Build ultra-rapide, HMR, optimisation prod |
| State management | Pinia | 3.x | Successeur officiel Vuex, TypeScript-first |
| Routing | Vue Router | 5.x | SPA history mode, navigation guards |
| Sanitization XSS | DOMPurify | 3.x | Nettoyage HTML avant affichage (`v-html`) |
| Tests | Vitest | 4.x | Compatible Vite, API Jest-like |
| Test utils | @vue/test-utils | 2.4.6 | Monte/interagit avec les composants Vue |

### Infrastructure

| Couche | Technologie | Version | Justification |
|--------|-------------|---------|---------------|
| Conteneurs | Docker | 24.x | Isolation, reproductibilité |
| Orchestration | Docker Swarm | — | Déploiement prod multi-nœuds, secrets natifs |
| Compose | Docker Compose | v3.8 | Dev/test/prod selon fichier cible |
| Reverse proxy | Traefik | v2.10 | Auto-discovery Docker, TLS automatique, middlewares |
| TLS | Let's Encrypt (ACME) | — | Certificats gratuits, renouvelés automatiquement |
| CI/CD | GitHub Actions | — | Lint → Test → Audit → Trivy → Docker Build |
| Scan images | Trivy | — | Détection CVE CRITICAL sur images Docker |
| Scan deps | npm audit | — | Détection vulnérabilités dans node_modules |

---

## 3. Architecture Globale

### 3.1 Diagramme d'Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        NAVIGATEUR CLIENT                                │
│                                                                         │
│  Vue 3 + TypeScript + Pinia + Vue Router 5                              │
│  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────────┐     │
│  │  Composants   │  │   Pinia Stores   │  │    Vue Router 5      │     │
│  │  Dashboard    │  │  auth.ts         │  │  + Navigation Guards │     │
│  │  Feed.vue     │  │  note.ts         │  │  (requiresAuth meta) │     │
│  │  NoteCard.vue │  │  tag.ts          │  └──────────────────────┘     │
│  │  Login.vue    │  │  feed.ts         │                               │
│  └───────────────┘  │  user.ts         │                               │
│                     └──────────────────┘                               │
│  Sécurité : DOMPurify (XSS) · Cookies HTTP-only (JWT)                  │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ HTTPS / JSON
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   TRAEFIK v2.10 (Reverse Proxy / TLS)                   │
│  • Redirection HTTP → HTTPS                                              │
│  • Terminaison TLS 1.3 (Let's Encrypt)                                  │
│  • Middlewares : rate-limit + sec-headers (HSTS, CSP, X-Frame)          │
│  • Réseaux overlay isolés : net-front · net-api                          │
└──────────────┬──────────────────────────────┬───────────────────────────┘
               │                              │
               ▼ net-front                    ▼ net-api
┌──────────────────────┐     ┌──────────────────────────────────────────┐
│   FRONTEND (× 2)     │     │        BACKEND (× 3)                     │
│   Nginx alpine-slim  │     │   Node.js 20 / Express / TypeScript      │
│   Assets statiques   │     │                                          │
│   Compression gzip   │     │  ┌──────────┐ ┌──────────┐ ┌─────────┐  │
│   Cache 1 an assets  │     │  │  auth/   │ │  users/  │ │ notes/  │  │
└──────────────────────┘     │  │  routes  │ │  routes  │ │ routes  │  │
                             │  └──────────┘ └──────────┘ └─────────┘  │
                             │  ┌──────────┐ ┌──────────┐ ┌─────────┐  │
                             │  │  tags/   │ │  feed/   │ │metadata/│  │
                             │  │  routes  │ │  routes  │ │ routes  │  │
                             │  └──────────┘ └──────────┘ └─────────┘  │
                             │                                          │
                             │  Middleware : Helmet · CORS · RateLimit  │
                             │              · Sanitize · Audit          │
                             └────────────────────────┬─────────────────┘
                                                      │ net-data (chiffré)
                                                      ▼
                             ┌────────────────────────────────────────────┐
                             │         PostgreSQL 16 (× 1)               │
                             │         18 tables — 9 migrations           │
                             │         Pas d'accès depuis internet        │
                             └────────────────────────────────────────────┘
```

### 3.2 Flux de Requête Typique

#### Connexion (`POST /api/v1/auth/login`)

```
1. Client → POST /auth/login { username, password }
2. Traefik → Backend (rate-limit auth : 15 req/h)
3. Backend → PostgreSQL : SELECT * FROM users WHERE username = $1
4. Backend : argon2.verify(stored_hash, password) → OK
5. Backend : generateAccessToken() → JWT 15 min
6. Backend : generateRefreshToken() → 64 hex chars
7. Backend → PostgreSQL : INSERT INTO sessions (hash, expires_at, ...)
8. Backend → Client : Set-Cookie: auth_token=...; HttpOnly
                       Set-Cookie: refresh_token=...; HttpOnly
                       + Body JSON { user: { id, username, role } }
```

#### Consultation du Feed (`GET /api/v1/feed`)

```
1. Client → GET /api/v1/feed (cookie auth_token)
2. Middleware authenticate() → verifyAccessToken() → OK
3. Backend → PostgreSQL :
   SELECT n.* FROM notes n
   JOIN note_tags nt ON n.id = nt.note_id
   WHERE nt.tag_id IN (
     SELECT tag_id FROM user_tags WHERE user_id = $1
   )
   ORDER BY n.created_at DESC
4. Backend → Client : JSON [ { id, title, content, tags, ... } ]
```

---

## 4. Structure du Dépôt

```
NOTIMATIC/
├── README.md                         # Point d'entrée du projet
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml                    # Pipeline GitHub Actions
│
├── backend/                          # API Node.js/Express/TypeScript
│   ├── src/
│   │   ├── main.ts                   # Point d'entrée Express + middleware
│   │   ├── auth/                     # Auth : login, logout, refresh, password reset
│   │   ├── users/                    # Gestion utilisateurs + RGPD
│   │   ├── notes/                    # CRUD notes + réactions + commentaires
│   │   ├── tags/                     # Tags Unifiés (CRUD)
│   │   ├── feed/                     # Feed personnalisé
│   │   ├── metadata/                 # /themes et /categories
│   │   ├── categories/               # Catégories (legacy)
│   │   ├── themes/                   # Thèmes (legacy)
│   │   └── common/                   # middleware.ts, audit.ts, types.ts, utils.ts
│   │   └── config/                   # env.ts, database.ts
│   ├── migrations/                   # 9 migrations SQL (001→009)
│   ├── tests/                        # Tests d'intégration Jest/Supertest
│   ├── init.sql                      # Schéma initial (users, notes, comments)
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                         # Application Vue 3 + TypeScript + Pinia
│   ├── src/
│   │   ├── main.ts                   # Bootstrap Vue + Pinia + Router
│   │   ├── App.vue                   # Composant racine
│   │   ├── components/               # 10 composants Vue (Dashboard, Feed, NoteCard…)
│   │   ├── stores/                   # 5 stores Pinia (auth, note, tag, feed, user)
│   │   ├── router/                   # Vue Router + navigation guards
│   │   ├── config/                   # api.ts — configuration dynamique URL API
│   │   ├── types/                    # models.ts — interfaces TypeScript
│   │   ├── utils/                    # sanitize.js (DOMPurify), theme.ts
│   │   └── composables/              # useTheme.ts
│   ├── tests/                        # Tests Vitest
│   ├── nginx.conf                    # Config Nginx production
│   └── vite.config.ts
│
├── infrastructure/                   # Docker, Traefik, scripts
│   ├── Dockerfile.backend            # Multi-stage : builder → Distroless runner
│   ├── Dockerfile.frontend           # Multi-stage : builder → Nginx runner
│   ├── docker-compose.dev.yml        # Dev : hot-reload, ports exposés
│   ├── docker-compose.prod.yml       # Prod : Swarm, secrets, réseaux chiffrés
│   ├── docker-compose.test.yml       # Test : CI/CD
│   ├── config/
│   │   └── traefik/
│   │       ├── traefik.yml           # Configuration statique Traefik
│   │       └── dynamic_conf.yml      # Middlewares, TLS 1.3
│   └── scripts/
│       ├── db/migrate.sh             # Runner de migrations SQL
│       └── security_ops.sh           # Scan + signature + backup
│
└── docs/                             # Documentation complète
    ├── ARCHITECTURE.md
    ├── SECURITY.md
    ├── GDPR.md
    ├── API.md
    ├── ROADMAP.md
    ├── RELEASE_NOTES.md
    ├── USER_GUIDE.md
    ├── wireframes.md
    ├── dossier-projet/               # Documents techniques officiels (3 livrables)
    └── livrable/                     # ← Ce dossier (version consolidée)
```

---

## 5. Schéma de Base de Données

### 5.1 Domaines et Tables

#### Domaine 1 — Identité & Authentification (4 tables)

```sql
users                         -- Comptes utilisateurs
  id, username, password_hash, role (ENUM), email, phone,
  created_at, updated_at, deleted_at (soft-delete)

profiles                      -- Profil étendu
  id, user_id → users, classe, promotion, niveau, created_at

sessions                      -- Refresh tokens
  id, user_id → users, refresh_token_hash, expires_at,
  user_agent, ip_address, revoked, revoked_at, created_at

password_reset_tokens         -- Tokens one-time réinitialisation
  id, user_id → users, token_hash, expires_at, used, created_at
```

#### Domaine 2 — Contenu (3 tables)

```sql
notes                         -- Notes pédagogiques
  id, user_id → users, title, content (TEXT/Markdown),
  pinned, urgent, view_count, created_at, updated_at

comments                      -- Commentaires sur les notes
  id, note_id → notes, user_id → users, content, created_at

reactions                     -- Réactions toggle (up/down)
  id, note_id → notes, user_id → users, reaction_type, created_at
  UNIQUE (note_id, user_id)
```

#### Domaine 3 — Tagging & Ciblage (7 tables)

```sql
tags                          -- Tags Unifiés (principal système de ciblage)
  id, type (ENUM: classe|specialite|groupe|categorie),
  name, meta (JSONB), is_default_for_student_view, created_by → users

note_tags                     -- Association note ↔ tag (many-to-many)
  note_id → notes, tag_id → tags, PRIMARY KEY (note_id, tag_id)

user_tags                     -- Tags assignés à un utilisateur → feed ciblé
  user_id → users, tag_id → tags, PRIMARY KEY (user_id, tag_id)

note_targets                  -- Règles de ciblage fin
  id, note_id → notes, target_type (ENUM), target_value

-- Tables legacy (coexistantes avec Tags Unifiés)
themes, categories, note_themes, note_categories
```

#### Domaine 4 — Conformité & Audit (2 tables)

```sql
audit_logs                    -- Journal immuable (INSERT uniquement)
  id, user_id → users (nullable), action, entity_type, entity_id,
  details (JSONB), ip_address, user_agent, created_at

gdpr_export_requests          -- Suivi demandes RGPD
  id, user_id → users, status, requested_at, completed_at

-- Table technique
schema_migrations             -- Versioning des migrations
  id, migration_file (UNIQUE), applied_at
```

### 5.2 Relations Clés

```
users ──┬── notes ──┬── comments
        │           ├── reactions
        │           ├── note_tags ── tags
        │           └── note_targets
        ├── profiles
        ├── sessions
        ├── user_tags ── tags
        ├── audit_logs
        └── gdpr_export_requests
```

---

## 6. Sécurité by Design — Vue Transversale

La sécurité est intégrée à **chaque couche** de l'architecture, pas ajoutée en fin de développement.

### Carte des mesures de sécurité par couche

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                       │
│  • DOMPurify (XSS) sur tout v-html                              │
│  • Pas de token en localStorage/sessionStorage                  │
│  • Navigation guard routeur (requiresAuth)                      │
│  • Pas de secret dans le code frontend                          │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  RÉSEAU                                                         │
│  • TLS 1.3 uniquement (Traefik)                                 │
│  • HSTS + CORS strict + CSP                                     │
│  • Réseaux Docker internes (net-front, net-api, net-data)       │
│  • Rate limiting Traefik (100 req/s, burst 50)                  │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND — ENTRÉES                                              │
│  • Rate limiting Express (global 100/15min, auth 15/h)         │
│  • Sanitization validator.escape() sur toutes les entrées      │
│  • Validation Zod sur chaque endpoint                           │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND — AUTHENTIFICATION                                     │
│  • JWT HTTP-only (access 15 min)                               │
│  • Refresh tokens opaques rotatifs (30 j, hash SHA-256 BDD)    │
│  • Argon2id pour les mots de passe                             │
│  • Auto-refresh transparent (middleware authenticate)           │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND — AUTORISATION                                         │
│  • RBAC 4 rôles (middleware authorize)                         │
│  • Vérification propriétaire sur chaque endpoint sensible      │
│  • Audit log sur toutes les actions critiques                   │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  BASE DE DONNÉES                                                │
│  • Requêtes paramétrées ($1, $2, ...) — zéro concaténation     │
│  • Soft-delete (deleted_at) — pas de suppression physique      │
│  • audit_logs en INSERT uniquement — immuable                  │
│  • Chiffrement réseau net-data entre nœuds Swarm               │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  CONTENEURS                                                     │
│  • Image Distroless (backend) — aucun shell                    │
│  • Utilisateur non-root (65532 backend, nginx frontend)        │
│  • read_only: true en production                               │
│  • no-new-privileges: true                                     │
│  • Secrets Docker Swarm (jamais en variable d'env directe)     │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  CI/CD                                                          │
│  • npm audit --audit-level=critical (dépendances)              │
│  • Trivy scan images Docker (CRITICAL bloquant)                │
│  • Tests couverture ≥ 80% backend, ≥ 70% frontend             │
│  • Permissions minimales GitHub Actions                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Pipeline CI/CD

> **Source** : `.github/workflows/ci.yml`

```
push / pull_request
        │
        ├── backend-lint     (Node 18 + Node 20)
        │   └── ESLint + @typescript-eslint + eslint-plugin-security
        │
        ├── backend-test     (Node 18 + Node 20)
        │   └── Jest + Supertest + couverture ≥ 80%
        │
        ├── frontend-lint    (Node 20)
        │
        ├── frontend-test    (Node 20)
        │   └── Vitest + couverture ≥ 70%
        │
        ├── npm-audit        (backend + frontend)
        │   └── --audit-level=critical → bloquant si CVE critique
        │
        ├── trivy-scan
        │   └── Scan images Docker CRITICAL → bloquant
        │
        ├── docker-build
        │   └── Build multi-stage backend + frontend
        │
        └── e2e-smoke        (main branch uniquement)
            └── Playwright smoke tests
```

---

## 8. Métriques du Projet

| Indicateur | Valeur |
|------------|--------|
| Lignes de code (estimation) | ~8 000 lignes (TypeScript + SQL + YAML) |
| Fichiers source | ~60 fichiers (hors tests, hors node_modules) |
| Endpoints REST | 30+ (API v1) |
| Tables PostgreSQL | 18 |
| Migrations SQL | 9 (001→009) |
| Composants Vue | 10 |
| Stores Pinia | 5 |
| Tests backend | ~15 suites Jest |
| Tests frontend | ~4 suites Vitest |
| Versions livrées | 8 (v0.1.0 → v1.0.0) + CI fix |
| Documents | 12 documents Markdown |
| Images Docker | 2 (backend Distroless, frontend Nginx) |

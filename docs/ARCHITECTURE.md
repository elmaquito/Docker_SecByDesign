# Architecture Technique - NOTIMATIC MVP

## Date d'analyse
**12 décembre 2024**

## 1. Détection et Analyse du Backend Existant

### 1.1 Stack Détectée

Après inspection du repository, la stack actuelle est:

#### Backend
- **Langage**: TypeScript (28.7% du codebase)
- **Runtime**: Node.js
- **Framework**: Express.js (v4.18.2)
- **ORM/Database Client**: pg (node-postgres) v8.11.0 - client PostgreSQL natif
- **Base de données**: PostgreSQL
- **Sécurité**:
  - helmet v7.0.0 (sécurisation headers HTTP)
  - argon2 v0.30.3 (hashing de mots de passe)
  - jsonwebtoken v9.0.0 (JWT)
  - cookie-parser v1.4.6
  - cors v2.8.5
  - zod v3.21.4 (validation de schémas)

#### Frontend
- **Framework**: Vue 3 (v3.3.4) (42.9% du codebase)
- **Bundler**: Vite (v4.4.5)
- **Langage**: TypeScript (Configuré v5+)
- **État**: Pinia (v2+)
- **Routing**: Vue Router (v4+)
- **Tests**: Vitest (installé)

#### Infrastructure
- **Conteneurisation**: Docker & Docker Compose
- **Reverse Proxy**: Traefik (mode production)
- **Orchestration**: Docker Swarm (mode production)
- **Scripts**: Shell (15%) et PowerShell (9.5%)

### 1.2 Fichiers Clés Identifiés

```
backend/
├── src/main.ts          # Point d'entrée, routes API, middleware
├── migrations/          # Migrations SQL (001-008)
├── package.json         # Dépendances backend
└── tsconfig.json        # Configuration TypeScript

frontend/
├── src/
│   ├── App.vue         # Composant racine (TS)
│   ├── main.ts         # Point d'entrée (TS)
│   ├── router/         # Configuration Vue Router
│   ├── stores/         # Stores Pinia (Auth, Tags)
│   └── components/
│       ├── Login.vue   # Authentification
│       └── Dashboard.vue # Dashboard principal
├── package.json        # Dépendances frontend (TypeScript, Pinia, Router)
└── vite.config.ts      # Configuration Vite (TS)

infrastructure/
├── docker-compose.dev.yml
├── docker-compose.prod.yml
└── docker-compose.debug.yml
```

### 1.3 Modèle de Données Actuel

Le schéma SQL a évolué via des migrations (`backend/migrations/`) pour inclure :

- **Utilisateurs & Profils** (`users`, `profiles`, `password_reset_tokens`)
- **Notes & Contenu** (`notes`, `comments`, `reactions`)
- **Classification Unifiée** (`tags`, `note_tags`) remplacant Thèmes/Catégories
  - Types: `classe`, `specialite`, `groupe`, `categorie`
- **Sécurité & Audit** (`audit_logs`, `gdpr_export_requests`, `sessions`)

```sql
-- Extrait du schéma Tags Unifiés
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) CHECK (type IN ('classe', 'specialite', 'groupe', 'categorie')) NOT NULL,
    name VARCHAR(100) NOT NULL,
    meta JSONB DEFAULT '{}',
    is_default_for_student_view BOOLEAN DEFAULT FALSE
);
```
- Pas de table `note_targets` (assignation many-to-many)
- Pas de table `note_categories`
- Pas de tables d'audit/logs
- Pas de mécanisme GDPR (export/purge)

### 1.4 API Actuelle

Endpoints implémentés dans `backend/src/main.ts`:

**Authentification**
- `POST /api/v1/auth/login` - Connexion avec JWT (HTTP-only cookie)
- `POST /api/v1/auth/logout` - Déconnexion

**Users** (Admin/Technician seulement)
- `POST /api/v1/users` - Créer utilisateur
- `GET /api/v1/users` - Lister utilisateurs

**Notes**
- `GET /api/v1/notes` - Liste notes (avec RBAC)
- `POST /api/v1/notes` - Créer note
- `GET /api/v1/notes/:id` - Détail note
- `PATCH /api/v1/notes/:id` - Modifier note
- `DELETE /api/v1/notes/:id` - Supprimer note

**Comments**
- `GET /api/v1/notes/:id/comments` - Lister commentaires
- `POST /api/v1/notes/:id/comments` - Créer commentaire

**Setup**
- `POST /api/v1/setup` - Créer admin initial (dev only)

**Manques identifiés**:
- Pas d'endpoints pour themes
- Pas d'endpoints pour categories
- Pas d'endpoint feed avec filtrage avancé
- Pas d'endpoints GDPR
- Pas de rate limiting
- Pas de sanitization XSS explicite
- Pas de logging/audit

## 2. Décision Technique pour le MVP

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
- Fichiers de migration SQL numérotés dans `backend/migrations/`
- Script de migration simple dans `package.json`
- Transactions pour intégrité des données

### 2.2 Choix Frontend

**Décision**: Migrer vers **Vue 3 + TypeScript + Pinia**

**Justification**:
1. Vue 3 déjà en place, on étend avec TypeScript
2. Pinia = state management officiel pour Vue 3 (plus moderne que Vuex)
3. TypeScript = sécurité de type, meilleure DX, moins d'erreurs
4. Vitest = framework de test natif Vite, très rapide

**Étapes de migration**:
1. Renommer `main.js` → `main.ts`
2. Ajouter `tsconfig.json` pour frontend
3. Installer Pinia, TypeScript, Vitest
4. Créer les stores Pinia
5. Migrer composants vers `<script setup lang="ts">`

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

### 2.4 Schéma de Base de Données Étendu

**Nouvelles tables à créer**:

```sql
-- Profils utilisateurs (classe, promo, niveau)
CREATE TABLE profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    classe VARCHAR(50),           -- ex: "Cyber1", "Dev2"
    promotion VARCHAR(50),        -- ex: "2024-2025"
    niveau VARCHAR(20),           -- ex: "Bac+1", "Bac+2", "Bac+3"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Thèmes (créés par admins/teachers)
CREATE TABLE themes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Catégories (pour ciblage)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    target_type VARCHAR(20) CHECK (target_type IN ('classe', 'promotion', 'niveau', 'all')),
    target_value VARCHAR(50),    -- valeur spécifique ou NULL pour 'all'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Association Note-Thème (many-to-many)
CREATE TABLE note_themes (
    note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
    theme_id INTEGER REFERENCES themes(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, theme_id)
);

-- Association Note-Catégorie (ciblage)
CREATE TABLE note_categories (
    note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, category_id)
);

-- Cibles de notes (assignation directe par user ou critères)
CREATE TABLE note_targets (
    id SERIAL PRIMARY KEY,
    note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
    target_type VARCHAR(20) CHECK (target_type IN ('user', 'classe', 'promotion', 'niveau', 'all')),
    target_value VARCHAR(50),    -- user_id, nom de classe, etc., ou NULL pour 'all'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs (actions critiques)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,  -- ex: 'NOTE_CREATED', 'USER_EXPORTED', 'NOTE_DELETED'
    entity_type VARCHAR(50),       -- ex: 'note', 'user', 'comment'
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- GDPR - Demandes d'export
CREATE TABLE gdpr_export_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',  -- pending, completed, failed
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    export_data JSONB
);

-- GDPR - Flag de suppression (soft delete)
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN anonymized BOOLEAN DEFAULT FALSE;
```

## 3. Stack Technologique Finale

### Backend
- **Runtime**: Node.js 20.x LTS
- **Framework**: Express.js 4.18.2
- **Langage**: TypeScript 5.1.0
- **Database**: PostgreSQL 16
- **Client DB**: pg 8.11.0
- **Auth**: jsonwebtoken 9.0.0 (JWT)
- **Hashing**: argon2 0.30.3
- **Validation**: zod 3.21.4
- **Sécurité**: helmet 7.0.0, cors 2.8.5
- **Tests**: Jest ou Mocha + Supertest (à ajouter)

### Frontend
- **Framework**: Vue 3.3.4
- **Langage**: TypeScript 5.x (à ajouter)
- **State Management**: Pinia 2.x (à ajouter)
- **Router**: Vue Router 4.x (à ajouter)
- **Build Tool**: Vite 4.4.5
- **Tests**: Vitest (à ajouter)
- **E2E Tests**: Playwright (à ajouter)

### Infrastructure
- **Conteneurs**: Docker 24.x
- **Orchestration**: Docker Compose / Swarm
- **Reverse Proxy**: Traefik 2.x
- **CI/CD**: GitHub Actions
- **Security Scanning**: Trivy

## 4. Stratégie de Migration et Implémentation

### Phase 1: Fondations (Semaine 1)
1. Créer migrations SQL pour nouvelles tables
2. Ajouter TypeScript et Pinia au frontend
3. Créer les stores Pinia de base
4. Mettre en place le workflow CI/CD

### Phase 2: Backend API (Semaine 2)
1. Implémenter endpoints Themes
2. Implémenter endpoints Categories
3. Implémenter endpoint Feed étendu avec filtrage
4. Ajouter middleware rate limiting et sanitization
5. Implémenter logging/audit

### Phase 3: Frontend MVP (Semaine 3)
1. Créer composants Feed (FeedList, NoteCard)
2. Créer formulaire création note (teacher)
3. Intégrer sélection thèmes/catégories
4. Implémenter filtres de feed

### Phase 4: GDPR & Sécurité (Semaine 4)
1. Endpoints GDPR (export/purge)
2. Tests de sécurité
3. Documentation GDPR
4. Scan Trivy et dépendances

### Phase 5: Tests & Finalisation (Semaine 5)
1. Tests unitaires backend
2. Tests unitaires frontend
3. Tests E2E Playwright
4. Documentation finale

## 5. Sécurité by Design

### Mesures Existantes
✅ JWT avec HTTP-only cookies
✅ Argon2 pour hashing
✅ Helmet pour headers sécurisés
✅ CORS configuré
✅ Requêtes SQL paramétrées
✅ Validation Zod

### Mesures à Ajouter
- [ ] Rate limiting (express-rate-limit)
- [ ] Sanitization XSS (DOMPurify côté front, validator côté back)
- [ ] CSRF protection (csurf)
- [ ] Audit logging
- [ ] Scan dépendances (npm audit, Trivy)
- [ ] Content Security Policy (CSP)

## 6. Conformité RGPD

### Principes
1. **Minimisation**: Collecter seulement les données nécessaires
2. **Consentement**: Informer les utilisateurs
3. **Droit d'accès**: Endpoint d'export
4. **Droit à l'oubli**: Endpoint de suppression/anonymisation
5. **Sécurité**: Chiffrement, audit logs
6. **Rétention**: Politique de conservation (à définir)

### Implémentation
- Endpoints `/api/users/:id/export` et `/api/users/:id`
- Soft delete avec flag `deleted_at`
- Anonymisation optionnelle
- Logs d'audit pour actions GDPR
- Documentation des traitements

## 7. CI/CD Pipeline

### Workflow GitHub Actions

```yaml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  lint-backend:
    - npm run lint
  
  test-backend:
    - npm run test
  
  lint-frontend:
    - npm run lint
  
  test-frontend:
    - npm run test:unit
  
  e2e:
    - npm run test:e2e
  
  build:
    - docker build backend
    - docker build frontend
  
  security:
    - npm audit
    - trivy scan
  
  deploy:
    - (optionnel) push to registry
```

## 8. Conclusion

**Stack finale retenue**: 
- Backend: **Express + TypeScript + PostgreSQL (pg client natif)**
- Frontend: **Vue 3 + TypeScript + Pinia**
- Infrastructure: **Docker + GitHub Actions + Traefik**

Cette stack est cohérente avec l'existant, moderne, sécurisée et parfaitement adaptée aux exigences du MVP.

**Prochaines étapes**:
1. Créer les migrations SQL
2. Scaffolder le frontend TypeScript/Pinia
3. Implémenter les endpoints manquants
4. Mettre en place CI/CD
5. Créer les issues GitHub avec roadmap détaillée

---

**Auteur**: GitHub Copilot Agent  
**Date**: 12 décembre 2024  
**Version**: 1.0

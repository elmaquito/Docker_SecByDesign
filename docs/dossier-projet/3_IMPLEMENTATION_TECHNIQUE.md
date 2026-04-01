# NOTIMATIC — Documentation Technique d'Implémentation

> **Référence** : Dossier Technique — Document 3/3  
> **Titre** : Choix Technologiques, Plan d'Adressage et Fichiers de Configuration  
> **Projet** : NOTIMATIC — Plateforme sécurisée de prise de notes éducatives  
> **Version** : v1.2.0  
> **Date** : 1er avril 2026  
> **Dépôt** : https://github.com/elmaquito/NOTIMATIC

---

## Sommaire

1. [Choix Technologiques Motivés](#1-choix-technologiques-motivés)
   - 1.1 [Backend](#11-backend)
   - 1.2 [Frontend](#12-frontend)
   - 1.3 [Base de Données](#13-base-de-données)
   - 1.4 [Infrastructure et Déploiement](#14-infrastructure-et-déploiement)
   - 1.5 [CI/CD et Qualité](#15-cicd-et-qualité)
2. [Plan d'Adressage Réseau](#2-plan-dadressage-réseau)
   - 2.1 [Développement Local](#21-développement-local)
   - 2.2 [Production (Docker Swarm)](#22-production-docker-swarm)
3. [Fichiers de Configuration Commentés](#3-fichiers-de-configuration-commentés)
   - 3.1 [Variables d'Environnement](#31-variables-denvironnement)
   - 3.2 [Docker Compose — Développement](#32-docker-compose--développement)
   - 3.3 [Docker Compose — Production](#33-docker-compose--production)
   - 3.4 [Traefik — Configuration Statique](#34-traefik--configuration-statique)
   - 3.5 [Traefik — Configuration Dynamique](#35-traefik--configuration-dynamique)
   - 3.6 [Nginx (Frontend)](#36-nginx-frontend)
   - 3.7 [TypeScript — Backend](#37-typescript--backend)
   - 3.8 [ESLint — Backend](#38-eslint--backend)
4. [Erreurs Rencontrées et Résolutions](#4-erreurs-rencontrées-et-résolutions)
5. [Procédures Opérationnelles](#5-procédures-opérationnelles)
   - 5.1 [Démarrage Environnement de Développement](#51-démarrage-environnement-de-développement)
   - 5.2 [Migrations Base de Données](#52-migrations-base-de-données)
   - 5.3 [Déploiement Production](#53-déploiement-production)
   - 5.4 [Exécution des Tests](#54-exécution-des-tests)

### Annexes
- [Annexe A — Arborescence du Projet](#annexe-a--arborescence-du-projet)
- [Annexe B — Versions des Dépendances Critiques](#annexe-b--versions-des-dépendances-critiques)
- [Annexe C — Variables d'Environnement Complètes](#annexe-c--variables-denvironnement-complètes)

---

## 1. Choix Technologiques Motivés

### 1.1 Backend

#### Node.js 18 LTS — Environnement d'Exécution

**Choisi car** :
- Version LTS (Long Term Support) — maintenance de sécurité garantie jusqu'en avril 2025 (Node 18) puis Node 20
- Cohérence avec l'écosystème npm (même runtime pour backend et outils frontend)
- Excellente performance I/O asynchrone pour une API REST (modèle event-loop)

**Alternatives considérées** :
- _Deno_ : Rejeté — écosystème moins mature, compatibilité npm limitée à l'époque
- _Bun_ : Rejeté — trop récent, comportements edge-case non documentés en production

**Matrix CI** : Tests sur Node **18 et 20** pour garantir la compatibilité entre les deux versions LTS.

---

#### Express.js 4 — Framework HTTP

**Choisi car** :
- Framework minimaliste et sans opinions — contrôle total sur les middlewares
- Écosystème de middlewares de sécurité mature (`helmet`, `express-rate-limit`, `cors`)
- Courbe d'apprentissage faible pour l'équipe

**Alternatives considérées** :
- _Fastify_ : Performances supérieures, mais validation intégrée incompatible avec Zod au moment du choix
- _NestJS_ : Trop de surcharge architecturale (IoC, decorators) pour un MVP

---

#### TypeScript 5 — Typage Statique

**Choisi car** :
- Détection des erreurs à la compilation (ex: type de retour incorrect depuis PostgreSQL)
- Meilleure maintenabilité : les interfaces documentent le schéma des données
- `zod` génère automatiquement les types TypeScript depuis les schémas de validation

**Décision tardive** : Le backend a été migré de JavaScript vers TypeScript en v0.7.0. Cette migration a révélé plusieurs bugs silencieux (propriétés `undefined` non vérifiées, types de retour PostgreSQL non typés).

---

#### Argon2id — Hachage des Mots de Passe

**Choisi car** :
- Recommandé par l'OWASP Password Storage Cheat Sheet (2023) et le NIST SP 800-63B
- Résistant aux attaques GPU (memory-hard : 64 MB par hash)
- Résistant aux attaques side-channel (version `id` = hybride Argon2i + Argon2d)

**Alternatives considérées et rejetées** :
- _bcrypt_ : Limité à 72 octets, vulnérable aux attaques GPU avec ASIC/FPGA modernes
- _scrypt_ : Bon, mais Argon2id lui est généralement préféré depuis la compétition Password Hashing Competition (2015)
- _SHA-256/MD5_ : **Inacceptable** — non conçu pour les mots de passe (trop rapide, pas de sel intégré)

**Configuration utilisée** :
```typescript
await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64 MB — résistance GPU
  timeCost: 3,        // 3 itérations — ~100ms sur CPU moderne
  parallelism: 4      // 4 threads — exploite les multicœurs
});
```

---

#### jsonwebtoken 9.x — Tokens JWT

**Choisi car** :
- Bibliothèque référence pour JWT en Node.js (>150M téléchargements/semaine)
- Support natif de HS256 (HMAC-SHA256) — symétrique et performant
- Expiration native (`expiresIn: '15m'`) avec vérification automatique

**Décision d'architecture** : JWT pour les access tokens (auto-vérifiable sans BDD), tokens opaques (`crypto.randomBytes`) pour les refresh tokens (révocation possible via BDD).

---

#### Zod 3 — Validation des Schémas

**Choisi car** :
- Inférence TypeScript native — le type TS est dérivé du schéma Zod automatiquement
- Messages d'erreur précis et localisables
- Support de `.parse()` (exception) et `.safeParse()` (résultat)

```typescript
const loginSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(128)
});
// Type inféré automatiquement : { username: string; password: string }
type LoginInput = z.infer<typeof loginSchema>;
```

---

#### node-postgres (pg) 8 — Client PostgreSQL

**Choisi car** :
- Driver natif officiel PostgreSQL pour Node.js
- Connection pooling intégré (`Pool` — max 10 connexions par défaut)
- Support des paramètres positionnels `$1, $2` (anti-SQLi structurel)

---

### 1.2 Frontend

#### Vue 3.3 — Framework SPA

**Choisi car** :
- Composition API : meilleure réutilisabilité du code (composables `useAuth`, `useNotes`)
- TypeScript natif depuis Vue 3 (pas de `vue-class-component` nécessaire)
- Vite (bundler) : démarrage < 500ms en développement

**Alternatives considérées** :
- _React_ : Plus populaire, mais la courbe d'apprentissage JSX + hooks était moins adaptée au contexte pédagogique
- _Svelte_ : Performances exceptionnelles, mais écosystème plus petit (moins de composants disponibles)

---

#### Pinia 3 — State Management

**Choisi car** :
- Store officiel Vue 3 (remplace Vuex)
- Plus simple : pas de mutations séparées, actions directes
- TypeScript natif

**Stores implémentés** :
- `auth.ts` — état d'authentification (user, isAuthenticated)
- `note.ts` — cache des notes
- `feed.ts` — données du feed
- `tag.ts` — tags disponibles
- `user.ts` — données utilisateur

---

#### Vue Router 5 — Routeur

**Version** : `^5.0.3` (cf. `frontend/package.json`)

**Fonctionnalités utilisées** :
- `createWebHistory()` — URLs propres sans `#`
- `router.beforeEach()` — Navigation guard pour protéger les routes authentifiées

---

#### Vitest 4 + @vue/test-utils 2 — Tests Frontend

**Choisi car** :
- Vitest est intégré à Vite (même pipeline de transformation)
- API compatible Jest (migration facilitée)
- `@vue/test-utils` — montage de composants Vue en test

**Seuil de couverture** : 70% de couverture de lignes (CI gate)

---

#### DOMPurify 3 — Sanitization HTML Côté Client

**Choisi car** :
- Bibliothèque de référence pour la sanitization HTML (>5M téléchargements/semaine)
- Liste blanche de tags autorisés configurable
- Protection contre XSS stocké lors de l'affichage du contenu

---

### 1.3 Base de Données

#### PostgreSQL 15 Alpine — SGBDR

**Choisi car** :
- SGBDR relationnel complet avec support des transactions ACID
- Type `JSONB` pour les métadonnées flexibles (tags.meta, audit_logs.details)
- Fonctions stockées et triggers (auto-update `updated_at`, anonymisation RGPD)
- `pg_isready` health check natif (utilisé par Docker)
- Image Alpine : image plus légère (50 MB vs 400 MB pour Debian)

**Justification PostgreSQL vs alternatives** :

| Critère | PostgreSQL | MySQL | MongoDB | SQLite |
|---------|-----------|-------|---------|--------|
| Transactions ACID | ✅ Complet | ✅ (InnoDB) | ✅ (4.0+) | ✅ |
| Type JSONB | ✅ | ⚠️ JSON seulement | ✅ natif | ❌ |
| Fonctions/Triggers | ✅ | ✅ | ⚠️ | ⚠️ |
| Requêtes paramétrées | ✅ protocole natif | ✅ | ✅ | ✅ |
| Réputation sécurité | ✅ Excellent | ✅ Bon | ⚠️ Historique de CVE | ✅ |

---

**Stratégie de migration** : 9 fichiers SQL numérotés séquentiellement, exécutés par `backend/migrate.sh` :

```
init.sql                  — Schéma initial (users, notes, comments)
001_add_profiles.sql      — Table profiles (classe, promotion, niveau)
002_add_themes_categories.sql — Tables legacy themes/categories
003_add_note_targets.sql  — Ciblage des notes (legacy)
004_add_audit_gdpr.sql    — Audit logs + conformité RGPD
005_add_password_reset.sql — Reset mot de passe par token
006_add_unified_tags.sql  — Système de tags unifié (actif)
007_add_reactions.sql     — Réactions aux notes
008_add_sessions.sql      — Sessions pour refresh tokens Zero-Trust
009_add_user_tags.sql     — Association user_tags
```

---

### 1.4 Infrastructure et Déploiement

#### Docker — Conteneurisation

**Choisi car** :
- Isolation des processus (chaque service dans son conteneur)
- Reproductibilité totale (même image en dev et prod)
- Images multi-stage (`builder` → `runner`) pour réduire la taille finale

**Multi-stage build** (bonne pratique de sécurité) :
```
Stage builder (Node 18 Bullseye)    ~900 MB (avec outils de compilation)
       ↓
Stage runner (Distroless)           ~80 MB (sans shell, sans outils)
       ↓
Reduction : ~90% de la surface d'attaque
```

---

#### Docker Swarm — Orchestration

**Choisi car** :
- Natif Docker — pas d'installation supplémentaire
- Gestion des secrets Docker (`docker secret create`) — jamais en variables d'environnement claires
- Réseau overlay chiffré (`driver_opts.encrypted: true`)
- Réplication et load balancing natifs (`replicas: 3`)

**Comparaison Swarm vs Kubernetes** :

| Critère | Docker Swarm | Kubernetes |
|---------|-------------|-----------|
| Complexité d'installation | Faible (`docker swarm init`) | Élevée (kubeadm, Helm, etc.) |
| Courbe d'apprentissage | Modérée | Élevée |
| Gestion des secrets | Docker Secrets (intégré) | Kubernetes Secrets + Vault |
| Autoscaling horizontal | Limité (manuellement) | HPA natif |
| Adapté à | Équipes petites/moyennes | Infrastructure grande échelle |
| **Décision** | ✅ **Choisi** pour NOTIMATIC | Hors scope MVP |

---

#### Traefik v2.10 — Reverse Proxy

**Choisi car** :
- Découverte automatique des services Docker (via labels)
- Certificats Let's Encrypt automatiques (`certificatesResolvers`)
- Middlewares de sécurité natifs (rate-limit, security headers, redirect HTTPS)
- Dashboard désactivé en production (sécurité)

**Alternatives considérées** :
- _Nginx_ : Configuration manuelle des certificats — plus de charge opérationnelle
- _Caddy_ : Excellent pour HTTPS automatique, mais moins d'intégration Docker native qu'en 2024

---

#### Nginx Alpine Slim — Serveur Frontend

**Choisi car** :
- Sert des fichiers statiques (bundle Vite) — cas d'usage idéal de nginx
- Alpine Slim : image minimale (~7 MB)
- Configuration TLS personnalisée (`nginx.conf`)

---

### 1.5 CI/CD et Qualité

#### GitHub Actions — Orchestrateur CI/CD

**Choisi car** :
- Intégré nativement à GitHub (pas de serveur supplémentaire à maintenir)
- Gratuit pour les dépôts publics
- Actions marketplace : `actions/checkout@v4`, `aquasecurity/trivy-action@v0.19.0`

---

#### Jest 29 + Supertest 7 — Tests Backend

**Choisi car** :
- Jest : framework de test complet (runner + assertions + mocks + coverage)
- Supertest : simulation des requêtes HTTP Express sans démarrer le serveur

```typescript
// Exemple de test d'intégration (backend/src/tests/)
describe('POST /api/v1/auth/login', () => {
  it('should return 200 and set cookies on valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'AdminPass123!' });
    
    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toBeDefined();
  });
});
```

**Seuil de couverture** : 80% de couverture de lignes (CI gate)

---

#### ESLint 9 + eslint-plugin-security — Linting Backend

**Choisi car** :
- `@typescript-eslint/parser` : analyse TypeScript
- `eslint-plugin-security` : détecte des patterns dangereux (`eval`, injections, etc.)

**Règles de sécurité activées** :
- `security/detect-object-injection` — détecte les accès aux propriétés par injection
- `security/detect-non-literal-regexp` — détecte les regex construites dynamiquement
- `security/detect-eval-with-expression` — interdit `eval()`

---

#### Trivy (Aqua Security) — Scan de Vulnérabilités

**Choisi car** :
- Scan d'images Docker : OS packages + dépendances applicatives
- Intégration GitHub Actions native (`aquasecurity/trivy-action`)
- Configuration : niveau `CRITICAL` bloquant (CVE score CVSS ≥ 9.0)

---

## 2. Plan d'Adressage Réseau

### 2.1 Développement Local

```
┌─────────────────────────────────────────────────────────────────┐
│  Machine Développeur (hôte)                                     │
│                                                                  │
│  ┌─────────────┐  ┌────────────────┐  ┌────────────────────┐   │
│  │  Frontend   │  │  Backend API   │  │   PostgreSQL       │   │
│  │  Vue 3      │  │  Node.js + TS  │  │   v15-alpine       │   │
│  │  Vite dev   │  │  ts-node-dev   │  │                    │   │
│  │             │  │                │  │                    │   │
│  │  :5173 ◄────┼──│ localhost:5173 │  │   :5432 (interne)  │   │
│  │  (hôte)     │  │                │  │   :5432 ◄──────────┼───│── DBeaver
│  └─────────────┘  │  :3001 ◄───────┼──│ localhost:3001     │   │
│                   │  (hôte)        │  │                    │   │
│                   └────────────────┘  └────────────────────┘   │
│                                                                  │
│  Réseau Docker : net-dev (bridge)                               │
│  Nommage DNS interne : frontend, backend, database              │
└─────────────────────────────────────────────────────────────────┘
```

| Service | Port Conteneur | Port Hôte Exposé | URL d'Accès |
|---------|---------------|------------------|-------------|
| Frontend (Vite) | 5173 | 5173 | `http://localhost:5173` |
| Backend (Express) | 3000 | 3001 | `http://localhost:3001/api/v1/` |
| PostgreSQL | 5432 | 5432 | `postgresql://user:dev_secret_password@localhost:5432/notimatic_dev` |

> **Note** : Le backend est exposé sur le port `3001` côté hôte pour éviter le conflit avec Obsidian (qui utilise `3000`).

### 2.2 Production (Docker Swarm)

```
                            INTERNET
                               │
                    ┌──────────▼──────────┐
                    │    Load Balancer     │  (optionnel : Cloudflare CDN)
                    │    IP Publique       │
                    └──────────┬──────────┘
                               │ :80 → :443
                    ┌──────────▼──────────┐
                    │   Traefik v2.10     │
                    │   net-public        │
                    │   :80, :443          │
                    └──────┬──────┬───────┘
                           │      │
              ┌────────────▼──┐  ┌▼───────────────────┐
              │  net-front    │  │  net-api            │
              │  (internal)   │  │  (internal)         │
              │               │  │                     │
              │  ┌──────────┐ │  │ ┌─────────────────┐│
              │  │ Frontend │ │  │ │ Backend (×3)    ││
              │  │ nginx    │ │  │ │ UID 65532       ││
              │  │ ×2 rep.  │ │  │ │ read_only       ││
              │  └──────────┘ │  │ └────────┬────────┘│
              └───────────────┘  └──────────│─────────┘
                                            │ net-data (chiffré)
                                 ┌──────────▼────────────┐
                                 │  PostgreSQL 15         │
                                 │  net-data (internal)   │
                                 │  Volume : db-data      │
                                 └───────────────────────┘
```

| Réseau Docker | Sous-réseau | Services | Chiffrement |
|---------------|-------------|---------|-------------|
| `net-public` | overlay auto | Traefik + monde externe | TLS 1.3 |
| `net-front` | overlay auto (internal) | Traefik ↔ Frontend | Overlay non chiffré |
| `net-api` | overlay auto (internal) | Traefik ↔ Backend | Overlay non chiffré |
| `net-data` | overlay auto (internal, encrypted) | Backend ↔ PostgreSQL | AES-256 overlay |

**DNS Interne Docker Swarm** :

| Service | FQDN Interne | Résolution |
|---------|-------------|-----------|
| Frontend | `frontend` | IPs des replicas (round-robin) |
| Backend | `backend` | IPs des 3 replicas (round-robin) |
| PostgreSQL | `database` | IP unique (contrainte `node.role == manager`) |

**Domaines de Production** :

| Service | Domaine Public |
|---------|---------------|
| Frontend | `https://notimatic.com` |
| Backend API | `https://api.notimatic.com` |
| Traefik Dashboard | Désactivé en production |

---

## 3. Fichiers de Configuration Commentés

### 3.1 Variables d'Environnement

**Fichier** : `backend/.env` (jamais commité, listé dans `.gitignore`)

```bash
# =============================================================================
# NOTIMATIC Backend — Variables d'Environnement
# =============================================================================

# --- Serveur ---
PORT=3000
NODE_ENV=development       # 'development' | 'test' | 'production'

# --- Base de données PostgreSQL ---
DB_HOST=database           # Nom du service Docker (résolution DNS interne)
DB_PORT=5432
DB_USER=user
DB_PASSWORD=dev_secret_password   # ⚠️ Remplacer par Docker Secrets en prod
DB_NAME=notimatic_dev

# --- Sécurité JWT ---
# Générer avec : openssl rand -hex 32
JWT_SECRET=dev_jwt_secret_change_me_in_production
REFRESH_TOKEN_SECRET=dev_refresh_secret_change_me

# --- CORS ---
# Origines autorisées, séparées par virgule
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
# En production : CORS_ORIGINS=https://notimatic.com
```

**Fichier** : `backend/.env.test` (pour les tests Jest avec BDD de test)

```bash
NODE_ENV=test
DB_HOST=localhost
DB_USER=user
DB_PASSWORD=test_password
DB_NAME=notimatic_test
JWT_SECRET=test_jwt_secret
REFRESH_TOKEN_SECRET=test_refresh_secret
```

---

### 3.2 Docker Compose — Développement

**Fichier** : `infrastructure/docker-compose.dev.yml`

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ../frontend
      dockerfile: ../infrastructure/Dockerfile.frontend
      target: builder           # ← Stage builder (avec node installé pour hot-reload)
    command: npm run dev         # ← Vite dev server avec HMR
    volumes:
      - ../frontend:/app         # ← Montage live du code source
      - /app/node_modules        # ← Anonymous volume pour éviter d'écraser node_modules
    ports:
      - "5173:5173"              # ← Accessible directement depuis l'hôte
    networks:
      - net-dev

  backend:
    build:
      context: ../backend
      dockerfile: ../infrastructure/Dockerfile.backend
      target: builder           # ← Stage builder (avec ts-node-dev)
    command: npm run start:dev   # ← ts-node-dev avec auto-reload sur changements TS
    volumes:
      - ../backend:/app          # ← Hot-reload du code backend
      - /app/node_modules
    ports:
      - "3001:3000"              # ← 3001 côté hôte (évite conflit avec Obsidian:3000)
    environment:
      - DB_HOST=database         # ← DNS Docker interne
      - DB_PASSWORD=dev_secret_password
    networks:
      - net-dev

  database:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=dev_secret_password
      - POSTGRES_DB=notimatic_dev
    ports:
      - "5432:5432"              # ← Exposé pour DBeaver/pgAdmin en dev
    volumes:
      - ../backend/init.sql:/docker-entrypoint-initdb.d/init.sql  # ← Init auto
    networks:
      - net-dev

networks:
  net-dev:                       # ← Réseau bridge standard (pas d'isolation prod)
```

---

### 3.3 Docker Compose — Production

**Fichier** : `infrastructure/docker-compose.prod.yml` (extraits annotés)

```yaml
version: '3.8'

services:
  proxy:
    image: traefik:v2.10
    ports:
      - "80:80"    # Redirigé vers :443
      - "443:443"  # TLS terminé ici
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"  # ← Lecture seule (sécurité)
      - "./config/traefik:/etc/traefik"                  # ← Fichiers de config Traefik
      - "traefik-certificates:/letsencrypt"              # ← Volume pour acme.json
    security_opt:
      - no-new-privileges:true   # ← Empêche escalade de privilèges
    networks:
      - net-public
      - net-front
      - net-api

  frontend:
    build:
      context: ../frontend
      dockerfile: ../infrastructure/Dockerfile.frontend
    read_only: true              # ← Filesystem immuable
    tmpfs:
      - /var/cache/nginx         # ← nginx a besoin d'écrire ici → tmpfs RAM
      - /var/run
    deploy:
      replicas: 2                # ← Haute disponibilité
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.front.rule=Host(`notimatic.com`)"
        - "traefik.http.routers.front.tls.certresolver=myresolver"
        - "traefik.http.routers.front.middlewares=sec-headers"  # ← Headers sécurité
    networks:
      - net-front

  backend:
    secrets:
      - db_password              # ← Docker Secret (fichier dans /run/secrets/)
      - jwt_secret               # ← Jamais en variable d'environnement claire
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db_password  # ← Lecture du secret depuis fichier
      - NODE_ENV=production
    read_only: true
    user: "65532"                # ← Non-root (UID Distroless nonroot)
    deploy:
      replicas: 3                # ← Load balancing sur 3 instances
      labels:
        - "traefik.http.routers.api.middlewares=rate-limit,sec-headers"
    networks:
      - net-api
      - net-data

  database:
    image: postgres:15-alpine
    networks:
      - net-data                 # ← Réseau interne uniquement
    secrets:
      - db_password
    volumes:
      - db-data:/var/lib/postgresql/data  # ← Persistance des données
    deploy:
      placement:
        constraints:
          - node.role == manager # ← Fixé sur le manager Swarm (persistance)

secrets:
  db_password:
    external: true               # ← Doit être créé avant le déploiement
  jwt_secret:
    external: true

networks:
  net-data:
    driver: overlay
    driver_opts:
      encrypted: "true"          # ← Chiffrement AES-256 du traffic BDD ↔ backend
```

---

### 3.4 Traefik — Configuration Statique

**Fichier** : `infrastructure/config/traefik/traefik.yml`

```yaml
global:
  checkNewVersion: false         # ← Pas de telemetry
  sendAnonymousUsage: false      # ← Pas de données envoyées à Traefik

log:
  level: INFO
  format: json                   # ← JSON pour faciliter l'intégration SIEM

api:
  dashboard: false               # ← Dashboard désactivé en production

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false      # ← Les services ne sont exposés que si label 'traefik.enable=true'
    swarmMode: true
  file:
    filename: /etc/traefik/dynamic_conf.yml
    watch: true                  # ← Rechargement sans redémarrage

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure           # ← Redirection automatique HTTP → HTTPS
          scheme: https
  websecure:
    address: ":443"
    http:
      tls:
        certResolver: myresolver
        domains:
          - main: "notimatic.com"
            sans:
              - "*.notimatic.com"  # ← Wildcard pour api.notimatic.com

certificatesResolvers:
  myresolver:
    acme:
      email: security@notimatic.com
      storage: /letsencrypt/acme.json  # ← Certificats persistés dans un volume
      httpChallenge:
        entryPoint: web
```

---

### 3.5 Traefik — Configuration Dynamique

**Fichier** : `infrastructure/config/traefik/dynamic_conf.yml`

```yaml
http:
  middlewares:
    # Rate Limiting global (protection DoS)
    rate-limit:
      rateLimit:
        average: 100             # ← 100 req/s en moyenne
        burst: 50                # ← Tolérance burst de 50 req supplémentaires
        period: 1s

    # Security Headers (appliqués à toutes les routes)
    sec-headers:
      headers:
        frameDeny: true                     # ← X-Frame-Options: DENY
        sslRedirect: true                   # ← Force HTTPS
        browserXssFilter: true             # ← X-XSS-Protection: 1; mode=block
        contentTypeNosniff: true           # ← X-Content-Type-Options: nosniff
        stsIncludeSubdomains: true         # ← HSTS incluant sous-domaines
        stsPreload: true                   # ← Éligibilité au preload HSTS
        stsSeconds: 31536000               # ← HSTS max-age: 1 an
        customFrameOptionsValue: SAMEORIGIN
        contentSecurityPolicy: "default-src 'self'; script-src 'self'; object-src 'none'"

tls:
  options:
    default:
      minVersion: VersionTLS13             # ← TLS 1.3 minimum
      cipherSuites:                        # ← Suites recommandées TLS 1.3
        - TLS_AES_128_GCM_SHA256
        - TLS_AES_256_GCM_SHA384
        - TLS_CHACHA20_POLY1305_SHA256
      curvePreferences:
        - CurveP521
        - CurveP384
      sniStrict: true                      # ← Rejette les connexions sans SNI correct
```

---

### 3.6 Nginx (Frontend)

**Fichier** : `frontend/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Cache des assets statiques (hash dans le nom de fichier par Vite)
    location ~* \.(js|css|png|jpg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback : toutes les routes → index.html (Vue Router history mode)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Ne pas servir les fichiers cachés
    location ~ /\. {
        deny all;
    }
}
```

---

### 3.7 TypeScript — Backend

**Fichier** : `backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,              // ← Strict mode : strictNullChecks, noImplicitAny, etc.
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

### 3.8 ESLint — Backend

**Fichier** : `backend/eslint.config.js` (ESLint 9 — flat config)

```javascript
import eslintPluginSecurity from 'eslint-plugin-security';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    plugins: {
      '@typescript-eslint': tsPlugin,
      'security': eslintPluginSecurity,
    },
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      // TypeScript strict
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'error',
      
      // Sécurité
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-buffer-noassert': 'error',
    }
  }
];
```

---

## 4. Erreurs Rencontrées et Résolutions

### 4.1 Erreur : Cookies Non Transmis en Dev (CORS + SameSite)

**Symptôme** : Le frontend (`:5173`) envoyait une requête au backend (`:3001`), mais les cookies `auth_token` et `refresh_token` n'étaient pas transmis, causant des erreurs `401 Unauthorized` en boucle.

**Cause** : Les cookies avec `sameSite: 'none'` nécessitent `secure: true` (HTTPS), et les cookies avec `sameSite: 'strict'` ne sont pas transmis en cross-origin. En développement, les origines `:5173` et `:3001` sont différentes.

**Résolution** :
```typescript
// middleware.ts — cookie adapté selon l'environnement
const isProduction = NODE_ENV === 'production';
res.cookie('auth_token', token, {
  httpOnly: true,
  secure: isProduction,            // false en dev (HTTP ok)
  sameSite: isProduction ? 'none' : 'lax',  // 'lax' permet les requêtes same-site en dev
});
```

Et côté CORS :
```typescript
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true   // ← Essentiel pour les cookies cross-origin
}));
```

---

### 4.2 Erreur : Argon2 Compilation Échouée dans Docker

**Symptôme** : `npm install` dans l'image Docker échouait avec `node-pre-gyp: ENOENT` ou `binding.gyp` non trouvé.

**Cause** : `argon2` est une dépendance native (C++) qui doit être compilée. L'image `node:18-alpine` manquait des outils de compilation (`python3`, `make`, `g++`).

**Résolution** :
```dockerfile
# Dockerfile.backend — Stage builder
FROM node:18-bullseye AS builder
# Bullseye inclut python3, make, g++ par défaut
RUN apt-get update && apt-get install -y python3 make g++
# Force la compilation depuis les sources (pas de binaire précompilé)
RUN npm install --build-from-source=argon2
```

Alternative si Alpine est impératif :
```dockerfile
FROM node:18-alpine AS builder
RUN apk add --no-cache python3 make g++
```

---

### 4.3 Erreur : Migration Non Appliquée — Table Sessions Manquante

**Symptôme** : Erreur `relation "sessions" does not exist` au démarrage du backend après ajout de la migration `008_add_sessions.sql`.

**Cause** : Le script `migrate.sh` échouait silencieusement sur des migrations déjà appliquées (erreur `already exists`), puis s'arrêtait sans appliquer les suivantes.

**Résolution** : Toutes les migrations utilisent `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, et `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` pour être idempotentes :

```sql
-- Exemple idempotent
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    ...
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
```

Le script CI dans `.github/workflows/ci.yml` gère l'échec non bloquant :
```bash
bash backend/migrate.sh || echo "Migration script returned non-zero (check logs)"
```

---

### 4.4 Erreur : Workflow CI Cassé (PR #18)

**Symptôme** : Le workflow GitHub Actions échouait sur tous les jobs avec des erreurs de permissions et de chemins incorrects.

**Causes identifiées** :
1. Permissions `contents: write` sur `security-events` manquantes pour Trivy
2. Chemin `Docker_SecByDesign/infrastructure/docker-compose.yml` incorrect dans le job e2e
3. Coverage threshold utilisant un fichier JSON inexistant (`coverage-final.json` vs `coverage-summary.json`)

**Résolutions** :
```yaml
# Permissions explicites ajoutées
permissions:
  contents: read
  security-events: write
  actions: read
```

```bash
# Threshold corrigé dans CI
node -e "const fs=require('fs');
  const p='coverage/coverage-final.json';
  if(!fs.existsSync(p)){console.error('coverage file missing');process.exit(1);}
  const c=JSON.parse(fs.readFileSync(p));
  const lines=(c.total&&c.total.lines&&c.total.lines.pct)||0;
  if(lines<80){process.exit(1);}
  console.log('OK:',lines);"
```

---

### 4.5 Erreur : ESLint Flat Config Incompatible

**Symptôme** : `npm run lint` échouait avec `TypeError: Key "plugins": Key "@typescript-eslint": Expected an object`.

**Cause** : ESLint 9 utilise le nouveau format "flat config" (`eslint.config.js`) incompatible avec l'ancien format `.eslintrc.json`.

**Résolution** : Migration vers le format flat config :
```javascript
// ❌ Ancien format (.eslintrc.json)
{ "plugins": ["@typescript-eslint"], "rules": {} }

// ✅ Nouveau format (eslint.config.js)
import tsPlugin from '@typescript-eslint/eslint-plugin';
export default [{ plugins: { '@typescript-eslint': tsPlugin }, rules: {} }];
```

---

## 5. Procédures Opérationnelles

### 5.1 Démarrage Environnement de Développement

```bash
# 1. Cloner le dépôt
git clone https://github.com/elmaquito/NOTIMATIC.git
cd NOTIMATIC

# 2. Créer les fichiers .env
cp backend/.env.example backend/.env    # Adapter les valeurs si nécessaire

# 3. Démarrer les services avec Docker Compose
docker compose -f infrastructure/docker-compose.dev.yml up --build

# Services disponibles :
# - Frontend : http://localhost:5173
# - Backend  : http://localhost:3001/api/v1/health
# - PostgreSQL : localhost:5432

# 4. Appliquer les migrations (si BDD fraîche)
# Les migrations sont appliquées automatiquement via init.sql au premier démarrage
# Pour les migrations post-init :
docker compose -f infrastructure/docker-compose.dev.yml exec backend bash migrate.sh
```

---

### 5.2 Migrations Base de Données

```bash
# Script de migration (backend/migrate.sh)
# Applique séquentiellement toutes les migrations non encore appliquées

cd backend
bash migrate.sh

# Ou manuellement pour une migration spécifique
psql -h localhost -U user -d notimatic_dev -f migrations/008_add_sessions.sql

# Vérifier l'état des tables
psql -h localhost -U user -d notimatic_dev -c "\dt"
```

---

### 5.3 Déploiement Production

```bash
# 1. Initialiser Docker Swarm (une seule fois)
docker swarm init

# 2. Créer les secrets Docker
openssl rand -hex 32 | docker secret create jwt_secret -
openssl rand -hex 32 | docker secret create refresh_secret -
printf "my_strong_db_password_here" | docker secret create db_password -

# 3. Vérifier les secrets créés
docker secret ls

# 4. Déployer la stack
docker stack deploy \
  -c infrastructure/docker-compose.prod.yml \
  notimatic

# 5. Vérifier l'état des services
docker stack services notimatic
docker service ps notimatic_backend

# 6. Voir les logs
docker service logs -f notimatic_backend

# 7. Mise à jour sans downtime (rolling update)
docker service update --image notimatic-backend:new-version notimatic_backend
```

---

### 5.4 Exécution des Tests

```bash
# Tests unitaires + intégration Backend (avec BDD de test)
cd backend
npm test                         # Jest (run once)
npm run test:watch               # Jest (watch mode)
npm run test:coverage            # Jest + rapport coverage HTML

# Tests Frontend
cd frontend
npm test                         # Vitest (run once)

# Lint
cd backend && npm run lint       # ESLint + security plugin
cd frontend && npm run lint      # (stub pour l'instant — ESLint non configuré)

# Scan sécurité local
npm audit --audit-level=critical  # Dans backend/ et frontend/

# Pipeline CI complet (simulation locale)
# Requis : act (https://github.com/nektos/act)
act push
```

---

## Annexe A — Arborescence du Projet

```
NOTIMATIC/
├── README.md
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml                     # Pipeline CI/CD GitHub Actions
│
├── backend/
│   ├── src/
│   │   ├── main.ts                    # Point d'entrée Express
│   │   ├── config/
│   │   │   ├── env.ts                 # Variables d'environnement
│   │   │   └── database.ts            # Pool PostgreSQL
│   │   ├── common/
│   │   │   └── middleware.ts          # authenticate, authorize, sanitize, rate limit
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.schema.ts
│   │   │   └── token.service.ts       # JWT + refresh tokens
│   │   ├── users/
│   │   │   ├── user.routes.ts         # /users, /users/me, /users/:id/profile
│   │   │   └── user.controller.ts
│   │   ├── notes/
│   │   │   ├── notes.routes.ts
│   │   │   └── notes.controller.ts
│   │   ├── tags/
│   │   ├── feed/
│   │   ├── metadata/
│   │   └── categories/
│   ├── migrations/
│   │   ├── 001_add_profiles.sql
│   │   ├── 002_add_themes_categories.sql
│   │   ├── ...
│   │   └── 009_add_user_tags.sql
│   ├── init.sql                       # Schéma initial (users, notes, comments)
│   ├── migrate.sh                     # Script de migration
│   ├── package.json
│   ├── tsconfig.json
│   └── eslint.config.js
│
├── frontend/
│   ├── src/
│   │   ├── main.ts                    # Point d'entrée Vue 3
│   │   ├── App.vue
│   │   ├── router/
│   │   │   └── index.ts               # Vue Router 5 + navigation guards
│   │   ├── stores/                    # Pinia stores
│   │   │   ├── auth.ts
│   │   │   ├── note.ts
│   │   │   ├── feed.ts
│   │   │   ├── tag.ts
│   │   │   └── user.ts
│   │   ├── components/
│   │   │   ├── Login.vue
│   │   │   ├── Dashboard.vue
│   │   │   ├── Feed.vue
│   │   │   ├── NoteCard.vue
│   │   │   ├── CreateNoteModal.vue
│   │   │   ├── ForgotPassword.vue
│   │   │   └── ResetPassword.vue
│   │   └── utils/
│   │       └── sanitize.ts            # DOMPurify wrapper
│   ├── nginx.conf                     # Config nginx pour SPA
│   ├── vite.config.ts
│   └── package.json
│
├── infrastructure/
│   ├── Dockerfile.backend             # Multi-stage : builder + Distroless runner
│   ├── Dockerfile.frontend            # Multi-stage : builder + nginx:alpine-slim
│   ├── docker-compose.dev.yml         # Développement local
│   ├── docker-compose.prod.yml        # Production Docker Swarm
│   ├── docker-compose.test.yml        # Tests intégration CI
│   └── config/
│       └── traefik/
│           ├── traefik.yml            # Config statique Traefik
│           └── dynamic_conf.yml       # Middlewares, TLS options
│
└── docs/
    ├── ARCHITECTURE.md
    ├── ROADMAP.md
    ├── RELEASE_NOTES.md
    ├── API.md
    ├── GDPR.md
    ├── SECURITY.md
    ├── USER_GUIDE.md
    ├── wireframes.md
    └── dossier-projet/
        ├── 1_DESCRIPTIF_PROJET.md     # Ce document
        ├── 2_ARCHITECTURE_SECURITE.md
        └── 3_IMPLEMENTATION_TECHNIQUE.md
```

---

## Annexe B — Versions des Dépendances Critiques

| Package | Version | Rôle | Justification |
|---------|---------|------|--------------|
| `express` | `^4.18.2` | Framework HTTP | Stable, large écosystème |
| `helmet` | `^7.0.0` | Security headers | Standard de l'industrie |
| `cors` | `^2.8.5` | CORS strict | Contrôle des origines |
| `express-rate-limit` | `^8.3.1` | Rate limiting | Anti brute-force/DoS |
| `argon2` | `^0.44.0` | Hachage mots de passe | OWASP recommandé |
| `jsonwebtoken` | `^9.0.0` | JWT signing/verification | Standard JWT |
| `pg` | `^8.11.0` | PostgreSQL client | Requêtes paramétrées |
| `zod` | `^3.21.4` | Validation schémas | TypeScript natif |
| `validator` | `^13.15.26` | Sanitization inputs | `escape()` anti-XSS |
| `dompurify` | `^3.3.1` | Sanitization HTML | XSS frontend |
| `vue` | `^3.3.4` | Framework frontend | Composition API |
| `pinia` | `^3.0.4` | State management | Store officiel Vue 3 |
| `vue-router` | `^5.0.3` | Routeur SPA | Guards navigation |
| `vitest` | `^4.0.18` | Tests frontend | Intégré Vite |
| `jest` | `^29.7.0` | Tests backend | Framework test Node |
| `eslint-plugin-security` | `^3.0.1` | Lint sécurité | Détection patterns dangereux |

---

## Annexe C — Variables d'Environnement Complètes

| Variable | Défaut Dev | Prod | Description |
|----------|-----------|------|-------------|
| `PORT` | `3000` | `3000` | Port interne Express |
| `NODE_ENV` | `development` | `production` | Environnement d'exécution |
| `DB_HOST` | `database` | `database` | DNS Docker service PostgreSQL |
| `DB_PORT` | `5432` | `5432` | Port PostgreSQL |
| `DB_USER` | `user` | `notimatic_user` | Utilisateur PostgreSQL |
| `DB_PASSWORD` | `dev_secret_password` | Via Docker Secret | Mot de passe BDD |
| `DB_NAME` | `notimatic_dev` | `notimatic_db` | Nom de la base |
| `JWT_SECRET` | `dev_jwt_secret...` | Généré `openssl rand -hex 32` | HMAC-SHA256 JWT |
| `REFRESH_TOKEN_SECRET` | `dev_refresh...` | Généré `openssl rand -hex 32` | Contexte refresh tokens |
| `CORS_ORIGINS` | `http://localhost:5173` | `https://notimatic.com` | Origines CORS autorisées |

> ⚠️ En production, `DB_PASSWORD` et `JWT_SECRET` ne doivent **jamais** être définies dans des variables d'environnement en clair. Utiliser **Docker Secrets** (`docker secret create`) ou un gestionnaire de secrets (HashiCorp Vault, AWS Secrets Manager).

---

**Auteur** : elmaquito (révision par GitHub Copilot Agent)  
**Dépôt** : https://github.com/elmaquito/NOTIMATIC  
**Date** : 1er avril 2026

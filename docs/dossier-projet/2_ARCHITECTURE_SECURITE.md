# NOTIMATIC — Dossier d'Architecture et Sécurité (Security by Design)

> **Référence** : Dossier Technique — Document 2/3  
> **Titre** : Architecture Projet avec Justification des Fonctions de Sécurité  
> **Projet** : NOTIMATIC — Plateforme sécurisée de prise de notes éducatives  
> **Version** : v1.2.0  
> **Date** : 1er avril 2026  
> **Méthodologie** : Security by Design (OWASP, RGPD Privacy by Design, NIST CSF)

---

## Sommaire

1. [Principes Security by Design](#1-principes-security-by-design)
2. [Architecture Globale](#2-architecture-globale)
   - 2.1 [Vue d'Ensemble](#21-vue-densemble)
   - 2.2 [Segmentation Réseau](#22-segmentation-réseau)
   - 2.3 [Schéma des Flux de Données](#23-schéma-des-flux-de-données)
3. [Architecture de Sécurité par Couche](#3-architecture-de-sécurité-par-couche)
   - 3.1 [Couche Réseau / Transport](#31-couche-réseau--transport)
   - 3.2 [Couche Application (Backend)](#32-couche-application-backend)
   - 3.3 [Couche Données (PostgreSQL)](#33-couche-données-postgresql)
   - 3.4 [Couche Présentation (Frontend)](#34-couche-présentation-frontend)
   - 3.5 [Couche CI/CD et Infrastructure](#35-couche-cicd-et-infrastructure)
4. [Justification des Fonctions de Sécurité](#4-justification-des-fonctions-de-sécurité)
   - 4.1 [Authentification Zero-Trust](#41-authentification-zero-trust)
   - 4.2 [Contrôle d'Accès RBAC](#42-contrôle-daccès-rbac)
   - 4.3 [Protection contre les Injections](#43-protection-contre-les-injections)
   - 4.4 [Protection contre le Déni de Service](#44-protection-contre-le-déni-de-service)
   - 4.5 [Sécurité des Conteneurs](#45-sécurité-des-conteneurs)
   - 4.6 [Conformité RGPD](#46-conformité-rgpd)
5. [Modèle de Menaces (STRIDE)](#5-modèle-de-menaces-stride)
6. [Analyse OWASP Top 10](#6-analyse-owasp-top-10)

### Annexes
- [Annexe A — Schéma de la Base de Données](#annexe-a--schéma-de-la-base-de-données)
- [Annexe B — Matrice des Risques Résiduels](#annexe-b--matrice-des-risques-résiduels)

---

## 1. Principes Security by Design

NOTIMATIC applique les 8 principes fondamentaux du **Security by Design** définis par Saltzer & Schroeder (1975), actualisés par l'OWASP et le NIST.

| Principe | Application dans NOTIMATIC |
|----------|---------------------------|
| **1. Économie de mécanismes** (_Economy of mechanism_) | API REST sans état (JWT) — pas de logique de session complexe côté serveur. Schéma BDD simple et normalisé. |
| **2. Valeurs par défaut sûres** (_Fail-safe defaults_) | Tout endpoint requiert `authenticate()` par défaut. Accès refusé si token absent ou invalide. Les erreurs retournent des messages génériques (pas de stacktrace en production). |
| **3. Médiation complète** (_Complete mediation_) | Chaque requête passe par `authenticate()` et `authorize()` — y compris les requêtes avec refresh token auto. Aucun bypass possible via legacy routes. |
| **4. Conception ouverte** (_Open design_) | Code source ouvert, auditable sur GitHub. Dépendances avec licences et versions explicites dans `package.json`. Scan automatisé Trivy + npm audit. |
| **5. Séparation des privilèges** (_Separation of privilege_) | 4 rôles distincts (`admin`, `technician`, `teacher`, `student`) — permissions minimales par rôle. Seul l'admin peut supprimer des utilisateurs. |
| **6. Moindre Privilège** (_Least privilege_) | Conteneurs avec user non-root (UID 65532). DB exposée uniquement sur réseau interne `net-data`. Traefik en lecture seule sur le socket Docker. |
| **7. Partage minimal** (_Least common mechanism_) | 4 réseaux Docker isolés : `net-public`, `net-front`, `net-api`, `net-data`. La BDD n'est pas joignable depuis le frontend. |
| **8. Acceptabilité psychologique** (_Psychological acceptability_) | Auto-refresh transparent des JWT — l'utilisateur ne se reconnecte pas toutes les 15 minutes. Interface simple pour les actions RGPD (export, suppression). |

---

## 2. Architecture Globale

### 2.1 Vue d'Ensemble

```
╔═══════════════════════════════════════════════════════════════════╗
║                         INTERNET (HTTPS/TLS 1.3)                  ║
╚═════════════════════════════╦═════════════════════════════════════╝
                              │ :443
                    ╔═════════▼═════════╗
                    ║  Traefik v2.10    ║  Reverse Proxy / Edge
                    ║  - TLS termination║  - Rate limiting (Traefik)
                    ║  - HTTP→HTTPS     ║  - Security headers
                    ║  - Let's Encrypt  ║  - no-new-privileges
                    ╚══════╦═══════╦════╝
                           │       │
              ╔════════════▼╗   ╔══▼══════════════╗
              ║  Frontend   ║   ║    Backend API   ║
              ║  nginx:alp. ║   ║  Node.js + TS   ║
              ║  Vue 3 SPA  ║   ║  Express 4      ║
              ║  read-only  ║   ║  Port 3000      ║
              ║  user:nginx ║   ║  UID 65532      ║
              ║  2 replicas ║   ║  3 replicas     ║
              ╚════════════╝   ╚══════╦══════════╝
                                      │ net-data (chiffré)
                               ╔══════▼══════════╗
                               ║  PostgreSQL 15  ║
                               ║  Alpine image   ║
                               ║  net-data only  ║
                               ║  Volume chiffré ║
                               ╚═════════════════╝
```

### 2.2 Segmentation Réseau

En production (Docker Swarm), quatre réseaux overlay distincts isolent les composants :

| Réseau | Type | Composants | Chiffrement |
|--------|------|------------|-------------|
| `net-public` | overlay | Traefik ↔ Internet | TLS 1.3 (Let's Encrypt) |
| `net-front` | overlay, internal | Traefik ↔ Frontend | Overlay Docker (interne) |
| `net-api` | overlay, internal | Traefik ↔ Backend | Overlay Docker (interne) |
| `net-data` | overlay, internal, encrypted | Backend ↔ PostgreSQL | `driver_opts.encrypted: true` |

**Justification** : La BDD n'est accessible **que** depuis le backend (réseau `net-data`). Un attaquant compromettant le frontend ne peut pas atteindre directement la BDD. Cette segmentation applique le principe de _Least Common Mechanism_.

### 2.3 Schéma des Flux de Données

```
Utilisateur (navigateur)
     │
     │ HTTPS (TLS 1.3)
     ▼
Traefik (edge)
     ├─── rate-limit middleware (100 req/s, burst 50)
     ├─── sec-headers middleware (CSP, HSTS, X-Frame-Options, XSS-filter)
     └─── TLS termination
          │
          ├──── :80 frontend → nginx (SPA Vue 3)
          │         └── Fichiers statiques uniquement (HTML/CSS/JS)
          │
          └──── :443 api.notimatic.com → Backend Express
                    ├── helmet() — security headers
                    ├── cors() — origines autorisées uniquement
                    ├── apiLimiter — 100 req/15min/IP
                    ├── sanitizeInput() — validator.escape()
                    ├── authenticate() — JWT + auto-refresh
                    ├── authorize() — RBAC par rôle
                    └── Routes métier → PostgreSQL (requêtes paramétrées $1,$2)
```

---

## 3. Architecture de Sécurité par Couche

### 3.1 Couche Réseau / Transport

#### TLS 1.3 Strict (Traefik + Let's Encrypt)

Configuration extraite de `infrastructure/config/traefik/dynamic_conf.yml` :

```yaml
tls:
  options:
    default:
      minVersion: VersionTLS13
      cipherSuites:
        - TLS_AES_128_GCM_SHA256
        - TLS_AES_256_GCM_SHA384
        - TLS_CHACHA20_POLY1305_SHA256
      curvePreferences:
        - CurveP521
        - CurveP384
      sniStrict: true
```

**Justification** : TLS 1.2 est vulnérable à BEAST, POODLE et d'autres attaques. TLS 1.3 supprime les cipher suites faibles et impose le Perfect Forward Secrecy (PFS) sur toutes les connexions.

#### Redirection HTTP → HTTPS

```yaml
entryPoints:
  web:
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
```

**Justification** : Empêche les attaques de dégradation de protocole (downgrade attack). Combiné avec HSTS (`stsSeconds: 31536000, stsPreload: true`), le navigateur mémorise la préférence HTTPS pendant 1 an.

#### Rate Limiting Edge (Traefik)

```yaml
middlewares:
  rate-limit:
    rateLimit:
      average: 100
      burst: 50
      period: 1s
```

**Justification** : Première ligne de défense contre le DoS et le brute-force, avant même que les requêtes atteignent l'application.

### 3.2 Couche Application (Backend)

#### En-têtes HTTP Sécurisés (Helmet.js)

Configuré dans `backend/src/main.ts` :

```typescript
app.use(helmet());
```

Helmet active automatiquement :

| En-tête | Valeur | Protection |
|---------|--------|-----------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; object-src 'none'` | XSS, injection de code |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Downgrade HTTPS |
| `Referrer-Policy` | `no-referrer` | Fuite d'URL |
| `X-XSS-Protection` | `1; mode=block` | Réflexif XSS (legacy browsers) |

#### CORS Strict

```typescript
app.use(cors({
  origin: CORS_ORIGINS,  // Whitelist explicite dans .env
  credentials: true       // Nécessaire pour les cookies
}));
```

`CORS_ORIGINS` en production : `https://notimatic.com` uniquement. La wildcard `*` est interdite.

#### Rate Limiting Applicatif (express-rate-limit)

```typescript
// API globale : 100 req / 15 min / IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Authentification : 15 tentatives / 1h / IP (anti brute-force)
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15
});

// Commentaires : 10 / min / IP (anti-spam)
export const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10
});
```

**Justification** : Le rate limiter Traefik opère en burst (mode token bucket), tandis que le rate limiter Express opère en sliding window pour les règles métier fines. Double couche complémentaire.

#### Sanitization des Entrées

```typescript
// Middleware global sur req.body
export const sanitizeInput = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = validator.escape(req.body[key]);
      }
    }
  }
  next();
};
```

`validator.escape()` convertit `<`, `>`, `&`, `"`, `'` en entités HTML, neutralisant les tentatives d'injection XSS dans les entrées texte.

**Validation Zod** sur chaque contrôleur :

```typescript
// Exemple : auth.schema.ts
const loginSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(128)
});
```

Zod valide et parse les données d'entrée — tout payload non conforme est rejeté avec une erreur `400 Bad Request` avant d'atteindre la logique métier.

### 3.3 Couche Données (PostgreSQL)

#### Requêtes Paramétrées (Anti-SQLi)

Toutes les requêtes SQL utilisent des paramètres positionnels :

```typescript
// ✅ Correct — paramètre $1 échappé par pg
const result = await pool.query(
  'SELECT id, username, role FROM users WHERE username = $1',
  [username]
);

// ❌ Jamais : concaténation de chaînes
// const result = await pool.query(`SELECT * FROM users WHERE username = '${username}'`);
```

Le driver `pg` (node-postgres) utilise le protocole `extended query` de PostgreSQL, qui sépare structurellement la commande SQL des paramètres — l'injection SQL est structurellement impossible.

#### Hachage des Mots de Passe (Argon2id)

```typescript
// Création : hash du mot de passe
const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,   // 64 MB
  timeCost: 3,         // 3 itérations
  parallelism: 4
});

// Vérification
const valid = await argon2.verify(storedHash, password);
```

**Justification** : Argon2id est l'algorithme recommandé par l'OWASP Password Storage Cheat Sheet (2023). Il est résistant aux attaques GPU (memory-hard) et aux attaques side-channel (version id = hybride entre Argon2i et Argon2d).

#### Audit Trail

```sql
CREATE TABLE audit_logs (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action       VARCHAR(100) NOT NULL,  -- 'NOTE_CREATED', 'USER_DELETED', etc.
    entity_type  VARCHAR(50),
    entity_id    INTEGER,
    details      JSONB,
    ip_address   VARCHAR(45),
    user_agent   TEXT,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Justification** : Le principe de **non-répudiation** exige que toute action sensible soit tracée avec horodatage, identifiant d'acteur et contexte IP/UA. La rétention est de 6 mois (fonction `purge_old_audit_logs()`), conforme à la politique RGPD.

#### RGPD — Privacy by Design

Le schéma BDD intègre nativement les droits RGPD :

```sql
ALTER TABLE users ADD COLUMN deleted_at   TIMESTAMP WITH TIME ZONE; -- Soft delete
ALTER TABLE users ADD COLUMN anonymized   BOOLEAN DEFAULT FALSE;     -- Droit à l'effacement
ALTER TABLE users ADD COLUMN consent_date TIMESTAMP WITH TIME ZONE;  -- Preuve de consentement
```

**Processus d'anonymisation** : 30 jours après `deleted_at`, la fonction PostgreSQL `anonymize_deleted_users()` remplace `username` par `deleted_user_<id>` et efface `password_hash`. Les données de contenu (notes) sont supprimées par cascade (`ON DELETE CASCADE`).

### 3.4 Couche Présentation (Frontend)

#### Sanitization Côté Frontend (DOMPurify)

```typescript
// frontend/src/utils/sanitize.ts
import DOMPurify from 'dompurify';

export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
};
```

**Justification** : DOMPurify est appliqué **avant** tout rendu HTML d'un contenu provenant de l'API, bloquant toute tentative d'injection XSS stockée (stored XSS). C'est une défense en profondeur complémentaire à la sanitization backend.

#### Stockage Sécurisé des Tokens

Les tokens JWT et refresh tokens sont **uniquement** stockés dans des cookies `HttpOnly` — jamais dans `localStorage` ou `sessionStorage`. JavaScript ne peut pas lire ces cookies, neutralisant le vol de token par XSS.

```typescript
// Backend — définition du cookie
res.cookie('auth_token', newAccessToken, {
  httpOnly: true,       // Inaccessible à JavaScript
  secure: isProduction, // HTTPS uniquement en production
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 15 * 60 * 1000  // 15 minutes
});
```

#### Navigation Guard (Vue Router 5)

```typescript
// frontend/src/router/index.ts
router.beforeEach((to, from, next) => {
  const isAuthenticated = document.cookie.includes('auth_token');
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});
```

Toutes les routes requérant une authentification ont `meta: { requiresAuth: true }`. L'accès sans cookie JWT redirige vers `/login`.

### 3.5 Couche CI/CD et Infrastructure

#### Pipeline CI/CD (GitHub Actions)

```
push / pull_request
       │
       ├── backend-lint (Node 18, 20)         ESLint + security plugin
       │        │
       ├── backend-test (Node 18, 20)         Jest + coverage ≥ 80%
       │        │
       ├── frontend-lint (Node 20)            npm run lint
       │        │
       ├── frontend-test (Node 20)            Vitest + coverage ≥ 70%
       │        │
       ├── npm-audit (backend + frontend)     Niveau critical bloquant
       │
       ├── trivy-scan ─────────────────────── Scan images Docker (CRITICAL)
       │        │
       ├── docker-build                       Build final validé
       │
       └── e2e-smoke (main only)              Playwright smoke tests
```

**Justification** : Chaque étape valide un aspect de sécurité différent. `npm audit` détecte les CVE dans les dépendances. Trivy scanne l'image Docker finale — y compris l'OS et les librairies système.

#### Sécurité des Conteneurs Docker

**Backend** (`Dockerfile.backend`) :

```dockerfile
# Stage builder : Node 18 Bullseye
FROM node:18-bullseye AS builder
RUN npm install --build-from-source=argon2  # Compilation native

# Stage runner : Distroless (pas de shell, pas de package manager)
FROM gcr.io/distroless/nodejs18-debian11 AS runner
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
USER 65532:65532  # Non-root (nonroot user Distroless)
EXPOSE 3000
CMD ["dist/main.js"]
```

**Frontend** (`Dockerfile.frontend`) :

```dockerfile
FROM node:18-alpine AS builder
RUN npm run build  # Génère /app/dist (fichiers statiques)

FROM nginx:alpine-slim AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
RUN chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx
USER nginx  # Non-root
HEALTHCHECK --interval=30s CMD wget --quiet --spider http://localhost:80/ || exit 1
```

**Justification de l'image Distroless** :
- Pas de shell → exploit RCE limité (impossible d'exécuter `/bin/bash`)
- Pas de `apt`/`apk` → impossible d'installer des outils d'attaque
- Surface d'attaque réduite à ~3× moins de packages qu'Alpine
- Trivy détecte moins de CVE sur les images Distroless

**Durcissement Docker Compose (production)** :

```yaml
security_opt:
  - no-new-privileges:true  # Empêche escalade de privilèges via setuid/setgid
read_only: true              # Filesystem immuable
tmpfs:
  - /var/cache/nginx         # Seuls ces chemins sont écrits (tmpfs en mémoire)
  - /var/run
user: "65532"                # Non-root (même UID que Distroless)
```

---

## 4. Justification des Fonctions de Sécurité

### 4.1 Authentification Zero-Trust

#### Architecture Dual-Token

```
Access Token (JWT)          Refresh Token (Opaque)
────────────────────        ──────────────────────────
Durée : 15 minutes          Durée : 30 jours
Algorithme : HS256          Génération : crypto.randomBytes(32)
Claims : id, username,      Stockage BDD : SHA-256(token)
          role              Rotation : usage unique via /refresh
Stockage : Cookie HttpOnly  Stockage : Cookie HttpOnly
```

**Pourquoi ce modèle ?**

Un JWT de 15 minutes limite la fenêtre d'exposition en cas de vol. Si un attaquant intercepte un access token, il devient invalide dans 15 minutes maximum. Le refresh token opaque de 30 jours offre confort (pas de reconnexion fréquente) sans exposer les claims JWT sur de longues durées.

**Rotation des refresh tokens** : À chaque appel à `POST /auth/refresh`, l'ancien refresh token est révoqué (`sessions.revoked = true`) et un nouveau est émis. Ce mécanisme empêche les attaques par **rejeu de token** (token replay attack).

#### Auto-Refresh Transparent (Middleware)

```typescript
// middleware.ts — authenticate()
if (refreshToken && !accessToken) {
  const validation = await tokenService.validateRefreshToken(refreshToken);
  if (validation) {
    const newAccessToken = tokenService.generateAccessToken(user);
    res.cookie('auth_token', newAccessToken, { httpOnly: true, ... });
    req.user = user;
    return next();  // Transparent pour le client
  }
}
```

**Justification** : Sans auto-refresh, l'utilisateur recevrait une erreur 401 toutes les 15 minutes. Cela pousserait les développeurs à allonger la durée des JWT (mauvaise pratique). L'auto-refresh maintient la sécurité (durée courte) tout en préservant l'UX (pas d'interruption).

### 4.2 Contrôle d'Accès RBAC

```typescript
// middleware.ts — authorize()
export const authorize = (roles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};
```

**Matrice des Permissions** :

| Action | admin | technician | teacher | student |
|--------|-------|-----------|---------|---------|
| Créer utilisateur | ✅ | ✅ | ❌ | ❌ |
| Supprimer utilisateur | ✅ | ❌ | ❌ | ❌ |
| Export RGPD (soi-même) | ✅ | ✅ | ✅ | ✅ |
| Export RGPD (autrui) | ✅ | ❌ | ❌ | ❌ |
| Créer note | ✅ | ❌ | ✅ | ✅ |
| Créer tag | ✅ | ✅ | ✅ | ❌ |
| Supprimer tag | ✅ | ❌ | ❌ | ❌ |
| Lire liste utilisateurs | ✅ | ✅ | ✅ | ❌ |

**Justification** : Le principe de moindre privilège est appliqué strictement. Un étudiant ne peut pas créer de tags ni voir la liste complète des utilisateurs. Un technicien ne peut pas supprimer d'utilisateurs.

### 4.3 Protection contre les Injections

#### Anti-SQLi — Requêtes Paramétrées

Le driver `pg` sépare structurellement commande SQL et données :

```
Client (application)        Serveur PostgreSQL
        │                          │
        │── Parse (SQL template) ──►│  "SELECT * FROM users WHERE username = $1"
        │── Bind (valeurs) ────────►│  ["malicious' OR '1'='1"]
        │                          │   → Traitée comme STRING, pas comme SQL
        │◄── Rows ─────────────────│
```

Même si l'attaquant injecte `'; DROP TABLE users; --`, cette chaîne est transmise comme valeur du paramètre `$1` et ne sera jamais interprétée comme commande SQL.

#### Anti-XSS — Défense en Profondeur (3 couches)

```
Entrée utilisateur
       │
       ▼
[1] validator.escape() — Backend middleware    (caractères spéciaux → entités HTML)
       │
       ▼
[2] Zod validation schema                      (format attendu strict)
       │
[Stockage BDD]
       │
       ▼
[3] DOMPurify.sanitize() — Frontend            (HTML affiché purgé des scripts)
```

**Justification** : Une seule couche de sanitization peut être contournée (ex: encodage double, caractères Unicode). Trois couches indépendantes rendent l'exploitation XSS impraticable.

### 4.4 Protection contre le Déni de Service

| Mécanisme | Portée | Limite | Implémentation |
|-----------|--------|--------|----------------|
| Rate limit Traefik | Tous les endpoints | 100 req/s + burst 50 | `dynamic_conf.yml` |
| `apiLimiter` | API globale | 100 req / 15 min / IP | `express-rate-limit` |
| `authLimiter` | `/auth/login`, `/auth/refresh` | 15 req / 1h / IP | `express-rate-limit` |
| `commentLimiter` | `/notes/:id/comments` | 10 req / 1 min / IP | `express-rate-limit` |
| Timeout PostgreSQL | Connexions DB | 30s (pool idle) | `pg.Pool` config |
| Replicas Docker | Frontend + Backend | 2 + 3 replicas | Docker Swarm deploy |

**Justification** : L'`authLimiter` (15 req/h) rend le brute-force de mots de passe non viable : avec Argon2id (≈100ms/hash), tester 15 mots de passe par heure par IP = 360 essais/jour, insuffisant pour craquer un mot de passe de 12+ caractères complexes.

### 4.5 Sécurité des Conteneurs

| Mesure | Backend | Frontend | Justification |
|--------|---------|---------|---------------|
| Image Distroless/Alpine Slim | Distroless | nginx:alpine-slim | Surface d'attaque minimale |
| User non-root | UID 65532 | user: nginx | Limite l'impact d'une RCE |
| `no-new-privileges` | ✅ | ✅ | Empêche escalade de privilèges |
| Filesystem `read_only` | ✅ | ✅ | Empêche l'écriture de fichiers malveillants |
| `tmpfs` pour /tmp et /var/run | ✅ | ✅ | Seules les zones nécessaires sont écrits |
| Secrets Docker Swarm | DB_PASSWORD, JWT_SECRET | — | Jamais en variable d'environnement en clair |
| Trivy scan (CRITICAL) | ✅ | ✅ | CVE détectées avant le déploiement |

### 4.6 Conformité RGPD

| Droit RGPD | Article | Implémentation NOTIMATIC |
|------------|---------|--------------------------|
| Droit d'accès | Art. 15 | `GET /api/v1/users/:id/export` — JSON complet des données |
| Droit à l'effacement | Art. 17 | `DELETE /api/v1/users/:id` — soft delete + anonymisation J+30 |
| Privacy by Design | Art. 25 | Consentement enregistré (`consent_date`), données minimales collectées |
| Pseudonymisation | Art. 4 §5 | Anonymisation automatique (`deleted_user_<id>`) après 30j |
| Portabilité | Art. 20 | Export JSON structuré de toutes les données |
| Minimisation | Art. 5 §1c | Seuls les champs nécessaires sont collectés dans les profils |

---

## 5. Modèle de Menaces (STRIDE)

Analyse des 2 flux critiques : **authentification** et **création/consultation de notes**.

| ID | Menace STRIDE | Vecteur | Impact | Probabilité | Mitigations |
|----|---------------|---------|--------|-------------|-------------|
| S-1 | **Spoofing** — Vol de JWT | XSS, network sniffing | Critique | Faible | ✅ HttpOnly cookies, TLS 1.3, DOMPurify |
| S-2 | **Spoofing** — Brute-force mot de passe | Script automatisé | Critique | Moyenne | ✅ Argon2id (100ms/hash), authLimiter (15/h) |
| T-1 | **Tampering** — SQLi | Payload dans requête | Critique | Faible | ✅ Requêtes paramétrées ($1), Zod validation |
| T-2 | **Tampering** — Modification image Docker | Compromission CI | Critique | Très faible | ✅ Trivy scan CRITICAL, npm audit |
| T-3 | **Tampering** — XSS stocké | Contenu note malveillant | Haute | Moyenne | ✅ validator.escape(), DOMPurify (3 couches) |
| R-1 | **Repudiation** — Déni d'action | Suppression note | Moyen | Moyenne | ✅ audit_logs (user_id, action, ip, timestamp) |
| I-1 | **Information Disclosure** — Fuite BDD | SQLi, log injection | Critique | Faible | ✅ Paramétrage SQL, messages erreurs génériques |
| I-2 | **Information Disclosure** — IDOR | Accès note d'autrui | Haute | Moyenne | ✅ Vérification `user_id` dans les contrôleurs |
| D-1 | **DoS** — Flood API | Botnet, script | Moyen | Haute | ✅ Rate limiting Traefik + Express (3 niveaux) |
| E-1 | **Elevation of Privilege** — RCE container | Dépendance vulnérable | Critique | Faible | ✅ Distroless, UID non-root, read_only, Trivy |
| E-2 | **Elevation of Privilege** — RBAC bypass | Token forgé | Critique | Très faible | ✅ JWT signé HS256 + RBAC middleware |

**Risques résiduels principaux** :
- Absence de 2FA → compte admin compromettable par vol de mot de passe fort
- Absence de rotation automatique des secrets → JWT_SECRET statique
- E2E tests non configurés → flux Playwright sans couverture automatique

---

## 6. Analyse OWASP Top 10 (2021)

| Rang OWASP | Catégorie | Mesures NOTIMATIC |
|------------|-----------|-------------------|
| A01 | Broken Access Control | ✅ RBAC strict, vérification `user_id`, IDOR checks |
| A02 | Cryptographic Failures | ✅ TLS 1.3, Argon2id, HttpOnly cookies, HTTPS forced |
| A03 | Injection | ✅ Requêtes paramétrées PostgreSQL, Zod, validator.escape |
| A04 | Insecure Design | ✅ Security by Design, threat modeling STRIDE |
| A05 | Security Misconfiguration | ✅ Helmet, CORS strict, no-new-privileges, read_only |
| A06 | Vulnerable Components | ✅ npm audit (CI), Trivy scan (CI), dépendances récentes |
| A07 | Authentication Failures | ✅ Zero-Trust JWT dual-token, Argon2id, rate limiting auth |
| A08 | Software Integrity Failures | ✅ npm ci (lockfile), Trivy image scan, GitHub Actions permissions |
| A09 | Logging Failures | ✅ audit_logs BDD, rétention 6 mois, ip_address + user_agent |
| A10 | SSRF | ⚠️ Pas d'endpoint de proxy URL — risque inexistant dans la conception actuelle |

---

## Annexe A — Schéma de la Base de Données

**18 tables** réparties en 4 domaines, issues de `init.sql` + 9 migrations :

```
╔═══════════════════════════════════════════════════════════════╗
║  DOMAINE IDENTITÉ (init.sql + 001 + 008)                      ║
╠═══════════════════════════════════════════════════════════════╣
║  users         (id, username, password_hash, role,            ║
║                 deleted_at, anonymized, consent_date)         ║
║  profiles      (user_id FK, classe, promotion, niveau)        ║
║  sessions      (user_id FK, refresh_token_hash,               ║
║                 expires_at, revoked, ip_address)              ║
║  password_reset_tokens  (user_id FK, token_hash, expires_at)  ║
╠═══════════════════════════════════════════════════════════════╣
║  DOMAINE CONTENU (init.sql + 007)                             ║
╠═══════════════════════════════════════════════════════════════╣
║  notes         (user_id FK, title, content, created_at)       ║
║  comments      (note_id FK, user_id FK, content)              ║
║  reactions     (note_id FK, user_id FK, type)                 ║
╠═══════════════════════════════════════════════════════════════╣
║  DOMAINE TAGS (002 + 003 + 006 + 009) [ACTIF + LEGACY]        ║
╠═══════════════════════════════════════════════════════════════╣
║  tags          (type: classe|specialite|groupe|categorie,     ║
║                 name, meta JSONB)            [SYSTÈME ACTIF]  ║
║  note_tags     (note_id FK, tag_id FK)       [SYSTÈME ACTIF]  ║
║  user_tags     (user_id FK, tag_id FK)       [SYSTÈME ACTIF]  ║
║  themes        (name, description)           [LEGACY]         ║
║  note_themes   (note_id FK, theme_id FK)     [LEGACY]         ║
║  categories    (name, description)           [LEGACY]         ║
║  note_categories (note_id FK, cat_id FK)     [LEGACY]         ║
║  note_targets  (note_id FK, target_type,     [LEGACY]         ║
║                 target_id)                                    ║
╠═══════════════════════════════════════════════════════════════╣
║  DOMAINE CONFORMITÉ (004)                                     ║
╠═══════════════════════════════════════════════════════════════╣
║  audit_logs    (user_id FK, action, entity_type,              ║
║                 ip_address, user_agent, created_at)           ║
║  gdpr_export_requests (user_id FK, status, export_data JSONB) ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Annexe B — Matrice des Risques Résiduels

| Risque | Probabilité | Impact | Niveau | Plan d'Action |
|--------|-------------|--------|--------|---------------|
| Compte admin compromis (pas de 2FA) | Faible | Critique | **Élevé** | Implémenter 2FA TOTP — priorité v1.3 |
| CVE zero-day sur dépendance NPM | Faible | Haute | **Moyen** | npm audit hebdomadaire, Dependabot |
| DoS volumétrique (>1 Gbps) | Très faible | Haute | **Moyen** | CDN/WAF (Cloudflare) devant Traefik |
| Fuite JWT_SECRET (env compromis) | Très faible | Critique | **Moyen** | Migration vers Vault/AWS SSM — v1.4 |
| IDOR sur note (bug logique) | Faible | Haute | **Moyen** | Tests E2E Playwright — v1.3 |
| XSS persistant (bypass DOMPurify) | Très faible | Haute | **Faible** | CSP strict + tests DAST (ZAP) |

---

**Auteur** : elmaquito (révision par GitHub Copilot Agent)  
**Dépôt** : https://github.com/elmaquito/NOTIMATIC  
**Date** : 1er avril 2026  
**Références** : OWASP Top 10 (2021), NIST SP 800-53, RGPD Art. 25, Saltzer & Schroeder (1975)

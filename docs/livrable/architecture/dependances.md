# NOTIMATIC — Analyse des Dépendances

> **Document** : Inventaire et analyse de sécurité de toutes les dépendances  
> **Date de consolidation** : 2026-04-01  
> **Commit de référence** : `d43a8a27e16b58aad6e0639d1f329fed295f95f9`

---

## Table des Matières

1. [Synthèse](#1-synthèse)
2. [Dépendances Backend](#2-dépendances-backend)
   - 2.1 [Production](#21-production)
   - 2.2 [Développement](#22-développement)
3. [Dépendances Frontend](#3-dépendances-frontend)
   - 3.1 [Production](#31-production)
   - 3.2 [Développement](#32-développement)
4. [Dépendances Infrastructure](#4-dépendances-infrastructure)
5. [Matrice de Risque](#5-matrice-de-risque)
6. [Politique de Mise à Jour](#6-politique-de-mise-à-jour)
7. [Dépendances à Surveiller](#7-dépendances-à-surveiller)

---

## 1. Synthèse

| Composant | Dépendances prod | Dépendances dev | Total |
|-----------|-----------------|-----------------|-------|
| Backend | 10 | 17 | 27 |
| Frontend | 7 | 8 | 15 |
| Infrastructure | 3 images Docker | — | 3 |

**Stratégie de sécurité des dépendances** :
- `npm audit --audit-level=critical` — exécuté en CI sur chaque push (bloquant si CVE critique)
- `trivy` — scan des images Docker en CI (bloquant si CVE CRITICAL)
- Utilisation de ranges `^` en semver — mises à jour patch/minor automatiques
- Aucune dépendance `*` (wildcard) dans les `package.json`
- `--ignore-scripts` utilisé dans le Dockerfile frontend (limite l'exécution de scripts npm à l'installation)

---

## 2. Dépendances Backend

> **Source** : `backend/package.json`

### 2.1 Production

| Package | Version | Rôle | Criticité Sécurité |
|---------|---------|------|-------------------|
| **`argon2`** | ^0.44.0 | Hashing mots de passe (Argon2id) | 🔴 Critique — algorithme de hashing |
| **`jsonwebtoken`** | ^9.0.0 | Génération et vérification des JWT | 🔴 Critique — authentification |
| **`express`** | ^4.18.2 | Framework HTTP | 🟠 Haute — surface d'attaque principale |
| **`helmet`** | ^7.0.0 | Headers HTTP de sécurité (CSP, HSTS…) | 🟠 Haute — protection transport |
| **`express-rate-limit`** | ^8.3.1 | Rate limiting (anti-brute force, anti-DDoS) | 🟠 Haute — protection disponibilité |
| **`validator`** | ^13.15.26 | Sanitization et validation des entrées | 🟠 Haute — protection injection |
| **`zod`** | ^3.21.4 | Validation des schémas TypeScript | 🟠 Haute — validation données |
| **`pg`** | ^8.11.0 | Client PostgreSQL (requêtes paramétrées) | 🟠 Haute — accès BDD |
| **`cors`** | ^2.8.5 | Politique CORS | 🟡 Moyenne — contrôle origines |
| **`cookie-parser`** | ^1.4.6 | Parsing des cookies HTTP-only | 🟡 Moyenne — gestion sessions |
| **`dotenv`** | ^16.1.4 | Chargement variables d'environnement | 🟢 Faible |
| **`dompurify`** | ^3.3.3 | Sanitization HTML (utilisé en complément) | 🟠 Haute — protection XSS |

#### Notes de sécurité détaillées

**`argon2` (^0.44.0)**
- Implémente Argon2id — recommandé par OWASP Password Storage Cheat Sheet
- Résistant aux attaques GPU/ASIC
- Module natif compilé — nécessite `python3`, `make`, `g++` au build
- ⚠️ Toujours utiliser `{ type: argon2.argon2id }` (pas argon2i ou argon2d seuls)

**`jsonwebtoken` (^9.0.0)**
- Corrige la vulnérabilité CVE de l'algorithme `none` des versions < 8.x
- Version 9.x est la version stable recommandée
- Access tokens : 15 min (`expiresIn: '15m'`)
- Refresh tokens : opaques (pas JWT) — stockés hashés en BDD

**`pg` (^8.11.0)**
- Toutes les requêtes utilisent la syntaxe paramétrée `$1, $2, ...`
- Aucune concaténation de chaîne dans les requêtes SQL
- Pool de connexions avec gestion d'erreur sur `pool.on('error', ...)`

**`helmet` (^7.0.0)**
- Active par défaut : `Content-Security-Policy`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy`
- En production : compléter la CSP avec une nonce aléatoire par requête

### 2.2 Développement

| Package | Version | Rôle |
|---------|---------|------|
| `typescript` | ^5.9.3 | Compilateur TypeScript |
| `ts-node-dev` | ^2.0.0 | Hot-reload dev (TypeScript) |
| `jest` | ^29.7.0 | Framework de tests |
| `ts-jest` | ^29.4.6 | Jest avec support TypeScript |
| `supertest` | ^7.2.2 | Tests HTTP (assertions sur les routes Express) |
| `eslint` | ^9.10.0 | Linteur JavaScript/TypeScript |
| `@typescript-eslint/eslint-plugin` | ^8.57.0 | Règles ESLint TypeScript |
| `@typescript-eslint/parser` | ^8.57.0 | Parser ESLint TypeScript |
| `eslint-plugin-security` | ^3.0.1 | Règles ESLint de sécurité (anti-patterns) |
| `@types/*` | various | Types TypeScript pour les dépendances |

**`eslint-plugin-security`** : détecte les anti-patterns de sécurité courants (utilisation de `eval`, RegExp non sécurisées, injection de chemin, etc.)

---

## 3. Dépendances Frontend

> **Source** : `frontend/package.json`

### 3.1 Production

| Package | Version | Rôle | Criticité Sécurité |
|---------|---------|------|-------------------|
| **`dompurify`** | ^3.3.1 | Sanitization HTML — protection XSS | 🔴 Critique — protection XSS côté client |
| **`vue`** | ^3.3.4 | Framework UI | 🟠 Haute — runtime principal |
| **`pinia`** | ^3.0.4 | State management | 🟡 Moyenne |
| **`vue-router`** | ^5.0.3 | Routeur SPA | 🟡 Moyenne |
| `typescript` | ^5.9.3 | Langage | 🟢 Faible |
| `@types/vue` | ^1.0.31 | Types Vue | 🟢 Faible |
| `@types/node` | ^25.4.0 | Types Node.js | 🟢 Faible |

#### Notes de sécurité détaillées

**`dompurify` (^3.3.1)**
- Utilisé dans `frontend/src/utils/sanitize.js`
- Wrappé dans les fonctions `sanitize()` et `sanitizeAndRender()`
- Doit être appelé sur **tout** contenu passé à `v-html`
- ⚠️ Ne jamais utiliser `v-html` sans passer par `sanitize()` au préalable
- Compatible browser + jsdom (tests)

**`vue` (^3.3.4)**
- Vue 3 échappe automatiquement les interpolations `{{ }}` — XSS protection de base
- Seul `v-html` nécessite une sanitization explicite (DOMPurify)

### 3.2 Développement

| Package | Version | Rôle |
|---------|---------|------|
| `vite` | ^4.4.5 | Bundler + serveur dev |
| `@vitejs/plugin-vue` | ^4.2.3 | Plugin Vite pour les SFC Vue |
| `vitest` | ^4.0.18 | Framework de tests (compatible Vite) |
| `@vitest/coverage-v8` | ^4.1.0 | Couverture de code (V8 engine) |
| `@vue/test-utils` | ^2.4.6 | Utilitaires de test Vue |
| `jsdom` | ^28.1.0 | DOM virtuel pour les tests |
| `vue-tsc` | ^3.2.5 | Type-checking Vue SFC |

---

## 4. Dépendances Infrastructure

| Image | Version | Usage | Criticité |
|-------|---------|-------|-----------|
| **`gcr.io/distroless/nodejs18-debian11`** | latest | Image runner backend | 🔴 Critique — surface d'attaque minimale |
| **`nginx:alpine-slim`** | latest | Serveur statique frontend | 🟠 Haute — exposition web |
| **`postgres:15-alpine`** | 15 | Base de données | 🔴 Critique — données sensibles |
| `node:18-bullseye` | 18 | Builder backend (étape build uniquement) | 🟢 Faible — pas dans l'image finale |
| `node:18-alpine` | 18 | Builder frontend (étape build uniquement) | 🟢 Faible — pas dans l'image finale |
| `traefik:v2.10` | v2.10 | Reverse proxy | 🔴 Critique — point d'entrée réseau |

**Justification du choix Distroless** :
- Pas de shell → impossible d'exécuter des commandes après compromission
- Pas de package manager → impossible d'installer des outils malveillants
- Surface CVE minimale → Trivy retourne très peu d'alertes
- Trade-off : impossible de `docker exec -it container bash` → utiliser un sidecar de debug si nécessaire

---

## 5. Matrice de Risque

| Dépendance | Impact compromission | Probabilité CVE | Niveau de risque | Mitigation |
|------------|---------------------|-----------------|------------------|------------|
| `argon2` | Très élevé (mots de passe) | Faible (C natif, bien audité) | 🟡 Moyen | Trivy scan + npm audit |
| `jsonwebtoken` | Très élevé (auth) | Faible (v9 corrigée) | 🟡 Moyen | Pinned major version ^9 |
| `express` | Élevé (HTTP) | Moyen | 🟠 Élevé | npm audit + mise à jour patch |
| `pg` | Très élevé (BDD) | Faible | 🟡 Moyen | Requêtes paramétrées obligatoires |
| `dompurify` | Élevé (XSS) | Faible (très audité) | 🟡 Moyen | npm audit + usage systématique |
| `postgres:15` | Critique (données) | Moyen (image Docker) | 🔴 Élevé | Trivy + réseau isolé + secrets |
| `traefik:v2.10` | Critique (entrée réseau) | Moyen | 🔴 Élevé | Trivy + pas d'API publique exposée |
| `nginx:alpine-slim` | Moyen (statique) | Moyen | 🟡 Moyen | Trivy + `read_only: true` |

---

## 6. Politique de Mise à Jour

### Cycle de mise à jour

| Type | Fréquence | Mécanisme |
|------|-----------|-----------|
| **Patches de sécurité** (ex: CVE critique) | Immédiat (< 48h) | Mise à jour manuelle + CI |
| **Mises à jour patch** (x.y.**Z**) | Mensuel | `npm update` + test |
| **Mises à jour minor** (x.**Y**.z) | Trimestriel | `npm update` + test complet |
| **Mises à jour major** (**X**.y.z) | Selon besoin | Migration planifiée |

### Commandes de mise à jour

```bash
# Vérifier les dépendances obsolètes
npm outdated

# Appliquer les mises à jour patch + minor (respecte les ranges ^)
npm update

# Audit de sécurité
npm audit

# Corriger automatiquement les vulnérabilités patchables
npm audit fix

# Vérifier sans corriger (mode CI)
npm audit --audit-level=critical
```

### Scan d'images Docker

```bash
# Scan d'une image locale
trivy image --severity HIGH,CRITICAL notimatic-backend:latest
trivy image --severity HIGH,CRITICAL notimatic-frontend:latest

# Scan avec rapport JSON
trivy image --format json --output report.json notimatic-backend:latest
```

---

## 7. Dépendances à Surveiller

### Backend — Points d'attention

| Package | Raison de surveillance | Action recommandée |
|---------|----------------------|-------------------|
| `argon2` | Module natif C — recompilation requise après upgrade | Tester `--build-from-source` après upgrade |
| `jsonwebtoken` | Historique de CVE (avant v9) | Maintenir ^9, surveiller les advisories GitHub |
| `express` | Framework central — nombreuses dépendances transitives | `npm audit` régulier |
| `helmet` | Évolution des recommandations CSP | Suivre les guides OWASP |

### Frontend — Points d'attention

| Package | Raison de surveillance | Action recommandée |
|---------|----------------------|-------------------|
| `dompurify` | Bibliothèque de sécurité critique | Ne jamais baisser la version |
| `vue` | Composant principal — XSS si mal utilisé | Toujours `sanitize()` avant `v-html` |

### Infrastructure — Points d'attention

| Image | Raison de surveillance | Action recommandée |
|-------|----------------------|-------------------|
| `postgres:15-alpine` | BDD — données sensibles | Pinner la version mineure en prod (`postgres:15.x-alpine`) |
| `traefik:v2.10` | Proxy exposé à internet | Surveiller les CVE Traefik |
| `gcr.io/distroless/nodejs18-debian11` | Image base backend | Rebuilder régulièrement pour récupérer les patches Debian |

### Dépendances à ne PAS ajouter sans audit

| Catégorie | Risque |
|-----------|--------|
| Bibliothèques de parsing XML/YAML | XXE (XML External Entity) |
| Bibliothèques de rendu de templates côté serveur | SSTI (Server-Side Template Injection) |
| Bibliothèques de requêtes HTTP outbound | SSRF (Server-Side Request Forgery) |
| Bibliothèques de décompression | Zip Bomb |

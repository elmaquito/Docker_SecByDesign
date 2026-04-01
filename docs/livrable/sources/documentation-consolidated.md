# NOTIMATIC — Documentation Consolidée

> **Domaine** : Documentation technique et fonctionnelle  
> **Date de consolidation** : 2026-04-01  
> **Commit de référence** : `d43a8a27e16b58aad6e0639d1f329fed295f95f9`  
> **Répertoire source** : `docs/`, `README.md`, `backend/migrations/README.md`

---

## Table des Matières

1. [Vue d'ensemble des documents](#1-vue-densemble-des-documents)
2. [README principal du projet](#2-readme-principal-du-projet)
3. [ARCHITECTURE.md — Architecture technique](#3-architecturemd--architecture-technique)
4. [SECURITY.md — Sécurité et Zero-Trust](#4-securitymd--sécurité-et-zero-trust)
5. [GDPR.md — Conformité RGPD](#5-gdprmd--conformité-rgpd)
6. [API.md — Référence des endpoints](#6-apimd--référence-des-endpoints)
7. [ROADMAP.md — Historique des versions](#7-roadmapmd--historique-des-versions)
8. [RELEASE_NOTES.md — Changelog détaillé](#8-release_notesmd--changelog-détaillé)
9. [USER_GUIDE.md — Guide utilisateur](#9-user_guidemd--guide-utilisateur)
10. [wireframes.md — Wireframes UX](#10-wireframesmd--wireframes-ux)
11. [dossier-projet/ — Documents techniques officiels](#11-dossier-projet--documents-techniques-officiels)
    - 11.1 [README du dossier projet](#111-readme-du-dossier-projet)
    - 11.2 [1_DESCRIPTIF_PROJET.md](#112-1_descriptif_projetmd)
    - 11.3 [2_ARCHITECTURE_SECURITE.md](#113-2_architecture_securitemd)
    - 11.4 [3_IMPLEMENTATION_TECHNIQUE.md](#114-3_implementation_techniquemd)
12. [Migrations SQL — README](#12-migrations-sql--readme)

---

## 1. Vue d'ensemble des documents

| Document | Chemin | Audience | Description |
|----------|--------|----------|-------------|
| README principal | `README.md` | Tous | Point d'entrée du projet — stack, démarrage rapide, fonctionnalités |
| Architecture | `docs/ARCHITECTURE.md` | Développeurs | Stack technique, schéma BDD, décisions de conception, API surface |
| Sécurité | `docs/SECURITY.md` | Développeurs / Ops | Zero-Trust auth, modèle STRIDE, checklist déploiement, incidents |
| RGPD | `docs/GDPR.md` | DPO / Développeurs | Données collectées, droits RGPD, procédures d'exercice |
| API | `docs/API.md` | Développeurs | Tous les endpoints HTTP avec exemples requêtes/réponses |
| Roadmap | `docs/ROADMAP.md` | Équipe | Historique versions livrées + reste à faire |
| Release Notes | `docs/RELEASE_NOTES.md` | Équipe | Changelog détaillé par version |
| Guide Utilisateur | `docs/USER_GUIDE.md` | Utilisateurs finaux | Réinitialisation mot de passe, compte, fonctionnalités UI |
| Wireframes | `docs/wireframes.md` | UX / Développeurs | 7 écrans ASCII — flux complet de l'application |
| Descriptif Projet | `docs/dossier-projet/1_DESCRIPTIF_PROJET.md` | Évaluateurs | Objectifs fonctionnels/non-fonctionnels, rôles, flux applicatifs |
| Architecture Sécurité | `docs/dossier-projet/2_ARCHITECTURE_SECURITE.md` | Évaluateurs | Security by Design, STRIDE, OWASP Top 10 |
| Implémentation | `docs/dossier-projet/3_IMPLEMENTATION_TECHNIQUE.md` | Évaluateurs | Choix technologiques, plan réseau, configuration commentée |
| Migrations SQL | `backend/migrations/README.md` | Développeurs / Ops | Guide des 9 migrations (001→009) |

---

## 2. README principal du projet

> **Source** : `README.md`

Le README principal constitue le **point d'entrée** du dépôt. Il couvre :

- **État du projet** : version v1.2.0, statut par composant (backend ✅, frontend ✅, CI/CD ✅, sécurité ✅)
- **Table des fonctionnalités** : authentification JWT, feed ciblé, CRUD notes, tags unifiés, profils, sécurité, RGPD, audit, UI/UX, CI/CD
- **Démarrage rapide** : prérequis, clonage, migrations, lancement Docker Compose, création du compte admin initial
- **Configuration** : variables d'environnement backend et frontend, mode production Docker Swarm
- **Documentation** : liens vers tous les documents du dossier `docs/`
- **Architecture** : stack technique (tableau), diagramme ASCII (Client → Traefik → Backend → PostgreSQL)
- **Base de données** : 18 tables réparties en 4 domaines (Identité, Contenu, Tagging, Conformité)
- **Roadmap MVP** : 8 versions livrées (v0.1.0 → v1.0.0) + reste à faire
- **Sécurité & RGPD** : mesures implémentées, mesures restantes, politique de conservation des données
- **Tests & CI/CD** : commandes d'exécution, description du pipeline GitHub Actions
- **Contribution** : workflow Git, standards de code, commits conventionnels

---

## 3. ARCHITECTURE.md — Architecture technique

> **Source** : `docs/ARCHITECTURE.md`

Document de référence technique (v2.0). Contenu :

### Stack Technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Runtime | Node.js | 20.x LTS |
| Framework API | Express.js | 4.18 |
| Langage | TypeScript | 5.x (strict) |
| Base de données | PostgreSQL | 16 |
| Client BDD | pg (node-postgres) | 8.11 |
| Auth | JWT + Argon2 | — |
| Validation | Zod | 3.21 |
| Sécurité | Helmet, express-rate-limit, validator | — |
| Frontend | Vue 3 | 3.3.4 |
| Bundler | Vite | 4.4.5 |
| State management | Pinia | 3.x |
| Routing | Vue Router | 5.x |
| Tests backend | Jest + Supertest | 29.x |
| Tests frontend | Vitest + Vue Test Utils | 4.x |
| Conteneurisation | Docker + Docker Compose | — |
| Reverse proxy | Traefik | v2.10 |
| CI/CD | GitHub Actions | — |
| Scan sécurité | Trivy, npm audit | — |

### Schéma de la Base de Données (18 tables)

**Domaine Identité & Authentification**
- `users` : comptes (username, rôle RBAC, soft-delete avec `deleted_at`)
- `profiles` : données étendues (classe, promotion, niveau)
- `sessions` : refresh tokens persistants (hash SHA-256, expiration, révocation)
- `password_reset_tokens` : tokens one-time pour réinitialisation

**Domaine Contenu**
- `notes` : notes (titre, contenu, pinned, urgent, view_count)
- `comments` : commentaires sur les notes
- `reactions` : réactions toggle par utilisateur

**Domaine Tagging & Ciblage**
- `tags` : Tags Unifiés (`classe`, `specialite`, `groupe`, `categorie`)
- `note_tags` : association note ↔ tag (many-to-many)
- `user_tags` : tags affectés à un utilisateur (pour le feed ciblé)
- `themes` : thèmes UI (legacy)
- `note_themes` : association note ↔ thème (legacy)
- `categories` : catégories de ciblage (legacy)
- `note_categories` : association note ↔ catégorie (legacy)
- `note_targets` : règles de ciblage fin (user, classe, promotion, niveau, all)

**Domaine Conformité & Audit**
- `audit_logs` : journal immuable des actions critiques
- `gdpr_export_requests` : suivi des demandes d'export RGPD
- `schema_migrations` : versioning des migrations (001→009)

---

## 4. SECURITY.md — Sécurité et Zero-Trust

> **Source** : `docs/SECURITY.md`

### Mesures de Sécurité Actives (v1.2.0)

| Couche | Mesure | Technologie |
|--------|--------|-------------|
| Auth | JWT HTTP-only cookies | `jsonwebtoken` 9.x — Access 15 min + Refresh 30 j |
| Auth | Hashing mots de passe | `argon2` (Argon2id) — résistant GPU/ASIC |
| Auth | Refresh tokens opaques | `crypto.randomBytes` → hash SHA-256 en BDD |
| Transport | Headers sécurité | `helmet` 7.x — CSP, X-Frame-Options, HSTS |
| Transport | CORS strict | Origins explicitement listées (`CORS_ORIGINS`) |
| API | Rate limiting global | 100 req / 15 min / IP |
| API | Rate limiting auth | 15 req / 1 h / IP (anti-brute force) |
| API | Rate limiting commentaires | 10 req / 1 min / IP |
| Input | Sanitization backend | `validator.escape()` sur toutes les entrées |
| Input | Sanitization frontend | `DOMPurify` sur tout le contenu affiché |
| DB | Anti-injection SQL | Requêtes paramétrées `$1, $2, …` systématiques |
| Validation | Schémas stricts | `zod` — validation sur tous les endpoints |
| Audit | Journal d'actions | Table `audit_logs` — actions sensibles tracées |
| RGPD | Export de données | `GET /api/v1/users/:id/export` |
| RGPD | Suppression / anonymisation | `DELETE /api/v1/users/:id` (soft-delete) |
| CI/CD | Scan dépendances | `npm audit --audit-level=critical` |
| CI/CD | Scan images Docker | Trivy (CRITICAL) |
| RBAC | Contrôle d'accès | Middleware `authorize()` — 4 rôles |

### Architecture d'Authentification Zero-Trust

**Access Token (JWT)** :
- Durée : 15 minutes
- Stockage : Cookie `auth_token` (HttpOnly, Secure en prod)
- Auto-refresh : le middleware `authenticate()` rafraîchit silencieusement l'access token si le refresh token est valide

**Refresh Token (Opaque)** :
- Durée : 30 jours
- Génération : `crypto.randomBytes(32)` — 64 caractères hex
- Stockage client : Cookie `refresh_token` (HttpOnly)
- Stockage serveur : Hash SHA-256 dans la table `sessions`
- Rotation : usage unique via `POST /auth/refresh` (nouveau access + nouveau refresh, ancien révoqué)

### Modèle de Menaces STRIDE

| Menace | Exemple | Mitigation |
|--------|---------|-----------|
| **Spoofing** | Usurpation d'identité | JWT + Argon2 + refresh tokens opaques |
| **Tampering** | Modification des données | Requêtes paramétrées + validation Zod |
| **Repudiation** | Déni d'action | `audit_logs` — journal immuable |
| **Info Disclosure** | Fuite de données | RBAC + CORS strict + Helmet CSP |
| **Denial of Service** | Surcharge API | Rate limiting 3 niveaux |
| **Elevation of Privilege** | Escalade de droits | `authorize()` + `no-new-privileges` Docker |

---

## 5. GDPR.md — Conformité RGPD

> **Source** : `docs/GDPR.md`

### Données Collectées

| Catégorie | Données | Base légale | Conservation |
|-----------|---------|-------------|--------------|
| Identification | username, rôle, mot de passe hashé | Contrat Art. 6(1)(b) | Durée contrat + 1 an |
| Profil | classe, promotion, niveau | Contrat Art. 6(1)(b) | Durée contrat + 1 an |
| Contenu | notes, commentaires, thèmes | Contrat Art. 6(1)(b) | Durée contrat + 1 an |
| Technique | audit logs, IP, cookies JWT | Intérêt légitime Art. 6(1)(f) | 6 mois |

### Données NON collectées
- Données sensibles (santé, religion, orientation, etc.)
- Données bancaires, biométriques
- Géolocalisation précise

### Droits des Utilisateurs

| Droit | Article RGPD | Endpoint | Délai |
|-------|-------------|----------|-------|
| Accès | Art. 15 | `GET /api/v1/users/:id/export` | 30 jours |
| Rectification | Art. 16 | `PUT /api/v1/users/me` | 30 jours |
| Effacement | Art. 17 | `DELETE /api/v1/users/:id` | 30 jours |
| Portabilité | Art. 20 | `GET /api/v1/users/:id/export` (JSON) | 30 jours |

### Politique de Conservation
- Comptes : durée du contrat + 1 an
- Audit logs : 6 mois
- Exports GDPR : 3 mois
- **Soft delete** : marquage `deleted_at = NOW()` puis anonymisation à 30 jours

---

## 6. API.md — Référence des endpoints

> **Source** : `docs/API.md`

### Authentification

| Méthode | Endpoint | Auth requise | Description |
|---------|----------|-------------|-------------|
| `POST` | `/api/v1/auth/login` | Non | Connexion — retourne cookies JWT |
| `POST` | `/api/v1/auth/logout` | Oui | Déconnexion — révoque le refresh token |
| `POST` | `/api/v1/auth/refresh` | Non (cookie) | Rotation du refresh token |
| `POST` | `/api/v1/auth/request-password-reset` | Non | Demande de réinitialisation mot de passe |
| `POST` | `/api/v1/auth/reset-password` | Non | Complétion de la réinitialisation |

### Utilisateurs

| Méthode | Endpoint | Rôles | Description |
|---------|----------|-------|-------------|
| `POST` | `/api/v1/users/setup` | Public | Bootstrap admin initial (1 seule utilisation) |
| `POST` | `/api/v1/users` | admin, technician | Créer un utilisateur |
| `GET` | `/api/v1/users` | admin, technician, teacher | Lister les utilisateurs |
| `GET` | `/api/v1/users/me` | Tous | Mon compte |
| `PUT` | `/api/v1/users/me` | admin, technician, teacher | Modifier mon compte |
| `GET` | `/api/v1/users/:id/export` | Soi-même ou admin | Export RGPD (JSON) |
| `DELETE` | `/api/v1/users/:id` | admin | Supprimer (soft-delete) |
| `GET` | `/api/v1/users/:id/profile` | Tous | Voir un profil |
| `PUT` | `/api/v1/users/:id/profile` | Soi-même ou admin | Modifier un profil |

### Notes

| Méthode | Endpoint | Rôles | Description |
|---------|----------|-------|-------------|
| `GET` | `/api/v1/notes` | Tous | Lister les notes (filtrage par rôle) |
| `POST` | `/api/v1/notes` | teacher, student, admin | Créer une note |
| `GET` | `/api/v1/notes/:id` | Tous | Obtenir une note |
| `PATCH` | `/api/v1/notes/:id` | Auteur ou admin | Modifier une note |
| `DELETE` | `/api/v1/notes/:id` | Auteur ou admin | Supprimer une note |
| `GET` | `/api/v1/notes/:id/tags` | Tous | Tags d'une note |
| `POST` | `/api/v1/notes/:id/tags` | teacher, student, admin | Mettre à jour les tags |
| `GET` | `/api/v1/notes/:id/reactions/me` | Tous | Ma réaction sur une note |
| `POST` | `/api/v1/notes/:id/reactions` | Tous | Ajouter/basculer une réaction |
| `GET` | `/api/v1/notes/:id/comments` | Tous | Commentaires d'une note |
| `POST` | `/api/v1/notes/:id/comments` | Tous | Ajouter un commentaire |

### Tags, Feed, Métadonnées

| Méthode | Endpoint | Rôles | Description |
|---------|----------|-------|-------------|
| `GET` | `/api/v1/tags` | Tous | Lister les tags unifiés |
| `POST` | `/api/v1/tags` | admin, teacher, technician | Créer un tag |
| `PATCH` | `/api/v1/tags/:id` | admin, teacher, technician | Modifier un tag |
| `DELETE` | `/api/v1/tags/:id` | admin | Supprimer un tag |
| `GET` | `/api/v1/feed` | Tous | Feed personnalisé (filtré par user_tags) |
| `GET` | `/api/v1/themes` | Tous | Lister les thèmes |
| `GET` | `/api/v1/categories` | Tous | Lister les catégories |
| `GET` | `/api/v1/health` | Non | État du système + connexion BDD |

---

## 7. ROADMAP.md — Historique des versions

> **Source** : `docs/ROADMAP.md`

| Version | Statut | Contenu principal |
|---------|--------|-------------------|
| v0.1.0 | ✅ | Fondations : Auth JWT, CRUD notes, commentaires, Docker |
| v0.2.0 | ✅ | BDD + TypeScript : migrations SQL 001-009, migration frontend TS + Pinia |
| v0.3.0 | ✅ | API Unified Tags & Profils : CRUD tags, stores Pinia, profils étendus |
| v0.4.0 | ✅ | Feed Intelligent : algorithme feed ciblé, `GET /api/v1/feed`, `user_tags` |
| v0.5.0 | ✅ | Sécurité & RGPD : rate limiting, sanitization XSS, export/delete RGPD, audit logs |
| v0.6.0 | ✅ | Tests & CI/CD : Jest, Vitest, pipeline GitHub Actions strict (lint→test→Trivy→Docker Build) |
| v0.7.0 | ✅ | UI/UX & Wireframes : Dark/Light mode, Loader, Responsive, wireframes ASCII |
| v1.0.0 | ✅ | Production Ready : Docker Swarm, Traefik, secrets, documentation complète |

**Reste à faire (post-v1.0.0)** :
- 🔴 2FA TOTP (obligatoire pour les admins)
- 🔴 Endpoint `GET /api/v1/audit` (consultation admin)
- 🟡 Tests E2E Playwright (smoke, teacher flow, student flow, GDPR flow)
- 🟡 Couverture de tests : 80% backend / 70% frontend
- 🟢 Notifications temps réel (WebSocket + email)
- 🟢 Recherche full-text PostgreSQL
- 🟢 Analytics et tableaux de bord

---

## 8. RELEASE_NOTES.md — Changelog détaillé

> **Source** : `docs/RELEASE_NOTES.md`

### CI Fix — Strict Workflow (PR #18) — 1er avril 2026

Pipeline GitHub Actions refondu avec :
- Jobs séparés : `backend-lint`, `backend-test`, `frontend-lint`, `frontend-test`, `npm-audit`, `trivy-scan`, `docker-build`, `e2e-smoke`
- Matrix Node 18 + 20 pour lint et tests backend
- Portes de couverture : ≥ 80% backend, ≥ 70% frontend
- `npm audit --audit-level=critical` + Trivy CRITICAL
- Permissions minimales (`contents: read`, `security-events: write`)

### v1.0.0 — Production Ready — 17 février 2026

Docker Swarm avec secrets chiffrés, Traefik TLS + HSTS, réseaux overlay segmentés, documentation complète (ARCHITECTURE, SECURITY, GDPR, API, ROADMAP, RELEASE_NOTES, USER_GUIDE, wireframes).

### v0.5.0 — Sécurité & RGPD — 17 février 2026

Rate limiting (3 niveaux), sanitization XSS (`validator` + `DOMPurify`), audit logs, endpoints RGPD (export + suppression), réinitialisation mot de passe par token SHA-256.

---

## 9. USER_GUIDE.md — Guide utilisateur

> **Source** : `docs/USER_GUIDE.md`

Guide destiné aux utilisateurs finaux. Couvre :

### Réinitialisation du mot de passe
1. Cliquer sur "Mot de passe oublié ?" sur la page de connexion
2. Entrer son nom d'utilisateur
3. Recevoir le lien de réinitialisation (affiché en mode dev)
4. Saisir le nouveau mot de passe (minimum 12 caractères)
5. Le lien expire après 1 heure et n'est utilisable qu'une seule fois

### Paramètres du compte
- Modification de l'email, du téléphone, du mot de passe
- ⚠️ Les étudiants ne peuvent **pas** modifier leurs informations de compte
- Le nom d'utilisateur ne peut pas être modifié

### Fonctionnalités UI
- Indicateur de chargement pendant la sauvegarde des notes
- Bouton désactivé pendant l'enregistrement (anti-double envoi)
- Édition inline des notes avec icônes ✏️ / 💾 / ❌
- Messages d'erreur explicites en cas de problème

---

## 10. wireframes.md — Wireframes UX

> **Source** : `docs/wireframes.md`

7 écrans documentés en ASCII art :

1. **Page de connexion** (`/login`) — formulaire + liens "Mot de passe oublié" / "Contact admin"
2. **Dashboard** (`/`) — barre de navigation, liste des notes, bouton création, filtre par tags
3. **Carte de note** — titre, contenu, auteur, tags, réactions (👍/👎), commentaires, actions (édition, suppression)
4. **Modal de création de note** — titre, contenu, sélection tags/ciblage
5. **Paramètres du compte** (`/account`) — email, téléphone, mot de passe, export RGPD
6. **Mot de passe oublié** (`/forgot-password`) — formulaire de demande
7. **Réinitialisation mot de passe** (`/reset-password`) — formulaire nouveau mot de passe

---

## 11. dossier-projet/ — Documents techniques officiels

### 11.1 README du dossier projet

> **Source** : `docs/dossier-projet/README.md`

Ce dossier contient les 3 livrables techniques officiels du projet NOTIMATIC, structurés selon le référentiel de la formation :

| # | Document | Contenu |
|---|----------|---------|
| 1 | `1_DESCRIPTIF_PROJET.md` | Objectifs, description fonctionnelle, rôles, flux, organisation, historique |
| 2 | `2_ARCHITECTURE_SECURITE.md` | Architecture globale, Security by Design (8 principes), STRIDE, OWASP Top 10 |
| 3 | `3_IMPLEMENTATION_TECHNIQUE.md` | Choix technologiques motivés, plan réseau, configuration commentée, résolutions d'erreurs |

### 11.2 `1_DESCRIPTIF_PROJET.md`

> **Source** : `docs/dossier-projet/1_DESCRIPTIF_PROJET.md`

#### Problématique

> Comment centraliser la diffusion d'informations pédagogiques au sein d'un établissement de formation, en garantissant la confidentialité des données, le contrôle d'accès par rôle, la traçabilité des actions et la conformité RGPD ?

#### Rôles utilisateurs

| Rôle | Droits principaux |
|------|------------------|
| **admin** | Accès total — créer/supprimer utilisateurs, gérer les tags, voir tous les logs |
| **technician** | Créer des utilisateurs — gérer l'infrastructure — voir les notes |
| **teacher** | Créer/modifier des notes — voir les notes étudiants — gérer les tags |
| **student** | Voir son feed ciblé — créer des notes — commenter/réagir |

#### Flux applicatifs principaux

1. **Connexion** : POST /auth/login → cookies JWT → Dashboard
2. **Feed ciblé** : GET /api/v1/feed → filtrage par `user_tags` → affichage NoteCard
3. **Création de note** : POST /api/v1/notes → assignation tags/targets → audit log
4. **Export RGPD** : GET /api/v1/users/:id/export → JSON complet → audit log

### 11.3 `2_ARCHITECTURE_SECURITE.md`

> **Source** : `docs/dossier-projet/2_ARCHITECTURE_SECURITE.md`

Document d'architecture sécurité couvrant :

**8 Principes de Sécurité by Design appliqués** :
1. **Économie de mécanisme** — stack minimale, pas de framework superflu
2. **Défaut sécurisé** — fail → 401/403, jamais de fallback non sécurisé
3. **Médiation complète** — authentification sur chaque requête (middleware `authenticate`)
4. **Conception ouverte** — pas de sécurité par obscurcissement (Argon2id standard)
5. **Séparation des privilèges** — 4 rôles RBAC distincts
6. **Moindre privilège** — chaque endpoint n'autorise que les rôles nécessaires
7. **Moindre mécanisme commun** — réseaux Docker isolés, secrets séparés par usage
8. **Facilité d'utilisation** — sécurité transparente (auto-refresh JWT, cookies HttpOnly)

**Analyse OWASP Top 10** :
- A01 Contrôle d'accès : RBAC + middleware `authorize()`
- A02 Défaillances cryptographiques : Argon2id + JWT HS256 + TLS 1.3
- A03 Injection : requêtes paramétrées PostgreSQL + validation Zod
- A07 Authentification : JWT courte durée + refresh tokens rotatifs + rate limiting
- A09 Logging : audit_logs en BDD + logs JSON Traefik

### 11.4 `3_IMPLEMENTATION_TECHNIQUE.md`

> **Source** : `docs/dossier-projet/3_IMPLEMENTATION_TECHNIQUE.md`

Document d'implémentation technique couvrant :

- **Choix technologiques motivés** : pourquoi Node.js/Express vs Django/Spring, pourquoi Argon2id vs bcrypt, pourquoi PostgreSQL vs MongoDB
- **Plan d'adressage réseau** (dev + prod) : tables IP, ports, réseaux Docker
- **Fichiers de configuration commentés** : `.env` backend, `nginx.conf`, `traefik.yml`
- **Erreurs rencontrées et résolutions** : problèmes CORS, cookies SameSite, migration TypeScript, CI matrix
- **Procédures opérationnelles** : démarrage dev, déploiement prod, rollback migration

---

## 12. Migrations SQL — README

> **Source** : `backend/migrations/README.md`

Guide complet des 9 migrations SQL numérotées :

| Migration | Tables créées / modifiées | Description |
|-----------|--------------------------|-------------|
| `001_add_profiles.sql` | `profiles` | Classe, promotion, niveau, photo |
| `002_add_themes_categories.sql` | `themes`, `categories`, `note_themes`, `note_categories` | Thèmes UI et catégories (legacy) |
| `003_add_note_targets.sql` | `note_targets` | Ciblage fin des notes par user/classe/promotion/niveau/all |
| `004_add_audit_gdpr.sql` | `audit_logs`, `gdpr_export_requests` | Journal d'audit + suivi demandes RGPD |
| `005_add_password_reset.sql` | `password_reset_tokens` | Tokens one-time pour réinitialisation |
| `006_add_unified_tags.sql` | `tags`, `note_tags` | Tags Unifiés (ENUM type) remplaçant les catégories legacy |
| `007_add_reactions.sql` | `reactions` | Réactions toggle par utilisateur (up/down) |
| `008_add_sessions.sql` | `sessions` | Refresh tokens persistants (hash SHA-256, révocation) |
| `009_add_user_tags.sql` | `user_tags` | Tags assignés à un utilisateur → feed ciblé |

**Utilisation** :
```bash
# Linux / macOS
bash backend/migrate.sh

# Windows PowerShell
.\backend\migrate.ps1

# Via Docker (recommandé)
docker-compose -f infrastructure/docker-compose.dev.yml exec backend bash migrate.sh
```

Le script est **idempotent** : il vérifie la table `schema_migrations` avant d'appliquer chaque fichier et skipe ceux déjà appliqués.

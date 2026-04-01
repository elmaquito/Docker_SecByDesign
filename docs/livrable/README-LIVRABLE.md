# NOTIMATIC — Dossier Livrable

> **Projet** : NOTIMATIC — Application de prise de notes sécurisée (Secure by Design)  
> **Version** : v1.2.0  
> **Date de consolidation** : 1er avril 2026  
> **Commit de référence** : `d43a8a27e16b58aad6e0639d1f329fed295f95f9`  
> **Dépôt** : https://github.com/elmaquito/NOTIMATIC

---

## 📋 Objet de ce Livrable

Ce dossier `livrable/` constitue la **version consolidée et structurée** du projet NOTIMATIC. Il a été conçu pour permettre une livraison professionnelle, lisible et traçable, sans avoir à naviguer entre plusieurs fichiers sources éparpillés dans l'arborescence du projet.

Chaque fichier consolidé est autonome et documenté : il contient une table des matières, l'origine de chaque extrait de code (chemin source), et les métadonnées de traçabilité.

---

## 🗂️ Structure du Livrable

```
livrable/
├── README-LIVRABLE.md            ← Ce fichier (documentation générale)
│
├── sources/                      ← Code source consolidé par domaine métier
│   ├── backend-consolidated.md   ← API Node.js/Express/TypeScript
│   ├── frontend-consolidated.md  ← Interface Vue 3 + TypeScript + Pinia
│   ├── infrastructure-consolidated.md  ← Docker, Traefik, scripts
│   └── documentation-consolidated.md  ← Toute la documentation Markdown
│
├── architecture/                 ← Vues d'ensemble
│   ├── projet-complet.md         ← Architecture globale, stack, schéma BDD
│   └── dependances.md            ← Analyse des dépendances et audit de sécurité
│
└── deployment/                   ← Guides opérationnels
    ├── guide-installation.md     ← Installation, démarrage, configuration
    └── docker-compose-complet.yml ← Compose unifié (dev + prod)
```

---

## 🧭 Fils Conducteurs Pédagogiques

Ce livrable suit **trois fils conducteurs** complémentaires qui guident sa lecture selon l'angle d'approche :

### 1. Fil conducteur : Composants Métier

L'application est découpée en quatre domaines cohérents, chacun consolidé dans un fichier dédié :

| Composant | Fichier | Description |
|-----------|---------|-------------|
| **Backend** | `sources/backend-consolidated.md` | API REST Node.js/Express/TypeScript — authentification, gestion des notes, tags, feed, conformité RGPD |
| **Frontend** | `sources/frontend-consolidated.md` | Interface Vue 3, composants, stores Pinia, routeur, types TypeScript |
| **Infrastructure** | `sources/infrastructure-consolidated.md` | Dockerfiles multi-stage, Docker Compose (dev/prod), Traefik, scripts de sécurité |
| **Documentation** | `sources/documentation-consolidated.md` | Architecture, sécurité, RGPD, API, guides utilisateur |

**Fil de lecture recommandé** :
> `backend-consolidated.md` → `frontend-consolidated.md` → `infrastructure-consolidated.md`

---

### 2. Fil conducteur : Sécurité by Design

NOTIMATIC a été conçu selon les principes de **Sécurité by Design** (sécurité intégrée dès la conception, pas ajoutée en fin de projet). Ce fil conducteur met en évidence comment chaque couche de l'application intègre des mesures de sécurité.

**Principes appliqués** :

| Principe | Implémentation dans NOTIMATIC |
|----------|-------------------------------|
| **Moindre privilège** | RBAC 4 rôles (admin, technician, teacher, student) — chaque endpoint n'autorise que les rôles nécessaires |
| **Défense en profondeur** | Rate limiting + sanitization + validation Zod + requêtes paramétrées + CORS + CSP |
| **Fail Secure** | En cas d'erreur d'authentification → 401 (jamais de fallback non sécurisé) |
| **Zero Trust** | Access tokens JWT 15 min + refresh tokens rotatifs opaques 30 jours |
| **Réduction de la surface d'attaque** | Distroless pour le backend, `read_only: true` en prod Docker |
| **Traçabilité** | `audit_logs` — table BDD immuable pour toutes les actions critiques |
| **Conformité RGPD** | Export JSON, soft-delete, anonymisation des données utilisateur |
| **Scan continu** | Trivy (images Docker) + npm audit (dépendances) en CI/CD |

**Fil de lecture recommandé** :
> `architecture/projet-complet.md` (section Sécurité) → `sources/backend-consolidated.md` (middleware, auth) → `sources/documentation-consolidated.md` (SECURITY.md + GDPR.md)

---

### 3. Fil conducteur : Déploiement

Ce fil guide l'opérateur technique qui doit déployer l'application, depuis l'environnement de développement jusqu'à la mise en production Docker Swarm.

**Étapes de déploiement** :

| Étape | Document | Description |
|-------|----------|-------------|
| **1. Prérequis** | `deployment/guide-installation.md` | Versions requises, clonage, configuration des secrets |
| **2. Dev local** | `deployment/guide-installation.md` | Docker Compose dev, sans proxy |
| **3. Migrations BDD** | `deployment/guide-installation.md` | Script `migrate.sh` — 9 migrations SQL |
| **4. Production** | `deployment/docker-compose-complet.yml` | Docker Swarm, Traefik TLS, réseau overlay chiffré |
| **5. Sécurité ops** | `sources/infrastructure-consolidated.md` | Scan Trivy, signature Cosign, backup chiffré GPG |

**Fil de lecture recommandé** :
> `deployment/guide-installation.md` → `deployment/docker-compose-complet.yml` → `sources/infrastructure-consolidated.md`

---

## 📊 Résumé du Projet

### Métriques techniques

| Indicateur | Valeur |
|------------|--------|
| **Langage backend** | TypeScript 5.x (strict mode) |
| **Langage frontend** | TypeScript 5.x + Vue 3 SFC |
| **Base de données** | PostgreSQL 16 — 18 tables, 9 migrations |
| **Endpoints API** | 30+ endpoints REST (v1) |
| **Composants Vue** | 10 composants + 5 stores Pinia |
| **Tests backend** | Jest + Supertest |
| **Tests frontend** | Vitest + Vue Test Utils |
| **Sécurité** | Argon2id, JWT, Rate Limit, Helmet, Zod, DOMPurify |
| **CI/CD** | GitHub Actions (lint → test → Trivy → Docker Build) |

### Fonctionnalités livrées (v1.2.0)

- ✅ Authentification JWT HTTP-only (access 15 min + refresh 30 j rotatifs)
- ✅ RBAC 4 rôles avec contrôle granulaire par endpoint
- ✅ Feed d'actualités ciblé (Tags Unifiés + `note_targets`)
- ✅ CRUD complet des notes avec réactions et commentaires
- ✅ Tags Unifiés (`classe`, `specialite`, `groupe`, `categorie`)
- ✅ Profils utilisateurs étendus
- ✅ Sécurité : Rate limiting, Helmet CSP, Sanitization XSS, requêtes paramétrées
- ✅ RGPD : Export JSON, soft-delete, anonymisation, audit logs
- ✅ UI/UX : Dark/Light mode, Responsive, Loader
- ✅ Infrastructure : Docker Swarm, Traefik TLS, secrets Docker

---

## 🔍 Traçabilité

| Métadonnée | Valeur |
|------------|--------|
| Commit HEAD | `d43a8a27e16b58aad6e0639d1f329fed295f95f9` |
| Branche | `copilot/create-livrable-folder-structure` |
| Date consolidation | 2026-04-01 |
| Générateur | GitHub Copilot Agent |
| Dépôt source | https://github.com/elmaquito/NOTIMATIC |

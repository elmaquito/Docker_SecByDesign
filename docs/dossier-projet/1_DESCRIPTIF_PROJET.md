# NOTIMATIC — Descriptif du Projet

> **Référence** : Dossier Technique — Document 1/3  
> **Titre** : Descriptif du Projet — Objectifs, Description Fonctionnelle et Organisation  
> **Projet** : NOTIMATIC — Plateforme sécurisée de prise de notes éducatives  
> **Version** : v1.2.0  
> **Date** : 1er avril 2026  
> **Dépôt** : https://github.com/elmaquito/NOTIMATIC

---

## Sommaire

1. [Contexte et Problématique](#1-contexte-et-problématique)
2. [Objectifs du Projet](#2-objectifs-du-projet)
   - 2.1 [Objectifs Fonctionnels](#21-objectifs-fonctionnels)
   - 2.2 [Objectifs Non-Fonctionnels](#22-objectifs-non-fonctionnels)
3. [Description Fonctionnelle](#3-description-fonctionnelle)
   - 3.1 [Utilisateurs et Rôles](#31-utilisateurs-et-rôles)
   - 3.2 [Fonctionnalités par Rôle](#32-fonctionnalités-par-rôle)
   - 3.3 [Flux Applicatifs Principaux](#33-flux-applicatifs-principaux)
4. [Organisation du Projet](#4-organisation-du-projet)
   - 4.1 [Participants et Rôles Associés](#41-participants-et-rôles-associés)
   - 4.2 [Cycle de Développement](#42-cycle-de-développement)
5. [Périmètre MVP v1.0.0](#5-périmètre-mvp-v100)
6. [Reste à Faire (Post-v1.0.0)](#6-reste-à-faire-post-v100)

### Annexes
- [Annexe A — Glossaire](#annexe-a--glossaire)
- [Annexe B — Historique des Versions](#annexe-b--historique-des-versions)

---

## 1. Contexte et Problématique

### 1.1 Contexte Général

NOTIMATIC est un projet réalisé dans un cadre d'enseignement supérieur technique (formation Bac+2 à Bac+5 en informatique, cybersécurité et développement). L'établissement dispose d'enseignants, d'étudiants et de personnels techniques qui doivent partager et consulter des notes, annonces et ressources pédagogiques de manière structurée.

Les outils existants présentaient plusieurs limitations :
- **Canaux dispersés** : informations diffusées via email, messagerie instantanée, notes papier
- **Absence de ciblage** : une annonce d'un professeur ne pouvait pas être adressée spécifiquement à une classe ou une spécialité
- **Sécurité insuffisante** : pas d'authentification robuste, pas de traçabilité des accès
- **Non-conformité RGPD** : pas de procédure d'export ou de suppression des données personnelles

### 1.2 Problématique

> **Comment centraliser la diffusion d'informations pédagogiques au sein d'un établissement de formation, en garantissant la confidentialité des données, le contrôle d'accès par rôle, la traçabilité des actions et la conformité RGPD ?**

---

## 2. Objectifs du Projet

### 2.1 Objectifs Fonctionnels

| # | Objectif | Priorité | Statut |
|---|----------|----------|--------|
| OF-1 | Authentification sécurisée avec gestion de sessions | Haute | ✅ Implémenté |
| OF-2 | Gestion des utilisateurs par rôle (admin, technicien, enseignant, étudiant) | Haute | ✅ Implémenté |
| OF-3 | Création, lecture, modification et suppression de notes | Haute | ✅ Implémenté |
| OF-4 | Système de tags unifiés (classe, spécialité, groupe, catégorie) pour ciblage des notes | Haute | ✅ Implémenté |
| OF-5 | Feed d'actualités personnalisé selon le profil de l'utilisateur | Haute | ✅ Implémenté |
| OF-6 | Commentaires sur les notes | Haute | ✅ Implémenté |
| OF-7 | Système de réactions (👍, ❤️, etc.) | Moyenne | ✅ Implémenté |
| OF-8 | Gestion du profil utilisateur (classe, promotion, niveau) | Haute | ✅ Implémenté |
| OF-9 | Export et suppression des données personnelles (RGPD) | Haute | ✅ Implémenté |
| OF-10 | Réinitialisation de mot de passe par token | Moyenne | ✅ Implémenté |
| OF-11 | Authentification à deux facteurs (2FA TOTP) | Haute | 🔄 À faire |
| OF-12 | Interface d'administration des thèmes et catégories | Moyenne | 🔄 À faire |

### 2.2 Objectifs Non-Fonctionnels

| # | Objectif | Exigence | Statut |
|---|----------|----------|--------|
| ONF-1 | **Sécurité** — Authentification Zero-Trust (JWT 15 min + refresh tokens) | Obligatoire | ✅ |
| ONF-2 | **Sécurité** — Hachage Argon2id pour les mots de passe | Obligatoire | ✅ |
| ONF-3 | **Sécurité** — Rate limiting (API, Auth, Commentaires) | Obligatoire | ✅ |
| ONF-4 | **Sécurité** — Sanitization des entrées (validator.js + DOMPurify) | Obligatoire | ✅ |
| ONF-5 | **Sécurité** — En-têtes HTTP sécurisés (Helmet, CSP, HSTS, CORS strict) | Obligatoire | ✅ |
| ONF-6 | **Conformité** — RGPD : droit d'accès, export, effacement | Obligatoire | ✅ |
| ONF-7 | **DevSecOps** — Pipeline CI/CD avec lint, tests, couverture, scan Trivy | Obligatoire | ✅ |
| ONF-8 | **Infrastructure** — Déploiement Docker avec réseau segmenté | Obligatoire | ✅ |
| ONF-9 | **Maintenabilité** — Migration TypeScript (backend + frontend) | Haute | ✅ |
| ONF-10 | **Accessibilité** — Conformité WCAG AA | Moyenne | 🔄 À faire |

---

## 3. Description Fonctionnelle

### 3.1 Utilisateurs et Rôles

NOTIMATIC définit quatre rôles utilisateur distincts, gérés via un type `ENUM` PostgreSQL et enforced au niveau du middleware `authorize()`.

```
user_role ENUM: 'admin' | 'technician' | 'teacher' | 'student'
```

| Rôle | Description | Mode de création |
|------|-------------|------------------|
| **admin** | Administrateur système — accès total | Via `POST /api/v1/users/setup` (1er admin) ou par un admin existant |
| **technician** | Technicien — gestion des utilisateurs, administration | Créé par admin ou technician |
| **teacher** | Enseignant — création de notes, gestion des tags | Créé par admin ou technician |
| **student** | Étudiant — lecture du feed, création de notes personnelles | Créé par admin ou technician |

### 3.2 Fonctionnalités par Rôle

#### Administrateur (`admin`)
- ✅ Créer, lire, modifier, supprimer **tous les utilisateurs**
- ✅ Exporter et supprimer les données personnelles (RGPD) de n'importe quel utilisateur
- ✅ Créer, modifier, supprimer les tags (classe, spécialité, groupe, catégorie)
- ✅ Accès en lecture à tous les logs d'audit
- ✅ Toutes les capacités enseignant et technicien

#### Technicien (`technician`)
- ✅ Créer et lister les utilisateurs (sauf suppression)
- ✅ Gérer les tags (créer, modifier)
- ✅ Lire toutes les notes

#### Enseignant (`teacher`)
- ✅ Créer des notes ciblées par tag (classe, spécialité, groupe)
- ✅ Modifier et supprimer ses propres notes
- ✅ Ajouter des tags à des notes
- ✅ Consulter le feed global
- ✅ Lire la liste des utilisateurs
- ✅ Créer et modifier des tags

#### Étudiant (`student`)
- ✅ Consulter le feed personnalisé (notes correspondant à son profil)
- ✅ Créer des notes personnelles
- ✅ Commenter les notes
- ✅ Réagir aux notes (👍, ❤️, etc.)
- ✅ Consulter et modifier son propre profil
- ✅ Exporter ses propres données personnelles (RGPD)

### 3.3 Flux Applicatifs Principaux

#### Flux de Connexion

```
┌─────────────┐    POST /api/v1/auth/login    ┌─────────────────┐
│   Frontend  │ ─────────────────────────────► │  Backend (API)  │
│   Vue 3     │  { username, password }        │  Express + TS   │
│             │ ◄───────────────────────────── │                 │
│             │  Cookie: auth_token (JWT 15m)  │  Argon2id vérif.│
│             │  Cookie: refresh_token (30j)   │  → sessions BDD │
└─────────────┘                                └─────────────────┘
```

#### Flux de Consultation du Feed

```
┌─────────────┐  GET /api/v1/feed              ┌─────────────────┐    ┌──────────────┐
│   Frontend  │ ─────────────────────────────► │  Backend (API)  │───►│  PostgreSQL  │
│   Feed.vue  │  Cookie: auth_token            │  feedController │    │              │
│             │ ◄───────────────────────────── │                 │◄───│  JOIN notes  │
│             │  [ { note, tags, reactions } ] │  Filtrage par   │    │  + note_tags │
│             │                                │  profil/tags    │    │  + profiles  │
└─────────────┘                                └─────────────────┘    └──────────────┘
```

Le feed filtre les notes selon :
1. Les tags de classe correspondant à la `classe` du profil de l'étudiant
2. Les tags de spécialité correspondant à sa `promotion`
3. Les notes `public` (tag `Tous`)

#### Flux de Création de Note (Enseignant)

```
┌─────────────────────┐
│ Enseignant           │
│ 1. Rédige le titre  │
│    et le contenu    │
│ 2. Sélectionne les  │
│    tags (classe,    │
│    spécialité)      │
│ 3. Publie           │
└────────┬────────────┘
         │ POST /api/v1/notes
         ▼
┌──────────────────────┐
│ authenticate()       │  Vérification JWT
│ authorize(['teacher',│  Vérification rôle
│   'admin', ...])     │
└────────┬─────────────┘
         │ POST /api/v1/notes/:id/tags
         ▼
┌──────────────────────┐
│ notes table          │  INSERT INTO notes
│ note_tags table      │  INSERT INTO note_tags (note_id, tag_id)
│ audit_logs table     │  INSERT INTO audit_logs
└──────────────────────┘
```

---

## 4. Organisation du Projet

### 4.1 Participants et Rôles Associés

| Participant | Rôle dans le Projet | Responsabilités |
|-------------|---------------------|-----------------|
| **elmaquito** (auteur) | Chef de projet & Développeur principal | Architecture logicielle, définition des exigences, validation des livrables, intégration finale |
| **GitHub Copilot Agent** | Assistant technique IA | Implémentation des fonctionnalités, rédaction de la documentation technique, revue de code, corrections de sécurité |
| **copilot-pull-request-reviewer** | Reviewer automatisé | Revue de code sur chaque Pull Request (commentaires techniques et de sécurité) |

> **Note sur la méthode de travail** : Le développement a suivi un modèle de collaboration humain-IA. L'auteur définissait les exigences fonctionnelles et de sécurité, l'agent Copilot implémentait et documentait, puis l'auteur validait via les Pull Requests GitHub.

### 4.2 Cycle de Développement

Le projet a suivi une méthodologie itérative organisée en versions :

```
v0.1.0 → Auth (JWT) + CRUD Notes de base
    ↓
v0.2.0 → Profils utilisateurs + DB migrations
    ↓
v0.3.0 → Commentaires + Feed simple
    ↓
v0.4.0 → Tags unifiés + Ciblage des notes
    ↓
v0.5.0 → Sécurité avancée (rate limiting, sanitization, audit logs, RGPD)
    ↓
v0.6.0 → CI/CD pipeline (lint, tests, Trivy, npm audit)
    ↓
v0.7.0 → Frontend Vue 3 + TypeScript + Pinia (migration)
    ↓
v1.0.0 → MVP complet — Réactions + stabilisation
    ↓
PR #18  → CI Fix — Strict Workflow (couverture, matrix Node 18/20, permissions)
    ↓
v1.2.0 → État actuel — Documentation & consolidation
```

**Outils de collaboration** :
- **GitHub** : Dépôt, Issues, Pull Requests, Actions (CI/CD)
- **GitHub Copilot** : Assistance au développement
- **Pull Request Reviews** : Validation systématique avant merge

---

## 5. Périmètre MVP v1.0.0

Le MVP (Minimum Viable Product) v1.0.0 incluait les fonctionnalités suivantes, toutes livrées et validées :

| Domaine | Fonctionnalité | Endpoints |
|---------|---------------|-----------|
| **Auth** | Connexion / déconnexion | `POST /auth/login`, `POST /auth/logout` |
| **Auth** | Refresh token Zero-Trust | `POST /auth/refresh` |
| **Auth** | Réinitialisation mot de passe | `POST /auth/request-password-reset`, `POST /auth/reset-password` |
| **Users** | Gestion des comptes | `GET/PUT /users/me`, `POST/GET /users` |
| **Users** | Profils éducatifs | `GET/PUT /users/:id/profile` |
| **Users** | RGPD (export/suppression) | `GET /users/:id/export`, `DELETE /users/:id` |
| **Notes** | CRUD complet | `GET/POST /notes`, `GET/PATCH/DELETE /notes/:id` |
| **Notes** | Tags sur notes | `GET/POST /notes/:id/tags` |
| **Notes** | Réactions | `GET/POST /notes/:id/reactions` |
| **Tags** | Système unifié | `GET/POST /tags`, `PATCH/DELETE /tags/:id` |
| **Feed** | Feed personnalisé | `GET /feed` |
| **Metadata** | Thèmes et catégories | `GET /themes`, `GET /categories` |
| **CI/CD** | Pipeline strict | Lint, Tests, Coverage, Trivy, npm audit |

---

## 6. Reste à Faire (Post-v1.0.0)

### Priorité Haute

| Feature | Description | Impact |
|---------|-------------|--------|
| **2FA TOTP** | Authentification à deux facteurs (Google Authenticator/Authy) | Sécurité — obligatoire pour les comptes admin |
| **Endpoint audit admin** | `GET /api/v1/audit` avec pagination et filtres de date/action | Conformité — consultation des logs d'audit |
| **Tests E2E** | Playwright — tests bout-en-bout sur les flux principaux | Qualité — couverture fonctionnelle |

### Priorité Moyenne

| Feature | Description |
|---------|-------------|
| **ThemeManager.vue** | Interface d'administration des thèmes (admin/teacher) |
| **CategoryManager.vue** | Interface d'administration des catégories |
| **Conformité WCAG AA** | Accessibilité (contrastes, navigation clavier, ARIA) |
| **ESLint frontend** | Configuration ESLint + TypeScript strict côté Vue 3 |

### Priorité Basse

| Feature | Description |
|---------|-------------|
| **Swagger/OpenAPI** | Documentation interactive de l'API REST |
| **Recherche full-text** | PostgreSQL `tsvector` + `tsquery` sur les notes |
| **Monitoring** | Métriques applicatives (Prometheus/Grafana) |

---

## Annexe A — Glossaire

| Terme | Définition |
|-------|-----------|
| **JWT** | JSON Web Token — format de token d'authentification signé |
| **Refresh Token** | Token de longue durée permettant de renouveler un JWT expiré |
| **Zero-Trust** | Modèle de sécurité : aucune confiance implicite, chaque requête est vérifiée |
| **Argon2id** | Algorithme de hachage de mots de passe résistant aux attaques GPU (recommandé OWASP) |
| **RBAC** | Role-Based Access Control — contrôle d'accès basé sur les rôles |
| **RGPD** | Règlement Général sur la Protection des Données (UE 2016/679) |
| **CSP** | Content Security Policy — directive HTTP limitant les ressources chargées |
| **HSTS** | HTTP Strict Transport Security — force l'utilisation de HTTPS |
| **Tag** | Étiquette associée à une note pour le ciblage (classe, spécialité, groupe, catégorie) |
| **Feed** | Fil d'actualités personnalisé affichant les notes correspondant au profil de l'utilisateur |
| **Trivy** | Scanner de vulnérabilités pour images Docker (Aqua Security) |
| **MVP** | Minimum Viable Product — version minimale fonctionnelle livrable |

---

## Annexe B — Historique des Versions

| Version | Date | Statut | Principales Fonctionnalités |
|---------|------|--------|------------------------------|
| `0.1.0-alpha` | Déc. 2024 | ✅ Complété | Auth JWT, CRUD Notes, structure BDD de base |
| `0.2.0-alpha` | Déc. 2024 | ✅ Complété | Profils utilisateurs, migrations BDD |
| `0.3.0` | Déc. 2024 | ✅ Complété | Commentaires, Feed simple |
| `0.4.0` | Déc. 2024 | ✅ Complété | Tags unifiés, ciblage des notes |
| `0.5.0` | Déc. 2024 | ✅ Complété | Sécurité avancée (rate limiting, audit, RGPD) |
| `0.6.0` | Janv. 2026 | 🔄 En cours | CI/CD pipeline (couverture non atteinte) |
| `0.7.0` | Fév. 2026 | 🔄 En cours | Frontend Vue 3 TypeScript (WCAG non implémenté) |
| `1.0.0` | Mars 2026 | ✅ Complété | Réactions, stabilisation MVP |
| PR #18 | Mars 2026 | ✅ Fusionné | CI Fix — strict workflow, matrix Node 18/20 |
| `1.2.0` | Avr. 2026 | ✅ Actuel | Documentation, consolidation, corrections |

---

**Auteur** : elmaquito (révision par GitHub Copilot Agent)  
**Dépôt** : https://github.com/elmaquito/NOTIMATIC  
**Licence** : Projet pédagogique — usage académique  
**Date** : 1er avril 2026

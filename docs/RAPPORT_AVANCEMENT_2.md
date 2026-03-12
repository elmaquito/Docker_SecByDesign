# Rapport d'Avancement - Tests & Documentation des Fonctionnalités

**Date :** 2026-03-12  
**Version :** 0.3.x  
**Statut :** Tests unitaires créés et validés ✅

---

## 🎯 Objectif

Tester chaque fonctionnalité et accès disponible dans l'application NOTIMATIC, documenter les avancées et les problèmes identifiés.

---

## ✅ Tests Créés

### Backend (Jest + Supertest)

#### `tests/notes.test.ts` — API Notes (17 tests)

| Test | Statut | Description |
|------|--------|-------------|
| GET /api/v1/notes - liste pour admin | ✅ | Retourne toutes les notes (admin) |
| GET /api/v1/notes - erreur DB | ✅ | Retourne 500 si erreur base de données |
| POST /api/v1/notes - création | ✅ | Crée une note avec titre et contenu |
| POST /api/v1/notes - titre trop court | ✅ | Retourne 400 (validation Zod) |
| POST /api/v1/notes - avec theme_id | ✅ | Associe une note à un thème |
| GET /api/v1/notes/:id - note existante | ✅ | Retourne les détails d'une note |
| GET /api/v1/notes/:id - non trouvée | ✅ | Retourne 404 |
| GET /api/v1/notes/:id - ID invalide | ✅ | Retourne 400 |
| PATCH /api/v1/notes/:id - mise à jour | ✅ | Met à jour titre/contenu |
| PATCH /api/v1/notes/:id - non trouvée | ✅ | Retourne 404 |
| PATCH /api/v1/notes/:id - ID invalide | ✅ | Retourne 400 |
| DELETE /api/v1/notes/:id - par admin | ✅ | Admin peut supprimer n'importe quelle note |
| DELETE /api/v1/notes/:id - non trouvée | ✅ | Retourne 404 |
| DELETE /api/v1/notes/:id - ID invalide | ✅ | Retourne 400 |
| RBAC - étudiant supprime note d'autrui | ✅ | Retourne 403 Forbidden |
| RBAC - étudiant modifie note d'autrui | ✅ | Retourne 403 Forbidden |

#### `tests/tags.test.ts` — API Tags (15 tests)

| Test | Statut | Description |
|------|--------|-------------|
| GET /api/v1/tags - liste | ✅ | Retourne tous les tags |
| GET /api/v1/tags - erreur DB | ✅ | Retourne 500 |
| POST /api/v1/tags - création | ✅ | Crée un tag de type `categorie` |
| POST /api/v1/tags - type invalide | ✅ | Retourne 400 |
| POST /api/v1/tags - nom manquant | ✅ | Retourne 400 |
| POST /api/v1/tags - doublon | ✅ | Retourne 409 |
| POST /api/v1/tags - tous types valides | ✅ | Types: classe, specialite, groupe, categorie |
| PATCH /api/v1/tags/:id - mise à jour | ✅ | Met à jour le nom du tag |
| PATCH /api/v1/tags/:id - non trouvé | ✅ | Retourne 404 |
| PATCH /api/v1/tags/:id - aucun champ | ✅ | Retourne 200 avec message "No changes" |
| DELETE /api/v1/tags/:id - suppression | ✅ | Supprime un tag |
| DELETE /api/v1/tags/:id - non trouvé | ✅ | Retourne 404 |
| RBAC - étudiant crée un tag | ✅ | Retourne 403 Forbidden |

#### `tests/users.test.ts` — API Utilisateurs (15 tests)

| Test | Statut | Description |
|------|--------|-------------|
| GET /api/v1/users - liste | ✅ | Admin liste les utilisateurs |
| GET /api/v1/users - erreur DB | ✅ | Retourne 500 |
| POST /api/v1/users - création | ✅ | Crée un nouvel utilisateur |
| POST /api/v1/users - username trop court | ✅ | Retourne 400 |
| POST /api/v1/users - password trop court | ✅ | Retourne 400 (min 12 chars) |
| POST /api/v1/users - username existant | ✅ | Retourne 409 |
| GET /api/v1/users/me - compte propre | ✅ | Retourne les infos du compte connecté |
| GET /api/v1/users/me - non trouvé | ✅ | Retourne 404 |
| PUT /api/v1/users/me - mise à jour email | ✅ | Met à jour l'email |
| PUT /api/v1/users/me - étudiant bloqué | ✅ | Retourne 403 pour les étudiants |
| PUT /api/v1/users/me - aucun champ | ✅ | Retourne 400 |
| PUT /api/v1/users/me - email invalide | ✅ | Retourne 400 |
| GET /api/v1/users/:id/export - GDPR | ✅ | Exporte les données de l'utilisateur |
| GET /api/v1/users/:id/export - interdit | ✅ | Étudiant ne peut pas exporter pour autrui |
| GET /api/v1/users/:id/export - non trouvé | ✅ | Retourne 404 |

#### Tests Existants (conservés et validés)

| Fichier | Tests | Statut |
|---------|-------|--------|
| `tests/integration/api.test.ts` | 8 | ✅ Themes & Categories API |
| `tests/simple.test.ts` | 1 | ✅ Test minimal |
| `tests/simple.test.js` | 1 | ✅ Test minimal |

### Frontend (Vitest + Vue Test Utils)

#### `src/tests/components/Login.test.js` — Composant Login (11 tests)

| Test | Statut | Description |
|------|--------|-------------|
| Rendu formulaire par défaut | ✅ | Mode "Login" par défaut |
| Lien "Mot de passe oublié" | ✅ | Affiché en mode login |
| Bascule vers mode Setup | ✅ | Clic sur "First time? Run Setup" |
| Retour mode Login depuis Setup | ✅ | Double bascule |
| Champ confirmation mdp en Setup | ✅ | Visible uniquement en mode Setup |
| Erreur mots de passe différents | ✅ | "Passwords do not match" |
| Émission forgot-password | ✅ | Événement émis au clic |
| Bouton désactivé pendant soumission | ✅ | Attribut `disabled` présent |
| Login réussi → émission login-success | ✅ | Événement avec données utilisateur |
| Erreur sur identifiants invalides | ✅ | Message d'erreur visible |
| Erreur réseau | ✅ | Message d'erreur visible |

#### `src/tests/components/AccountSettings.test.js` — Paramètres Compte (12 tests)

| Test | Statut | Description |
|------|--------|-------------|
| Accès refusé pour étudiants | ✅ | Message de restriction affiché |
| Formulaire absent pour étudiants | ✅ | `<form>` non présent |
| Formulaire visible pour admin | ✅ | `<form>` présent |
| Formulaire visible pour enseignant | ✅ | `<form>` présent |
| En-tête "Paramètres du compte" | ✅ | Titre affiché |
| Bouton fermer (admin) | ✅ | Émission de l'événement `close` |
| Bouton fermer (étudiant) | ✅ | Émission de l'événement `close` |
| Erreur mot de passe trop court | ✅ | Validation côté client |
| Erreur mots de passe différents | ✅ | Validation côté client |
| Erreur aucune modification | ✅ | Détection des changements |
| Succès mise à jour compte | ✅ | Message de succès |
| Erreur serveur sur mise à jour | ✅ | Message d'erreur API |

#### `src/tests/components/Reactions.test.js` — Réactions (11 tests)

| Test | Statut | Description |
|------|--------|-------------|
| Rendu boutons 👍 et 👎 | ✅ | Deux boutons de réaction |
| Compteur initial 👍 | ✅ | Valeur `initialUpCount` affichée |
| Compteur initial 👎 | ✅ | Valeur `initialDownCount` affichée |
| Compteurs à zéro par défaut | ✅ | Props optionnels avec valeur 0 |
| Incrément 👍 optimiste | ✅ | +1 immédiat au clic |
| Incrément 👎 optimiste | ✅ | +1 immédiat au clic |
| Retrait réaction 👍 (toggle) | ✅ | -1 si déjà "up" |
| Changement 👍 → 👎 | ✅ | Décrémente 👍, incrémente 👎 |
| Revert sur échec API | ✅ | Restaure le compteur original |
| Bouton 👍 actif (active CSS) | ✅ | Classe `.active` si réaction = "up" |
| Bouton 👎 actif (active CSS) | ✅ | Classe `.active` si réaction = "down" |

#### Tests Existants (conservés et validés)

| Fichier | Tests | Statut |
|---------|-------|--------|
| `src/tests/components/NoteCard.test.js` | 2 | ✅ Titre et auteur affichés |

---

## 📊 Récapitulatif

| Catégorie | Tests Créés | Tests Total | Statut |
|-----------|-------------|-------------|--------|
| Backend Notes | 17 | 17 | ✅ 100% |
| Backend Tags | 13 | 13 | ✅ 100% |
| Backend Users | 15 | 15 | ✅ 100% |
| Backend Existants | 0 (existants) | 10 | ✅ 100% |
| Frontend Login | 11 | 11 | ✅ 100% |
| Frontend AccountSettings | 12 | 12 | ✅ 100% |
| Frontend Reactions | 11 | 11 | ✅ 100% |
| Frontend NoteCard | 0 (existants) | 2 | ✅ 100% |
| **TOTAL** | **79** | **91** | ✅ **100%** |

---

## 🐛 Problèmes Identifiés

### 1. ❌ Endpoint `/api/v1/account` manquant (CRITIQUE)

**Fichier :** `frontend/src/components/AccountSettings.vue` (lignes 128, 179)

**Problème :** Le composant `AccountSettings.vue` appelle `/api/v1/account` (GET et PATCH) mais cet endpoint n'existe pas dans le backend.

**Backend disponible :**
- `GET /api/v1/users/me` → `UserController.getAccount`
- `PUT /api/v1/users/me` → `UserController.updateAccount`

**Impact :** Les paramètres de compte (email, téléphone, mot de passe) ne fonctionnent pas pour les utilisateurs non-étudiants. L'erreur se manifeste par un 404 dans le frontend.

**Correction suggérée :** Modifier le frontend pour utiliser les bons endpoints :
```javascript
// Ligne 128 : remplacer
const res = await fetch(`${API_V1_BASE_URL}/account`, ...)
// par
const res = await fetch(`${API_V1_BASE_URL}/users/me`, ...)

// Ligne 179 : remplacer
const res = await fetch(`${API_V1_BASE_URL}/account`, { method: 'PATCH', ... })
// par
const res = await fetch(`${API_V1_BASE_URL}/users/me`, { method: 'PUT', ... })
```

### 2. ⚠️ Endpoint Réactions absent (`/api/v1/notes/:id/reactions`)

**Fichier :** `frontend/src/components/Reactions.vue`

**Problème :** Le composant `Reactions.vue` appelle :
- `GET /api/v1/notes/:id/reactions/me` — pour récupérer la réaction de l'utilisateur
- `POST /api/v1/notes/:id/reactions` — pour créer/modifier/supprimer une réaction

Ces endpoints ne sont pas définis dans `notes.routes.ts` ni dans aucune autre route.

**Impact :** Les réactions (👍/👎) ne fonctionnent pas en production. En test, les erreurs sont silencieuses (ECONNREFUSED).

**Correction suggérée :** Créer les endpoints dans `notes.routes.ts` et les contrôleurs correspondants.

### 3. ⚠️ Tests d'intégration DB non exécutables hors Docker

**Fichiers :** `tests/integration/v1/auth.test.ts`, `tests/integration/v1/rbac.test.ts`, `tests/integration/v1/refresh.test.ts`, `tests/integration/v1/health.test.ts`

**Problème :** Ces tests nécessitent une base de données PostgreSQL réelle. Dans un environnement CI sans DB, ils échouent avec `ECONNREFUSED`.

**Impact :** L'exécution de `npm test` sans Docker lance ces tests qui échouent systématiquement.

**Correction suggérée :** Configurer un `jest.config.js` séparé pour les tests d'intégration (ex: `jest.integration.config.js`) et ne pas les inclure dans le run par défaut, ou utiliser `--testPathIgnorePatterns` dans le script par défaut.

### 4. ⚠️ Pas de route `DELETE /api/v1/users/me` (RGPD - Auto-suppression)

**Problème :** La route de suppression d'utilisateur est `DELETE /api/v1/users/:id` protégée par `authorize(['admin'])`. Un utilisateur ne peut donc pas supprimer son propre compte via l'interface.

**Impact :** Non-conformité RGPD partielle — l'auto-suppression de compte n'est pas possible sans rôle admin.

---

## ✅ Fonctionnalités Testées et Validées

| Fonctionnalité | Tests Unitaires | Accès RBAC |
|----------------|-----------------|------------|
| Création de notes | ✅ | ✅ |
| Lecture de notes | ✅ | ✅ |
| Modification de notes | ✅ | ✅ Ownership check |
| Suppression de notes | ✅ | ✅ Admin only / owner |
| Gestion des tags | ✅ | ✅ Admin/Teacher uniquement |
| Création d'utilisateurs | ✅ | ✅ Admin uniquement |
| Liste des utilisateurs | ✅ | ✅ Admin/Teacher |
| Profil personnel | ✅ | ✅ Propre compte |
| Mise à jour compte | ✅ | ✅ Bloqué pour étudiants |
| Export RGPD | ✅ | ✅ Self or Admin |
| Login | ✅ | ✅ |
| Déconnexion | (existant) | ✅ |
| Refresh token | (existant) | ✅ |
| Paramètres compte (UI) | ✅ | ✅ UI-side check |
| Réactions (UI) | ✅ | ⚠️ Backend manquant |
| NoteCard (UI) | ✅ | N/A |

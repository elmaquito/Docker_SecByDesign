# NOTIMATIC — Frontend Consolidé

> **Domaine** : Interface utilisateur Vue 3 / TypeScript / Pinia  
> **Date de consolidation** : 2026-04-01  
> **Commit de référence** : `d43a8a27e16b58aad6e0639d1f329fed295f95f9`  
> **Répertoire source** : `frontend/`

---

## Table des Matières

1. [Métadonnées](#1-métadonnées)
2. [Point d'entrée — `src/main.ts`](#2-point-dentrée--srcmaints)
3. [Application — `src/App.vue`](#3-application--srcappvue)
4. [Configuration API — `src/config/api.ts`](#4-configuration-api--srcconfigapits)
5. [Routeur — `src/router/index.ts`](#5-routeur--srcrouterindexts)
6. [Stores Pinia — `src/stores/`](#6-stores-pinia--srcstores)
   - 6.1 [`auth.ts`](#61-authts)
   - 6.2 [`note.ts`](#62-notets)
   - 6.3 [`tag.ts`](#63-tagts)
   - 6.4 [`feed.ts`](#64-feedts)
   - 6.5 [`user.ts`](#65-userts)
7. [Composants — `src/components/`](#7-composants--srccomponents)
   - 7.1 [`Login.vue`](#71-loginvue)
   - 7.2 [`Dashboard.vue`](#72-dashboardvue)
   - 7.3 [`Feed.vue`](#73-feedvue)
   - 7.4 [`NoteCard.vue`](#74-notecardvue)
   - 7.5 [`CreateNoteModal.vue`](#75-createnotemodelvue)
   - 7.6 [`AccountSettings.vue`](#76-accountsettingsvue)
   - 7.7 [`ForgotPassword.vue`](#77-forgotpasswordvue)
   - 7.8 [`ResetPassword.vue`](#78-resetpasswordvue)
   - 7.9 [`Reactions.vue`](#79-reactionsvue)
   - 7.10 [`Loader.vue`](#710-loadervue)
8. [Types — `src/types/models.ts`](#8-types--srctypesmodelsts)
9. [Utilitaires — `src/utils/`](#9-utilitaires--srcutils)
   - 9.1 [`sanitize.js`](#91-sanitizejs)
   - 9.2 [`theme.ts`](#92-themets)
10. [Composables — `src/composables/`](#10-composables--srccomposables)
11. [Configuration Projet](#11-configuration-projet)

---

## 1. Métadonnées

| Champ | Valeur |
|-------|--------|
| **Framework** | Vue 3.3.4 (Composition API + `<script setup>`) |
| **Langage** | TypeScript 5.x |
| **Bundler** | Vite 4.4.5 |
| **State Management** | Pinia 3.x |
| **Routing** | Vue Router 5.x |
| **Tests** | Vitest 4.x + Vue Test Utils 2.x |
| **Sanitization** | DOMPurify 3.x |

**Pratiques de sécurité identifiées dans ce composant** :
- Sanitization de tout contenu affiché via `DOMPurify` (wrapper `utils/sanitize.js`)
- Authentification vérifiée via cookies HTTP-only (la présence du cookie `auth_token` est contrôlée par le routeur)
- Navigation guard dans le routeur (`router.beforeEach`) — redirection vers `/login` si non authentifié
- Aucun token JWT n'est stocké dans `localStorage` ou `sessionStorage` (HTTP-only uniquement)
- Les stores ne persistent pas les credentials

---

## 2. Point d'entrée — `src/main.ts`

> **Source** : `frontend/src/main.ts`

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

---

## 3. Application — `src/App.vue`

> **Source** : `frontend/src/App.vue`

Le composant racine monte le `<RouterView />` et gère le thème global (dark/light mode) via le composable `useTheme`. Il n'y a pas de navigation globale dans `App.vue` — la navigation est gérée par chaque composant individuellement.

---

## 4. Configuration API — `src/config/api.ts`

> **Source** : `frontend/src/config/api.ts`

```typescript
/**
 * Détermine dynamiquement l'URL de base de l'API selon les variables d'environnement.
 * Priority : VITE_API_URL > VITE_API_HOST > auto-détection hostname
 * L'auto-détection garantit que les cookies fonctionnent en dev (localhost vs 127.0.0.1)
 */
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL)  return import.meta.env.VITE_API_URL
  if (import.meta.env.VITE_API_HOST) {
    const protocol = import.meta.env.VITE_API_PROTOCOL || 'http:'
    const host     = import.meta.env.VITE_API_HOST
    const port     = import.meta.env.VITE_API_PORT || '3001'
    return `${protocol}//${host}:${port}`
  }
  // Fallback : match du hostname courant pour que les cookies fonctionnent
  const hostname = window.location.hostname
  const protocol = window.location.protocol
  const apiPort  = import.meta.env.VITE_API_PORT || '3001'
  return `${protocol}//${hostname}:${apiPort}`
}

export const API_BASE_URL    = getApiBaseUrl()
export const API_V1_BASE_URL = `${API_BASE_URL}/api/v1`
```

**Variables d'environnement** :

| Variable | Exemple | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3001` | URL complète de l'API |
| `VITE_API_HOST` | `localhost` | Hostname de l'API |
| `VITE_API_PORT` | `3001` | Port de l'API |
| `VITE_API_PROTOCOL` | `http:` | Protocole |

---

## 5. Routeur — `src/router/index.ts`

> **Source** : `frontend/src/router/index.ts`

```typescript
import { createRouter, createWebHistory } from 'vue-router'
import Dashboard       from '../components/Dashboard.vue'
import Login           from '../components/Login.vue'
import ForgotPassword  from '../components/ForgotPassword.vue'
import ResetPassword   from '../components/ResetPassword.vue'

const routes = [
  { path: '/',                  name: 'Dashboard',     component: Dashboard,      meta: { requiresAuth: true } },
  { path: '/login',             name: 'Login',         component: Login           },
  { path: '/forgot-password',   name: 'ForgotPassword', component: ForgotPassword },
  { path: '/reset-password',    name: 'ResetPassword', component: ResetPassword   },
]

const router = createRouter({ history: createWebHistory(), routes })

// Navigation Guard — vérification de l'authentification
router.beforeEach((to, from, next) => {
  const isAuthenticated = document.cookie.includes('auth_token')
  if (to.meta.requiresAuth && !isAuthenticated) next('/login')
  else next()
})

export default router
```

---

## 6. Stores Pinia — `src/stores/`

### 6.1 `auth.ts`

> **Source** : `frontend/src/stores/auth.ts`

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { User, UserRole } from '../types/models'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin    = computed(() => user.value?.role === UserRole.ADMIN)
  const isTeacher  = computed(() => user.value?.role === UserRole.TEACHER)
  const isStudent  = computed(() => user.value?.role === UserRole.STUDENT)

  function setUser(newUser: User | null) { user.value = newUser }
  function logout() { user.value = null }

  return { user, isAuthenticated, isAdmin, isTeacher, isStudent, setUser, logout }
})
```

### 6.2 `note.ts`

> **Source** : `frontend/src/stores/note.ts`

Store gérant les notes (CRUD), les commentaires et les réactions. Communique avec `/api/v1/notes` via `fetch` avec `credentials: 'include'` (cookies HTTP-only).

### 6.3 `tag.ts`

> **Source** : `frontend/src/stores/tag.ts`

Store des Tags Unifiés. Charge les tags depuis `/api/v1/tags` et expose les filtres par type (`classe`, `specialite`, `groupe`, `categorie`).

### 6.4 `feed.ts`

> **Source** : `frontend/src/stores/feed.ts`

Store du feed ciblé. Charge les notes depuis `/api/v1/feed` — uniquement les notes dont les tags correspondent aux tags assignés à l'utilisateur.

### 6.5 `user.ts`

> **Source** : `frontend/src/stores/user.ts`

Store utilisateurs. Permet aux admins de lister/créer des utilisateurs (`/api/v1/users`). Gère également le profil et les opérations RGPD (export, suppression).

---

## 7. Composants — `src/components/`

### 7.1 `Login.vue`

> **Source** : `frontend/src/components/Login.vue`

Formulaire de connexion. Appelle `POST /api/v1/auth/login`. Les cookies JWT sont placés automatiquement par le backend (HTTP-only). En cas de succès, redirige vers `/`.

**Sécurité** : le mot de passe n'est jamais stocké côté client.

### 7.2 `Dashboard.vue`

> **Source** : `frontend/src/components/Dashboard.vue`

Composant principal post-authentification. Orchestre l'affichage des notes, le sélecteur de tags, le bouton de création de note et la navigation vers les paramètres de compte.

### 7.3 `Feed.vue`

> **Source** : `frontend/src/components/Feed.vue`

Affiche le feed ciblé de l'utilisateur. Utilise le store `feed` pour charger les notes filtrées. Gère le rafraîchissement, l'affichage des tags et les interactions (réactions, commentaires).

### 7.4 `NoteCard.vue`

> **Source** : `frontend/src/components/NoteCard.vue`

Carte d'une note individuelle. Affiche le titre, le contenu (sanitisé via DOMPurify), les tags, les réactions et les commentaires. Gère l'édition inline pour les auteurs et admins.

```vue
<!-- Exemple : sanitization du contenu -->
<div v-html="sanitize(note.content)" class="note-content"></div>
```

### 7.5 `CreateNoteModal.vue`

> **Source** : `frontend/src/components/CreateNoteModal.vue`

Modal de création de note. Formulaire avec sélection de tags, ciblage (targets) et prévisualisation. Appelle `POST /api/v1/notes`.

### 7.6 `AccountSettings.vue`

> **Source** : `frontend/src/components/AccountSettings.vue`

Paramètres du compte utilisateur. Permet la modification de l'email, du téléphone et du mot de passe. Déclenche l'export RGPD (`GET /api/v1/users/:id/export`) et la suppression de compte.

### 7.7 `ForgotPassword.vue`

> **Source** : `frontend/src/components/ForgotPassword.vue`

Formulaire de demande de réinitialisation de mot de passe. Appelle `POST /api/v1/auth/request-password-reset`. Affiche un message générique (ne révèle pas si le username existe — protection contre l'énumération).

### 7.8 `ResetPassword.vue`

> **Source** : `frontend/src/components/ResetPassword.vue`

Formulaire de réinitialisation avec le token reçu par email. Appelle `POST /api/v1/auth/reset-password`. Valide côté client que le nouveau mot de passe fait au minimum 12 caractères.

### 7.9 `Reactions.vue`

> **Source** : `frontend/src/components/Reactions.vue`

Composant de réactions (👍/👎) sur les notes. Toggle logique — appeler une deuxième fois retire la réaction.

### 7.10 `Loader.vue`

> **Source** : `frontend/src/components/Loader.vue`

Spinner de chargement affiché pendant les appels API asynchrones. Utilisé dans tous les composants qui font des requêtes réseau.

---

## 8. Types — `src/types/models.ts`

> **Source** : `frontend/src/types/models.ts`

```typescript
export enum UserRole {
  ADMIN    = 'admin',
  TEACHER  = 'teacher',
  STUDENT  = 'student'
}

export interface User {
  id: number; username: string; role: UserRole;
  email?: string; phone?: string;
  created_at?: string; updated_at?: string; profile?: UserProfile;
}

export interface UserProfile {
  id: number; user_id: number;
  classe?: string; promo?: string; niveau?: string;
}

export interface Note {
  id: number; user_id: number; title: string; content: string; created_at: string;
  tags?: Tag[]; targets?: Target[];
  owner_role?: UserRole; owner_username?: string;
  view_count?: number; reactions_up?: number; reactions_down?: number;
  pinned?: boolean; urgent?: boolean;
}

export interface Target {
  type: 'user' | 'classe' | 'promotion' | 'niveau' | 'all';
  value?: string | null;
}

export type TagType = 'classe' | 'specialite' | 'groupe' | 'categorie';

export interface Tag {
  id: number; type: TagType; name: string;
  meta?: { color?: string; icon?: string; [key: string]: any };
  is_default_for_student_view: boolean;
}

export interface AuditLog {
  id: number; user_id?: number; action: string;
  resource_type: string; resource_id?: string; details?: any;
  ip_address?: string; created_at: string;
}
```

---

## 9. Utilitaires — `src/utils/`

### 9.1 `sanitize.js`

> **Source** : `frontend/src/utils/sanitize.js`

```javascript
import DOMPurify from 'dompurify';

// Nettoie le HTML pour éviter les attaques XSS
export const sanitize = (dirty) => DOMPurify.sanitize(dirty);

// Si le contenu est du Markdown converti en HTML
export const sanitizeAndRender = (markdownOrHtml) => DOMPurify.sanitize(markdownOrHtml);
```

### 9.2 `theme.ts`

> **Source** : `frontend/src/utils/theme.ts`

Utilitaire de gestion du thème dark/light. Persistance dans `localStorage`. Applique la classe CSS `dark` sur `<html>`.

---

## 10. Composables — `src/composables/`

### `useTheme.ts`

> **Source** : `frontend/src/composables/useTheme.ts`

```typescript
// Composable Vue 3 pour le dark/light mode
import { ref } from 'vue'

export function useTheme() {
  const isDark = ref(localStorage.getItem('theme') === 'dark')

  function toggleTheme() {
    isDark.value = !isDark.value
    document.documentElement.classList.toggle('dark', isDark.value)
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  }

  return { isDark, toggleTheme }
}
```

---

## 11. Configuration Projet

### `package.json` — Dépendances clés

> **Source** : `frontend/package.json`

| Package | Version | Rôle |
|---------|---------|------|
| `vue` | ^3.3.4 | Framework UI |
| `pinia` | ^3.0.4 | State management |
| `vue-router` | ^5.0.3 | Routeur |
| `dompurify` | ^3.3.1 | Sanitization XSS côté client |
| `vite` | ^4.4.5 | Bundler ultra-rapide |
| `vitest` | ^4.0.18 | Tests unitaires |
| `@vue/test-utils` | ^2.4.6 | Utilitaires de test Vue |

### `vite.config.ts`

> **Source** : `frontend/vite.config.ts`

Configuration Vite avec plugin Vue, proxy API pour le développement, et configuration de Vitest (jsdom, couverture v8).

### `nginx.conf`

> **Source** : `frontend/nginx.conf`

Configuration Nginx pour servir les fichiers statiques en production. Comprend :
- `try_files $uri $uri/ /index.html` — support SPA (Vue Router history mode)
- Headers de sécurité : `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- Compression gzip pour les assets
- Cache long (1 an) pour les assets versionnés (`/assets/`)

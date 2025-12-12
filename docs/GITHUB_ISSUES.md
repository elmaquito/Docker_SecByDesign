# GitHub Issues à Créer - NOTIMATIC MVP

Ce document contient tous les issues à créer dans GitHub pour le projet NOTIMATIC MVP.

## Comment créer ces issues

Les issues peuvent être créées manuellement dans GitHub ou via l'API GitHub. Pour créer via l'API:

```bash
# Exemple pour créer un issue
gh issue create \
  --title "Titre de l'issue" \
  --body "Description de l'issue" \
  --label "label1,label2" \
  --assignee "username"
```

---

## Epic 1: MVP Feed & Auth

### Issue 1.1: Implement /api/feed endpoint (Backend)

**Title**: Implement /api/feed endpoint with filtering and targeting

**Labels**: `backend`, `MVP`, `high-priority`

**Estimate**: 5 days

**Description**:
```markdown
## Objectif
Créer l'endpoint principal du feed d'actualités avec filtrage par thème, catégorie et ciblage utilisateur.

## Tâches
- [ ] Créer endpoint `GET /api/v1/feed`
- [ ] Implémenter filtrage par thème (`?theme=`)
- [ ] Implémenter filtrage par catégorie (`?category=`)
- [ ] Implémenter pagination (`?page=`, `?limit=`)
- [ ] Implémenter logique de ciblage (note_targets + user profile)
- [ ] Tri par date/pertinence (notes épinglées en premier)
- [ ] Validation des paramètres avec Zod
- [ ] RBAC: vérifier que l'utilisateur peut voir les notes ciblées
- [ ] Tests unitaires (au moins 80% coverage)
- [ ] Tests d'intégration

## Critères d'acceptation
- ✅ Endpoint répond avec liste de notes filtrées
- ✅ Pagination fonctionne correctement
- ✅ Notes ciblées selon profil utilisateur
- ✅ Notes épinglées en haut
- ✅ Tests passent

## Dépendances
- Migrations 001, 002, 003 appliquées

## Références
- docs/ARCHITECTURE.md
- docs/ROADMAP.md (Version 0.4.0)
```

---

### Issue 1.2: Implement HomePage & FeedList (Frontend)

**Title**: Implement HomePage and FeedList components with Pinia

**Labels**: `frontend`, `MVP`, `high-priority`

**Estimate**: 5 days

**Description**:
```markdown
## Objectif
Créer la page d'accueil avec le feed d'actualités et les composants associés.

## Tâches
- [ ] Installer Pinia dans le frontend
- [ ] Créer `stores/feedStore.ts` avec actions et state
- [ ] Créer `stores/authStore.ts` (refactor auth existant)
- [ ] Créer composant `HomePage.vue`
- [ ] Créer composant `FeedList.vue` (liste de notes)
- [ ] Créer composant `FeedFilters.vue` (filtres thèmes/catégories)
- [ ] Intégrer appels API vers `/api/v1/feed`
- [ ] Implémenter pagination (infinite scroll ou bouton "Charger plus")
- [ ] Tests unitaires Vitest pour stores et composants

## Critères d'acceptation
- ✅ HomePage affiche le feed de notes
- ✅ Filtres fonctionnent (thèmes, catégories)
- ✅ Pagination fonctionne
- ✅ Pinia stores gèrent l'état correctement
- ✅ Tests Vitest passent

## Dépendances
- Issue 1.1 (API feed)

## Références
- docs/wireframes.md (Wireframe 1)
- docs/ARCHITECTURE.md
```

---

### Issue 1.3: Implement Note permissions model (DB + Service)

**Title**: Implement note permissions and targeting logic

**Labels**: `backend`, `MVP`, `security`, `medium-priority`

**Estimate**: 3 days

**Description**:
```markdown
## Objectif
Implémenter la logique de permissions et de ciblage pour les notes.

## Tâches
- [ ] Créer service `NotePermissionsService.ts`
- [ ] Fonction `canUserViewNote(userId, noteId)` basée sur note_targets et profil
- [ ] Fonction `canUserEditNote(userId, noteId)` (owner, admin, teacher pour student notes)
- [ ] Fonction `canUserDeleteNote(userId, noteId)`
- [ ] Intégrer dans endpoints existants (`GET /notes/:id`, etc.)
- [ ] Tests unitaires des permissions
- [ ] Documentation des règles de permissions

## Règles de permissions
- **View**: Utilisateurs ciblés + admin + tech + teacher (si student note)
- **Edit**: Owner + admin + teacher (si student note)
- [ **Delete**: Owner + admin
- **Comment**: Idem que View

## Critères d'acceptation
- ✅ Service de permissions fonctionnel
- ✅ Permissions appliquées sur tous les endpoints
- ✅ Tests passent avec différents cas (owner, non-owner, admin, etc.)

## Références
- docs/ARCHITECTURE.md (Section Sécurité)
```

---

## Epic 2: Comments

### Issue 2.1: Enhance comments model and endpoints

**Title**: Enhance comments with rate limiting and sanitization

**Labels**: `backend`, `MVP`, `security`, `medium-priority`

**Estimate**: 3 days

**Description**:
```markdown
## Objectif
Améliorer le système de commentaires avec rate limiting et sanitization XSS.

## Tâches
- [ ] Installer `express-rate-limit`
- [ ] Ajouter rate limiting sur `POST /api/v1/notes/:id/comments` (10 req/min)
- [ ] Installer `validator` pour sanitization backend
- [ ] Sanitizer le contenu des commentaires (anti-XSS)
- [ ] Ajouter validation Zod pour commentaires (min 1 char, max 2000)
- [ ] Tests unitaires rate limiting
- [ ] Tests XSS (essayer d'injecter script, vérifier sanitization)

## Critères d'acceptation
- ✅ Rate limiting actif et testé
- ✅ Sanitization XSS effective
- ✅ Validation des commentaires
- ✅ Tests passent

## Références
- docs/ARCHITECTURE.md (Section Sécurité)
- docs/ROADMAP.md (Version 0.5.0)
```

---

### Issue 2.2: Frontend comments UI + tests

**Title**: Implement CommentsList and CommentForm components

**Labels**: `frontend`, `MVP`, `medium-priority`

**Estimate**: 4 days

**Description**:
```markdown
## Objectif
Créer l'interface utilisateur pour les commentaires.

## Tâches
- [ ] Créer `stores/commentStore.ts`
- [ ] Créer composant `CommentsList.vue`
- [ ] Créer composant `CommentForm.vue`
- [ ] Intégrer dans `NoteDetail.vue`
- [ ] Installer DOMPurify pour sanitization frontend
- [ ] Sanitizer le contenu affiché avec DOMPurify
- [ ] Implémenter pagination commentaires (si > 10)
- [ ] Tests unitaires Vitest

## Critères d'acceptation
- ✅ Liste de commentaires affichée
- ✅ Formulaire d'ajout de commentaire fonctionnel
- ✅ Sanitization XSS côté front
- ✅ Tests Vitest passent

## Dépendances
- Issue 2.1 (backend comments)

## Références
- docs/wireframes.md (Wireframe 3)
```

---

## Epic 3: Assignation par Thème

### Issue 3.1: Theme model + endpoints

**Title**: Implement themes CRUD endpoints

**Labels**: `backend`, `MVP`, `high-priority`

**Estimate**: 3 days

**Description**:
```markdown
## Objectif
Implémenter la gestion des thèmes (sécurité, DevOps, etc.).

## Tâches
- [ ] Créer service `ThemeService.ts`
- [ ] Endpoint `GET /api/v1/themes` - Liste thèmes
- [ ] Endpoint `GET /api/v1/themes/:id` - Détail thème
- [ ] Endpoint `POST /api/v1/themes` - Créer thème (admin/teacher)
- [ ] Endpoint `PUT /api/v1/themes/:id` - Modifier thème (admin/teacher)
- [ ] Endpoint `DELETE /api/v1/themes/:id` - Supprimer thème (admin)
- [ ] Validation Zod (name unique, description max 500 chars)
- [ ] RBAC: seuls admin/teacher peuvent créer/modifier
- [ ] Tests unitaires

## Critères d'acceptation
- ✅ CRUD thèmes fonctionnel
- ✅ Permissions appliquées
- ✅ Tests passent

## Dépendances
- Migration 002 appliquée

## Références
- docs/ARCHITECTURE.md
- docs/wireframes.md (Wireframe 6)
```

---

### Issue 3.2: Note creation form + target selector + validations

**Title**: Implement NoteCreateForm with theme/category selection

**Labels**: `frontend`, `MVP`, `high-priority`

**Estimate**: 5 days

**Description**:
```markdown
## Objectif
Créer le formulaire de création de note pour les enseignants avec sélection de thèmes et catégories.

## Tâches
- [ ] Créer `stores/noteStore.ts` pour gestion des notes
- [ ] Créer composant `NoteCreateForm.vue`
- [ ] Champs: titre (max 100), contenu (Markdown supporté)
- [ ] Multi-select thèmes (checkboxes)
- [ ] Multi-select catégories (checkboxes)
- [ ] Sélection de cibles (classes, promos, niveaux, all)
- [ ] Bouton "Prévisualiser" (modal avec rendu Markdown)
- [ ] Validation côté client
- [ ] Appel API `POST /api/v1/notes` avec thèmes/catégories/targets
- [ ] Tests unitaires Vitest

## Critères d'acceptation
- ✅ Formulaire complet et fonctionnel
- ✅ Teachers peuvent créer notes avec assignations
- ✅ Validation client fonctionne
- ✅ Tests Vitest passent

## Dépendances
- Issue 3.1 (themes API)
- Issue 4.1 (categories API)

## Références
- docs/wireframes.md (Wireframe 4)
```

---

## Epic 4: Categories & Targeting

### Issue 4.1: Category model + mapping profiles

**Title**: Implement categories CRUD and profile mapping

**Labels**: `backend`, `MVP`, `high-priority`

**Estimate**: 4 days

**Description**:
```markdown
## Objectif
Implémenter la gestion des catégories pour le ciblage de notes.

## Tâches
- [ ] Créer service `CategoryService.ts`
- [ ] Endpoint `GET /api/v1/categories` - Liste catégories
- [ ] Endpoint `GET /api/v1/categories/:id` - Détail catégorie
- [ ] Endpoint `POST /api/v1/categories` - Créer catégorie (admin/teacher)
- [ ] Endpoint `PUT /api/v1/categories/:id` - Modifier
- [ ] Endpoint `DELETE /api/v1/categories/:id` - Supprimer
- [ ] Endpoint `GET /api/v1/profiles/:userId` - Récupérer profil utilisateur
- [ ] Endpoint `PUT /api/v1/profiles/:userId` - Modifier profil
- [ ] Validation Zod (target_type, target_value)
- [ ] Tests unitaires

## Critères d'acceptation
- ✅ CRUD catégories fonctionnel
- ✅ CRUD profils fonctionnel
- ✅ Permissions appliquées
- ✅ Tests passent

## Dépendances
- Migrations 001, 002 appliquées

## Références
- docs/ARCHITECTURE.md
- docs/wireframes.md (Wireframe 7)
```

---

### Issue 4.2: Note creation UI + categories selector

**Title**: Add category and targeting selection to NoteCreateForm

**Labels**: `frontend`, `MVP`, `medium-priority`

**Estimate**: 3 days

**Description**:
```markdown
## Objectif
Ajouter la sélection de catégories et de cibles au formulaire de création de note.

## Tâches
- [ ] Créer `stores/categoryStore.ts`
- [ ] Ajouter section "Ciblage" dans `NoteCreateForm.vue`
- [ ] Radio buttons: "Tous", "Par catégories", "Utilisateurs spécifiques"
- [ ] Si "Par catégories": afficher checkboxes (classes, promos, niveaux)
- [ ] Aperçu des cibles sélectionnées
- [ ] Estimation nombre d'utilisateurs ciblés (optionnel, future)
- [ ] Tests unitaires

## Critères d'acceptation
- ✅ Sélection catégories fonctionnelle
- ✅ Aperçu ciblage clair
- ✅ Tests Vitest passent

## Dépendances
- Issue 4.1 (categories API)

## Références
- docs/wireframes.md (Wireframe 4)
```

---

## Epic 5: GDPR

### Issue 5.1: Implement export/purge endpoints + tests + docs

**Title**: Implement GDPR export and purge endpoints

**Labels**: `backend`, `GDPR`, `security`, `high-priority`

**Estimate**: 5 days

**Description**:
```markdown
## Objectif
Implémenter la conformité GDPR avec endpoints d'export et de suppression.

## Tâches
- [ ] Endpoint `GET /api/v1/users/:id/export` - Export données utilisateur
  - Générer JSON complet (user, profile, notes, comments, audit_logs)
  - Stocker dans table `gdpr_export_requests`
  - Logs d'audit
- [ ] Endpoint `DELETE /api/v1/users/:id` - Suppression/anonymisation
  - Soft delete (colonne `deleted_at`)
  - Option anonymisation immédiate (admin seulement)
  - Option purge complète (admin seulement, irréversible)
  - Logs d'audit
- [ ] Script cron pour purge automatique (voir migration 004)
- [ ] Tests unitaires endpoints GDPR
- [ ] Tests d'intégration (export → vérifier JSON, delete → vérifier soft delete)
- [ ] Documentation procédures utilisateur

## Critères d'acceptation
- ✅ Export JSON complet et correct
- ✅ Soft delete fonctionne
- ✅ Anonymisation fonctionne
- ✅ Logs d'audit créés
- ✅ Tests passent à 100%

## Dépendances
- Migration 004 appliquée

## Références
- docs/GDPR.md
- docs/ARCHITECTURE.md
```

---

## Epic 6: CI/Security

### Issue 6.1: Configure and test GitHub Actions workflow

**Title**: Configure GitHub Actions CI/CD pipeline

**Labels**: `ci/cd`, `devops`, `medium-priority`

**Estimate**: 3 days

**Description**:
```markdown
## Objectif
Configurer et tester le workflow GitHub Actions.

## Tâches
- [ ] Tester le workflow sur une branche (push)
- [ ] Vérifier que tous les jobs s'exécutent
- [ ] Corriger les erreurs de linting (si nécessaire)
- [ ] Ajouter scripts de linting (`npm run lint`)
- [ ] Ajouter scripts de tests (`npm test`)
- [ ] Configurer cache npm pour améliorer performance
- [ ] Ajouter badge de statut CI dans README
- [ ] Documenter le workflow dans README

## Critères d'acceptation
- ✅ Workflow s'exécute sans erreur
- ✅ Tous les jobs passent au vert
- ✅ Badge CI affiché dans README
- ✅ Documentation à jour

## Dépendances
- Aucune

## Références
- .github/workflows/ci.yml
```

---

### Issue 6.2: Add linting & unit tests steps

**Title**: Add ESLint, Prettier, and unit test infrastructure

**Labels**: `backend`, `frontend`, `quality`, `medium-priority`

**Estimate**: 4 days

**Description**:
```markdown
## Objectif
Mettre en place linting et tests unitaires pour backend et frontend.

## Tâches Backend
- [ ] Installer ESLint + config TypeScript
- [ ] Installer Prettier
- [ ] Configurer .eslintrc.json
- [ ] Configurer .prettierrc
- [ ] Installer Jest ou Mocha + Chai
- [ ] Installer Supertest (tests API)
- [ ] Créer fichiers de config tests
- [ ] Écrire tests exemples (auth, notes)
- [ ] Script `npm run lint` et `npm test`

## Tâches Frontend
- [ ] Installer ESLint + config Vue/TypeScript
- [ ] Installer Prettier
- [ ] Installer Vitest
- [ ] Configurer vitest.config.ts
- [ ] Écrire tests exemples (stores, composants)
- [ ] Script `npm run lint` et `npm test`

## Critères d'acceptation
- ✅ Linting configuré et fonctionne
- ✅ Tests unitaires exécutables
- ✅ Coverage > 50% (minimum pour démarrer)
- ✅ Scripts npm configurés

## Références
- docs/ROADMAP.md (Version 0.6.0)
```

---

### Issue 6.3: Implement Trivy scanning and dependency audit

**Title**: Configure Trivy security scanning

**Labels**: `security`, `ci/cd`, `high-priority`

**Estimate**: 2 days

**Description**:
```markdown
## Objectif
Configurer le scan de sécurité Trivy pour détecter les vulnérabilités.

## Tâches
- [ ] Vérifier la configuration Trivy dans workflow CI
- [ ] Tester scan filesystem
- [ ] Tester scan Docker images (quand disponibles)
- [ ] Configurer upload SARIF vers GitHub Security tab
- [ ] Corriger vulnérabilités critiques/high si trouvées
- [ ] Documenter procédure de gestion des vulnérabilités

## Critères d'acceptation
- ✅ Trivy scan s'exécute dans CI
- ✅ Résultats visibles dans Security tab
- ✅ Aucune vulnérabilité critique non corrigée
- ✅ Procédure documentée

## Références
- .github/workflows/ci.yml
- docs/ARCHITECTURE.md (Section Sécurité)
```

---

## Epic 7: Additional Features

### Issue 7.1: Implement TeacherDashboard

**Title**: Create Teacher Dashboard with statistics

**Labels**: `frontend`, `MVP`, `medium-priority`

**Estimate**: 4 days

**Description**:
```markdown
## Objectif
Créer le tableau de bord pour les enseignants.

## Tâches
- [ ] Créer composant `TeacherDashboard.vue`
- [ ] Section statistiques (notes créées, commentaires, vues)
- [ ] Section "Mes notes récentes"
- [ ] Section "Activité récente"
- [ ] Boutons actions rapides (créer note, gérer thèmes)
- [ ] Tests unitaires

## Critères d'acceptation
- ✅ Dashboard fonctionnel
- ✅ Statistiques affichées
- ✅ Navigation vers autres pages fonctionne
- ✅ Tests passent

## Références
- docs/wireframes.md (Wireframe 5)
```

---

### Issue 7.2: Implement ThemeManager and CategoryManager

**Title**: Create admin interfaces for themes and categories

**Labels**: `frontend`, `admin`, `low-priority`

**Estimate**: 5 days

**Description**:
```markdown
## Objectif
Créer les interfaces de gestion des thèmes et catégories.

## Tâches
- [ ] Créer composant `ThemeManager.vue`
- [ ] CRUD thèmes (liste, création modal, édition, suppression)
- [ ] Créer composant `CategoryManager.vue`
- [ ] CRUD catégories
- [ ] Confirmations pour suppressions
- [ ] Tests unitaires

## Critères d'acceptation
- ✅ Gestion thèmes fonctionnelle
- ✅ Gestion catégories fonctionnelle
- ✅ RBAC respecté (admin/teacher seulement)
- ✅ Tests passent

## Références
- docs/wireframes.md (Wireframes 6 & 7)
```

---

### Issue 7.3: Add E2E tests with Playwright

**Title**: Implement E2E smoke tests with Playwright

**Labels**: `tests`, `e2e`, `medium-priority`

**Estimate**: 5 days

**Description**:
```markdown
## Objectif
Créer des tests E2E couvrant les flux principaux.

## Tâches
- [ ] Installer Playwright
- [ ] Configurer playwright.config.ts
- [ ] Test: Login → Feed → Voir note → Commenter
- [ ] Test: Teacher login → Créer note → Assigner → Vérifier feed
- [ ] Test: GDPR export → Vérifier données
- [ ] Intégrer dans CI (job e2e-tests)
- [ ] Screenshots/vidéos des tests

## Critères d'acceptation
- ✅ Tests E2E s'exécutent localement
- ✅ Tests E2E s'exécutent dans CI
- ✅ Coverage des flux principaux
- ✅ Artifacts (screenshots/vidéos) disponibles

## Références
- .github/workflows/ci.yml (job e2e-tests)
- docs/ROADMAP.md (Version 0.6.0)
```

---

## Labels à Créer

Créer les labels suivants dans GitHub:

- `MVP` (couleur: rouge #D73A49) - Fonctionnalités MVP bloquantes
- `backend` (couleur: bleu #0366D6) - Tâches backend
- `frontend` (couleur: vert #28A745) - Tâches frontend
- `security` (couleur: orange #FB8C00) - Sécurité
- `GDPR` (couleur: violet #6F42C1) - Conformité GDPR
- `ci/cd` (couleur: cyan #17A2B8) - CI/CD et DevOps
- `tests` (couleur: jaune #FFC107) - Tests
- `e2e` (couleur: marron #8B4513) - Tests E2E
- `admin` (couleur: gris #6A737D) - Interfaces admin
- `quality` (couleur: vert clair #7CB342) - Qualité de code
- `devops` (couleur: bleu foncé #1976D2) - DevOps
- `high-priority` (couleur: rouge vif #E91E63) - Haute priorité
- `medium-priority` (couleur: orange #FF9800) - Priorité moyenne
- `low-priority` (couleur: vert clair #8BC34A) - Basse priorité

---

## Récapitulatif des Issues

**Total**: 18 issues réparties en 7 epics

### Par Epic
- Epic 1 (MVP Feed & Auth): 3 issues
- Epic 2 (Comments): 2 issues
- Epic 3 (Assignation par thème): 2 issues
- Epic 4 (Categories & targeting): 2 issues
- Epic 5 (GDPR): 1 issue
- Epic 6 (CI/Security): 3 issues
- Epic 7 (Additional Features): 3 issues

### Par Priorité
- High: 8 issues
- Medium: 8 issues
- Low: 2 issues

### Estimation Totale
- **52 jours** (environ 10-11 semaines avec 1 développeur)
- **26 jours** (environ 5-6 semaines avec 2 développeurs)

---

**Créé le**: 2024-12-12  
**Version**: 1.0

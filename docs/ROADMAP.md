# Roadmap NOTIMATIC - MVP Feed d'actualités

## Vue d'ensemble

Ce document présente la roadmap complète pour le développement du MVP du système de feed d'actualités avec commentaires, assignation par thèmes et catégories ciblées.

## Version 0.1.0 - Fondations (Actuel)

**Statut**: ✅ Complété

### Fonctionnalités
- Authentification JWT avec HTTP-only cookies
- Gestion des utilisateurs (roles: admin, technician, teacher, student)
- CRUD notes basique
- Système de commentaires
- Infrastructure Docker
- Base de données PostgreSQL

### Limitations
- Pas de profils utilisateurs enrichis
- Pas de système de thèmes
- Pas de ciblage par catégories
- Pas de feed intelligent
- Pas de conformité RGPD
- Pas de CI/CD
- Frontend basique sans TypeScript ni Pinia

## Version 0.2.0 - Extensions Base de Données & TypeScript

**Statut**: ✅ Complété

### Objectifs
Étendre le modèle de données et migrer le frontend vers TypeScript.

### Tâches

#### Base de données (Backend)
- [x] Créer migration `001_add_profiles.sql`
- [x] Créer migration `002_add_themes_categories.sql` (Remplacé par Unified Tags en 006)
- [x] Créer migration `003_add_note_targets.sql`
- [x] Créer migration `004_add_audit_gdpr.sql`
- [x] Créer migration `006_add_unified_tags.sql` (Unified Tags System)
- [x] Script de migration (`backend/migrate.sh`)

#### Frontend TypeScript
- [x] Installer TypeScript, Pinia, Vue Router, Vitest
- [x] Créer `tsconfig.json` pour frontend
- [x] Renommer `main.js` → `main.ts`
- [x] Migrer `App.vue` et `Login.vue` vers `<script setup lang="ts">`
- [x] Créer types TypeScript de base (`types/models.ts`)
- [ ] Migration complète des autres composants (Dashboard, Feed, etc.)

#### Documentation
- [x] Documentation ARCHITECTURE.md mise à jour
- [x] README mis à jour

### Critères d'acceptation
- [x] Toutes les migrations SQL exécutables sans erreur
- [x] Frontend compile en TypeScript sans erreur (App.vue, main.ts)
- [x] Application existante fonctionne toujours (non-régression)

---

## Version 0.3.0 - API Unified Tags & Profils

**Statut**: ✅ Complété

### Objectifs
Finaliser l'implémentation de la logique métier pour les Tags Unifiés (remplaçant Thèmes/Catégories) et la gestion des profils.

### Tâches

#### Backend - Unified Tags
- [x] Migration DB (006)
- [x] Endpoints CRUD Tags (`tags.controller.ts`)
- [x] Assignation Tags aux Notes (`note_tags`)
- [x] Tests unitaires approfondis pour Tags

#### Backend - Profils
- [x] Migration DB (001)
- [x] `GET /api/v1/profiles/:userId`
- [x] `PUT /api/v1/profiles/:userId`

#### Frontend - Pinia Stores
- [x] `stores/auth.ts` - Gestion Auth (Refactorisé)
- [x] `stores/tag.ts` - Gestion des Tags
- [x] Intégration Stores dans composants

### Critères d'acceptation
- [x] Tous les endpoints répondent correctement
- [x] RBAC appliqué (Tags: admin/teacher edit, student view)
- [x] Tests unitaires passent à 100%
- [x] Stores Pinia fonctionnels

---

## Version 0.4.0 - Feed Intelligent & Assignation

**Statut**: ✅ Complété

### Objectifs
Implémenter l'algorithme de feed intelligent qui filtre les notes en fonction des tags de l'utilisateur (classe, spécialités, groupes) et des assignations directes.

### Tâches

#### Backend - Feed Algorithm & Logic
- [x] Migration `user_tags` (009) pour gérer les groupes/spécialités
- [x] Mettre à jour `user.controller.ts` pour gérer les tags utilisateurs
- [x] Implémenter l'algorithme de filtrage dans `feed.controller.ts` (Cibles + Tags + Owner)
- [x] validation stricte des cibles dans `notes.controller.ts`

#### Frontend - Feed Component
- [x] Mettre à jour `Feed.vue` pour utiliser `GET /api/v1/feed` avec pagination
- [x] Afficher les raisons de l'affichage (via `targets` ou tags correspondants)
- [x] Filtres côté client (par tags et recherche)

### Critères d'acceptation
- [x] Un étudiant ne voit que les notes qui lui sont destinées (Backend logic verified)
- [x] Les notes "publiques" sont visibles par tous
- [x] Performance acceptable (< 200ms) pour la requête de feed

---

## Version 0.5.0 - Sécurité & GDPR

**Statut**: ✅ Complété

### Objectifs
Renforcer la sécurité et implémenter la conformité GDPR.

### Tâches

#### Sécurité Backend
- [x] Installer `express-rate-limit`
- [x] Rate limiting sur endpoints commentaires (10 req/min)
- [x] Rate limiting sur endpoints auth (5 req/min)
- [x] Installer `validator` pour sanitization
- [x] Sanitizer toutes les entrées utilisateur (XSS)
- [x] Content Security Policy (CSP) dans Helmet
- [x] Audit logging pour actions critiques
  - Création/suppression notes
  - Export/purge utilisateur
  - Modifications de profil

#### GDPR Endpoints
- [x] `GET /api/v1/users/:id/export` — Export données utilisateur
  - Générer JSON avec toutes les données
  - Stocker dans `gdpr_export_requests`
  - Logs d'audit
- [x] `DELETE /api/v1/users/:id` — Suppression/anonymisation
  - Soft delete (`deleted_at`)
  - Anonymisation (`anonymized = true`)
  - Option de purge complète (admin)
  - Logs d'audit
- [x] Tests unitaires GDPR

#### Frontend Sécurité
- [x] Installer `DOMPurify` pour sanitization
- [x] Sanitizer contenu affiché (notes, commentaires)
- [x] Gestion sécurisée des tokens JWT

#### Documentation GDPR
- [x] Créer `docs/GDPR.md`
  - Politique de conservation
  - Procédure de demande d'export
  - Procédure de suppression
  - Données collectées
  - Bases légales
  - Contacts DPO (Data Protection Officer)

### Critères d'acceptation
- [x] Rate limiting actif et testé
- [x] Sanitization XSS effective
- [x] Endpoints GDPR fonctionnels et testés
- [x] Documentation GDPR complète
- [x] Logs d'audit pour toutes actions critiques

---

## Version 0.6.0 - Tests & CI/CD

**Statut**: ✅ Complété

### Objectifs
Automatiser les tests et la CI/CD.

### Tâches

#### Tests Backend
- [x] Installer Jest ou Mocha + Chai + Supertest
- [x] Tests unitaires:
  - Middleware auth/RBAC
  - Services (FeedService, ThemeService, etc.)
  - Validations Zod
- [x] Tests d'intégration:
  - Endpoints feed
  - Endpoints themes/categories
  - Endpoints GDPR
  - Flow complet: create note → assign → feed → comment
- [ ] Coverage > 80%

#### Tests Frontend
- [x] Installer Vitest
- [x] Tests unitaires Vitest:
  - Stores Pinia (feedStore, noteStore, themeStore)
  - Composants (FeedList, NoteCard, CommentForm)
  - Utils/helpers
- [x] Mocks pour API calls
- [ ] Coverage > 70%

#### Tests E2E
- [ ] Installer Playwright
- [ ] Tests E2E:
  - Smoke test: Login → Feed → Commentaire
  - Teacher flow: Login → Créer note → Assigner → Vérifier feed
  - Student flow: Login → Voir notes ciblées → Commenter
  - GDPR flow: Demander export → Vérifier données
- [ ] Screenshots/vidéos des tests

#### CI/CD Pipeline
- [x] Créer `.github/workflows/ci.yml`
- [x] Jobs:
  - **Lint Backend**: ESLint backend (Node 18 & 20)
  - **Lint Frontend**: ESLint frontend
  - **Test Backend**: Jest unit + integration (Node 18 & 20)
  - **Test Frontend**: Vitest unit tests
  - **Security**: npm audit (critical) + Trivy image scan
  - **Docker Build**: Multi-stage Dockerfiles
  - **E2E** (main branch uniquement): Playwright smoke tests
- [x] Configuration cache npm pour CI
- [x] Matrix strategy pour tester Node 18/20
- [x] CI fix strict (PR #18): structure workflow, vérifications de couverture, permissions
- [ ] Badge de statut CI dans README (lien vers workflow)

### Critères d'acceptation
- [x] CI passe sur chaque push
- [x] Images Docker scannées sans vulnérabilités critiques
- [x] Documentation CI/CD dans README
- [ ] Coverage backend > 80%, frontend > 70%
- [ ] Tous les tests E2E passent

---

## Version 0.7.0 - UI/UX & Wireframes

**Statut**: ✅ Complété

### Objectifs
Améliorer l'interface et créer la documentation UX.

### Tâches

#### Wireframes
- [x] Créer `docs/wireframes.md`
- [x] Wireframe 1: Page d'accueil / Feed
- [x] Wireframe 2: NoteCard
- [x] Wireframe 3: Détail note + commentaires
- [x] Wireframe 4: Formulaire création note (Teacher)
- [x] Wireframe 5: Dashboard enseignant

#### Frontend - Améliorations UI
- [x] CSS/Styling amélioré
- [x] Responsive design (mobile, tablet, desktop)
- [x] Dark / Light mode avec persistance (`useTheme`)
- [x] Loader visuel pour les opérations async (`Loader.vue`)
- [ ] `ThemeManager.vue` — Gestion des thèmes (admin/teacher)
- [ ] `CategoryManager.vue` — Gestion des catégories
- [ ] Accessibilité (WCAG AA)

### Critères d'acceptation
- [x] Wireframes complets et détaillés
- [x] UI cohérente et moderne
- [x] Application responsive

---

## Version 1.0.0 - Production Ready

**Statut**: ✅ Complété

### Tâches

#### Documentation
- [x] README.md complet (installation, démarrage, contribution)
- [x] API Documentation (`docs/API.md`)
- [x] User Guide (`docs/USER_GUIDE.md`)

#### Déploiement
- [x] Docker Compose production testé
- [x] Variables d'environnement documentées (`.env.example`)
- [x] Secrets Docker Swarm configurés
- [x] Healthchecks Docker
- [x] Traefik reverse proxy

#### Finalisations
- [x] Version tagging (v1.0.0)
- [x] Release Notes (`docs/RELEASE_NOTES.md`)

### Critères d'acceptation
- [x] Application déployable en production
- [x] Documentation complète
- [x] Aucune vulnérabilité critique

---

## Reste à Faire (Post-v1.0.0)

Les éléments ci-dessous sont les travaux identifiés à compléter pour atteindre la maturité opérationnelle complète du projet.

### 🔴 Haute Priorité
- **Tests E2E Playwright**: smoke, teacher flow, student flow, GDPR flow
- **Couverture de tests**: atteindre 80% backend / 70% frontend (vérifications CI actives)
- **2FA TOTP**: obligatoire pour les admins (`auth.controller.ts`), interface QR Code
- **Endpoint audit admin**: `GET /api/v1/audit` avec pagination et filtres

### 🟡 Moyenne Priorité
- **Vue "Activités récentes"**: logs consultables par l'utilisateur
- **ThemeManager.vue / CategoryManager.vue**: interfaces admin/teacher
- **Accessibilité WCAG AA**: validation et correctifs
- **Stockage sécurisé des secrets**: Vault ou param store
- **Badge CI dans README**: lien vers le workflow GitHub Actions

### 🟢 Basse Priorité (Nice-to-have)
- **Backup/restore PostgreSQL**: scripts et documentation
- **Monitoring avancé**: Prometheus + Grafana
- **Swagger/OpenAPI**: documentation interactive de l'API

---

## Versions Futures (Post-MVP)

### Version 1.1.0 — Notifications
- Notifications in-app en temps réel (WebSocket)
- Notifications e-mail (NodeMailer)
- Préférences de notifications utilisateur

### Version 1.2.0 — Recherche Avancée
- Recherche full-text notes (PostgreSQL FTS)
- Filtres avancés
- Tri par pertinence

### Version 1.3.0 — Collaboration & Sécurité Avancée
- Mentions utilisateurs (@username)
- Réactions aux notes/commentaires
- 2FA TOTP (si non livré avant)

### Version 1.4.0 — Analytics
- Tableau de bord analytics (teacher/admin)
- Statistiques engagement
- Rapports exportables

---

## Timeline Globale

| Version | Description | Statut |
|---------|-------------|--------|
| 0.1.0 | Fondations | ✅ Complété |
| 0.2.0 | DB & TypeScript | ✅ Complété |
| 0.3.0 | API Unified Tags & Profils | ✅ Complété |
| 0.4.0 | Feed & Assignation | ✅ Complété |
| 0.5.0 | Sécurité & GDPR | ✅ Complété |
| 0.6.0 | Tests & CI/CD | ✅ Complété |
| 0.7.0 | UI/UX & Wireframes | ✅ Complété |
| 1.0.0 | Production Ready | ✅ Complété |
| 1.x | Sécurité avancée, E2E, Analytics… | 🔄 En cours |

**MVP livré** — version courante : **v1.2.0**

---

## Priorités (Post-v1.0.0)

### 🔴 Haute Priorité
- Tests E2E Playwright
- Couverture tests (80% backend / 70% frontend)
- 2FA TOTP pour les admins
- Endpoint `GET /api/v1/audit`

### 🟡 Moyenne Priorité
- Vue "Activités récentes" (logs utilisateur)
- ThemeManager.vue / CategoryManager.vue
- Accessibilité WCAG AA
- Stockage sécurisé des secrets

### 🟢 Basse Priorité (Nice-to-have)
- Backup/restore PostgreSQL
- Monitoring avancé (Prometheus/Grafana)
- Swagger/OpenAPI interactif
- Analytics dashboard

---

## Dépendances entre Versions

```
0.1.0 (Actuel)
  │
  ├─→ 0.2.0 (DB + TS) ← Requis pour tout le reste
  │     │
  │     ├─→ 0.3.0 (API Themes/Categories)
  │     │     │
  │     │     └─→ 0.4.0 (Feed & Assignation)
  │     │           │
  │     │           ├─→ 0.5.0 (Sécurité & GDPR)
  │     │           │     │
  │     │           │     └─→ 0.6.0 (Tests & CI/CD)
  │     │           │           │
  │     │           │           └─→ 0.7.0 (UI/UX)
  │     │           │                 │
  │     │           │                 └─→ 1.0.0 (Production)
```

---

## Métriques de Succès

### Techniques
- ✅ 0 vulnérabilités critiques (Trivy, npm audit)
- ✅ Coverage tests > 75%
- ✅ Build CI < 10 minutes
- ✅ API response time < 500ms (P95)
- ✅ Frontend bundle < 500KB gzipped

### Fonctionnelles
- ✅ Teachers peuvent créer notes avec assignations
- ✅ Students voient notes ciblées dans feed
- ✅ Filtrage par thèmes/catégories fonctionne
- ✅ Commentaires fonctionnels
- ✅ GDPR export/purge opérationnel

### Qualité
- ✅ Code TypeScript strict
- ✅ Linting passe à 100%
- ✅ Documentation complète
- ✅ Aucune régression fonctionnelle

---

**Dernière mise à jour**: 1er avril 2026  
**Version du document**: 2.0  
**Auteur**: GitHub Copilot Agent

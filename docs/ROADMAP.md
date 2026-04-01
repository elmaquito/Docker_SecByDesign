# Roadmap Sécurité & Infrastructure – Stack Sécurité (Nouvelle section)

## Phase 1 : Socle réseau et proxy (Jours 1-2)
- Déploiement Traefik (reverse proxy) via Docker Compose
- Déploiement du frontend et backend sur réseaux séparés
- **Tests** :
  - Vérification du routage HTTP/HTTPS (curl, navigateur)
  - Tests automatisés de disponibilité (Ansible ping, healthchecks)
- **Documentation** : Schéma réseau, variables d’environnement, secrets

## Phase 2 : Ajout du WAF (Jours 2-3)
- Déploiement d’un WAF (Nginx + ModSecurity ou openappsec) devant le backend
- Configuration de règles de filtrage (patterns, payloads, headers)
- **Tests** :
  - Attaques XSS/SQLi simulées (OWASP ZAP, curl)
  - Vérification du blocage/logging par le WAF
- **Documentation** : Règles WAF, intégration avec Traefik

## Phase 3 : Firewall réseau (Jours 3-4)
- Déploiement d’un firewall (OPNSENSE en VM ou container)
- Mise en place des règles de filtrage, port mirroring vers IDS
- **Tests** :
  - Scans de ports (nmap)
  - Tentatives d’accès non autorisées
  - Vérification du mirroring (paquets capturés par IDS)
- **Documentation** : Règles FW, schéma de flux

## Phase 4 : API Gateway & API Firewall (Jours 4-5)
- Déploiement Wallarm API Firewall (ou équivalent)
- Configuration des règles d’authentification, tokens, payloads
- **Tests** :
  - Appels API avec/ sans tokens, payloads malicieux
  - Vérification du filtrage et des logs
- **Documentation** : Mapping endpoints/API GW

## Phase 5 : SIEM & IDS (Jours 5-6)
- Déploiement OSSEC/Wazuh (SIEM/IDS) sur réseau dédié
- Connexion du port mirroring FW → IDS
- Collecte centralisée des logs (Traefik, WAF, API GW, backend)
- **Tests** :
  - Génération d’événements suspects (tentatives brute-force, accès interdits)
  - Vérification de la détection/corrélation dans le SIEM
- **Documentation** : Procédures de collecte, dashboard SIEM

## Phase 6 : Automatisation & Validation (Jours 6-7)
- Écriture de playbooks Ansible pour déploiement et tests automatisés
- Automatisation des tests de sécurité (lint, vulnérabilités, E2E, attaques simulées)
- **Tests** :
  - Exécution complète du pipeline Ansible (déploiement + tests)
  - CI/CD : Intégration des tests dans GitHub Actions
- **Documentation** : Guide de déploiement, scripts/tests, .env exemple

## Phase 7 : Documentation & Revue finale (Jour 7)
- Rédaction de la documentation d’architecture, sécurité, correspondances outils/fonctions
- Checklist de conformité (séparation réseau, gestion secrets, logs, port mirroring, etc.)
- **Tests** :
  - Revue croisée (peer review)
  - Validation finale de la stack sur environnement cible
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

**Statut**: 🔄 En cours

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

## Version 0.5.0 - Sécurité Avancée & Audit

**Statut**: 🔄 A venir

### Objectifs
Renforcer la sécurité avec 2FA, Audit Logs complets, et gestion des sessions.

### Tâches

#### Backend - Sécurité
- [ ] Mettre à jour `auth.controller.ts` pour supporter 2FA (TOTP)
- [ ] Implémenter le middleware de limitation de taux (Rate Limiting) global
- [ ] Stockage sécurisé des secrets (Vault ou param store simulation)

#### Backend - Audit
- [ ] Compléter `audit.service.ts` pour couvrir toutes les actions sensibles
- [ ] Endpoint `GET /api/v1/audit` pour les admins

#### Frontend - Sécurité
- [ ] Interface de configuration 2FA (QR Code)
- [ ] Vue "Activités récentes" (Logs) pour l'utilisateur

### Critères d'acceptation
- 2FA fonctionnel et obligatoire pour les admins
- Logs d'audit immuables pour toutes les actions critiques
- Protection contre brute-force active



### Objectifs
Implémenter le feed d'actualités avec filtrage et assignation par thèmes/catégories.

### Tâches

#### Backend - Feed API
- [ ] Endpoint `GET /api/v1/feed` avec filtres
  - Paramètres: `?theme=`, `?category=`, `?page=`, `?limit=`
  - Logique de ciblage (note_targets + profil utilisateur)
  - Pagination
  - Tri par date/pertinence
- [ ] Logique d'assignation de notes
  - Associer notes à thèmes (note_themes)
  - Associer notes à catégories (note_categories)
  - Créer targets (note_targets)
- [ ] Modifier `POST /api/v1/notes` pour accepter themes/categories/targets
- [ ] Service `FeedService.ts` pour logique métier
- [ ] Tests d'intégration feed avec différents profils

#### Frontend - Composants Feed
- [ ] `HomePage.vue` - Page d'accueil avec feed
- [ ] `FeedList.vue` - Liste de notes filtrables
- [ ] `NoteCard.vue` - Carte d'affichage note
- [ ] `FeedFilters.vue` - Filtres (thèmes, catégories)
- [ ] `stores/feedStore.ts` - État du feed
- [ ] `stores/noteStore.ts` - CRUD notes

#### Frontend - Création de Note (Teacher)
- [ ] `NoteCreateForm.vue` - Formulaire complet
  - Champs: titre, contenu
  - Sélection multi-thèmes (checkbox/tags)
  - Sélection multi-catégories
  - Sélection de cibles (classes, promos, niveaux, all)
- [ ] `TeacherDashboard.vue` - Dashboard enseignant
- [ ] Validation côté client
- [ ] Tests unitaires Vitest pour composants

#### Frontend - Détail Note & Commentaires
- [ ] `NoteDetail.vue` - Affichage détaillé d'une note
- [ ] `CommentsList.vue` - Liste des commentaires
- [ ] `CommentForm.vue` - Formulaire d'ajout commentaire
- [ ] `stores/commentStore.ts` - Gestion commentaires

### Critères d'acceptation
- Feed affiche notes ciblées selon profil utilisateur
- Filtres fonctionnent (thèmes, catégories)
- Teachers peuvent créer notes avec assignations
- Commentaires fonctionnels
- Tests unitaires passent

---

## Version 0.5.0 - Sécurité & GDPR (Actuel)

**Statut**: ✅ Complété

### Objectifs
Renforcer la sécurité et implémenter la conformité GDPR.

### Tâches

#### Sécurité Backend
- [ ] Installer `express-rate-limit`
- [ ] Rate limiting sur endpoints commentaires (10 req/min)
- [ ] Rate limiting sur endpoints auth (5 req/min)
- [ ] Installer `validator` pour sanitization
- [ ] Sanitizer toutes les entrées utilisateur (XSS)
- [ ] CSRF protection avec `csurf` (si nécessaire)
- [ ] Content Security Policy (CSP) dans Helmet
- [ ] Audit logging pour actions critiques
  - Création/suppression notes
  - Export/purge utilisateur
  - Modifications de profil

#### GDPR Endpoints
- [ ] `GET /api/v1/users/:id/export` - Export données utilisateur
  - Générer JSON avec toutes les données
  - Stocker dans `gdpr_export_requests`
  - Logs d'audit
- [ ] `DELETE /api/v1/users/:id` - Suppression/anonymisation
  - Soft delete (`deleted_at`)
  - Anonymisation (`anonymized = true`)
  - Option de purge complète (admin)
  - Logs d'audit
- [ ] Tests unitaires GDPR
- [ ] Tests d'intégration export/purge

#### Frontend Sécurité
- [ ] Installer `DOMPurify` pour sanitization
- [ ] Sanitizer contenu affiché (notes, commentaires)
- [ ] Afficher contenu HTML sécurisé avec `v-html` + DOMPurify
- [ ] Gestion sécurisée des tokens JWT

#### Documentation GDPR
- [ ] Créer `docs/GDPR.md`
  - Politique de conservation
  - Procédure de demande d'export
  - Procédure de suppression
  - Données collectées
  - Bases légales
  - Contacts DPO (Data Protection Officer)

### Critères d'acceptation
- Rate limiting actif et testé
- Sanitization XSS effective
- Endpoints GDPR fonctionnels et testés
- Documentation GDPR complète
- Logs d'audit pour toutes actions critiques

---

## Version 0.6.0 - Tests & CI/CD (Actuel)

**Statut**: 🔄 En cours

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
- [ ] Créer `.github/workflows/ci.yml`
- [ ] Jobs:
  - **Lint Backend**: ESLint/Prettier backend
  - **Lint Frontend**: ESLint/Prettier frontend
  - **Test Backend**: Jest/Mocha unit + integration
  - **Test Frontend**: Vitest unit tests
  - **Build Backend**: Compiler TypeScript
  - **Build Frontend**: Build Vite production
  - **E2E** (optionnel): Playwright tests
  - **Security**: npm audit + Trivy scan
  - **Docker Build**: Multi-stage Dockerfiles
  - **Docker Scan**: Trivy scan images
- [ ] Badge de statut CI dans README
- [ ] Configuration cache npm pour CI
- [ ] Matrix strategy pour tester Node 18/20

### Critères d'acceptation
- Tous les tests passent
- Coverage backend > 80%, frontend > 70%
- CI passe sur chaque push
- Images Docker scannées sans vulnérabilités critiques
- Documentation CI/CD dans README

---

## Version 0.7.0 - UI/UX & Wireframes

**Dates estimées**: Semaine 6  
**Effort estimé**: 3-5 jours

### Objectifs
Améliorer l'interface et créer la documentation UX.

### Tâches

#### Wireframes
- [ ] Créer `docs/wireframes.md`
- [ ] Wireframe 1: Page d'accueil / Feed
  - Layout général
  - Barre de navigation
  - Filtres (thèmes, catégories)
  - Liste de notes (NoteCard)
- [ ] Wireframe 2: NoteCard
  - Affichage titre, extrait, auteur, date
  - Tags thèmes/catégories
  - Boutons (voir détail, commenter)
- [ ] Wireframe 3: Détail note + commentaires
  - Note complète
  - Liste commentaires
  - Formulaire nouveau commentaire
- [ ] Wireframe 4: Formulaire création note (Teacher)
  - Champs titre/contenu
  - Sélecteurs thèmes (multi-select)
  - Sélecteurs catégories
  - Sélecteur de cibles
  - Bouton publier
- [ ] Wireframe 5: Dashboard enseignant
  - Statistiques notes créées
  - Liste des notes récentes
  - Bouton créer nouvelle note
  - Gestion thèmes/catégories

#### Frontend - Améliorations UI
- [ ] `ThemeManager.vue` - Gestion des thèmes (admin/teacher)
- [ ] `CategoryManager.vue` - Gestion des catégories
- [ ] CSS/Styling amélioré
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Dark mode (optionnel)
- [ ] Accessibilité (WCAG AA)

### Critères d'acceptation
- Wireframes complets et détaillés
- UI cohérente et moderne
- Application responsive
- Accessibilité validée

---

## Version 1.0.0 - Production Ready

**Dates estimées**: Semaine 7  
**Effort estimé**: 3-5 jours

### Objectifs
Finaliser pour production.

### Tâches

#### Documentation
- [ ] README.md complet
  - Instructions installation
  - Guide de démarrage
  - Guide d'exploitation
  - Guide de développement
  - Guide de contribution
- [ ] API Documentation (Swagger/OpenAPI optionnel)
- [ ] User Guide (guide utilisateur)
- [ ] Admin Guide (guide administrateur)

#### Déploiement
- [ ] Docker Compose production testé
- [ ] Variables d'environnement documentées
- [ ] Secrets Docker Swarm configurés
- [ ] Healthchecks Docker
- [ ] Backup/restore PostgreSQL
- [ ] Monitoring basique (logs)

#### Finalisations
- [ ] Revue de code complète
- [ ] Refactoring si nécessaire
- [ ] Vérification sécurité finale
- [ ] Performance testing basique
- [ ] Version tagging (v1.0.0)
- [ ] Release Notes

### Critères d'acceptation
- Application déployable en production
- Documentation complète
- Aucune vulnérabilité critique
- Performance acceptable (< 1s réponse API)
- Tous les tests passent

---

## Versions Futures (Post-MVP)

### Version 1.1.0 - Notifications
- Notifications in-app en temps réel (WebSocket)
- Notifications e-mail (NodeMailer)
- Préférences de notifications utilisateur

### Version 1.2.0 - Recherche Avancée
- Recherche full-text notes (PostgreSQL FTS)
- Filtres avancés
- Tri par pertinence

### Version 1.3.0 - Collaboration
- Édition collaborative notes
- Mentions utilisateurs (@username)
- Réactions aux notes/commentaires

### Version 1.4.0 - Analytics
- Tableau de bord analytics (teacher/admin)
- Statistiques engagement
- Rapports exportables

---

## Timeline Globale

| Version | Description | Durée | Dates estimées |
|---------|-------------|-------|----------------|
| 0.1.0 | Fondations (actuel) | - | ✅ Complété |
| 0.2.0 | DB & TypeScript | 3-5 jours | Sem. 1 |
| 0.3.0 | API Thèmes/Catégories | 5-7 jours | Sem. 2 |
| 0.4.0 | Feed & Assignation | 7-10 jours | Sem. 3 |
| 0.5.0 | Sécurité & GDPR | 5-7 jours | Sem. 4 |
| 0.6.0 | Tests & CI/CD | 5-7 jours | Sem. 5 |
| 0.7.0 | UI/UX & Wireframes | 3-5 jours | Sem. 6 |
| 1.0.0 | Production Ready | 3-5 jours | Sem. 7 |

**Total estimé**: 6-8 semaines pour MVP production-ready

---

## Priorités

### 🔴 Haute Priorité (MVP Bloquant)
- Migrations base de données
- API Feed avec filtrage
- Frontend TypeScript/Pinia
- Composants Feed (FeedList, NoteCard)
- Formulaire création note (Teacher)
- GDPR endpoints
- CI/CD basique

### 🟡 Moyenne Priorité (MVP Important)
- Tests unitaires complets
- Tests E2E
- Rate limiting
- Sanitization XSS
- Audit logging
- Documentation GDPR

### 🟢 Basse Priorité (Nice-to-have)
- Wireframes détaillés
- UI avancée (dark mode, etc.)
- Performance optimization
- Monitoring avancé
- Analytics

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

**Dernière mise à jour**: 12 décembre 2024  
**Version du document**: 1.0  
**Auteur**: GitHub Copilot Agent

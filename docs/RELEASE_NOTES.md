# NOTIMATIC — Notes de Version & Historique de Validation

> **Document** : Changelog détaillé par version  
> **Projet** : NOTIMATIC — Application de prise de notes sécurisée  
> **Version du document** : 2.0  
> **Dernière mise à jour** : 1er avril 2026

---

## Sommaire

| Version | Date | Statut |
|---------|------|--------|
| [CI Fix — PR #18](#ci-fix--strict-workflow-pr-18) | 1 avr. 2026 | ✅ |
| [v1.0.0 — Production Ready](#v100---production-ready) | 17 fév. 2026 | ✅ |
| [v0.7.0 — UI/UX & Wireframes](#v070---uiux--wireframes) | 17 fév. 2026 | ✅ |
| [v0.6.0 — Tests & CI/CD](#v060---testing--cicd-automation) | 17 fév. 2026 | ✅ |
| [v0.5.0 — Sécurité & RGPD](#v050---security--gdpr-compliance) | 17 fév. 2026 | ✅ |
| [v0.2.0 — Core Customization](#v020---core-customization--organization) | 16 fév. 2026 | ✅ |

---

## CI Fix — Strict Workflow (PR #18)

**Date :** 1er avril 2026  
**Branche/PR :** `ci-fix` → `main` (PR #18)  
**Statut :** ✅ Appliqué

### Résumé
Correction et durcissement du pipeline GitHub Actions pour imposer des portes qualité strictes sur chaque push et pull request.

### Changements apportés

| Domaine | Description |
| :--- | :--- |
| **Structure workflow** | Jobs séparés : `backend-lint`, `backend-test`, `frontend-lint`, `frontend-test`, `npm-audit`, `trivy-scan`, `docker-build`, `e2e-smoke`, `upload-reports` |
| **Matrix builds** | Backend lint + test s'exécutent sur Node 18 **et** Node 20 |
| **Portes de couverture** | Vérification inline des seuils : ≥ 80% backend, ≥ 70% frontend |
| **Sécurité** | `npm audit --audit-level=critical` pour backend et frontend ; scan Trivy (CRITICAL) sur images Docker |
| **E2E** | Tests Playwright déclenchés uniquement sur la branche `main` ou `workflow_dispatch` |
| **Permissions** | `permissions: contents: read; security-events: write; actions: read` déclarées explicitement |
| **Cache npm** | `cache: npm` activé sur les jobs lint/test (backend et frontend) ; non activé sur `npm-audit` et `e2e-smoke` pour garantir une résolution propre |

### Impact
- Le CI échoue immédiatement si les seuils de couverture ne sont pas atteints
- Les images Docker sont scannées pour les CVE critiques avant toute promotion
- La matrix Node garantit la compatibilité sur les deux versions LTS supportées

---


## v0.2.0 - Core Customization & Organization
**Date:** February 16, 2026  
**Status:** ✅ Validated

### 1. Features Implemented
The following modules were added to support user personalization and content organization:

| Module | Function | Description | Endpoint |
| :--- | :--- | :--- | :--- |
| **Profiles** | `createProfile` | Create user profile with bio, avatar, preferences | `POST /api/v1/profiles` |
| | `getProfile` | Retrieve own or other user's profile | `GET /api/v1/profiles/:userId` |
| | `updateProfile` | Update personalization settings | `PUT /api/v1/profiles` |
| **Themes** | `createTheme` | (Admin) Create new UI themes | `POST /api/v1/themes` |
| | `getThemes` | List available themes | `GET /api/v1/themes` |
| | `applyTheme` | Set user's active theme | `POST /api/v1/themes/apply` |
| **Categories** | `createCategory` | Create hierarchical note categories | `POST /api/v1/categories` |
| | `getCategories` | List all categories with hierarchy | `GET /api/v1/categories` |

### 2. Validation Strategy
Integration tests were created to verify the end-to-end flow of these new features using a fresh testing environment.

*   **Test Suite:** `tests/integration/test_v0_2_0.py`
*   **Environment:** `infrastructure/docker-compose.test.yml` (Isolated DB & Backend)
*   **Authentication:** Uses Admin setup flow to bootstrap a session.

### 3. Test Results

**Run Date:** 2026-02-16  
**Command:** `pytest tests/integration/test_v0_2_0.py`

| Test Case | Objective | Result |
| :--- | :--- | :--- |
| `test_health` | Verify API is reachable and healthy | ✅ PASSED |
| `test_create_profile` | Verify a user can create and retrieve their profile | ✅ PASSED |
| `test_themes_lifecycle` | Verify Admin creation of themes and User application | ✅ PASSED |
| `test_categories_lifecycle` | Verify creation and retrieval of categories | ✅ PASSED |

**Raw Output:**
```text
tests/integration/test_v0_2_0.py ....                                    [100%]
============================== 4 passed in 1.00s ==============================
```

### 4. Infrastructure Changes
*   **Fix:** ADDED `infrastructure/docker-compose.test.yml` for dedicated test environment.
*   **Fix:** UPDATED `infrastructure/Dockerfile.backend` to use `node:18-bullseye` (fixed `argon2` binary incompatibility).

## v0.5.0 - Security & GDPR Compliance

**Date:** February 17, 2026  
**Status:** ✅ Implemented

### 1. Features Implemented
The following modules were added to enhance application security and ensure GDPR compliance:

| Module | Function | Description | Endpoint |
| :--- | :--- | :--- | :--- |
| **Security** | `Rate Limiting` | Applied API, Login and Comment rate limits | Global Middleware |
| | `Sanitization` | Input sanitization to prevent XSS | Global Middleware |
| | `Frontend Security` | DOMPurify wrapper for safe content rendering | `frontend/src/utils/sanitize.js` |
| **GDPR** | `Export Data` | Allow users to export all their data | `GET /api/v1/users/:id/export` |
| | `Delete Account` | Soft delete functionality for user accounts | `DELETE /api/v1/users/:id` |
| **Audit** | `Audit Logging` | Log critical actions (Note CRUD, GDPR Ops) | Internal Service |

### 2. Infrastructure Changes
*   **Dependencies:** Added `express-rate-limit`, `validator` (Backend), `dompurify` (Frontend).
*   **Database:** Utilized `audit_logs` and `gdpr_export_requests` tables (Migration 004).

## v0.6.0 - Testing & CI/CD Automation

**Date:** February 17, 2026  
**Status:** ✅ Implemented

### 1. Features Implemented
Automation and quality assurance infrastructure has been established.

| Module | Function | Description | Technology |
| :--- | :--- | :--- | :--- |
| **Backend Testing** | `Unit Tests` | Testing framework setup for Middleware | `Jest`, `Supertest` |
| | `Auth Tests` | Verification of Auth & RBAC logic | `Jest` |
| **Frontend Testing** | `Component Tests` | Unit testing for `NoteCard.vue` | `Vitest`, `Vue Test Utils` |
| **CI/CD** | `Pipeline` | Automated testing on Push/PR | `GitHub Actions` |

### 2. Infrastructure Changes
*   **Backend:** Configured `jest.config.js`, added `tests/` directory structure.
*   **Frontend:** Configured `vitest`, added `src/tests/` directory.
*   **CI:** Validated existing `.github/workflows/ci.yml` with updated test scripts.
*   **Fix:** ADDED `frontend/nginx.conf` for production build stability.
*   **Migration:** Added migrations 001-008 covering all modern schema requirements.

## v0.7.0 - UI/UX & Wireframes

**Date:** February 17, 2026
**Status:** ✅ Implemented

### 1. Features Implemented
User Interface and Experience enhancements focusing on theming and feedback.

| Module | Function | Description | Component |
| :--- | :--- | :--- | :--- |
| **Theming** | `Dark Mode` | Toggleable Dark/Light theme with persistence | `useTheme.js` |
| **UX** | `Loaders` | Visual feedback for async operations | `Loader.vue` |
| **Design** | `Responsive` | Improved mobile layout and flex-wrap support | `Dashboard.vue`, `Feed.vue` |

### 2. Validation Strategy
- **Visual Testing:** Verified theme toggling across key components (Dashboard, Feed, Auth).
- **Component Testing:** Updated unit tests for `NoteCard.vue` to respect theme props.

---

## v1.0.0 - Production Ready

**Date:** February 17, 2026
**Status:** ✅ Released

### 1. Final Delivery
This major release marks the completion of the MVP roadmap, providing a stable, secure, and feature-rich platform.

| Component | Status | Highlights |
| :--- | :--- | :--- |
| **Backend** | v1.0.0 | Full RBAC, GDPR Compliance, Audit Logging, Themes/Categories API |
| **Frontend** | v1.0.0 | Responsive UI, Dark Mode, Admin Dashboard, Component Testing |
| **Infrastructure** | Stable | Production Docker Compose, Traefik Proxy, Automated Migrations |
| **Documentation** | Complete | Comprehensive guides for Users, Admins, and Developers |

### 2. Validation
- **Quality Assurance**: Automated tests (unit, integration) cover critical paths. Note: Some test discovery configuration on Windows environments requires manual verification which was performed successfully.
- **Security Check**: Dependencies reviewed, security headers configured.
- **Performance**: Validated response times and render performance.

### 3. Known Issues
- Test runners may require environment-specific configuration on Windows (path separators).
- Advanced search (full-text) is scheduled for v1.2.0.

---

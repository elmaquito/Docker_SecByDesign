# Release Notes & Validation History

This document tracks the implemented versions of Notimatic, detailing the features added, the validation strategy employed, and the actual test results.

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
*   **Fix:** ADDED `frontend/nginx.conf` for production build stability.
*   **Migration:** Added migrations 001-008 covering all new schemas.

---

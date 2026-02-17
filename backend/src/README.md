# Backend Architecture (v0.3.0)

## Overview
The backend is a Node.js/Express application using a Modular Monolith architecture.

## Folder Structure

- `src/main.ts`: Application entry point and assembler.
- `src/auth/`: Authentication logic (JWT, Argon2, Cookie management).
- `src/users/`: User management (CRUD, Setup).
- `src/notes/`: core Notes logic (CRUD, RBAC).
- `src/tags/`: Tag management logic.
- `src/metadata/`: Metadata resources (Themes, Categories).
- `src/common/`: Shared utilities (Middleware, Error Handling, Types).
- `src/config/`: Configuration (Database, Env vars).

## Key Features

- **Authentication**: HTTP-Only Cookies with Access (short-lived) and Refresh (long-lived) tokens.
- **Authorization**: RBAC (Role-Based Access Control) using `authorize(['role'])` middleware.
- **Validation**: Zod schemas for request validation.
- **Error Handling**: Centralized error handler in `common/middleware.ts`.

## Testing
Integration tests are located in `tests/integration/api_test_suite.py`.
Verify functionality by running:
```bash
python3 tests/integration/api_test_suite.py
```

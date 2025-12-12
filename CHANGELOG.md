# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **[CRITICAL]** Fixed login "Internal server error" bug caused by overly broad error handling
  - Replaced `.parse()` with `.safeParse()` for Zod validation
  - Added PostgreSQL error code detection (42P01 for missing tables)
  - Separated HTTP status codes (400 validation, 401 auth, 500 server errors)
  - Enhanced logging with contextual information
  - See [REPORT_LOGIN_FIX.md](docs/REPORT_LOGIN_FIX.md) for details

### Added
- Database validation script (`backend/check-db.js`) for health checks
- Comprehensive architecture review document ([ARCHITECTURE_REVIEW.md](docs/ARCHITECTURE_REVIEW.md))
- Developer guide with coding standards ([DEVELOPMENT.md](docs/DEVELOPMENT.md))
- Login bug fix report with root cause analysis ([REPORT_LOGIN_FIX.md](docs/REPORT_LOGIN_FIX.md))

### Changed
- Improved error handling in login endpoint with specific error types
- Enhanced logging format with context tags (e.g., `[Login]`, `[Auth]`)

### Security
- Better error message isolation (detailed logs server-side, generic messages client-side)
- No sensitive information exposed in error responses

## [0.2.0] - 2024-12-12

### Added
- Zero-Trust authentication system with refresh token rotation
- Session management with database-stored refresh tokens
- Auto-refresh middleware for seamless token renewal
- JWT access tokens (15 min TTL)
- Opaque refresh tokens (30 day TTL, SHA-256 hashed)
- Password reset functionality
- Account management endpoints
- Reactions system (upvotes/downvotes) with materialized counts
- Unified tags system (classes, specialties, groups, categories)
- Note save improvements with double-submission prevention
- Dynamic hostname detection for API configuration
- Comprehensive Zero-Trust documentation

### Changed
- Migrated from Basic Auth to JWT + Refresh Token authentication
- Cookie security settings now environment-aware (dev vs production)
- Session table with expiration and revocation support
- Enhanced CORS configuration with explicit allowed origins

### Security
- Implemented Argon2 password hashing
- HTTP-only cookies for token storage
- SameSite cookie settings (lax in dev, none in production with HTTPS)
- Session revocation on logout
- Token rotation on refresh

## [0.1.0] - Initial Release

### Added
- Basic Express backend with TypeScript
- Vue 3 frontend with Vite
- PostgreSQL database with migrations
- User authentication and authorization
- Notes CRUD operations
- Comments on notes
- Role-based access control (admin, technician, teacher, student)
- Docker Compose for development
- CI/CD pipeline with GitHub Actions
- Comprehensive documentation
- Security headers with Helmet
- CORS configuration
- Input validation with Zod

### Database
- Users table with role enum
- Notes table with user relationship
- Comments table
- Profiles table (user metadata)
- Themes and categories (M2M with notes)
- Note targets (targeting/assignment rules)
- Audit logs for compliance
- GDPR export requests table
- Password reset tokens table

### Infrastructure
- Docker multi-stage builds
- Traefik reverse proxy configuration
- PostgreSQL 16 container
- Health checks and monitoring setup
- Development, debug, and production Docker Compose files

---

## Version History

- **0.2.0** (2024-12-12) - Zero-Trust Authentication
- **0.1.0** (Initial) - MVP with basic auth

---

## Migration Guides

### Upgrading from 0.1.0 to 0.2.0

**Database Changes:**
```bash
# Run migration 008 to add sessions table
psql -h localhost -U user -d notimatic_dev -f backend/migrations/008_add_sessions.sql

# Or run all migrations
cd backend
bash migrate.sh
```

**Environment Variables:**
```bash
# Add to backend/.env
REFRESH_TOKEN_SECRET=your_secure_refresh_secret_here

# Update CORS_ORIGINS to include both localhost and 127.0.0.1
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

**Breaking Changes:**
- Authentication now uses cookies instead of headers
- Access tokens expire after 15 minutes (auto-refreshed)
- Old session data will be invalidated (users need to re-login)

**API Changes:**
- `POST /api/v1/auth/login` now returns tokens in HTTP-only cookies
- `POST /api/v1/auth/logout` requires authentication
- Added `POST /api/v1/auth/refresh` for explicit token refresh

---

## Reporting Issues

Found a bug? Please report it on [GitHub Issues](https://github.com/elmaquito/NOTIMATIC/issues) with:
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Relevant logs or screenshots

---

## Contributing

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for contribution guidelines.

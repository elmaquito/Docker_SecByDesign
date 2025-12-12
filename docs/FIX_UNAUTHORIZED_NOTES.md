# Fix: "Unauthorized" Error for Note Creation

## Problem

Both students and teachers were receiving "Unauthorized" errors when trying to create new notes, despite being logged in successfully.

## Root Cause

The issue was caused by a **cookie domain mismatch** between the frontend and backend:

1. **Hardcoded IP addresses**: All API calls used `http://127.0.0.1:3001`
2. **Browser cookie behavior**: When users accessed the app via `http://localhost:5173`, the browser treated `localhost` and `127.0.0.1` as different origins
3. **Cookie not sent**: Cookies set for `127.0.0.1` were not sent when the frontend made requests from `localhost` pages (and vice versa)
4. **Authentication failure**: The backend's `authenticateToken` middleware didn't receive the cookie, returning "Unauthorized"

### Why Both Roles Failed

The issue affected both students and teachers because:
- The error occurred at the **authentication** layer (before role checking)
- The `authenticateToken` middleware rejected requests without cookies
- Role-based authorization never ran because authentication failed first

## Solution

### 1. Dynamic Hostname Detection (Frontend)

Created a centralized API configuration (`frontend/src/config/api.js`) that:
- Automatically detects the hostname from `window.location.hostname`
- Uses the same hostname (localhost or 127.0.0.1) for API calls
- Ensures cookies are sent because the domain matches

**Priority order:**
1. `VITE_API_URL` environment variable (full URL)
2. `VITE_API_HOST` + `VITE_API_PORT` environment variables
3. Auto-detection from `window.location.hostname` + default port 3001

### 2. Centralized API Configuration

Replaced hardcoded URLs in all components:
- `Dashboard.vue` (8 occurrences)
- `Login.vue`
- `App.vue`
- `Feed.vue`
- `Reactions.vue`
- `AccountSettings.vue`
- `ForgotPassword.vue`
- `ResetPassword.vue`

**Before:**
```javascript
fetch('http://127.0.0.1:3001/api/v1/notes', { credentials: 'include' })
```

**After:**
```javascript
import { API_V1_BASE_URL } from '../config/api.js'
fetch(`${API_V1_BASE_URL}/notes`, { credentials: 'include' })
```

### 3. Backend Environment Variables

Added `CORS_ORIGINS` environment variable support:
```javascript
const CORS_ORIGINS = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];
```

### 4. Enhanced Logging

Added detailed authentication logging to help debug issues:
```
[Auth] POST /notes
[Auth] Origin: http://localhost:5173
[Auth] Cookie header: present
[Auth] Token found: yes
[Auth] SUCCESS: User student123 (student)
[Authorize] User role: student, Allowed roles: teacher, student, admin
[Authorize] SUCCESS: Role authorized
```

## Testing

### Manual Testing

1. **Access via localhost:**
   ```
   Open: http://localhost:5173
   Login as student
   Create a note
   Expected: Success (cookie sent to localhost:3001)
   ```

2. **Access via 127.0.0.1:**
   ```
   Open: http://127.0.0.1:5173
   Login as teacher
   Create a note
   Expected: Success (cookie sent to 127.0.0.1:3001)
   ```

3. **Check browser DevTools:**
   - Network tab: Verify cookie is sent in request headers
   - Application tab > Cookies: Verify cookie domain matches URL

### Environment Variable Testing

1. **Set custom API URL:**
   ```bash
   # frontend/.env
   VITE_API_URL=http://api.myserver.com:3001
   ```

2. **Set custom CORS origins:**
   ```bash
   # backend/.env
   CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://app.example.com
   ```

## Files Modified

### Frontend
- `src/config/api.js` (new)
- `src/App.vue`
- `src/components/Dashboard.vue`
- `src/components/Login.vue`
- `src/components/Feed.vue`
- `src/components/Reactions.vue`
- `src/components/AccountSettings.vue`
- `src/components/ForgotPassword.vue`
- `src/components/ResetPassword.vue`
- `.env.example` (new)

### Backend
- `src/main.ts` (CORS config + logging)
- `.env.example` (new)

### Documentation
- `README.md` (updated with environment variable documentation)

## Best Practices Implemented

1. **Environment-aware configuration**: Use env vars for different environments
2. **Centralized API config**: Single source of truth for API URLs
3. **Smart defaults**: Auto-detect hostname in development
4. **Security logging**: Track authentication attempts without exposing sensitive data
5. **Documentation**: Comprehensive `.env.example` files

## Migration Guide

For existing deployments:

1. **No changes required for development** (auto-detection works)
2. **For production**, set environment variables:
   ```bash
   # Frontend
   VITE_API_URL=https://api.yourdomain.com
   
   # Backend
   CORS_ORIGINS=https://app.yourdomain.com,https://www.yourdomain.com
   ```

## Related Issues

This fix also resolves:
- Inconsistent cookie behavior across browsers
- CORS issues when accessing from different hostnames
- Need to hardcode different URLs for dev/prod

## Future Improvements

- [ ] Add automated tests for cookie-based authentication
- [ ] Add health check endpoint that returns CORS config
- [ ] Add frontend error messages when API is unreachable
- [ ] Consider using a proxy in development to avoid CORS entirely

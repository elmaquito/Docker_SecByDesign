# Developer Guide

Welcome to the NOTIMATIC development team! This guide will help you get started with contributing to the project.

---

## Table of Contents
1. [Getting Started](#getting-started)
2. [Development Environment](#development-environment)
3. [Project Structure](#project-structure)
4. [Coding Standards](#coding-standards)
5. [Testing](#testing)
6. [Git Workflow](#git-workflow)
7. [Common Tasks](#common-tasks)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites
- **Node.js:** v20.x or higher
- **PostgreSQL:** v16 or higher
- **Docker:** (optional, for container development)
- **Git:** Latest version
- **Code Editor:** VS Code recommended

### First-Time Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/elmaquito/NOTIMATIC.git
   cd NOTIMATIC
   ```

2. **Install dependencies:**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Configure environment:**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your database credentials
   
   # Frontend
   cd ../frontend
   cp .env.example .env
   # Configure API endpoint if needed
   ```

4. **Setup database:**
   ```bash
   # Create database
   createdb notimatic_dev
   
   # Run migrations
   cd backend
   bash migrate.sh
   
   # Verify setup
   node check-db.js
   ```

5. **Run the application:**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run start:dev
   
   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

6. **Access the application:**
   - Frontend: http://localhost:5173 or http://127.0.0.1:5173
   - Backend API: http://localhost:3001
   - Note: Use the same hostname (localhost or 127.0.0.1) for both to ensure cookies work

---

## Development Environment

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "Vue.volar",
    "ms-vscode.vscode-typescript-next",
    "rangav.vscode-thunder-client",
    "cweijan.vscode-postgresql-client2"
  ]
}
```

### Environment Variables

#### Backend (.env)
```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=user
DB_PASSWORD=your_password
DB_NAME=notimatic_dev
DB_PORT=5432

# Security
JWT_SECRET=dev_jwt_secret_change_me_in_production
REFRESH_TOKEN_SECRET=dev_refresh_secret_change_me_in_production

# CORS
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

#### Frontend (.env)
```bash
# API Configuration (optional - auto-detected if not set)
VITE_API_HOST=localhost
VITE_API_PORT=3001

# Or use full URL:
# VITE_API_URL=http://localhost:3001
```

### Database Setup

#### Using Docker
```bash
docker-compose -f infrastructure/docker-compose.dev.yml up -d database
```

#### Using Local PostgreSQL
```bash
# macOS (Homebrew)
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/Debian
sudo apt install postgresql-16
sudo systemctl start postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/
```

---

## Project Structure

### Backend Architecture

```
backend/
├── src/
│   ├── auth/              # Authentication services
│   │   └── token.service.ts
│   └── main.ts            # Main application file
├── migrations/            # Database migrations
├── tests/
│   └── unit/             # Unit tests
├── check-db.js           # Database validation script
├── init.sql              # Initial database schema
└── package.json
```

**Key Files:**
- `src/main.ts` - Express app, routes, middleware
- `src/auth/token.service.ts` - JWT and refresh token handling
- `migrations/` - SQL migration files (numbered)
- `check-db.js` - Diagnostic script for database health

### Frontend Architecture

```
frontend/
├── src/
│   ├── components/       # Vue components
│   │   ├── Dashboard.vue
│   │   ├── Feed.vue
│   │   ├── AccountSettings.vue
│   │   └── ...
│   ├── config/
│   │   └── api.js        # API configuration
│   ├── utils/
│   │   └── theme.js      # Theme utilities
│   ├── App.vue           # Root component
│   └── main.js           # App entry point
└── package.json
```

---

## Coding Standards

### TypeScript

**Style Guide:** Follow the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)

**Key Points:**
- Use `const` and `let`, never `var`
- Always define types for function parameters and return values
- Use interfaces for object shapes
- Enable `strict` mode in tsconfig.json

**Example:**
```typescript
// ✅ Good
interface User {
  id: number;
  username: string;
  role: string;
}

async function getUserById(id: number): Promise<User | null> {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

// ❌ Bad
async function getUserById(id) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}
```

### JavaScript (Frontend - to be migrated to TypeScript)

**Style Guide:** Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)

**Key Points:**
- Use `const` and `let`
- Use template literals for string interpolation
- Use arrow functions for callbacks
- Use destructuring where appropriate

### Vue.js

**Style Guide:** Follow the [Vue.js Style Guide](https://vuejs.org/style-guide/)

**Key Points:**
- Use Composition API (not Options API)
- Use `<script setup>` syntax
- Props should be validated
- Events should be documented

**Example:**
```vue
<script setup>
import { ref, computed } from 'vue'

// Props
const props = defineProps({
  userId: {
    type: Number,
    required: true
  }
})

// Emits
const emit = defineEmits(['user-updated'])

// State
const user = ref(null)

// Computed
const userDisplayName = computed(() => {
  return user.value?.username || 'Unknown'
})

// Methods
async function fetchUser() {
  // ...
}
</script>
```

### SQL

**Naming Conventions:**
- Tables: `snake_case`, plural (e.g., `users`, `notes`)
- Columns: `snake_case`, singular (e.g., `user_id`, `created_at`)
- Indexes: `idx_{table}_{column}` (e.g., `idx_users_username`)
- Foreign keys: `{table}_id` (e.g., `user_id`)

**Best Practices:**
- Always use parameterized queries
- Add indexes for foreign keys
- Use `ON DELETE CASCADE` where appropriate
- Include `created_at` and `updated_at` timestamps

### Error Handling

**Backend:**
```typescript
// ✅ Good - Specific error handling
try {
  const user = await getUserById(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
} catch (err) {
  if (err.code === '42P01') { // Missing table
    console.error('Database schema error:', err);
    return res.status(500).json({ error: 'Server configuration error' });
  }
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
}

// ❌ Bad - Generic error handling
try {
  const user = await getUserById(id);
  res.json(user);
} catch (err) {
  res.status(500).json({ error: 'Internal error' });
}
```

**Frontend:**
```javascript
// ✅ Good
async function saveNote(note) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(note)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Save failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to save note:', error);
    throw error; // Re-throw for component to handle
  }
}
```

### Logging

**Levels:**
- `console.log()` - Debug information (remove before commit)
- `console.info()` - Information (e.g., "Server started")
- `console.warn()` - Warnings (e.g., deprecated usage)
- `console.error()` - Errors (e.g., exceptions)

**Format:**
```typescript
// Use context tags for filtering
console.log('[Auth] User authenticated:', username);
console.error('[Database] Connection failed:', err);
```

---

## Testing

### Backend Testing

**Framework:** Jest

**Running Tests:**
```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Writing Tests:**
```typescript
// tests/unit/services/user.service.test.ts
import { UserService } from '../../../src/services/user.service';

describe('UserService', () => {
  let userService: UserService;
  
  beforeEach(() => {
    userService = new UserService(mockPool);
  });
  
  describe('getUserById', () => {
    it('should return user when found', async () => {
      const user = await userService.getUserById(1);
      expect(user).toBeDefined();
      expect(user.id).toBe(1);
    });
    
    it('should return null when user not found', async () => {
      const user = await userService.getUserById(999);
      expect(user).toBeNull();
    });
  });
});
```

### Frontend Testing

**Framework:** Vitest (to be added)

**Running Tests:**
```bash
cd frontend
npm test
```

---

## Git Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates
- `test/description` - Test additions

**Examples:**
- `feature/add-comments`
- `fix/login-error`
- `refactor/split-main-file`
- `docs/update-readme`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code restructuring
- `test` - Adding tests
- `chore` - Maintenance

**Examples:**
```
feat(auth): add password reset functionality

fix(notes): resolve save error on long content

docs(readme): update installation instructions

refactor(main): extract routes to separate files
```

### Pull Request Process

1. **Create branch:**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin feature/my-feature
   ```

4. **Create Pull Request:**
   - Go to GitHub
   - Click "New Pull Request"
   - Fill in template
   - Request review

5. **Address review comments:**
   ```bash
   # Make changes
   git add .
   git commit -m "fix: address review comments"
   git push
   ```

6. **Merge:**
   - Wait for approval
   - Ensure CI passes
   - Squash and merge

---

## Common Tasks

### Add a New Database Migration

1. **Create migration file:**
   ```bash
   cd backend/migrations
   # Create file: NNN_description.sql (e.g., 009_add_notifications.sql)
   ```

2. **Write migration:**
   ```sql
   -- Migration: Add notifications table
   CREATE TABLE IF NOT EXISTS notifications (
     id SERIAL PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     message TEXT NOT NULL,
     read BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );
   
   CREATE INDEX idx_notifications_user_id ON notifications(user_id);
   ```

3. **Run migration:**
   ```bash
   bash migrate.sh
   ```

4. **Verify:**
   ```bash
   node check-db.js
   ```

### Add a New API Endpoint

1. **Define route (in main.ts for now):**
   ```typescript
   api.post('/notifications', authenticateToken, async (req: any, res: Response) => {
     try {
       const { message } = req.body;
       const userId = req.user.id;
       
       const result = await pool.query(
         'INSERT INTO notifications (user_id, message) VALUES ($1, $2) RETURNING *',
         [userId, message]
       );
       
       res.status(201).json(result.rows[0]);
     } catch (err) {
       console.error('[Notifications] Error:', err);
       res.status(500).json({ error: 'Internal server error' });
     }
   });
   ```

2. **Add tests:**
   ```typescript
   describe('POST /api/v1/notifications', () => {
     it('should create notification', async () => {
       const response = await request(app)
         .post('/api/v1/notifications')
         .set('Cookie', authCookie)
         .send({ message: 'Test notification' })
         .expect(201);
       
       expect(response.body.message).toBe('Test notification');
     });
   });
   ```

3. **Document in API.md**

### Add a Vue Component

1. **Create component file:**
   ```bash
   cd frontend/src/components
   # Create: NotificationList.vue
   ```

2. **Implement component:**
   ```vue
   <template>
     <div class="notification-list">
       <div v-for="notification in notifications" :key="notification.id" class="notification">
         {{ notification.message }}
       </div>
     </div>
   </template>
   
   <script setup>
   import { ref, onMounted } from 'vue'
   
   const notifications = ref([])
   
   onMounted(async () => {
     await fetchNotifications()
   })
   
   async function fetchNotifications() {
     const response = await fetch('http://127.0.0.1:3001/api/v1/notifications', {
       credentials: 'include'
     })
     notifications.value = await response.json()
   }
   </script>
   
   <style scoped>
   .notification-list {
     /* styles */
   }
   </style>
   ```

3. **Use in parent component:**
   ```vue
   <template>
     <NotificationList />
   </template>
   
   <script setup>
   import NotificationList from './components/NotificationList.vue'
   </script>
   ```

### Run Database Migrations

```bash
cd backend

# Check current state
node check-db.js

# Run migrations
bash migrate.sh

# Windows
.\migrate.ps1

# Verify
node check-db.js
```

---

## Troubleshooting

### Backend Won't Start

**Error:** `ECONNREFUSED` or database connection error

**Solution:**
```bash
# Check if PostgreSQL is running
psql -h localhost -U user -d notimatic_dev -c "SELECT NOW();"

# If not running, start it:
# macOS
brew services start postgresql@16

# Linux
sudo systemctl start postgresql

# Docker
docker-compose -f infrastructure/docker-compose.dev.yml up -d database
```

### Frontend Can't Connect to Backend

**Error:** CORS error or 401 Unauthorized

**Solution:**
```bash
# 1. Check backend is running
curl http://localhost:3001/api/v1/health

# 2. Verify you're using the same hostname
# If frontend is on localhost:5173, use localhost:3001 for API
# If frontend is on 127.0.0.1:5173, use 127.0.0.1:3001 for API

# 3. Check CORS_ORIGINS in backend/.env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Migrations Not Applied

**Error:** `relation "sessions" does not exist`

**Solution:**
```bash
# 1. Check migration status
node backend/check-db.js

# 2. Run migrations
cd backend
bash migrate.sh

# 3. If migrations fail, check logs
# Common issues:
#   - Database doesn't exist: createdb notimatic_dev
#   - Wrong credentials: check .env
#   - Permission denied: grant privileges to user
```

### Tests Failing

**Error:** Database connection errors in tests

**Solution:**
```bash
# 1. Create test database
createdb notimatic_test

# 2. Set test environment variables
export DB_HOST=localhost
export DB_USER=user
export DB_PASSWORD=test_password
export DB_NAME=notimatic_test
export JWT_SECRET=test_jwt_secret

# 3. Run migrations on test database
psql -h localhost -U user -d notimatic_test -f backend/init.sql

# 4. Run tests
cd backend
npm test
```

### Login Not Working

**Error:** "Internal server error" on login

**Solution:**
```bash
# 1. Check database health
node backend/check-db.js

# 2. Check if sessions table exists
psql -h localhost -U user -d notimatic_dev -c "\dt sessions"

# 3. If missing, run migration 008
psql -h localhost -U user -d notimatic_dev -f backend/migrations/008_add_sessions.sql

# 4. Check logs for specific error
# Look for PostgreSQL error codes like 42P01 (missing table)
```

---

## Additional Resources

### Documentation
- [README.md](../README.md) - Project overview
- [ARCHITECTURE_REVIEW.md](ARCHITECTURE_REVIEW.md) - Architecture analysis
- [REPORT_LOGIN_FIX.md](REPORT_LOGIN_FIX.md) - Login bug fix details
- [API.md](API.md) - API documentation
- [ZERO_TRUST.md](ZERO_TRUST.md) - Authentication details

### External Resources
- [Express.js Docs](https://expressjs.com/)
- [Vue 3 Docs](https://vuejs.org/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/)

### Getting Help

- **GitHub Issues:** https://github.com/elmaquito/NOTIMATIC/issues
- **Documentation:** Check the `docs/` folder
- **Team Chat:** (Add your communication channel here)

---

## Contributing Checklist

Before submitting a pull request, ensure:

- [ ] Code follows style guide
- [ ] All tests pass (`npm test`)
- [ ] New tests added for new features
- [ ] TypeScript compiles (`npm run build`)
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] No console.log statements
- [ ] No secrets in code
- [ ] PR description filled out

---

**Happy Coding! 🚀**

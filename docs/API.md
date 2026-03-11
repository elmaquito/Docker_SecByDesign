# NOTIMATIC API Documentation

## Health Check

### GET /api/v1/health
Check system status.

**Response:**
```json
{
  "status": "OK",
  "time": "2025-12-12T13:54:16.448Z"
}
```

## Authentication Endpoints

### POST /api/v1/auth/login
Login to the system.

**Request:**
```json
{
  "username": "admin",
  "password": "password123456789"
}
```

**Response:**
```json
{
  "message": "Logged in",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

### POST /api/v1/auth/logout
Logout from the system (requires authentication).

**Response:**
```json
{
  "message": "Logged out"
}
```

### POST /api/v1/auth/password-reset/request
Request a password reset link.

**Request:**
```json
{
  "username": "admin"
}
```

**Response:**
```json
{
  "message": "If an account exists with this username, a password reset link has been sent.",
  "resetLink": "http://localhost:5173/reset-password?token=..." 
}
```

Note: `resetLink` is only included in development mode.

### POST /api/v1/auth/password-reset/complete
Complete the password reset process.

**Request:**
```json
{
  "token": "abc123...",
  "newPassword": "newpassword123456789"
}
```

**Response:**
```json
{
  "message": "Password reset successful"
}
```

## Account Management

### GET /api/v1/account
Get current user's account information (requires authentication).

**Response:**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "phone": "+33612345678",
  "role": "admin",
  "created_at": "2025-12-12T13:54:16.448Z"
}
```

### PATCH /api/v1/account
Update account information (requires authentication, not available for students).

**Request:**
```json
{
  "email": "newemail@example.com",
  "phone": "+33698765432",
  "password": "newpassword123456789"
}
```

**Response:**
```json
{
  "id": 1,
  "username": "admin",
  "email": "newemail@example.com",
  "phone": "+33698765432",
  "role": "admin"
}
```

## Tags Management

### GET /api/v1/tags
List all tags (requires authentication).

**Response:**
```json
[
  {
    "id": 1,
    "type": "classe",
    "name": "Cyber1",
    "meta": {"color": "blue"},
    "is_default_for_student_view": false,
    "created_by": 1,
    "created_at": "2025-12-12T13:53:30.123Z",
    "updated_at": "2025-12-12T13:53:30.123Z"
  }
]
```

### POST /api/v1/tags
Create a new tag (requires admin/teacher/technician role).

**Request:**
```json
{
  "type": "categorie",
  "name": "Important",
  "meta": {"color": "red"},
  "is_default_for_student_view": false
}
```

**Response:**
```json
{
  "id": 19,
  "type": "categorie",
  "name": "Important",
  "meta": {"color": "red"},
  "is_default_for_student_view": false,
  "created_by": 1,
  "created_at": "2025-12-12T14:00:00.123Z",
  "updated_at": "2025-12-12T14:00:00.123Z"
}
```

### PATCH /api/v1/tags/:id
Update a tag (requires admin/teacher/technician role).

**Request:**
```json
{
  "name": "Very Important",
  "is_default_for_student_view": true
}
```

**Response:**
```json
{
  "id": 19,
  "type": "categorie",
  "name": "Very Important",
  "meta": {"color": "red"},
  "is_default_for_student_view": true,
  "created_by": 1,
  "created_at": "2025-12-12T14:00:00.123Z",
  "updated_at": "2025-12-12T14:01:00.123Z"
}
```

### DELETE /api/v1/tags/:id
Delete a tag (requires admin role).

**Response:**
```json
{
  "message": "Tag deleted"
}
```

## Note Tags

### GET /api/v1/notes/:id/tags
Get tags assigned to a note (requires authentication).

**Response:**
```json
[
  {
    "id": 1,
    "type": "classe",
    "name": "Cyber1",
    "meta": {"color": "blue"},
    "is_default_for_student_view": false
  }
]
```

### POST /api/v1/notes/:id/tags
Assign tags to a note (requires authentication and edit permissions).

**Request:**
```json
{
  "tagIds": [1, 2, 3]
}
```

**Response:**
```json
{
  "message": "Tags updated"
}
```

## Reactions

### POST /api/v1/notes/:id/reactions
Toggle a reaction on a note (requires authentication).

**Request:**
```json
{
  "reaction_type": "up"
}
```

**Response:**
```json
{
  "message": "Reaction added",
  "reaction": "up"
}
```

Or when removing:
```json
{
  "message": "Reaction removed",
  "reaction": null
}
```

Or when changing:
```json
{
  "message": "Reaction updated",
  "reaction": "down"
}
```

### GET /api/v1/notes/:id/reactions/me
Get current user's reaction for a note (requires authentication).

**Response:**
```json
{
  "reaction": "up"
}
```

Or if no reaction:
```json
{
  "reaction": null
}
```

## Notes Endpoints

### GET /api/v1/notes
List all notes accessible to the current user (requires authentication).

Notes now include reaction counts:
```json
[
  {
    "id": 1,
    "user_id": 1,
    "title": "Test Note",
    "content": "Note content",
    "created_at": "2025-12-12T13:54:00.000Z",
    "owner_role": "admin",
    "owner_username": "admin",
    "reactions_up": 5,
    "reactions_down": 2
  }
]
```

### POST /api/v1/notes
Create a new note (requires teacher/student/admin role).

### GET /api/v1/notes/:id
Get a specific note (requires authentication).

### PATCH /api/v1/notes/:id
Update a note (requires owner or appropriate permissions).

### DELETE /api/v1/notes/:id
Delete a note (requires owner or admin role).

## Users Endpoints

### POST /api/v1/users
Create a new user (requires admin/technician role).

### GET /api/v1/users
List all users (requires admin/technician role).

## Setup Endpoint

### POST /api/v1/setup
Create initial admin account (only works when no users exist).

**Request:**
```json
{
  "username": "admin",
  "password": "admin123456789"
}
```

**Response:**
```json
{
  "message": "Admin created (admin)"
}
```

## Error Responses

All endpoints may return error responses:

```json
{
  "error": "Error message"
}
```

Common HTTP status codes:
- 400: Bad Request (validation error)
- 401: Unauthorized (not logged in)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (duplicate entry)
- 500: Internal Server Error

## Authentication

All authenticated endpoints require a valid JWT token stored in an HTTP-only cookie named `auth_token`. The token is automatically set upon login and removed upon logout.

## Rate Limiting

Password reset requests are rate-limited by IP address and account to prevent abuse.

## Security Features

- Passwords must be at least 12 characters
- Password reset tokens expire after 1 hour
- Tokens are hashed before storage
- Students cannot modify their account information
- Role-based access control (RBAC) on all endpoints
- SQL injection prevention via parameterized queries
- XSS protection via Helmet middleware
- CORS configured for allowed origins only

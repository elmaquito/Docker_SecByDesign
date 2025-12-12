# Database Migrations

This directory contains SQL migration files for the NOTIMATIC database schema.

## Migration Files

Migrations are numbered sequentially and should be applied in order:

1. **001_add_profiles.sql** - Add user profiles (classe, promotion, niveau)
2. **002_add_themes_categories.sql** - Add themes and categories for note organization
3. **003_add_note_targets.sql** - Add note targeting system
4. **004_add_audit_gdpr.sql** - Add audit logs and GDPR compliance tables

## Running Migrations

### Automatic (Recommended)

Use the migration script:

```bash
cd backend
./migrate.sh
```

The script will:
- Check which migrations have already been applied
- Apply new migrations in order
- Track applied migrations in the `schema_migrations` table
- Show the current schema version

### Manual

If you prefer to run migrations manually:

```bash
# Set environment variables
export DB_HOST=localhost
export DB_USER=user
export DB_PASSWORD=dev_secret_password
export DB_NAME=notimatic_dev
export PGPASSWORD=$DB_PASSWORD

# Run each migration
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/001_add_profiles.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/002_add_themes_categories.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/003_add_note_targets.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/004_add_audit_gdpr.sql
```

## Creating New Migrations

When creating a new migration:

1. **Naming**: Use the format `XXX_description.sql` where XXX is the next sequential number
2. **Content**: Include:
   - Header comment with description, author, date
   - CREATE TABLE statements with IF NOT EXISTS
   - Indexes for performance
   - Comments on tables and columns
   - Default data (if applicable)
3. **Testing**: Test the migration on a development database first
4. **Rollback**: Consider creating a rollback script if needed

Example migration header:

```sql
-- Migration 005: Add Feature X
-- Description: Detailed description of what this migration does
-- Author: Your Name
-- Date: YYYY-MM-DD

-- Your SQL here...
```

## Schema Versioning

The `schema_migrations` table tracks which migrations have been applied:

```sql
SELECT * FROM schema_migrations ORDER BY applied_at DESC;
```

Current schema version after all migrations: **004_add_audit_gdpr.sql**

## GDPR Maintenance

Some migrations include functions for GDPR compliance that should be run periodically:

### Purge Old Audit Logs (6 months)

```sql
SELECT purge_old_audit_logs();
```

### Purge Old GDPR Exports (3 months)

```sql
SELECT purge_old_gdpr_exports();
```

### Anonymize Deleted Users (30 days after soft delete)

```sql
SELECT anonymize_deleted_users();
```

### Recommended Cron Jobs

Add these to your crontab:

```cron
# Purge old audit logs daily at 2 AM
0 2 * * * psql -U user -d notimatic_dev -c "SELECT purge_old_audit_logs();"

# Purge old GDPR exports daily at 3 AM
0 3 * * * psql -U user -d notimatic_dev -c "SELECT purge_old_gdpr_exports();"

# Anonymize deleted users daily at 4 AM
0 4 * * * psql -U user -d notimatic_dev -c "SELECT anonymize_deleted_users();"
```

## Rollback

Currently, migrations do not include automatic rollback. If you need to rollback:

1. Manually write and execute the reverse SQL
2. Remove the entry from `schema_migrations` table
3. Document the rollback in a separate file

Example rollback for 001:

```sql
DROP TABLE IF EXISTS profiles CASCADE;
DELETE FROM schema_migrations WHERE migration_file = '001_add_profiles.sql';
```

## Troubleshooting

### Migration fails with "relation already exists"

This is usually safe if the migration uses `IF NOT EXISTS`. Check if the migration was partially applied and manually complete it if needed.

### Cannot connect to database

Check your environment variables and ensure PostgreSQL is running:

```bash
pg_isready -h localhost -U user
```

### Migration tracking table missing

The `migrate.sh` script creates it automatically. If running manually:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_file VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Docker

When running in Docker, migrations are typically applied during container startup. See `docker-compose.yml` for configuration.

To apply migrations in a running container:

```bash
docker exec -it notimatic-backend bash
cd /app
./migrate.sh
```

## Testing Migrations

Before applying migrations to production:

1. **Backup**: Always backup your production database first
2. **Test**: Run migrations on a copy of production data
3. **Verify**: Check that all tables, indexes, and constraints were created correctly
4. **Performance**: Test query performance on the new schema
5. **Rollback Plan**: Have a rollback plan ready

## Additional Resources

- [PostgreSQL CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [GDPR Compliance](../docs/GDPR.md)
- [Architecture Documentation](../docs/ARCHITECTURE.md)

---

**Last Updated**: 2024-12-12  
**Current Schema Version**: 004_add_audit_gdpr.sql

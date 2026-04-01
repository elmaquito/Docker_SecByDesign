#!/bin/bash
# Migration runner for NOTIMATIC database
# Author: GitHub Copilot Agent
# Date: 2024-12-12

set -e

# Resolve script directory (works whether called from any CWD)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Load environment variables from repo root .env if present
if [ -f "$SCRIPT_DIR/../.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$SCRIPT_DIR/../.env"
    set +a
fi

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-notimatic_dev}"
DB_USER="${DB_USER:-user}"
DB_PASSWORD="${DB_PASSWORD:-dev_secret_password}"

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

MIGRATIONS_DIR="$SCRIPT_DIR/migrations"
MIGRATIONS_TABLE="schema_migrations"

echo "🔧 NOTIMATIC Database Migration Runner"
echo "========================================"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

# Create migrations tracking table if not exists
echo "📋 Checking migrations table..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
CREATE TABLE IF NOT EXISTS $MIGRATIONS_TABLE (
    id SERIAL PRIMARY KEY,
    migration_file VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
" > /dev/null 2>&1

echo "✅ Migrations table ready"
echo ""

# Get list of applied migrations
APPLIED_MIGRATIONS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT migration_file FROM $MIGRATIONS_TABLE ORDER BY migration_file;" | tr -d ' ')

# Run migrations
echo "🚀 Running migrations..."
echo ""

MIGRATION_COUNT=0

for migration_file in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration_file" ]; then
        filename=$(basename "$migration_file")
        
        # Check if migration already applied
        if echo "$APPLIED_MIGRATIONS" | grep -q "^$filename$"; then
            echo "⏭️  Skipping $filename (already applied)"
        else
            echo "▶️  Applying $filename..."
            
            # Apply migration
            if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file" > /dev/null 2>&1; then
                # Record migration
                psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO $MIGRATIONS_TABLE (migration_file) VALUES ('$filename');" > /dev/null 2>&1
                echo "✅ Applied $filename"
                MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
            else
                echo "❌ Failed to apply $filename"
                exit 1
            fi
        fi
    fi
done

echo ""
echo "========================================"
echo "✨ Migration complete!"
echo "Applied $MIGRATION_COUNT new migration(s)"
echo ""

# Show current schema version
LAST_MIGRATION=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT migration_file FROM $MIGRATIONS_TABLE ORDER BY applied_at DESC LIMIT 1;" | tr -d ' ')
echo "Current schema version: $LAST_MIGRATION"

# Unset password
unset PGPASSWORD

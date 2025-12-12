# Migration runner for NOTIMATIC database (PowerShell)
# Author: GitHub Copilot Agent

$ErrorActionPreference = "Stop"

$DB_CONTAINER = "infrastructure-database-1"
$DB_USER = "user"
$DB_NAME = "notimatic_dev"
$MIGRATIONS_DIR = Join-Path $PSScriptRoot "migrations"
$MIGRATIONS_TABLE = "schema_migrations"

Write-Host "🔧 NOTIMATIC Database Migration Runner"
Write-Host "========================================"
Write-Host "Container: $DB_CONTAINER"
Write-Host "Database: $DB_NAME"
Write-Host ""

# Check if container is running
if (-not (docker ps -q -f name=$DB_CONTAINER)) {
    Write-Error "Container $DB_CONTAINER is not running!"
}

# Create migrations table
Write-Host "📋 Checking migrations table..."
docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "CREATE TABLE IF NOT EXISTS $MIGRATIONS_TABLE (id SERIAL PRIMARY KEY, migration_file VARCHAR(255) UNIQUE NOT NULL, applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);" | Out-Null

Write-Host "✅ Migrations table ready`n"

# Get applied migrations
$applied = docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT migration_file FROM $MIGRATIONS_TABLE;"
$appliedList = $applied -split "`r`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }

# Run migrations
Write-Host "🚀 Running migrations...`n"
$count = 0

$files = Get-ChildItem $MIGRATIONS_DIR -Filter "*.sql" | Sort-Object Name

foreach ($file in $files) {
    if ($appliedList -contains $file.Name) {
        Write-Host "⏭️  Skipping $($file.Name) (already applied)"
    } else {
        Write-Host "▶️  Applying $($file.Name)..."
        
        try {
            # Use Get-Content -Raw to read the whole file
            Get-Content $file.FullName -Raw | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME
            
            if ($LASTEXITCODE -eq 0) {
                # Record migration
                docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "INSERT INTO $MIGRATIONS_TABLE (migration_file) VALUES ('$($file.Name)');" | Out-Null
                Write-Host "✅ Applied $($file.Name)"
                $count++
            } else {
                Write-Error "❌ Failed to apply $($file.Name)"
            }
        } catch {
            Write-Error "❌ Failed to apply $($file.Name): $_"
        }
    }
}

Write-Host "`n========================================"
Write-Host "✨ Migration complete!"
Write-Host "Applied $count new migration(s)"

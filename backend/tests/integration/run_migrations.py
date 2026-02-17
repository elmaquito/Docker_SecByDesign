import os
import subprocess
import glob

# Configuration
MIGRATION_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "migrations")
DB_CONTAINER = "infrastructure-database-1"
DB_USER = "user"
DB_NAME = "notimatic_dev"

# Get all SQL files sorted
files = sorted(glob.glob(os.path.join(MIGRATION_DIR, "*.sql")))

if not files:
    print(f"No migrations found in {MIGRATION_DIR}")
    exit(1)

print(f"Applying {len(files)} migrations to {DB_CONTAINER}...")

for f in files:
    filename = os.path.basename(f)
    print(f"Applying {filename}...")
    
    with open(f, 'r', encoding='utf-8') as sql_file:
        sql_content = sql_file.read()
    
    # Use docker exec to run psql
    # No password prompt needed for local user if trust is configured or password in env
    # For alpine image, default is trust for local connections or password needed for remote?
    # Actually, we can pass PGPASSWORD env variable to docker exec command?
    # Or just rely on .pgpass?
    # Let's try explicit password env with psql
    
    cmd = [
        "docker", "exec", "-i", 
        "-e", "PGPASSWORD=dev_secret_password",
        DB_CONTAINER, 
        "psql", "-U", DB_USER, "-d", DB_NAME
    ]
    
    try:
        process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate(input=sql_content)
        
        if process.returncode != 0:
            print(f"❌ Failed to apply {filename}")
            print(stderr)
            exit(1)
        else:
            print(f"✅ Applied {filename}")
            # print(stdout) # Verbose output
            
    except Exception as e:
        print(f"Error checking docker: {e}")
        exit(1)

print("All migrations applied successfully!")

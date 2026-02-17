import subprocess

DB_CONTAINER = "infrastructure-database-1"
DB_USER = "user"
DB_NAME = "notimatic_dev"

SQL = """
INSERT INTO users (id, username, password_hash, role) 
VALUES (1, 'admin', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash$dummyhash', 'admin') 
ON CONFLICT (id) DO NOTHING;
"""

print(f"Seeding admin user into {DB_CONTAINER}...")

cmd = [
    "docker", "exec", "-i", 
    "-e", "PGPASSWORD=dev_secret_password",
    DB_CONTAINER, 
    "psql", "-U", DB_USER, "-d", DB_NAME
]

try:
    process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    stdout, stderr = process.communicate(input=SQL)
    
    if process.returncode != 0:
        print(f"❌ Failed to seed user")
        print(stderr)
        exit(1)
    else:
        print(f"✅ Users seeded")
        
except Exception as e:
    print(f"Error checking docker: {e}")
    exit(1)

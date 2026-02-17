#!/bin/bash
set -e

# --- Configuration ---
DB_CONTAINER="docker_secbydesign_database_1"
DB_USER="notimatic_user"
BACKUP_DIR="./backups"
S3_BUCKET="s3://notimatic-backups-secure"
GPG_RECIPIENT="security@notimatic.com"

# --- 1. Security Scan (Trivy) ---
scan_images() {
    echo "[INFO] Starting Trivy Scan..."
    # Scan local image built
    trivy image --severity HIGH,CRITICAL --exit-code 1 notimatic-backend:latest
    trivy image --severity HIGH,CRITICAL --exit-code 1 notimatic-frontend:latest
    echo "[INFO] Scan passed."
}

# --- 2. Image Signing (Cosign) ---
sign_images() {
    echo "[INFO] Signing images..."
    # Assumes COSIGN_PRIVATE_KEY is in env
    cosign sign --key env://COSIGN_PRIVATE_KEY notimatic-backend:latest
    cosign sign --key env://COSIGN_PRIVATE_KEY notimatic-frontend:latest
    echo "[INFO] Images signed."
}

# --- 3. Encrypted Backup ---
backup_db() {
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    FILENAME="backup_${TIMESTAMP}.sql.gpg"
    
    echo "[INFO] Starting Encrypted Backup..."
    
    # Dump -> GPG Encrypt -> S3
    # Note: Using docker exec to dump. In prod, use a dedicated backup container.
    docker exec -t $DB_CONTAINER pg_dump -U $DB_USER notimatic_db | \
    gpg --encrypt --recipient $GPG_RECIPIENT --trust-model always | \
    aws s3 cp - $S3_BUCKET/$FILENAME
    
    echo "[INFO] Backup uploaded to $S3_BUCKET/$FILENAME"
}

# --- Usage ---
case "$1" in
    scan)
        scan_images
        ;;
    sign)
        sign_images
        ;;
    backup)
        backup_db
        ;;
    *)
        echo "Usage: $0 {scan|sign|backup}"
        exit 1
esac

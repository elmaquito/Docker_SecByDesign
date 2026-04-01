# NOTIMATIC — Infrastructure Consolidée

> **Domaine** : Docker, Traefik, scripts d'exploitation  
> **Date de consolidation** : 2026-04-01  
> **Commit de référence** : `d43a8a27e16b58aad6e0639d1f329fed295f95f9`  
> **Répertoire source** : `infrastructure/`

---

## Table des Matières

1. [Métadonnées](#1-métadonnées)
2. [Dockerfiles](#2-dockerfiles)
   - 2.1 [`Dockerfile.backend`](#21-dockerfilebackend)
   - 2.2 [`Dockerfile.frontend`](#22-dockerfilefrontend)
3. [Docker Compose](#3-docker-compose)
   - 3.1 [`docker-compose.dev.yml`](#31-docker-composedevyml)
   - 3.2 [`docker-compose.prod.yml`](#32-docker-composeprodyml)
   - 3.3 [`docker-compose.test.yml`](#33-docker-composetestyml)
4. [Reverse Proxy Traefik](#4-reverse-proxy-traefik)
   - 4.1 [`traefik.yml`](#41-traefikyml)
   - 4.2 [`dynamic_conf.yml`](#42-dynamic_confyml)
5. [Scripts d'exploitation](#5-scripts-dexploitation)
   - 5.1 [`security_ops.sh`](#51-security_opssh)
   - 5.2 [`migrate.sh`](#52-migratesh)
6. [Segmentation Réseau](#6-segmentation-réseau)

---

## 1. Métadonnées

| Champ | Valeur |
|-------|--------|
| **Conteneurisation** | Docker 24.x + Docker Compose v3.8 |
| **Reverse Proxy** | Traefik v2.10 |
| **Orchestration prod** | Docker Swarm |
| **Base de données** | PostgreSQL 15-alpine |
| **Scan sécurité** | Trivy (images Docker, sévérité CRITICAL) |
| **Signature images** | Cosign |
| **Backup** | pg_dump → GPG → S3 |

**Pratiques de sécurité identifiées dans ce composant** :

| Mesure | Où | Description |
|--------|----|-------------|
| **Multi-stage build** | Dockerfiles | Séparation builder/runner — image finale sans outils de build |
| **Image Distroless** | `Dockerfile.backend` | gcr.io/distroless/nodejs18 — aucun shell, aucun package manager |
| **Utilisateur non-root** | Backend + Frontend | UID 65532 (backend), `nginx` user (frontend) |
| **`read_only: true`** | `docker-compose.prod.yml` | Conteneurs en lecture seule — limite les compromissions runtime |
| **`no-new-privileges`** | `docker-compose.prod.yml` | Empêche l'élévation de privilèges |
| **Secrets Docker** | `docker-compose.prod.yml` | `db_password`, `jwt_secret` gérés via Docker Swarm secrets |
| **Réseau overlay chiffré** | `docker-compose.prod.yml` | `encrypted: "true"` sur le réseau `net-data` |
| **Réseaux internes** | `docker-compose.prod.yml` | `internal: true` — `net-front`, `net-api`, `net-data` n'ont pas accès internet |
| **TLS 1.3 uniquement** | `dynamic_conf.yml` | `minVersion: VersionTLS13` |
| **HSTS + CSP** | `dynamic_conf.yml` | Headers via middleware Traefik `sec-headers` |
| **Scan images CI** | `security_ops.sh` | Trivy bloquant sur CRITICAL avant déploiement |
| **Backup chiffré** | `security_ops.sh` | GPG + S3 — pas de backup en clair |

---

## 2. Dockerfiles

### 2.1 `Dockerfile.backend`

> **Source** : `infrastructure/Dockerfile.backend`

```dockerfile
# syntax=docker/dockerfile:1

# --- Étape 1 : Builder ---
FROM node:18-bullseye AS builder

WORKDIR /app

# Outils natifs requis pour compiler argon2 (hashing mots de passe)
RUN apt-get update && apt-get install -y python3 make g++

COPY package*.json ./
RUN npm install --build-from-source=argon2

COPY . .
RUN npm run build   # TypeScript → JavaScript (dist/)

# --- Étape 2 : Runner (image Distroless — minimale et sécurisée) ---
# Aucun shell, aucun package manager, aucun utilitaire système
FROM gcr.io/distroless/nodejs18-debian11 AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copier uniquement les artefacts compilés
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Exécuter en tant qu'utilisateur non-root (ID 65532 = "nonroot" Distroless)
USER 65532:65532

EXPOSE 3000
CMD ["dist/main.js"]
```

**Points de sécurité** :
- **Distroless** : surface d'attaque minimale (pas de bash, pas d'apt, pas de curl)
- **`USER 65532`** : exécution sans privilèges root
- **Multi-stage** : les secrets de build (clés npm, fichiers de config dev) ne sont pas présents dans l'image finale

### 2.2 `Dockerfile.frontend`

> **Source** : `infrastructure/Dockerfile.frontend`

```dockerfile
# syntax=docker/dockerfile:1

# --- Étape 1 : Builder (Node.js pour Vite) ---
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --ignore-scripts
COPY . .
RUN npm run build   # Vite → dist/ (HTML/CSS/JS statique)

# --- Étape 2 : Runner (Nginx léger) ---
FROM nginx:alpine-slim

# Supprimer la configuration Nginx par défaut
RUN rm /etc/nginx/conf.d/default.conf

# Configuration Nginx sécurisée (CSP, X-Frame-Options, etc.)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier les assets statiques compilés
COPY --from=builder /app/dist /usr/share/nginx/html

# Correction des permissions pour l'utilisateur nginx (non-root)
RUN chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html

USER nginx

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 3. Docker Compose

### 3.1 `docker-compose.dev.yml`

> **Source** : `infrastructure/docker-compose.dev.yml`

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ../frontend
      dockerfile: ../infrastructure/Dockerfile.frontend
      target: builder       # Stage builder = Node.js installé (hot-reload)
    command: npm run dev
    volumes:
      - ../frontend:/app
      - /app/node_modules   # Préserve node_modules du conteneur
    ports:
      - "5173:5173"
    networks:
      - net-dev

  backend:
    build:
      context: ../backend
      dockerfile: ../infrastructure/Dockerfile.backend
      target: builder
    command: npm run start:dev
    volumes:
      - ../backend:/app
      - /app/node_modules
    ports:
      - "3001:3000"         # 3001 externe pour éviter conflit avec Obsidian
    environment:
      - DB_HOST=database
      - DB_PASSWORD=dev_secret_password
    networks:
      - net-dev

  database:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=dev_secret_password
      - POSTGRES_DB=notimatic_dev
    ports:
      - "5432:5432"
    volumes:
      - ../backend/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - net-dev

networks:
  net-dev:
```

### 3.2 `docker-compose.prod.yml`

> **Source** : `infrastructure/docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  proxy:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.web.http.redirections.entryPoint.to=websecure"  # Force HTTPS
      - "--entrypoints.web.http.redirections.entryPoint.scheme=https"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"  # Socket en lecture seule
      - "./config/traefik:/etc/traefik"
      - "traefik-certificates:/letsencrypt"
    networks:
      - net-public
      - net-front
      - net-api
    security_opt:
      - no-new-privileges:true
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  frontend:
    build:
      context: ../frontend
      dockerfile: ../infrastructure/Dockerfile.frontend
    networks:
      - net-front
    security_opt:
      - no-new-privileges:true
    read_only: true          # Conteneur en lecture seule
    tmpfs:
      - /var/cache/nginx
      - /var/run
    deploy:
      replicas: 2
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.front.rule=Host(`notimatic.com`)"
        - "traefik.http.routers.front.entrypoints=websecure"
        - "traefik.http.routers.front.tls.certresolver=myresolver"
        - "traefik.http.routers.front.middlewares=sec-headers"

  backend:
    build:
      context: ../backend
      dockerfile: ../infrastructure/Dockerfile.backend
    networks:
      - net-api
      - net-data
    secrets:
      - db_password
      - jwt_secret
    environment:
      - DB_HOST=database
      - DB_USER=notimatic_user
      - DB_PASSWORD_FILE=/run/secrets/db_password  # Secret monté en fichier
      - DB_NAME=notimatic_db
      - NODE_ENV=production
    security_opt:
      - no-new-privileges:true
    read_only: true
    user: "65532"            # Non-root (Distroless)
    deploy:
      replicas: 3
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.api.rule=Host(`api.notimatic.com`)"
        - "traefik.http.routers.api.entrypoints=websecure"
        - "traefik.http.routers.api.middlewares=rate-limit,sec-headers"

  database:
    image: postgres:15-alpine
    networks:
      - net-data
    secrets:
      - db_password
    environment:
      - POSTGRES_USER=notimatic_user
      - POSTGRES_DB=notimatic_db
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    volumes:
      - db-data:/var/lib/postgresql/data
    deploy:
      placement:
        constraints: [node.role == manager]  # DB sur nœud manager pour la persistance

secrets:
  db_password:
    external: true   # Géré par Docker Swarm (docker secret create ...)
  jwt_secret:
    external: true

networks:
  net-public:
    driver: overlay
  net-front:
    driver: overlay
    internal: true   # Pas d'accès internet direct
  net-api:
    driver: overlay
    internal: true
  net-data:
    driver: overlay
    internal: true
    driver_opts:
      encrypted: "true"   # Chiffrement du trafic inter-nœuds

volumes:
  traefik-certificates:
  db-data:
```

### 3.3 `docker-compose.test.yml`

> **Source** : `infrastructure/docker-compose.test.yml`

Compose allégé pour les tests d'intégration en CI (pas de secrets, PostgreSQL sur port 5433 pour éviter les conflits).

---

## 4. Reverse Proxy Traefik

### 4.1 `traefik.yml` (Configuration statique)

> **Source** : `infrastructure/config/traefik/traefik.yml`

```yaml
global:
  checkNewVersion: false       # Pas de télémétrie
  sendAnonymousUsage: false

log:
  level: INFO
  format: json

api:
  dashboard: false             # Dashboard désactivé en production

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false    # Opt-in — seuls les conteneurs labellisés sont exposés
    swarmMode: true
  file:
    filename: /etc/traefik/dynamic_conf.yml
    watch: true

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https         # Redirection HTTP → HTTPS systématique
  websecure:
    address: ":443"
    http:
      tls:
        certResolver: myresolver

certificatesResolvers:
  myresolver:
    acme:
      email: security@notimatic.com
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web
```

### 4.2 `dynamic_conf.yml` (Configuration dynamique)

> **Source** : `infrastructure/config/traefik/dynamic_conf.yml`

```yaml
http:
  middlewares:
    rate-limit:
      rateLimit:
        average: 100
        burst: 50
        period: 1s

    sec-headers:
      headers:
        frameDeny: true
        sslRedirect: true
        browserXssFilter: true
        contentTypeNosniff: true
        stsIncludeSubdomains: true
        stsPreload: true
        stsSeconds: 31536000    # HSTS 1 an
        customFrameOptionsValue: SAMEORIGIN
        contentSecurityPolicy: "default-src 'self'; script-src 'self' 'nonce-random-value'; object-src 'none'"

  tls:
    options:
      default:
        minVersion: VersionTLS13   # TLS 1.3 minimum
        cipherSuites:
          - TLS_AES_128_GCM_SHA256
          - TLS_AES_256_GCM_SHA384
          - TLS_CHACHA20_POLY1305_SHA256
        curvePreferences:
          - CurveP521
          - CurveP384
        sniStrict: true
```

---

## 5. Scripts d'exploitation

### 5.1 `security_ops.sh`

> **Source** : `infrastructure/scripts/security_ops.sh`

```bash
#!/bin/bash
set -e

# --- 1. Scan de sécurité des images (Trivy) ---
scan_images() {
    trivy image --severity HIGH,CRITICAL --exit-code 1 notimatic-backend:latest
    trivy image --severity HIGH,CRITICAL --exit-code 1 notimatic-frontend:latest
}

# --- 2. Signature des images (Cosign) ---
sign_images() {
    cosign sign --key env://COSIGN_PRIVATE_KEY notimatic-backend:latest
    cosign sign --key env://COSIGN_PRIVATE_KEY notimatic-frontend:latest
}

# --- 3. Backup chiffré de la BDD ---
backup_db() {
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    # pg_dump → chiffrement GPG → upload S3
    docker exec -t $DB_CONTAINER pg_dump -U $DB_USER notimatic_db | \
    gpg --encrypt --recipient $GPG_RECIPIENT --trust-model always | \
    aws s3 cp - $S3_BUCKET/backup_${TIMESTAMP}.sql.gpg
}

case "$1" in
    scan)   scan_images   ;;
    sign)   sign_images   ;;
    backup) backup_db     ;;
    *)      echo "Usage: $0 {scan|sign|backup}"; exit 1 ;;
esac
```

### 5.2 `migrate.sh`

> **Source** : `infrastructure/scripts/db/migrate.sh` et `backend/migrate.sh`

```bash
#!/bin/bash
set -e

# Variables de connexion (depuis .env ou variables d'environnement)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-notimatic_dev}"
DB_USER="${DB_USER:-user}"
export PGPASSWORD="${DB_PASSWORD:-dev_secret_password}"

MIGRATIONS_DIR="$(dirname "$0")/../../backend/migrations"

# Créer la table de suivi si elle n'existe pas
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id             SERIAL PRIMARY KEY,
    migration_file VARCHAR(255) UNIQUE NOT NULL,
    applied_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );" > /dev/null 2>&1

# Appliquer les migrations non encore appliquées (ordre numérique)
for migration_file in "$MIGRATIONS_DIR"/*.sql; do
    filename=$(basename "$migration_file")
    APPLIED=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
      "SELECT COUNT(*) FROM schema_migrations WHERE migration_file = '$filename';" | tr -d ' ')

    if [ "$APPLIED" = "0" ]; then
        echo "▶️  Applying $filename..."
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$migration_file" > /dev/null
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \
          "INSERT INTO schema_migrations (migration_file) VALUES ('$filename');" > /dev/null
        echo "✅ Applied $filename"
    else
        echo "⏭️  Skipping $filename (already applied)"
    fi
done

unset PGPASSWORD
echo "✨ Migrations complete"
```

---

## 6. Segmentation Réseau

L'architecture réseau en production implémente le principe de **moindre exposition** : chaque couche ne communique qu'avec les couches adjacentes nécessaires.

```
Internet
    │
    ▼
[Traefik] ──── net-public (overlay)
    │
    ├── net-front (overlay, internal) ──── [Frontend × 2]
    │
    └── net-api (overlay, internal) ────── [Backend × 3]
                                               │
                                           net-data (overlay, internal, encrypted)
                                               │
                                           [PostgreSQL × 1]
```

| Réseau | Accès Internet | Chiffré | Services |
|--------|----------------|---------|----------|
| `net-public` | ✅ Oui | TLS via Traefik | Traefik |
| `net-front` | ❌ Non | Non (interne) | Traefik ↔ Frontend |
| `net-api` | ❌ Non | Non (interne) | Traefik ↔ Backend |
| `net-data` | ❌ Non | ✅ Oui (encrypted) | Backend ↔ PostgreSQL |

> La base de données n'est **jamais** accessible depuis internet ni depuis le réseau frontend.

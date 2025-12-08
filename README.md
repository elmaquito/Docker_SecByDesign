# Notimatic - Secure by Design Project

Bienvenue dans le projet **Notimatic**. Ce dépôt contient l'architecture et l'implémentation de référence pour une application de prise de notes sécurisée.

## 🚀 Démarrage Rapide

### Prérequis
- Docker & Docker Compose installés.
- Node.js (optionnel, pour le développement local hors Docker).

### 1. Structure du Projet
- `docs/` : Documentation d'architecture, Threat Model, Playbooks.
- `infrastructure/` : Fichiers Docker Compose et Dockerfiles.
- `backend/` : Code source de l'API (Node.js/Express).
- `frontend/` : Code source du Frontend (Vue.js/Vite).
- `config/` : Configuration Traefik.
- `scripts/` : Scripts d'opérations de sécurité.

### 2. Lancer l'environnement de Développement
Cet environnement monte le code source en volume pour le hot-reloading.

> **Note :** En mode dev local, Traefik est désactivé pour éviter les problèmes de socket Windows. Les ports sont exposés directement.

```powershell
# Depuis la racine du projet
docker-compose -f infrastructure/docker-compose.dev.yml up --build
```

- **Frontend :** http://localhost:5173
- **Backend API :** http://localhost:3000
- **Base de données :** localhost:5432 (User: `user`, Pass: `dev_secret_password`)

### 3. Simuler la Production
L'environnement de production utilise des réseaux chiffrés, des secrets Docker, et des conteneurs en lecture seule.

> **Note :** Le mode Swarm est requis pour les secrets et configs.

```powershell
# 1. Initialiser Swarm (si ce n'est pas déjà fait)
docker swarm init

# 2. Créer les secrets (simulation)
printf "super_secure_db_password" | docker secret create db_password -
printf "super_secure_jwt_secret" | docker secret create jwt_secret -

# 3. Créer le réseau overlay (si nécessaire, ou laisser le stack le faire)
# docker network create --driver overlay --opt encrypted net-data

# 4. Déployer la stack
docker stack deploy -c infrastructure/docker-compose.prod.yml notimatic
```

### 4. Opérations de Sécurité
Utilisez le script fourni pour scanner et signer les images.

```powershell
# Rendre le script exécutable (si sous Linux/WSL) ou utiliser Git Bash
./scripts/security_ops.sh scan
```

## 📚 Documentation
Pour comprendre les choix d'architecture et les mesures de sécurité, consultez :
- [Architecture Proposal](docs/PROPOSAL_ARCHITECTURE.md)
- [Threat Model](docs/THREAT_MODEL_AND_PLAYBOOKS.md)

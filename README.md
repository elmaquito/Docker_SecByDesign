# Docker Security by Design - Environnement de Test

Ce repository contient un environnement virtuel Docker pour tester et apprendre les meilleures pratiques de **sécurité par design** avec des conteneurs.

## 🎯 Objectif

Fournir des cas pratiques concrets pour comprendre et appliquer les principes de sécurité lors de la conception d'applications conteneurisées.

## 📋 Prérequis

- Docker Engine 20.10+
- Docker Compose v2.0+

## 🚀 Démarrage Rapide

```bash
# Cloner le repository
git clone https://github.com/elmaquito/Docker_SecByDesign.git
cd Docker_SecByDesign

# Créer le fichier de secret pour la démo
cp secrets/db_password.txt.example secrets/db_password.txt

# Lancer tous les exemples
docker compose up -d

# Vérifier que tout fonctionne
docker compose ps
```

## 📚 Travaux Pratiques (TPs)

Le dossier **[TP/](./TP/)** contient des guides étape par étape pour chaque concept de sécurité :

| TP | Titre | Durée | Difficulté |
|----|-------|-------|------------|
| [TP1](./TP/TP1-non-root-user.md) | Utilisateur Non-Root | 30 min | ⭐ Débutant |
| [TP2](./TP/TP2-multi-stage-build.md) | Multi-Stage Build | 45 min | ⭐⭐ Intermédiaire |
| [TP3](./TP/TP3-network-isolation.md) | Isolation Réseau | 45 min | ⭐⭐ Intermédiaire |
| [TP4](./TP/TP4-secrets-management.md) | Gestion des Secrets | 30 min | ⭐ Débutant |
| [TP5](./TP/TP5-resource-limits.md) | Limites de Ressources | 30 min | ⭐ Débutant |
| [TP6](./TP/TP6-image-scanning.md) | Analyse d'Images | 45 min | ⭐⭐ Intermédiaire |
| [TP7](./TP/TP7-readonly-filesystem.md) | Filesystem Read-Only | 30 min | ⭐ Débutant |
| [TP8](./TP/TP8-distroless.md) | Images Distroless | 45 min | ⭐⭐⭐ Avancé |

➡️ **Commencez par** : [TP/README.md](./TP/README.md)

## 📚 Cas Pratiques

### 1. Utilisateur Non-Root (Port 8081)

**Principe:** Exécuter les conteneurs avec un utilisateur non-privilégié.

```bash
# Accéder à la démo
curl http://localhost:8081

# Vérifier l'utilisateur dans le conteneur
docker exec security-non-root id
```

**Bonnes pratiques appliquées:**
- ✅ Création d'un utilisateur dédié (UID 1000)
- ✅ Utilisation de `USER` dans le Dockerfile
- ✅ Port non-privilégié (> 1024)

---

### 2. Multi-Stage Build

**Principe:** Réduire la surface d'attaque en n'incluant que le strict nécessaire.

```bash
# Construire l'image Go
cd examples/multi-stage-build
docker build -t multi-stage-demo .

# Vérifier la taille de l'image
docker images multi-stage-demo

# Lancer le conteneur
docker run -d -p 8085:8080 --name multi-stage multi-stage-demo
```

**Bonnes pratiques appliquées:**
- ✅ Image finale basée sur `scratch` (vide)
- ✅ Pas de shell, pas d'outils d'attaque
- ✅ Binaire statique uniquement

---

### 3. Isolation Réseau (Port 8082)

**Principe:** Limiter la communication entre services au strict nécessaire.

```bash
# Accéder au frontend
curl http://localhost:8082

# Vérifier les réseaux
docker network ls | grep security

# Tester l'isolation - le web ne peut pas contacter la DB directement
docker exec security-network-web ping -c 1 security-network-db
# (Devrait échouer)
```

**Architecture:**
```
[Internet] → [Web/Frontend] → [API] → [Database]
                   │              │          │
            frontend-net    frontend-net  backend-net
                           + backend-net   (internal)
```

**Bonnes pratiques appliquées:**
- ✅ Réseaux séparés (frontend, backend)
- ✅ Réseau backend marqué `internal: true`
- ✅ Principe du moindre privilège

---

### 4. Gestion des Secrets (Port 8083)

**Principe:** Ne jamais exposer les secrets dans les variables d'environnement ou l'image.

```bash
# Accéder à la démo
curl http://localhost:8083

# Vérifier que le secret est monté
docker exec security-secrets ls -la /run/secrets/
```

**Bonnes pratiques appliquées:**
- ✅ Secrets montés comme fichiers en lecture seule
- ✅ Secrets en mémoire (tmpfs)
- ✅ Pas de secrets dans les variables d'environnement

---

### 5. Limites de Ressources (Port 8084)

**Principe:** Protéger contre les attaques par épuisement de ressources (DoS).

```bash
# Accéder à la démo
curl http://localhost:8084

# Vérifier l'endpoint de santé
curl http://localhost:8084/health

# Voir les limites appliquées
docker stats security-resource-limits --no-stream
```

**Bonnes pratiques appliquées:**
- ✅ Limites CPU (0.5 cores max)
- ✅ Limites mémoire (128 Mo max)
- ✅ Health checks configurés
- ✅ Politique de redémarrage

---

### 6. Analyse d'Images (Port 8085)

**Principe:** Scanner les images pour détecter les vulnérabilités avant déploiement.

```bash
# Accéder à la démo
curl http://localhost:8085

# Scanner l'image avec Trivy
trivy image security-image-scanning
```

**Bonnes pratiques appliquées:**
- ✅ Analyse des CVE connues
- ✅ Intégration dans le pipeline CI/CD
- ✅ Utilisation d'images à jour

---

### 7. Filesystem Read-Only (Port 8086)

**Principe:** Empêcher la modification des fichiers dans le conteneur.

```bash
# Accéder à la démo
curl http://localhost:8086

# Tester l'écriture (devrait échouer sauf dans /tmp)
docker exec security-readonly touch /app/test
```

**Bonnes pratiques appliquées:**
- ✅ Filesystem en lecture seule
- ✅ tmpfs pour les répertoires temporaires
- ✅ Options noexec et nosuid

---

### 8. Images Distroless

**Principe:** Utiliser des images minimales sans shell ni outils système.

```bash
# Construire l'image distroless
cd examples/distroless
docker build -t distroless-demo .

# Lancer le conteneur
docker run -d -p 8087:8080 distroless-demo

# Tenter d'accéder au shell (devrait échouer)
docker exec -it <container_id> /bin/sh
```

**Bonnes pratiques appliquées:**
- ✅ Image sans shell
- ✅ Surface d'attaque minimale
- ✅ Moins de vulnérabilités potentielles

---

## 🔒 Mesures de Sécurité Communes

Tous les conteneurs appliquent:

| Mesure | Description |
|--------|-------------|
| `read_only: true` | Système de fichiers en lecture seule |
| `no-new-privileges: true` | Empêche l'escalade de privilèges |
| `cap_drop: ALL` | Supprime toutes les capabilities Linux |
| Utilisateur non-root | Exécution sans privilèges root |

## 📁 Structure du Projet

```
Docker_SecByDesign/
├── docker-compose.yml          # Orchestration principale
├── secrets/                    # Fichiers de secrets (exemple)
│   └── db_password.txt.example
├── TP/                         # Travaux Pratiques étape par étape
│   ├── README.md
│   ├── TP1-non-root-user.md
│   ├── TP2-multi-stage-build.md
│   ├── TP3-network-isolation.md
│   ├── TP4-secrets-management.md
│   ├── TP5-resource-limits.md
│   ├── TP6-image-scanning.md
│   ├── TP7-readonly-filesystem.md
│   └── TP8-distroless.md
├── examples/
│   ├── non-root-user/         # Cas 1: Utilisateur non-root
│   │   ├── Dockerfile
│   │   └── app.py
│   ├── multi-stage-build/     # Cas 2: Multi-stage build
│   │   ├── Dockerfile
│   │   └── main.go
│   ├── network-isolation/     # Cas 3: Isolation réseau
│   │   ├── Dockerfile.web
│   │   ├── Dockerfile.api
│   │   ├── Dockerfile.db
│   │   ├── web.py
│   │   ├── api.py
│   │   └── db.py
│   ├── secrets-management/    # Cas 4: Gestion des secrets
│   │   ├── Dockerfile
│   │   └── app.py
│   ├── resource-limits/       # Cas 5: Limites de ressources
│   │   ├── Dockerfile
│   │   └── app.py
│   ├── image-scanning/        # Cas 6: Analyse d'images
│   │   ├── Dockerfile
│   │   └── app.py
│   ├── readonly-filesystem/   # Cas 7: Filesystem read-only
│   │   ├── Dockerfile
│   │   └── app.py
│   └── distroless/            # Cas 8: Images distroless
│       ├── Dockerfile
│       ├── server.js
│       └── package.json
└── README.md
```

## 🛑 Arrêter l'Environnement

```bash
# Arrêter tous les conteneurs
docker compose down

# Supprimer les images créées
docker compose down --rmi local

# Nettoyage complet
docker compose down -v --rmi all
```

## 📖 Ressources Supplémentaires

- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [OWASP Container Security](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)

## 📝 Licence

Ce projet est destiné à des fins éducatives.

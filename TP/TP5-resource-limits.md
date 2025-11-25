# TP5 - Limites de Ressources et Health Checks

## 🎯 Objectif

Apprendre à protéger vos conteneurs contre les attaques par épuisement de ressources (DoS) en configurant des limites CPU, mémoire et des health checks.

## ⏱️ Durée estimée : 30 minutes

## 📋 Prérequis

- TP1 à TP4 complétés

---

## 📖 Contexte Théorique

### Types d'attaques par épuisement

1. **CPU exhaustion** : Processus consommant 100% du CPU
2. **Memory exhaustion** : Allocation excessive de mémoire (OOM)
3. **Fork bomb** : Création infinie de processus
4. **Disk exhaustion** : Remplissage du disque

### Mécanismes de protection Docker

| Mécanisme | Protection |
|-----------|------------|
| `--cpus` | Limite l'utilisation CPU |
| `--memory` | Limite la mémoire |
| `--pids-limit` | Limite le nombre de processus |
| `HEALTHCHECK` | Détecte les conteneurs défaillants |
| `restart: unless-stopped` | Redémarre automatiquement |

---

## 🔬 Partie Pratique

### Étape 1 : Observer un conteneur sans limites

```bash
# Lancer un conteneur sans limites
docker run -d --name no-limits alpine sleep 3600

# Vérifier les limites (absence)
docker inspect no-limits --format '{{.HostConfig.Memory}} {{.HostConfig.NanoCpus}}'
```

**Observation** : Les valeurs sont à 0, signifiant pas de limites.

```bash
docker stop no-limits && docker rm no-limits
```

---

### Étape 2 : Simuler une attaque d'épuisement mémoire

```bash
# Lancer un conteneur AVEC limite mémoire
docker run -d --name limited --memory=50m alpine sleep 3600

# Tenter d'allouer plus de mémoire que la limite
docker exec limited sh -c "
head -c 100m /dev/zero > /dev/null 2>&1
echo 'Allocation terminée'
"
```

**Observation** : Le conteneur devrait être tué (OOM killed) ou l'allocation échoue.

```bash
# Vérifier si le conteneur a été tué
docker inspect limited --format '{{.State.OOMKilled}}'
```

```bash
docker stop limited && docker rm limited
```

---

### Étape 3 : Examiner l'exemple avec limites

```bash
cd examples/resource-limits
cat Dockerfile
```

**Points clés** :

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1
```

Ce health check vérifie régulièrement que l'application répond.

---

### Étape 4 : Analyser la configuration docker-compose

```bash
cd ../..
cat docker-compose.yml | grep -A 20 "resource-limits-demo:"
```

**Configuration importante** :

```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'        # Maximum 50% d'un CPU
      memory: 128M       # Maximum 128 Mo de RAM
    reservations:
      cpus: '0.1'
      memory: 64M
restart: unless-stopped
```

---

### Étape 5 : Lancer le service

```bash
# Créer le fichier de secret si nécessaire
cp secrets/db_password.txt.example secrets/db_password.txt 2>/dev/null || true

# Démarrer le service
docker compose up -d resource-limits-demo

# Vérifier le statut
docker compose ps resource-limits-demo
```

---

### Étape 6 : Vérifier les limites appliquées

```bash
# Voir les statistiques en temps réel
docker stats security-resource-limits --no-stream

# Inspecter les limites
docker inspect security-resource-limits --format '
  Memory Limit: {{.HostConfig.Memory}}
  CPU Quota: {{.HostConfig.CpuQuota}}
  CPU Period: {{.HostConfig.CpuPeriod}}
'
```

---

### Étape 7 : Tester le health check

```bash
# Vérifier l'endpoint de santé
curl http://localhost:8084/health

# Voir l'état du health check
docker inspect security-resource-limits --format '{{json .State.Health}}' | jq .
```

**Résultat attendu** :
```json
{
  "Status": "healthy",
  "FailingStreak": 0,
  "Log": [...]
}
```

---

### Étape 8 : Simuler une panne et observer le health check

```bash
# Ouvrir un terminal pour suivre les logs
docker logs -f security-resource-limits &

# Dans le conteneur, simuler une application qui ne répond plus
# (Note: ceci est simulé car notre app est simple)

# Vérifier l'état de santé
docker inspect security-resource-limits --format '{{.State.Health.Status}}'
```

---

### Étape 9 : Tester les limites CPU avec stress

```bash
# Installer stress dans un conteneur de test
docker run -d --name stress-test --cpus=0.5 --memory=128m alpine sh -c "
  apk add --no-cache stress-ng
  stress-ng --cpu 4 --timeout 30s
  echo 'Stress test terminé'
"

# Observer l'utilisation CPU (devrait être limité à 50%)
docker stats stress-test --no-stream
```

```bash
docker stop stress-test && docker rm stress-test
```

---

### Étape 10 : Accéder à l'interface

```bash
curl http://localhost:8084
```

Ou ouvrez `http://localhost:8084` dans un navigateur.

---

### Étape 11 : Nettoyage

```bash
docker compose down
```

---

## ✅ Points de Vérification

Avant de passer au TP suivant, assurez-vous que :

- [ ] Vous savez configurer des limites mémoire
- [ ] Vous savez configurer des limites CPU
- [ ] Vous comprenez le fonctionnement des health checks
- [ ] Vous savez interpréter `docker stats`
- [ ] Vous comprenez la politique de redémarrage

---

## 🎓 Pour Aller Plus Loin

### Exercice bonus 1 : Limite de PIDs (anti fork-bomb)

```bash
# Lancer avec limite de processus
docker run -d --name pid-limit --pids-limit=10 alpine sleep 3600

# Tenter une fork bomb (ne fonctionnera pas)
docker exec pid-limit sh -c ":(){ :|:& };:"
```

### Exercice bonus 2 : Configurer des alertes

Utilisez cAdvisor pour surveiller les métriques :

```bash
docker run -d \
  --name cadvisor \
  -p 8085:8080 \
  --volume=/:/rootfs:ro \
  --volume=/var/run:/var/run:ro \
  --volume=/sys:/sys:ro \
  --volume=/var/lib/docker/:/var/lib/docker:ro \
  gcr.io/cadvisor/cadvisor:latest
```

Accédez à `http://localhost:8085` pour voir les métriques.

### Exercice bonus 3 : Health check avancé

```dockerfile
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/health && \
      curl -f http://localhost:8080/ready || exit 1
```

---

## 📚 Ressources

- [Docker Resource Constraints](https://docs.docker.com/config/containers/resource_constraints/)
- [Dockerfile HEALTHCHECK](https://docs.docker.com/engine/reference/builder/#healthcheck)
- [cAdvisor](https://github.com/google/cadvisor)

---

⬅️ **Précédent** : [TP4 - Gestion des Secrets](./TP4-secrets-management.md)

➡️ **Suivant** : [TP6 - Analyse d'Images](./TP6-image-scanning.md)

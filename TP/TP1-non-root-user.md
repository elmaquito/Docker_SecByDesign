# TP1 - Exécution de Conteneurs avec Utilisateur Non-Root

## 🎯 Objectif

Apprendre à configurer un conteneur Docker pour qu'il s'exécute avec un utilisateur non-privilégié, réduisant ainsi les risques en cas de compromission.

## ⏱️ Durée estimée : 30 minutes

## 📋 Prérequis

- Docker installé et fonctionnel
- Accès au terminal

---

## 📖 Contexte Théorique

### Pourquoi éviter l'utilisateur root ?

Par défaut, les processus dans un conteneur Docker s'exécutent en tant que **root** (UID 0). Cela pose plusieurs problèmes de sécurité :

1. **Évasion de conteneur** : Si un attaquant exploite une vulnérabilité, il aura les privilèges root
2. **Accès aux volumes** : Les fichiers créés sur les volumes montés appartiennent à root
3. **Escalade de privilèges** : Facilite l'exploitation de vulnérabilités du kernel

### Le principe du moindre privilège

> "Un processus ne devrait avoir que les privilèges strictement nécessaires à son fonctionnement."

---

## 🔬 Partie Pratique

### Étape 1 : Observer le comportement par défaut

Créez un conteneur simple sans configuration utilisateur :

```bash
# Créer un Dockerfile basique
cat > /tmp/Dockerfile.root << 'EOF'
FROM python:3.11-slim
WORKDIR /app
CMD ["python", "-c", "import os; print(f'UID: {os.getuid()}, User: {os.environ.get(\"USER\", \"N/A\")}')"]
EOF

# Construire l'image
docker build -t test-root -f /tmp/Dockerfile.root /tmp

# Exécuter et observer
docker run --rm test-root
```

**Question** : Quel UID s'affiche ? Que signifie-t-il ?

<details>
<summary>📝 Réponse attendue</summary>

L'UID affiché devrait être `0`, ce qui correspond à l'utilisateur root. Cela signifie que le processus Python s'exécute avec les privilèges les plus élevés du système.

</details>

---

### Étape 2 : Vérifier les capacités du conteneur root

```bash
# Tenter d'installer un package (nécessite root)
docker run --rm test-root sh -c "apt-get update && apt-get install -y curl"
```

**Observation** : L'installation fonctionne car nous sommes root.

---

### Étape 3 : Créer un Dockerfile avec utilisateur non-root

Naviguez vers l'exemple fourni :

```bash
cd examples/non-root-user
cat Dockerfile
```

**Analysez le Dockerfile** :

```dockerfile
# Exemple: Exécution de conteneur avec utilisateur non-root
FROM python:3.11-slim

# Créer un groupe et utilisateur non-root
RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers d'application
COPY --chown=appuser:appgroup app.py .

# Passer à l'utilisateur non-root
USER appuser

# Exposer le port (non privilégié > 1024)
EXPOSE 8080

# Commande de démarrage
CMD ["python", "app.py"]
```

**Points clés à retenir** :
- `groupadd` et `useradd` créent un utilisateur dédié
- `--chown=appuser:appgroup` assigne les bons propriétaires aux fichiers
- `USER appuser` active l'utilisateur non-root
- Le port `8080` est utilisé car les ports < 1024 nécessitent root

---

### Étape 4 : Construire et tester l'image sécurisée

```bash
# Construire l'image
docker build -t non-root-demo .

# Lancer le conteneur
docker run -d -p 8081:8080 --name test-non-root non-root-demo

# Vérifier l'utilisateur
docker exec test-non-root id
```

**Résultat attendu** :
```
uid=1000(appuser) gid=1000(appgroup) groups=1000(appgroup)
```

---

### Étape 5 : Tester les restrictions

```bash
# Tenter d'installer un package (devrait échouer)
docker exec test-non-root apt-get update
```

**Résultat attendu** : Permission denied

```bash
# Tenter de modifier un fichier système
docker exec test-non-root touch /etc/test
```

**Résultat attendu** : Permission denied

---

### Étape 6 : Accéder à l'application

```bash
# Via curl
curl http://localhost:8081

# Ou ouvrez dans un navigateur
# http://localhost:8081
```

---

### Étape 7 : Nettoyage

```bash
# Arrêter et supprimer le conteneur
docker stop test-non-root
docker rm test-non-root

# Supprimer les images de test
docker rmi test-root non-root-demo
```

---

## ✅ Points de Vérification

Avant de passer au TP suivant, assurez-vous que :

- [ ] Vous comprenez pourquoi l'exécution en root est risquée
- [ ] Vous savez créer un utilisateur dans un Dockerfile
- [ ] Vous savez utiliser l'instruction `USER`
- [ ] Vous comprenez l'importance de `--chown` lors du COPY
- [ ] Vous savez pourquoi utiliser un port > 1024

---

## 🎓 Pour Aller Plus Loin

### Exercice bonus 1 : Utiliser un UID spécifique

Modifiez le Dockerfile pour utiliser l'UID 10001 au lieu de 1000.

### Exercice bonus 2 : Tester avec docker-compose

Utilisez le docker-compose.yml principal pour lancer l'exemple avec toutes les options de sécurité :

```bash
cd /path/to/Docker_SecByDesign
docker compose up non-root-demo
```

### Exercice bonus 3 : Comparer les capabilities

```bash
# Conteneur root
docker run --rm test-root cat /proc/1/status | grep Cap

# Conteneur non-root avec cap_drop
docker run --rm --user 1000:1000 --cap-drop ALL test-root cat /proc/1/status | grep Cap
```

---

## 📚 Ressources

- [Docker Security Best Practices - User](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/#user)
- [Understanding Linux Capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html)

---

➡️ **Prochaine étape** : [TP2 - Multi-Stage Build](./TP2-multi-stage-build.md)

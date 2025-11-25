# TP4 - Gestion Sécurisée des Secrets

## 🎯 Objectif

Apprendre à gérer les secrets (mots de passe, clés API, certificats) de manière sécurisée dans Docker, en évitant les mauvaises pratiques courantes.

## ⏱️ Durée estimée : 30 minutes

## 📋 Prérequis

- TP1 à TP3 complétés

---

## 📖 Contexte Théorique

### ❌ Mauvaises pratiques courantes

1. **Secrets dans le Dockerfile**
   ```dockerfile
   ENV DB_PASSWORD=monsecret  # ❌ Visible dans l'historique de l'image
   ```

2. **Secrets dans le code source**
   ```python
   password = "monsecret"  # ❌ Visible dans le dépôt Git
   ```

3. **Secrets dans les variables d'environnement au runtime**
   ```bash
   docker run -e DB_PASSWORD=monsecret ...  # ❌ Visible dans docker inspect
   ```

### ✅ Bonnes pratiques

1. **Docker Secrets** (Swarm mode ou fichiers)
2. **Volumes montés en lecture seule**
3. **Gestionnaires de secrets externes** (Vault, AWS Secrets Manager)

---

## 🔬 Partie Pratique

### Étape 1 : Démontrer les mauvaises pratiques

#### Variable d'environnement au runtime

```bash
# Lancer un conteneur avec un secret en variable d'environnement
docker run -d --name bad-secret -e SECRET_KEY=super-secret-password alpine sleep 3600

# Le secret est visible avec docker inspect !
docker inspect bad-secret --format '{{range .Config.Env}}{{println .}}{{end}}'
```

**Observation** : Le secret `SECRET_KEY` est clairement visible.

```bash
# Nettoyage
docker stop bad-secret && docker rm bad-secret
```

#### Secret dans l'image

```bash
# Créer un Dockerfile avec un secret embarqué
cat > /tmp/Dockerfile.bad << 'EOF'
FROM alpine
ENV API_KEY=sk-1234567890abcdef
CMD ["printenv", "API_KEY"]
EOF

docker build -t bad-secret-image -f /tmp/Dockerfile.bad /tmp

# Le secret est visible dans l'historique
docker history bad-secret-image
```

**Observation** : Le secret apparaît dans les couches de l'image.

```bash
docker rmi bad-secret-image
```

---

### Étape 2 : Examiner l'exemple sécurisé

```bash
cd examples/secrets-management
cat Dockerfile
cat app.py
```

**Points clés dans app.py** :

```python
SECRET_PATH = "/run/secrets/db_password"

def read_secret(path):
    """Lit un secret depuis le système de fichiers."""
    try:
        with open(path, 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        return None
```

Le secret est lu depuis un fichier, pas depuis une variable d'environnement.

---

### Étape 3 : Configurer les secrets

```bash
cd ../..

# Créer le fichier de secret (simule un secret externe)
echo "MonMotDePasseUltraSecret123!" > secrets/db_password.txt

# Vérifier les permissions
chmod 600 secrets/db_password.txt
```

---

### Étape 4 : Examiner la configuration docker-compose

```bash
cat docker-compose.yml | grep -A 15 "secrets-demo:"
```

**Configuration importante** :

```yaml
secrets-demo:
  secrets:
    - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

---

### Étape 5 : Lancer le service

```bash
# Démarrer le service de démo des secrets
docker compose up -d secrets-demo

# Vérifier que le service tourne
docker compose ps secrets-demo
```

---

### Étape 6 : Vérifier que le secret est monté correctement

```bash
# Voir où le secret est monté
docker exec security-secrets ls -la /run/secrets/

# Vérifier les permissions du secret
docker exec security-secrets stat /run/secrets/db_password
```

**Observation** : Le secret est monté en lecture seule dans `/run/secrets/`.

---

### Étape 7 : Vérifier que le secret n'est PAS dans docker inspect

```bash
# Chercher le secret dans la configuration du conteneur
docker inspect security-secrets | grep -i password
docker inspect security-secrets | grep -i secret
```

**Observation** : Le contenu du secret n'apparaît nulle part dans l'inspection.

---

### Étape 8 : Accéder à l'interface

```bash
curl http://localhost:8083
```

Ou ouvrez `http://localhost:8083` dans un navigateur.

**Observation** : L'application indique que le secret est chargé sans le révéler.

---

### Étape 9 : Tester avec une variable d'environnement (mauvaise pratique)

```bash
# Lancer un conteneur avec le secret en variable d'environnement
docker run -d -p 8086:8080 -e DB_PASSWORD=visible-password --name bad-secret-demo \
  $(docker compose config --images | grep secrets)

# Accéder à l'interface
curl http://localhost:8086
```

**Observation** : L'interface devrait afficher un avertissement sur la mauvaise pratique.

```bash
# Nettoyage
docker stop bad-secret-demo && docker rm bad-secret-demo
```

---

### Étape 10 : Nettoyage

```bash
# Arrêter le service
docker compose down

# Supprimer le fichier de secret (en production, utilisez un gestionnaire)
rm secrets/db_password.txt
```

---

## ✅ Points de Vérification

Avant de passer au TP suivant, assurez-vous que :

- [ ] Vous comprenez pourquoi les variables d'environnement sont risquées pour les secrets
- [ ] Vous savez utiliser Docker Secrets avec docker-compose
- [ ] Vous savez lire un secret depuis `/run/secrets/`
- [ ] Vous comprenez que les secrets ne doivent jamais être dans l'image
- [ ] Vous savez vérifier qu'un secret n'est pas exposé

---

## 🎓 Pour Aller Plus Loin

### Exercice bonus 1 : Secrets avec Docker Swarm

```bash
# Initialiser Swarm (si pas déjà fait)
docker swarm init

# Créer un secret Swarm
echo "swarm-secret" | docker secret create my_secret -

# Lister les secrets
docker secret ls

# Utiliser dans un service
docker service create --name my-app --secret my_secret alpine cat /run/secrets/my_secret
```

### Exercice bonus 2 : Rotation de secrets

Modifiez votre application pour :
1. Surveiller le fichier de secret
2. Recharger automatiquement quand il change
3. Éviter les temps d'arrêt

### Exercice bonus 3 : Chiffrement au repos

```bash
# Chiffrer un secret avec GPG
echo "mon-secret" | gpg --symmetric --cipher-algo AES256 > secret.gpg

# Déchiffrer au démarrage du conteneur
gpg --decrypt secret.gpg
```

---

## 📚 Ressources

- [Docker Secrets](https://docs.docker.com/engine/swarm/secrets/)
- [Compose Secrets](https://docs.docker.com/compose/use-secrets/)
- [HashiCorp Vault](https://www.vaultproject.io/)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)

---

⬅️ **Précédent** : [TP3 - Isolation Réseau](./TP3-network-isolation.md)

➡️ **Suivant** : [TP5 - Limites de Ressources](./TP5-resource-limits.md)

